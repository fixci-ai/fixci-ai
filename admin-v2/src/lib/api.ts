export class ApiClient {
    private baseUrl: string;
    private apiKey: string;

    constructor(baseUrl: string, apiKey: string) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.apiKey = apiKey;
    }

    async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            let errorMessage = 'API call failed';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                // ignore json parse error
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }
}

export const STORAGE_KEYS = {
    WORKER_URL: 'fixci_admin_worker_url',
    API_KEY: 'fixci_admin_api_key'
};
