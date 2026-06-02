import { AuthProvider, useAuth } from './AuthContext';
import { auth } from './lib/firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f4]">
        <div className="w-12 h-12 border-4 border-[#0a0a0a] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!user.isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-2xl border border-slate-200 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Aprovação Pendente</h1>
            <p className="text-slate-500 mt-2">Olá, {user.name}! Sua conta foi criada, mas ainda aguarda aprovação de um administrador.</p>
          </div>
          <p className="text-sm text-slate-400">Entre em contato com a academia para agilizar o processo.</p>
          <button 
            onClick={() => auth.signOut()}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold transition-all shadow-lg active:scale-[0.98]"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
