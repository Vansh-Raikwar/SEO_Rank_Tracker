import { createContext, useContext } from "react";
import type {AxiosInstance} from "axios";
import React,{useState,useEffect} from "react";
import axios from "axios";

type User = {
    _id: string;
    name: string;
    email: string;
    plan: string;
    analysisCount?: number;
    dailyAnalysisCount?: number;
    planExpiresAt?: string | null;
    isAccountVerified: boolean;
}

type AppContextType = {
    user: User | null;
    token: string | null;
    loading: boolean;
    api: AxiosInstance;
    login: (email: string, password: string) => Promise<{ success: boolean, message?: string }>;
    register: (name: string, email: string, password: string) => Promise<{ success: boolean, message?: string }>;
    logout: () => void;
    loadUser: () => Promise<void>;
    setToken: (token: string | null) => void;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const api = axios.create({
    baseURL: BACKEND_URL,
});

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [token, setToken] = useState<string | null>(() => {
        const t = localStorage.getItem("token");
        return (t && t !== "undefined") ? t : null;
    });

    // Set up interceptor once
    useEffect(() => {
        const interceptor = api.interceptors.request.use((config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
        return () => api.interceptors.request.eject(interceptor);
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const { data } = await api.post(`${BACKEND_URL}/api/auth/login`, { email, password });
            if (data.success) {
                setToken(data.token);
                setUser(data.user);
                localStorage.setItem("token", data.token);
                return { success: true };
            }
            return { success: false, message: data.message };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.message || "Login failed" };
        }
    };

    const register = async (name: string, email: string, password: string) => {
        try {
            const { data } = await api.post(`${BACKEND_URL}/api/auth/register`, { name, email, password });
            if (data.success) {
                setToken(data.token);
                setUser(data.user);
                localStorage.setItem("token", data.token);
                return { success: true };
            }
            return { success: false, message: data.message };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.message || "Registration failed" };
        }
    };

    const logout = async () => {
        try {
            await api.post(`${BACKEND_URL}/api/auth/logout`);
            setToken(null);
            setUser(null);
            localStorage.removeItem("token");
        } catch (error) {
            console.error("Logout error", error);
        }
    };

    const loadUser = async () => {
        const currentToken = localStorage.getItem("token");
        if (!currentToken) {
            setToken(null);
            setLoading(false);
            return;
        }

        // Ensure state is synced with localStorage
        setToken(currentToken);

        try {
            const { data } = await api.get(`${BACKEND_URL}/api/auth/user`);
            if (data.success) {
                setUser(data.user);
            }
        } catch (error) {
            console.error("Load user error:", error);
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUser();
    }, []);

    const value = React.useMemo(() => ({
        user,
        token,
        loading,
        api,
        login,
        register,
        logout,
        loadUser,
        setToken
    }), [user, token, loading]);

    return <AppContext.Provider value={value}>
        {children}
    </AppContext.Provider>;
}

export function useApp(){
    const context = useContext(AppContext);
    if(context === undefined || context === null  || !context){
        throw new Error("useApp must be used within an AppProvider");
    }
    return context;
}