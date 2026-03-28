import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, formatApiError } from '../context/AuthContext';
import { Shield, ArrowRight, ArrowLeft, Droplets } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Ange e-post och lösenord');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await loginAdmin(email.trim(), password);
      navigate('/admin');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" data-testid="admin-login-page">
      {/* Header */}
      <header className="p-6 border-b border-[#E4E4E7]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplets className="w-8 h-8 text-[#0047FF]" />
            <span className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>
              KOPPLINGSGUIDE
            </span>
          </div>
          <Link 
            to="/"
            className="flex items-center gap-2 text-[#52525B] hover:text-[#09090B] transition-colors"
            data-testid="back-to-user-login"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Tillbaka</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Icon */}
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 bg-[#09090B] flex items-center justify-center">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 
            className="text-4xl sm:text-5xl font-black tracking-tighter text-center mb-4"
            style={{ fontFamily: 'Chivo, sans-serif' }}
          >
            ADMIN
          </h1>
          
          <p className="text-center text-[#52525B] mb-12 text-lg">
            Logga in för att hantera systemet
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="overline block mb-3" htmlFor="email-input">
                E-POST
              </label>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if(error) setError(''); }}
                placeholder="admin@example.com"
                className="input-minimal w-full text-lg"
                autoComplete="email"
                autoFocus
                data-testid="admin-email-input"
              />
            </div>

            <div>
              <label className="overline block mb-3" htmlFor="password-input">
                LÖSENORD
              </label>
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if(error) setError(''); }}
                placeholder="••••••••"
                className="input-minimal w-full text-lg"
                autoComplete="current-password"
                data-testid="admin-password-input"
              />
            </div>

            {error && (
              <div 
                className="bg-[#FF204E] text-white p-4 text-center font-medium"
                data-testid="admin-login-error"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="btn-primary w-full flex items-center justify-center gap-3 tap-target disabled:opacity-50 disabled:cursor-not-allowed mt-8"
              data-testid="admin-login-button"
            >
              {loading ? (
                'LOGGAR IN...'
              ) : (
                <>
                  LOGGA IN
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
