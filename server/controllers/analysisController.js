import Analysis from "../models/Analysis.js";
import User from "../models/User.js";
import { scrapeUrl } from "../services/scrapperService.js";
import { analyzeSeoData } from "../services/geminiService.js";
import transporter from "../config/nodemailer.js";
import puppeteer from "puppeteer-extra";
import Plan from "../models/Plan.js";



// analyze single url
export const analyzeUrl = async (req,res) =>{
    try {
        const {url} = req.body;
        if(!url){
            return res.status(400).json({
                success:false,
                message:"URL is required"
            })
        }

        // --- Daily limit check ---
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        // Check if pro plan has expired
        if (user.plan === "pro" && user.subscriptionEnd && user.subscriptionEnd < new Date()) {
            user.plan = "free";
            user.subscriptionStart = null;
            user.subscriptionEnd = null;
            user.planExpiresAt = null;
            await user.save();
        }

        let dynamicScanLimit = 5;
        if (user.plan !== "pro") {
            // Fetch scan limit from DB
            const freePlan = await Plan.findOne({ name: "free" });
            dynamicScanLimit = freePlan ? (freePlan.scanLimit || 5) : 5;

            // Check if credits are currently refreshing (exhausted)
            if (user.scansRefreshAt && user.scansRefreshAt > new Date()) {
                return res.status(403).json({
                    success: false,
                    message: `You have exhausted your free credits. They will refresh on ${new Date(user.scansRefreshAt).toLocaleDateString()}. Upgrade to Pro for unlimited analyses.`,
                    limitReached: true,
                    usedScans: user.usedScans || 0,
                    scanLimit: dynamicScanLimit,
                    scansRefreshAt: user.scansRefreshAt
                });
            }

            // Check if refresh timer has finished
            if (user.scansRefreshAt && user.scansRefreshAt <= new Date()) {
                user.usedScans = 0;
                user.scansRefreshAt = null;
                await user.save();
            }

            // Check if they hit the limit but haven't started a timer yet
            if ((user.usedScans || 0) >= dynamicScanLimit) {
                // This shouldn't normally happen since the timer starts ON the last scan,
                // but just in case, we start the timer now.
                const refreshDate = new Date();
                refreshDate.setDate(refreshDate.getDate() + 30);
                user.scansRefreshAt = refreshDate;
                await user.save();

                return res.status(403).json({
                    success: false,
                    message: `You have used all your free scans. Your credits will refresh in 30 days. Upgrade to Pro for unlimited analyses.`,
                    limitReached: true,
                    usedScans: user.usedScans,
                    scanLimit: dynamicScanLimit,
                    scansRefreshAt: user.scansRefreshAt
                });
            }
        }

        let validUrl;
        try {
            validUrl= new URL(url.startsWith("http") ? url : `https://${url}`);
        } catch (error) {
            return res.status(400).json({
                success:false,
                message:"Invalid URL format"
            })
        }

        // Increment scan count
        if (user.plan !== "pro") {
            user.usedScans = (user.usedScans || 0) + 1;
            // If they just hit the limit, start the 30-day countdown
            if (user.usedScans >= dynamicScanLimit) {
                const refreshDate = new Date();
                refreshDate.setDate(refreshDate.getDate() + 30);
                user.scansRefreshAt = refreshDate;
            }
        }
        user.analysisCount = (user.analysisCount || 0) + 1;
        await user.save();

        const analysis = await Analysis.create({
            userId:req.userId,
            url:validUrl.href,
            status:"connecting"
        })
        res.json({
            success:true,
            message:"Analysis started successfully",
            analysisId: analysis._id,
            usedScans: user.usedScans || 0,
            scanLimit: user.plan === "pro" ? null : dynamicScanLimit,
            scansRefreshAt: user.scansRefreshAt
        })

        try {
            analysis.status = "scraping";
            await analysis.save();
            
            const scrapeResult = await scrapeUrl(validUrl.href);
            if(!scrapeResult.success || !scrapeResult.data){
                analysis.status = "failed";

                await analysis.save();
                return;
            }

            // analysis by ai
            analysis.status = "analyzing";
            await analysis.save();

            const aiResult = await analyzeSeoData(scrapeResult.data);

            if(!aiResult.success){
                analysis.status = "failed";
                await analysis.save();
                return;
            }

            // save the result
            analysis.overallScore = aiResult.data.overallScore || 0;
            analysis.category = aiResult.data.categories || {};
            analysis.metaData = scrapeResult.data.metaData || {};
            analysis.headings = scrapeResult.data.headings || {};
            analysis.images = scrapeResult.data.images || {};
            analysis.links = scrapeResult.data.links || {};
            analysis.keywords = aiResult.data.keywords || [];
            analysis.issues = aiResult.data.issues || [];
            analysis.loadTime = scrapeResult.data.loadTime || 0;
            analysis.wordCount = scrapeResult.data.wordCount || 0;
            analysis.pageSize = scrapeResult.data.pageSize || 0;
            analysis.status = "completed";
            
            
            await analysis.save();


        } catch (bgerr) {
            console.error("Background analysis error : ", bgerr.message);
            try{
                analysis.status = "failed";
                await analysis.save();
            }catch(saveErr){
                console.error("Failed to save analysis status:", saveErr);
            }
        }

    } catch (error) {
        console.log("Analysis URL error : ", error.message);
        if(!res.headersSent){
            res.status(500).json({
                success:false,
                message:"Failed to analyze URL"
            })
        }
    }
}

