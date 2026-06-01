import express from "express";
import { createOrder, verifyPayment, getSubscriptionStatus } from "../controllers/paymentController.js";
import auth from "../middleware/auth.js";

const paymentRouter = express.Router();

paymentRouter.post("/create-order", auth, createOrder);
paymentRouter.post("/verify", auth, verifyPayment);
paymentRouter.get("/status", auth, getSubscriptionStatus);

export default paymentRouter;
