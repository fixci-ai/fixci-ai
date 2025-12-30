import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient, STORAGE_KEYS } from '../lib/api';

interface AuthContextType {
    isAuthenticated: boolean;
    api: ApiClient | null;
    login: (workerUrl: string, apiKey: string) => Promise<void>;
    logout: () => void;
    workerUrl: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [api, setApi] = useState<ApiClient | null>(null);
    const [workerUrl, setWorkerUrl] = useState('');

    useEffect(() => {
        // Restore session if active (only checks if keys exist, validation happens on first fetch)
        const storedUrl = localStorage.getItem(STORAGE_KEYS.WORKER_URL);
        const storedKey = sessionStorage.getItem(STORAGE_KEYS.API_KEY); // Use session storage for security like original? 
        // Original used vars in memory, effectively session. Replicating that behavior.
        // Actually original said: "Stored only in browser session... Cleared when you close the browser"

        if (storedUrl && storedKey) {
            setWorkerUrl(storedUrl);
            setApi(new ApiClient(storedUrl, storedKey));
        }
    }, []);

    const login = async (url: string, key: string) => {
        const client = new ApiClient(url, key);
        // Verify credentials
        await client.fetch('/admin/stats');

        localStorage.setItem(STORAGE_KEYS.WORKER_URL, url);
        sessionStorage.setItem(STORAGE_KEYS.API_KEY, key);
        setWorkerUrl(url);
        setApi(client);
    };

    const logout = () => {
        setApi(null);
        sessionStorage.removeItem(STORAGE_KEYS.API_KEY);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!api, api, login, logout, workerUrl }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
