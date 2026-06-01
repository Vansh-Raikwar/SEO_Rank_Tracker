import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import authRouter from "./router/authRouter.js";
import rankRouter from "./router/rankRoute.js";
import analysisRouter from "./router/analysisRouter.js";
import paymentRouter from "./router/paymentRouter.js";
import { startRankTrackingCron } from "./cron/rankTrackingCron.js";

dotenv.config();

const app = express();

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "https://seo-rank-tracker-nine.vercel.app", "https://seo-rank-tracker-frontend-red.vercel.app"],
    credentials: true
}))
app.use(cookieParser())
app.use(express.json({ limit: "50mb" }))
import { seedPlans } from "./models/Plan.js";

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000   }`);
})

connectDB().then(() => {
    seedPlans();
});

app.get("/",(req,res)=>{
    res.send("server is running")
})

app.use("/api/auth",authRouter);

app.use("/api/rank",rankRouter)

app.use("/api/analysis",analysisRouter)

app.use("/api/payment",paymentRouter)

// start cron jobs
startRankTrackingCron()

// Trigger restart
