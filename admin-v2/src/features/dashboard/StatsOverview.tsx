// import React from 'react';
import { useStats } from '../../hooks/useAdminApi';
import { Card } from '../../components/ui';
import { BarChart3, Users, CreditCard, Activity } from 'lucide-react';

export function StatsOverview() {
    const { data: stats, isLoading } = useStats();

    if (isLoading) {
        return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => <Card key={i} className="h-32 animate-pulse bg-slate-800/30" children={null} />)}
        </div>;
    }

    if (!stats) return null;

    const items = [
        {
            label: 'Total Installations',
            value: stats.tiers.reduce((sum: number, t: any) => sum + t.count, 0),
            icon: Users,
            color: 'text-blue-400',
            bg: 'bg-blue-400/10'
        },
        {
            label: 'Pro Subscribers',
            value: stats.tiers.find((t: any) => t.tier === 'pro')?.count || 0,
            icon: BarChart3,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10'
        },
        {
            label: 'Monthly Revenue',
            value: `$${stats.revenue.total.toFixed(2)}`,
            icon: CreditCard,
            color: 'text-amber-400',
            bg: 'bg-amber-400/10'
        },
        {
            label: 'Analyses (7 days)',
            value: stats.activity.analysesLast7Days,
            icon: Activity,
            color: 'text-purple-400',
            bg: 'bg-purple-400/10'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {items.map((item, i) => (
                <Card key={i} className="relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">{item.label}</p>
                            <h3 className="text-3xl font-bold text-slate-100">{item.value}</h3>
                        </div>
                        <div className={`p-3 rounded-xl ${item.bg}`}>
                            <item.icon className={`w-6 h-6 ${item.color}`} />
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
