import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, formatApiError } from '../context/AuthContext';
import { KeyRound, ArrowRight, Shield, Droplets } from 'lucide-react';

export default function UserLogin() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter your personal code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await loginUser(code.trim());
      navigate('/dashboard');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    // Allow only alphanumeric characters and convert to uppercase
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    setCode(value);
    if (error) setError('');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" data-testid="user-login-page">
      {/* Header */}
      <header className="p-6 border-b border-[#E4E4E7]">
        <div className="flex items-center gap-3">
          <Droplets className="w-8 h-8 text-[#0047FF]" />
          <span className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>
            CONNECTION GUIDE
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Icon */}
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 bg-[#F4F4F5] flex items-center justify-center">
              <KeyRound className="w-10 h-10 text-[#0047FF]" />
            </div>
          </div>

          {/* Title */}
          <h1 
            className="text-4xl sm:text-5xl font-black tracking-tighter text-center mb-4"
            style={{ fontFamily: 'Chivo, sans-serif' }}
          >
            LOG IN
          </h1>
          
          <p className="text-center text-[#52525B] mb-12 text-lg">
            Enter your personal access code
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="overline block mb-4" htmlFor="code-input">
                PERSONAL CODE
              </label>
              <input
                id="code-input"
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="ABC123"
                className="code-input"
                maxLength={12}
                autoComplete="off"
                autoFocus
                data-testid="user-code-input"
              />
            </div>

            {error && (
              <div 
                className="bg-[#FF204E] text-white p-4 text-center font-medium"
                data-testid="login-error"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="btn-primary w-full flex items-center justify-center gap-3 tap-target disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="user-login-button"
            >
              {loading ? (
                'LOGGING IN...'
              ) : (
                <>
                  CONTINUE
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-[#E4E4E7]">
        <Link 
          to="/admin/login"
          className="flex items-center justify-center gap-2 text-[#52525B] hover:text-[#09090B] transition-colors"
          data-testid="admin-login-link"
        >
          <Shield className="w-4 h-4" />
          <span className="text-sm font-medium">Administrator</span>
        </Link>
      </footer>
    </div>
  );
}
