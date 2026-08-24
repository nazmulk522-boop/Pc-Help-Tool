import React, { createContext, useContext, useState, useEffect } from 'react';
import { ShopProfile, UserRole } from '../types';

export const DEFAULT_SHOP_PROFILE: ShopProfile = {
  shopId: 'default_shop',
  ownerEmail: 'nazmulk522@gmail.com',
  ownerName: 'সুপার এডমিন',
  shopName: 'ডিজিটাল কম্পিউটার শপ ও স্টুডিও',
  tagline: 'কম্পিউটার সেবা, অনলাইন আবেদন, NID সংশোধন ও ডিজিটাল ফটো স্টুডিও',
  phone: '+8809649487206',
  address: 'সাবানা রোড, বনবাড়িয়া',
  role: 'super_admin',
};

interface ShopAuthContextType {
  currentProfile: ShopProfile;
  isLoggedIn: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  registeredShops: ShopProfile[];
  adminPassword?: string;
  verifyAdminPassword: (pass: string) => boolean;
  loginAsAdmin: (email: string, password?: string) => { success: boolean; message: string };
  changeAdminPassword: (oldPass: string, newPass: string) => { success: boolean; message: string };
  resetAdminPassword: () => { success: boolean; message: string };
  loginAsShopOwner: (data: {
    email: string;
    ownerName: string;
    shopName: string;
    phone?: string;
    address?: string;
    tagline?: string;
  }) => { success: boolean; message: string };
  updateShopProfile: (updates: Partial<ShopProfile>) => void;
  logout: () => void;
  deleteShopByAdmin: (shopId: string) => void;
}

const ShopAuthContext = createContext<ShopAuthContextType | undefined>(undefined);

const STORAGE_KEY_CURRENT_USER = 'shop_auth_current_user_v3';
const STORAGE_KEY_ALL_SHOPS = 'shop_auth_all_shops_v3';
const STORAGE_KEY_ADMIN_PASS = 'shop_admin_password_v3';
const DEFAULT_ADMIN_PASS = 'admin123';

