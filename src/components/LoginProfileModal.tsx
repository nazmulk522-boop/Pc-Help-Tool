import React, { useState, useEffect } from 'react';
import { useShopAuth, ADMIN_EMAIL } from '../context/ShopAuthContext';
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
  Sliders
} from 'lucide-react';

interface LoginProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'shop_login' | 'admin_login' | 'profile';
}

export const LoginProfileModal: React.FC<LoginProfileModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'shop_login',
}) => {
  const {
    currentProfile,
    isLoggedIn,
    isSuperAdmin,
    registeredShops,
    loginAsAdmin,
    loginAsShopOwner,
    updateShopProfile,
    logout,
    deleteShopByAdmin,
  } = useShopAuth();

  const [activeTab, setActiveTab] = useState<'shop_login' | 'admin_login' | 'profile'>(
    isLoggedIn ? 'profile' : initialTab
  );

  // Shop Owner Form State
  const [shopEmail, setShopEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [tagline, setTagline] = useState('');

  // Admin Form State
  const [adminEmailInput, setAdminEmailInput] = useState(ADMIN_EMAIL);
  const [adminPin, setAdminPin] = useState('');

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

  // Handle Admin Login
  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = loginAsAdmin(adminEmailInput, adminPin);
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
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white p-4.5 px-6 flex items-center justify-between">
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
                  'দোকান ও এডমিন লগইন পোর্টাল'
                )}
              </h2>
              <p className="text-xs text-slate-300">
                {isLoggedIn
                  ? `${currentProfile.ownerEmail} (${currentProfile.ownerName})`
                  : 'আপনার দোকানের নিজস্ব প্রোফাইল ও নাম কাস্টমাইজ করুন'}
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
                  <span>সকল শপ ও এডমিন প্যানেল ({registeredShops.length})</span>
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
                  আপনার জিমেইল দিয়ে লগইন করে একবার দোকানের নাম লিখে দিলেই পুরো সফটওয়্যারের হোমপেজ, ব্যানার ও ক্যাশ মেমোতে আপনার দোকানের নাম অটোমেটিক সেট হয়ে যাবে।
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
                    placeholder="example@gmail.com"
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
                      placeholder="e.g. বিসমিল্লাহ কম্পিউটার অ্যান্ড স্টুডিও"
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
                    মোবাইল নম্বর (যোগাযোগের জন্য)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="০১৭১২-৩৪৫৬৭৮"
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
                      placeholder="থানা রোড, সদর বাজার"
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
                  placeholder="যেমন: অনলাইন আবেদন, NID সংশোধন, ছবি প্রিন্ট ও ফটোকপি"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs"
              >
                <Store className="w-4 h-4" />
                <span>দোকান প্রোফাইলে লগইন করুন</span>
              </button>
            </form>
          )}

          {/* TAB 2: ADMIN LOGIN */}
          {activeTab === 'admin_login' && (
            <div className="space-y-4">
              {!isLoggedIn || !isSuperAdmin ? (
                <form onSubmit={handleAdminLoginSubmit} className="space-y-3.5">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-950 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-xs text-amber-900">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>মাস্টার এডমিন ভেরিফিকেশন:</span>
                    </p>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      এডমিন হিসেবে শুধুমাত্র <strong>{ADMIN_EMAIL}</strong> এর মালিক লগইন করতে পারবেন। অন্য কোনো জিমেইল থেকে এডমিন অ্যাক্সেস সম্ভব নয়।
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      এডমিন জিমেইল ঠিকানা <span className="text-amber-600">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={adminEmailInput}
                        onChange={(e) => setAdminEmailInput(e.target.value)}
                        placeholder={ADMIN_EMAIL}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-xs bg-white font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      এডমিন সিকিউরিটি পিন (ঐচ্ছিক)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        value={adminPin}
                        onChange={(e) => setAdminPin(e.target.value)}
                        placeholder="আপনার পিন বা পাসকোড দিন"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-xs bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>এডমিন হিসেবে প্রবেশ করুন ({ADMIN_EMAIL})</span>
                  </button>
                </form>
              ) : (
                /* Super Admin Dashboard View */
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-amber-950 text-xs">
                        👑 সুপার এডমিন সক্রিয়: {ADMIN_EMAIL}
                      </p>
                      <p className="text-[11px] text-amber-800">
                        মোট নিবন্ধিত দোকান: {registeredShops.length}টি
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-amber-200 text-amber-900 rounded font-mono font-bold text-[10px]">
                      MASTER ROLE
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 text-xs">
                      নিবন্ধিত সকল দোকানের তালিকা:
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {registeredShops.map((shop) => (
                        <div
                          key={shop.shopId}
                          className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{shop.shopName}</span>
                              {shop.ownerEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
                                <span className="text-[9px] bg-amber-200 text-amber-800 px-1.5 rounded">এডমিন</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {shop.ownerEmail} • {shop.phone || 'মোবাইল নেই'} • {shop.address || 'ঠিকানা নেই'}
                            </div>
                          </div>
                          {shop.ownerEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && (
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
                <div className="text-[11px] text-slate-600">
                  {editTagline || 'অনলাইন সেবা ও ডিজিটাল স্টুডিও'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono pt-1">
                  📞 {editPhone || '০১৭XX-XXXXXX'} | 📍 {editAddress || 'আপনার বাজার/এলাকা'}
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
