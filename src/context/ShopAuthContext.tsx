import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ShopProfile, UserRole } from '../types';

export const GUEST_PROFILE: ShopProfile = {
  shopId: 'guest_visitor',
  ownerEmail: '',
  ownerName: 'গেস্ট ভিজিটর',
  shopName: 'ডিজিটাল কম্পিউটার শপ ও স্টুডিও',
  tagline: 'কম্পিউটার সেবা, অনলাইন আবেদন, NID সংশোধন ও ডিজিটাল ফটো স্টুডিও',
  phone: '+8809649487206',
  address: 'সাবানা রোড, বনবাড়িয়া',
  role: 'guest',
};

interface RegisterData {
  email: string;
  password: string;
  ownerName: string;
  shopName: string;
  phone?: string;
  address?: string;
  tagline?: string;
}

interface ShopAuthContextType {
  currentProfile: ShopProfile;
  sessionToken: string | null;
  clientIp: string | null;
  isLoggedIn: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isLoadingAuth: boolean;
  ipMismatchError: string | null;
  registeredShops: ShopProfile[];
  
  // Auth Functions
  registerShopOwner: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  loginWithCredentials: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  verifyCurrentSession: () => Promise<boolean>;
  updateShopProfile: (updates: Partial<ShopProfile>) => Promise<boolean>;
  changeUserPassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  
  // Legacy Admin Support
  verifyAdminPassword: (pass: string) => boolean;
  loginAsAdmin: (email: string, password?: string) => Promise<{ success: boolean; message: string }>;
  loginAsShopOwner: (data: any) => Promise<{ success: boolean; message: string }>;
  changeAdminPassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  resetAdminPassword: () => { success: boolean; message: string };
  deleteShopByAdmin: (shopId: string) => void;
  clearIpMismatchError: () => void;
}

const ShopAuthContext = createContext<ShopAuthContextType | undefined>(undefined);

const STORAGE_TOKEN_KEY = 'shop_auth_tab_token_v5';
const STORAGE_PROFILE_KEY = 'shop_auth_tab_profile_v5';

