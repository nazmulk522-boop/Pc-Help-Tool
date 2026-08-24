import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Database, 
  Trash2, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  FileSpreadsheet, 
  FolderArchive,
  Search,
  Check,
  X,
  FileText,
  FolderOpen,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { VoterRecord } from '../types';
import { BANGLADESH_DISTRICTS } from '../data/bangladeshSeats';
import { 
  getDatabaseStats, 
  DbStats, 
  bulkInsertVoters, 
  deleteVotersBySeat, 
  clearEntireDatabase, 
  getAllVotersBySeat,
  deduceDistrictAndDivision
} from '../utils/voterDb';
import { 
  parseConstituencyFolder, 
  parseConstituencyZip, 
  parsePdfVoterFile, 
  parseVotersFromExcelBuffer, 
  exportSeatToExcel,
  exportAllVotersToExcel,
  extractMetaFromPath
} from '../utils/pdfVoterParser';
import { useShopAuth } from '../context/ShopAuthContext';

interface AdminVoterDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatabaseUpdated?: () => void;
  onDataChanged?: () => void;
  onOpenLoginModal?: () => void;
}

export const AdminVoterDbModal: React.FC<AdminVoterDbModalProps> = ({
  isOpen,
  onClose,
  onDatabaseUpdated,
  onDataChanged,
  onOpenLoginModal,
}) => {
  const { currentProfile, isAuthenticated } = useShopAuth();
  const isSuperAdmin = isAuthenticated && currentProfile.role === 'super_admin';

  const notifyChange = () => {
    onDatabaseUpdated?.();
    onDataChanged?.();
  };

  const [activeTab, setActiveTab] = useState<'folder_upload' | 'zip_upload' | 'pdf_upload' | 'seats_list'>('folder_upload');

  // Stats state
  const [stats, setStats] = useState<DbStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [statSearchQuery, setStatSearchQuery] = useState<string>('');

  // Upload state & progress
  const [uploadStatus, setUploadStatus] = useState<{
    inProgress: boolean;
    message: string;
    percent: number;
    success?: boolean;
    error?: string;
    details?: string;
  }>({ inProgress: false, message: '', percent: 0 });

  // Fallback District & Seat inputs for manual PDF/Excel upload
  const [selectedDistrict, setSelectedDistrict] = useState<string>('সিরাজগঞ্জ');
  const [selectedSeat, setSelectedSeat] = useState<string>('সিরাজগঞ্জ-২');

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Load stats
  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await getDatabaseStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Folder Upload (webkitdirectory)
  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadStatus({
      inProgress: true,
      message: `ফোল্ডারের ফাইল স্ক্যান করা হচ্ছে (${files.length} টি ফাইল)...`,
      percent: 10,
    });

    try {
      const result = await parseConstituencyFolder(files, (msg, pct) => {
        setUploadStatus({
          inProgress: true,
          message: msg,
          percent: pct,
        });
      });

      setUploadStatus({
        inProgress: false,
        success: true,
        message: `সফল হয়েছে! মোট ${result.totalImported.toLocaleString('bn-BD')} টি ভোটার তথ্য সংরক্ষিত হয়েছে।`,
        percent: 100,
        details: `আসন: ${result.seats.join(', ') || 'আপলোডকৃত আসন'} (${result.filesCount} টি ফাইল প্রসেসড)`,
      });

      await loadStats();
      notifyChange();
    } catch (err: any) {
      console.error('Folder upload error:', err);
      setUploadStatus({
        inProgress: false,
        error: `ফোল্ডার প্রসেস করতে সমস্যা হয়েছে: ${err?.message || 'অজানা ত্রুটি'}`,
        message: '',
        percent: 0,
      });
    } finally {
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  // Handle ZIP Upload
  const handleZipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus({
      inProgress: true,
      message: `জিপ ফাইল (${file.name}) রিড করা হচ্ছে...`,
      percent: 10,
    });

    try {
      const buffer = await file.arrayBuffer();
      const result = await parseConstituencyZip(buffer, (msg, pct) => {
        setUploadStatus({
          inProgress: true,
          message: msg,
          percent: pct,
        });
      });

      setUploadStatus({
        inProgress: false,
        success: true,
        message: `সফল হয়েছে! মোট ${result.totalImported.toLocaleString('bn-BD')} টি ভোটার তথ্য যুক্ত হয়েছে।`,
        percent: 100,
        details: `আসন: ${result.seats.join(', ') || 'আপলোডকৃত আসন'} (মোট ${result.filesCount} টি ফাইল)`,
      });

      await loadStats();
      notifyChange();
    } catch (err: any) {
      console.error('ZIP upload error:', err);
      setUploadStatus({
        inProgress: false,
        error: `জিপ ফাইল প্রসেস করতে সমস্যা হয়েছে: ${err?.message || 'অজানা ত্রুটি'}`,
        message: '',
        percent: 0,
      });
    } finally {
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  // Handle Multi-PDF Upload
  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const total = files.length;
    setUploadStatus({
      inProgress: true,
      message: `${total} টি পিডিএফ ফাইল রিড করা হচ্ছে...`,
      percent: 15,
    });

    try {
      const allRecords: VoterRecord[] = [];
      for (let i = 0; i < total; i++) {
        const file = files[i];
        const pct = Math.round(20 + ((i + 1) / total) * 70);
        setUploadStatus({
          inProgress: true,
          message: `পিডিএফ প্রসেস হচ্ছে (${i + 1}/${total}): ${file.name}`,
          percent: pct,
        });

        const buffer = await file.arrayBuffer();
        const meta = extractMetaFromPath(file.name);
        const records = await parsePdfVoterFile(buffer, {
          fileName: file.name,
          defaultSeat: selectedSeat || meta.folderSeat || 'সিরাজগঞ্জ-২',
          defaultDistrict: selectedDistrict || meta.defaultDistrict || 'সিরাজগঞ্জ',
        });
        allRecords.push(...records);
      }

      if (allRecords.length > 0) {
        await bulkInsertVoters(allRecords);
      }

      setUploadStatus({
        inProgress: false,
        success: true,
        message: `সফল হয়েছে! ${allRecords.length.toLocaleString('bn-BD')} টি ভোটার তথ্য সংরক্ষিত হয়েছে।`,
        percent: 100,
        details: `নির্বাচিত আসন: ${selectedSeat}`,
      });

      await loadStats();
      notifyChange();
    } catch (err: any) {
      console.error('PDF upload error:', err);
      setUploadStatus({
        inProgress: false,
        error: `পিডিএফ রিড করতে ব্যর্থ: ${err?.message || 'অজানা ত্রুটি'}`,
        message: '',
        percent: 0,
      });
    } finally {
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  // Handle Excel Upload
  const handleExcelSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus({
      inProgress: true,
      message: `এক্সেল ফাইল (${file.name}) পার্স করা হচ্ছে...`,
      percent: 30,
    });

    try {
      const buffer = await file.arrayBuffer();
      const meta = extractMetaFromPath(file.name);
      const records = parseVotersFromExcelBuffer(buffer, {
        fileName: file.name,
        defaultSeat: selectedSeat || meta.folderSeat || 'সিরাজগঞ্জ-২',
        defaultDistrict: selectedDistrict || meta.defaultDistrict || 'সিরাজগঞ্জ',
      });

      if (records.length > 0) {
        await bulkInsertVoters(records);
      }

      setUploadStatus({
        inProgress: false,
        success: true,
        message: `সফল হয়েছে! এক্সেল থেকে ${records.length.toLocaleString('bn-BD')} টি ভোটার তথ্য যুক্ত হয়েছে।`,
        percent: 100,
        details: `আসন: ${selectedSeat}`,
      });

      await loadStats();
      notifyChange();
    } catch (err: any) {
      console.error('Excel upload error:', err);
      setUploadStatus({
        inProgress: false,
        error: `এক্সেল ফাইল পার্স করতে ব্যর্থ: ${err?.message || 'অজানা ত্রুটি'}`,
        message: '',
        percent: 0,
      });
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  // Export Seat to Excel
  const handleExportSeat = async (seatNo: string) => {
    try {
      const voters = await getAllVotersBySeat(seatNo);
      if (voters.length === 0) {
        alert('এই আসনের কোনো ডাটা পাওয়া যায়নি।');
        return;
      }
      exportSeatToExcel(seatNo, voters);
    } catch (err) {
      console.error('Export error:', err);
      alert('এক্সেল ফাইল তৈরিতে সমস্যা হয়েছে।');
    }
  };

  // Export Entire Database to Excel
  const handleExportEntireDb = async () => {
    try {
      const voters = await getAllVotersBySeat('all');
      if (voters.length === 0) {
        alert('ডাটাবেজে বর্তমানে কোনো ভোটার তথ্য নেই।');
        return;
      }
      exportAllVotersToExcel(voters);
    } catch (err) {
      console.error('Export full DB error:', err);
      alert('ডাটাবেজ এক্সেল ফাইলে এক্সপোর্ট করতে সমস্যা হয়েছে।');
    }
  };

  // Delete Seat
  const handleDeleteSeat = async (seatNo: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে "${seatNo}" আসনের সকল ভোটার ডাটা মুছে ফেলতে চান?`)) {
      return;
    }

    try {
      const deletedCount = await deleteVotersBySeat(seatNo);
      alert(`"${seatNo}" আসনের মোট ${deletedCount} টি রেকর্ড সফলভাবে ডিলিট করা হয়েছে।`);
      await loadStats();
      notifyChange();
    } catch (err) {
      console.error('Delete seat error:', err);
      alert('আসন ডিলিট করতে সমস্যা হয়েছে।');
    }
  };

  // Clear Entire Database
  const handleClearDatabase = async () => {
    if (!window.confirm('সতর্কতা! ডাটাবেজের সকল আসনের ভোটার ডাটা সম্পূর্ণ মুছে যাবে। আপনি কি নিশ্চিত?')) {
      return;
    }

    try {
      await clearEntireDatabase();
      alert('ডাটাবেজ সম্পূর্ণ খালি করা হয়েছে।');
      await loadStats();
      notifyChange();
    } catch (err) {
      console.error('Clear DB error:', err);
      alert('ডাটাবেজ ক্লিয়ার করতে সমস্যা হয়েছে।');
    }
  };

  // Available seats for selected district in manual selector
  const districtSeats = BANGLADESH_DISTRICTS.find((d) => d.nameBn === selectedDistrict)?.seats || [];

  if (!isSuperAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 text-center space-y-4 text-white shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold">অ্যাডমিন অ্যাক্সেস প্রয়োজন</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            ভোটার ডাটাবেজ ও আসন ব্যবস্থাপনা শুধুমাত্র সুপার অ্যাডমিন এর জন্য সংরক্ষিত। সাধারণ ব্যবহারকারী বা দোকানদার শুধুমাত্র তথ্য সার্চ করতে পারবেন।
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
            >
              বন্ধ করুন
            </button>
            {onOpenLoginModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLoginModal();
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
              >
                লগইন করুন
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                ভোটার ডাটাবেইজ ও আসন ম্যানেজার
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                  Super Admin
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                সিরাজগঞ্জ-২ সহ যেকোনো আসনের ফোল্ডার, জিপ ফাইল বা পিডিএফ ডাটাবেজে যুক্ত করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs font-semibold px-4 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('folder_upload')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'folder_upload'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>আসন ফোল্ডার আপলোড</span>
          </button>

          <button
            onClick={() => setActiveTab('zip_upload')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'zip_upload'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>জিপ ফাইল (.zip) আপলোড</span>
          </button>

          <button
            onClick={() => setActiveTab('pdf_upload')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pdf_upload'
                ? 'border-purple-500 text-purple-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>সরাসরি PDF / Excel</span>
          </button>

          <button
            onClick={() => setActiveTab('seats_list')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'seats_list'
                ? 'border-amber-500 text-amber-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>সংরক্ষিত আসনসমূহ ({stats?.seatStats.length || 0})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Upload Status Card if active */}
          {uploadStatus.inProgress && (
            <div className="p-4 bg-slate-950/80 border border-blue-500/40 rounded-xl space-y-3 animate-pulse">
              <div className="flex items-center justify-between text-xs text-blue-300 font-medium">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                  {uploadStatus.message}
                </span>
                <span className="font-mono font-bold text-white">{uploadStatus.percent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-linear-to-r from-blue-500 to-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadStatus.percent}%` }}
                />
              </div>
            </div>
          )}

          {uploadStatus.success && (
            <div className="p-4 bg-emerald-950/50 border border-emerald-500/40 rounded-xl flex items-start gap-3 text-xs text-emerald-200">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-emerald-300 text-sm">{uploadStatus.message}</p>
                {uploadStatus.details && <p className="text-emerald-200/80">{uploadStatus.details}</p>}
              </div>
            </div>
          )}

          {uploadStatus.error && (
            <div className="p-4 bg-rose-950/50 border border-rose-500/40 rounded-xl flex items-start gap-3 text-xs text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-300 text-sm">{uploadStatus.error}</p>
              </div>
            </div>
          )}

          {/* TAB 1: FOLDER UPLOAD */}
          {activeTab === 'folder_upload' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs space-y-2 text-slate-300">
                <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                  <FolderOpen className="w-4 h-4" />
                  <span>আসন ফোল্ডার অটো-রিডার (যেমন: সিরাজগঞ্জ-২)</span>
                </div>
                <p>
                  আপনার কম্পিউটারে থাকা যেকোনো সংসদীয় আসনের মূল ফোল্ডার সিলেক্ট করুন। ফোল্ডারের ভেতরে ইউনিয়ন ভিত্তিক সাব-ফোল্ডার এবং গ্রামের ছেলে/মেয়েদের পিডিএফ স্বয়ংক্রিয়ভাবে পড়ে ডাটাবেজে সংরক্ষণ করা হবে।
                </p>
                <div className="text-[11px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded border border-slate-800/60">
                  📁 সিরাজগঞ্জ-২/<br/>
                  &nbsp;&nbsp;└── 📁 সয়দাবাদ ইউনিয়ন/<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── 📄 কালিয়া_হরিপুর_মহিলা.pdf<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📄 কালিয়া_হরিপুর_পুরুষ.pdf
                </div>
              </div>

              {/* Hidden directory file input */}
              <input
                type="file"
                ref={folderInputRef}
                onChange={handleFolderSelect}
                className="hidden"
                // @ts-ignore
                webkitdirectory="true"
                directory="true"
                multiple
              />

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/10 hover:bg-emerald-950/20 rounded-2xl p-8 text-center transition cursor-pointer"
                onClick={() => folderInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-lg">
                  <FolderOpen className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-white">আসন ফোল্ডার নির্বাচন করুন</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  ক্লিক করে আপনার আসনের সম্পূর্ণ ফোল্ডারটি সিলেক্ট করুন (যেমন: সিরাজগঞ্জ-২)
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg transition flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  ফোল্ডার সিলেক্ট ও আপলোড করুন
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ZIP ARCHIVE UPLOAD */}
          {activeTab === 'zip_upload' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs space-y-2 text-slate-300">
                <div className="flex items-center gap-2 font-bold text-blue-400 text-sm">
                  <FolderArchive className="w-4 h-4" />
                  <span>আসন জিপ (.ZIP) ফাইল আপলোড</span>
                </div>
                <p>
                  আপনার কাছে যদি প্রতি আসনের জিপ ফাইল থাকে (যেমন: <code className="text-blue-300 font-mono">সিরাজগঞ্জ-২.zip</code>), তবে জিপ ফাইলটি সরাসরি এখানে আপলোড করুন। ব্রাউজারেই জিপ আনপ্যাক হয়ে সব পিডিএফ রিড হয়ে যাবে।
                </p>
              </div>

              <input
                type="file"
                ref={zipInputRef}
                onChange={handleZipSelect}
                accept=".zip,application/zip"
                className="hidden"
              />

              <div 
                className="flex flex-col items-center justify-center border-2 border-dashed border-blue-500/30 hover:border-blue-500/60 bg-blue-950/10 hover:bg-blue-950/20 rounded-2xl p-8 text-center transition cursor-pointer"
                onClick={() => zipInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 shadow-lg">
                  <FolderArchive className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-white">আসন জিপ ফাইল সিলেক্ট করুন</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  .zip আর্কাইভ ড্রপ করুন অথবা ব্রাউজ করে ফাইল সিলেক্ট করুন
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg transition flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  জিপ ফাইল আপলোড করুন
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DIRECT PDF / EXCEL */}
          {activeTab === 'pdf_upload' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4 text-xs">
                <div className="flex items-center gap-2 font-bold text-purple-400 text-sm">
                  <FileText className="w-4 h-4" />
                  <span>আসন নির্ধারণ ও সরাসরি PDF / Excel ফাইল আপলোড</span>
                </div>

                {/* District and Seat Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">জেলা নির্বাচন করুন</label>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => {
                        const dist = e.target.value;
                        setSelectedDistrict(dist);
                        const match = BANGLADESH_DISTRICTS.find((d) => d.nameBn === dist);
                        if (match && match.seats.length > 0) {
                          setSelectedSeat(match.seats[0]);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      {BANGLADESH_DISTRICTS.map((d) => (
                        <option key={d.nameBn} value={d.nameBn}>
                          {d.nameBn} ({d.nameEn})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">সংসদীয় আসন</label>
                    <select
                      value={selectedSeat}
                      onChange={(e) => setSelectedSeat(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      {districtSeats.map((seat) => (
                        <option key={seat} value={seat}>
                          {seat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Upload buttons for PDF & Excel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="file"
                  ref={pdfInputRef}
                  onChange={handlePdfSelect}
                  accept=".pdf,application/pdf"
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  className="p-5 rounded-xl border border-purple-500/30 hover:border-purple-500/60 bg-purple-950/20 hover:bg-purple-950/30 text-left transition flex items-center gap-3"
                >
                  <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">এক বা একাধিক PDF আপলোড</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">ভোটার তালিকা PDF সরাসরি রিড করুন</div>
                  </div>
                </button>

                <input
                  type="file"
                  ref={excelInputRef}
                  onChange={handleExcelSelect}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => excelInputRef.current?.click()}
                  className="p-5 rounded-xl border border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/20 hover:bg-emerald-950/30 text-left transition flex items-center gap-3"
                >
                  <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">এক্সেল (.xlsx) বা CSV আপলোড</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">পূর্বের সাজানো ডাটা শিট ইমপোর্ট করুন</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SEATS LIST & MANAGEMENT */}
          {activeTab === 'seats_list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="আসন বা জেলা খুঁজুন (যেমন: সিরাজগঞ্জ)..."
                    value={statSearchQuery}
                    onChange={(e) => setStatSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  onClick={loadStats}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="রিফ্রেশ"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Total Summary */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-center">
                <div>
                  <div className="text-sm font-bold text-white font-mono">
                    {stats?.totalVoters ? stats.totalVoters.toLocaleString('bn-BD') : '০'}
                  </div>
                  <div className="text-[10px] text-slate-400">মোট ভোটার ডাটা</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    {stats?.totalSeats || 0}
                  </div>
                  <div className="text-[10px] text-slate-400">যুক্তকৃত আসন</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-blue-400 font-mono">
                    {stats?.totalDistricts || 0}
                  </div>
                  <div className="text-[10px] text-slate-400">জেলা সংখ্যা</div>
                </div>
              </div>

              {/* Full DB Excel Download Button */}
              {stats?.totalVoters ? (
                <button
                  type="button"
                  onClick={handleExportEntireDb}
                  className="w-full py-2.5 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>সম্পূর্ণ ডাটাবেইজ Excel (.xlsx) ফাইলে ডাউনলোড করুন ({stats.totalVoters.toLocaleString('bn-BD')} ভোটার)</span>
                  <Download className="w-3.5 h-3.5 ml-auto text-emerald-400" />
                </button>
              ) : null}

              {/* Seats list table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40 divide-y divide-slate-800 max-h-64 overflow-y-auto">
                {stats?.seatStats && stats.seatStats.length > 0 ? (
                  stats.seatStats
                    .filter((s) => !statSearchQuery || s.seatNo.includes(statSearchQuery) || s.district.includes(statSearchQuery))
                    .map((seat) => (
                      <div key={seat.seatNo} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-900/60 transition text-xs">
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{seat.seatNo}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({seat.district})</span>
                          </div>
                          <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                            {seat.count.toLocaleString('bn-BD')} জন ভোটার সংরক্ষিত
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleExportSeat(seat.seatNo)}
                            className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 rounded-lg text-[11px] transition flex items-center gap-1"
                            title="এই আসনের এক্সেল ফাইল ডাউনলোড করুন"
                          >
                            <Download className="w-3 h-3" />
                            <span>Excel</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSeat(seat.seatNo)}
                            className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-lg transition"
                            title="আসন ডিলিট করুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                    <Database className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-slate-300 font-medium">কোনো আসন এখনও আপলোড করা হয়নি</p>
                    <p className="text-[11px]">উপরে ফোল্ডার বা জিপ ফাইল আপলোড ট্যাবে গিয়ে আপনার আসনের ডাটা আপলোড করুন।</p>
                  </div>
                )}
              </div>

              {/* Danger Zone: Clear Entire DB */}
              {stats?.totalVoters ? (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleClearDatabase}
                    className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900 text-rose-400 hover:text-rose-200 border border-rose-900 rounded-lg text-xs transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>সকল ডাটাবেজ ক্লিয়ার করুন</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>সম্পূর্ণ প্রাইভেট ও লোকাল ব্রাউজার স্টোরেজ (IndexedDB)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition font-medium"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
