import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export function Button({ className, variant = 'primary', size = 'default', isLoading, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost', size?: 'default' | 'sm' | 'icon', isLoading?: boolean }) {
    const variants = {
        primary: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
        secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
        danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20',
        ghost: 'bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200',
    };

    const sizes = {
        default: 'px-4 py-2 rounded-lg',
        sm: 'px-3 py-1.5 rounded-md text-sm',
        icon: 'p-2 rounded-lg',
    };

    return (
        <button
            className={cn('inline-flex items-center justify-center font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95', variants[variant], sizes[size], className)}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {children}
        </button>
    );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={cn('w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all', className)}
            {...props}
        />
    );
}

export function Card({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <div className={cn('bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6', className)}>
            {children}
        </div>
    );
}

export function Badge({ className, variant = 'default', children }: { className?: string, variant?: 'default' | 'success' | 'warning' | 'danger', children: React.ReactNode }) {
    const variants = {
        default: 'bg-slate-700/50 text-slate-300 border-slate-600',
        success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    return (
        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', variants[variant], className)}>
            {children}
        </span>
    );
}
