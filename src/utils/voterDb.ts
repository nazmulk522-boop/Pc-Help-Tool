import JSZip from 'jszip';
import { VoterRecord, VoterSearchField } from '../types';
import { INITIAL_SAMPLE_VOTERS } from '../data/sampleVoters';
import { BANGLADESH_DISTRICTS } from '../data/bangladeshSeats';

const DB_NAME = 'BD_VOTER_HUB_DB_V2';
const DB_VERSION = 1;
const STORE_NAME = 'voter_records';
const ADMIN_PIN_KEY = 'voter_hub_admin_pin_v2';
const DEFAULT_ADMIN_PIN = '1234';

// Open / Upgrade IndexedDB
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('seatNo', 'seatNo', { unique: false });
        store.createIndex('district', 'district', { unique: false });
        store.createIndex('voterNo', 'voterNo', { unique: false });
        store.createIndex('nidNo', 'nidNo', { unique: false });
        store.createIndex('nameBn', 'nameBn', { unique: false });
        store.createIndex('fatherName', 'fatherName', { unique: false });
        store.createIndex('motherName', 'motherName', { unique: false });
        store.createIndex('dob', 'dob', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Seed with default realistic sample voters if empty
export async function ensureDatabaseInitialized(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const countReq = store.count();

    countReq.onsuccess = () => {
      if (countReq.result === 0) {
        // Insert sample voters
        for (const voter of INITIAL_SAMPLE_VOTERS) {
          store.put(voter);
        }
      }
      resolve();
    };

    countReq.onerror = () => reject(countReq.error);
  });
}

// Bengali and English text normalization for accurate search
export function normalizeSearchString(str?: string | number | null): string {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .normalize('NFC')
    .replace(/[.,\-/\\#+()$~%'":*?<>{}]/g, ' ')
    .replace(/\s+/g, ' ');
}

// Fast Search Query & Multi-Field Filters
export interface SearchFilters {
  division?: string;
  district?: string;
  seatNo?: string;
  searchField?: VoterSearchField;
  query?: string;
  name?: string;
  fatherName?: string;
  motherName?: string;
  voterNo?: string;
  dob?: string;
  occupation?: string;
  exact?: boolean;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  voters: VoterRecord[];
  totalMatches: number;
  page: number;
  totalPages: number;
}

export async function searchVoters(filters: SearchFilters): Promise<SearchResult> {
  await ensureDatabaseInitialized();
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const results: VoterRecord[] = [];

    const normQuery = filters.query ? normalizeSearchString(filters.query) : '';
    const normName = filters.name ? normalizeSearchString(filters.name) : '';
    const normFather = filters.fatherName ? normalizeSearchString(filters.fatherName) : '';
    const normMother = filters.motherName ? normalizeSearchString(filters.motherName) : '';
    const normVoterNo = filters.voterNo ? normalizeSearchString(filters.voterNo) : '';
    const normDob = filters.dob ? normalizeSearchString(filters.dob) : '';
    const normOcc = filters.occupation ? normalizeSearchString(filters.occupation) : '';
    const isExact = !!filters.exact;

    const targetSeat = filters.seatNo && filters.seatNo !== 'সকল আসন' && filters.seatNo !== 'All Seats' ? filters.seatNo.trim() : '';
    const targetDistrict = filters.district && filters.district !== 'Select District' && filters.district !== 'সকল জেলা' ? filters.district.trim() : '';
    const targetDivision = filters.division && filters.division !== 'সকল বিভাগ' ? filters.division.trim() : '';
    const field = filters.searchField || 'all';

    const cursorReq = targetSeat
      ? store.index('seatNo').openCursor(IDBKeyRange.only(targetSeat))
      : targetDistrict
      ? store.index('district').openCursor(IDBKeyRange.only(targetDistrict))
      : store.openCursor();

    cursorReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const voter: VoterRecord = cursor.value;

        // Seat & District verification
        let match = true;
        if (targetSeat && voter.seatNo !== targetSeat) match = false;
        if (targetDistrict && voter.district !== targetDistrict) match = false;
        if (targetDivision && voter.division !== targetDivision) match = false;

        // Multi-field exact/includes check
        if (match) {
          const testMatch = (targetVal?: string | number | null, queryVal?: string): boolean => {
            if (!queryVal) return true;
            if (!targetVal) return false;
            const normTarget = normalizeSearchString(targetVal);
            if (isExact) {
              return normTarget === queryVal;
            }
            return normTarget.includes(queryVal);
          };

          // Check individual inputs
          if (normName) {
            const nameMatch = testMatch(voter.nameBn, normName) || testMatch(voter.nameEn, normName);
            if (!nameMatch) match = false;
          }

          if (match && normFather) {
            if (!testMatch(voter.fatherName, normFather)) match = false;
          }

          if (match && normMother) {
            if (!testMatch(voter.motherName, normMother)) match = false;
          }

          if (match && normVoterNo) {
            const voterMatch = 
              testMatch(voter.voterNo, normVoterNo) || 
              testMatch(voter.nidNo, normVoterNo) || 
              testMatch(voter.formNo, normVoterNo);
            if (!voterMatch) match = false;
          }

          if (match && normDob) {
            const dobNorm = normalizeSearchString(voter.dob);
            const dobClean = normDob.replace(/[-/]/g, ' ');
            if (isExact) {
              if (dobNorm !== normDob && dobNorm.replace(/[-/]/g, ' ') !== dobClean) match = false;
            } else {
              if (!dobNorm.includes(normDob) && !dobNorm.includes(dobClean)) match = false;
            }
          }

          if (match && normOcc) {
            const occMatch = testMatch(voter.occupation, normOcc) || testMatch(voter.villageArea, normOcc);
            if (!occMatch) match = false;
          }

          // Check generic query if present
          if (match && normQuery) {
            match = matchesQuery(voter, normQuery, field, isExact);
          }
        }

        if (match) {
          results.push(voter);
        }

        cursor.continue();
      } else {
        // Pagination
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const totalMatches = results.length;
        const totalPages = Math.ceil(totalMatches / limit) || 1;
        const startIndex = (page - 1) * limit;
        const pagedVoters = results.slice(startIndex, startIndex + limit);

        resolve({
          voters: pagedVoters,
          totalMatches,
          page,
          totalPages,
        });
      }
    };

    cursorReq.onerror = () => reject(cursorReq.error);
  });
}

