import bcrypt from "bcrypt";
import User from "../models/User.js";
import generateToken from "../config/token.js";
import transporter from "../config/nodemailer.js";


export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required" })
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists" })
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword
        })

        await user.save()

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        const token = generateToken(user._id)

        const cookieOption = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000
        };

        res.cookie("token", token, cookieOption);

        // Sending verification email
        const mailOptions = {
            from: `"SEO Rank Tracker" <${process.env.SMTP_SENDER}>`,
            to: email,
            subject: "Welcome to SEO Rank Tracker - Verify Your Email",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #333;">Welcome to SEO Rank Tracker!</h2>
                    <p>Thank you for signing up. Please use the following code to verify your account:</p>
                    <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #555; border-radius: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This code will expire in 24 hours.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #888;">If you didn't create an account, you can safely ignore this email.</p>
                </div>
            `
        }

        console.log("-----------------------------------------");
        console.log("SENDING REGISTRATION OTP TO:", email);
        console.log("OTP CODE IS:", otp);
        console.log("-----------------------------------------");
        await transporter.sendMail(mailOptions);
        console.log("Registration OTP sent successfully");

        res.status(201).json({ success: true, message: "User registered successfully", user, token });

    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: `Internal server error ${error.message}` })
    }
}


export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required" })
        }

        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(404).json({ success: false, message: "Invalid Credentials" })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Invalid Credentials" })
        }

        const token = generateToken(user._id)

        const cookieOption = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000
        };

        res.cookie("token", token, cookieOption);

        // Clear password before sending response
        user.password = undefined;

        res.status(200).json({ success: true, message: "Login successful", user, token });

    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: `Internal server error ${error.message}` })
    }
}

export const logout = async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });
        res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const sendVerifyOtp = async (req, res) => {
    try {
        const { userId } = req;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.isAccountVerified) {
            return res.json({ success: false, message: "Account already verified" });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));

        await User.updateOne({ _id: userId }, {
            verifyOtp: otp,
            verifyOtpExpireAt: Date.now() + 24 * 60 * 60 * 1000
        });

        const mailOptions = {
            from: `"SEO Rank Tracker" <${process.env.SMTP_SENDER}>`,
            to: user.email,
            subject: "Account Verification OTP",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #333;">Account Verification</h2>
                    <p>Your OTP for account verification is:</p>
                    <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #555; border-radius: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This OTP will expire in 24 hours.</p>
                </div>
            `
        };

        console.log("-----------------------------------------");
        console.log("SENDING OTP TO:", user.email);
        console.log("OTP CODE IS:", otp);
        console.log("-----------------------------------------");
        
        await transporter.sendMail(mailOptions);
        console.log("Verification email sent successfully");

        res.json({ success: true, message: "Verification OTP sent successfully" });

    } catch (error) {
        console.error("Error sending verification OTP:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { userId } = req;
        const { otp } = req.body;

        if (!otp) {
            return res.json({ success: false, message: "OTP is required" });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (user.verifyOtp === "" || user.verifyOtp !== otp) {
            return res.json({ success: false, message: "Invalid OTP" });
        }

        if (user.verifyOtpExpireAt < Date.now()) {
            return res.json({ success: false, message: "OTP expired" });
        }

        await User.updateOne({ _id: userId }, {
            isAccountVerified: true,
            verifyOtp: "",
            verifyOtpExpireAt: 0
        });

        res.json({ success: true, message: "Email verified successfully" });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" })
        }

        res.status(200).json({ success: true, user })

    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: `Internal server error ${error.message}` })
    }
}

export const sendLoginOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.json({ success: false, message: "Email is required" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User not found. Please register first." });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        await User.updateOne({ _id: user._id }, {
            verifyOtp: otp,
            verifyOtpExpireAt: Date.now() + 5 * 60 * 1000
        });

        const mailOptions = {
            from: `"SEO Rank Tracker" <${process.env.SMTP_SENDER}>`,
            to: email,
            subject: "One-Time Password (OTP) for Login",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #333;">OTP Login</h2>
                    <p>Use the following code to log in to your SEO Rank Tracker account:</p>
                    <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #555; border-radius: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This code will expire in 5 minutes.</p>
                </div>
            `
        };

        console.log("-----------------------------------------");
        console.log("SENDING PASSWORDLESS LOGIN OTP TO:", email);
        console.log("OTP CODE IS:", otp);
        console.log("-----------------------------------------");
        
        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: "OTP sent successfully to your email" });

    } catch (error) {
        console.error("Error in sendLoginOtp:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const loginWithOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.json({ success: false, message: "Email and OTP are required" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (user.verifyOtp === "" || user.verifyOtp !== otp) {
            return res.json({ success: false, message: "Invalid OTP" });
        }

        if (user.verifyOtpExpireAt < Date.now()) {
            return res.json({ success: false, message: "OTP expired" });
        }

        // Clear OTP and verify account (since they logged in with OTP, we can assume the email is theirs)
        await User.updateOne({ _id: user._id }, {
            isAccountVerified: true,
            verifyOtp: "",
            verifyOtpExpireAt: 0
        });

        const token = generateToken(user._id);

        const cookieOption = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000
        };

        res.cookie("token", token, cookieOption);
        
        // Remove password before sending
        user.password = undefined;

        res.status(200).json({ success: true, message: "Logged in successfully", user, token });

    } catch (error) {
        console.error("Error in loginWithOtp:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const sendResetOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.json({ success: false, message: "Email is required" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        await User.updateOne({ _id: user._id }, {
            resetOtp: otp,
            resetOtpExpireAt: Date.now() + 15 * 60 * 1000
        });

        const mailOptions = {
            from: `"SEO Rank Tracker" <${process.env.SMTP_SENDER}>`,
            to: email,
            subject: "Password Reset OTP",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #333;">Password Reset</h2>
                    <p>Your OTP for resetting your password is:</p>
                    <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #555; border-radius: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This OTP will expire in 15 minutes.</p>
                </div>
            `
        };

        console.log("-----------------------------------------");
        console.log("SENDING RESET PASSWORD OTP TO:", email);
        console.log("OTP CODE IS:", otp);
        console.log("-----------------------------------------");

        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: "Reset OTP sent successfully" });

    } catch (error) {
        console.error("Error in sendResetOtp:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.json({ success: false, message: "Email, OTP and new password are required" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (user.resetOtp === "" || user.resetOtp !== otp) {
            return res.json({ success: false, message: "Invalid OTP" });
        }

        if (user.resetOtpExpireAt < Date.now()) {
            return res.json({ success: false, message: "OTP expired" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updateOne({ _id: user._id }, {
            password: hashedPassword,
            resetOtp: "",
            resetOtpExpireAt: 0
        });

        res.json({ success: true, message: "Password reset successfully" });

    } catch (error) {
        console.error("Error in resetPassword:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

