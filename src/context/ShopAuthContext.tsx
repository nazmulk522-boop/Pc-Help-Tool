import React, { createContext, useContext, useState, useEffect } from 'react';
import { ShopProfile, UserRole } from '../types';

export const ADMIN_EMAIL = 'nazmulk522@gmail.com';

export const DEFAULT_SHOP_PROFILE: ShopProfile = {
  shopId: 'default_shop',
  ownerEmail: 'guest@computer-shop.local',
  ownerName: 'মালিক / অপারেটর',
  shopName: 'ডিজিটাল কম্পিউটার শপ ও স্টুডিও',
  tagline: 'কম্পিউটার সেবা, অনলাইন আবেদন, NID সংশোধন ও ডিজিটাল ফটো স্টুডিও',
  phone: '০১৭১২-৩৪৫৬৭৮',
  address: 'থানা রোড, সদর বাজার',
  role: 'guest',
};

interface ShopAuthContextType {
  currentProfile: ShopProfile;
  isLoggedIn: boolean;
  isSuperAdmin: boolean;
  registeredShops: ShopProfile[];
  loginAsAdmin: (email: string, pinOrPass?: string) => { success: boolean; message: string };
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

const STORAGE_KEY_CURRENT_USER = 'shop_auth_current_user_v2';
const STORAGE_KEY_ALL_SHOPS = 'shop_auth_all_shops_v2';

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
    return [
      {
        shopId: 'admin_primary_shop',
        ownerEmail: ADMIN_EMAIL,
        ownerName: 'নাজমুল হাসান (সুপার এডমিন)',
        shopName: 'ডিজিটাল কম্পিউটার শপ ও স্টুডিও',
        tagline: 'অনলাইন আবেদন, ভোটার সেবা ও হাই-কোয়ালিটি ফটো প্রিন্ট',
        phone: '০১৭০০-০০০০০০',
        address: 'ঢাকা, বাংলাদেশ',
        role: 'super_admin',
        createdAt: new Date().toISOString(),
      },
    ];
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

  const isLoggedIn = currentProfile.role !== 'guest';
  const isSuperAdmin =
    currentProfile.ownerEmail.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim() ||
    currentProfile.role === 'super_admin';

  // Admin Login: Only for nazmulk522@gmail.com
  const loginAsAdmin = (email: string, pinOrPass?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail !== ADMIN_EMAIL.toLowerCase()) {
      return {
        success: false,
        message: `অনুমতি নেই! এডমিন হিসেবে শুধুমাত্র (${ADMIN_EMAIL}) লগইন করতে পারবেন। সাধারণ দোকানদার হিসেবে "দোকান লগইন" ট্যাব ব্যবহার করুন।`,
      };
    }

    const existingAdminShop = registeredShops.find(
      (s) => s.ownerEmail.toLowerCase() === cleanEmail
    );

    const adminProfile: ShopProfile = existingAdminShop || {
      shopId: 'admin_primary_shop',
      ownerEmail: ADMIN_EMAIL,
      ownerName: 'সুপার এডমিন (নাজমুল)',
      shopName: currentProfile.shopName || 'ডিজিটাল কম্পিউটার শপ ও স্টুডিও (এডমিন হাব)',
      tagline: 'মাস্টার এডমিন ও কম্পিউটার সেবা ম্যানেজমেন্ট',
      phone: currentProfile.phone || '০১৭১২-৩৪৫৬৭৮',
      address: currentProfile.address || 'ঢাকা, বাংলাদেশ',
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
      message: `স্বাগতম এডমিন! (${ADMIN_EMAIL}) সফলভাবে লগইন হয়েছেন।`,
    };
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

    // Check if this is actually the admin email trying to log in as shop
    const role: UserRole =
      cleanEmail === ADMIN_EMAIL.toLowerCase() ? 'super_admin' : 'shop_owner';

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
        isSuperAdmin,
        registeredShops,
        loginAsAdmin,
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