function matchesQuery(voter: VoterRecord, normQuery: string, field: VoterSearchField, isExact = false): boolean {
  if (!normQuery) return true;

  const check = (val?: string | number | null) => {
    if (!val) return false;
    const norm = normalizeSearchString(val);
    return isExact ? norm === normQuery : norm.includes(normQuery);
  };

  switch (field) {
    case 'name':
      return check(voter.nameBn) || check(voter.nameEn);
    case 'father':
      return check(voter.fatherName);
    case 'mother':
      return check(voter.motherName);
    case 'dob':
      return check(voter.dob);
    case 'nid':
      return check(voter.nidNo) || check(voter.formNo);
    case 'voter_no':
      return check(voter.voterNo);
    case 'address':
      return (
        check(voter.villageArea) ||
        check(voter.unionWard) ||
        check(voter.upazilaThana) ||
        check(voter.pollingCenter) ||
        check(voter.voterAreaCode)
      );
    case 'serial':
      return check(voter.serialNo);
    case 'all':
    default:
      return (
        check(voter.nameBn) ||
        check(voter.nameEn) ||
        check(voter.fatherName) ||
        check(voter.motherName) ||
        check(voter.spouseName) ||
        check(voter.voterNo) ||
        check(voter.nidNo) ||
        check(voter.formNo) ||
        check(voter.dob) ||
        check(voter.villageArea) ||
        check(voter.unionWard) ||
        check(voter.upazilaThana) ||
        check(voter.pollingCenter) ||
        check(voter.voterAreaCode) ||
        check(voter.serialNo)
      );
  }
}

// Stats & Seat-wise record count
export interface SeatStat {
  seatNo: string;
  district: string;
  division: string;
  count: number;
}

export interface DbStats {
  totalVoters: number;
  totalSeats: number;
  seatStats: SeatStat[];
}

