import jwt from "jsonwebtoken";
import User from "../models/User.js";

const auth = async (req, res, next) => {
    try {
        // Try to get token from cookies first, then from Authorization header
        const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized. Please login again." });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decodedToken.userId;
        next();
    } catch (error) {
        console.log("Auth Error:", error.message);
        res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

export default auth;