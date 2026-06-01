import express from "express";
import { register, login, logout, getUser, sendVerifyOtp, verifyEmail, sendLoginOtp, loginWithOtp, sendResetOtp, resetPassword } from "../controllers/authController.js";
import auth from "../middleware/auth.js";

const authRouter = express.Router();

authRouter.post("/register", register)
authRouter.post("/login", login)
authRouter.post("/logout", logout)

authRouter.get("/user", auth, getUser)
authRouter.post("/send-verify-otp", auth, sendVerifyOtp)
authRouter.post("/verify-account", auth, verifyEmail)

// Passwordless Login
authRouter.post("/send-login-otp", sendLoginOtp)
authRouter.post("/login-with-otp", loginWithOtp)

// Password Reset
authRouter.post("/send-reset-otp", sendResetOtp)
authRouter.post("/reset-password", resetPassword)

export default authRouter;