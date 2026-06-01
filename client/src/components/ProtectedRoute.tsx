import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function ProtectedRoute() {
    const context = useApp();
    const location = useLocation();
    
    // Safety check for context
    if (!context) return null;
    
    const { token, user, loading } = context;
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-900">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />    
            </div>
        );
    }

    if (!token) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Redirect to verification if not verified
    if (user && !user.isAccountVerified && location.pathname !== "/email-verify") {
        return <Navigate to="/email-verify" replace />;
    }

    return <Outlet />;
}
