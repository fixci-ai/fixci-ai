import { useAuth, AuthProvider } from './contexts/AuthContext';
import { LoginScreen } from './features/auth/LoginScreen';
import { DashboardLayout } from './features/dashboard/DashboardLayout';

function AppContent() {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <DashboardLayout /> : <LoginScreen />;
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
