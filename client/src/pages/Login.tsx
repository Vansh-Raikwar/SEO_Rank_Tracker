import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, ChartNoAxesColumnIcon, User2Icon, KeyRound } from "lucide-react";
import { useApp } from "../context/AppContext";
import toast from "react-hot-toast";


export default function Login({ state }: { state: string }) {
    const [isLoginState, setIsLoginState] = useState(state === "login");
    const [isOtpMode, setIsOtpMode] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const { login, register, api, loadUser, setToken } = useApp();

    const handleSendOtp = async () => {
        if (!email) return toast.error("Please enter email");
        setLoading(true);
        try {
            const { data } = await api.post("/api/auth/send-login-otp", { email });
            if (data.success) {
                toast.success(data.message);
                setOtpSent(true);
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isOtpMode && otpSent) {
                const { data } = await api.post("/api/auth/login-with-otp", { email, otp });
                if (data.success) {
                    localStorage.setItem("token", data.token);
                    setToken(data.token);
                    toast.success("Logged in successfully");
                    await loadUser();
                    navigate("/dashboard");
                } else {
                    toast.error(data.message);
                }
            } else if (isLoginState) {
                const result = await login(email, password);
                if (result.success) {
                    navigate("/email-verify");
                } else {
                    toast.error(result.message || "Login Failed");
                }
            } else {
                const result = await register(name, email, password);
                if (result.success) {
                    navigate("/email-verify");
                } else {
                    toast.error(result.message || "Registration Failed");
                }
            }
        } catch (error: any) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="flex items-center justify-center gap-2 group mb-10">
                        <ChartNoAxesColumnIcon />
                        <span className="text-xl tracking-tight text-foreground">SEO Rank Tracker</span>
                    </Link>
                </div>

                {/* Form Card */}
                <div className="bg-card border border-border rounded-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="text-center py-5">
                            <h1 className="text-2xl text-foreground">
                                {isLoginState ? (isOtpMode ? "OTP Login" : "Welcome back") : "Create Account"}
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                {isOtpMode ? "Sign in using a one-time code" : isLoginState ? "Sign in to your SEO Rank Tracker account" : "Create a new account"}
                            </p>
                        </div>

                        {!isLoginState && (
                            <label>
                                <div className="block text-sm text-foreground mb-1.5">Name</div>
                                <div className="relative">
                                    <User2Icon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your name"
                                        className="w-full pl-11 pr-4 py-3 rounded-lg bg-muted/60 border border-border text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors text-sm"
                                    />
                                </div>
                            </label>
                        )}

                        <label>
                            <div className="block text-sm text-foreground mb-1.5 mt-4">Email</div>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-11 pr-4 py-3 rounded-lg bg-muted/60 border border-border text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors text-sm"
                                    disabled={isOtpMode && otpSent}
                                />
                            </div>
                        </label>

                        {isOtpMode && otpSent ? (
                            <label>
                                <div className="block text-sm text-foreground mb-1.5 mt-4">One-Time Password</div>
                                <div className="relative">
                                    <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        required
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        placeholder="Enter 6-digit code"
                                        className="w-full pl-11 pr-4 py-3 rounded-lg bg-muted/60 border border-border text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors text-sm"
                                    />
                                </div>
                            </label>
                        ) : !isOtpMode ? (
                            <label>
                                <div className="block text-sm text-foreground mb-1.5 mt-4">Password</div>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full pl-11 pr-4 py-3 rounded-lg bg-muted/60 border border-border text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors text-sm"
                                    />
                                </div>
                                {isLoginState && !isOtpMode && (
                                    <div className="flex justify-end mt-1.5">
                                        <Link to="/reset-password" className="text-xs text-primary hover:underline">
                                            Forgot password?
                                        </Link>
                                    </div>
                                )}
                            </label>
                        ) : null}

                        {isLoginState && isOtpMode && !otpSent ? (
                            <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={loading}
                                className="w-full py-3 mt-5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                                style={{ color: "var(--background)" }}
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : "Send Login Code"}
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 mt-5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                                style={{ color: "var(--background)" }}
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : isLoginState ? (isOtpMode ? "Verify & Login" : "Sign In") : "Create Account"}
                            </button>
                        )}
                    </form>

                    {isLoginState && (
                        <div className="mt-6 flex flex-col items-center gap-2">
                            <button
                                onClick={() => {
                                    setIsOtpMode(!isOtpMode);
                                    setOtpSent(false);
                                    setOtp("");
                                }}
                                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                                {isOtpMode ? "Back to Password Login" : "Sign in with One-Time Password (OTP)"}
                            </button>
                        </div>
                    )}
                </div>

                <p className="text-center text-sm text-muted-foreground mt-6">
                    {isLoginState ? "Don't have an account?" : "Already have an account?"}
                    <button
                        onClick={() => {
                            setIsLoginState((prev) => !prev);
                            setIsOtpMode(false);
                            setOtpSent(false);
                        }}
                        className="text-primary hover:underline font-medium pl-1"
                    >
                        {isLoginState ? "Sign up" : "Sign in"}
                    </button>
                </p>
            </div>
        </div>
    );
}