export const ShopAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentProfile, setCurrentProfile] = useState<ShopProfile>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error('Error loading saved profile:', e);
      }
    }
    return DEFAULT_SHOP_PROFILE;
  });

  const [registeredShops, setRegisteredShops] = useState<ShopProfile[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_ALL_SHOPS);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error('Error loading registered shops:', e);
      }
    }
    return [];
  });

  const [adminPassword, setAdminPassword] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedPass = localStorage.getItem(STORAGE_KEY_ADMIN_PASS);
      if (savedPass) return savedPass;
    }
    return DEFAULT_ADMIN_PASS;
  });

  // Save current profile to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentProfile));
      } catch (e) {
        console.error('Error saving current profile:', e);
      }
    }
  }, [currentProfile]);

  // Save registered shops to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_ALL_SHOPS, JSON.stringify(registeredShops));
      } catch (e) {
        console.error('Error saving registered shops:', e);
      }
    }
  }, [registeredShops]);

  // Save admin password
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_ADMIN_PASS, adminPassword);
      } catch (e) {
        console.error('Error saving admin password:', e);
      }
    }
  }, [adminPassword]);

  const isLoggedIn = currentProfile.role !== 'guest';
  const isSuperAdmin =
    currentProfile.role === 'super_admin' ||
    currentProfile.ownerEmail?.toLowerCase() === 'nazmulk522@gmail.com' ||
    (typeof window !== 'undefined' && localStorage.getItem('shop_admin_verified') === 'true');
  const isAuthenticated = isLoggedIn;

  const verifyAdminPassword = (enteredPass: string): boolean => {
    if (!enteredPass) return false;
    return enteredPass.trim() === adminPassword.trim();
  };

  // Admin Login: Manual email and password entry
  const loginAsAdmin = (email: string, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return {
        success: false,
        message: 'সঠিক এডমিন ইমেইল বা জিমেইল ঠিকানা লিখুন।',
      };
    }

    if (!password || password.trim() !== adminPassword.trim()) {
      return {
        success: false,
        message: 'ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।',
      };
    }

    const existingAdminShop = registeredShops.find(
      (s) => s.ownerEmail.toLowerCase() === cleanEmail
    );

    const adminProfile: ShopProfile = existingAdminShop || {
      shopId: 'admin_' + Date.now(),
      ownerEmail: cleanEmail,
      ownerName: 'সুপার এডমিন',
      shopName: currentProfile.shopName || 'ডিজিটাল কম্পিউটার শপ ও স্টুডিও',
      tagline: currentProfile.tagline || 'অনলাইন সেবা ও ডিজিটাল স্টুডিও',
      phone: currentProfile.phone || '+8809649487206',
      address: currentProfile.address || 'সাবানা রোড, বনবাড়িয়া',
      role: 'super_admin',
      updatedAt: new Date().toISOString(),
    };

    adminProfile.role = 'super_admin';
    setCurrentProfile(adminProfile);

    // Update in all shops list
    setRegisteredShops((prev) => {
      const filtered = prev.filter((s) => s.ownerEmail.toLowerCase() !== cleanEmail);
      return [adminProfile, ...filtered];
    });

    return {
      success: true,
      message: `স্বাগতম! (${cleanEmail}) সফলভাবে এডমিন হিসেবে লগইন হয়েছেন।`,
    };
  };

  // Change Admin Password
  const changeAdminPassword = (oldPass: string, newPass: string) => {
    if (oldPass.trim() !== adminPassword.trim()) {
      return { success: false, message: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।' };
    }
    if (!newPass || newPass.trim().length < 4) {
      return { success: false, message: 'নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' };
    }
    setAdminPassword(newPass.trim());
    return { success: true, message: 'এডমিন পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!' };
  };

  // Reset Admin Password back to default
  const resetAdminPassword = () => {
    setAdminPassword(DEFAULT_ADMIN_PASS);
    return { success: true, message: `পাসওয়ার্ড রিসেট হয়ে ডিফল্ট (${DEFAULT_ADMIN_PASS}) সেট করা হয়েছে।` };
  };

  // Shop Owner Login: Any shop owner can register/login with Gmail
  const loginAsShopOwner = (data: {
    email: string;
    ownerName: string;
    shopName: string;
    phone?: string;
    address?: string;
    tagline?: string;
  }) => {
    const cleanEmail = data.email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: 'সঠিক জিমেইল বা ইমেইল ঠিকানা দিন।' };
    }

    // Shop owner role
    const role: UserRole = 'shop_owner';

    // Find existing shop or create new
    const existing = registeredShops.find((s) => s.ownerEmail.toLowerCase() === cleanEmail);

    const newShopProfile: ShopProfile = {
      shopId: existing ? existing.shopId : 'shop_' + Date.now(),
      ownerEmail: cleanEmail,
      ownerName: data.ownerName.trim() || existing?.ownerName || 'দোকানের মালিক',
      shopName: data.shopName.trim() || existing?.shopName || 'আমার কম্পিউটার শপ',
      tagline:
        data.tagline?.trim() ||
        existing?.tagline ||
        'অনলাইন সেবা, ফটোকপি ও ডিজিটাল স্টুডিও',
      phone: data.phone?.trim() || existing?.phone || '',
      address: data.address?.trim() || existing?.address || '',
      role,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCurrentProfile(newShopProfile);

    // Save to list of shops
    setRegisteredShops((prev) => {
      const filtered = prev.filter((s) => s.ownerEmail.toLowerCase() !== cleanEmail);
      return [newShopProfile, ...filtered];
    });

    return {
      success: true,
      message: `স্বাগতম! "${newShopProfile.shopName}" এর প্রোফাইল সক্রিয় হয়েছে।`,
    };
  };

  // Update current shop profile (changes shop name, owner name, etc. and reflects everywhere)
  const updateShopProfile = (updates: Partial<ShopProfile>) => {
    setCurrentProfile((prev) => {
      const updated: ShopProfile = {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Also update in registered list if logged in
      if (prev.role !== 'guest') {
        setRegisteredShops((all) =>
          all.map((s) => (s.shopId === updated.shopId ? updated : s))
        );
      }

      return updated;
    });
  };

  // Logout
  const logout = () => {
    setCurrentProfile(DEFAULT_SHOP_PROFILE);
  };

  // Admin delete shop
  const deleteShopByAdmin = (shopId: string) => {
    if (!isSuperAdmin) return;
    setRegisteredShops((prev) => prev.filter((s) => s.shopId !== shopId));
  };

  return (
    <ShopAuthContext.Provider
      value={{
        currentProfile,
        isLoggedIn,
        isAuthenticated,
        isSuperAdmin,
        registeredShops,
        adminPassword,
        verifyAdminPassword,
        loginAsAdmin,
        changeAdminPassword,
        resetAdminPassword,
        loginAsShopOwner,
        updateShopProfile,
        logout,
        deleteShopByAdmin,
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
