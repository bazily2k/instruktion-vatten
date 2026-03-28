import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  LogOut, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Users, 
  Settings, 
  Key,
  Droplets,
  AlertTriangle,
  Check,
  Copy,
  ClipboardList,
  RefreshCw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminDashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('codes');
  
  // Access Codes State
  const [accessCodes, setAccessCodes] = useState([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [codeForm, setCodeForm] = useState({ name: '', code: '', description: '' });
  const [codeError, setCodeError] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  
  // Settings State
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    shared_code: '',
    shared_code_description: '',
    instructions_text: '',
    instructions_steps: []
  });
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Login Logs State
  const [loginLogs, setLoginLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    } else if (!authLoading && user && user.role !== 'admin') {
      navigate('/dashboard');
    } else if (user && user.role === 'admin') {
      fetchAccessCodes();
      fetchSettings();
      fetchLoginLogs();
    }
  }, [user, authLoading, navigate]);

  const fetchAccessCodes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/access-codes`, {
        withCredentials: true
      });
      setAccessCodes(response.data);
    } catch (err) {
      console.error('Failed to fetch access codes:', err);
    } finally {
      setCodesLoading(false);
    }
  };

  const fetchLoginLogs = async () => {
    try {
      setLogsLoading(true);
      const response = await axios.get(`${API_URL}/api/login-logs?limit=100`, {
        withCredentials: true
      });
      setLoginLogs(response.data);
    } catch (err) {
      console.error('Failed to fetch login logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings`, {
        withCredentials: true
      });
      setSettings(response.data);
      setSettingsForm(response.data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Access Codes Functions
  const openNewCodeModal = () => {
    setEditingCode(null);
    setCodeForm({ name: '', code: '', description: '' });
    setCodeError('');
    setShowCodeModal(true);
  };

  const openEditCodeModal = (code) => {
    setEditingCode(code);
    setCodeForm({ name: code.name, code: code.code, description: code.description });
    setCodeError('');
    setShowCodeModal(true);
  };

  const handleSaveCode = async () => {
    if (!codeForm.name.trim() || !codeForm.code.trim()) {
      setCodeError('Namn och kod krävs');
      return;
    }

    try {
      if (editingCode) {
        await axios.put(
          `${API_URL}/api/access-codes/${editingCode.id}`,
          codeForm,
          { withCredentials: true }
        );
      } else {
        await axios.post(
          `${API_URL}/api/access-codes`,
          codeForm,
          { withCredentials: true }
        );
      }
      setShowCodeModal(false);
      fetchAccessCodes();
    } catch (err) {
      setCodeError(err.response?.data?.detail || 'Något gick fel');
    }
  };

  const handleDeleteCode = async (codeId) => {
    if (!window.confirm('Är du säker på att du vill ta bort denna kod?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/access-codes/${codeId}`, {
        withCredentials: true
      });
      fetchAccessCodes();
    } catch (err) {
      console.error('Failed to delete code:', err);
    }
  };

  const handleToggleCodeActive = async (code) => {
    try {
      await axios.put(
        `${API_URL}/api/access-codes/${code.id}`,
        { is_active: !code.is_active },
        { withCredentials: true }
      );
      fetchAccessCodes();
    } catch (err) {
      console.error('Failed to toggle code:', err);
    }
  };

  const copyCodeToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Settings Functions
  const handleSaveSettings = async () => {
    try {
      setSettingsError('');
      await axios.put(
        `${API_URL}/api/settings`,
        settingsForm,
        { withCredentials: true }
      );
      setSettings(settingsForm);
      setEditingSettings(false);
      setSettingsSuccess('Inställningar sparade!');
      setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (err) {
      setSettingsError(err.response?.data?.detail || 'Kunde inte spara inställningar');
    }
  };

  const handleAddStep = () => {
    const newStep = {
      step: settingsForm.instructions_steps.length + 1,
      title: '',
      description: '',
      image_url: ''
    };
    setSettingsForm({
      ...settingsForm,
      instructions_steps: [...settingsForm.instructions_steps, newStep]
    });
  };

  const handleUpdateStep = (index, field, value) => {
    const newSteps = [...settingsForm.instructions_steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSettingsForm({ ...settingsForm, instructions_steps: newSteps });
  };

  const handleRemoveStep = (index) => {
    const newSteps = settingsForm.instructions_steps.filter((_, i) => i !== index);
    // Renumber steps
    newSteps.forEach((step, i) => { step.step = i + 1; });
    setSettingsForm({ ...settingsForm, instructions_steps: newSteps });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Droplets className="w-12 h-12 text-[#0047FF] mx-auto mb-4 animate-pulse" />
          <p className="text-[#52525B]">Laddar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5]" data-testid="admin-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-[#E4E4E7] p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#09090B] flex items-center justify-center">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>
                ADMIN
              </h1>
              <p className="text-sm text-[#52525B]">Kopplingsguide</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-[#52525B] hover:text-[#09090B] transition-colors tap-target"
            data-testid="admin-logout-button"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Logga ut</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-white border border-[#E4E4E7] p-1 rounded-none">
            <TabsTrigger 
              value="codes" 
              className="data-[state=active]:bg-[#09090B] data-[state=active]:text-white rounded-none px-6"
              data-testid="tab-codes"
            >
              <Users className="w-4 h-4 mr-2" />
              Åtkomstkoder
            </TabsTrigger>
            <TabsTrigger 
              value="logs" 
              className="data-[state=active]:bg-[#09090B] data-[state=active]:text-white rounded-none px-6"
              data-testid="tab-logs"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              Inloggningslogg
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="data-[state=active]:bg-[#09090B] data-[state=active]:text-white rounded-none px-6"
              data-testid="tab-settings"
            >
              <Settings className="w-4 h-4 mr-2" />
              Inställningar
            </TabsTrigger>
          </TabsList>

          {/* Access Codes Tab */}
          <TabsContent value="codes" className="mt-0">
            <div className="bg-white border border-[#E4E4E7] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  Åtkomstkoder
                </h2>
                <button 
                  onClick={openNewCodeModal}
                  className="btn-primary flex items-center gap-2 py-3"
                  data-testid="add-code-button"
                >
                  <Plus className="w-5 h-5" />
                  <span>NY KOD</span>
                </button>
              </div>

              {codesLoading ? (
                <p className="text-[#52525B]">Laddar koder...</p>
              ) : accessCodes.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-[#E4E4E7]">
                  <Key className="w-12 h-12 text-[#E4E4E7] mx-auto mb-4" />
                  <p className="text-[#52525B]">Inga åtkomstkoder skapade ännu</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {accessCodes.map((code) => (
                    <div 
                      key={code.id}
                      className={`border p-4 ${code.is_active ? 'border-[#E4E4E7]' : 'border-[#FF204E] bg-[#FF204E] bg-opacity-5'}`}
                      data-testid={`access-code-${code.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{code.name}</h3>
                          <p className="text-sm text-[#52525B]">{code.description}</p>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => openEditCodeModal(code)}
                            className="p-2 hover:bg-[#F4F4F5] transition-colors"
                            data-testid={`edit-code-${code.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteCode(code.id)}
                            className="p-2 hover:bg-[#FF204E] hover:text-white transition-colors"
                            data-testid={`delete-code-${code.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between bg-[#F4F4F5] p-3 mb-3">
                        <code className="font-mono font-bold text-lg tracking-widest">
                          {code.code}
                        </code>
                        <button 
                          onClick={() => copyCodeToClipboard(code.code)}
                          className="p-1 hover:bg-[#E4E4E7] transition-colors"
                          title="Kopiera"
                        >
                          {copiedCode === code.code ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <button 
                          onClick={() => handleToggleCodeActive(code)}
                          className={`px-3 py-1 font-medium ${
                            code.is_active 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-[#FF204E] bg-opacity-10 text-[#FF204E]'
                          }`}
                          data-testid={`toggle-code-${code.id}`}
                        >
                          {code.is_active ? 'AKTIV' : 'INAKTIV'}
                        </button>
                        {code.last_used && (
                          <span className="text-[#52525B]">
                            Senast: {new Date(code.last_used).toLocaleDateString('sv-SE')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-0">
            <div className="bg-white border border-[#E4E4E7] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  Inställningar
                </h2>
                {!editingSettings ? (
                  <button 
                    onClick={() => setEditingSettings(true)}
                    className="btn-outline flex items-center gap-2 py-3"
                    data-testid="edit-settings-button"
                  >
                    <Edit2 className="w-5 h-5" />
                    <span>REDIGERA</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditingSettings(false); setSettingsForm(settings); }}
                      className="btn-outline flex items-center gap-2 py-3"
                      data-testid="cancel-settings-button"
                    >
                      <X className="w-5 h-5" />
                      <span>AVBRYT</span>
                    </button>
                    <button 
                      onClick={handleSaveSettings}
                      className="btn-primary flex items-center gap-2 py-3"
                      data-testid="save-settings-button"
                    >
                      <Save className="w-5 h-5" />
                      <span>SPARA</span>
                    </button>
                  </div>
                )}
              </div>

              {settingsError && (
                <div className="bg-[#FF204E] text-white p-4 mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {settingsError}
                </div>
              )}

              {settingsSuccess && (
                <div className="bg-green-600 text-white p-4 mb-6 flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  {settingsSuccess}
                </div>
              )}

              {settingsLoading ? (
                <p className="text-[#52525B]">Laddar inställningar...</p>
              ) : (
                <div className="space-y-8">
                  {/* Shared Code */}
                  <div>
                    <label className="overline block mb-3">NYCKELSKÅPSKOD</label>
                    {editingSettings ? (
                      <Input
                        value={settingsForm.shared_code}
                        onChange={(e) => setSettingsForm({ ...settingsForm, shared_code: e.target.value })}
                        className="font-mono text-2xl tracking-widest rounded-none border-2"
                        data-testid="settings-shared-code"
                      />
                    ) : (
                      <div className="font-mono text-4xl font-bold tracking-widest bg-[#F4F4F5] p-4">
                        {settings?.shared_code}
                      </div>
                    )}
                  </div>

                  {/* Shared Code Description */}
                  <div>
                    <label className="overline block mb-3">KODBESKRIVNING</label>
                    {editingSettings ? (
                      <Input
                        value={settingsForm.shared_code_description}
                        onChange={(e) => setSettingsForm({ ...settingsForm, shared_code_description: e.target.value })}
                        className="rounded-none border-2"
                        data-testid="settings-code-description"
                      />
                    ) : (
                      <p className="text-[#52525B]">{settings?.shared_code_description}</p>
                    )}
                  </div>

                  {/* Instructions Text */}
                  <div>
                    <label className="overline block mb-3">INSTRUKTIONSTEXT</label>
                    {editingSettings ? (
                      <textarea
                        value={settingsForm.instructions_text}
                        onChange={(e) => setSettingsForm({ ...settingsForm, instructions_text: e.target.value })}
                        className="w-full border-2 border-[#E4E4E7] p-3 rounded-none focus:border-[#0047FF] focus:outline-none min-h-[100px]"
                        data-testid="settings-instructions-text"
                      />
                    ) : (
                      <div className="p-4 bg-[#FFD700] bg-opacity-20 border-l-4 border-[#FFD700]">
                        <p className="font-medium">{settings?.instructions_text}</p>
                      </div>
                    )}
                  </div>

                  {/* Instructions Steps */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="overline">INSTRUKTIONSSTEG</label>
                      {editingSettings && (
                        <button 
                          onClick={handleAddStep}
                          className="btn-outline py-2 px-4 flex items-center gap-2 text-sm"
                          data-testid="add-step-button"
                        >
                          <Plus className="w-4 h-4" />
                          LÄGG TILL STEG
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {(editingSettings ? settingsForm.instructions_steps : settings?.instructions_steps)?.map((step, index) => (
                        <div key={index} className="border border-[#E4E4E7] p-4">
                          <div className="flex items-start gap-4">
                            <span className="step-number text-4xl">{String(step.step).padStart(2, '0')}</span>
                            <div className="flex-1 space-y-3">
                              {editingSettings ? (
                                <>
                                  <Input
                                    value={step.title}
                                    onChange={(e) => handleUpdateStep(index, 'title', e.target.value)}
                                    placeholder="Titel"
                                    className="rounded-none border-2 font-semibold"
                                  />
                                  <textarea
                                    value={step.description}
                                    onChange={(e) => handleUpdateStep(index, 'description', e.target.value)}
                                    placeholder="Beskrivning"
                                    className="w-full border-2 border-[#E4E4E7] p-2 rounded-none focus:border-[#0047FF] focus:outline-none"
                                  />
                                  <Input
                                    value={step.image_url}
                                    onChange={(e) => handleUpdateStep(index, 'image_url', e.target.value)}
                                    placeholder="Bild-URL"
                                    className="rounded-none border-2 text-sm"
                                  />
                                </>
                              ) : (
                                <>
                                  <h3 className="font-semibold text-lg">{step.title}</h3>
                                  <p className="text-[#52525B]">{step.description}</p>
                                  {step.image_url && (
                                    <img src={step.image_url} alt={step.title} className="max-w-xs border" />
                                  )}
                                </>
                              )}
                            </div>
                            {editingSettings && (
                              <button 
                                onClick={() => handleRemoveStep(index)}
                                className="p-2 hover:bg-[#FF204E] hover:text-white transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Login Logs Tab */}
          <TabsContent value="logs" className="mt-0">
            <div className="bg-white border border-[#E4E4E7] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  Inloggningslogg
                </h2>
                <button 
                  onClick={fetchLoginLogs}
                  className="btn-outline flex items-center gap-2 py-3"
                  data-testid="refresh-logs-button"
                >
                  <RefreshCw className={`w-5 h-5 ${logsLoading ? 'animate-spin' : ''}`} />
                  <span>UPPDATERA</span>
                </button>
              </div>

              {logsLoading ? (
                <p className="text-[#52525B]">Laddar loggar...</p>
              ) : loginLogs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-[#E4E4E7]">
                  <ClipboardList className="w-12 h-12 text-[#E4E4E7] mx-auto mb-4" />
                  <p className="text-[#52525B]">Inga inloggningar registrerade ännu</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="login-logs-table">
                    <thead>
                      <tr className="border-b-2 border-[#09090B]">
                        <th className="text-left py-3 px-4 overline">DATUM & TID</th>
                        <th className="text-left py-3 px-4 overline">ANVÄNDARE</th>
                        <th className="text-left py-3 px-4 overline">KOD</th>
                        <th className="text-left py-3 px-4 overline">IP-ADRESS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loginLogs.map((log) => (
                        <tr 
                          key={log.id} 
                          className="border-b border-[#E4E4E7] hover:bg-[#F4F4F5] transition-colors"
                          data-testid={`login-log-${log.id}`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium">
                              {new Date(log.timestamp).toLocaleDateString('sv-SE')}
                            </div>
                            <div className="text-sm text-[#52525B]">
                              {new Date(log.timestamp).toLocaleTimeString('sv-SE')}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium">{log.user_name}</td>
                          <td className="py-3 px-4">
                            <code className="font-mono bg-[#F4F4F5] px-2 py-1 tracking-wider">
                              {log.user_code}
                            </code>
                          </td>
                          <td className="py-3 px-4 text-[#52525B] text-sm font-mono">
                            {log.ip_address || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Code Modal */}
      <Dialog open={showCodeModal} onOpenChange={setShowCodeModal}>
        <DialogContent className="rounded-none border-2 border-[#09090B]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>
              {editingCode ? 'REDIGERA KOD' : 'NY ÅTKOMSTKOD'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="overline block mb-2">NAMN</label>
              <Input
                value={codeForm.name}
                onChange={(e) => setCodeForm({ ...codeForm, name: e.target.value })}
                placeholder="T.ex. Johan Andersson"
                className="rounded-none border-2"
                data-testid="code-name-input"
              />
            </div>
            <div>
              <label className="overline block mb-2">KOD</label>
              <Input
                value={codeForm.code}
                onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })}
                placeholder="T.ex. ABC123"
                className="rounded-none border-2 font-mono tracking-widest"
                data-testid="code-code-input"
              />
            </div>
            <div>
              <label className="overline block mb-2">BESKRIVNING (VALFRITT)</label>
              <Input
                value={codeForm.description}
                onChange={(e) => setCodeForm({ ...codeForm, description: e.target.value })}
                placeholder="T.ex. Lägenhet 3B"
                className="rounded-none border-2"
                data-testid="code-description-input"
              />
            </div>

            {codeError && (
              <div className="bg-[#FF204E] text-white p-3 text-sm">
                {codeError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCodeModal(false)}
              className="rounded-none border-2"
            >
              AVBRYT
            </Button>
            <Button 
              onClick={handleSaveCode}
              className="rounded-none bg-[#0047FF] hover:bg-blue-800"
              data-testid="save-code-button"
            >
              {editingCode ? 'SPARA' : 'SKAPA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