export async function getDatabaseStats(): Promise<DbStats> {
  await ensureDatabaseInitialized();
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const seatMap: Record<string, { district: string; division: string; count: number }> = {};
    let totalVoters = 0;

    const cursorReq = store.openCursor();
    cursorReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        totalVoters++;
        const voter: VoterRecord = cursor.value;
        const seat = voter.seatNo || 'অনির্ধারিত আসন';
        if (!seatMap[seat]) {
          seatMap[seat] = {
            district: voter.district || '',
            division: voter.division || '',
            count: 0,
          };
        }
        seatMap[seat].count++;
        cursor.continue();
      } else {
        const seatStats: SeatStat[] = Object.entries(seatMap).map(([seatNo, data]) => ({
          seatNo,
          district: data.district,
          division: data.division,
          count: data.count,
        })).sort((a, b) => b.count - a.count);

        resolve({
          totalVoters,
          totalSeats: seatStats.length,
          seatStats,
        });
      }
    };

    cursorReq.onerror = () => reject(cursorReq.error);
  });
}

// Active Districts and Seats that actually have data added in the database
export interface ActiveSeatInfo {
  seatNo: string;
  count: number;
}

export interface ActiveDistrictInfo {
  name: string;
  nameEn?: string;
  totalVoters: number;
  seats: ActiveSeatInfo[];
}

