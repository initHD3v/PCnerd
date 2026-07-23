'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Database,
  ShieldCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  ArrowLeft,
  Lock,
  LayoutDashboard,
  Cpu,
  Monitor as GpuIcon,
  Box,
  HardDrive,
  Power,
  Fan,
  LogOut,
  Users,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/hooks/use-theme';
import ThemeToggle from '@/components/ThemeToggle';
import SyncPanel from '@/components/SyncPanel';

type ComponentType = 'CPU' | 'GPU' | 'MOTHERBOARD' | 'RAM' | 'STORAGE' | 'PSU' | 'CASE' | 'COOLER';

interface HardwareComponent {
  id: string;
  name: string;
  brand: string;
  model: string | null;
  type: ComponentType;
  price: number;
  specs: Record<string, unknown>;
  socket: string | null;
  ramType: string | null;
  formFactor: string | null;
  wattage: number | null;
  tdp: number | null;
  imageUrl: string | null;
  shopUrl: string | null;
  marketplace: string | null;
  updatedAt: string;
}

interface AdminUser {
  id: string;
  username: string;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, any> = {
  CPU: Cpu,
  GPU: GpuIcon,
  MOTHERBOARD: LayoutDashboard,
  RAM: Box,
  STORAGE: HardDrive,
  PSU: Power,
  CASE: Box,
  COOLER: Fan,
};

export default function AdminDashboard() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Auth state
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeSection, setActiveSection] = useState<'inventory' | 'admins'>('inventory');

  // Forgot password
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Change own password
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changePasswordMessage, setChangePasswordMessage] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  // Inventory
  const [components, setComponents] = useState<HardwareComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | ComponentType>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<HardwareComponent>>({
    name: '',
    brand: '',
    type: 'CPU',
    price: 0,
    socket: '',
    ramType: '',
    formFactor: '',
  });

  // Admin management
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminModal, setAdminModal] = useState<{ type: 'create' | 'edit'; admin?: AdminUser } | null>(null);
  const [adminForm, setAdminForm] = useState({ username: '', password: '', role: 'admin' });
  const [adminFormError, setAdminFormError] = useState('');

  // Check auth on mount
  useEffect(() => {
    fetch('/api/admin/auth/me').then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setAdminUser({ id: data.id, username: data.username, role: data.role });
      }
      setIsAuthLoading(false);
    });
  }, []);

  // Fetch admins
  const fetchAdmins = useCallback(async () => {
    setAdminsLoading(true);
    const res = await fetch('/api/admin/admins');
    if (res.ok) {
      setAdmins(await res.json());
    }
    setAdminsLoading(false);
  }, []);

  useEffect(() => {
    if (adminUser?.role === 'superadmin') {
      fetchAdmins(); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [adminUser, fetchAdmins]);

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminUser({ id: data.id, username: data.username, role: data.role });
      } else {
        setLoginError(data.error || 'Login gagal.');
      }
    } catch {
      setLoginError('Gagal menghubungi server.');
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    setAdminUser(null);
    setLoginPassword('');
    setLoginUsername('');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMessage('');
    try {
      const res = await fetch('/api/admin/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotUsername }),
      });
      const data = await res.json();
      if (data.resetToken) {
        setForgotToken(data.resetToken);
        setForgotMessage('Token reset berhasil dibuat. Salin token dan gunakan di form reset password.');
      } else {
        setForgotMessage(data.message || 'Cek username Anda.');
      }
    } catch {
      setForgotMessage('Terjadi kesalahan.');
    }
    setForgotLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage('');
    try {
      const res = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword: resetNewPassword }),
      });
      const data = await res.json();
      setResetMessage(data.error || data.message);
      if (res.ok) {
        setTimeout(() => setShowReset(false), 2000);
      }
    } catch {
      setResetMessage('Terjadi kesalahan.');
    }
    setResetLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordLoading(true);
    setChangePasswordMessage('');
    try {
      const res = await fetch('/api/admin/auth/change-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      setChangePasswordMessage(data.error || data.message);
    } catch {
      setChangePasswordMessage('Terjadi kesalahan.');
    }
    setChangePasswordLoading(false);
  };

  // Inventory functions
  async function apiFetch(url: string, options: RequestInit = {}) {
    return fetch(url, { ...options, credentials: 'include' });
  }

  const fetchComponents = useCallback(async () => {
    const res = await apiFetch('/api/admin/components');
    if (res.ok) {
      setComponents(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (adminUser) fetchComponents(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [adminUser, fetchComponents]);

  const deleteComponent = async (id: string) => {
    if (!confirm('Hapus komponen ini?')) return;
    try {
      await apiFetch(`/api/admin/components/${id}`, { method: 'DELETE' });
      fetchComponents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleComponentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId ? `/api/admin/components/${editingId}` : '/api/admin/components';
    try {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, specs: formData.specs || '{}' }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingId(null);
        fetchComponents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Admin CRUD
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFormError('');
    if (!adminModal) return;

    try {
      let res: Response;
      if (adminModal.type === 'create') {
        res = await fetch('/api/admin/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adminForm),
        });
      } else {
        res = await fetch(`/api/admin/admins/${adminModal.admin!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adminForm.password ? adminForm : { role: adminForm.role }),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setAdminModal(null);
        setAdminForm({ username: '', password: '', role: 'admin' });
        fetchAdmins();
      } else {
        setAdminFormError(data.error || 'Gagal menyimpan admin.');
      }
    } catch {
      setAdminFormError('Terjadi kesalahan.');
    }
  };

  const deleteAdmin = async (id: string) => {
    if (!confirm('Hapus admin ini?')) return;
    try {
      const res = await fetch(`/api/admin/admins/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) alert(data.error);
      else fetchAdmins();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredComponents = components.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) || c.brand.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'ALL' || c.type === activeTab;
    return matchesSearch && matchesTab;
  });

  // Loading state
  if (isAuthLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-black text-gray-200' : 'bg-gray-50 text-gray-800'}`}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Login form
  if (!adminUser) {
    return (
      <div
        className={`min-h-screen font-sans antialiased flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-black text-gray-200' : 'bg-gray-50 text-gray-800'}`}
      >
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mx-4">
          <div
            className={`border rounded-2xl p-8 shadow-2xl ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-gray-200'}`}
          >
            <div className="flex flex-col items-center mb-8">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-7 h-7 text-black" />
              </div>
              <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Admin Login</h1>
              <p className="text-sm text-gray-500 mt-1">Masukkan kredensial admin.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Username</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Username"
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none transition-all focus:border-primary/50 ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Password"
                    className={`w-full border rounded-lg pl-10 pr-10 py-2.5 text-sm outline-none transition-all focus:border-primary/50 ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
              >
                {loginLoading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setShowForgot(true)}
                className="text-xs text-gray-500 hover:text-primary transition-colors"
              >
                Lupa password?
              </button>
            </div>
          </div>

          {/* Forgot Password Modal */}
          <AnimatePresence>
            {showForgot && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    setShowForgot(false);
                    setForgotToken('');
                  }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className={`relative w-full max-w-md border rounded-2xl p-6 shadow-2xl ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-gray-200'}`}
                >
                  <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Lupa Password
                  </h3>
                  {!forgotToken ? (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Username</label>
                        <input
                          type="text"
                          value={forgotUsername}
                          onChange={(e) => setForgotUsername(e.target.value)}
                          className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        />
                      </div>
                      {forgotMessage && <p className="text-yellow-500 text-xs">{forgotMessage}</p>}
                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full py-3 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {forgotLoading ? 'Memproses...' : 'Buat Token Reset'}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">Salin token berikut untuk mereset password:</p>
                      <div
                        className={`p-3 rounded-lg border text-sm font-mono break-all ${isDarkMode ? 'bg-white/5 border-white/10 text-green-400' : 'bg-gray-50 border-gray-200 text-green-700'}`}
                      >
                        {forgotToken}
                      </div>
                      <p className="text-xs text-gray-500">Token berlaku selama 15 menit.</p>
                      <button
                        onClick={() => {
                          setShowForgot(false);
                          setForgotToken('');
                          setShowReset(true);
                        }}
                        className="w-full py-3 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
                      >
                        Lanjut ke Reset Password
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowForgot(false);
                      setForgotToken('');
                    }}
                    className="mt-4 text-xs text-gray-500 hover:text-primary transition-colors"
                  >
                    Kembali ke Login
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Reset Password Modal */}
          <AnimatePresence>
            {showReset && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowReset(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className={`relative w-full max-w-md border rounded-2xl p-6 shadow-2xl ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-gray-200'}`}
                >
                  <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Reset Password
                  </h3>
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Token Reset</label>
                      <input
                        type="text"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">
                        Password Baru
                      </label>
                      <input
                        type="password"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Min. 8 karakter, huruf besar, kecil, dan angka"
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                    </div>
                    {resetMessage && (
                      <p className={`text-xs ${resetMessage.includes('berhasil') ? 'text-green-500' : 'text-red-500'}`}>
                        {resetMessage}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full py-3 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {resetLoading ? 'Memproses...' : 'Reset Password'}
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div
      className={`min-h-screen font-sans antialiased transition-colors duration-300 ${isDarkMode ? 'bg-black text-gray-200' : 'bg-gray-50 text-gray-800'}`}
    >
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 border-r p-6 hidden lg:block transition-colors duration-300 ${isDarkMode ? 'bg-black border-white/5' : 'bg-white border-gray-200'}`}
      >
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-black" />
          </div>
          <span className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            PCnerd <span className="text-primary">Admin</span>
          </span>
        </div>

        <nav className="space-y-1">
          <SidebarLink
            icon={Database}
            label="Hardware Inventory"
            active={activeSection === 'inventory'}
            isDarkMode={isDarkMode}
            onClick={() => setActiveSection('inventory')}
          />
          {adminUser.role === 'superadmin' && (
            <SidebarLink
              icon={Users}
              label="Admin Management"
              active={activeSection === 'admins'}
              isDarkMode={isDarkMode}
              onClick={() => setActiveSection('admins')}
            />
          )}
        </nav>

        <div className="absolute bottom-10 left-6 right-6 space-y-2">
          <button
            onClick={() => setShowChangePassword(true)}
            className="flex items-center gap-3 text-gray-500 hover:text-primary transition-colors px-3 py-2 text-sm font-medium w-full"
          >
            <Key className="w-4 h-4" /> Change Password
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-gray-500 hover:text-red-500 transition-colors px-3 py-2 text-sm font-medium w-full"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
          <Link
            href="/"
            className="flex items-center gap-3 text-gray-500 hover:text-primary transition-colors px-3 py-2 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Exit to Storefront
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div
        className={`lg:hidden flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}
      >
        <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>PCnerd Admin</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {adminUser.username} ({adminUser.role})
          </span>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:pl-64 pt-8 pb-12 px-6">
        {activeSection === 'inventory' && (
          <>
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Hardware Inventory
                </h1>
                <p className="text-sm text-gray-500">Manage your hardware components and real-time pricing.</p>
              </div>

              <div className="flex items-center gap-3">
                <ThemeToggle />
                <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-2" />
                <SyncPanel isDarkMode={isDarkMode} onComplete={() => fetchComponents()} />
                <button
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ type: 'CPU', price: 0 });
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 bg-primary text-black rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/10"
                >
                  <Plus className="w-4 h-4" /> New Component
                </button>
              </div>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard label="Total SKU" value={components.length} isDarkMode={isDarkMode} />
              <MetricCard
                label="Average Price"
                value={
                  components.length > 0
                    ? `Rp ${(components.reduce((s, c) => s + c.price, 0) / components.length).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
                    : '—'
                }
                isDarkMode={isDarkMode}
              />
              <MetricCard
                label="Market Coverage"
                value={
                  components.length > 0
                    ? `${new Set(components.map((c) => c.marketplace).filter(Boolean)).size} markets`
                    : '—'
                }
                isDarkMode={isDarkMode}
              />
              <MetricCard
                label="Last Sync"
                value={
                  components.length > 0
                    ? new Date(Math.max(...components.map((c) => new Date(c.updatedAt).getTime()))).toLocaleDateString(
                        'id-ID',
                      )
                    : '—'
                }
                isDarkMode={isDarkMode}
              />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                {['ALL', 'CPU', 'GPU', 'MOTHERBOARD', 'RAM', 'STORAGE', 'PSU', 'CASE', 'COOLER'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      activeTab === tab
                        ? 'bg-primary text-black'
                        : isDarkMode
                          ? 'bg-black border border-white/5 text-gray-400 hover:bg-white/10'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="relative group min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search by name or brand..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full border rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-all ${
                    isDarkMode ? 'bg-black border-white/5 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div
              className={`border rounded-xl overflow-hidden shadow-2xl transition-colors duration-300 ${isDarkMode ? 'bg-black border-white/5' : 'bg-white border-gray-200'}`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr
                      className={`border-b transition-colors ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-gray-100 bg-gray-50'}`}
                    >
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Item Details
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Specifications
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Price (IDR)
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                    {filteredComponents.map((comp) => {
                      const Icon = TYPE_ICONS[comp.type] || Box;
                      return (
                        <tr
                          key={comp.id}
                          className={`transition-colors group ${isDarkMode ? 'hover:bg-white/[0.01]' : 'hover:bg-gray-50/50'}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}
                              >
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <div
                                  className={`text-sm font-bold leading-none mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                                >
                                  {comp.name}
                                </div>
                                <div className="text-xs text-gray-500">{comp.brand}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-black tracking-widest bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded uppercase border border-emerald-500/20">
                              {comp.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {comp.type === 'RAM'
                                ? [extractRamSize(comp.name), comp.ramType, extractRamSpeed(comp.name)]
                                    .filter(Boolean)
                                    .join(' · ') || comp.name
                                : comp.type === 'STORAGE'
                                  ? [extractStorageCapacity(comp.name), extractStorageType(comp.name), comp.formFactor]
                                      .filter(Boolean)
                                      .join(' · ') || comp.name
                                  : comp.type === 'CPU'
                                    ? [comp.model, comp.socket, comp.tdp ? `${comp.tdp}W` : '']
                                        .filter(Boolean)
                                        .join(' · ')
                                    : comp.type === 'GPU'
                                      ? [extractGpuModel(comp.name), extractGpuVram(comp.specs)]
                                          .filter(Boolean)
                                          .join(' · ') || comp.name
                                      : comp.type === 'MOTHERBOARD'
                                        ? [comp.socket, comp.ramType, comp.formFactor].filter(Boolean).join(' · ')
                                        : comp.type === 'PSU'
                                          ? comp.wattage
                                            ? `${comp.wattage}W`
                                            : '-'
                                          : comp.type === 'CASE'
                                            ? comp.formFactor || '-'
                                            : comp.type === 'COOLER'
                                              ? extractCoolerSize(comp.name) || comp.name
                                              : comp.socket || comp.ramType || comp.formFactor || '-'}
                            </div>
                            <div className="text-[10px] text-gray-600 mt-1 uppercase">
                              {comp.wattage
                                ? `${comp.wattage}W PSU`
                                : comp.tdp
                                  ? `${comp.tdp}W TDP`
                                  : comp.type === 'RAM'
                                    ? 'RAM'
                                    : comp.type === 'STORAGE'
                                      ? 'STORAGE'
                                      : comp.type === 'GPU'
                                        ? 'GPU'
                                        : comp.type === 'CPU'
                                          ? 'CPU'
                                          : comp.type === 'MOTHERBOARD'
                                            ? comp.formFactor || 'MOBO'
                                            : comp.type === 'CASE'
                                              ? comp.formFactor || 'CASE'
                                              : comp.type === 'COOLER'
                                                ? 'COOLER'
                                                : 'Base Specs'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              Rp {comp.price.toLocaleString('id-ID')}
                            </div>
                            <div className="text-[10px] text-gray-600 mt-0.5">
                              Updated {new Date(comp.updatedAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingId(comp.id);
                                  setFormData(comp);
                                  setIsModalOpen(true);
                                }}
                                className={`p-2 rounded-lg transition-colors text-gray-400 hover:text-white ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-200'}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteComponent(comp.id)}
                                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredComponents.length === 0 && (
                <div className="py-20 text-center text-gray-500 flex flex-col items-center gap-3">
                  <Database className="w-10 h-10 opacity-20" />
                  <p>No components found matching your filters.</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeSection === 'admins' && adminUser.role === 'superadmin' && (
          <>
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Admin Management
                </h1>
                <p className="text-sm text-gray-500">Manage admin accounts and roles.</p>
              </div>
              <button
                onClick={() => {
                  setAdminForm({ username: '', password: '', role: 'admin' });
                  setAdminModal({ type: 'create' });
                }}
                className="px-4 py-2 bg-primary text-black rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/10"
              >
                <Plus className="w-4 h-4" /> New Admin
              </button>
            </header>

            <div
              className={`border rounded-xl overflow-hidden shadow-2xl transition-colors duration-300 ${isDarkMode ? 'bg-black border-white/5' : 'bg-white border-gray-200'}`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr
                      className={`border-b transition-colors ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-gray-100 bg-gray-50'}`}
                    >
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Last Login</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                    {admins.map((adm) => (
                      <tr
                        key={adm.id}
                        className={`transition-colors group ${isDarkMode ? 'hover:bg-white/[0.01]' : 'hover:bg-gray-50/50'}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${adm.role === 'superadmin' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}
                            >
                              {adm.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {adm.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded uppercase border ${
                              adm.role === 'superadmin'
                                ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            }`}
                          >
                            {adm.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {adm.lastLoginAt ? new Date(adm.lastLoginAt).toLocaleString('id-ID') : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(adm.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setAdminForm({ username: adm.username, password: '', role: adm.role });
                                setAdminModal({ type: 'edit', admin: adm });
                              }}
                              className={`p-2 rounded-lg transition-colors text-gray-400 hover:text-white ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-200'}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {adm.id !== adminUser.id && (
                              <button
                                onClick={() => deleteAdmin(adm.id)}
                                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Component Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-xl border rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-gray-200'}`}
            >
              <div
                className={`px-6 py-4 border-b flex justify-between items-center ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}
              >
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingId ? 'Modify Component' : 'Register Component'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleComponentSubmit} className="p-6 space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Full Name</label>
                    <input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:border-primary/50 outline-none transition-all ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Category</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      >
                        <option value="CPU">CPU</option>
                        <option value="GPU">GPU</option>
                        <option value="MOTHERBOARD">Motherboard</option>
                        <option value="RAM">RAM</option>
                        <option value="STORAGE">Storage</option>
                        <option value="PSU">PSU</option>
                        <option value="CASE">Case</option>
                        <option value="COOLER">Cooler</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Brand</label>
                      <input
                        required
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">
                        Unit Price (IDR)
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Socket / Gen</label>
                      <input
                        placeholder="e.g. AM5, LGA1700"
                        value={formData.socket || ''}
                        onChange={(e) => setFormData({ ...formData, socket: e.target.value })}
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">RAM Type</label>
                      <select
                        value={formData.ramType || ''}
                        onChange={(e) => setFormData({ ...formData, ramType: e.target.value })}
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      >
                        <option value="">—</option>
                        <option value="DDR4">DDR4</option>
                        <option value="DDR5">DDR5</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Form Factor</label>
                      <select
                        value={formData.formFactor || ''}
                        onChange={(e) => setFormData({ ...formData, formFactor: e.target.value })}
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      >
                        <option value="">—</option>
                        <option value="ATX">ATX</option>
                        <option value="Micro-ATX">Micro-ATX</option>
                        <option value="Mini-ITX">Mini-ITX</option>
                        <option value="E-ATX">E-ATX</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-3 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
                  >
                    {editingId ? 'Apply Changes' : 'Confirm Registration'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Modal */}
      <AnimatePresence>
        {adminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAdminModal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-md border rounded-2xl p-6 shadow-2xl ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-gray-200'}`}
            >
              <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {adminModal.type === 'create' ? 'Create Admin' : 'Edit Admin'}
              </h3>
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Username</label>
                  <input
                    type="text"
                    value={adminForm.username}
                    onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                    disabled={adminModal.type === 'edit'}
                    className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none ${isDarkMode ? 'bg-black border-white/10 text-white disabled:opacity-50' : 'bg-gray-50 border-gray-200 text-gray-900 disabled:opacity-50'}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">
                    Password {adminModal.type === 'edit' && '(kosongkan jika tidak diubah)'}
                  </label>
                  <input
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    placeholder="Min. 8 karakter, huruf besar, kecil, dan angka"
                    className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Role</label>
                  <select
                    value={adminForm.role}
                    onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}
                    className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  >
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
                {adminFormError && <p className="text-red-500 text-xs">{adminFormError}</p>}
                <button
                  type="submit"
                  className="w-full py-3 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
                >
                  {adminModal.type === 'create' ? 'Create Admin' : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showChangePassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChangePassword(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-md border rounded-2xl p-6 shadow-2xl ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-gray-200'}`}
            >
              <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Change Password
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 karakter, huruf besar, kecil, dan angka"
                    className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                </div>
                {changePasswordMessage && (
                  <p
                    className={`text-xs ${changePasswordMessage.includes('berhasil') ? 'text-green-500' : 'text-red-500'}`}
                  >
                    {changePasswordMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  className="w-full py-3 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {changePasswordLoading ? 'Memproses...' : 'Change Password'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarLink({
  icon: Icon,
  label,
  active = false,
  isDarkMode,
  onClick,
}: {
  icon: any;
  label: string;
  active?: boolean;
  isDarkMode: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
        active
          ? 'bg-primary/10 text-primary'
          : isDarkMode
            ? 'text-gray-500 hover:text-white hover:bg-white/5'
            : 'text-gray-500 hover:text-primary hover:bg-gray-100'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-bold">{label}</span>
      {active && <div className="ml-auto w-1 h-4 bg-primary rounded-full" />}
    </div>
  );
}

function extractRamSize(name: string): string {
  const match = name.match(/(\d+\s*GB(?:\s*\(\d+\s*x\s*\d+\))?)/i);
  return match ? match[1] : '';
}

function extractRamSpeed(name: string): string {
  const match = name.match(/(\d{4,5}\s*MHz)/i);
  return match ? match[1] : '';
}

function extractStorageCapacity(name: string): string {
  const match = name.match(/(\d+\s*(?:GB|TB))/i);
  return match ? match[1] : '';
}

function extractStorageType(name: string): string {
  const match = name.match(/\b(SSD|NVMe|HDD)\b/i);
  return match ? match[1].toUpperCase() : '';
}

function extractCpuModel(name: string): string {
  const match = name.match(/(i\d+-\d+[A-Z]*\s*[A-Z]*|R\d+-\d+[A-Z]*)/i);
  return match ? match[0] : '';
}

function extractGpuVram(specs: any): string {
  if (!specs) return '';
  if (typeof specs === 'string') {
    try {
      const p = JSON.parse(specs);
      return p?.vram || '';
    } catch {
      return '';
    }
  }
  return specs.vram || '';
}

function extractCoolerSize(name: string): string {
  const match = name.match(/(\d+mm)/i);
  return match ? match[0] : '';
}

function extractGpuModel(name: string): string {
  const match = name.match(/(RTX\s*\d+\s*\w*|RX\s*\d+\s*\w*|GTX\s*\d+\s*\w*|Arc\s*\w*)/i);
  return match ? match[0] : '';
}

function MetricCard({ label, value, isDarkMode }: { label: string; value: any; isDarkMode: boolean }) {
  return (
    <div
      className={`border p-5 rounded-xl transition-colors duration-300 ${isDarkMode ? 'bg-black border-white/5' : 'bg-white border-gray-200'}`}
    >
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</div>
      <div className="flex items-end justify-between">
        <div className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</div>
      </div>
    </div>
  );
}
