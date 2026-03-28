import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  KeyRound, 
  LogOut, 
  Download, 
  ChevronDown, 
  ChevronUp,
  Droplets,
  AlertTriangle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function UserDashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedStep, setExpandedStep] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    } else if (!authLoading && user && user.role === 'admin') {
      navigate('/admin');
    } else if (user && user.role === 'user') {
      fetchSettings();
    }
  }, [user, authLoading, navigate]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings`, {
        withCredentials: true
      });
      setSettings(response.data);
    } catch (err) {
      setError('Kunde inte hämta information');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const toggleStep = (stepNum) => {
    setExpandedStep(expandedStep === stepNum ? null : stepNum);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Droplets className="w-12 h-12 text-[#0047FF] mx-auto mb-4 animate-pulse" />
          <p className="text-[#52525B]">Laddar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-[#FF204E] mx-auto mb-4" />
          <p className="text-[#FF204E] font-medium">{error}</p>
          <button onClick={fetchSettings} className="btn-outline mt-4">
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="user-dashboard">
      {/* Header */}
      <header className="p-6 border-b border-[#E4E4E7] no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplets className="w-8 h-8 text-[#0047FF]" />
            <span className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>
              KOPPLINGSGUIDE
            </span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-[#52525B] hover:text-[#09090B] transition-colors tap-target"
            data-testid="logout-button"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Logga ut</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-6">
        {/* Welcome */}
        {user?.name && (
          <p className="text-[#52525B] mb-8">
            Välkommen, <span className="font-semibold text-[#09090B]">{user.name}</span>
          </p>
        )}

        {/* Shared Code Section */}
        <section className="mb-12" data-testid="shared-code-section">
          <div className="overline mb-4">NYCKELSKÅPSKOD</div>
          <div className="bg-[#F4F4F5] border border-[#E4E4E7] p-8">
            <div className="flex items-center gap-4 mb-4">
              <KeyRound className="w-8 h-8 text-[#0047FF]" />
              <span className="text-[#52525B]">{settings?.shared_code_description}</span>
            </div>
            <div 
              className="code-display text-[#09090B] text-center py-6"
              data-testid="shared-code-display"
            >
              {settings?.shared_code}
            </div>
          </div>
        </section>

        {/* Instructions Section */}
        <section className="mb-12" data-testid="instructions-section">
          <div className="flex items-center justify-between mb-6">
            <div className="overline">INSTRUKTIONER</div>
            <button 
              onClick={handleDownloadPDF}
              className="btn-outline flex items-center gap-2 py-2 px-4 no-print"
              data-testid="download-pdf-button"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">LADDA NER PDF</span>
            </button>
          </div>

          {/* Instructions Text */}
          <div className="mb-8 p-6 bg-[#FFD700] bg-opacity-20 border-l-4 border-[#FFD700]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#09090B] flex-shrink-0 mt-0.5" />
              <p className="text-[#09090B] font-medium">
                {settings?.instructions_text}
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {settings?.instructions_steps?.map((step, index) => (
              <div 
                key={step.step || index}
                className="border border-[#E4E4E7]"
                data-testid={`instruction-step-${step.step}`}
              >
                <button
                  onClick={() => toggleStep(step.step)}
                  className="w-full p-6 flex items-center gap-6 text-left hover:bg-[#F4F4F5] transition-colors tap-target"
                >
                  <span className="step-number">
                    {String(step.step).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <h3 
                      className="text-xl font-semibold tracking-tight"
                      style={{ fontFamily: 'Chivo, sans-serif' }}
                    >
                      {step.title}
                    </h3>
                  </div>
                  {expandedStep === step.step ? (
                    <ChevronUp className="w-6 h-6 text-[#52525B]" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-[#52525B]" />
                  )}
                </button>
                
                {expandedStep === step.step && (
                  <div className="px-6 pb-6 fade-in">
                    <p className="text-[#52525B] text-lg mb-6 pl-[88px] sm:pl-[104px]">
                      {step.description}
                    </p>
                    {step.image_url && (
                      <div className="pl-[88px] sm:pl-[104px]">
                        <img 
                          src={step.image_url} 
                          alt={step.title}
                          className="w-full max-w-md border border-[#E4E4E7]"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Print-only full content */}
        <div className="hidden print:block">
          <h1 className="text-3xl font-black mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
            KOPPLINGSGUIDE - VATTENSYSTEM
          </h1>
          
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-2">Nyckelskåpskod</h2>
            <div className="text-4xl font-mono font-bold tracking-widest">
              {settings?.shared_code}
            </div>
            <p className="text-sm text-gray-600 mt-2">{settings?.shared_code_description}</p>
          </div>

          <div className="mb-4 p-4 border-l-4 border-yellow-500 bg-yellow-50">
            <p className="font-medium">{settings?.instructions_text}</p>
          </div>

          {settings?.instructions_steps?.map((step) => (
            <div key={step.step} className="mb-6 page-break-inside-avoid">
              <h3 className="text-lg font-bold mb-2">
                {String(step.step).padStart(2, '0')}. {step.title}
              </h3>
              <p className="text-gray-700 mb-3">{step.description}</p>
              {step.image_url && (
                <img 
                  src={step.image_url} 
                  alt={step.title}
                  className="max-w-sm border"
                />
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-[#E4E4E7] text-center text-[#52525B] text-sm no-print">
        Kontakta fastighetsförvaltaren vid problem
      </footer>
    </div>
  );
}