export async function getActiveDistrictsAndSeats(): Promise<{
  districts: ActiveDistrictInfo[];
  totalVoters: number;
  totalDistricts: number;
  totalSeats: number;
}> {
  const stats = await getDatabaseStats();
  const districtMap: Record<string, { totalVoters: number; seats: Record<string, number> }> = {};

  for (const item of stats.seatStats) {
    let distName = item.district?.trim();
    if (!distName || distName === 'অনির্ধারিত জেলা') {
      const deduced = deduceDistrictAndDivision(item.seatNo);
      distName = deduced.district || 'ঢাকা';
    } else {
      const match = BANGLADESH_DISTRICTS.find(
        (d) => d.nameBn === distName || d.nameEn.toLowerCase() === distName.toLowerCase()
      );
      if (match) distName = match.nameBn;
    }

    if (!districtMap[distName]) {
      districtMap[distName] = { totalVoters: 0, seats: {} };
    }
    districtMap[distName].totalVoters += item.count;
    const seatName = item.seatNo || 'অনির্ধারিত আসন';
    districtMap[distName].seats[seatName] = (districtMap[distName].seats[seatName] || 0) + item.count;
  }

  const districts: ActiveDistrictInfo[] = Object.entries(districtMap).map(([name, data]) => {
    const distMeta = BANGLADESH_DISTRICTS.find((d) => d.nameBn === name);
    return {
      name,
      nameEn: distMeta?.nameEn,
      totalVoters: data.totalVoters,
      seats: Object.entries(data.seats)
        .map(([seatNo, count]) => ({
          seatNo,
          count,
        }))
        .sort((a, b) => a.seatNo.localeCompare(b.seatNo, 'bn')),
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'bn'));

  return {
    districts,
    totalVoters: stats.totalVoters,
    totalDistricts: districts.length,
    totalSeats: stats.totalSeats,
  };
}

// Bulk Insert Records
export async function bulkInsertVoters(records: VoterRecord[]): Promise<number> {
  if (records.length === 0) return 0;
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    let inserted = 0;

    for (const record of records) {
      // Ensure unique ID
      if (!record.id) {
        record.id = `vtr-${record.seatNo || 'gen'}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      }
      store.put(record);
      inserted++;
    }

    tx.oncomplete = () => resolve(inserted);
    tx.onerror = () => reject(tx.error);
  });
}

// Delete Seat Records
export async function deleteVotersBySeat(seatNo: string): Promise<number> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    let deleted = 0;

    // Open cursor over all records to safely match exact or trimmed/normalized seatNo
    const normalizedTarget = seatNo.trim().toLowerCase();
    const req = store.openCursor();

    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const item: VoterRecord = cursor.value;
        const currentSeat = (item.seatNo || '').trim().toLowerCase();
        
        if (currentSeat === normalizedTarget || item.seatNo === seatNo) {
          cursor.delete();
          deleted++;
        }
        cursor.continue();
      }
    };

    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve(deleted);
    tx.onerror = () => reject(tx.error);
  });
}

// Clear all records
export async function clearEntireDatabase(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Restore default demo records
export async function restoreDefaultSampleRecords(): Promise<number> {
  await clearEntireDatabase();
  return await bulkInsertVoters(INITIAL_SAMPLE_VOTERS);
}

// Add or edit single voter record
export async function saveSingleVoter(voter: VoterRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    if (!voter.id) {
      voter.id = `vtr-${voter.seatNo || 'seat'}-${Date.now()}`;
    }
    const req = store.put(voter);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Delete single voter
export async function deleteSingleVoter(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ----------------- FILE PARSERS (CSV / JSON / ZIP) -----------------

// Helper to deduce District from Seat Name (e.g. "ঢাকা-১০" -> "ঢাকা", "কুমিল্লা-৬" -> "কুমিল্লা")
export function deduceDistrictAndDivision(seatNo: string, fallbackDistrict = 'ঢাকা'): { district: string; division: string } {
  const clean = seatNo.split('-')[0].trim();
  for (const dist of BANGLADESH_DISTRICTS) {
    if (clean === dist.nameBn || dist.nameEn.toLowerCase() === clean.toLowerCase() || seatNo.includes(dist.nameBn)) {
      return { district: dist.nameBn, division: dist.divisionBn };
    }
  }
  return { district: fallbackDistrict, division: 'ঢাকা' };
}

// Smart CSV Parser (handles comma, tab, semicolon delimiters)
export function parseVotersFromCsv(csvText: string, defaultDistrict = 'ঢাকা', defaultSeat = 'ঢাকা-১০'): VoterRecord[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Detect delimiter: comma or tab or semicolon
  const headerLine = lines[0];
  let delimiter = ',';
  if (headerLine.includes('\t')) delimiter = '\t';
  else if (headerLine.includes(';') && !headerLine.includes(',')) delimiter = ';';

  const rawHeaders = headerLine.split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim());

  // Map header indexes
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    const lower = h.toLowerCase();
    if (lower.includes('name') || lower.includes('নাম') || lower.includes('voter_name')) headerMap['name'] = idx;
    if (lower.includes('father') || lower.includes('পিতা') || lower.includes('f_name')) headerMap['father'] = idx;
    if (lower.includes('mother') || lower.includes('মাতা') || lower.includes('m_name')) headerMap['mother'] = idx;
    if (lower.includes('spouse') || lower.includes('স্বামী') || lower.includes('স্ত্রী')) headerMap['spouse'] = idx;
    if (lower.includes('nid') || lower.includes('জাতীয়') || lower.includes('এনআইডি') || lower.includes('smart_id')) headerMap['nid'] = idx;
    if (lower.includes('voter_no') || lower.includes('ভোটার নং') || lower.includes('voterno') || lower.includes('pin')) headerMap['voter_no'] = idx;
    if (lower.includes('form') || lower.includes('ফরম')) headerMap['form_no'] = idx;
    if (lower.includes('dob') || lower.includes('জন্ম') || lower.includes('birth')) headerMap['dob'] = idx;
    if (lower.includes('gender') || lower.includes('লিঙ্গ') || lower.includes('sex')) headerMap['gender'] = idx;
    if (lower.includes('blood') || lower.includes('রক্ত')) headerMap['blood'] = idx;
    if (lower.includes('serial') || lower.includes('ক্রমিক') || lower.includes('sl') || lower.includes('no')) headerMap['serial'] = idx;
    if (lower.includes('address') || lower.includes('ঠিকানা') || lower.includes('গ্রাম') || lower.includes('মহল্লা')) headerMap['address'] = idx;
    if (lower.includes('thana') || lower.includes('উপজেলা') || lower.includes('থানা')) headerMap['thana'] = idx;
    if (lower.includes('ward') || lower.includes('ওয়ার্ড') || lower.includes('union') || lower.includes('ইউনিয়ন')) headerMap['ward'] = idx;
    if (lower.includes('center') || lower.includes('কেন্দ্র') || lower.includes('ভোটকেন্দ্র')) headerMap['center'] = idx;
    if (lower.includes('area_code') || lower.includes('এলাকা কোড')) headerMap['area_code'] = idx;
    if (lower.includes('seat') || lower.includes('আসন')) headerMap['seat'] = idx;
    if (lower.includes('district') || lower.includes('জেলা')) headerMap['district'] = idx;
  });

  const parsed: VoterRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());
    if (cols.length === 0 || !cols.some((c) => c.length > 0)) continue;

    const seat = (headerMap['seat'] !== undefined ? cols[headerMap['seat']] : '') || defaultSeat;
    const { district, division } = deduceDistrictAndDivision(seat, defaultDistrict);

    const record: VoterRecord = {
      id: `vtr-${seat}-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      serialNo: headerMap['serial'] !== undefined ? cols[headerMap['serial']] : `${i}`,
      nameBn: (headerMap['name'] !== undefined ? cols[headerMap['name']] : cols[1] || cols[0]) || 'অজ্ঞাত নাম',
      fatherName: (headerMap['father'] !== undefined ? cols[headerMap['father']] : cols[2]) || '',
      motherName: (headerMap['mother'] !== undefined ? cols[headerMap['mother']] : cols[3]) || '',
      spouseName: headerMap['spouse'] !== undefined ? cols[headerMap['spouse']] : '',
      dob: (headerMap['dob'] !== undefined ? cols[headerMap['dob']] : cols[4]) || '',
      nidNo: (headerMap['nid'] !== undefined ? cols[headerMap['nid']] : cols[5] || cols[0]) || `NID${Date.now()}${i}`,
      voterNo: (headerMap['voter_no'] !== undefined ? cols[headerMap['voter_no']] : cols[6] || cols[0]) || `VTR${Date.now()}${i}`,
      formNo: headerMap['form_no'] !== undefined ? cols[headerMap['form_no']] : '',
      gender: headerMap['gender'] !== undefined ? cols[headerMap['gender']] : 'male',
      bloodGroup: headerMap['blood'] !== undefined ? cols[headerMap['blood']] : '',
      division,
      district,
      seatNo: seat,
      seatNameBn: seat,
      upazilaThana: (headerMap['thana'] !== undefined ? cols[headerMap['thana']] : '') || district,
      unionWard: headerMap['ward'] !== undefined ? cols[headerMap['ward']] : '',
      villageArea: (headerMap['address'] !== undefined ? cols[headerMap['address']] : '') || 'উপজেলা এলাকা',
      pollingCenter: (headerMap['center'] !== undefined ? cols[headerMap['center']] : '') || 'স্থানীয় ভোট কেন্দ্র',
      voterAreaCode: headerMap['area_code'] !== undefined ? cols[headerMap['area_code']] : '',
      createdAt: new Date().toISOString().split('T')[0],
    };

    parsed.push(record);
  }

  return parsed;
}

// Smart JSON Parser
export function parseVotersFromJson(jsonData: any, defaultDistrict = 'ঢাকা', defaultSeat = 'ঢাকা-১০'): VoterRecord[] {
  const list = Array.isArray(jsonData) ? jsonData : jsonData.voters || jsonData.data || [jsonData];
  const parsed: VoterRecord[] = [];

  list.forEach((item: any, idx: number) => {
    if (!item || typeof item !== 'object') return;

    const seat = item.seatNo || item.seat || item.seat_no || item.সংসদীয়_আসন || defaultSeat;
    const { district, division } = deduceDistrictAndDivision(seat, item.district || defaultDistrict);

    const record: VoterRecord = {
      id: item.id || `vtr-${seat}-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      serialNo: item.serialNo || item.serial || item.sl || item.ক্রমিক_নং || `${idx + 1}`,
      nameBn: item.nameBn || item.name || item.voterName || item.নাম || 'অজ্ঞাত নাম',
      nameEn: item.nameEn || item.englishName || item.name_en || '',
      fatherName: item.fatherName || item.father || item.fName || item.পিতার_নাম || '',
      motherName: item.motherName || item.mother || item.mName || item.মাতার_নাম || '',
      spouseName: item.spouseName || item.spouse || item.স্বামী_স্ত্রীর_নাম || '',
      dob: item.dob || item.birthDate || item.dateOfBirth || item.জন্ম_তারিখ || '',
      nidNo: String(item.nidNo || item.nid || item.nationalId || item.জাতীয়_পরিচয়পত্র_নং || `NID${Date.now()}${idx}`),
      voterNo: String(item.voterNo || item.voter_no || item.voterId || item.ভোটার_নং || `VTR${Date.now()}${idx}`),
      formNo: item.formNo || item.form_no || item.ফরম_নং || '',
      gender: item.gender || item.লিঙ্গ || 'male',
      bloodGroup: item.bloodGroup || item.blood_group || item.রক্তের_গ্রুপ || '',
      occupation: item.occupation || item.পেশা || '',
      division: item.division || item.বিভাগ || division,
      district: item.district || item.জেলা || district,
      seatNo: seat,
      seatNameBn: item.seatNameBn || item.seat_name || seat,
      upazilaThana: item.upazilaThana || item.upazila || item.thana || item.উপজেলা || item.থানা || district,
      unionWard: item.unionWard || item.ward || item.union || item.ওয়ার্ড || item.ইউনিয়ন || '',
      villageArea: item.villageArea || item.address || item.village || item.ঠিকানা || item.গ্রাম || 'সদর এলাকা',
      pollingCenter: item.pollingCenter || item.center || item.ভোট_কেন্দ্র || 'ভোট কেন্দ্র',
      voterAreaCode: item.voterAreaCode || item.areaCode || item.ভোটার_এলাকা_কোড || '',
      voterAreaName: item.voterAreaName || item.areaName || '',
      photoUrl: item.photoUrl || item.photo || '',
      createdAt: item.createdAt || new Date().toISOString().split('T')[0],
    };

    parsed.push(record);
  });

  return parsed;
}

// Unzip and Parse All Files in a ZIP Archive
export async function parseVotersFromZip(
  zipBuffer: ArrayBuffer,
  onProgress?: (msg: string, percent: number) => void
): Promise<{ totalImported: number; seats: string[]; filesCount: number }> {
  const zip = new JSZip();
  onProgress?.('জিপ ফাইল আনপ্যাক করা হচ্ছে...', 10);
  const loadedZip = await zip.loadAsync(zipBuffer);

  const files = Object.keys(loadedZip.files).filter((fileName) => !loadedZip.files[fileName].dir);
  let totalImported = 0;
  const seatsAffected = new Set<string>();

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const file = loadedZip.files[fileName];
    const progressPercent = Math.round(20 + ((i + 1) / files.length) * 70);
    onProgress?.(`ফাইল প্রসেস হচ্ছে (${i + 1}/${files.length}): ${fileName}`, progressPercent);

    // Guess seat from filename (e.g., "Dhaka-10_Voters.json" or "Comilla-6.csv" or "বগুড়া-৬.txt")
    let guessedSeat = 'ঢাকা-১০';
    const baseName = fileName.replace(/\.[^/.]+$/, '').trim();
    for (const d of BANGLADESH_DISTRICTS) {
      for (const s of d.seats) {
        if (fileName.includes(s) || baseName.includes(s) || fileName.toLowerCase().includes(s.toLowerCase())) {
          guessedSeat = s;
          break;
        }
      }
    }

    const { district } = deduceDistrictAndDivision(guessedSeat);

    if (fileName.endsWith('.json')) {
      const text = await file.async('text');
      try {
        const json = JSON.parse(text);
        const records = parseVotersFromJson(json, district, guessedSeat);
        if (records.length > 0) {
          await bulkInsertVoters(records);
          totalImported += records.length;
          records.forEach((r) => seatsAffected.add(r.seatNo));
        }
      } catch (err) {
        console.warn(`JSON parse error in ${fileName}:`, err);
      }
    } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileName.endsWith('.tsv')) {
      const text = await file.async('text');
      const records = parseVotersFromCsv(text, district, guessedSeat);
      if (records.length > 0) {
        await bulkInsertVoters(records);
        totalImported += records.length;
        records.forEach((r) => seatsAffected.add(r.seatNo));
      }
    }
  }

  onProgress?.(`সম্পন্ন! মোট ${totalImported} টি রেকর্ড সফলভাবে ডাটাবেজে যুক্ত হয়েছে।`, 100);

  return {
    totalImported,
    seats: Array.from(seatsAffected),
    filesCount: files.length,
  };
}

// ----------------- ADMIN SECURITY & PIN MANAGEMENT -----------------

export function getAdminPin(): string {
  return localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_ADMIN_PIN;
}

export function setAdminPin(newPin: string): boolean {
  if (!newPin || newPin.trim().length < 4) return false;
  localStorage.setItem(ADMIN_PIN_KEY, newPin.trim());
  return true;
}

export function verifyAdminPin(enteredPin: string): boolean {
  const currentPin = getAdminPin();
  return enteredPin.trim() === currentPin;
}

export function isSessionAdminUnlocked(): boolean {
  return sessionStorage.getItem('voter_admin_unlocked') === 'true';
}

export function setSessionAdminUnlocked(unlocked: boolean): void {
  if (unlocked) {
    sessionStorage.setItem('voter_admin_unlocked', 'true');
  } else {
    sessionStorage.removeItem('voter_admin_unlocked');
  }
}
