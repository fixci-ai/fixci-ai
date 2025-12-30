import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { StatsOverview } from './StatsOverview';
import { Button } from '../../components/ui';
import { LogOut, LayoutDashboard, Database, Key, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';
// Placeholder imports for feature components
import { SubscriptionsList } from '../subscriptions/SubscriptionsList';
import { GrantAccess } from '../grant/GrantAccess';
import { ActionsPanel } from '../actions/ActionsPanel';

type Tab = 'subscriptions' | 'grant' | 'actions';

export function DashboardLayout() {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('subscriptions');
    const [selectedSubscription, setSelectedSubscription] = useState<any>(null);

    const handleEditSubscription = (sub: any) => {
        setSelectedSubscription(sub);
        setActiveTab('grant');
    };

    const tabs = [
        { id: 'subscriptions', label: 'Subscriptions', icon: Database },
        { id: 'grant', label: 'Grant Access', icon: Key },
        { id: 'actions', label: 'Actions', icon: ShieldAlert },
    ] as const;

    return (
        <div className="min-h-screen bg-slate-950 pb-20">
            {/* Header */}
            <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <LayoutDashboard className="w-5 h-5 text-emerald-500" />
                            </div>
                            <span className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">FixCI Admin</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400 hover:text-red-400">
                            <LogOut className="w-4 h-4 mr-2" />
                            Disconnect
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <StatsOverview />

                {/* Tabs */}
                <div className="border-b border-slate-800 mb-8 flex gap-8">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'pb-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2',
                                activeTab === tab.id
                                    ? 'border-emerald-500 text-emerald-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                    {activeTab === 'subscriptions' && <SubscriptionsList onEdit={handleEditSubscription} />}
                    {activeTab === 'grant' && <GrantAccess initialData={selectedSubscription} />}
                    {activeTab === 'actions' && <ActionsPanel />}
                </div>
            </main>
        </div>
    );
}
