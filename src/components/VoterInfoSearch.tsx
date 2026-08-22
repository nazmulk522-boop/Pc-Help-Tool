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
  Lock, 
  RotateCcw, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  LayoutGrid, 
  List, 
  Sparkles, 
  AlertCircle, 
  Info,
  ChevronDown,
  Briefcase,
  KeyRound,
  Download,
  Eye,
  SlidersHorizontal,
  PlusCircle
} from 'lucide-react';
import { VoterRecord } from '../types';
import { 
  searchVoters, 
  getActiveDistrictsAndSeats, 
  ActiveDistrictInfo,
  restoreDefaultSampleRecords
} from '../utils/voterDb';
import { VoterSlipModal } from './VoterSlipModal';
import { AdminVoterDbModal } from './AdminVoterDbModal';

export const VoterInfoSearch: React.FC = () => {
  // Active districts and seats loaded dynamically from Database
  const [activeDistricts, setActiveDistricts] = useState<ActiveDistrictInfo[]>([]);
  const [totalDbVoters, setTotalDbVoters] = useState<number>(0);
  const [totalDbDistricts, setTotalDbDistricts] = useState<number>(0);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState<boolean>(true);

  // Cascading Selection: District first, then Seat (from DB)
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedSeat, setSelectedSeat] = useState<string>('');

  // Input Fields from Screenshot
  const [nameQuery, setNameQuery] = useState<string>('');
  const [fatherQuery, setFatherQuery] = useState<string>('');
  const [motherQuery, setMotherQuery] = useState<string>('');
  const [voterNoQuery, setVoterNoQuery] = useState<string>('');
  const [dobQuery, setDobQuery] = useState<string>('');
  const [occupationQuery, setOccupationQuery] = useState<string>('');
  const [isExact, setIsExact] = useState<boolean>(false);

  // Search execution state
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(true);
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

  // Perform search
  const handleSearch = useCallback(async (e?: React.FormEvent, overrideDist?: string, overrideSeat?: string) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    setHasSearched(true);

    const distToUse = overrideDist !== undefined ? overrideDist : selectedDistrict;
    const seatToUse = overrideSeat !== undefined ? overrideSeat : selectedSeat;

    try {
      const res = await searchVoters({
        district: distToUse && distToUse !== 'Select District' ? distToUse : undefined,
        seatNo: seatToUse && seatToUse !== 'সকল আসন' ? seatToUse : undefined,
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

  // Initial load search when selected district / seat is set
  useEffect(() => {
    if (selectedDistrict) {
      handleSearch(undefined, selectedDistrict, selectedSeat);
    }
  }, [selectedDistrict]);

  // Clear all filters
  const handleReset = () => {
    setNameQuery('');
    setFatherQuery('');
    setMotherQuery('');
    setVoterNoQuery('');
    setDobQuery('');
    setOccupationQuery('');
    setIsExact(false);
    if (activeDistricts.length > 0) {
      const defaultDist = activeDistricts[0].name;
      const defaultSeat = activeDistricts[0].seats.length > 0 ? activeDistricts[0].seats[0].seatNo : '';
      setSelectedDistrict(defaultDist);
      setSelectedSeat(defaultSeat);
      handleSearch(undefined, defaultDist, defaultSeat);
    }
  };

  // Restore sample demo if database is empty
  const handleRestoreDemoData = async () => {
    await restoreDefaultSampleRecords();
    await fetchDistricts(false);
    handleSearch();
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
      {/* Centered Advance Nid Data Finder Container */}
      <div className="max-w-md sm:max-w-lg mx-auto">
        {/* Dark Container wrapping the screenshot form */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 text-slate-100 relative overflow-hidden">
          {/* Subtle glow effect in background */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Admin Lock Icon (Discreet for Owner) */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              SEBAHUB NID FINDER
            </span>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              title="এডমিন ডাটাবেজ প্যানেল (ম্যানেজ / আপলোড)"
              className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-slate-800 transition flex items-center gap-1.5 text-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">ডাটাবেজ এডমিন</span>
            </button>
          </div>

          {/* Main Title & Subtitle */}
          <div className="text-center space-y-1.5 pt-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Advance Nid Data Finder
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              ভোটার নম্বর আনলক চার্জ: 100 টাকা
            </p>
          </div>

          {/* Stats Box (Districts & Voters) */}
          <div className="bg-[#121826] border border-slate-800/80 rounded-2xl p-4 grid grid-cols-2 text-center divide-x divide-slate-800">
            <div className="px-2">
              <div className="text-xl sm:text-2xl font-bold text-white tracking-wide font-mono">
                {totalDbDistricts > 0 ? totalDbDistricts : '64'}
              </div>
              <div className="text-xs text-slate-400 font-medium mt-0.5">
                {totalDbDistricts > 0 ? 'Active Districts' : 'Districts'}
              </div>
            </div>
            <div className="px-2">
              <div className="text-xl sm:text-2xl font-bold text-white tracking-wide font-mono">
                {totalDbVoters > 0 ? totalDbVoters.toLocaleString('en-US') : '124,259,613'}
              </div>
              <div className="text-xs text-slate-400 font-medium mt-0.5">
                {totalDbVoters > 0 ? 'Added Voters' : 'Voters'}
              </div>
            </div>
          </div>

          {/* Empty DB Notice if 0 districts added */}
          {activeDistricts.length === 0 && !isLoadingDistricts && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>ডাটাবেজে এখনও কোনো জেলা বা আসন যুক্ত করা হয়নি।</span>
              </div>
              <p className="text-[11px] text-amber-200/80">
                এডমিন প্যানেলে প্রবেশ করে জিপ ফাইল, সিএসভি আপলোড করুন অথবা প্রাথমিক ডেমো ডাটাবেজ রিস্টোর করুন।
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRestoreDemoData}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition"
                >
                  ডেমো ডাটা লোড করুন (ঢাকা-১০, কুমিল্লা-৬, বগুড়া-৬)
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs transition"
                >
                  ফাইল আপলোড করুন
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSearch} className="space-y-3.5 pt-1">
            {/* 1. Select District Dropdown (Only Added Districts from DB) */}
            <div className="relative">
              <select
                id="select-district-field"
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full h-12 px-4 bg-[#121826] border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-sm font-medium text-slate-100 appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500 transition cursor-pointer"
              >
                {activeDistricts.length === 0 ? (
                  <option value="">Select District (কোন জেলা যুক্ত নেই)</option>
                ) : (
                  <>
                    <option value="">Select District (জেলা নির্বাচন)</option>
                    {activeDistricts.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name} {d.nameEn ? `(${d.nameEn})` : ''} — {d.seats.length}টি আসন ({d.totalVoters.toLocaleString('en-US')} জন)
                      </option>
                    ))}
                  </>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* 2. Select Seat Dropdown (Only Added Seats for that District from DB) */}
            {selectedDistrict && currentDistrictObj && currentDistrictObj.seats.length > 0 && (
              <div className="relative animate-fadeIn">
                <select
                  id="select-seat-field"
                  value={selectedSeat}
                  onChange={(e) => setSelectedSeat(e.target.value)}
                  className="w-full h-12 px-4 bg-[#121826] border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-sm font-medium text-emerald-300 appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500 transition cursor-pointer"
                >
                  <option value="সকল আসন">সকল আসন ({selectedDistrict} জেলা - {currentDistrictObj.totalVoters.toLocaleString('en-US')} জন)</option>
                  {availableSeats.map((s) => (
                    <option key={s.seatNo} value={s.seatNo}>
                      {s.seatNo} ({s.count.toLocaleString('en-US')} জন ভোটার)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* 3. Search by name... */}
            <div>
              <input
                id="input-search-by-name"
                type="text"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder="Search by name..."
                className="w-full h-12 px-4 bg-[#121826] border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* 4. Father's name... */}
            <div>
              <input
                id="input-father-name"
                type="text"
                value={fatherQuery}
                onChange={(e) => setFatherQuery(e.target.value)}
                placeholder="Father's name..."
                className="w-full h-12 px-4 bg-[#121826] border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* 5. Mother's name... */}
            <div>
              <input
                id="input-mother-name"
                type="text"
                value={motherQuery}
                onChange={(e) => setMotherQuery(e.target.value)}
                placeholder="Mother's name..."
                className="w-full h-12 px-4 bg-[#121826] border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* 6. Voter no... */}
            <div>
              <input
                id="input-voter-no"
                type="text"
                value={voterNoQuery}
                onChange={(e) => setVoterNoQuery(e.target.value)}
                placeholder="Voter no..."
                className="w-full h-12 px-4 bg-[#121826] border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition font-mono"
              />
            </div>

            {/* 7. DOB (YYYY-MM-DD) */}
            <div>
              <input
                id="input-dob"
                type="text"
                value={dobQuery}
                onChange={(e) => setDobQuery(e.target.value)}
                placeholder="DOB (YYYY-MM-DD)"
                className="w-full h-12 px-4 bg-[#121826] border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition font-mono"
              />
            </div>

            {/* 8. Occupation... */}
            <div>
              <input
                id="input-occupation"
                type="text"
                value={occupationQuery}
                onChange={(e) => setOccupationQuery(e.target.value)}
                placeholder="Occupation..."
                className="w-full h-12 px-4 bg-[#121826] border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* 9. Bright Green Search Button */}
            <div className="pt-1">
              <button
                id="btn-advance-search"
                type="submit"
                disabled={isSearching}
                className="w-full h-12 bg-[#238636] hover:bg-[#2ea043] active:bg-[#1f702d] text-white font-bold text-base rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>খোঁজা হচ্ছে...</span>
                  </>
                ) : (
                  <span>Search</span>
                )}
              </button>
            </div>

            {/* 10. Exact Switch Toggle */}
            <div className="flex items-center justify-between pt-1 px-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="toggle-exact-switch"
                  onClick={() => setIsExact(!isExact)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                    isExact ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform"></span>
                </button>
                <label
                  onClick={() => setIsExact(!isExact)}
                  className="text-sm font-medium text-slate-300 cursor-pointer select-none"
                >
                  Exact
                </label>
              </div>

              {(nameQuery || fatherQuery || motherQuery || voterNoQuery || dobQuery || occupationQuery) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>রিসেট</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Results Header & Summary */}
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">
              ফলাফল: <span className="text-emerald-700 font-mono font-black">{totalMatches}</span> জন ভোটার পাওয়া গেছে
            </h2>
            {selectedDistrict && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                জেলা: {selectedDistrict} {selectedSeat && selectedSeat !== 'সকল আসন' ? `(${selectedSeat})` : ''}
              </span>
            )}
            {isExact && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                EXACT MATCH
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-3">
            <span>স্লিপ প্রিন্ট অথবা সরাসরি কপি করে কাস্টমারকে দিতে পারবেন</span>
          </div>
        </div>

        {/* Results List */}
        {isSearching ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-bold text-slate-700">ভোটার ডাটাবেজ সার্চ হচ্ছে...</p>
            <p className="text-xs text-slate-400 mt-1">অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">কোন ভোটার তথ্য পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              অনুরোধ: জেলা পরিবর্তন করে দেখুন অথবা নামের বানান বাংলায় বা ইংরেজিতে কিছুটা পরিবর্তন করে সার্চ করুন। 'Exact' অফ রেখে আংশিক নাম দিয়েও চেষ্টা করতে পারেন।
            </p>
            {activeDistricts.length > 0 && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ফিল্টার রিসেট করে প্রথম আসনের তালিকা দেখুন</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchResults.map((voter) => (
              <div
                key={voter.id}
                className="bg-white border border-slate-200 hover:border-emerald-500/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition space-y-3.5 relative group"
              >
                {/* Voter Card Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900">
                        {voter.nameBn}
                      </span>
                      {voter.gender && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold uppercase">
                          {voter.gender === 'male' ? 'পুরুষ' : voter.gender === 'female' ? 'মহিলা' : voter.gender}
                        </span>
                      )}
                    </div>
                    {voter.nameEn && (
                      <p className="text-xs font-mono text-slate-500 font-semibold uppercase">
                        {voter.nameEn}
                      </p>
                    )}
                  </div>

                  <span className="text-[11px] font-black px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                    {voter.seatNo}
                  </span>
                </div>

                {/* Voter Numbers Grid (Voter No & NID No with Copy) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">ভোটার নং:</span>
                    <button
                      onClick={() => handleCopySingle(voter.voterNo, voter.id)}
                      className="font-mono font-bold text-slate-800 hover:text-emerald-600 flex items-center gap-1 group/btn"
                      title="কপি করতে ক্লিক করুন"
                    >
                      <span>{voter.voterNo}</span>
                      {copiedId === `${voter.id}-${voter.voterNo}` ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400 group-hover/btn:text-emerald-600 opacity-0 group-hover:opacity-100 transition" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">NID নং:</span>
                    <button
                      onClick={() => handleCopySingle(voter.nidNo, voter.id)}
                      className="font-mono font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 group/btn"
                      title="কপি করতে ক্লিক করুন"
                    >
                      <span>{voter.nidNo}</span>
                      {copiedId === `${voter.id}-${voter.nidNo}` ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400 group-hover/btn:text-blue-600 opacity-0 group-hover:opacity-100 transition" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Details Table */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">পিতার নাম</span>
                    <span className="font-semibold">{voter.fatherName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">মাতার নাম</span>
                    <span className="font-semibold">{voter.motherName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">জন্ম তারিখ</span>
                    <span className="font-mono font-semibold">{voter.dob || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">পেশা / রক্ত</span>
                    <span className="font-semibold">
                      {voter.occupation || '—'} {voter.bloodGroup ? `(${voter.bloodGroup})` : ''}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">ঠিকানা ও কেন্দ্র</span>
                    <p className="text-slate-600 text-[11px] leading-tight">
                      {voter.villageArea}, {voter.unionWard}, {voter.upazilaThana}, {voter.district}
                    </p>
                    <p className="text-slate-500 text-[10px] mt-0.5 font-medium">
                      কেন্দ্র: {voter.pollingCenter}
                    </p>
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleCopyVoter(voter)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    {copiedId === voter.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">কপি হয়েছে</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>তথ্য কপি</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setSlipVoter(voter)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>স্লিপ প্রিন্ট (Print Slip)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slip Modal */}
      {slipVoter && (
        <VoterSlipModal
          voter={slipVoter}
          isOpen={!!slipVoter}
          onClose={() => setSlipVoter(null)}
        />
      )}

      {/* Admin Database Management Modal (PIN Protected) */}
      {isAdminModalOpen && (
        <AdminVoterDbModal
          isOpen={isAdminModalOpen}
          onClose={() => {
            setIsAdminModalOpen(false);
            fetchDistricts();
          }}
          onDataChanged={() => {
            fetchDistricts(false);
            handleSearch();
          }}
        />
      )}
    </div>
  );
};
