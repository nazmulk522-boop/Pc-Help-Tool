import JSZip from 'jszip';
import { VoterRecord, VoterSearchField } from '../types';
import { INITIAL_SAMPLE_VOTERS } from '../data/sampleVoters';
import { BANGLADESH_DISTRICTS } from '../data/bangladeshSeats';
import { bnToEnDigits } from './pdfVoterParser';

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

// Database initialization
export async function ensureDatabaseInitialized(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const countReq = store.count();
    countReq.onsuccess = () => resolve();
    countReq.onerror = () => reject(countReq.error);
  });
}

// Bengali and English text normalization for accurate search
export function normalizeSearchString(str?: string | number | null): string {
  if (!str) return '';
  const converted = bnToEnDigits(String(str));
  return converted
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
            if (!testMatch(voter.occupation, normOcc)) match = false;
          }

          // Single general query check across all fields
          if (match && normQuery) {
            let queryMatched = false;
            switch (field) {
              case 'voter_no':
                queryMatched = testMatch(voter.voterNo, normQuery);
                break;
              case 'nid':
                queryMatched = testMatch(voter.nidNo, normQuery);
                break;
              case 'name':
                queryMatched = testMatch(voter.nameBn, normQuery) || testMatch(voter.nameEn, normQuery);
                break;
              case 'father':
                queryMatched = testMatch(voter.fatherName, normQuery);
                break;
              case 'mother':
                queryMatched = testMatch(voter.motherName, normQuery);
                break;
              case 'dob':
                queryMatched = testMatch(voter.dob, normQuery);
                break;
              case 'address':
                queryMatched = testMatch(voter.villageArea, normQuery) || testMatch(voter.unionWard, normQuery) || testMatch(voter.upazilaThana, normQuery);
                break;
              case 'serial':
                queryMatched = testMatch(voter.serialNo, normQuery);
                break;
              case 'all':
              default:
                queryMatched =
                  testMatch(voter.nameBn, normQuery) ||
                  testMatch(voter.nameEn, normQuery) ||
                  testMatch(voter.fatherName, normQuery) ||
                  testMatch(voter.motherName, normQuery) ||
                  testMatch(voter.spouseName, normQuery) ||
                  testMatch(voter.voterNo, normQuery) ||
                  testMatch(voter.nidNo, normQuery) ||
                  testMatch(voter.formNo, normQuery) ||
                  testMatch(voter.dob, normQuery) ||
                  testMatch(voter.villageArea, normQuery) ||
                  testMatch(voter.unionWard, normQuery) ||
                  testMatch(voter.upazilaThana, normQuery) ||
                  testMatch(voter.pollingCenter, normQuery);
                break;
            }
            if (!queryMatched) match = false;
          }
        }

        if (match) {
          results.push(voter);
        }

        // Limit results for fast response
        const maxLimit = filters.limit || 200;
        if (results.length >= maxLimit) {
          // Finish cursor early
          const page = filters.page || 1;
          resolve({
            voters: results,
            totalMatches: results.length,
            page,
            totalPages: 1,
          });
          return;
        }

        cursor.continue();
      } else {
        const page = filters.page || 1;
        resolve({
          voters: results,
          totalMatches: results.length,
          page,
          totalPages: 1,
        });
      }
    };

    cursorReq.onerror = () => reject(cursorReq.error);
  });
}

// Get all voters for a specific seat (e.g. for Excel export)
export async function getAllVotersBySeat(seatNo?: string): Promise<VoterRecord[]> {
  await ensureDatabaseInitialized();
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const results: VoterRecord[] = [];

    const req = seatNo && seatNo !== 'all'
      ? store.index('seatNo').openCursor(IDBKeyRange.only(seatNo))
      : store.openCursor();

    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    req.onerror = () => reject(req.error);
  });
}

// Database Statistics Summary
export interface DbStats {
  totalVoters: number;
  totalDistricts: number;
  totalSeats: number;
  seatStats: {
    district: string;
    seatNo: string;
    count: number;
  }[];
}

export async function getDatabaseStats(): Promise<DbStats> {
  await ensureDatabaseInitialized();
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const countReq = store.count();

    countReq.onsuccess = () => {
      const totalVoters = countReq.result;
      const seatCounts: Record<string, { district: string; count: number }> = {};
      const districtsSet = new Set<string>();

      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const item: VoterRecord = cursor.value;
          const seatKey = item.seatNo || 'অনির্ধারিত আসন';
          let dist = item.district || 'অনির্ধারিত জেলা';

          if (dist) districtsSet.add(dist);

          if (!seatCounts[seatKey]) {
            seatCounts[seatKey] = { district: dist, count: 0 };
          }
          seatCounts[seatKey].count++;

          cursor.continue();
        } else {
          const seatStats = Object.entries(seatCounts).map(([seatNo, data]) => ({
            district: data.district,
            seatNo,
            count: data.count,
          })).sort((a, b) => b.count - a.count);

          resolve({
            totalVoters,
            totalDistricts: districtsSet.size,
            totalSeats: Object.keys(seatCounts).length,
            seatStats,
          });
        }
      };

      cursorReq.onerror = () => reject(cursorReq.error);
    };

    countReq.onerror = () => reject(countReq.error);
  });
}

