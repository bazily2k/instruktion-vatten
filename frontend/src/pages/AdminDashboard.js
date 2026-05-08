import { useState, useEffect, useRef } from 'react';
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
  Link,
  Upload,
  Camera,
  Loader2
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
  const [logsFilter, setLogsFilter] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearDays, setClearDays] = useState('');

  // File upload state
  const [uploadingMedia, setUploadingMedia] = useState(null);
  const fileInputRef = useRef(null);

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

  const migrateStepToMediaFormat = (step) => {
    if (step.media && Array.isArray(step.media)) {
      return step;
    }
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

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Delete this log entry?')) return;
    try {
      await axios.delete(`${API_URL}/api/login-logs/${logId}`, { withCredentials: true });
      fetchLoginLogs();
    } catch (err) {
      console.error('Failed to delete log:', err);
    }
  };

  const handleClearLogs = async () => {
    try {
      const params = clearDays ? `?days=${clearDays}` : '';
      await axios.delete(`${API_URL}/api/login-logs${params}`, { withCredentials: true });
      setShowClearModal(false);
      setClearDays('');
      fetchLoginLogs();
    } catch (err) {
      console.error('Failed to clear logs:', err);
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
        await axios.put(`${API_URL}/api/access-codes/${editingCode.id}`, codeForm, { withCredentials: true });
      } else {
        await axios.post(`${API_URL}/api/access-codes`, codeForm, { withCredentials: true });
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
      await axios.delete(`${API_URL}/api/access-codes/${codeId}`, { withCredentials: true });
      fetchAccessCodes();
    } catch (err) {
      console.error('Failed to delete code:', err);
    }
  };

  const handleToggleCodeActive = async (code) => {
    try {
      await axios.put(`${API_URL}/api/access-codes/${code.id}`, { is_active: !code.is_active }, { withCredentials: true });
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

  const handleSaveSettings = async () => {
    try {
      setSettingsError('');
      await axios.put(`${API_URL}/api/settings`, settingsForm, { withCredentials: true });
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
    setSettingsForm({ ...settingsForm, instructions_steps: [...settingsForm.instructions_steps, newStep] });
  };

  const handleUpdateStep = (index, field, value) => {
    const newSteps = [...settingsForm.instructions_steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSettingsForm({ ...settingsForm, instructions_steps: newSteps });
  };

  const handleRemoveStep = (index) => {
    const newSteps = settingsForm.instructions_steps.filter((_, i) => i !== index);
    newSteps.forEach((step, i) => { step.step = i + 1; });
    setSettingsForm({ ...settingsForm, instructions_steps: newSteps });
  };

  const handleAddMedia = (stepIndex) => {
    const newSteps = [...settingsForm.instructions_steps];
    if (!newSteps[stepIndex].media) newSteps[stepIndex].media = [];
    newSteps[stepIndex].media.push({ type: 'image', url: '', caption: '' });
    setSettingsForm({ ...settingsForm, instructions_steps: newSteps });
  };

  const handleUpdateMedia = (stepIndex, mediaIndex, field, value) => {
    const newSteps = [...settingsForm.instructions_steps];
    newSteps[stepIndex].media[mediaIndex] = { ...newSteps[stepIndex].media[mediaIndex], [field]: value };
    setSettingsForm({ ...settingsForm, instructions_steps: newSteps });
  };

  const handleRemoveMedia = (stepIndex, mediaIndex) => {
    const newSteps = [...settingsForm.instructions_steps];
    newSteps[stepIndex].media = newSteps[stepIndex].media.filter((_, i) => i !== mediaIndex);
    setSettingsForm({ ...settingsForm, instructions_steps: newSteps });
  };

  const handleFileUploadClick = (stepIndex, mediaIndex = null) => {
    setUploadingMedia({ stepIndex, mediaIndex });
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingMedia) return;
    const { stepIndex, mediaIndex } = uploadingMedia;
    try {
      setUploadingMedia({ ...uploadingMedia, loading: true });
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const fileUrl = `${API_URL}${response.data.url}`;
      const isImage = file.type.startsWith('image/');
      const mediaType = isImage ? 'image' : 'document';
      const newSteps = [...settingsForm.instructions_steps];
      if (mediaIndex !== null) {
        newSteps[stepIndex].media[mediaIndex] = { type: mediaType, url: fileUrl, caption: isImage ? '' : file.name, name: file.name };
      } else {
        if (!newSteps[stepIndex].media) newSteps[stepIndex].media = [];
        newSteps[stepIndex].media.push({ type: mediaType, url: fileUrl, caption: isImage ? '' : file.name, name: file.name });
      }
      setSettingsForm({ ...settingsForm, instructions_steps: newSteps });
    } catch (err) {
      console.error('File upload failed:', err);
      alert('File upload failed. Please try again.');
    } finally {
      setUploadingMedia(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        className="hidden"
        capture="environment"
      />

      {/* Header */}
      <header className="bg-white border-b border-[#E4E4E7] p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#09090B] flex items-center justify-center">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>ADMIN</h1>
              <p className="text-sm text-[#52525B]">Water Pump Guide</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-[#52525B] hover:text-[#09090B] transition-colors tap-target">
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-white border border-[#E4E4E7] p-1 rounded-none">
            <TabsTrigger value="codes" className="data-[state=active]:bg-[#09090B] data-[state=active]:text-white rounded-none px-6">
              <Users className="w-4 h-4 mr-2" />Access Codes
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-[#09090B] data-[state=active]:text-white rounded-none px-6">
              <ClipboardList className="w-4 h-4 mr-2" />Login History
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-[#09090B] data-[state=active]:text-white rounded-none px-6">
              <Settings className="w-4 h-4 mr-2" />Settings
            </TabsTrigger>
          </TabsList>

          {/* Access Codes Tab */}
          <TabsContent value="codes" className="mt-0">
            <div className="bg-white border border-[#E4E4E7] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>Access Codes</h2>
                <button onClick={openNewCodeModal} className="btn-primary flex items-center gap-2 py-3">
                  <Plus className="w-5 h-5" /><span>NEW CODE</span>
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
                    <div key={code.id} className={`border p-4 ${code.is_active ? 'border-[#E4E4E7]' : 'border-[#FF204E] bg-[#FF204E] bg-opacity-5'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{code.name}</h3>
                          <p className="text-sm text-[#52525B]">{code.description}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditCodeModal(code)} className="p-2 hover:bg-[#F4F4F5] transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteCode(code.id)} className="p-2 hover:bg-[#FF204E] hover:text-white transiti
