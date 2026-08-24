import React, { useState } from 'react';
import { ActiveTool, PrintItem } from './types';
import { ShopAuthProvider, useShopAuth } from './context/ShopAuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { VoterInfoSearch } from './components/VoterInfoSearch';
import { NidCropJoin } from './components/NidCropJoin';
import { BackgroundRemover } from './components/BackgroundRemover';
import { JointPhotoMaker } from './components/JointPhotoMaker';
import { PhotoPrintSheet } from './components/PhotoPrintSheet';
import { JobApplicationResizer } from './components/JobApplicationResizer';
import { QuickReceiptAndDocs } from './components/QuickReceiptAndDocs';
import { LoginProfileModal } from './components/LoginProfileModal';
import { AdminVoterDbModal } from './components/AdminVoterDbModal';
import { Zap, X } from 'lucide-react';

function MainApp() {
  const [activeTool, setActiveTool] = useState<ActiveTool>('home');
  const [printSheetItems, setPrintSheetItems] = useState<PrintItem[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [taskKey, setTaskKey] = useState(0);

  // Login / Profile Modal State
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState<'shop_login' | 'admin_login' | 'profile'>('shop_login');

  // Voter Database Upload Admin Modal State
  const [voterDbModalOpen, setVoterDbModalOpen] = useState(false);

  const { currentProfile, isSuperAdmin } = useShopAuth();

  const handleOpenLoginModal = (tab: 'shop_login' | 'admin_login' | 'profile' = 'shop_login') => {
    setLoginModalTab(tab);
    setLoginModalOpen(true);
  };

  const handleOpenVoterDbModal = () => {
    if (!isSuperAdmin) {
      // If not logged in as admin, prompt admin login first
      handleOpenLoginModal('admin_login');
      return;
    }
    setVoterDbModalOpen(true);
  };

  // Callback when a tool sends an edited image directly to the Print Sheet tool
  const handleSendToPrintSheet = (imageUrl: string, type: 'passport' | 'stamp' | 'joint') => {
    const newItem: PrintItem = {
      id: Date.now().toString(),
      type: type === 'joint' ? 'joint' : type === 'stamp' ? 'stamp' : 'passport',
      imageUrl,
      widthMm: type === 'stamp' ? 20 : type === 'joint' ? 50 : 40,
      heightMm: type === 'stamp' ? 25 : type === 'joint' ? 40 : 50,
      copies: type === 'stamp' ? 4 : 4,
      hasBorder: true,
    };
    setPrintSheetItems([newItem]);
    setActiveTool('print_sheet');
  };

  const handleResetTask = () => {
    setTaskKey((prev) => prev + 1);
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Desktop Sticky Sidebar */}
      <div className="hidden md:block">
        <Sidebar 
          activeTool={activeTool} 
          setActiveTool={setActiveTool} 
          onOpenLoginModal={handleOpenLoginModal}
          onOpenVoterDbModal={handleOpenVoterDbModal}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-[80vw] bg-slate-900 text-white z-10 shadow-2xl">
            <div className="absolute top-3 right-3 z-20">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                aria-label="Close Navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar
              activeTool={activeTool}
              setActiveTool={(tool) => {
                setActiveTool(tool);
                setMobileSidebarOpen(false);
              }}
              onOpenLoginModal={(tab) => {
                setMobileSidebarOpen(false);
                handleOpenLoginModal(tab);
              }}
              onOpenVoterDbModal={() => {
                setMobileSidebarOpen(false);
                handleOpenVoterDbModal();
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area with Header */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* High Density Top Header */}
        <Header
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onResetTask={handleResetTask}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenLoginModal={handleOpenLoginModal}
          onOpenVoterDbModal={handleOpenVoterDbModal}
        />

        {/* Dynamic Tool Content */}
        <main key={taskKey} className="flex-1 p-3.5 sm:p-5 max-w-[1400px] w-full mx-auto space-y-4">
          {activeTool === 'home' && (
            <HomePage 
              onSelectTool={(tool) => setActiveTool(tool)} 
              onOpenLoginModal={handleOpenLoginModal}
              onOpenVoterDbModal={handleOpenVoterDbModal}
            />
          )}
          {activeTool === 'voter_search' && (
            <VoterInfoSearch onOpenLoginModal={handleOpenLoginModal} />
          )}
          {activeTool === 'nid' && <NidCropJoin />}
          {activeTool === 'bg_remover' && (
            <BackgroundRemover onSendToPrintSheet={handleSendToPrintSheet} />
          )}
          {activeTool === 'joint_photo' && (
            <JointPhotoMaker onSendToPrintSheet={handleSendToPrintSheet} />
          )}
          {activeTool === 'print_sheet' && (
            <PhotoPrintSheet initialItems={printSheetItems} />
          )}
          {activeTool === 'job_resizer' && <JobApplicationResizer />}
          {activeTool === 'quick_doc' && <QuickReceiptAndDocs />}
        </main>

        {/* High Density Footer Status */}
        <footer className="bg-white border-t border-slate-200 py-2.5 px-4 text-xs text-slate-500">
          <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-800 font-semibold">{currentProfile.shopName}:</span>
              <span className="hidden sm:inline text-slate-600">
                ভোটার তথ্য যাচাই, এনআইডি ক্রপ-জয়েন, পাসপোর্ট ব্যাকগ্রাউন্ড কালার, ৪R শিট প্রিন্ট ও সরকারি জব রিসাইজার।
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-slate-600">Ctrl + P (প্রিন্ট শর্টকাট)</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-700 font-bold">৩০০ DPI আল্ট্রা-শার্প রেডি</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Login & Shop Profile Modal */}
      <LoginProfileModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        initialTab={loginModalTab}
        onOpenVoterDbModal={handleOpenVoterDbModal}
      />

      {/* Global Super Admin Voter Database Upload Modal */}
      <AdminVoterDbModal
        isOpen={voterDbModalOpen}
        onClose={() => setVoterDbModalOpen(false)}
        onDatabaseUpdated={() => {
          // If needed, refresh or force re-render
          setTaskKey((prev) => prev + 1);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ShopAuthProvider>
      <MainApp />
    </ShopAuthProvider>
  );
}