// Active Districts & Seats list dynamically derived from IndexedDB
export interface ActiveDistrictInfo {
  name: string;
  nameEn?: string;
  totalVoters: number;
  seats: {
    seatNo: string;
    count: number;
  }[];
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
      distName = deduced.district || 'সিরাজগঞ্জ';
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

// Helper to deduce District from Seat Name
export function deduceDistrictAndDivision(seatNo: string, fallbackDistrict = 'সিরাজগঞ্জ'): { district: string; division: string } {
  const clean = seatNo.split('-')[0].trim();
  for (const dist of BANGLADESH_DISTRICTS) {
    if (clean === dist.nameBn || dist.nameEn.toLowerCase() === clean.toLowerCase() || seatNo.includes(dist.nameBn)) {
      return { district: dist.nameBn, division: dist.divisionBn };
    }
  }
  return { district: fallbackDistrict, division: 'রাজশাহী' };
}

// Legacy parsers support
export function parseVotersFromCsv(csvText: string, defaultDistrict = 'সিরাজগঞ্জ', defaultSeat = 'সিরাজগঞ্জ-২'): VoterRecord[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(/[,\t;]/).map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
  const headerMap: Record<string, number> = {};
  headers.forEach((h, idx) => {
    if (h.includes('name') || h.includes('নাম')) headerMap['name'] = idx;
    if (h.includes('father') || h.includes('পিতা')) headerMap['father'] = idx;
    if (h.includes('mother') || h.includes('মাতা')) headerMap['mother'] = idx;
    if (h.includes('spouse') || h.includes('স্বামী') || h.includes('স্ত্রী')) headerMap['spouse'] = idx;
    if (h.includes('nid') || h.includes('জাতীয়') || h.includes('smart')) headerMap['nid'] = idx;
    if (h.includes('voter') || h.includes('ভোটার') || h.includes('pin')) headerMap['voter_no'] = idx;
    if (h.includes('dob') || h.includes('জন্ম')) headerMap['dob'] = idx;
    if (h.includes('seat') || h.includes('আসন')) headerMap['seat'] = idx;
  });

  const parsed: VoterRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,\t;]/).map((c) => c.replace(/^["']|["']$/g, '').trim());
    if (cols.length === 0 || !cols.some((c) => c.length > 0)) continue;

    const seat = (headerMap['seat'] !== undefined ? cols[headerMap['seat']] : '') || defaultSeat;
    const { district, division } = deduceDistrictAndDivision(seat, defaultDistrict);

    parsed.push({
      id: `vtr-${seat}-${Date.now()}-${i}`,
      serialNo: `${i}`,
      nameBn: headerMap['name'] !== undefined ? cols[headerMap['name']] : cols[0] || 'ভোটার',
      fatherName: headerMap['father'] !== undefined ? cols[headerMap['father']] : '',
      motherName: headerMap['mother'] !== undefined ? cols[headerMap['mother']] : '',
      spouseName: headerMap['spouse'] !== undefined ? cols[headerMap['spouse']] : '',
      dob: headerMap['dob'] !== undefined ? bnToEnDigits(cols[headerMap['dob']]) : '',
      nidNo: headerMap['nid'] !== undefined ? bnToEnDigits(cols[headerMap['nid']]) : '',
      voterNo: headerMap['voter_no'] !== undefined ? bnToEnDigits(cols[headerMap['voter_no']]) : '',
      gender: 'male',
      division,
      district,
      seatNo: seat,
      seatNameBn: seat,
      upazilaThana: district,
      unionWard: '',
      villageArea: 'সদর এলাকা',
      pollingCenter: 'ভোট কেন্দ্র',
      createdAt: new Date().toISOString().split('T')[0],
    });
  }
  return parsed;
}

export function parseVotersFromJson(jsonData: any, defaultDistrict = 'সিরাজগঞ্জ', defaultSeat = 'সিরাজগঞ্জ-২'): VoterRecord[] {
  const list = Array.isArray(jsonData) ? jsonData : jsonData.voters || jsonData.data || [jsonData];
  const parsed: VoterRecord[] = [];

  list.forEach((item: any, idx: number) => {
    if (!item || typeof item !== 'object') return;
    const seat = item.seatNo || item.seat || defaultSeat;
    const { district, division } = deduceDistrictAndDivision(seat, item.district || defaultDistrict);

    parsed.push({
      id: item.id || `vtr-${seat}-${Date.now()}-${idx}`,
      serialNo: item.serialNo || `${idx + 1}`,
      nameBn: item.nameBn || item.name || 'ভোটার',
      nameEn: item.nameEn || '',
      fatherName: item.fatherName || item.father || '',
      motherName: item.motherName || item.mother || '',
      spouseName: item.spouseName || item.spouse || '',
      dob: bnToEnDigits(item.dob || ''),
      nidNo: bnToEnDigits(item.nidNo || item.nid || ''),
      voterNo: bnToEnDigits(item.voterNo || item.voter_no || ''),
      gender: item.gender || 'male',
      division,
      district,
      seatNo: seat,
      seatNameBn: seat,
      upazilaThana: item.upazilaThana || district,
      unionWard: item.unionWard || '',
      villageArea: item.villageArea || '',
      pollingCenter: item.pollingCenter || '',
      createdAt: new Date().toISOString().split('T')[0],
    });
  });

  return parsed;
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
