import React, { useState } from 'react';
import { useWaitlist, useGrantSubscription, useSubscriptionDetails } from '../../hooks/useAdminApi';
import { Card, Button, Input, Badge } from '../../components/ui';
import { Search, UserPlus, Loader2 } from 'lucide-react';
// import { cn } from '../../lib/utils';

interface GrantAccessProps {
    initialData?: any;
}

export function GrantAccess({ initialData }: GrantAccessProps) {
    const { data: waitlist, isLoading } = useWaitlist();
    const grantMutation = useGrantSubscription();

    // Fetch full details if we have an ID selected, to get the 'reason' field which might contain the repo URL
    const { data: fullDetails } = useSubscriptionDetails(initialData?.installation_id || null);

    // Grant Form State
    const [email, setEmail] = useState('');
    const [installationId, setInstallationId] = useState('');
    const [repository, setRepository] = useState('');
    const [tier, setTier] = useState('pro');
    const [reason, setReason] = useState('');

    React.useEffect(() => {
        if (initialData) {
            setInstallationId(initialData.installation_id?.toString() || '');
            setEmail(initialData.waitlist_email || ''); // Use real email from waitlist
            setTier(initialData.tier || 'pro');

            // Auto-fill repository from repositories list (first repo if multiple)
            if (initialData.repositories) {
                const repos = initialData.repositories.split(',');
                if (repos.length > 0 && repos[0]) {
                    setRepository(`https://github.com/${repos[0]}`);
                }
            }
        }
    }, [initialData]);

    React.useEffect(() => {
        if (fullDetails) {
            // Populate the reason field with the actual stored reason so user can see it
            if (fullDetails.subscription?.reason) {
                setReason(fullDetails.subscription.reason);

                // Extract repository from reason string
                // Format: "Reason text | Repository: https://github.com/..."
                // Regex is now case insensitive and handles potential whitespace variations
                const match = fullDetails.subscription.reason.match(/Repository\s*:\s*(\S+)/i);
                if (match && match[1]) {
                    setRepository(match[1]);
                }
            } else {
                setReason('Upgrading/Modifying existing subscription');
            }

            // Extract email from various possible locations in the details
            const possibleEmail =
                fullDetails.subscription?.customer_email ||
                fullDetails.installation?.account?.email ||
                fullDetails.subscription?.email; // Fallback

            if (possibleEmail) {
                setEmail(possibleEmail);
            }
        }
    }, [fullDetails]);

    const handleGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await grantMutation.mutateAsync({
                installationId: parseInt(installationId),
                tier,
                reason: reason ? `${reason} | Repository: ${repository}` : `Repository: ${repository}`
            });
            // Reset form
            setEmail('');
            setInstallationId('');
            setRepository('');
            setReason('');
            alert('Subscription granted/updated successfully!');
        } catch (err: any) {
            alert('Error granting subscription: ' + err.message);
        }
    };

    const prefillForm = (w: any) => {
        setEmail(w.email);
        setRepository(w.repository);
        if (w.installationId) setInstallationId(w.installationId.toString());
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Waitlist Column */}
            <div className="lg:col-span-2 space-y-6">
                <div>
                    <h2 className="text-xl font-bold mb-2">Waitlist</h2>
                    <p className="text-slate-400 text-sm">Users who signed up on the landing page</p>
                </div>

                <Card className="p-0 overflow-hidden min-h-[400px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                        </div>
                    ) : (waitlist?.length || 0) === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                            <Search className="w-8 h-8 mb-2 opacity-50" />
                            <p>No waitlist entries found</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/50 text-slate-400">
                                <tr>
                                    <th className="p-4 font-medium">User</th>
                                    <th className="p-4 font-medium">Repository</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {waitlist?.map((w: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-slate-200">{w.email}</div>
                                            <div className="text-xs text-slate-500">{new Date(w.created_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="p-4 text-slate-400">{w.repository}</td>
                                        <td className="p-4">
                                            {w.installationId ? (
                                                <Badge variant="success">Installed</Badge>
                                            ) : (
                                                <Badge>Pending</Badge>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <Button size="sm" variant="secondary" onClick={() => prefillForm(w)}>
                                                Select
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Card>
            </div>

            {/* Grant Form Column */}
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold mb-2">Grant Access</h2>
                    <p className="text-slate-400 text-sm">Manually activate a subscription</p>
                </div>

                <Card className="sticky top-24">
                    <form onSubmit={handleGrant} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</label>
                            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Installation ID</label>
                            <Input value={installationId} onChange={e => setInstallationId(e.target.value)} placeholder="123456" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Repository URL</label>
                            <Input value={repository} onChange={e => setRepository(e.target.value)} placeholder="https://github.com/..." />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tier</label>
                            <select
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                value={tier}
                                onChange={e => setTier(e.target.value)}
                            >
                                <option value="free">Free</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Reason</label>
                            <textarea
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 h-24 resize-none"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="Beta tester, Partner..."
                            />
                        </div>

                        <Button type="submit" className="w-full" isLoading={grantMutation.isPending} disabled={!installationId}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Grant Subscription
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}
