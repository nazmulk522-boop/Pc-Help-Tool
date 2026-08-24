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
  Loader2
} from 'lucide-react';
import { exportAllVotersToExcel } from '../utils/pdfVoterParser';
import { getDatabaseStats, DbStats } from '../utils/voterDb';

interface LoginProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'shop_login' | 'admin_login' | 'profile';
  onOpenVoterDbModal?: () => void;
}

export const LoginProfileModal: React.FC<LoginProfileModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'shop_login',
  onOpenVoterDbModal,
}) => {
  const {
    currentProfile,
    isLoggedIn,
    isSuperAdmin,
    registeredShops,
    verifyAdminPassword,
    loginAsAdmin,
    changeAdminPassword,
    resetAdminPassword,
    loginAsShopOwner,
    updateShopProfile,
    logout,
    deleteShopByAdmin,
  } = useShopAuth();

  const [activeTab, setActiveTab] = useState<'shop_login' | 'admin_login' | 'profile'>(
    isLoggedIn ? 'profile' : initialTab
  );

  // Database stats & Download states
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAdminApprovalDialog, setShowAdminApprovalDialog] = useState(false);
  const [approvalPassword, setApprovalPassword] = useState('');
  const [approvalError, setApprovalError] = useState('');

  // Shop Owner Form State
  const [shopEmail, setShopEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [tagline, setTagline] = useState('');

  // Admin Form State (Manual Entry - No hardcoded email)
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // Password Management for Admin
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      setActiveTab(initialTab);
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
      console.error(e);
      setStatusMessage({
        type: 'error',
        text: 'ডাউনলোড করতে সমস্যা হয়েছে।',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Check if admin or request approval
  const handleInitiateDatabaseDownload = () => {
    if (isSuperAdmin) {
      executeDatabaseDownload();
    } else {
      setShowAdminApprovalDialog(true);
      setApprovalPassword('');
      setApprovalError('');
    }
  };

  // Verify Admin Approval
  const handleApproveAndDownload = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(approvalPassword)) {
      setShowAdminApprovalDialog(false);
      setApprovalPassword('');
      setApprovalError('');
      executeDatabaseDownload();
    } else {
      setApprovalError('ভুল এডমিন পাসওয়ার্ড! অনুমোদন ছাড়া ডাটাবেজ ডাউনলোড হবে না।');
    }
  };

  if (!isOpen) return null;

  // Handle Shop Owner Login
  const handleShopLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopEmail.trim() || !shopEmail.includes('@')) {
      setStatusMessage({ type: 'error', text: 'দয়া করে একটি সঠিক জিমেইল বা ইমেইল ঠিকানা দিন।' });
      return;
    }
    if (!shopName.trim()) {
      setStatusMessage({ type: 'error', text: 'দোকানের নাম আবশ্যক।' });
      return;
    }

    const res = loginAsShopOwner({
      email: shopEmail,
      ownerName: ownerName || 'দোকান পরিচালক',
      shopName,
      phone,
      address,
      tagline,
    });

    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1200);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  // Handle Admin Login with Manual Email & Password
  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmailInput.trim() || !adminEmailInput.includes('@')) {
      setStatusMessage({ type: 'error', text: 'অনুগ্রহ করে সঠিক এডমিন জিমেইল ঠিকানা লিখুন।' });
      return;
    }
    if (!adminPasswordInput.trim()) {
      setStatusMessage({ type: 'error', text: 'এডমিন পাসওয়ার্ড দিন (ডিফল্ট: admin123)।' });
      return;
    }

    const res = loginAsAdmin(adminEmailInput, adminPasswordInput);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1200);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  // Handle Admin Password Change
  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword.trim()) {
      setStatusMessage({ type: 'error', text: 'বর্তমান পাসওয়ার্ড লিখুন।' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ মিলছে না।' });
      return;
    }
    const res = changeAdminPassword(oldPassword, newPassword);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChangeForm(false);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  // Handle Reset Password to Default
  const handleResetPassword = () => {
    if (window.confirm('আপনি কি এডমিন পাসওয়ার্ড রিসেট করে ডিফল্ট (admin123) করতে চান?')) {
      const res = resetAdminPassword();
      setStatusMessage({ type: 'success', text: res.message });
    }
  };

  // Handle Profile Update
  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editShopName.trim()) {
      setStatusMessage({ type: 'error', text: 'দোকানের নাম খালি রাখা যাবে না।' });
      return;
    }

    updateShopProfile({
      shopName: editShopName.trim(),
      ownerName: editOwnerName.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim(),
      tagline: editTagline.trim(),
    });

    setStatusMessage({
      type: 'success',
      text: 'দোকানের নাম ও তথ্য সফলভাবে আপডেট হয়েছে! হোমপেজে নতুন নাম প্রদর্শিত হচ্ছে।',
    });
    setTimeout(() => {
      setStatusMessage(null);
    }, 2500);
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
                  'লগইন ও শপ প্রোফাইল পোর্টাল'
                )}
              </h2>
              <p className="text-xs text-slate-300">
                {isLoggedIn
                  ? `${currentProfile.ownerEmail || 'লগইন প্রোফাইল'} (${currentProfile.ownerName})`
                  : 'দোকানদার বা এডমিন হিসেবে লগইন করুন'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-semibold">
          {!isLoggedIn ? (
            <>
              <button
                onClick={() => {
                  setActiveTab('shop_login');
                  setStatusMessage(null);
                }}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
                  activeTab === 'shop_login'
                    ? 'border-blue-600 text-blue-600 font-bold bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>দোকানদার লগইন (Shop Login)</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('admin_login');
                  setStatusMessage(null);
                }}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
                  activeTab === 'admin_login'
                    ? 'border-amber-600 text-amber-600 font-bold bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>এডমিন লগইন (Admin Login)</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setStatusMessage(null);
                }}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
                  activeTab === 'profile'
                    ? 'border-blue-600 text-blue-600 font-bold bg-white rounded-t-lg'
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
                  className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
                    activeTab === 'admin_login'
                      ? 'border-amber-600 text-amber-600 font-bold bg-white rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-amber-500" />
                  <span>এডমিন কন্ট্রোল ও পাসওয়ার্ড</span>
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

          {/* TAB 1: SHOP OWNER LOGIN */}
          {activeTab === 'shop_login' && !isLoggedIn && (
            <form onSubmit={handleShopLoginSubmit} className="space-y-3.5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>দোকানের প্রোফাইল তৈরির সুবিধা:</span>
                </p>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  আপনার জিমেইল দিয়ে লগইন করে একবার দোকানের নাম লিখে দিলেই পুরো সফটওয়্যারের হোমপেজ ও রিসিটে আপনার দোকানের নাম সেট হয়ে যাবে।
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  আপনার জিমেইল / ইমেইল <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={shopEmail}
                    onChange={(e) => setShopEmail(e.target.value)}
                    placeholder="আপনার_জিমেইল@gmail.com"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    দোকানের নাম (Shop Name) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. ডিজিটাল কম্পিউটার শপ ও স্টুডিও"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs bg-white font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    মালিক / প্রোপাইটার নাম
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. মোঃ নাজমুল হোসেন"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    মোবাইল নম্বর
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+8809649487206"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    দোকানের ঠিকানা / বাজার
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="সাবানা রোড, বনবাড়িয়া"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  স্লোগান বা সেবাসমূহ (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="যেমন: অনলাইন আবেদন, NID সংশোধন ও ফটো স্টুডিও"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs active:scale-98"
              >
                <Store className="w-4 h-4" />
                <span>দোকান প্রোফাইলে লগইন করুন</span>
              </button>
            </form>
          )}

          {/* TAB 2: ADMIN LOGIN & ADMIN CONTROLS */}
          {activeTab === 'admin_login' && (
            <div className="space-y-4">
              {!isLoggedIn || !isSuperAdmin ? (
                <form onSubmit={handleAdminLoginSubmit} className="space-y-3.5">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-950 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-xs text-amber-900">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>এডমিন লগইন (ম্যানুয়াল এন্ট্রি):</span>
                    </p>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      আপনার নিজস্ব এডমিন জিমেইল ও পাসওয়ার্ড প্রদান করে সিস্টেমে লগইন করুন।
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      এডমিন জিমেইল / ইমেইল <span className="text-amber-600">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={adminEmailInput}
                        onChange={(e) => setAdminEmailInput(e.target.value)}
                        placeholder="আপনার_এডমিন_জিমেইল@gmail.com"
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
                        value={adminPasswordInput}
                        onChange={(e) => setAdminPasswordInput(e.target.value)}
                        placeholder="এডমিন পাসওয়ার্ড লিখুন"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-xs bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs active:scale-98"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>এডমিন হিসেবে লগইন করুন</span>
                  </button>
                </form>
              ) : (
                /* Super Admin Dashboard & Password Management */
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

                  {/* Voter Database & Seat Download Action with Admin Approval Workflow */}
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

                  {/* Password Management Accordion / Box */}
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                        <Key className="w-4 h-4 text-amber-600" />
                        <span>এডমিন পাসওয়ার্ড পরিবর্তন ও রিস্টার্ট</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPasswordChangeForm(!showPasswordChangeForm)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold"
                        >
                          {showPasswordChangeForm ? 'বন্ধ করুন' : 'পাসওয়ার্ড পরিবর্তন'}
                        </button>
                        <button
                          type="button"
                          onClick={handleResetPassword}
                          className="px-2 py-1 border border-slate-300 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1"
                          title="পাসওয়ার্ড রিস্টার্ট / রিসেট করুন"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>রিসেট</span>
                        </button>
                      </div>
                    </div>

                    {showPasswordChangeForm && (
                      <form onSubmit={handleChangePasswordSubmit} className="pt-2 border-t border-slate-200 space-y-2.5">
                        <div>
                          <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">
                            বর্তমান পাসওয়ার্ড
                          </label>
                          <input
                            type="password"
                            required
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder="বর্তমান পাসওয়ার্ড দিন"
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
                              required
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="নতুন পাসওয়ার্ড দিন"
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">
                              নতুন পাসওয়ার্ড নিশ্চিত করুন
                            </label>
                            <input
                              type="password"
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="পুনরায় পাসওয়ার্ড দিন"
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition"
                        >
                          পাসওয়ার্ড পরিবর্তন সম্পন্ন করুন
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Registered Shops List for Admin */}
                  {registeredShops.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-800 text-xs">
                        নিবন্ধিত দোকানের তালিকা:
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {registeredShops.map((shop) => (
                          <div
                            key={shop.shopId}
                            className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{shop.shopName}</span>
                                {shop.role === 'super_admin' && (
                                  <span className="text-[9px] bg-amber-200 text-amber-800 px-1.5 rounded">এডমিন</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {shop.ownerEmail} • {shop.phone || 'মোবাইল নেই'} • {shop.address || 'ঠিকানা নেই'}
                              </div>
                            </div>
                            {shop.role !== 'super_admin' && (
                              <button
                                onClick={() => deleteShopByAdmin(shop.shopId)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded"
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

          {/* TAB 3: PROFILE & SHOP NAME CHANGE */}
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
                  দোকানের নাম (হোমপেজে যা শো করবে) <span className="text-rose-500">*</span>
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
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  💡 আপনি এইখানে যে নাম দিবেন, আপনার হোমপেজের প্রধান শিরোনাম ও হেডারে সেই নামটিই থাকবে।
                </span>
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

              {/* Database Download Card for All Users / Shop Owners */}
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
                <p className="text-[11px] text-slate-300">
                  {isSuperAdmin
                    ? 'সুপার এডমিন হিসেবে সম্পূর্ণ ভোটার তালিকা এক ক্লিকে ডাউনলোড করুন।'
                    : 'দোকানদার হিসেবে ডাটাবেজ ডাউনলোড করতে সুপার এডমিনের অনুমোদন প্রয়োজন হবে।'}
                </p>
                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={handleInitiateDatabaseDownload}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5"
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
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>দোকানের নাম ও তথ্য সংরক্ষণ করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="px-3 py-2.5 border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold rounded-xl transition flex items-center gap-1.5 text-xs shrink-0"
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
                  দোকানদার বা সাধারণ ব্যবহারকারী ডাউনলোড করতে চাইলে সুপার এডমিন এর পাসওয়ার্ড দিয়ে অনুমোদন নিশ্চিত করতে হবে।
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
                    placeholder="এডমিন পাসওয়ার্ড দিন (যেমন: admin123)"
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
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-amber-950"
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
          <span>ডিজিটাল কম্পিউটার শপ ক্লাউড ও লোকাল স্টোরেজ সিঙ্ক</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-md"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
