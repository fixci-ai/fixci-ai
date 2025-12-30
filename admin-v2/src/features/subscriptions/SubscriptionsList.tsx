import { useState } from 'react';
import { useSubscriptions } from '../../hooks/useAdminApi';
import { Card, Badge, Button } from '../../components/ui';

interface SubscriptionsListProps {
    onEdit: (subscription: any) => void;
}

export function SubscriptionsList({ onEdit }: SubscriptionsListProps) {
    const [filterTier, setFilterTier] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const { data, isLoading, error } = useSubscriptions({ tier: filterTier, status: filterStatus });

    if (isLoading) return <div className="text-center p-12 text-slate-500">Loading subscriptions...</div>;
    if (error) return <div className="text-center p-12 text-red-400">Error loading subscriptions</div>;

    const subs = data?.subscriptions || [];

    return (
        <div className="space-y-4">
            <div className="flex gap-4 mb-6">
                <select
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300"
                    value={filterTier}
                    onChange={(e) => setFilterTier(e.target.value)}
                >
                    <option value="">All Tiers</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                </select>
                <select
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {subs.length === 0 ? (
                <div className="text-center p-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">No subscriptions found</div>
            ) : (
                <Card className="p-0 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/50 text-slate-400">
                            <tr>
                                <th className="p-4 font-medium">Installation</th>
                                <th className="p-4 font-medium">Account</th>
                                <th className="p-4 font-medium">Tier</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Usage</th>
                                <th className="p-4 font-medium">Period</th>
                                <th className="p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {subs.map((sub: any) => (
                                <tr key={sub.installation_id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 text-slate-300">#{sub.installation_id}</td>
                                    <td className="p-4 font-medium text-slate-200">{sub.account_login}</td>
                                    <td className="p-4">
                                        <Badge variant={sub.tier === 'pro' ? 'success' : sub.tier === 'enterprise' ? 'warning' : 'default'}>
                                            {sub.tier}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        <Badge variant={sub.status === 'active' ? 'success' : 'danger'}>
                                            {sub.status}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-slate-400">
                                        {sub.analyses_used_current_period} / {sub.analyses_limit_monthly || '∞'}
                                    </td>
                                    <td className="p-4 text-slate-500 text-xs">
                                        {sub.current_period_start} → {sub.current_period_end}
                                    </td>
                                    <td className="p-4">
                                        <Button size="sm" variant="secondary" onClick={() => onEdit(sub)}>
                                            Manage
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
}
