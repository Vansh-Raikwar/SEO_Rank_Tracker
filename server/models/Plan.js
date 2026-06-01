import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    amount: {
        type: Number, // Stored in smallest currency unit (e.g., paise for INR, cents for USD)
        required: true,
        default: 0
    },
    currency: {
        type: String,
        default: "INR"
    },
    durationDays: {
        type: Number,
        required: true,
        default: 30
    },
    durationLabel: {
        type: String, // e.g. "Monthly", "Yearly", "Lifetime"
        default: "Monthly"
    },
    scanLimit: {
        type: Number, // null means unlimited
        default: null
    }
}, { timestamps: true });

const Plan = mongoose.models.Plan || mongoose.model("Plan", planSchema);

export const seedPlans = async () => {
    try {
        const count = await Plan.countDocuments();
        if (count === 0) {
            console.log("[SEED] No plans found. Seeding default plans...");
            await Plan.create([
                {
                    name: "free",
                    amount: 0,
                    durationDays: 36500, // virtually forever
                    durationLabel: "Lifetime",
                    scanLimit: 5
                },
                {
                    name: "pro",
                    amount: 159900, // 1599 INR in paise
                    durationDays: 30,
                    durationLabel: "Monthly",
                    scanLimit: null // unlimited
                }
            ]);
            console.log("[SEED] Default plans seeded successfully.");
        }
    } catch (error) {
        console.error("[SEED ERROR] Failed to seed plans:", error);
    }
};

export default Plan;
