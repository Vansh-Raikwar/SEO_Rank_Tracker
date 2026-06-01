import KeywordTracking from "../models/keywordTracking.js";
import {keywordTracking} from "../services/keywordTrackingService.js"

export const addKeyword = async(req,res)=>{
    try{
        const{keyword, url} = req.body;
        if(!keyword || !url){
            return res.status(400).json({success:false, message:"Keyword and url are required"})
        }

        let domain;
        try{
            const urlObj = new URL(url.startsWith('http')?url:'https://'+url);
            domain = urlObj.hostname.replace("www.","");
        }
        catch(err){
            return res.status(400).json({success:false, message:"Invalid url"})
        }

        // check if keyword already exists
        const existing = await KeywordTracking.findOne({userId:req.userId,keyword : keyword.toLowerCase().trim(),domain});
        if(existing){
            return res.status(400).json({success:false, message:"Already tracking this keyword for this domain"})
        }

        //creating entry

        const tracking = await KeywordTracking.create({
            userId:req.userId,
            keyword:keyword.toLowerCase().trim(),
            url : url.startsWith('http')? url : `https://${url}`,
            domain,
            status:"checking",
            rankHistory:[],
            competitors:[],
        })
        // Start tracking in background
        keywordTracking(tracking);

        return res.status(200).json({success:true, message:"Keyword tracking created successfully", tracking})
    }
    catch(error){
        console.log("Add keyword error :", error.message);
        
        if(error.code == 1100) return res.status(400).json({success:false, message:"Already tracking this keyword for this domain"})

        res.status(500).json({success:false, message:error.message})
    }
}


export const getKeywords = async(req,res)=>{
    try {
        const keywords = await KeywordTracking.find({userId:req.userId}).sort({createdAt: -1})
        
        return res.status(200).json({success:true, message:"Keywords fetched successfully", keywords})
        
    } catch (error) {
        console.log("Get keyword error : ", error.message);
        return res.status(500).json({success:false, message:error.message})
    }
}

// get single keyword full history
export const getKeyword = async(req,res)=>{
    try {
        const tracking = await KeywordTracking.findOne({_id:req.params.id, userId:req.userId})
        
        if(!tracking){
            return res.status(404).json({success:false, message:"Keyword not found"})
        }
        return res.status(200).json({success:true, message:"Keyword fetched successfully", tracking})
    } catch (error) {
        console.log("Get keyword error : ", error.message);
        return res.status(500).json({success:false, message:error.message})
    }   
}


export const refreshKeyword = async(req,res)=>{
    try {
        const tracking = await KeywordTracking.findOne({_id:req.params.id, userId:req.userId})
        
        if(!tracking){
            return res.status(404).json({success:false, message:"Keyword not found"})
        }
        tracking.status = "checking";
        await tracking.save();
        
        // Start tracking in background
        keywordTracking(tracking);

        res.status(200).json({success:true, message:"Rank Check In Progress", tracking})


    } catch (error) {
        console.log("Refresh keyword error : ", error.message);
        res.status(500).json({success:false, message:error.message})
    }
}


export const deleteKeyword = async(req,res)=>{
    try {
        const tracking = await KeywordTracking.findByIdAndDelete({_id:req.params.id, userId:req.userId})
        
        if(!tracking){
            return res.status(404).json({success:false, message:"Keyword not found"})
        }
        
        res.status(200).json({success:true, message:"Keyword deleted successfully"})


    } catch (error) {
        console.log("Delete keyword error : ", error.message);
        res.status(500).json({success:false, message:error.message})
    }
}


export const toggleTracking = async(req,res)=>{
    try {
        const tracking = await KeywordTracking.findOne({_id:req.params.id, userId:req.userId})
        
        if(!tracking){
            return res.status(404).json({success:false, message:"Keyword tracking not found"})
        }
        tracking.active = !tracking.active;
        await tracking.save();

        res.status(200).json({success:true, message:"Keyword tracking " + (tracking.active ? "enabled" : "disabled")})


    } catch (error) {
        console.log("Toggle keyword error : ", error.message);
        res.status(500).json({success:false, message:error.message})
    }
}