export const ShopAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentProfile, setCurrentProfile] = useState<ShopProfile>(GUEST_PROFILE);
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(STORAGE_TOKEN_KEY) || null;
    }
    return null;
  });
  const [clientIp, setClientIp] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [ipMismatchError, setIpMismatchError] = useState<string | null>(null);
  const [registeredShops, setRegisteredShops] = useState<ShopProfile[]>([]);

  // 1. Verify Session for the current active tab
  const verifyCurrentSession = useCallback(async (): Promise<boolean> => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_TOKEN_KEY) : null;
    if (!token) {
      setCurrentProfile(GUEST_PROFILE);
      setIsLoadingAuth(false);
      return false;
    }

    try {
      const res = await fetch('/api/auth/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        throw new Error('Network error');
      }

      const json = await res.json();
      if (json.valid && json.profile) {
        setCurrentProfile(json.profile);
        setClientIp(json.clientIp || null);
        setIpMismatchError(null);
        setIsLoadingAuth(false);
        return true;
      } else {
        // Session invalid or expired in server
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(STORAGE_TOKEN_KEY);
          sessionStorage.removeItem(STORAGE_PROFILE_KEY);
        }
        setSessionToken(null);
        setCurrentProfile(GUEST_PROFILE);
        setClientIp(json.currentIp || null);
        setIsLoadingAuth(false);
        return false;
      }
    } catch (e) {
      console.warn('Session verification fallback:', e);
      setIsLoadingAuth(false);
      return false;
    }
  }, []);

  // Fetch client IP on mount & verify session
  useEffect(() => {
    fetch('/api/auth/client-ip')
      .then((r) => r.json())
      .then((data) => {
        if (data.ip) setClientIp(data.ip);
      })
      .catch(() => {});

    verifyCurrentSession();
  }, [verifyCurrentSession]);

  // Load registered shops for Super Admin
  const loadAdminUsers = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/auth/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setRegisteredShops(data.users);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (currentProfile.role === 'super_admin' && sessionToken) {
      loadAdminUsers(sessionToken);
    }
  }, [currentProfile.role, sessionToken, loadAdminUsers]);

  // 2. Register New Shop Owner (Email + Password + Shop details)
  const registerShopOwner = async (data: RegisterData) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success && json.token && json.profile) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(STORAGE_TOKEN_KEY, json.token);
          sessionStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(json.profile));
        }
        setSessionToken(json.token);
        setCurrentProfile(json.profile);
        setClientIp(json.clientIp);
        setIpMismatchError(null);
        return { success: true, message: json.message };
      } else {
        return { success: false, message: json.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।' };
      }
    } catch (err: any) {
      return { success: false, message: 'সার্ভার সংযোগ সমস্যা। আবার চেষ্টা করুন।' };
    }
  };

  // 3. Login with Registered Email & Password
  const loginWithCredentials = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.success && json.token && json.profile) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(STORAGE_TOKEN_KEY, json.token);
          sessionStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(json.profile));
        }
        setSessionToken(json.token);
        setCurrentProfile(json.profile);
        setClientIp(json.clientIp);
        setIpMismatchError(null);

        if (json.profile.role === 'super_admin') {
          loadAdminUsers(json.token);
        }

        return { success: true, message: json.message };
      } else {
        return { success: false, message: json.message || 'ভুল ইমেইল বা পাসওয়ার্ড।' };
      }
    } catch (err: any) {
      return { success: false, message: 'সার্ভারে সংযোগ করা সম্ভব হয়নি।' };
    }
  };

  // 4. Update Current Profile (Shop Name, Owner Name, etc.)
  const updateShopProfile = async (updates: Partial<ShopProfile>): Promise<boolean> => {
    if (!sessionToken) {
      // Local fallback
      setCurrentProfile((prev) => ({ ...prev, ...updates }));
      return true;
    }

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: sessionToken, updates }),
      });
      const json = await res.json();
      if (json.success && json.profile) {
        setCurrentProfile(json.profile);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(json.profile));
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  // 5. Change Password
  const changeUserPassword = async (oldPass: string, newPass: string) => {
    if (!sessionToken) {
      return { success: false, message: 'লগইন সেশন পাওয়া যায়নি।' };
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: sessionToken, oldPassword: oldPass, newPassword: newPass }),
      });
      const json = await res.json();
      return json;
    } catch (e) {
      return { success: false, message: 'সার্ভার ত্রুটি।' };
    }
  };

  // 6. Logout
  const logout = async () => {
    try {
      if (sessionToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: sessionToken }),
        });
      }
    } catch (e) {}

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_TOKEN_KEY);
      sessionStorage.removeItem(STORAGE_PROFILE_KEY);
    }
    setSessionToken(null);
    setCurrentProfile(GUEST_PROFILE);
    setIpMismatchError(null);
  };

  // Legacy Helpers
  const verifyAdminPassword = (enteredPass: string): boolean => {
    return enteredPass.trim() === 'admin123';
  };

  const loginAsAdmin = async (email: string, password?: string) => {
    return loginWithCredentials(email, password || 'admin123');
  };

  const loginAsShopOwner = async (data: any) => {
    if (data.password) {
      return loginWithCredentials(data.email, data.password);
    }
    return registerShopOwner({
      email: data.email,
      password: data.password || '123456',
      ownerName: data.ownerName || 'দোকান পরিচালক',
      shopName: data.shopName || 'আমার কম্পিউটার শপ',
      phone: data.phone,
      address: data.address,
      tagline: data.tagline,
    });
  };

  const changeAdminPassword = async (oldPass: string, newPass: string) => {
    return changeUserPassword(oldPass, newPass);
  };

  const resetAdminPassword = () => {
    return { success: true, message: 'এডমিন পাসওয়ার্ড রিসেট সক্রিয়।' };
  };

  const deleteShopByAdmin = (shopId: string) => {
    setRegisteredShops((prev) => prev.filter((s) => s.shopId !== shopId));
  };

  const clearIpMismatchError = () => {
    setIpMismatchError(null);
  };

  const isLoggedIn = currentProfile.role !== 'guest' && sessionToken !== null;
  const isSuperAdmin = isLoggedIn && currentProfile.role === 'super_admin';
  const isAuthenticated = isLoggedIn;

  return (
    <ShopAuthContext.Provider
      value={{
        currentProfile,
        sessionToken,
        clientIp,
        isLoggedIn,
        isAuthenticated,
        isSuperAdmin,
        isLoadingAuth,
        ipMismatchError,
        registeredShops,
        registerShopOwner,
        loginWithCredentials,
        verifyCurrentSession,
        updateShopProfile,
        changeUserPassword,
        logout,
        verifyAdminPassword,
        loginAsAdmin,
        loginAsShopOwner,
        changeAdminPassword,
        resetAdminPassword,
        deleteShopByAdmin,
        clearIpMismatchError,
      }}
    >
      {children}
    </ShopAuthContext.Provider>
  );
};

export const useShopAuth = () => {
  const context = useContext(ShopAuthContext);
  if (!context) {
    throw new Error('useShopAuth must be used within a ShopAuthProvider');
  }
  return context;
};
