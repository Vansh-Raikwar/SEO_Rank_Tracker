/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { SearchIcon, GlobeIcon, FileSearchIcon, BrainIcon, CheckCircleIcon, AlertCircle, Loader2, ArrowRightIcon, Zap } from "lucide-react";
import { useApp } from "../context/AppContext";

const STEPS = [
    { id: "connecting", icon: <GlobeIcon size={22} />, label: "Connecting to browser", desc: "Creating cloud browser session..." },
    { id: "scraping", icon: <FileSearchIcon size={22} />, label: "Scanning website", desc: "Extracting meta tags, links, images..." },
    { id: "analyzing", icon: <BrainIcon size={22} />, label: "AI Analysis", desc: "Gemini is analyzing your SEO data..." },
    { id: "completed", icon: <CheckCircleIcon size={22} />, label: "Report Ready", desc: "Your SEO report is complete!" },
];

export default function Analyze() {
    const [url, setUrl] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [error, setError] = useState("");
    const [searchParams] = useSearchParams();
    const pollRef = useRef<any>(null);
    const { api, user } = useApp();
    const [usedScans, setUsedScans] = useState(0);
    const [scanLimit, setScanLimit] = useState<number | null>(5);
    const [scansRefreshAt, setScansRefreshAt] = useState<string | null>(null);
    const isPro = user?.plan === "pro";

    const navigate = useNavigate();

    const startPolling = (analysisId: string) => {
        pollRef.current = setInterval(async () => {
            try {
                const { data } = await api.get(`/api/analysis/${analysisId}`);
                if (data.success) {
                    const status = data.analysis.status;
                    
                    if (status === "failed") {
                        setError("Analysis failed. Please try again or check the URL.");
                        setAnalyzing(false);
                        if (pollRef.current) clearInterval(pollRef.current);
                        return;
                    }

                    const stepIndex = STEPS.findIndex(s => s.id === status);
                    if (stepIndex !== -1) {
                        setCurrentStep(stepIndex);
                    }

                    if (status === "completed") {
                        if (pollRef.current) clearInterval(pollRef.current);
                        setTimeout(() => {
                            setAnalyzing(false);
                            navigate(`/report/${analysisId}`);
                        }, 1000);
                    }
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 2000);
    };

    const handleAnalyze = async (submitUrl?: string) => {
        const targetUrl = submitUrl || url;
        if (!targetUrl.trim()) return;

        setError("");
        setAnalyzing(true);
        setCurrentStep(0);

        try {
            const { data } = await api.post("/api/analysis/analyze", { url: targetUrl });
            if (data.success) {
                startPolling(data.analysisId);
            } else {
                setError(data.message || "Failed to start analysis");
                setAnalyzing(false);
            }
        } catch (err: any) {
            const errData = err.response?.data;
            if (errData?.limitReached) {
                setDailyUsed(errData.dailyUsed);
                setDailyLimit(errData.dailyLimit);
                setError(errData.message);
            } else {
                setError(errData?.message || "Something went wrong. Please try again.");
            }
            setAnalyzing(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleAnalyze();
    };

    useEffect(() => {
        // Fetch current usage
        api.get("/api/payment/status").then(({ data }) => {
            if (data.success) {
                setUsedScans(data.usedScans);
                setScanLimit(data.scanLimit);
                setScansRefreshAt(data.scansRefreshAt);
            }
        }).catch(() => {});

        const prefillUrl = searchParams.get("url");
        if (prefillUrl) {
            setUrl(prefillUrl);
            // Auto-start if URL is provided
            setTimeout(() => handleAnalyze(prefillUrl), 500);
        }

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    return (
        <div className="min-h-screen pt-16 md:pt-24 bg-background">
            <div className="max-w-3xl mx-auto px-4 py-12">
                {!analyzing ? (
                    <div>
                        <div className="text-center mb-10 mt-24">
                            <h1 className="text-3xl sm:text-4xl font-medium text-foreground mb-3">
                                Analyze <span className="gradient-text">Any Website</span>
                            </h1>
                            <p className="text-muted-foreground">Enter a URL to get a comprehensive AI-powered SEO audit report.</p>
                            {!isPro && scanLimit !== null && (
                                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border text-xs">
                                    <span className="text-muted-foreground">
                                        {usedScans}/{scanLimit} scans used
                                    </span>
                                    {usedScans >= scanLimit && (
                                        <Link to="/pricing" className="flex items-center gap-1 text-primary font-semibold hover:underline">
                                            <Zap size={12} /> Upgrade
                                        </Link>
                                    )}
                                </div>
                            )}
                            {isPro && (
                                <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-semibold">
                                    <Zap size={12} /> Pro — Unlimited analyses
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="mb-6 px-4 py-3 rounded-xl severity-critical text-sm flex items-center gap-2 max-w-xl mx-auto">
                                <AlertCircle size={18} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
                            <div className="border border-primary/20 rounded-full p-1.5 px-2 flex items-center gap-2">
                                <div className="flex items-center gap-3 flex-1 px-3">
                                    <SearchIcon size={20} className="text-muted-foreground shrink-0" />
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        disabled={user?.plan !== "pro" && scanLimit !== null && usedScans >= scanLimit}
                                        placeholder={user?.plan !== "pro" && scanLimit !== null && usedScans >= scanLimit ? `Limit reached. Refreshes on ${new Date(scansRefreshAt || "").toLocaleDateString()}` : "Enter website URL (e.g., example.com)"}
                                        className="w-full bg-transparent text-foreground placeholder-muted-foreground outline-none text-base py-3 disabled:opacity-50"
                                        id="analyze-url-input"
                                        autoFocus
                                    />
                                </div>
                                <button type="submit" disabled={user?.plan !== "pro" && scanLimit !== null && usedScans >= scanLimit} className="bg-primary px-6 py-3 rounded-full flex items-center gap-2 text-primary-foreground text-sm hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50 disabled:cursor-not-allowed" id="analyze-submit-btn" style={{ color: "var(--background)" }}>
                                    Analyze <ArrowRightIcon className="text-background size-4 shrink-0" />
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 text-center text-sm text-muted-foreground">
                            Examples:{" "}
                            {["github.com", "stripe.com", "vercel.com"].map((ex, i) => (
                                <span key={ex}>
                                    <button
                                        onClick={() => {
                                            setUrl(ex);
                                        }}
                                        className="text-primary hover:underline"
                                    >
                                        {ex}
                                    </button>
                                    {i < 2 ? ", " : ""}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Analyzing State */}
                        <div className="text-center mb-12">
                            <h2 className="text-2xl font-medium text-foreground">Analyzing Your Website</h2>
                            <div className="flex justify-center items-center gap-2 mt-2">
                                <Loader2 size={16} className="text-primary/60 mt-0.5 animate-spin" />
                                <p className="text-muted-foreground sm:text-lg">{url}</p>
                            </div>
                        </div>

                        {/* Progress Steps */}
                        <div className="max-w-md mx-auto space-y-4">
                            {STEPS.map((step, i) => {
                                const isComplete = i < currentStep;
                                const isCurrent = i === currentStep;
                                const isPending = i > currentStep;

                                return (
                                    <div key={step.label} className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isCurrent ? "glass-strong border-primary/30" : isComplete ? "glass opacity-60" : "glass opacity-30"}`}>
                                        <div
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isComplete ? "bg-success/15 text-success" : isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                                            style={isCurrent ? { color: "var(--background)" } : {}}
                                        >
                                            {isComplete ? <CheckCircleIcon size={20} /> : step.icon}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-medium ${isPending ? "text-muted-foreground" : "text-foreground"}`}>{step.label}</p>
                                            <p className="text-xs text-muted-foreground">{step.desc}</p>
                                        </div>
                                        {isCurrent && <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />}
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-center text-xs text-muted-foreground mt-8">This may take 15-30 seconds depending on the website.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
