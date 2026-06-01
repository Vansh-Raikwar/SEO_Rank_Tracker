import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ChartNoAxesColumnIcon, ArrowLeft } from "lucide-react";
import { useApp } from "../context/AppContext";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

export default function EmailVerify() {
    const { user, api, loadUser } = useApp();
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.isAccountVerified) {
            navigate("/dashboard");
        }
    }, [user, navigate]);

    const handleChange = (index: number, value: string) => {
        if (isNaN(Number(value))) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Move to next input if value is entered
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const pasteData = e.clipboardData.getData("text").slice(0, 6);
        const newOtp = [...otp];
        pasteData.split("").forEach((char, index) => {
            if (index < 6 && !isNaN(Number(char))) {
                newOtp[index] = char;
            }
        });
        setOtp(newOtp);
    };

    const handleSendOtp = async () => {
        setSending(true);
        try {
            const { data } = await api.post("/api/auth/send-verify-otp");
            if (data.success) {
                toast.success(data.message);
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to send OTP");
        } finally {
            setSending(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpValue = otp.join("");
        if (otpValue.length !== 6) {
            toast.error("Please enter all 6 digits");
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post("/api/auth/verify-account", { otp: otpValue });
            if (data.success) {
                toast.success(data.message);
                await loadUser();
                navigate("/dashboard");
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Verification failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link to="/" className="flex items-center justify-center gap-2 group mb-10">
                        <ChartNoAxesColumnIcon />
                        <span className="text-xl tracking-tight text-foreground">SEO Rank Tracker</span>
                    </Link>
                </div>

                <div className="bg-card border border-border rounded-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="text-center py-5">
                            <h1 className="text-2xl text-foreground">Verify your email</h1>
                            <p className="text-muted-foreground text-sm mt-1">We sent a verification code to your email.</p>
                        </div>

                        <div className="flex justify-between gap-2" onPaste={handlePaste}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => { inputRefs.current[index] = el; }}
                                    type="text"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-12 h-14 text-center text-xl font-bold rounded-lg bg-muted/60 border border-border text-foreground outline-none focus:border-primary/50 transition-colors"
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 mt-4 rounded-lg bg-primary text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                            style={{ color: "var(--background)" }}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : "Verify Account"}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-border flex flex-col items-center gap-4">
                        <button onClick={handleSendOtp} disabled={sending} className="text-sm text-primary hover:underline font-medium disabled:opacity-50">
                            {sending ? "Sending..." : "Resend code"}
                        </button>
                        
                        <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft size={14} />
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