// analysis by ID
export const getAnalysis = async (req,res)=>{
    try {
        const analysis = await Analysis.findOne({_id:req.params.id, userId: req.userId})
        if(!analysis){
            return res.status(404).json({
                success:false,
                message:"Analysis not found"
            })
        }
        res.json({success:true, analysis});
    } catch (error) {
        console.error("get analysis error : ", error.message);
        res.status(500).json({
            success:false,
            message:"Failed to get analysis"
        })
    }
}

// analyze multiple url
export const getAnalyses = async (req,res) =>{
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const analyses = await Analysis.find({userId:req.userId}).sort({createdAt:-1}).skip(skip).limit(limit).select("-issues -keywords")
        const total = await Analysis.countDocuments({userId:req.userId});
        
        res.json({success:true, analyses, pagination:{page,limit,total, pages: Math.ceil(total/limit)}});
    } catch (error) {
        console.error("get analysis error : ", error.message);
        res.status(500).json({
            success:false,
            message:"Failed to get analysis"
        })
    }

}


// delete analysis
export const deleteAnalysis = async (req,res)=>{
    try {
        await Analysis.findOneAndDelete({_id:req.params.id, userId: req.userId})
        res.json({success:true, message:"Analysis deleted successfully"});
    } catch (error) {
        console.error("delete analysis error : ", error.message);
        res.status(500).json({
            success:false,
            message:"Failed to delete analysis"
        })
    }
}

const generatePdfBuffer = async (analysisId, token) => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    
    if (token) {
        // Go to root first to be able to set localStorage on the origin
        await page.goto(clientUrl, { waitUntil: 'domcontentloaded' });
        await page.evaluate((t) => {
            localStorage.setItem('token', t);
        }, token);
    }

    await page.goto(`${clientUrl}/report/${analysisId}`, { waitUntil: 'networkidle0' });
    
    // Wait for animations and data fetching to settle
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Hide navigation and action buttons for print
    await page.evaluate(() => {
        const nav = document.querySelector('nav');
        if (nav) nav.style.display = 'none';
        const buttons = document.querySelector('.print\\:hidden');
        if (buttons) buttons.style.display = 'none';
    });

    const pdfBuffer = await page.pdf({ 
        format: 'A4', 
        printBackground: true,
        margin: { top: '20px', bottom: '20px' }
    });

    await browser.close();
    return pdfBuffer;
};

// Send email report
export const sendEmailReport = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || user.plan !== "pro") {
            return res.status(403).json({ success: false, message: "Email reports are a Pro feature." });
        }

        const analysis = await Analysis.findOne({ _id: req.params.id, userId: req.userId });
        if (!analysis) {
            return res.status(404).json({ success: false, message: "Analysis not found" });
        }

        const reportLink = `${process.env.CLIENT_URL || "http://localhost:5173"}/report/${analysis._id}`;
        
        const mailOptions = {
            from: `"SEO Rank Tracker" <${process.env.SMTP_SENDER}>`,
            to: user.email,
            subject: `SEO Report for ${analysis.url}`,
            html: `
                <h2>SEO Report Summary</h2>
                <p>Hello ${user.name},</p>
                <p>Here is the summary of your SEO analysis for <strong>${analysis.url}</strong>:</p>
                <ul>
                    <li><strong>Overall Score:</strong> ${analysis.overallScore}/100</li>
                    <li><strong>Issues Found:</strong> ${analysis.issues?.length || 0}</li>
                </ul>
                <p>Click the link below to view your full detailed report:</p>
                <a href="${reportLink}" style="display:inline-block;padding:10px 20px;background:#0ea5e9;color:white;text-decoration:none;border-radius:5px;">View Full Report</a>
                <br><br>
                <p>Thanks for using SEO Rank Tracker!</p>
            `,
        };

        const pdfBuffer = await generatePdfBuffer(analysis._id, req.cookies?.token);
        
        mailOptions.attachments = [
            {
                filename: `SEO_Report_${new URL(analysis.url).hostname}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf"
            }
        ];

        await transporter.sendMail(mailOptions);
        
        res.json({ success: true, message: "Report sent to your email successfully!" });
    } catch (error) {
        console.error("Send email report error:", error);
        res.status(500).json({ success: false, message: "Failed to send email report" });
    }
};

// Export PDF directly
export const exportPdf = async (req, res) => {
    try {
        const token = req.cookies?.token || req.query.token;
        const analysis = await Analysis.findOne({ _id: req.params.id });
        if (!analysis) {
            return res.status(404).json({ success: false, message: "Analysis not found" });
        }

        const pdfBuffer = await generatePdfBuffer(analysis._id, token);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=SEO_Report_${new URL(analysis.url).hostname}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Export PDF error:", error);
        res.status(500).json({ success: false, message: "Failed to export PDF" });
    }
};
