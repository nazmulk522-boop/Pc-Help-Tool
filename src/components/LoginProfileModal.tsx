import React, { useState, useEffect } from 'react';
import { useShopAuth } from '../context/ShopAuthContext';
import { 
  Store, 
  ShieldCheck, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Edit3, 
  Building2, 
  Key, 
  Lock, 
  X,
  Trash2,
  Eye,
  Sliders,
  RotateCcw,
  Upload,
  Download,
  FileSpreadsheet,
  ShieldAlert,
  Loader2,
  Globe,
  UserPlus,
  LogIn
} from 'lucide-react';
import { exportAllVotersToExcel } from '../utils/pdfVoterParser';
import { getDatabaseStats, DbStats } from '../utils/voterDb';

interface LoginProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'admin_login' | 'profile' | 'shop_login';
  onOpenVoterDbModal?: () => void;
}

export const LoginProfileModal: React.FC<LoginProfileModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
  onOpenVoterDbModal,
}) => {
  const {
    currentProfile,
    isLoggedIn,
    isSuperAdmin,
    clientIp,
    ipMismatchError,
    registeredShops,
    loginWithCredentials,
    registerShopOwner,
    updateShopProfile,
    changeUserPassword,
    logout,
    deleteShopByAdmin,
    clearIpMismatchError,
  } = useShopAuth();

  const normalizedInitialTab = () => {
    if (isLoggedIn) return 'profile';
    if (initialTab === 'shop_login' || initialTab === 'login') return 'login';
    if (initialTab === 'register') return 'register';
    if (initialTab === 'admin_login') return 'admin_login';
    return 'login';
  };

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'admin_login' | 'profile'>(
    normalizedInitialTab()
  );

  // Database stats & Download states
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAdminApprovalDialog, setShowAdminApprovalDialog] = useState(false);
  const [approvalPassword, setApprovalPassword] = useState('');
  const [approvalError, setApprovalError] = useState('');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register Form State
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regShopName, setRegShopName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regTagline, setRegTagline] = useState('');

  // Admin Login State
  const [adminEmail, setAdminEmail] = useState('nazmulk522@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswordChangeForm, setShowPasswordChangeForm] = useState(false);

  // Edit Profile Form State
  const [editShopName, setEditShopName] = useState(currentProfile.shopName);
  const [editOwnerName, setEditOwnerName] = useState(currentProfile.ownerName);
  const [editPhone, setEditPhone] = useState(currentProfile.phone || '');
  const [editAddress, setEditAddress] = useState(currentProfile.address || '');
  const [editTagline, setEditTagline] = useState(currentProfile.tagline || '');

  // Feedback Messages
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      setActiveTab('profile');
      setEditShopName(currentProfile.shopName);
      setEditOwnerName(currentProfile.ownerName);
      setEditPhone(currentProfile.phone || '');
      setEditAddress(currentProfile.address || '');
      setEditTagline(currentProfile.tagline || '');
    } else {
      if (initialTab === 'register') {
        setActiveTab('register');
      } else if (initialTab === 'admin_login') {
        setActiveTab('admin_login');
      } else {
        setActiveTab('login');
      }
    }
  }, [isLoggedIn, currentProfile, initialTab, isOpen]);

  // Load Database Stats
  useEffect(() => {
    if (isOpen) {
      getDatabaseStats()
        .then((stats) => setDbStats(stats))
        .catch((err) => console.error('Failed to load db stats in modal:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginEmail.includes('@')) {
      setStatusMessage({ type: 'error', text: 'দয়া করে একটি সঠিক জিমেইল বা ইমেইল ঠিকানা দিন।' });
      return;
    }
    if (!loginPassword.trim()) {
      setStatusMessage({ type: 'error', text: 'পাসওয়ার্ড প্রদান করুন।' });
      return;
    }

    setIsSubmitting(true);
    const res = await loginWithCredentials(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1000);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  // 2. Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setStatusMessage({ type: 'error', text: 'সঠিক ইমেইল বা জিমেইল ঠিকানা দিন।' });
      return;
    }
    if (!regPassword.trim() || regPassword.length < 4) {
      setStatusMessage({ type: 'error', text: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' });
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setStatusMessage({ type: 'error', text: 'পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মিলছে না।' });
      return;
    }
    if (!regShopName.trim()) {
      setStatusMessage({ type: 'error', text: 'দোকানের নাম আবশ্যক।' });
      return;
    }

    setIsSubmitting(true);
    const res = await registerShopOwner({
      email: regEmail,
      password: regPassword,
      shopName: regShopName,
      ownerName: regOwnerName || 'দোকান পরিচালক',
      phone: regPhone,
      address: regAddress,
      tagline: regTagline,
    });
    setIsSubmitting(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1000);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  // 3. Handle Admin Login Submit
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      setStatusMessage({ type: 'error', text: 'এডমিন জিমেইল লিখুন।' });
      return;
    }
    if (!adminPassword.trim()) {
      setStatusMessage({ type: 'error', text: 'এডমিন পাসওয়ার্ড দিন (ডিফল্ট: admin123)।' });
      return;
    }

    setIsSubmitting(true);
    const res = await loginWithCredentials(adminEmail, adminPassword);
    setIsSubmitting(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1000);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  // 4. Handle Password Change
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword.trim()) {
      setStatusMessage({ type: 'error', text: 'বর্তমান পাসওয়ার্ড লিখুন।' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setStatusMessage({ type: 'error', text: 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ মিলছে না।' });
      return;
    }
    if (newPassword.length < 4) {
      setStatusMessage({ type: 'error', text: 'নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' });
      return;
    }

    const res = await changeUserPassword(oldPassword, newPassword);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordChangeForm(false);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  // 5. Handle Profile Save
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editShopName.trim()) {
      setStatusMessage({ type: 'error', text: 'দোকানের নাম খালি রাখা যাবে না।' });
      return;
    }

    const ok = await updateShopProfile({
      shopName: editShopName.trim(),
      ownerName: editOwnerName.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim(),
      tagline: editTagline.trim(),
    });

    if (ok) {
      setStatusMessage({
        type: 'success',
        text: 'দোকানের নাম ও তথ্য সফলভাবে আপডেট হয়েছে!',
      });
      setTimeout(() => {
        setStatusMessage(null);
      }, 2500);
    } else {
      setStatusMessage({
        type: 'error',
        text: 'তথ্য আপডেট করতে ব্যর্থ হয়েছে।',
      });
    }
  };

  // Execute Direct Excel Export
  const executeDatabaseDownload = async () => {
    setIsDownloading(true);
    try {
      const success = await exportAllVotersToExcel();
      if (success) {
        setStatusMessage({
          type: 'success',
          text: 'ভোটার ডাটাবেজ Excel (.xlsx) সফলভাবে ডাউনলোড হয়েছে!',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: 'ডাটাবেজে কোনো ভোটার তথ্য পাওয়া যায়নি। আগে ডাটা আপলোড করুন।',
        });
      }
    } catch (e) {
      setStatusMessage({
        type: 'error',
        text: 'ডাউনলোড করতে সমস্যা হয়েছে।',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleInitiateDatabaseDownload = () => {
    if (isSuperAdmin) {
      executeDatabaseDownload();
    } else {
      setShowAdminApprovalDialog(true);
      setApprovalPassword('');
      setApprovalError('');
    }
  };

  const handleApproveAndDownload = (e: React.FormEvent) => {
    e.preventDefault();
    if (approvalPassword.trim() === 'admin123') {
      setShowAdminApprovalDialog(false);
      setApprovalPassword('');
      setApprovalError('');
      executeDatabaseDownload();
    } else {
      setApprovalError('ভুল এডমিন পাসওয়ার্ড! অনুমোদন ছাড়া ডাটাবেজ ডাউনলোড হবে না।');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
              {isSuperAdmin ? (
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              ) : isLoggedIn ? (
                <Store className="w-5 h-5 text-emerald-400" />
              ) : (
                <Building2 className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                {isLoggedIn ? (
                  <>
                    <span>{currentProfile.shopName}</span>
                    {isSuperAdmin && (
                      <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
                        👑 সুপার এডমিন
                      </span>
                    )}
                  </>
                ) : (
                  'লগইন ও শপ রেজিস্ট্রেশন পোর্টাল'
                )}
              </h2>
              <p className="text-xs text-slate-300">
                {isLoggedIn
                  ? `${currentProfile.ownerEmail || 'লগইন প্রোফাইল'} (${currentProfile.ownerName})`
                  : 'যেকোনো ট্যাব থেকে কাজ করতে আপনার ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* IP Security Banner */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2 flex items-center justify-between text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 font-mono">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>বর্তমান আইপি (IP):</span>
            <span className="font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-300">
              {clientIp || 'সনাক্ত করা হচ্ছে...'}
            </span>
          </div>
          <span className="hidden sm:inline text-slate-500">
            🔓 নতুন ট্যাবে গেস্ট মোড চালু থাকে — যেকোনো সময় লগইন বা রেজিস্ট্রেশন করতে পারেন
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-semibold overflow-x-auto">
          {!isLoggedIn ? (
            <>
              <button
                onClick={() => {
                  setActiveTab('login');
                  setStatusMessage(null);
                }}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                  activeTab === 'login'
                    ? 'border-blue-600 text-blue-600 font-bold bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>লগইন (Login)</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('register');
                  setStatusMessage(null);
                }}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                  activeTab === 'register'
                    ? 'border-emerald-600 text-emerald-600 font-bold bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>নতুন রেজিস্ট্রেশন (Register)</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('admin_login');
                  setStatusMessage(null);
                }}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                  activeTab === 'admin_login'
                    ? 'border-amber-600 text-amber-600 font-bold bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>এডমিন লগইন (Admin)</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setStatusMessage(null);
                }}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'profile'
                    ? 'border-blue-600 text-blue-600 font-bold bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>দোকানের নাম ও তথ্য পরিবর্তন</span>
              </button>
              {isSuperAdmin && (
                <button
                  onClick={() => {
                    setActiveTab('admin_login');
                    setStatusMessage(null);
                  }}
                  className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'admin_login'
                      ? 'border-amber-600 text-amber-600 font-bold bg-white rounded-t-lg shadow-2xs'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-amber-500" />
                  <span>এডমিন কন্ট্রোল ও ইউজার লিস্ট</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Status Message Notification */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-start gap-2.5 text-xs font-semibold ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: LOGIN (EMAIL + PASSWORD) */}
          {activeTab === 'login' && !isLoggedIn && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-blue-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-xs text-blue-900">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>ইমেইল ও পাসওয়ার্ড দিয়ে লগইন:</span>
                </p>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  আপনার রেজিস্টার্ড ইমেইল ও পাসওয়ার্ড লিখুন। দোকানদার বা সুপার এডমিন উভয়েই এখান থেকে সহজে লগইন করতে পারবেন।
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  আপনার রেজিস্টার্ড ইমেইল / জিমেইল <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="আপনার_ইমেইল@gmail.com"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  পাসওয়ার্ড <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="আপনার পাসওয়ার্ড লিখুন"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs active:scale-98 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>যাচাই করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>লগইন করুন</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-slate-600">
                <span>অ্যাকাউন্ট নেই? </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setStatusMessage(null);
                  }}
                  className="text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  নতুন অ্যাকাউন্ট রেজিস্ট্রেশন করুন
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTER (NEW ACCOUNT) */}
          {activeTab === 'register' && !isLoggedIn && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-xs text-emerald-900">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <span>নতুন দোকান ও স্টুডিও অ্যাকাউন্ট রেজিস্ট্রেশন:</span>
                </p>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  আপনার ইমেইল ও পাসওয়ার্ড দিয়ে একবার একাউন্ট খুলুন। পরবর্তীতে যেকোনো ট্যাব থেকে এই ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করতে পারবেন।
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    আপনার জিমেইল / ইমেইল <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="আপনার_জিমেইল@gmail.com"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    দোকানের নাম <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={regShopName}
                      onChange={(e) => setRegShopName(e.target.value)}
                      placeholder="e.g. ডিজিটাল কম্পিউটার শপ"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    লগইন পাসওয়ার্ড তৈরি করুন <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    পাসওয়ার্ড নিশ্চিত করুন <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="পুনরায় পাসওয়ার্ড দিন"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    মালিক / পরিচালকের নাম
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={regOwnerName}
                      onChange={(e) => setRegOwnerName(e.target.value)}
                      placeholder="e.g. মোঃ নাজমুল হোসেন"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    মোবাইল নম্বর
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+88017xxxxxxxx"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    দোকানের ঠিকানা
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="সাবানা রোড, বনবাড়িয়া"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    স্লোগান বা সেবাসমূহ
                  </label>
                  <input
                    type="text"
                    value={regTagline}
                    onChange={(e) => setRegTagline(e.target.value)}
                    placeholder="অনলাইন আবেদন ও ফটো স্টুডিও"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs active:scale-98 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>একাউন্ট তৈরি হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>একাউন্ট তৈরি ও লগইন করুন</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-slate-600">
                <span>ইতিমধ্যে অ্যাকাউন্ট আছে? </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setStatusMessage(null);
                  }}
                  className="text-blue-700 font-bold hover:underline cursor-pointer"
                >
                  লগইন পেইজে যান
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ADMIN LOGIN & CONTROLS */}
          {activeTab === 'admin_login' && (
            <div className="space-y-4">
              {!isLoggedIn || !isSuperAdmin ? (
                <form onSubmit={handleAdminLoginSubmit} className="space-y-3.5">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-950 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-xs text-amber-900">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>সুপার এডমিন লগইন:</span>
                    </p>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      এডমিন ইমেইল ও পাসওয়ার্ড প্রদান করে সিস্টেমে সুপার এডমিন হিসেবে প্রবেশ করুন।
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      এডমিন ইমেইল <span className="text-amber-600">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="nazmulk522@gmail.com"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-xs bg-white font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      এডমিন পাসওয়ার্ড <span className="text-amber-600">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="এডমিন পাসওয়ার্ড (ডিফল্ট: admin123)"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-xs bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs active:scale-98 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>যাচাই হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>এডমিন হিসেবে লগইন করুন</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Super Admin Dashboard & User Management */
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-amber-950 text-xs">
                        👑 সুপার এডমিন প্রোফাইল: {currentProfile.ownerEmail}
                      </p>
                      <p className="text-[11px] text-amber-800">
                        নিবন্ধিত দোকান: {registeredShops.length}টি
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-amber-200 text-amber-900 rounded font-mono font-bold text-[10px]">
                      SUPER ADMIN
                    </span>
                  </div>

                  {/* Voter Database Download Card */}
                  <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-emerald-500/50 rounded-2xl text-white space-y-3 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                          <span>ভোটার ডাটাবেইজ Excel (.xlsx) ডাউনলোড</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                            Excel Export
                          </span>
                        </h4>
                        <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                          {dbStats?.totalVoters
                            ? `ডাটাবেজে সংরক্ষিত ${dbStats.totalVoters.toLocaleString('bn-BD')} জন ভোটারের সম্পূর্ণ তথ্য এক ক্লিকে ডাউনলোড করুন`
                            : 'ডাটাবেজের সকল ভোটার তথ্য Excel (.xlsx) ফাইলে ডাউনলোড করুন'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={handleInitiateDatabaseDownload}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>ডাটাবেজ প্রস্তুত ও ডাউনলোড হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>সম্পূর্ণ ডাটাবেজ Excel (.xlsx) ডাউনলোড করুন</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Registered Shops List for Super Admin */}
                  {registeredShops.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-800 text-xs">
                        নিবন্ধিত দোকানের তালিকা:
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {registeredShops.map((shop) => (
                          <div
                            key={shop.shopId}
                            className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{shop.shopName}</span>
                                {shop.role === 'super_admin' && (
                                  <span className="text-[9px] bg-amber-200 text-amber-800 px-1.5 rounded font-bold">এডমিন</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {shop.ownerEmail} • {shop.ownerName} • {shop.phone || 'মোবাইল নেই'}
                              </div>
                            </div>
                            {shop.role !== 'super_admin' && (
                              <button
                                onClick={() => deleteShopByAdmin(shop.shopId)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                                title="দোকান মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PROFILE & SHOP NAME CHANGE (LOGGED IN) */}
          {activeTab === 'profile' && isLoggedIn && (
            <form onSubmit={handleProfileSave} className="space-y-3.5">
              {/* Live Preview Card */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> লাইভ হোমপেজ প্রিভিউ
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-blue-200/80 text-blue-900 font-bold rounded-full">
                    {currentProfile.role === 'super_admin' ? '👑 এডমিন প্রোফাইল' : '🏪 দোকানদার প্রোফাইল'}
                  </span>
                </div>
                <div className="text-base font-black text-slate-900 tracking-tight">
                  {editShopName || 'দোকানের নাম'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono pt-1">
                  📞 {editPhone || '+8809649487206'} | 📍 {editAddress || 'সাবানা রোড, বনবাড়িয়া'}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  দোকানের নাম (হোমপেজে যা প্রদর্শিত হবে) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-blue-600 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={editShopName}
                    onChange={(e) => setEditShopName(e.target.value)}
                    placeholder="আপনার দোকানের নাম লিখুন"
                    className="w-full pl-9 pr-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs bg-white font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    মালিকের নাম
                  </label>
                  <input
                    type="text"
                    value={editOwnerName}
                    onChange={(e) => setEditOwnerName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    মোবাইল নম্বর
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    দোকানের ঠিকানা
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    স্লোগান / ট্যাগলাইন
                  </label>
                  <input
                    type="text"
                    value={editTagline}
                    onChange={(e) => setEditTagline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs bg-white"
                  />
                </div>
              </div>

              {/* Password Change Toggle */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <Key className="w-4 h-4 text-blue-600" />
                    <span>পাসওয়ার্ড পরিবর্তন করুন</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordChangeForm(!showPasswordChangeForm)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-bold cursor-pointer"
                  >
                    {showPasswordChangeForm ? 'বন্ধ করুন' : 'পাসওয়ার্ড পরিবর্তন'}
                  </button>
                </div>

                {showPasswordChangeForm && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div>
                      <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">
                        বর্তমান পাসওয়ার্ড
                      </label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="বর্তমান পাসওয়ার্ড"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">
                          নতুন পাসওয়ার্ড
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="নতুন পাসওয়ার্ড"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">
                          নতুন পাসওয়ার্ড নিশ্চিত করুন
                        </label>
                        <input
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="কনফার্ম পাসওয়ার্ড"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleChangePasswordSubmit}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      নতুন পাসওয়ার্ড সেট করুন
                    </button>
                  </div>
                )}
              </div>

              {/* Database Download Card */}
              <div className="p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs">ভোটার ডাটাবেজ Excel (.xlsx) ব্যাকআপ</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    {dbStats?.totalVoters ? `${dbStats.totalVoters.toLocaleString('bn-BD')} ভোটার` : '০ ভোটার'}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={handleInitiateDatabaseDownload}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>ডাউনলোড হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>ডাটাবেজ এক্সেল (.xlsx) ডাউনলোড</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>দোকানের নাম ও তথ্য সংরক্ষণ করুন</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    onClose();
                  }}
                  className="px-3 py-2.5 border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold rounded-xl transition flex items-center gap-1.5 text-xs shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>লগআউট</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Admin Approval Dialog Overlay */}
        {showAdminApprovalDialog && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-5 max-w-sm w-full text-white space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="font-bold text-sm text-white">🔒 এডমিন অনুমোদন আবশ্যক</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  ভোটার ডাটাবেজ ডাউনলোড করতে সুপার এডমিন এর পাসওয়ার্ড দিয়ে অনুমোদন নিশ্চিত করুন।
                </p>
              </div>

              <form onSubmit={handleApproveAndDownload} className="space-y-3 pt-1">
                <div>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={approvalPassword}
                    onChange={(e) => {
                      setApprovalPassword(e.target.value);
                      setApprovalError('');
                    }}
                    placeholder="এডমিন পাসওয়ার্ড দিন (admin123)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {approvalError && (
                    <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {approvalError}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminApprovalDialog(false);
                      setApprovalPassword('');
                      setApprovalError('');
                    }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-amber-950 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>অনুমোদন ও ডাউনলোড</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>ডিজিটাল কম্পিউটার শপ ও স্টুডিও সিস্টেম</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-md cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
