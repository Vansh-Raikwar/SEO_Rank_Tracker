import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import Plan from "../models/Plan.js";

let razorpayInstance = null;
function getRazorpay() {
    if (!razorpayInstance) {
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_SECRET_KEY,
        });
    }
    return razorpayInstance;
}



// Create Razorpay order
export const createOrder = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.plan === "pro" && user.planExpiresAt && user.planExpiresAt > new Date()) {
            return res.json({ success: false, message: "You already have an active Pro plan" });
        }

        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET_KEY) {
            console.error("Razorpay keys are missing in environment variables.");
            return res.status(500).json({ success: false, message: "Server configuration error: missing payment keys" });
        }

        const proPlan = await Plan.findOne({ name: "pro" });
        if (!proPlan) {
            return res.status(500).json({ success: false, message: "Pro plan not configured in database" });
        }

        const order = await getRazorpay().orders.create({
            amount: proPlan.amount,
            currency: proPlan.currency || "INR",
            receipt: `pro_${user._id.toString().slice(-6)}_${Date.now()}`,
            notes: {
                userId: user._id.toString(),
                plan: "pro",
            },
        });

        user.razorpayOrderId = order.id;
        await user.save();

        res.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
            },
            key: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({ 
            success: false, 
            message: error.error?.description || error.message || "Failed to create payment order" 
        });
    }
};

// Verify payment & upgrade to Pro
export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing payment details" });
        }

        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET_KEY)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }

        // Upgrade user
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const proPlan = await Plan.findOne({ name: "pro" });
        if (!proPlan) {
            return res.status(500).json({ success: false, message: "Pro plan configuration missing" });
        }

        const now = new Date();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + proPlan.durationDays);

        // Update user
        user.plan = "pro";
        user.subscriptionStart = now;
        user.subscriptionEnd = expiresAt;
        user.planExpiresAt = expiresAt;
        user.razorpayPaymentId = razorpay_payment_id;
        await user.save();

        // Log transaction
        try {
            await Transaction.create({
                userId: user._id,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                amount: Math.round(proPlan.amount / 100), // convert back from paise
                currency: proPlan.currency || "INR",
                plan: "pro",
                status: "success"
            });
        } catch (dbErr) {
            console.error("Failed to log transaction:", dbErr);
            // Don't fail the request if transaction logging fails but user upgraded successfully
        }

        console.log(`[PAYMENT] User ${user.email} upgraded to Pro until ${expiresAt.toISOString()}`);

        res.json({
            success: true,
            message: "Payment verified! You are now a Pro user.",
            plan: "pro",
            planExpiresAt: expiresAt,
        });
    } catch (error) {
        console.error("Verify payment error:", error.message);
        res.status(500).json({ success: false, message: "Payment verification failed" });
    }
};

// Get subscription status
export const getSubscriptionStatus = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Auto-downgrade expired Pro
        if (user.plan === "pro" && user.subscriptionEnd && user.subscriptionEnd < new Date()) {
            user.plan = "free";
            user.subscriptionStart = null;
            user.subscriptionEnd = null;
            user.planExpiresAt = null;
            await user.save();
        }

        // Reset daily counter if new day
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastReset = user.lastAnalysisReset ? new Date(user.lastAnalysisReset) : null;
        if (!lastReset || lastReset < today) {
            user.dailyAnalysisCount = 0;
            user.lastAnalysisReset = new Date();
            await user.save();
        }

        // Fetch limits from DB
        const freePlan = await Plan.findOne({ name: "free" });
        const scanLimit = freePlan ? freePlan.scanLimit : 5;

        // Check if refresh timer has finished (just in case they visit dashboard without scanning)
        if (user.scansRefreshAt && user.scansRefreshAt <= new Date()) {
            user.usedScans = 0;
            user.scansRefreshAt = null;
            await user.save();
        }

        res.json({
            success: true,
            plan: user.plan,
            planExpiresAt: user.planExpiresAt,
            usedScans: user.usedScans || 0,
            scanLimit: user.plan === "pro" ? null : scanLimit,
            scansRefreshAt: user.scansRefreshAt || null,
            totalAnalyses: user.analysisCount || 0,
        });
    } catch (error) {
        console.error("Subscription status error:", error.message);
        res.status(500).json({ success: false, message: "Failed to get subscription status" });
    }
};
