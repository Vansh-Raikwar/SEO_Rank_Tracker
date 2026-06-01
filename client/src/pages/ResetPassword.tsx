import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, ChartNoAxesColumnIcon, KeyRound, ArrowLeft } from "lucide-react";
import { useApp } from "../context/AppContext";
import toast from "react-hot-toast";

export default function ResetPassword() {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { api } = useApp();

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return toast.error("Email is required");
        
        setLoading(true);
        try {
            const { data } = await api.post("/api/auth/send-reset-otp", { email });
            if (data.success) {
                toast.success(data.message);
                setIsOtpSent(true);
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to send reset code");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || !newPassword) return toast.error("All fields are required");
        if (newPassword.length < 8) return toast.error("Password must be at least 8 characters");

        setLoading(true);
        try {
            const { data } = await api.post("/api/auth/reset-password", { email, otp, newPassword });
            if (data.success) {
                toast.success("Password reset successfully! Please login.");
                navigate("/login");
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="flex items-center justify-center gap-2 group mb-10">
                        <ChartNoAxesColumnIcon className="text-primary" />
                        <span className="text-xl tracking-tight text-foreground">SEO Rank Tracker</span>
                    </Link>
                </div>

                {/* Form Card */}
                <div className="bg-card border border-border rounded-2xl p-8 shadow-xl backdrop-blur-sm">
                    <div className="mb-8">
                        <Link to="/login" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors mb-6">
                            <ArrowLeft size={14} /> Back to Login
                        </Link>
                        <h1 className="text-2xl font-semibold text-foreground">
                            {isOtpSent ? "Set New Password" : "Reset Password"}
                        </h1>
                        <p className="text-muted-foreground text-sm mt-2">
                            {isOtpSent 
                                ? "Enter the 6-digit code sent to your email and your new password." 
                                : "Enter your email address and we'll send you a code to reset your password."}
                        </p>
                    </div>

                    {!isOtpSent ? (
                        <form onSubmit={handleSendOtp} className="space-y-5">
                            <label className="block">
                                <div className="text-sm font-medium text-foreground mb-1.5">Email Address</div>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                    />
                                </div>
                            </label>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                                style={{ color: "var(--background)" }}
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : "Send Reset Code"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <label className="block">
                                <div className="text-sm font-medium text-foreground mb-1.5">Verification Code</div>
                                <div className="relative">
                                    <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        required
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        placeholder="6-digit code"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm tracking-widest font-mono"
                                    />
                                </div>
                            </label>

                            <label className="block">
                                <div className="text-sm font-medium text-foreground mb-1.5">New Password</div>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="At least 8 characters"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                    />
                                </div>
                            </label>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                                style={{ color: "var(--background)" }}
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : "Reset Password"}
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => setIsOtpSent(false)}
                                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                            >
                                Didn't receive a code? Try again
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
