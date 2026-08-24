import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  MapPin, 
  Building2, 
  User, 
  Users, 
  Calendar, 
  CreditCard, 
  Printer, 
  Copy, 
  Check, 
  RotateCcw, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Eye,
  SlidersHorizontal,
  Upload,
  Database,
  Lock,
  ArrowRight,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { VoterRecord } from '../types';
import { 
  searchVoters, 
  getActiveDistrictsAndSeats, 
  ActiveDistrictInfo,
  getAllVotersBySeat
} from '../utils/voterDb';
import { 
  exportSeatToExcel, 
  exportAllVotersToExcel 
} from '../utils/pdfVoterParser';
import { VoterSlipModal } from './VoterSlipModal';
import { AdminVoterDbModal } from './AdminVoterDbModal';
import { useShopAuth } from '../context/ShopAuthContext';

export const VoterInfoSearch: React.FC = () => {
  const { currentProfile, isAuthenticated } = useShopAuth();
  const isSuperAdmin = isAuthenticated && currentProfile.role === 'super_admin';

  // Active districts and seats loaded dynamically from Database
  const [activeDistricts, setActiveDistricts] = useState<ActiveDistrictInfo[]>([]);
  const [totalDbVoters, setTotalDbVoters] = useState<number>(0);
  const [totalDbDistricts, setTotalDbDistricts] = useState<number>(0);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState<boolean>(true);

  // Cascading Selection: District first, then Seat (from DB)
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedSeat, setSelectedSeat] = useState<string>('');

  // Input Fields
  const [nameQuery, setNameQuery] = useState<string>('');
  const [fatherQuery, setFatherQuery] = useState<string>('');
  const [motherQuery, setMotherQuery] = useState<string>('');
  const [voterNoQuery, setVoterNoQuery] = useState<string>('');
  const [dobQuery, setDobQuery] = useState<string>('');
  const [occupationQuery, setOccupationQuery] = useState<string>('');
  const [isExact, setIsExact] = useState<boolean>(false);

  // Search execution state - Default to FALSE so NO results show before search
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<VoterRecord[]>([]);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [slipVoter, setSlipVoter] = useState<VoterRecord | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Load added districts & seats directly from IndexedDB
  const fetchDistricts = useCallback(async (preserveSelection = true) => {
    try {
      setIsLoadingDistricts(true);
      const res = await getActiveDistrictsAndSeats();
      setActiveDistricts(res.districts);
      setTotalDbVoters(res.totalVoters);
      setTotalDbDistricts(res.totalDistricts);

      if (res.districts.length > 0) {
        setSelectedDistrict((prev) => {
          if (preserveSelection && prev && res.districts.some((d) => d.name === prev)) {
            return prev;
          }
          return res.districts[0].name;
        });
      } else {
        setSelectedDistrict('');
        setSelectedSeat('');
      }
    } catch (e) {
      console.error('Active districts fetch error:', e);
    } finally {
      setIsLoadingDistricts(false);
    }
  }, []);

  useEffect(() => {
    fetchDistricts(false);
  }, [fetchDistricts]);

  // Current selected district object
  const currentDistrictObj = useMemo(() => {
    if (!selectedDistrict) return null;
    return activeDistricts.find((d) => d.name === selectedDistrict) || null;
  }, [selectedDistrict, activeDistricts]);

  // Available seats ONLY for the selected district from DB
  const availableSeats = useMemo(() => {
    if (!currentDistrictObj) return [];
    return currentDistrictObj.seats;
  }, [currentDistrictObj]);

  // All uploaded seats across all districts in DB
  const allUploadedSeats = useMemo(() => {
    const list: { seatNo: string; count: number }[] = [];
    activeDistricts.forEach((d) => {
      d.seats.forEach((s) => list.push(s));
    });
    return list;
  }, [activeDistricts]);

  // When District changes, auto-select first seat of that district
  const handleDistrictChange = (dist: string) => {
    setSelectedDistrict(dist);
    if (!dist) {
      setSelectedSeat('');
      return;
    }
    const dObj = activeDistricts.find((d) => d.name === dist);
    if (dObj && dObj.seats.length > 0) {
      setSelectedSeat(dObj.seats[0].seatNo);
    } else {
      setSelectedSeat('');
    }
  };

  // Export to Excel (.xlsx) handler
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const handleExportExcelData = async () => {
    try {
      setIsExportingExcel(true);
      if (hasSearched && searchResults.length > 0) {
        exportSeatToExcel(selectedSeat || selectedDistrict || 'Search_Results', searchResults);
        return;
      }
      if (selectedSeat) {
        const list = await getAllVotersBySeat(selectedSeat);
        if (list.length > 0) {
          exportSeatToExcel(selectedSeat, list);
        } else {
          alert('এই আসনের কোনো ডাটা পাওয়া যায়নি।');
        }
        return;
      }
      // Full database export
      const allList = await getAllVotersBySeat('all');
      if (allList.length > 0) {
        exportAllVotersToExcel(allList);
      } else {
        alert('ডাটাবেজে বর্তমানে কোনো ভোটার তথ্য নেই।');
      }
    } catch (e) {
      console.error('Export error:', e);
      alert('এক্সেল ফাইল তৈরিতে সমস্যা হয়েছে।');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Perform search only when user clicks Search button
  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    setHasSearched(true);

    try {
      const res = await searchVoters({
        district: selectedDistrict && selectedDistrict !== 'Select District' ? selectedDistrict : undefined,
        seatNo: selectedSeat && selectedSeat !== 'সকল আসন' ? selectedSeat : undefined,
        name: nameQuery,
        fatherName: fatherQuery,
        motherName: motherQuery,
        voterNo: voterNoQuery,
        dob: dobQuery,
        occupation: occupationQuery,
        exact: isExact,
        limit: 100,
      });
      setSearchResults(res.voters);
      setTotalMatches(res.totalMatches);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [selectedDistrict, selectedSeat, nameQuery, fatherQuery, motherQuery, voterNoQuery, dobQuery, occupationQuery, isExact]);

  // Clear all filters and reset search results
  const handleReset = () => {
    setNameQuery('');
    setFatherQuery('');
    setMotherQuery('');
    setVoterNoQuery('');
    setDobQuery('');
    setOccupationQuery('');
    setIsExact(false);
    setHasSearched(false);
    setSearchResults([]);
    setTotalMatches(0);
  };

  // Copy voter information formatted
  const handleCopyVoter = (voter: VoterRecord) => {
    const text = `বাংলাদেশ ভোটার তথ্য
নাম: ${voter.nameBn} (${voter.nameEn || ''})
ভোটার নং: ${voter.voterNo}
এনআইডি নং: ${voter.nidNo}
পিতা: ${voter.fatherName}
মাতা: ${voter.motherName}
${voter.spouseName ? `স্বামী/স্ত্রী: ${voter.spouseName}\n` : ''}জন্ম তারিখ: ${voter.dob}
আসন: ${voter.seatNo} (${voter.district})
ঠিকানা: ${voter.villageArea}, ${voter.unionWard}, ${voter.upazilaThana}
ভোট কেন্দ্র: ${voter.pollingCenter} (এলাকা কোড: ${voter.voterAreaCode || ''})`;

    navigator.clipboard.writeText(text);
    setCopiedId(voter.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Quick single-field copy
  const handleCopySingle = (val: string, id: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(`${id}-${val}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Main Advance Nid Data Finder Box */}
      <div className="max-w-md sm:max-w-lg mx-auto">
        <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 text-slate-100 relative overflow-hidden">
          
          {/* Top subtle glow effect */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Admin Action bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>NID Data Finder</span>
            </div>

            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                {totalDbVoters > 0 && (
                  <button
                    type="button"
                    onClick={handleExportExcelData}
                    disabled={isExportingExcel}
                    className="px-2.5 py-1 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 transition flex items-center gap-1 text-xs font-medium"
                    title="ডাটাবেজ এক্সেল (.xlsx) ফাইলে ডাউনলোড করুন"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isExportingExcel ? 'তৈরি হচ্ছে...' : 'Excel ডাউনলোড'}</span>
                  </button>
                )}

                {/* Admin Upload Trigger */}
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(true)}
                  className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-700/80 transition flex items-center gap-1.5 text-xs font-medium"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ডাটাবেইজ আপলোড</span>
                </button>
              </div>
            )}
          </div>

          {/* Main Title */}
          <div className="text-center space-y-1 pt-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Advance Nid Data Finder
            </h1>
            <p className="text-xs text-slate-400">
              ভোটার তালিকা ও এনআইডি তথ্য অনুসন্ধান
            </p>
          </div>

          {/* Empty DB Notice if 0 districts added */}
          {activeDistricts.length === 0 && !isLoadingDistricts && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl text-xs text-emerald-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ডাটাবেজে কোনো আসনের তথ্য নেই</span>
              </div>
              {isSuperAdmin ? (
                <>
                  <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                    আপনার সংসদীয় আসনের জিপ ফাইল (.zip) বা ফোল্ডার (যেমন: বগুড়া ১ বা সিরাজগঞ্জ-২) সরাসরি আপলোড করুন। ফোল্ডারের ভেতরে ইউনিয়ন ও গ্রামের পিডিএফ স্বয়ংক্রিয়ভাবে পড়ে সার্চে যুক্ত হয়ে যাবে।
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAdminModalOpen(true)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    আসন ফোল্ডার বা জিপ ফাইল আপলোড করুন
                  </button>
                </>
              ) : (
                <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                  ডাটাবেজে এখনও কোনো ভোটার তালিকা যুক্ত করা হয়নি। ভোটার ডাটা আপলোড করার জন্য অনুগ্রহ করে সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন।
                </p>
              )}
            </div>
          )}

          {/* Main Search Form */}
          <form onSubmit={handleSearch} className="space-y-4">
            
            {/* Row 1: District Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Select District (আপলোডকৃত জেলা)</span>
              </label>
              <div className="relative">
                <select
                  value={selectedDistrict}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  disabled={activeDistricts.length === 0}
                  className="w-full bg-[#121826] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 transition appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {activeDistricts.length === 0 ? (
                    <option value="">কোনো জেলা আপলোড করা হয়নি</option>
                  ) : (
                    <>
                      <option value="">সকল জেলা ({totalDbDistricts}টি জেলা)</option>
                      {activeDistricts.map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name} ({d.totalVoters.toLocaleString('bn-BD')} ভোটার)
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Row 2: Seat Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Select Seat (আপলোডকৃত সংসদীয় আসন)</span>
              </label>
              <div className="relative">
                <select
                  value={selectedSeat}
                  onChange={(e) => setSelectedSeat(e.target.value)}
                  disabled={activeDistricts.length === 0}
                  className="w-full bg-[#121826] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 transition appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {activeDistricts.length === 0 ? (
                    <option value="">কোনো আসন আপলোড করা হয়নি</option>
                  ) : (
                    <>
                      <option value="">সকল আসন</option>
                      {(selectedDistrict ? availableSeats : allUploadedSeats).map((seat) => (
                        <option key={seat.seatNo} value={seat.seatNo}>
                          {seat.seatNo} ({seat.count.toLocaleString('bn-BD')} ভোটার)
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Row 3: Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>নাম (বাংলা বা ইংরেজিতে)</span>
              </label>
              <input
                type="text"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder="যেমন: মো: নাজমুল হাসান"
                className="w-full bg-[#121826] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Row 4: Father's Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>পিতার নাম</span>
              </label>
              <input
                type="text"
                value={fatherQuery}
                onChange={(e) => setFatherQuery(e.target.value)}
                placeholder="পিতার নাম লিখুন"
                className="w-full bg-[#121826] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Row 5: Mother's Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>মাতার নাম</span>
              </label>
              <input
                type="text"
                value={motherQuery}
                onChange={(e) => setMotherQuery(e.target.value)}
                placeholder="মাতার নাম লিখুন"
                className="w-full bg-[#121826] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Row 6: Voter No / NID / PIN */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>ভোটার নং / এনআইডি / পিন</span>
              </label>
              <input
                type="text"
                value={voterNoQuery}
                onChange={(e) => setVoterNoQuery(e.target.value)}
                placeholder="ভোটার নং অথবা জাতীয় পরিচয়পত্র নম্বর"
                className="w-full bg-[#121826] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono transition"
              />
            </div>

            {/* Row 7: Date of Birth */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>জন্ম তারিখ (দিন/মাস/বছর)</span>
              </label>
              <input
                type="text"
                value={dobQuery}
                onChange={(e) => setDobQuery(e.target.value)}
                placeholder="DD/MM/YYYY (যেমন: 15/10/1992)"
                className="w-full bg-[#121826] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono transition"
              />
            </div>

            {/* Exact Match Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isExact}
                  onChange={(e) => setIsExact(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>হুবহু মিল (Exact Match)</span>
              </label>

              {(nameQuery || fatherQuery || motherQuery || voterNoQuery || dobQuery) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-rose-400 transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>রিসেট</span>
                </button>
              )}
            </div>

            {/* Submit Search Button */}
            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-3.5 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl text-sm shadow-xl shadow-emerald-950/50 transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <Search className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
              <span>{isSearching ? 'অনুসন্ধান চলছে...' : 'ভোটার তথ্য খুঁজুন'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* SEARCH RESULTS SECTION - ONLY SHOWN AFTER USER CLICKS SEARCH */}
      {hasSearched && (
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>অনুসন্ধানের ফলাফল</span>
                <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-mono">
                  {totalMatches.toLocaleString('bn-BD')} টি পাওয়া গেছে
                </span>
              </h2>
            </div>

            {searchResults.length > 0 && isSuperAdmin && (
              <button
                type="button"
                onClick={handleExportExcelData}
                disabled={isExportingExcel}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                title="এই ফলাফল গুলো Excel (.xlsx) ফাইলে ডাউনলোড করুন"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isExportingExcel ? 'ডাউনলোড হচ্ছে...' : 'ফলাফল Excel ডাউনলোড'}</span>
              </button>
            )}
          </div>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map((voter) => (
                <div
                  key={voter.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition space-y-3 relative group"
                >
                  {/* Top Header Card */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                        {voter.nameBn}
                      </h3>
                      {voter.nameEn && (
                        <p className="text-xs text-slate-500 font-mono uppercase">{voter.nameEn}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                        {voter.seatNo || voter.district}
                      </span>
                    </div>
                  </div>

                  {/* Detail Grid */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">পিতার নাম:</span>
                      <span className="font-semibold text-slate-800">{voter.fatherName || '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">মাতার নাম:</span>
                      <span className="font-semibold text-slate-800">{voter.motherName || '—'}</span>
                    </div>

                    {voter.spouseName && (
                      <div className="col-span-2">
                        <span className="text-slate-500 block text-[11px]">স্বামী/স্ত্রী:</span>
                        <span className="font-semibold text-slate-800">{voter.spouseName}</span>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-500 block text-[11px]">ভোটার নং:</span>
                      <div className="flex items-center gap-1 font-mono font-bold text-blue-700">
                        <span>{voter.voterNo || '—'}</span>
                        {voter.voterNo && (
                          <button
                            type="button"
                            onClick={() => handleCopySingle(voter.voterNo, voter.id)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
                            title="কপি করুন"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">জাতীয় পরিচয়পত্র:</span>
                      <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                        <span>{voter.nidNo || '—'}</span>
                        {voter.nidNo && (
                          <button
                            type="button"
                            onClick={() => handleCopySingle(voter.nidNo, voter.id)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
                            title="কপি করুন"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">জন্ম তারিখ:</span>
                      <span className="font-mono text-slate-800 font-medium">{voter.dob || '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">লিঙ্গ:</span>
                      <span className="text-slate-800 font-medium">
                        {voter.gender === 'female' ? 'মহিলা' : voter.gender === 'other' ? 'তৃতীয় লিঙ্গ' : 'পুরুষ'}
                      </span>
                    </div>

                    <div className="col-span-2 pt-1 border-t border-slate-100">
                      <span className="text-slate-500 block text-[11px]">ঠিকানা / এলাকা:</span>
                      <p className="text-slate-700 text-[11px] leading-relaxed">
                        {[voter.villageArea, voter.unionWard, voter.upazilaThana, voter.district]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>

                    {voter.pollingCenter && (
                      <div className="col-span-2">
                        <span className="text-slate-500 block text-[11px]">ভোট কেন্দ্র:</span>
                        <p className="text-slate-700 text-[11px] font-medium">{voter.pollingCenter}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyVoter(voter)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      {copiedId === voter.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">কপি হয়েছে</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>সম্পূর্ণ তথ্য কপি</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSlipVoter(voter)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>ভোটার স্লিপ প্রিন্ট</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">কোনো ভোটার তথ্য পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                আপনার দেওয়া নামের বানান বা ভোটার নম্বর পরীক্ষা করুন, অথবা আসন নির্বাচন পরিবর্তন করে আবার চেষ্টা করুন।
              </p>
            </div>
          )}
        </div>
      )}

      {/* Slip Modal */}
      {slipVoter && (
        <VoterSlipModal
          isOpen={!!slipVoter}
          onClose={() => setSlipVoter(null)}
          voter={slipVoter}
        />
      )}

      {/* Database & Seat Upload Admin Modal */}
      <AdminVoterDbModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onDatabaseUpdated={() => fetchDistricts(false)}
      />
    </div>
  );
};
