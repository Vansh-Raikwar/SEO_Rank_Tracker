import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles, Loader2, Crown, Zap, Shield } from "lucide-react";
import { useApp } from "../context/AppContext";
import toast from "react-hot-toast";

declare global {
    interface Window {
        Razorpay: any;
    }
}

const FREE_FEATURES = [
    "5 analyses per day",
    "Full SEO report",
    "Keyword analysis",
    "Issue detection",
    "Export results",
];

const PRO_FEATURES = [
    "Unlimited analyses",
    "Priority processing",
    "Competitor analysis",
    "Historical tracking",
    "Email reports",
];

export default function Pricing() {
    const { user, api, loadUser, token } = useApp();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleUpgrade = async () => {
        if (!token || !user) {
            navigate("/login");
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post("/api/payment/create-order");
            if (!data.success) {
                toast.error(data.message);
                setLoading(false);
                return;
            }

            const options = {
                key: data.key,
                amount: data.order.amount,
                currency: data.order.currency,
                name: "SEO Rank Tracker",
                description: "Pro Plan — 30 days",
                order_id: data.order.id,
                handler: async (response: any) => {
                    try {
                        const verifyRes = await api.post("/api/payment/verify", {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        if (verifyRes.data.success) {
                            toast.success("🎉 Welcome to Pro! Unlimited analyses unlocked.");
                            await loadUser();
                            navigate("/dashboard");
                        } else {
                            toast.error("Payment verification failed");
                        }
                    } catch {
                        toast.error("Payment verification failed");
                    }
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                },
                theme: {
                    color: "#6366f1",
                },
                modal: {
                    ondismiss: () => {
                        setLoading(false);
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", () => {
                toast.error("Payment failed. Please try again.");
                setLoading(false);
            });
            rzp.open();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to initiate payment");
        } finally {
            setLoading(false);
        }
    };

    const isPro = user?.plan === "pro";

    return (
        <div className="min-h-screen bg-background pt-24 pb-16 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
                        <Sparkles size={14} />
                        PRICING
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        Simple <span className="text-primary">Pricing</span>
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">
                        Start free. Upgrade when you need more.
                    </p>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                    {/* Free Plan */}
                    <div className="relative bg-card border border-border rounded-2xl p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield size={20} className="text-muted-foreground" />
                                <h3 className="text-lg font-semibold text-foreground">Free</h3>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-5xl font-bold text-foreground">$0</span>
                                <span className="text-muted-foreground text-sm">/month</span>
                            </div>
                        </div>

                        <ul className="space-y-3.5 mb-10 flex-1">
                            {FREE_FEATURES.map((f) => (
                                <li key={f} className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <Check size={16} className="text-primary shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => navigate(token ? "/dashboard" : "/register")}
                            className="w-full py-3.5 rounded-xl border-2 border-border text-foreground text-sm font-semibold hover:bg-muted/50 active:scale-[0.98] transition-all"
                        >
                            {token ? (isPro ? "Current Base Plan" : "Your Current Plan") : "Get Started Free"}
                        </button>
                    </div>

                    {/* Pro Plan */}
                    <div className="relative bg-card border-2 border-primary/30 rounded-2xl p-8 flex flex-col shadow-lg shadow-primary/5">
                        {/* Popular badge */}
                        <div className="absolute -top-3.5 right-6">
                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-xs font-bold shadow-lg shadow-primary/25" style={{ color: "var(--background)" }}>
                                <Crown size={12} />
                                Popular
                            </span>
                        </div>

                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <Zap size={20} className="text-primary" />
                                <h3 className="text-lg font-semibold text-foreground">Pro</h3>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-5xl font-bold text-foreground">$19</span>
                                <span className="text-muted-foreground text-sm">/month</span>
                            </div>
                        </div>

                        <ul className="space-y-3.5 mb-10 flex-1">
                            {PRO_FEATURES.map((f) => (
                                <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                                    <Check size={16} className="text-primary shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>

                        {isPro ? (
                            <div className="w-full py-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold text-center">
                                ✓ Active until {user?.planExpiresAt ? new Date(user.planExpiresAt).toLocaleDateString() : "—"}
                            </div>
                        ) : (
                            <button
                                onClick={handleUpgrade}
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl bg-primary text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-primary/25"
                                style={{ color: "var(--background)" }}
                            >
                                {loading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        <Zap size={16} />
                                        Upgrade to Pro
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* FAQ / info */}
                <div className="text-center mt-12">
                    <p className="text-xs text-muted-foreground">
                        Secure payments via Razorpay. Cancel anytime. Billed in INR (₹1,599 ≈ $19).
                    </p>
                </div>
            </div>
        </div>
    );
}
