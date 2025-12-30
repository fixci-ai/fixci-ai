import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Card, Input } from '../../components/ui';
import { KeyRound, Server, ShieldCheck } from 'lucide-react';

export function LoginScreen() {
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [url, setUrl] = useState('https://fixci-github-app.adam-vegh.workers.dev');
    const [key, setKey] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await login(url, key);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
            <Card className="w-full max-w-md border-slate-700 shadow-2xl shadow-emerald-500/5">
                <div className="text-center mb-8">
                    <div className="bg-emerald-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                        <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Admin Access</h1>
                    <p className="text-slate-400 mt-2 text-sm">Enter your credentials to manage FixCI</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Server className="w-3 h-3" />
                            Worker URL
                        </label>
                        <Input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://..."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <KeyRound className="w-3 h-3" />
                            Admin API Key
                        </label>
                        <Input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="sk_admin_..."
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full h-11" isLoading={isLoading}>
                        Connect to Dashboard
                    </Button>
                </form>
            </Card>

            <p className="text-center text-slate-600 text-xs mt-8">
                Secure Session • Local Storage Only
            </p>
        </div>
    );
}
