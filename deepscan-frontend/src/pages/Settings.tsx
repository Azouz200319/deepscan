import { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Database,
  Cpu,
  Globe,
  Save,
  User,
  Key,
  Server,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Cloud,
  Layers,
  Building,
  Trash2,
  Sparkles
} from 'lucide-react';
import { 
  getLlmConfig, 
  updateLlmConfig, 
  createDomain, 
  createFiliere, 
  createUniversity,
  deleteDomain,
  deleteFiliere,
  deleteUniversity
} from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useLanguage } from '../lib/LanguageContext';

const SETTINGS_KEY = 'deepscan_local_settings_v1';

const NOTIFICATION_KEYS = [
  'Scan Completed',
  'Forgery Detected',
  'Verification Complete',
  'Database Updates',
  'System Alerts',
  'Weekly Reports',
] as const;

type IntegrationRow = { name: string; url: string; connected: boolean };

function loadPersisted<T extends object>(defaults: T): T {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-brand-500' : 'bg-slate-200 hover:bg-slate-300'
        }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${value ? 'translate-x-5' : 'translate-x-0'
          }`}
      />
    </button>
  );
}

export default function Settings() {
  const { user, universities, domains, filieres, loadUniversities, loadDomains, loadFilieres } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setLanguage: updateGlobalLang } = useLanguage();
  const [activeTab, setActiveTab] = useState('general');

  const defaults = {
    profileName: user?.full_name || 'Admin User',
    profileEmail: user?.email || 'admin@deepscan.ai',
    profileOrg: universities.find(u => u.id === user?.university_id)?.name || 'DeepScan Lab',
    profileRole: 'Administrator',
    language: 'English',
    darkMode: false,
    autoSaveExtractions: false,
    showConfidence: true,
    dbType: 'PostgreSQL',
    connectionString: 'postgresql://localhost:5432/deepscan',
    autoBackup: true,
    ocrPreprocess: true,
    ocrMultilang: true,
    twoFactor: false,
    sessionTimeout: '30 minutes',
    clientApiKey: 'ds_live_••••••••••••••••••••••••',
    notifications: Object.fromEntries(NOTIFICATION_KEYS.map((k) => [k, true])) as Record<string, boolean>,
    integrations: [
      { name: 'Ollama API', url: 'http://localhost:11434', connected: true },
      { name: 'University Database API', url: 'https://api.university-db.dz', connected: true },
      { name: 'National ID Service', url: 'https://api.nid.gov.dz', connected: false },
      { name: 'Document Storage (S3)', url: 's3://deepscan-documents', connected: true },
    ] as IntegrationRow[],
  };

  const [profileName, setProfileName] = useState(defaults.profileName);
  const [profileEmail, setProfileEmail] = useState(defaults.profileEmail);
  const [profileOrg, setProfileOrg] = useState(defaults.profileOrg);
  const [profileRole, setProfileRole] = useState(defaults.profileRole);
  const [language, setLanguage] = useState(defaults.language);
  const [darkMode, setDarkMode] = useState(defaults.darkMode);
  const [autoSaveExtractions, setAutoSaveExtractions] = useState(defaults.autoSaveExtractions);
  const [showConfidence, setShowConfidence] = useState(defaults.showConfidence);
  const [dbType, setDbType] = useState(defaults.dbType);
  const [connectionString, setConnectionString] = useState(defaults.connectionString);
  const [autoBackup, setAutoBackup] = useState(defaults.autoBackup);
  const [ocrPreprocess, setOcrPreprocess] = useState(defaults.ocrPreprocess);
  const [ocrMultilang, setOcrMultilang] = useState(defaults.ocrMultilang);
  const [twoFactor, setTwoFactor] = useState(defaults.twoFactor);
  const [sessionTimeout, setSessionTimeout] = useState(defaults.sessionTimeout);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clientApiKey, setClientApiKey] = useState(defaults.clientApiKey);
  const [notifications, setNotifications] = useState<Record<string, boolean>>(defaults.notifications);
  const [integrations, setIntegrations] = useState<IntegrationRow[]>(defaults.integrations);
  const [dbCheckedAt, setDbCheckedAt] = useState<string>('');

  const [prefsMessage, setPrefsMessage] = useState('');

  // LLM config state
  const [llmProvider, setLlmProvider] = useState('groq');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434/api/generate');
  const [ollamaModel, setOllamaModel] = useState('llama3.2');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [groqModel, setGroqModel] = useState('llama-3.3-70b-versatile');
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [groqConfigured, setGroqConfigured] = useState(false);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmSaving, setLlmSaving] = useState(false);
  const [llmMessage, setLlmMessage] = useState('');

  useEffect(() => {
    const p = loadPersisted(defaults);
    setProfileName(user?.full_name || p.profileName);
    setProfileEmail(user?.email || p.profileEmail);
    setProfileOrg(universities.find(u => u.id === user?.university_id)?.name || p.profileOrg);
    setProfileRole(p.profileRole);
    setLanguage(p.language as any);
    // Dark mode handled by useTheme, but we sync local state for the toggle
    setDarkMode(p.darkMode);
    setAutoSaveExtractions(p.autoSaveExtractions);
    setShowConfidence(p.showConfidence);
    setDbType(p.dbType);
    setConnectionString(p.connectionString);
    setAutoBackup(p.autoBackup);
    setOcrPreprocess(p.ocrPreprocess);
    setOcrMultilang(p.ocrMultilang);
    setTwoFactor(p.twoFactor);
    setSessionTimeout(p.sessionTimeout);
    setClientApiKey(p.clientApiKey);
    setNotifications({ ...defaults.notifications, ...p.notifications });
    setIntegrations(p.integrations?.length ? p.integrations : defaults.integrations);
    setDbCheckedAt(new Date().toLocaleString());
    // Load stored password
    const storedPassword = localStorage.getItem('password');
    if (storedPassword) {
      setCurrentPassword(storedPassword);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ocr') {
      setLlmLoading(true);
      getLlmConfig().then((data) => {
        setLlmProvider(data.provider || 'ollama');
        setOllamaUrl(data.ollama_url || 'http://localhost:11434/api/generate');
        setOllamaModel(data.ollama_model || 'llama3.2');
        setGroqModel(data.groq_model || 'llama-3.3-70b-versatile');
        setOllamaConnected(data.ollama_connected || false);
        setOllamaModels(data.ollama_models || []);
        setGroqConfigured(data.groq_configured || false);
        // Only load key if it's a real unmasked key (doesn't contain "...")
        if (data.groq_api_key && !data.groq_api_key.includes('...')) {
          setGroqApiKey(data.groq_api_key);
        } else {
          setGroqApiKey(''); // Clear field if key is masked
        }
      }).catch(() => { }).finally(() => setLlmLoading(false));
    }
  }, [activeTab]);

  const persistLocalSettings = useCallback(() => {
    const payload = {
      profileName,
      profileEmail,
      profileOrg,
      profileRole,
      language,
      darkMode,
      autoSaveExtractions,
      showConfidence,
      dbType,
      connectionString,
      autoBackup,
      ocrPreprocess,
      ocrMultilang,
      twoFactor,
      sessionTimeout,
      clientApiKey,
      notifications,
      integrations,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
    setDbCheckedAt(new Date().toLocaleString());
  }, [
    profileName, profileEmail, profileOrg, profileRole, language, darkMode,
    autoSaveExtractions, showConfidence, dbType, connectionString, autoBackup,
    ocrPreprocess, ocrMultilang, twoFactor, sessionTimeout, clientApiKey,
    notifications, integrations,
  ]);

  const handleSaveLlmConfig = async () => {
    setLlmSaving(true);
    setLlmMessage('');
    try {
      await updateLlmConfig({
        provider: llmProvider,
        ollama_url: ollamaUrl,
        ollama_model: ollamaModel,
        groq_api_key: groqApiKey || undefined,
        groq_model: groqModel,
      });
      setLlmMessage('Configuration saved successfully');
      const data = await getLlmConfig();
      setOllamaConnected(data.ollama_connected || false);
      setOllamaModels(data.ollama_models || []);
      setGroqConfigured(data.groq_configured || false);
    } catch {
      setLlmMessage('Failed to save configuration');
    } finally {
      setLlmSaving(false);
    }
  };

  const handleSaveChanges = () => {
    if (activeTab === 'security') {
      if (newPassword || confirmPassword || currentPassword) {
        if (newPassword !== confirmPassword) {
          setPrefsMessage('New password and confirmation do not match.');
          return;
        }
        if (newPassword && newPassword.length < 8) {
          setPrefsMessage('Password must be at least 8 characters (stored locally only).');
          return;
        }
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    }
    persistLocalSettings();
    setPrefsMessage('Preferences saved on this device.');
    setTimeout(() => setPrefsMessage(''), 4000);
  };


  const toggleIntegration = (index: number) => {
    setIntegrations((prev) =>
      prev.map((row, i) => (i === index ? { ...row, connected: !row.connected } : row))
    );
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'organization', label: 'Organization', icon: Layers },
    { id: 'ocr', label: 'OCR & LLM', icon: Cpu },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'api', label: 'API & Integrations', icon: Globe },
  ];

  const [newDomainName, setNewDomainName] = useState('');
  const [newFiliereName, setNewFiliereName] = useState('');
  const [newUniversityName, setNewUniversityName] = useState('');
  const [newUniversityCountry, setNewUniversityCountry] = useState('');
  const [selectedDomainForFiliere, setSelectedDomainForFiliere] = useState('');
  const [orgLoading, setOrgLoading] = useState(false);

  const handleCreateDomain = async () => {
    if (!newDomainName) return;
    setOrgLoading(true);
    try {
      await createDomain(newDomainName);
      setNewDomainName('');
      setPrefsMessage('Domain created successfully.');
      loadDomains();
    } catch {
      setPrefsMessage('Failed to create domain.');
    }
    setOrgLoading(false);
  };

  const handleCreateFiliere = async () => {
    if (!newFiliereName || !selectedDomainForFiliere) return;
    setOrgLoading(true);
    try {
      await createFiliere(selectedDomainForFiliere, newFiliereName);
      setNewFiliereName('');
      setPrefsMessage('Filiere created successfully.');
      loadFilieres(selectedDomainForFiliere);
    } catch {
      setPrefsMessage('Failed to create filiere.');
    }
    setOrgLoading(false);
  };

  const handleCreateUniversity = async () => {
    if (!newUniversityName) return;
    setOrgLoading(true);
    try {
      await createUniversity(newUniversityName, newUniversityCountry);
      setNewUniversityName('');
      setNewUniversityCountry('');
      setPrefsMessage('University created successfully.');
      loadUniversities();
    } catch {
      setPrefsMessage('Failed to create university.');
    }
    setOrgLoading(false);
  };

  const handleDeleteDomain = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this domain? All associated filieres will be disconnected.')) return;
    setOrgLoading(true);
    try {
      await deleteDomain(id);
      setPrefsMessage('Domain deleted successfully.');
      loadDomains();
    } catch {
      setPrefsMessage('Failed to delete domain.');
    }
    setOrgLoading(false);
  };

  const handleDeleteFiliere = async (id: string) => {
    if (!selectedDomainForFiliere) return;
    if (!window.confirm('Are you sure you want to delete this filiere?')) return;
    setOrgLoading(true);
    try {
      await deleteFiliere(selectedDomainForFiliere, id);
      setPrefsMessage('Filiere deleted successfully.');
      loadFilieres(selectedDomainForFiliere);
    } catch {
      setPrefsMessage('Failed to delete filiere.');
    }
    setOrgLoading(false);
  };

  const handleDeleteUniversity = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this university?')) return;
    setOrgLoading(true);
    try {
      await deleteUniversity(id);
      setPrefsMessage('University deleted successfully.');
      loadUniversities();
    } catch {
      setPrefsMessage('Failed to delete university.');
    }
    setOrgLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-800 mt-1">
          <strong className="font-medium text-slate-700">OCR &amp; LLM</strong> is saved on the server. Other tabs store preferences in this browser only
          (profile, notifications, integration toggles, etc.) and do not change backend security or database connections.
        </p>
      </div>

      {prefsMessage && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 border ${prefsMessage.includes('not match') || prefsMessage.includes('at least')
            ? 'bg-rose-50 border-rose-200 text-rose-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
          {prefsMessage.includes('not match') || prefsMessage.includes('at least') ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          {prefsMessage}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-fit">
          <nav className="p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="xl:col-span-3 space-y-5">
          {activeTab === 'general' && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Profile</h3>
                <p className="text-sm text-slate-800 mb-5">Manage your account details (stored locally in the browser)</p>
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-800 font-medium mb-1.5 block">Full Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-800 font-medium mb-1.5 block">Email</label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-800 font-medium mb-1.5 block">Organization</label>
                      <input
                        type="text"
                        value={profileOrg}
                        onChange={(e) => setProfileOrg(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-800 font-medium mb-1.5 block">Role</label>
                      <select
                        value={profileRole}
                        onChange={(e) => setProfileRole(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-900"
                      >
                        <option>Administrator</option>
                        <option>Operator</option>
                        <option>Viewer</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Application</h3>
                <p className="text-sm text-slate-800 mb-5">General application preferences</p>
                <div className="space-y-5">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Language</p>
                      <p className="text-xs text-slate-700 mt-0.5">Set the interface language</p>
                    </div>
                    <select
                      value={language}
                      onChange={(e) => {
                        const next = e.target.value as any;
                        setLanguage(next);
                        updateGlobalLang(next);
                      }}
                      className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-900"
                    >
                      <option>English</option>
                      <option>French</option>
                      <option>Arabic</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Dark Mode</p>
                      <p className="text-xs text-slate-700 mt-0.5">Enable dark mode interface</p>
                    </div>
                    <Toggle value={theme === 'dark'} onChange={() => {
                      toggleTheme();
                      setDarkMode(theme === 'light'); // opposite because it hasn't toggled yet in state
                    }} />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'organization' && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Organization Structure</h3>
                <p className="text-sm text-slate-800 mb-5">
                  Set up your organization's Universities, Domains, and Filieres. These act as filters for your scan records.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Domains */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-800" />
                      Domains
                    </h4>
                    <div className="flex gap-2 mb-4">
                      <input
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        placeholder="New Domain..."
                        value={newDomainName}
                        onChange={(e) => setNewDomainName(e.target.value)}
                      />
                      <button
                        onClick={handleCreateDomain}
                        disabled={orgLoading || !newDomainName}
                        className="px-3 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {domains.length === 0 && <li className="text-xs text-slate-700 italic">No domains configured.</li>}
                      {domains.map((d) => (
                        <li key={d.id} className="group text-sm text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg flex items-center justify-between gap-2">
                          <span className="truncate flex-1">{d.name}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteDomain(d.id); }}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete Domain"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Filieres */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4 text-slate-800" />
                      Filieres
                    </h4>
                    <div className="space-y-2 mb-4">
                      <select
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        value={selectedDomainForFiliere}
                        onChange={(e) => {
                          setSelectedDomainForFiliere(e.target.value);
                          if (e.target.value) loadFilieres(e.target.value);
                        }}
                      >
                        <option value="">Select Domain...</option>
                        {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                          placeholder="New Filiere..."
                          value={newFiliereName}
                          onChange={(e) => setNewFiliereName(e.target.value)}
                          disabled={!selectedDomainForFiliere}
                        />
                        <button
                          onClick={handleCreateFiliere}
                          disabled={orgLoading || !newFiliereName || !selectedDomainForFiliere}
                          className="px-3 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    {selectedDomainForFiliere && (
                      <ul className="space-y-2 max-h-48 overflow-y-auto">
                        {filieres.length === 0 && <li className="text-xs text-slate-700 italic">No filieres in this domain.</li>}
                        {filieres.map((f) => (
                          <li key={f.id} className="group text-sm text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg flex items-center justify-between gap-2">
                            <span className="truncate flex-1">{f.name}</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteFiliere(f.id); }}
                              className="p-1.5 rounded-md hover:bg-rose-50 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                              title="Delete Filiere"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Universities */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-800" />
                      Universities
                    </h4>
                    <div className="space-y-2 mb-4">
                      <input
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        placeholder="University Name..."
                        value={newUniversityName}
                        onChange={(e) => setNewUniversityName(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <input
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          placeholder="Country (optional)"
                          value={newUniversityCountry}
                          onChange={(e) => setNewUniversityCountry(e.target.value)}
                        />
                        <button
                          onClick={handleCreateUniversity}
                          disabled={orgLoading || !newUniversityName}
                          className="px-3 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {universities.length === 0 && <li className="text-xs text-slate-700 italic">No universities configured.</li>}
                      {universities.map((u) => (
                        <li key={u.id} className="group text-sm text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg flex items-center justify-between gap-2">
                          <span className="truncate flex-1">{u.name}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteUniversity(u.id); }}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete University"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ocr' && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">LLM Provider</h3>
                <p className="text-sm text-slate-800 mb-5">Choose between local Ollama or a cloud API for AI-powered field extraction</p>

                {llmLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                    <span className="ml-2 text-sm text-slate-800">Loading configuration...</span>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {llmMessage && (
                      <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${llmMessage.includes('success') ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
                        {llmMessage.includes('success') ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        {llmMessage}
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-slate-800 font-medium mb-1.5 block">Active Provider</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setLlmProvider('ollama')}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${llmProvider === 'ollama'
                              ? 'border-brand-500 bg-brand-50/50'
                              : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                          <Server className={`w-6 h-6 ${llmProvider === 'ollama' ? 'text-brand-600' : 'text-slate-700'}`} />
                          <div className="text-left">
                            <p className={`text-sm font-semibold ${llmProvider === 'ollama' ? 'text-brand-700' : 'text-slate-700'}`}>Ollama (Local)</p>
                            <p className="text-xs text-slate-700">Run models on your machine</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLlmProvider('groq')}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${llmProvider === 'groq'
                              ? 'border-brand-500 bg-brand-50/50'
                              : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                          <Cloud className={`w-6 h-6 ${llmProvider === 'groq' ? 'text-brand-600' : 'text-slate-700'}`} />
                          <div className="text-left">
                            <p className={`text-sm font-semibold ${llmProvider === 'groq' ? 'text-brand-700' : 'text-slate-700'}`}>Groq (Cloud API)</p>
                            <p className="text-xs text-slate-700">Fast cloud inference, free tier</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {llmProvider === 'ollama' && !llmLoading && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Ollama Configuration</h3>
                      <p className="text-sm text-slate-800">Configure your local Ollama server</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${ollamaConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className={`text-xs font-medium ${ollamaConnected ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {ollamaConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-800 font-medium mb-1.5 block">Server URL</label>
                      <input
                        type="text"
                        value={ollamaUrl}
                        onChange={(e) => setOllamaUrl(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-800 font-medium mb-1.5 block">Model Name</label>
                      <input
                        type="text"
                        value={ollamaModel}
                        onChange={(e) => setOllamaModel(e.target.value)}
                        placeholder="e.g. llama3.2"
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                      {ollamaModels.length > 0 && (
                        <p className="text-xs text-slate-700 mt-1">
                          Available models: {ollamaModels.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700">
                        <strong>Requirement:</strong> Ollama must be installed and running on your machine.
                        Run <code className="bg-amber-100 px-1 rounded">ollama serve</code> then <code className="bg-amber-100 px-1 rounded">ollama pull llama3.2</code>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {llmProvider === 'groq' && !llmLoading && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Groq API Configuration</h3>
                      <p className="text-sm text-slate-800">Configure cloud API for online deployment</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${groqConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className={`text-xs font-medium ${groqConfigured ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {groqConfigured ? 'API Key Set' : 'Not Configured'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-800 font-medium mb-1.5 block">API Key</label>
                      <input
                        type="password"
                        value={groqApiKey}
                        onChange={(e) => setGroqApiKey(e.target.value)}
                        placeholder="gsk_..."
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-800 font-medium mb-1.5 block">Model</label>
                      <select
                        value={groqModel}
                        onChange={(e) => setGroqModel(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-900"
                      >
                        <option value="llama-3.3-70b-versatile">LLaMA 3.3 70B (Recommended)</option>
                        <option value="llama-3.1-8b-instant">LLaMA 3.1 8B Instant (Faster)</option>
                        <option value="llama3-70b-8192">LLaMA 3 70B</option>
                        <option value="llama3-8b-8192">LLaMA 3 8B</option>
                        <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                        <option value="gemma2-9b-it">Gemma 2 9B</option>
                      </select>
                    </div>
                    <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg">
                      <p className="text-xs text-brand-700">
                        <strong>Get a free API key:</strong> Visit{' '}
                        <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="underline font-medium">console.groq.com</a>
                        {' '}to create an account and get your API key. Groq runs LLaMA models in the cloud — no local GPU needed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!llmLoading && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">OCR Engine</h3>
                  <p className="text-sm text-slate-800 mb-5">Tesseract OCR settings for text extraction (saved with preferences)</p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Pre-processing</p>
                        <p className="text-xs text-slate-700 mt-0.5">Apply image enhancement before OCR</p>
                      </div>
                      <Toggle value={ocrPreprocess} onChange={setOcrPreprocess} />
                    </div>
                    <div className="flex items-center justify-between py-3 group relative overflow-hidden rounded-xl border border-dashed border-brand-200 bg-brand-50/30 px-4">
                      <div className="absolute top-0 right-0 p-1">
                        <Sparkles className="w-4 h-4 text-brand-400 animate-bounce" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">Multi-language Intelligence</p>
                          <span className="px-2 py-0.5 bg-gradient-to-r from-brand-500 to-indigo-500 text-[9px] font-black text-white rounded-full uppercase tracking-widest shadow-sm animate-pulse">
                            Future Feature
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-800 font-medium mt-1 pr-10">
                          We are training our engine to support Arabic, French, and 50+ scripts for universal document scanning.
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                          <span className="text-[9px] font-black text-brand-600 uppercase tracking-tighter italic">Coming to your laboratory soon</span>
                        </div>
                      </div>
                      <div className="relative opacity-40">
                        <Toggle value={false} onChange={() => { }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!llmLoading && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveLlmConfig}
                    disabled={llmSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-medium rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all shadow-sm disabled:opacity-50"
                  >
                    {llmSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save LLM Configuration
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'database' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Database Configuration</h3>
              <p className="text-sm text-slate-800 mb-5">Connection preferences (this app uses the server&apos;s SQLite database; values here are for your notes)</p>
              <div className="space-y-5">
                <div>
                  <label className="text-xs text-slate-800 font-medium mb-1.5 block">Database Type</label>
                  <select
                    value={dbType}
                    onChange={(e) => setDbType(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-900"
                  >
                    <option>PostgreSQL</option>
                    <option>MySQL</option>
                    <option>SQLite</option>
                    <option>MongoDB</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-800 font-medium mb-1.5 block">Connection String</label>
                  <input
                    type="text"
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Server className="w-5 h-5 text-slate-800" />
                    <h4 className="text-sm font-medium text-slate-900">Connection Status</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm text-emerald-600 font-medium">Ready</span>
                    <span className="text-xs text-slate-700 ml-2">
                      Last preference save: {dbCheckedAt || '—'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Auto Backup</p>
                    <p className="text-xs text-slate-700 mt-0.5">Preference for automated backups</p>
                  </div>
                  <Toggle value={autoBackup} onChange={setAutoBackup} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Security Settings</h3>
              <p className="text-sm text-slate-800 mb-5">Update your account password and security preferences</p>
              <div className="space-y-5">
                <div>
                  <label className="text-xs text-slate-800 font-medium mb-1.5 block">Current Password</label>
                  {currentPassword ? (
                    <input
                      type="text"
                      value={currentPassword}
                      readOnly
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-mono"
                    />
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                      <AlertTriangle className="w-4 h-4 inline-block mr-2" />
                      Password not available. Please <strong>log out and log back in</strong> to see your password here.
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-800 font-medium mb-1.5 block">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-800 font-medium mb-1.5 block">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* Coming Soon Features */}
                <div className="pt-4 space-y-4 opacity-50 grayscale select-none">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">Two-Factor Authentication</p>
                        <span className="px-1.5 py-0.5 bg-brand-500 text-[8px] font-black text-white rounded uppercase tracking-widest">Future Feature</span>
                      </div>
                      <p className="text-xs text-slate-700 mt-0.5">Add an extra layer of security with SMS or App codes</p>
                    </div>
                    <Toggle value={false} onChange={() => { }} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">Session Timeout</p>
                        <span className="px-1.5 py-0.5 bg-brand-500 text-[8px] font-black text-white rounded uppercase tracking-widest">Future Feature</span>
                      </div>
                      <p className="text-xs text-slate-700 mt-0.5">Auto-logout after inactivity</p>
                    </div>
                    <select disabled className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 bg-slate-50">
                      <option>15 minutes</option>
                    </select>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <div className="flex items-center gap-3 mb-2">
                      <Key className="w-5 h-5 text-slate-700" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Client API Access</p>
                        <p className="text-[10px] text-slate-800 uppercase tracking-widest font-black mt-0.5">In development</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono italic">
                        ••••••••••••••••••••••••••••••••
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-semibold text-slate-900">Notification Preferences</h3>
                <span className="px-2 py-0.5 bg-gradient-to-r from-brand-500 to-indigo-500 text-[10px] font-black text-white rounded-full uppercase tracking-widest shadow-sm animate-pulse">
                  Coming Soon
                </span>
              </div>
              <p className="text-sm text-slate-800 mb-5">Notification system is under development</p>

              <div className="mb-6 p-4 bg-gradient-to-r from-brand-50 via-indigo-50 to-brand-50 border border-brand-200 rounded-xl shadow-sm">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-6 h-6 text-brand-500 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <p className="text-base font-bold text-slate-900">Exciting Features Coming!</p>
                    <p className="text-sm text-slate-900 mt-1">
                      We're building a powerful notification system with AI-powered insights, team collaboration tools, real-time push alerts, and email reports. Stay tuned for updates that will transform your document verification workflow!
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 opacity-50 grayscale">
                {[
                  { label: 'Scan Completed' as const, description: 'Notify when a document scan is complete', badge: 'Soon' },
                  { label: 'Forgery Detected' as const, description: 'Alert when forgery is detected in a document', badge: 'Soon' },
                  { label: 'Verification Complete' as const, description: 'Notify when identity verification finishes', badge: 'Soon' },
                  { label: 'Database Updates' as const, description: 'Alert on new records or changes', badge: 'Soon' },
                  { label: 'System Alerts' as const, description: 'Important system and security notifications', badge: 'Soon' },
                  { label: 'Weekly Reports' as const, description: 'Receive weekly summary reports via email', badge: 'Email' },
                  { label: 'Push Notifications' as const, description: 'Real-time push alerts to your browser', badge: 'Coming Soon' },
                  { label: 'AI Insights' as const, description: 'Smart AI-powered document insights & recommendations', badge: 'Beta' },
                  { label: 'Team Collaboration' as const, description: 'Get notified when team members comment or review', badge: 'Soon' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{item.label}</p>
                        <span className="px-1.5 py-0.5 bg-amber-100 text-[9px] font-black text-amber-700 rounded uppercase tracking-wider">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-0.5">{item.description}</p>
                    </div>
                    <Toggle value={true} onChange={() => { }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">API & Integrations</h3>
              <p className="text-sm text-slate-800 mb-5">Toggle connection state for your workflow (stored locally)</p>
              <div className="space-y-4">
                {integrations.map((integration, index) => (
                  <div key={integration.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${integration.connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{integration.name}</p>
                        <p className="text-xs text-slate-700 font-mono truncate">{integration.url}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleIntegration(index)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border shrink-0 ${integration.connected
                          ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                          : 'border-slate-200 text-slate-900 hover:bg-white'
                        }`}
                    >
                      {integration.connected ? 'Connected' : 'Disconnected'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab !== 'ocr' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveChanges}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-medium rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all shadow-sm"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
