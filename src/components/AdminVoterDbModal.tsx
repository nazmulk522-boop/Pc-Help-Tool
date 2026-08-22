import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  Upload, 
  Database, 
  UserPlus, 
  Key, 
  Trash2, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  FileSpreadsheet, 
  FileCode, 
  FolderArchive,
  Search,
  Check,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { VoterRecord } from '../types';
import { BANGLADESH_DISTRICTS, BANGLADESH_DIVISIONS } from '../data/bangladeshSeats';
import { 
  verifyAdminPin, 
  setAdminPin, 
  getDatabaseStats, 
  DbStats, 
  bulkInsertVoters, 
  deleteVotersBySeat, 
  clearEntireDatabase, 
  restoreDefaultSampleRecords, 
  parseVotersFromCsv, 
  parseVotersFromJson, 
  parseVotersFromZip, 
  saveSingleVoter,
  deduceDistrictAndDivision
} from '../utils/voterDb';

interface AdminVoterDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatabaseUpdated?: () => void;
  onDataChanged?: () => void;
}

export const AdminVoterDbModal: React.FC<AdminVoterDbModalProps> = ({
  isOpen,
  onClose,
  onDatabaseUpdated,
  onDataChanged,
}) => {
  const notifyChange = () => {
    onDatabaseUpdated?.();
    onDataChanged?.();
  };
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'upload' | 'stats' | 'manual' | 'pin'>('upload');

  // Stats state
  const [stats, setStats] = useState<DbStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [statSearchQuery, setStatSearchQuery] = useState<string>('');

  // Upload state
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ঢাকা');
  const [selectedSeat, setSelectedSeat] = useState<string>('ঢাকা-১০');
  const [autoDetectSeat, setAutoDetectSeat] = useState<boolean>(true);
  const [uploadStatus, setUploadStatus] = useState<{
    inProgress: boolean;
    message: string;
    percent: number;
    success?: boolean;
    error?: string;
  }>({ inProgress: false, message: '', percent: 0 });

  // Manual Entry Form state
  const [manualForm, setManualForm] = useState<Partial<VoterRecord>>({
    nameBn: '',
    nameEn: '',
    fatherName: '',
    motherName: '',
    spouseName: '',
    dob: '',
    voterNo: '',
    nidNo: '',
    formNo: '',
    gender: 'male',
    bloodGroup: 'B+',
    district: 'ঢাকা',
    seatNo: 'ঢাকা-১০',
    upazilaThana: 'ধানমন্ডি',
    unionWard: 'ওয়ার্ড নং ১৫',
    villageArea: '',
    pollingCenter: '',
    voterAreaCode: '',
    serialNo: '',
  });
  const [manualSaveSuccess, setManualSaveSuccess] = useState<string>('');

  // Change PIN state
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ text: string; isError?: boolean }>({ text: '' });
  const [actionNotice, setActionNotice] = useState<string>('');

  // Load stats on auth
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
    if (isAuthenticated) {
      loadStats();
    }
  }, [isAuthenticated]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPin(enteredPin)) {
      setIsAuthenticated(true);
      setPinError('');
    } else {
      setPinError('ভুল পিন কোড! সঠিক এডমিন পিন দিন। (ডিফল্ট পিন: 1234)');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setEnteredPin('');
  };

  // Upload handler for ZIP, CSV, JSON
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus({ inProgress: true, message: 'ফাইল রিড করা হচ্ছে...', percent: 10 });

    try {
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.zip')) {
        // Direct ZIP Upload
        setUploadStatus({ inProgress: true, message: 'জিপ আর্কাইভ বিশ্লেষণ ও আনপ্যাকিং শুরু হয়েছে...', percent: 20 });
        const arrayBuf = await file.arrayBuffer();
        const result = await parseVotersFromZip(arrayBuf, (msg, pct) => {
          setUploadStatus({ inProgress: true, message: msg, percent: pct });
        });

        setUploadStatus({
          inProgress: false,
          percent: 100,
          success: true,
          message: `সফলভাবে ${result.filesCount}টি ফাইল থেকে মোট ${result.totalImported} জন ভোটারের তথ্য ডাটাবেজে যুক্ত হয়েছে! (আসন: ${result.seats.join(', ') || selectedSeat})`,
        });
      } else if (fileName.endsWith('.json')) {
        // JSON file
        const text = await file.text();
        const json = JSON.parse(text);
        const records = parseVotersFromJson(
          json,
          selectedDistrict,
          autoDetectSeat ? undefined : selectedSeat
        );
        if (records.length === 0) {
          throw new Error('জেসন ফাইলে কোনো সঠিক ভোটার তথ্য পাওয়া যায়নি।');
        }
        await bulkInsertVoters(records);
        setUploadStatus({
          inProgress: false,
          percent: 100,
          success: true,
          message: `সফলভাবে ${records.length} জন ভোটারের তথ্য যুক্ত হয়েছে!`,
        });
      } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileName.endsWith('.tsv')) {
        // CSV / Text file
        const text = await file.text();
        const records = parseVotersFromCsv(
          text,
          selectedDistrict,
          autoDetectSeat ? undefined : selectedSeat
        );
        if (records.length === 0) {
          throw new Error('সিএসভি ফাইলে কোনো সঠিক রেকর্ড পাওয়া যায়নি।');
        }
        await bulkInsertVoters(records);
        setUploadStatus({
          inProgress: false,
          percent: 100,
          success: true,
          message: `সফলভাবে ${records.length} জন ভোটারের তথ্য যুক্ত হয়েছে!`,
        });
      } else {
        throw new Error('অসমর্থিত ফরম্যাট! শুধুমাত্র .zip, .csv, .json, .tsv বা .txt ফাইল আপলোড করুন।');
      }

      await loadStats();
      notifyChange();
    } catch (err: any) {
      console.error('File import error:', err);
      setUploadStatus({
        inProgress: false,
        percent: 0,
        error: err?.message || 'ফাইল প্রসেসিং ব্যর্থ হয়েছে। ফাইলের স্ট্রাকচার চেক করুন।',
        message: '',
      });
    }
  };

  // Download sample CSV / JSON templates
  const downloadSampleTemplate = (type: 'csv' | 'json') => {
    if (type === 'csv') {
      const sampleCsv = `serial_no,name,father_name,mother_name,spouse_name,dob,nid_no,voter_no,gender,blood_group,seat_no,district,thana,ward,address,polling_center,area_code
01,মো: নাজমুল হাসান,মো: আব্দুল কাদের,মোছা: রাবেয়া বেগম,মোছা: ফারহানা আক্তার,15/10/1992,19922610199000123,2610199200123,male,B+,ঢাকা-১০,ঢাকা,ধানমন্ডি,ওয়ার্ড নং ১৫,রোড নং ৭/এ বাড়ি ১২,ধানমন্ডি গভঃ বয়েজ হাই স্কুল,০২৬১
02,মো: নাজমুল ইসলাম,মরহুম রফিকুল ইসলাম,জাহানারা বেগম,নাসরিন সুলতানা,08/03/1988,7359182341,2610198800456,male,O+,ঢাকা-১০,ঢাকা,কলাবাগান,ওয়ার্ড নং ১৬,লেক সার্কাস লেন,কলাবাগান বশিরউদ্দিন আদর্শ বিদ্যালয়,০২৬২
03,নাজমুল করিম মজুমদার,মো: ফজলুল হক,রোকেয়া বেগম,তানজিনা আক্তার,18/06/1991,19911910199000111,1910199100111,male,O+,কুমিল্লা-৬,কুমিল্লা,আদর্শ সদর,ওয়ার্ড ০৩,ঝাউতলা রোড হোল্ডিং ১০৫,কুমিল্লা জিলা স্কুল,০১৫১`;

      const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Sample_Voter_Data_Template.csv';
      a.click();
    } else {
      const sampleJson = [
        {
          serialNo: '০১',
          nameBn: 'মো: নাজমুল হাসান',
          nameEn: 'MD NAZMUL HASAN',
          fatherName: 'মো: আব্দুল কাদের',
          motherName: 'মোছা: রাবেয়া বেগম',
          spouseName: 'মোছা: ফারহানা আক্তার',
          dob: '15/10/1992',
          nidNo: '19922610199000123',
          voterNo: '2610199200123',
          gender: 'male',
          bloodGroup: 'B+',
          seatNo: 'ঢাকা-১০',
          district: 'ঢাকা',
          upazilaThana: 'ধানমন্ডি',
          unionWard: 'ওয়ার্ড নং ১৫',
          villageArea: 'রোড নং ৭/এ, বাড়ি নং ১২/১',
          pollingCenter: 'ধানমন্ডি গভঃ বয়েজ হাই স্কুল',
          voterAreaCode: '০২৬১',
        },
      ];

      const blob = new Blob([JSON.stringify(sampleJson, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Sample_Voter_Data_Template.json';
      a.click();
    }
  };

  // Delete seat
  const handleDeleteSeat = async (seatNo: string) => {
    if (window.confirm(`আপনি কি নিশ্চিতভাবে "${seatNo}" আসনের সকল ভোটারের তথ্য মুছে ফেলতে চান?`)) {
      try {
        const deletedCount = await deleteVotersBySeat(seatNo);
        setActionNotice(`সফলভাবে "${seatNo}" আসনের মোট ${deletedCount} জন ভোটারের ডাটা মুছে ফেলা হয়েছে।`);
        await loadStats();
        notifyChange();
        setTimeout(() => setActionNotice(''), 4000);
      } catch (err: any) {
        console.error('Delete seat error:', err);
        setActionNotice(`আসন ডিলিট করতে সমস্যা হয়েছে: ${err.message || 'ত্রুটি'}`);
      }
    }
  };

  // Restore sample demo
  const handleRestoreDemo = async () => {
    if (window.confirm('সকল ডাটা মুছে দিয়ে প্রাথমিক ডেমো রেকর্ডগুলো পুনরায় লোড করতে চান?')) {
      try {
        await restoreDefaultSampleRecords();
        setActionNotice('প্রাথমিক ডেমো ডাটাবেজ সফলভাবে রিস্টোর হয়েছে।');
        await loadStats();
        notifyChange();
        setTimeout(() => setActionNotice(''), 4000);
      } catch (err: any) {
        setActionNotice('রিস্টোর করতে সমস্যা হয়েছে');
      }
    }
  };

  // Clear all
  const handleClearAll = async () => {
    if (window.confirm('সতর্কতা: এটি ডাটাবেজের সমস্ত ভোটার রেকর্ড স্থায়ীভাবে মুছে ফেলবে! আপনি কি নিশ্চিত?')) {
      try {
        await clearEntireDatabase();
        setActionNotice('ডাটাবেজের সমস্ত ভোটার রেকর্ড সফলভাবে মুছে ফেলা হয়েছে।');
        await loadStats();
        notifyChange();
        setTimeout(() => setActionNotice(''), 4000);
      } catch (err: any) {
        setActionNotice('ডাটা মুছতে সমস্যা হয়েছে');
      }
    }
  };

  // Save manual entry
  const handleSaveManualVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.nameBn || !manualForm.voterNo || !manualForm.nidNo) {
      alert('দয়া করে নাম, ভোটার নং এবং এনআইডি নং পূরণ করুন।');
      return;
    }

    const { division, district } = deduceDistrictAndDivision(manualForm.seatNo || 'ঢাকা-১০', manualForm.district);

    const record: VoterRecord = {
      id: `vtr-${manualForm.seatNo}-${Date.now()}`,
      serialNo: manualForm.serialNo || '০১',
      nameBn: manualForm.nameBn,
      nameEn: manualForm.nameEn || '',
      fatherName: manualForm.fatherName || '',
      motherName: manualForm.motherName || '',
      spouseName: manualForm.spouseName || '',
      dob: manualForm.dob || '',
      voterNo: manualForm.voterNo,
      nidNo: manualForm.nidNo,
      formNo: manualForm.formNo || '',
      gender: manualForm.gender || 'male',
      bloodGroup: manualForm.bloodGroup || '',
      division,
      district,
      seatNo: manualForm.seatNo || 'ঢাকা-১০',
      seatNameBn: manualForm.seatNo || 'ঢাকা-১০',
      upazilaThana: manualForm.upazilaThana || district,
      unionWard: manualForm.unionWard || '',
      villageArea: manualForm.villageArea || '',
      pollingCenter: manualForm.pollingCenter || '',
      voterAreaCode: manualForm.voterAreaCode || '',
      createdAt: new Date().toISOString().split('T')[0],
    };

    await saveSingleVoter(record);
    setManualSaveSuccess(`সফলভাবে "${record.nameBn}" এর তথ্য ডাটাবেজে যুক্ত হয়েছে!`);
    await loadStats();
    notifyChange();
    setTimeout(() => setManualSaveSuccess(''), 4000);
  };

  // Change PIN
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4) {
      setPinChangeMsg({ text: 'পিন কোড কমপক্ষে ৪ সংখ্যার হতে হবে।', isError: true });
      return;
    }
    if (newPin !== confirmPin) {
      setPinChangeMsg({ text: 'উভয় পিন কোড মিলছে না!', isError: true });
      return;
    }

    setAdminPin(newPin);
    setPinChangeMsg({ text: 'এডমিন পিন সফলভাবে পরিবর্তন করা হয়েছে!', isError: false });
    setNewPin('');
    setConfirmPin('');
  };

  // Find districts for dropdown
  const currentDistrictObj = BANGLADESH_DISTRICTS.find((d) => d.nameBn === selectedDistrict);
  const currentSeats = currentDistrictObj ? currentDistrictObj.seats : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/40">
              {isAuthenticated ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                এডমিন ডাটাবেজ প্যানেল (Voter Database Management)
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {isAuthenticated ? 'UNLOCKED' : 'PROTECTED'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                শুধুমাত্র অ্যাডমিন/মালিকের জন্য সংরক্ষিত। সাধারণ ইউজাররা এই সেকশন দেখতে পারবে না।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition"
              >
                <Lock className="w-3 h-3" />
                লক করুন
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isAuthenticated ? (
          /* Password Screen */
          <div className="p-8 max-w-md mx-auto text-center space-y-5 my-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200 shadow-inner">
              <Key className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">এডমিন পিন প্রবেশ করান</h3>
              <p className="text-xs text-slate-500 mt-1">
                ডাটাবেজ আপলোড, জিপ ফাইল আনপ্যাক এবং রেকর্ড ব্যবস্থাপনায় প্রবেশ করতে সিক্রেট পিন দিন।
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  placeholder="৪ সংখ্যার এডমিন পিন (ডিফল্ট: 1234)"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  autoFocus
                  className="w-full text-center tracking-widest text-lg font-mono py-2.5 px-4 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {pinError && (
                <div className="p-2.5 rounded bg-red-50 text-red-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-red-200">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
              >
                আনলক করুন (Unlock Admin)
              </button>
            </form>

            <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100">
              ডিফল্ট মাস্টার পিন: <span className="font-mono font-bold text-slate-700">1234</span>
            </div>
          </div>
        ) : (
          /* Authenticated Admin Tabs */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tabs Header */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1 py-1.5">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    activeTab === 'upload'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:bg-white/60'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  ফাইল আপলোড ও আনজিপ
                </button>

                <button
                  onClick={() => setActiveTab('stats')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    activeTab === 'stats'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:bg-white/60'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  আসনভিত্তিক তালিকা ({stats?.totalSeats || 0})
                </button>

                <button
                  onClick={() => setActiveTab('manual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    activeTab === 'manual'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:bg-white/60'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  একক ভোটার এন্ট্রি
                </button>

                <button
                  onClick={() => setActiveTab('pin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    activeTab === 'pin'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:bg-white/60'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  পিন পরিবর্তন
                </button>
              </div>

              {stats && (
                <div className="text-[11px] font-semibold text-slate-600 hidden sm:block">
                  মোট সংরক্ষিত ভোটার: <span className="font-bold text-blue-700 font-mono">{stats.totalVoters}</span> জন
                </div>
              )}
            </div>

            {/* Tab Body */}
            <div className="p-5 flex-1 overflow-y-auto bg-slate-50">
              {/* 1. UPLOAD TAB */}
              {activeTab === 'upload' && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {/* Upload Info Card */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FolderArchive className="w-4 h-4 text-blue-600" />
                        প্রতি আসনের জিপ (ZIP) বা আনজিপ করা ফাইল আপলোড
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => downloadSampleTemplate('csv')}
                          className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                          নমুনা CSV
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          onClick={() => downloadSampleTemplate('json')}
                          className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <FileCode className="w-3 h-3" />
                          নমুনা JSON
                        </button>
                      </div>
                    </div>

                    {/* Seat & District targeting settings */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoDetectSeat}
                            onChange={(e) => setAutoDetectSeat(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <span>ফাইলের নাম বা কলাম থেকে স্বয়ংক্রিয় আসন শনাক্তকরণ (Auto Detect)</span>
                        </label>
                      </div>

                      {!autoDetectSeat && (
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                          <div>
                            <label className="block font-bold text-slate-600 mb-1 text-[11px]">জেলা:</label>
                            <select
                              value={selectedDistrict}
                              onChange={(e) => {
                                setSelectedDistrict(e.target.value);
                                const d = BANGLADESH_DISTRICTS.find((dist) => dist.nameBn === e.target.value);
                                if (d && d.seats[0]) setSelectedSeat(d.seats[0]);
                              }}
                              className="w-full p-2 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                            >
                              {BANGLADESH_DISTRICTS.map((d) => (
                                <option key={d.nameBn} value={d.nameBn}>
                                  {d.nameBn} ({d.divisionBn})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-600 mb-1 text-[11px]">সংসদীয় আসন:</label>
                            <select
                              value={selectedSeat}
                              onChange={(e) => setSelectedSeat(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-300 rounded font-semibold text-blue-700"
                            >
                              {currentSeats.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Drag & Drop File Upload Box */}
                    <label className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-800 block">
                          আসন অনুযায়ী .ZIP, .CSV, .JSON বা .TXT ফাইল সিলেক্ট করুন
                        </span>
                        <span className="text-xs text-slate-500 block mt-0.5">
                          ব্রাউজার থেকে ফাইল ড্রপ করুন বা ক্লিক করে আপলোড করুন
                        </span>
                      </div>
                      <input
                        type="file"
                        accept=".zip,.csv,.json,.txt,.tsv"
                        onChange={handleFileUpload}
                        disabled={uploadStatus.inProgress}
                        className="hidden"
                      />
                    </label>

                    {/* Upload progress & status */}
                    {uploadStatus.inProgress && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                        <div className="flex justify-between text-xs font-bold text-blue-800">
                          <span>{uploadStatus.message}</span>
                          <span>{uploadStatus.percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${uploadStatus.percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {uploadStatus.success && (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{uploadStatus.message}</span>
                      </div>
                    )}

                    {uploadStatus.error && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs font-bold text-red-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{uploadStatus.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. STATS & SEATS OVERVIEW TAB */}
              {activeTab === 'stats' && (
                <div className="space-y-4">
                  {actionNotice && (
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fadeIn">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{actionNotice}</span>
                    </div>
                  )}

                  {/* Top quick stats cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 font-bold uppercase block">মোট সংরক্ষিত ভোটার</span>
                      <span className="text-xl font-black text-slate-900 font-mono">{stats?.totalVoters || 0}</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 font-bold uppercase block">মোট লোডকৃত আসন সংখ্যা</span>
                      <span className="text-xl font-black text-blue-700 font-mono">{stats?.totalSeats || 0}</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">ডাটাবেজ একশন</span>
                        <button
                          onClick={handleRestoreDemo}
                          className="text-[11px] font-bold text-blue-600 hover:underline block mt-0.5"
                        >
                          ডেমো ডাটা রিস্টোর
                        </button>
                      </div>
                      <button
                        onClick={handleClearAll}
                        className="px-2.5 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 text-[11px] font-bold border border-red-200 transition"
                      >
                        সব মুছুন
                      </button>
                    </div>
                  </div>

                  {/* Seat Search & List */}
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-700">আসন তালিকা ও ভোটার সংখ্যা</span>
                      <div className="relative w-48">
                        <input
                          type="text"
                          placeholder="আসন বা জেলা খুঁজুন..."
                          value={statSearchQuery}
                          onChange={(e) => setStatSearchQuery(e.target.value)}
                          className="w-full text-xs py-1 px-2.5 pl-7 border border-slate-300 rounded bg-white"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px] uppercase font-bold sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">সংসদীয় আসন নং</th>
                            <th className="py-2.5 px-3">জেলা</th>
                            <th className="py-2.5 px-3">বিভাগ</th>
                            <th className="py-2.5 px-3">মোট ভোটার</th>
                            <th className="py-2.5 px-3 text-right">একশন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {stats?.seatStats
                            .filter((s) =>
                              statSearchQuery
                                ? s.seatNo.includes(statSearchQuery) || s.district.includes(statSearchQuery)
                                : true
                            )
                            .map((seat) => (
                              <tr key={seat.seatNo} className="hover:bg-slate-50 transition">
                                <td className="py-2 px-3 font-bold text-slate-900">{seat.seatNo}</td>
                                <td className="py-2 px-3 text-slate-700">{seat.district}</td>
                                <td className="py-2 px-3 text-slate-600">{seat.division}</td>
                                <td className="py-2 px-3 font-mono font-bold text-blue-700">{seat.count} জন</td>
                                <td className="py-2 px-3 text-right">
                                  <button
                                    onClick={() => handleDeleteSeat(seat.seatNo)}
                                    className="p-1 rounded text-red-600 hover:bg-red-50 transition"
                                    title="আসন ডাটা মুছুন"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. MANUAL VOTER ENTRY TAB */}
              {activeTab === 'manual' && (
                <form onSubmit={handleSaveManualVoter} className="space-y-4 max-w-2xl mx-auto bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-blue-600" />
                      একক নতুন ভোটারের তথ্য এন্ট্রি
                    </span>
                    <span className="text-[11px] text-slate-500">* চিহ্নিত ঘরগুলো আবশ্যক</span>
                  </div>

                  {manualSaveSuccess && (
                    <div className="p-2.5 rounded bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{manualSaveSuccess}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ভোটারের নাম (বাংলা) *</label>
                      <input
                        type="text"
                        required
                        placeholder="যেমন: মো: নাজমুল হাসান"
                        value={manualForm.nameBn}
                        onChange={(e) => setManualForm({ ...manualForm, nameBn: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Name in English</label>
                      <input
                        type="text"
                        placeholder="e.g. MD NAZMUL HASAN"
                        value={manualForm.nameEn}
                        onChange={(e) => setManualForm({ ...manualForm, nameEn: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ভোটার নম্বর *</label>
                      <input
                        type="text"
                        required
                        placeholder="ভোটার নং (যেমন: 2610199200123)"
                        value={manualForm.voterNo}
                        onChange={(e) => setManualForm({ ...manualForm, voterNo: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">জাতীয় পরিচয়পত্র (NID) নম্বর *</label>
                      <input
                        type="text"
                        required
                        placeholder="১০/১৩/১৭ ডিজিট NID নং"
                        value={manualForm.nidNo}
                        onChange={(e) => setManualForm({ ...manualForm, nidNo: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">পিতার নাম</label>
                      <input
                        type="text"
                        placeholder="পিতার নাম"
                        value={manualForm.fatherName}
                        onChange={(e) => setManualForm({ ...manualForm, fatherName: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">মাতার নাম</label>
                      <input
                        type="text"
                        placeholder="মাতার নাম"
                        value={manualForm.motherName}
                        onChange={(e) => setManualForm({ ...manualForm, motherName: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">স্বামী / স্ত্রীর নাম</label>
                      <input
                        type="text"
                        placeholder="যদি থাকে"
                        value={manualForm.spouseName}
                        onChange={(e) => setManualForm({ ...manualForm, spouseName: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">জন্ম তারিখ (DOB)</label>
                      <input
                        type="text"
                        placeholder="যেমন: 15/10/1992 বা 1992-10-15"
                        value={manualForm.dob}
                        onChange={(e) => setManualForm({ ...manualForm, dob: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">জেলা ও আসন</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={manualForm.district}
                          onChange={(e) => {
                            const dist = e.target.value;
                            const dObj = BANGLADESH_DISTRICTS.find((d) => d.nameBn === dist);
                            const firstSeat = dObj ? dObj.seats[0] : 'ঢাকা-১০';
                            setManualForm({ ...manualForm, district: dist, seatNo: firstSeat });
                          }}
                          className="p-2 border border-slate-300 rounded"
                        >
                          {BANGLADESH_DISTRICTS.map((d) => (
                            <option key={d.nameBn} value={d.nameBn}>
                              {d.nameBn}
                            </option>
                          ))}
                        </select>

                        <select
                          value={manualForm.seatNo}
                          onChange={(e) => setManualForm({ ...manualForm, seatNo: e.target.value })}
                          className="p-2 border border-slate-300 rounded font-bold text-blue-700"
                        >
                          {BANGLADESH_DISTRICTS.find((d) => d.nameBn === manualForm.district)?.seats.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">উপজেলা / থানা ও ওয়ার্ড</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="উপজেলা / থানা"
                          value={manualForm.upazilaThana}
                          onChange={(e) => setManualForm({ ...manualForm, upazilaThana: e.target.value })}
                          className="p-2 border border-slate-300 rounded"
                        />
                        <input
                          type="text"
                          placeholder="ওয়ার্ড / ইউনিয়ন"
                          value={manualForm.unionWard}
                          onChange={(e) => setManualForm({ ...manualForm, unionWard: e.target.value })}
                          className="p-2 border border-slate-300 rounded"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">গ্রাম / রাস্তা / ঠিকানা</label>
                      <input
                        type="text"
                        placeholder="যেমন: রোড নং ৭/এ, বাড়ি নং ১২/১, ধানমন্ডি"
                        value={manualForm.villageArea}
                        onChange={(e) => setManualForm({ ...manualForm, villageArea: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ভোট কেন্দ্র</label>
                      <input
                        type="text"
                        placeholder="ভোট কেন্দ্রের নাম"
                        value={manualForm.pollingCenter}
                        onChange={(e) => setManualForm({ ...manualForm, pollingCenter: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ভোটার এলাকা কোড ও ক্রমিক</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="এলাকা কোড (যেমন ০২৬১)"
                          value={manualForm.voterAreaCode}
                          onChange={(e) => setManualForm({ ...manualForm, voterAreaCode: e.target.value })}
                          className="p-2 border border-slate-300 rounded font-mono"
                        />
                        <input
                          type="text"
                          placeholder="ক্রমিক নং (যেমন ০১)"
                          value={manualForm.serialNo}
                          onChange={(e) => setManualForm({ ...manualForm, serialNo: e.target.value })}
                          className="p-2 border border-slate-300 rounded font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
                    >
                      ভোটার তথ্য সেভ করুন
                    </button>
                  </div>
                </form>
              )}

              {/* 4. PIN SETTINGS TAB */}
              {activeTab === 'pin' && (
                <form onSubmit={handleChangePin} className="space-y-4 max-w-md mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <Key className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">এডমিন পিন কোড পরিবর্তন</h3>
                    <p className="text-xs text-slate-500">আপনার ডাটাবেজের সুরক্ষায় নতুন গোপন পিন সেট করুন।</p>
                  </div>

                  {pinChangeMsg.text && (
                    <div
                      className={`p-2.5 rounded text-xs font-bold border flex items-center gap-1.5 ${
                        pinChangeMsg.isError
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {pinChangeMsg.isError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      <span>{pinChangeMsg.text}</span>
                    </div>
                  )}

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">নতুন পিন কোড (কমপক্ষে ৪ সংখ্যা)</label>
                      <input
                        type="password"
                        required
                        placeholder="নতুন পিন দিন"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded font-mono text-center font-bold tracking-widest text-base"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">নতুন পিন নিশ্চিত করুন</label>
                      <input
                        type="password"
                        required
                        placeholder="আবার নতুন পিন দিন"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded font-mono text-center font-bold tracking-widest text-base"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
                  >
                    পিন আপডেট করুন
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
