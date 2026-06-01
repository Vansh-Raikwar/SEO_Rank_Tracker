import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, Trash2, ExternalLink, Search, AlertCircle, Loader2, Filter, ArrowUpDown, Crown } from "lucide-react";
import ScoreGauge from "../components/ScoreGauge";
import { useApp } from "../context/AppContext";

interface AnalysisItem {
    _id: string;
    url: string;
    overallScore: number;
    status: string;
    createdAt: string;
    category: {
        seo: number;
        performance: number;
        accessibility: number;
        bestPractices: number;
    };
}

export default function History() {
    const { api, user, token } = useApp();
    const navigate = useNavigate();
    const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [deleteModal, setDeleteModal] = useState<{ id: string; url: string } | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    const fetchAnalyses = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/api/analysis/list");
            if (data.success) {
                setAnalyses(data.analyses);
                setTotalPages(1);
            }
        } catch (err) {
            console.error("Fetch history error", err);
        } finally {
            setLoading(false);
        }
    };

    const openDeleteModal = (id: string, url: string) => {
        setDeleteModal({ id, url });
        setDeleteConfirmText("");
    };

    const closeDeleteModal = () => {
        setDeleteModal(null);
        setDeleteConfirmText("");
    };

    const handleDelete = async () => {
        if (!deleteModal || deleteConfirmText !== "DELETE") return;
        setDeleting(deleteModal.id);
        try {
            const { data } = await api.delete(`/api/analysis/${deleteModal.id}`);
            if (data.success) {
                setAnalyses((prev) => prev.filter((a) => a._id !== deleteModal.id));
            }
        } catch (err) {
            console.error("Delete error", err);
        } finally {
            setDeleting(null);
            closeDeleteModal();
        }
    };

    const getScoreClass = (s: number) => {
        if (s >= 80) return "score-good";
        if (s >= 50) return "score-medium";
        return "score-poor";
    };

    let processedData = [...analyses];

    if (searchQuery) {
        processedData = processedData.filter((a) => a.url.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (statusFilter !== "all") {
        processedData = processedData.filter((a) => a.status === statusFilter);
    }

    processedData.sort((a, b) => {
        if (sortBy === "newest") {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortBy === "oldest") {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortBy === "score_high") {
            return b.overallScore - a.overallScore;
        } else if (sortBy === "score_low") {
            return a.overallScore - b.overallScore;
        }
        return 0;
    });

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        (async () => await fetchAnalyses())();
    }, [page, token]);

    return (
        <div className="min-h-screen pt-16 md:pt-24 bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-medium text-foreground">
                            Analysis <span className="gradient-text">History</span>
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">View and manage all your past SEO analyses.</p>
                    </div>
                    <Link to="/analyze" className="bg-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity self-start" style={{ color: "var(--background)" }}>
                        New Analysis
                    </Link>
                </div>

                {/* Filters Row */}
                <div className="mb-6 flex flex-col md:flex-row gap-3" style={{ animationDelay: "100ms" }}>
                    <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2 flex-1">
                        <Search size={18} className="text-muted-foreground" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by URL..." className="bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none flex-1" id="history-search-input" />
                    </div>

                    <div className="flex gap-3">
                        <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2">
                            <Filter size={16} className="text-muted-foreground" />
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent text-sm text-foreground outline-none appearance-none pr-4 cursor-pointer">
                                <option value="all" className="bg-background">
                                    All Status
                                </option>
                                <option value="completed" className="bg-background">
                                    Completed
                                </option>
                                <option value="processing" className="bg-background">
                                    Processing
                                </option>
                                <option value="failed" className="bg-background">
                                    Failed
                                </option>
                            </select>
                        </div>
                        <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2">
                            <ArrowUpDown size={16} className="text-muted-foreground" />
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent text-sm text-foreground outline-none appearance-none pr-4 cursor-pointer">
                                <option value="newest" className="bg-background">
                                    Newest First
                                </option>
                                <option value="oldest" className="bg-background">
                                    Oldest First
                                </option>
                                <option value="score_high" className="bg-background">
                                    Highest Score
                                </option>
                                <option value="score_low" className="bg-background">
                                    Lowest Score
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex items-center justify-center py-30">
                        <div className="size-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : processedData.length === 0 ? (
                    <div className="glass rounded-2xl p-12 text-center">
                        <Search size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">{searchQuery ? "No matching analyses" : "No analyses yet"}</h3>
                        <p className="text-sm text-muted-foreground">{searchQuery ? "Try a different search term." : "Run your first SEO analysis to see it here."}</p>
                    </div>
                ) : (
                    <div className="space-y-3" style={{ animationDelay: "200ms" }}>
                        {processedData.map((a, index) => {
                            const isBlurred = user?.plan === "free" && index > 0;
                            return (
                                <div key={a._id} className="relative rounded-xl overflow-hidden">
                                    <div className={`glass p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-muted/50 transition-all group ${isBlurred ? "blur-[6px] pointer-events-none select-none opacity-50" : ""}`}>
                                        {/* Score */}
                                        <div className="shrink-0">
                                            {a.status === "completed" ? (
                                                <ScoreGauge score={a.overallScore} size={52} strokeWidth={4} />
                                            ) : a.status === "processing" ? (
                                                <div className="w-[52px] h-[52px] rounded-full glass flex items-center justify-center">
                                                    <Loader2 size={20} className="text-primary animate-spin" />
                                                </div>
                                            ) : (
                                                <div className="w-[52px] h-[52px] rounded-full glass flex items-center justify-center">
                                                    <AlertCircle size={20} className="text-danger" />
                                                </div>
                                            )}
                                        </div>

                                        {/* URL + Meta */}
                                        <div className="flex-1 min-w-0">
                                            <Link to={`/report/${a._id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block">
                                                {(() => {
                                                    try {
                                                        return new URL(a.url).hostname;
                                                    } catch {
                                                        return a.url;
                                                    }
                                                })()}
                                            </Link>
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">{a.url}</p>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {new Date(a.createdAt).toLocaleDateString()}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "completed" ? "bg-success/10 text-success" : a.status === "processing" ? "bg-primary/10 text-primary" : "bg-danger/10 text-danger"}`}>{a.status}</span>
                                            </div>
                                        </div>

                                        {/* Category scores */}
                                        {a.status === "completed" && (
                                            <div className="hidden lg:grid grid-cols-4 gap-4">
                                                {[
                                                    { label: "SEO", value: a.category?.seo ?? 0 },
                                                    { label: "Perf", value: a.category?.performance ?? 0 },
                                                    { label: "A11y", value: a.category?.accessibility ?? 0 },
                                                    { label: "BP", value: a.category?.bestPractices ?? 0 },
                                                ].map((c) => (
                                                    <div key={c.label} className="text-center w-12">
                                                        <p className={`text-sm font-bold ${getScoreClass(c.value)}`}>{c.value}</p>
                                                        <p className="text-[10px] text-muted-foreground">{c.label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Link to={`/report/${a._id}`} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-all" title="View Report">
                                                <ExternalLink size={16} />
                                            </Link>
                                            <button onClick={() => openDeleteModal(a._id, a.url)} disabled={deleting === a._id} className="p-2 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger transition-all disabled:opacity-50" title="Delete">
                                                {deleting === a._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    {isBlurred && (
                                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/20">
                                            <div className="bg-background/95 backdrop-blur-md px-6 py-3 rounded-xl border border-primary/20 text-center flex items-center gap-3 shadow-xl">
                                                <Crown size={20} className="text-primary" />
                                                <div className="text-left">
                                                    <p className="text-sm font-bold text-foreground leading-tight">Pro Feature</p>
                                                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">Upgrade to view full history</p>
                                                </div>
                                                <Link to="/pricing" className="text-xs bg-primary text-background px-4 py-2 rounded-full font-semibold hover:opacity-90 ml-2">
                                                    Upgrade
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-xl glass text-sm text-foreground disabled:opacity-30 hover:bg-muted/50 transition-all">
                            Previous
                        </button>
                        <span className="px-4 py-2 text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-xl glass text-sm text-foreground disabled:opacity-30 hover:bg-muted/50 transition-all">
                            Next
                        </button>
                    </div>
                )}
            </div>
            {/* Delete Confirmation Modal */}
            {deleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeDeleteModal}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-card border border-border rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()} style={{ animation: "fadeIn 0.2s ease-out" }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-danger/10">
                                <Trash2 size={20} className="text-danger" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">Delete Analysis</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">This will permanently delete the analysis for:</p>
                        <p className="text-sm font-medium text-foreground mb-4 truncate">{deleteModal.url}</p>
                        <p className="text-sm text-muted-foreground mb-2">Type <span className="font-bold text-danger">DELETE</span> to confirm:</p>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE here"
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-danger/50 transition-colors mb-5"
                            autoFocus
                            id="delete-confirm-input"
                            onKeyDown={(e) => { if (e.key === "Enter" && deleteConfirmText === "DELETE") handleDelete(); }}
                        />
                        <div className="flex gap-3">
                            <button onClick={closeDeleteModal} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-all">
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteConfirmText !== "DELETE" || deleting === deleteModal.id}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-danger text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {deleting === deleteModal.id ? <Loader2 size={14} className="animate-spin" /> : null}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
