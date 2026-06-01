import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import Report from "./pages/Report";
import History from "./pages/History";
import RankTracker from "./pages/RankTracker";
import RankDetail from "./pages/RankDetail";
import EmailVerify from "./pages/EmailVerify";
import ResetPassword from "./pages/ResetPassword";
import Pricing from "./pages/Pricing";
import { Toaster } from "react-hot-toast";
import { useApp } from "./context/AppContext";
import { Navigate } from "react-router-dom";

export default function App() {
    const { token, user, loading } = useApp();

    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />    
            </div>
        );
    }

    const hideNavbar = ["/login", "/register", "/email-verify", "/reset-password"].includes(location.pathname);

    return (
        <>
            <Toaster />
            {!hideNavbar && <Navbar />}
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={token ? (user?.isAccountVerified ? <Navigate to="/dashboard" replace /> : <Navigate to="/email-verify" replace />) : <Login state="login" />} />
                <Route path="/register" element={token ? (user?.isAccountVerified ? <Navigate to="/dashboard" replace /> : <Navigate to="/email-verify" replace />) : <Login state="register" />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/analyze" element={<Analyze />} />
                    <Route path="/report/:id" element={<Report />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/rank-tracker" element={<RankTracker />} />
                    <Route path="/rank/:id" element={<RankDetail />} />
                    <Route path="/email-verify" element={<EmailVerify />} />
                </Route>
            </Routes>
        </>
    );
}
