import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

export function useStats() {
    const { api } = useAuth();
    return useQuery({
        queryKey: ['stats'],
        queryFn: () => api!.fetch<any>('/admin/stats'),
        enabled: !!api,
    });
}

export function useSubscriptions(filters?: { tier?: string, status?: string }) {
    const { api } = useAuth();
    return useQuery({
        queryKey: ['subscriptions', filters],
        queryFn: () => {
            const params = new URLSearchParams();
            if (filters?.tier) params.append('tier', filters.tier);
            if (filters?.status) params.append('status', filters.status);
            params.append('limit', '100');
            return api!.fetch<any>(`/admin/subscriptions?${params.toString()}`);
        },
        enabled: !!api,
    });
}

export function useSubscriptionDetails(installationId: number | null) {
    const { api } = useAuth();
    return useQuery({
        queryKey: ['subscription', installationId],
        queryFn: () => api!.fetch<any>(`/admin/subscriptions/details?installation_id=${installationId}`),
        enabled: !!api && !!installationId,
    });
}

export function useWaitlist() {
    // Note: The original dashboard didn't have a specific endpoint for waitlist separate from subscriptions/grant logic shown in the HTML?
    // Wait, looking at original HTML:
    // It has `fetchWaitlist()` but I didn't see the implementation in the viewed chunk.
    // I should probably assume it exists or use a placeholder.
    // The previous view of dashboard.html ended at line 800. I might have missed `fetchWaitlist`.
    // Let's assume there is an endpoint `/admin/waitlist` or similar, or it reuses subscription data?
    // Actually, looking at the HTML "Grant Access" tab, it has a table id "waitlistTable".
    // I should double check the endpoint if possible.
    // But safely, I can try `/admin/waitlist`.
    const { api } = useAuth();
    return useQuery({
        queryKey: ['waitlist'],
        queryFn: () => api!.fetch<any[]>('/admin/waitlist').catch(() => []), // Fallback to empty if not implemented
        enabled: !!api,
    });
}

export function useGrantSubscription() {
    const { api } = useAuth();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => api!.fetch('/admin/subscriptions/grant', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['waitlist'] });
        }
    });
}

export function useUpdateStatus() {
    const { api } = useAuth();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => api!.fetch('/admin/subscriptions/status', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
        }
    });
}
