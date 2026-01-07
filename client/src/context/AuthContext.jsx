import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/auth/me', {
                    credentials: 'include'
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                }
            } catch (err) {
                console.error("Auth check failed", err);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    const login = async (username, password) => {
        try {
            console.log("Attempting login for:", username);
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include' // Important for cookies
            });

            console.log("Login response status:", res.status);

            if (res.ok) {
                const data = await res.json();
                setUser(data);
                return { success: true };
            } else {
                let errorMsg = 'Login failed';
                try {
                    const err = await res.json();
                    errorMsg = err.error || errorMsg;
                } catch (e) {
                    console.error("Error parsing error response:", e);
                    const text = await res.text();
                    console.error("Raw response:", text);
                }
                return { success: false, error: errorMsg };
            }
        } catch (err) {
            console.error("Login network error:", err);
            return { success: false, error: "Network error: " + err.message };
        }
    };

    const logout = async () => {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        setUser(null);
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen text-slate-400">Loading auth...</div>;
    }

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
