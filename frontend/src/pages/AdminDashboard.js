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
  RefreshCw,
  Image,
  FileText,
  Link
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

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

  // Helper to migrate old image_url format to new media array format
  const migrateStepToMediaFormat = (step) => {
    if (step.media && Array.isArray(step.media)) {
      return step; // Already in new format
    }
    // Migrate from old format
    const media = [];
    if (step.image_url) {
      media.push({ type: 'image', url: step.image_url, caption: '' });
    }
    return { ...step, media, image_url: undefined };
  };

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
      const data = response.data;
      // Migrate steps to new media format
      if (data.instructions_steps) {
        data.instructions_steps = data.instructions_steps.map(migrateStepToMediaFormat);
      }
      setSettings(data);
      setSettingsForm(data);
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
      setCodeError('Name and code are required');
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
      setCodeError(err.response?.data?.detail || 'Something went wrong');
    }
  };

  const handleDeleteCode = async (codeId) => {
    if (!window.confirm('Are you sure you want to delete this code?')) return;
    
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
      setSettingsSuccess('Settings saved!');
      setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (err) {
      setSettingsError(err.response?.data?.detail || 'Could not save settings');
    }
  };

  const handleAddStep = () => {
    const newStep = {
      step: settingsForm.instructions_steps.length + 1,
      title: '',
      description: '',
      media: []
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

  // Media functions for steps
  const handleAddMedia = (stepIndex) => {
    const newSteps = [...settingsForm.instructions_steps];
    if (!newSteps[stepIndex].media) {
      newSteps[stepIndex].media = [];
    }
    newSteps[stepIndex].media.push({ type: 'image', url: '', caption: '' });
    setSettingsForm({ ...settingsForm, instructions_steps: newSteps });
  };

  const handleUpdateMedia = (stepIndex, mediaIndex, field, value) => {
    const newSteps = [...settingsForm.instructions_steps];
    newSteps[stepIndex].media[mediaIndex] = { 
      ...newSteps[stepIndex].media[mediaIndex], 
      [field]: value 
    };
    setSettingsForm({ ...settingsForm, instructions_steps: newSteps });
  };

  const handleRemoveMedia = (stepIndex, mediaIndex) => {
    const newSteps = [...settingsForm.instructions_steps];
    newSteps[stepIndex].media = newSteps[stepIndex].media.filter((_, i) => i !== mediaIndex);
    setSettingsForm({ ...settingsForm, instructions_steps: newSteps });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Droplets className="w-12 h-12 text-[#0047FF] mx-auto mb-4 animate-pulse" />
          <p className="text-[#52525B]">Loading...</p>
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
              <p className="text-sm text-[#52525B]">Connection Guide</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-[#52525B] hover:text-[#09090B] transition-colors tap-target"
            data-testid="admin-logout-button"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Log out</span>
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
              Access Codes
            </TabsTrigger>
            <TabsTrigger 
              value="logs" 
              className="data-[state=active]:bg-[#09090B] data-[state=active]:text-white rounded-none px-6"
              data-testid="tab-logs"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              Login History
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="data-[state=active]:bg-[#09090B] data-[state=active]:text-white rounded-none px-6"
              data-testid="tab-settings"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Access Codes Tab */}
          <TabsContent value="codes" className="mt-0">
            <div className="bg-white border border-[#E4E4E7] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  Access Codes
                </h2>
                <button 
                  onClick={openNewCodeModal}
                  className="btn-primary flex items-center gap-2 py-3"
                  data-testid="add-code-button"
                >
                  <Plus className="w-5 h-5" />
                  <span>NEW CODE</span>
                </button>
              </div>

              {codesLoading ? (
                <p className="text-[#52525B]">Loading codes...</p>
              ) : accessCodes.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-[#E4E4E7]">
                  <Key className="w-12 h-12 text-[#E4E4E7] mx-auto mb-4" />
                  <p className="text-[#52525B]">No access codes created yet</p>
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
                          title="Copy"
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
                          {code.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                        {code.last_used && (
                          <span className="text-[#52525B]">
                            Last: {new Date(code.last_used).toLocaleDateString('en-US')}
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
                  Settings
                </h2>
                {!editingSettings ? (
                  <button 
                    onClick={() => setEditingSettings(true)}
                    className="btn-outline flex items-center gap-2 py-3"
                    data-testid="edit-settings-button"
                  >
                    <Edit2 className="w-5 h-5" />
                    <span>EDIT</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditingSettings(false); setSettingsForm(settings); }}
                      className="btn-outline flex items-center gap-2 py-3"
                      data-testid="cancel-settings-button"
                    >
                      <X className="w-5 h-5" />
                      <span>CANCEL</span>
                    </button>
                    <button 
                      onClick={handleSaveSettings}
                      className="btn-primary flex items-center gap-2 py-3"
                      data-testid="save-settings-button"
                    >
                      <Save className="w-5 h-5" />
                      <span>SAVE</span>
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
                <p className="text-[#52525B]">Loading settings...</p>
              ) : (
                <div className="space-y-8">
                  {/* Shared Code */}
                  <div>
                    <label className="overline block mb-3">KEY BOX CODE</label>
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
                    <label className="overline block mb-3">CODE DESCRIPTION</label>
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
                    <label className="overline block mb-3">INSTRUCTIONS TEXT</label>
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
                      <label className="overline">INSTRUCTION STEPS</label>
                      {editingSettings && (
                        <button 
                          onClick={handleAddStep}
                          className="btn-outline py-2 px-4 flex items-center gap-2 text-sm"
                          data-testid="add-step-button"
                        >
                          <Plus className="w-4 h-4" />
                          ADD STEP
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
                                    placeholder="Title"
                                    className="rounded-none border-2 font-semibold"
                                  />
                                  <textarea
                                    value={step.description}
                                    onChange={(e) => handleUpdateStep(index, 'description', e.target.value)}
                                    placeholder="Description"
                                    className="w-full border-2 border-[#E4E4E7] p-2 rounded-none focus:border-[#0047FF] focus:outline-none"
                                  />
                                  
                                  {/* Media Section */}
                                  <div className="border-t border-[#E4E4E7] pt-3 mt-3">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-sm font-medium text-[#52525B]">IMAGES & DOCUMENTS</span>
                                      <button
                                        onClick={() => handleAddMedia(index)}
                                        className="text-[#0047FF] hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
                                        data-testid={`add-media-step-${index}`}
                                      >
                                        <Plus className="w-4 h-4" />
                                        Add Media
                                      </button>
                                    </div>
                                    
                                    {step.media && step.media.length > 0 ? (
                                      <div className="space-y-3">
                                        {step.media.map((media, mediaIndex) => (
                                          <div key={mediaIndex} className="bg-[#F4F4F5] p-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                              <Select
                                                value={media.type}
                                                onValueChange={(value) => handleUpdateMedia(index, mediaIndex, 'type', value)}
                                              >
                                                <SelectTrigger className="w-32 rounded-none border-2">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="image">
                                                    <div className="flex items-center gap-2">
                                                      <Image className="w-4 h-4" />
                                                      Image
                                                    </div>
                                                  </SelectItem>
                                                  <SelectItem value="document">
                                                    <div className="flex items-center gap-2">
                                                      <FileText className="w-4 h-4" />
                                                      Document
                                                    </div>
                                                  </SelectItem>
                                                </SelectContent>
                                              </Select>
                                              <Input
                                                value={media.url}
                                                onChange={(e) => handleUpdateMedia(index, mediaIndex, 'url', e.target.value)}
                                                placeholder="URL"
                                                className="flex-1 rounded-none border-2 text-sm"
                                              />
                                              <button
                                                onClick={() => handleRemoveMedia(index, mediaIndex)}
                                                className="p-2 hover:bg-[#FF204E] hover:text-white transition-colors"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            </div>
                                            <Input
                                              value={media.caption || media.name || ''}
                                              onChange={(e) => handleUpdateMedia(index, mediaIndex, media.type === 'image' ? 'caption' : 'name', e.target.value)}
                                              placeholder={media.type === 'image' ? 'Caption (optional)' : 'Document name'}
                                              className="rounded-none border-2 text-sm"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-[#52525B] italic">No media added yet</p>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <h3 className="font-semibold text-lg">{step.title}</h3>
                                  <p className="text-[#52525B]">{step.description}</p>
                                  {/* Display media in view mode */}
                                  {step.media && step.media.length > 0 && (
                                    <div className="flex flex-wrap gap-3 mt-3">
                                      {step.media.map((media, mediaIndex) => (
                                        <div key={mediaIndex}>
                                          {media.type === 'image' ? (
                                            <div>
                                              <img src={media.url} alt={media.caption || step.title} className="max-w-xs border" />
                                              {media.caption && <p className="text-xs text-[#52525B] mt-1">{media.caption}</p>}
                                            </div>
                                          ) : (
                                            <a 
                                              href={media.url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 bg-[#F4F4F5] p-3 hover:bg-[#E4E4E7] transition-colors"
                                            >
                                              <FileText className="w-5 h-5 text-[#0047FF]" />
                                              <span className="text-sm font-medium">{media.name || 'Document'}</span>
                                              <Link className="w-4 h-4 text-[#52525B]" />
                                            </a>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {/* Fallback for old image_url format */}
                                  {!step.media && step.image_url && (
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
                  Login History
                </h2>
                <button 
                  onClick={fetchLoginLogs}
                  className="btn-outline flex items-center gap-2 py-3"
                  data-testid="refresh-logs-button"
                >
                  <RefreshCw className={`w-5 h-5 ${logsLoading ? 'animate-spin' : ''}`} />
                  <span>REFRESH</span>
                </button>
              </div>

              {logsLoading ? (
                <p className="text-[#52525B]">Loading logs...</p>
              ) : loginLogs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-[#E4E4E7]">
                  <ClipboardList className="w-12 h-12 text-[#E4E4E7] mx-auto mb-4" />
                  <p className="text-[#52525B]">No logins recorded yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="login-logs-table">
                    <thead>
                      <tr className="border-b-2 border-[#09090B]">
                        <th className="text-left py-3 px-4 overline">DATE & TIME</th>
                        <th className="text-left py-3 px-4 overline">USER</th>
                        <th className="text-left py-3 px-4 overline">CODE</th>
                        <th className="text-left py-3 px-4 overline">IP ADDRESS</th>
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
                              {new Date(log.timestamp).toLocaleDateString('en-US')}
                            </div>
                            <div className="text-sm text-[#52525B]">
                              {new Date(log.timestamp).toLocaleTimeString('en-US')}
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
              {editingCode ? 'EDIT CODE' : 'NEW ACCESS CODE'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="overline block mb-2">NAME</label>
              <Input
                value={codeForm.name}
                onChange={(e) => setCodeForm({ ...codeForm, name: e.target.value })}
                placeholder="e.g. John Smith"
                className="rounded-none border-2"
                data-testid="code-name-input"
              />
            </div>
            <div>
              <label className="overline block mb-2">CODE</label>
              <Input
                value={codeForm.code}
                onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. ABC123"
                className="rounded-none border-2 font-mono tracking-widest"
                data-testid="code-code-input"
              />
            </div>
            <div>
              <label className="overline block mb-2">DESCRIPTION (OPTIONAL)</label>
              <Input
                value={codeForm.description}
                onChange={(e) => setCodeForm({ ...codeForm, description: e.target.value })}
                placeholder="e.g. Apartment 3B"
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
              CANCEL
            </Button>
            <Button 
              onClick={handleSaveCode}
              className="rounded-none bg-[#0047FF] hover:bg-blue-800"
              data-testid="save-code-button"
            >
              {editingCode ? 'SAVE' : 'CREATE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
