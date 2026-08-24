import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { VoterRecord } from '../types';
import { BANGLADESH_DISTRICTS } from '../data/bangladeshSeats';
import { deduceDistrictAndDivision, bulkInsertVoters, normalizeSearchString } from './voterDb';

// Set worker source for pdfjs-dist in browser Vite environment
if (typeof window !== 'undefined') {
  try {
    // Provide a resilient fallback worker URL
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;
    }
  } catch (e) {
    console.warn('PDF Worker initialization note:', e);
  }
}

// Convert Bengali digits (০-৯) to English digits (0-9)
export function bnToEnDigits(str?: string | null): string {
  if (!str) return '';
  const bnDigits: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return String(str).replace(/[০-৯]/g, (match) => bnDigits[match] || match);
}

// Convert English digits (0-9) to Bengali digits (০-৯)
export function enToBnDigits(str?: string | null): string {
  if (!str) return '';
  const enDigits: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
  };
  return String(str).replace(/[0-9]/g, (match) => enDigits[match] || match);
}

export interface ParseMetaHint {
  filePath?: string;
  fileName?: string;
  folderSeat?: string;
  defaultDistrict?: string;
  defaultSeat?: string;
  defaultUnion?: string;
  defaultVillage?: string;
  defaultGender?: 'male' | 'female' | 'other';
}

/**
 * Extract metadata (Seat, Union, Village, Gender) from a folder path or filename.
 * Example path: "সিরাজগঞ্জ-২/সয়দাবাদ ইউনিয়ন/কালিয়া_হরিপুর_মহিলা.pdf"
 */
export function extractMetaFromPath(pathOrName: string): ParseMetaHint {
  const parts = pathOrName.split(/[/\\]+/).map((p) => p.trim()).filter(Boolean);
  const fileName = parts.length > 0 ? parts[parts.length - 1] : pathOrName;
  const cleanName = fileName.replace(/\.[^/.]+$/, '').trim();

  let folderSeat = '';
  let defaultDistrict = '';
  let defaultUnion = '';
  let defaultVillage = cleanName;
  let defaultGender: 'male' | 'female' | 'other' = 'male';

  // 1. Detect Seat from top path segments or name
  for (const seg of parts) {
    // Look for patterns like "বগুড়া ১", "বগুড়া-১", "বগুড়া১", "সিরাজগঞ্জ-২", "সিরাজগঞ্জ ২", "Dhaka-10", "Bogra 1", etc.
    const seatMatch = seg.match(/([\u0980-\u09FFa-zA-Z]+)[-_ ]*(\d+|[\u09E6-\u09EF]+)/);
    if (seatMatch) {
      const distName = seatMatch[1].trim();
      const seatNumStr = bnToEnDigits(seatMatch[2]);
      const seatNum = parseInt(seatNumStr, 10);

      for (const d of BANGLADESH_DISTRICTS) {
        if (
          d.nameBn.includes(distName) ||
          distName.includes(d.nameBn) ||
          d.nameEn.toLowerCase() === distName.toLowerCase()
        ) {
          // If valid seat index in district seats list, use exact official seat name
          if (seatNum && seatNum <= d.seats.length && d.seats[seatNum - 1]) {
            folderSeat = d.seats[seatNum - 1];
          } else {
            folderSeat = `${d.nameBn}-${enToBnDigits(seatNumStr)}`;
          }
          defaultDistrict = d.nameBn;
          break;
        }
      }
      if (!folderSeat) {
        folderSeat = `${distName}-${enToBnDigits(seatNumStr)}`;
      }
    } else {
      // Check if folder is named purely as a district e.g. "বগুড়া" or "সিরাজগঞ্জ"
      for (const d of BANGLADESH_DISTRICTS) {
        if (
          seg.includes(d.nameBn) ||
          d.nameEn.toLowerCase() === seg.toLowerCase() ||
          d.nameBn === seg
        ) {
          if (!defaultDistrict) defaultDistrict = d.nameBn;
          if (!folderSeat && d.seats.length > 0) {
            folderSeat = d.seats[0]; // Fallback to seat 1 of that district
          }
          break;
        }
      }
    }
  }

  // 2. Detect Union / Ward from intermediate folders
  if (parts.length >= 2) {
    const unionCandidate = parts[parts.length - 2];
    if (
      unionCandidate.includes('ইউনিয়ন') ||
      unionCandidate.includes('পৌরসভা') ||
      unionCandidate.includes('ওয়ার্ড') ||
      unionCandidate.includes('ward') ||
      unionCandidate.includes('union') ||
      parts.length >= 3
    ) {
      defaultUnion = unionCandidate.replace(/[_\-]/g, ' ').trim();
    }
  }

  // 3. Detect Gender from filename
  const lowerFile = fileName.toLowerCase();
  if (
    lowerFile.includes('মহিলা') ||
    lowerFile.includes('মেয়ে') ||
    lowerFile.includes('মেয়ে') ||
    lowerFile.includes('নারী') ||
    lowerFile.includes('female') ||
    lowerFile.includes('_f_') ||
    lowerFile.endsWith('_f.pdf')
  ) {
    defaultGender = 'female';
  } else if (
    lowerFile.includes('হিজড়া') ||
    lowerFile.includes('তৃতীয়') ||
    lowerFile.includes('other')
  ) {
    defaultGender = 'other';
  } else {
    defaultGender = 'male';
  }

  // 4. Clean up village name
  defaultVillage = cleanName
    .replace(/[_\-]+/g, ' ')
    .replace(/\b(মহিলা|পুরুষ|ছেলে|মেয়ে|মেয়ে|নারী|female|male|voter|list|তালিকা)\b/gi, '')
    .trim();

  const deduced = folderSeat ? deduceDistrictAndDivision(folderSeat) : { district: 'সিরাজগঞ্জ', division: 'রাজশাহী' };

  return {
    filePath: pathOrName,
    fileName,
    folderSeat: folderSeat || undefined,
    defaultDistrict: defaultDistrict || deduced.district,
    defaultSeat: folderSeat || undefined,
    defaultUnion,
    defaultVillage: defaultVillage || 'সদর গ্রাম',
    defaultGender,
  };
}

/**
 * Parse single Bangladesh Voter PDF file into VoterRecord items.
 */
export async function parsePdfVoterFile(
  arrayBuffer: ArrayBuffer,
  metaHint: ParseMetaHint = {}
): Promise<VoterRecord[]> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;
    const records: VoterRecord[] = [];

    const pathMeta = metaHint.filePath ? extractMetaFromPath(metaHint.filePath) : metaHint;
    let detectedSeat = metaHint.defaultSeat || pathMeta.folderSeat || pathMeta.defaultSeat || '';
    let detectedDistrict = metaHint.defaultDistrict || pathMeta.defaultDistrict || '';
    let detectedUnion = metaHint.defaultUnion || pathMeta.defaultUnion || '';
    let detectedVillage = metaHint.defaultVillage || pathMeta.defaultVillage || '';
    let detectedCenter = '';
    let detectedAreaCode = '';
    const defaultGender = metaHint.defaultGender || pathMeta.defaultGender || 'male';

    // Iterate through all pages
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Group items into lines based on Y coordinate
      const lineMap: { y: number; text: string; x: number }[] = [];
      for (const item of textContent.items) {
        if ('str' in item && item.str.trim()) {
          const tx = item.transform;
          const x = tx[4];
          const y = Math.round(tx[5]);
          lineMap.push({ y, text: item.str, x });
        }
      }

      // Sort lines by Y descending (top to bottom), then X ascending (left to right)
      lineMap.sort((a, b) => {
        if (Math.abs(a.y - b.y) <= 4) {
          return a.x - b.x;
        }
        return b.y - a.y;
      });

      // Merge items within ~4px Y into coherent lines
      const mergedLines: string[] = [];
      let currentY: number | null = null;
      let currentLineStr = '';

      for (const item of lineMap) {
        if (currentY === null || Math.abs(item.y - currentY) > 4) {
          if (currentLineStr) mergedLines.push(currentLineStr.trim());
          currentY = item.y;
          currentLineStr = item.text;
        } else {
          currentLineStr += ' ' + item.text;
        }
      }
      if (currentLineStr) mergedLines.push(currentLineStr.trim());

      const fullPageText = mergedLines.join('\n');

      // Page Header Inspection for Seat, Union, Thana, Village, Polling Center
      if (pageNum === 1 || !detectedSeat || !detectedUnion) {
        // Seat match
        const seatMatches = fullPageText.match(/(?:সংসদীয়\s*আসন|নির্বাচনী\s*এলাকা|আসন\s*নং?)[:\s\-]*([^\n,\r]+)/i);
        if (seatMatches && seatMatches[1]) {
          const rawSeat = seatMatches[1].trim();
          for (const d of BANGLADESH_DISTRICTS) {
            for (const s of d.seats) {
              if (rawSeat.includes(s) || rawSeat.includes(d.nameBn)) {
                detectedSeat = s;
                detectedDistrict = d.nameBn;
                break;
              }
            }
          }
        }

        // District match
        const distMatch = fullPageText.match(/জেলা[:\s\-]*([^\n,\r]+)/i);
        if (distMatch && distMatch[1]) {
          const distRaw = distMatch[1].trim();
          for (const d of BANGLADESH_DISTRICTS) {
            if (distRaw.includes(d.nameBn) || d.nameEn.toLowerCase() === distRaw.toLowerCase()) {
              detectedDistrict = d.nameBn;
              break;
            }
          }
        }

        // Thana / Upazila match
        const thanaMatch = fullPageText.match(/(?:উপজেলা|থানা)[:\s\-]*([^\n,\r]+)/i);
        const detectedThana = thanaMatch ? thanaMatch[1].trim() : '';

        // Union / Ward match
        const unionMatch = fullPageText.match(/(?:ইউনিয়ন|ওয়ার্ড|পৌরসভা)[:\s\-]*([^\n,\r]+)/i);
        if (unionMatch && unionMatch[1]) {
          detectedUnion = unionMatch[1].trim();
        }

        // Village / Area match
        const villageMatch = fullPageText.match(/(?:ভোটার\s*এলাকা|গ্রাম|মহল্লা)[:\s\-]*([^\n,\r]+)/i);
        if (villageMatch && villageMatch[1]) {
          detectedVillage = villageMatch[1].trim();
        }

        // Center match
        const centerMatch = fullPageText.match(/(?:ভোট\s*কেন্দ্র|কেন্দ্র\s*নং?)[:\s\-]*([^\n,\r]+)/i);
        if (centerMatch && centerMatch[1]) {
          detectedCenter = centerMatch[1].trim();
        }

        // Voter Area Code match
        const codeMatch = fullPageText.match(/(?:এলাকা\s*কোড|ভোট\s*এলাকা\s*কোড)[:\s\-]*([০-৯0-9]+)/i);
        if (codeMatch && codeMatch[1]) {
          detectedAreaCode = bnToEnDigits(codeMatch[1].trim());
        }
      }

      // Default seat fallback
      if (!detectedSeat) {
        detectedSeat = metaHint.defaultSeat || 'সিরাজগঞ্জ-২';
      }
      if (!detectedDistrict) {
        const deduced = deduceDistrictAndDivision(detectedSeat);
        detectedDistrict = deduced.district;
      }

      // Parse voter entries from page lines
      // METHOD 1: Structured labeled blocks (ক্র, ভোটার নং, জাতীয় পরিচয়পত্র নং, নাম, পিতা, মাতা, ইত্যাদি)
      const pageVoters = parseStructuredVoterLines(mergedLines, {
        seatNo: detectedSeat,
        district: detectedDistrict,
        unionWard: detectedUnion,
        villageArea: detectedVillage,
        pollingCenter: detectedCenter,
        voterAreaCode: detectedAreaCode,
        gender: defaultGender,
        pageNum,
      });

      records.push(...pageVoters);
    }

    return records;
  } catch (err) {
    console.error('PDF Parse error:', err);
    return [];
  }
}

/**
 * Intelligent line parser for Bangladeshi voter pages.
 * Handles both labeled formats ("নাম: ...", "পিতা: ...") and tabular / serial rows.
 */
function parseStructuredVoterLines(
  lines: string[],
  context: {
    seatNo: string;
    district: string;
    unionWard: string;
    villageArea: string;
    pollingCenter: string;
    voterAreaCode: string;
    gender: 'male' | 'female' | 'other';
    pageNum: number;
  }
): VoterRecord[] {
  const voters: VoterRecord[] = [];
  let currentRecord: Partial<VoterRecord> | null = null;
  let recordCounter = 0;

  const flushCurrent = () => {
    if (currentRecord && (currentRecord.nameBn || currentRecord.voterNo || currentRecord.nidNo)) {
      // Ensure required identifiers
      recordCounter++;
      const id = `vtr-${context.seatNo}-${Date.now()}-${context.pageNum}-${recordCounter}-${Math.random().toString(36).substr(2, 4)}`;
      
      const completeRecord: VoterRecord = {
        id,
        serialNo: currentRecord.serialNo || `${recordCounter}`,
        nameBn: currentRecord.nameBn || 'ভোটার',
        nameEn: currentRecord.nameEn || '',
        fatherName: currentRecord.fatherName || '',
        motherName: currentRecord.motherName || '',
        spouseName: currentRecord.spouseName || '',
        dob: currentRecord.dob || '',
        nidNo: currentRecord.nidNo || '',
        voterNo: currentRecord.voterNo || '',
        formNo: currentRecord.formNo || '',
        gender: currentRecord.gender || context.gender,
        bloodGroup: currentRecord.bloodGroup || '',
        occupation: currentRecord.occupation || '',
        division: deduceDistrictAndDivision(context.seatNo).division,
        district: context.district || 'সিরাজগঞ্জ',
        seatNo: context.seatNo,
        seatNameBn: context.seatNo,
        upazilaThana: currentRecord.upazilaThana || context.district,
        unionWard: currentRecord.unionWard || context.unionWard || 'ইউনিয়ন',
        villageArea: currentRecord.villageArea || context.villageArea || 'গ্রাম',
        pollingCenter: currentRecord.pollingCenter || context.pollingCenter || 'ভোট কেন্দ্র',
        voterAreaCode: currentRecord.voterAreaCode || context.voterAreaCode || '',
        createdAt: new Date().toISOString().split('T')[0],
      };

      voters.push(completeRecord);
    }
    currentRecord = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Skip known page headers/footers
    if (
      line.includes('বাংলাদেশ নির্বাচন কমিশন') ||
      line.includes('চূড়ান্ত ভোটার তালিকা') ||
      line.includes('পৃষ্ঠা নং') ||
      line.includes('মুদ্রণের তারিখ')
    ) {
      continue;
    }

    // Check for serial start or new voter block start (e.g. "১.", "০২", "ক্র:", "SL:", or contains "ভোটার নং:")
    const serialMatch = line.match(/^(?:ক্র(?:মিক)?[:\s\-]*|SL[:\s\-]*|\(?([০-৯\d]+)\)?[.\s\-])/i);
    const hasVoterNoLabel = /ভোটার\s*নং|voter\s*no|pin\s*[:\s\-]/i.test(line);
    const hasNidLabel = /জাতীয়\s*পরিচয়পত্র|এনআইডি|nid\s*[:\s\-]/i.test(line);
    const hasNameLabel = /^(?:নাম|ভোটারের\s*নাম|name)[:\s\-]/i.test(line);

    // If we hit a new voter starter and already have a record
    if ((serialMatch || (hasNameLabel && currentRecord?.nameBn) || (hasVoterNoLabel && currentRecord?.voterNo)) && currentRecord) {
      flushCurrent();
    }

    if (!currentRecord) {
      currentRecord = {
        seatNo: context.seatNo,
        district: context.district,
        unionWard: context.unionWard,
        villageArea: context.villageArea,
        pollingCenter: context.pollingCenter,
        voterAreaCode: context.voterAreaCode,
        gender: context.gender,
      };
    }

    // Extract Serial if found
    if (serialMatch && !currentRecord.serialNo) {
      currentRecord.serialNo = serialMatch[1] ? bnToEnDigits(serialMatch[1]) : '';
    }

    // Extract Name
    const nameMatch = line.match(/(?:নাম|ভোটারের\s*নাম|name)[:\s\-]+([^,;\n\r]+)/i);
    if (nameMatch) {
      currentRecord.nameBn = nameMatch[1].replace(/(?:পিতা|মাতা|স্বামী|স্ত্রী|ভোটার|এনআইডি).*/, '').trim();
    }

    // Extract Father
    const fatherMatch = line.match(/(?:পিতা(?:র\s*নাম)?|father(?:'s\s*name)?)[:\s\-]+([^,;\n\r]+)/i);
    if (fatherMatch) {
      currentRecord.fatherName = fatherMatch[1].replace(/(?:মাতা|স্বামী|স্ত্রী|পেশা|জন্ম).*/, '').trim();
    }

    // Extract Mother
    const motherMatch = line.match(/(?:মাতা(?:র\s*নাম)?|mother(?:'s\s*name)?)[:\s\-]+([^,;\n\r]+)/i);
    if (motherMatch) {
      currentRecord.motherName = motherMatch[1].replace(/(?:স্বামী|স্ত্রী|পেশা|জন্ম|ঠিকানা).*/, '').trim();
    }

    // Extract Spouse
    const spouseMatch = line.match(/(?:স্বামী\/স্ত্রী|স্বামী|স্ত্রী|spouse)[:\s\-]+([^,;\n\r]+)/i);
    if (spouseMatch) {
      currentRecord.spouseName = spouseMatch[1].replace(/(?:পেশা|জন্ম|ঠিকানা).*/, '').trim();
    }

    // Extract Voter No / PIN (digits)
    const voterMatch = line.match(/(?:ভোটার\s*নং|voter\s*no|পিন|pin)[:\s\-]*([০-৯0-9\s]+)/i);
    if (voterMatch) {
      currentRecord.voterNo = bnToEnDigits(voterMatch[1]).replace(/\s+/g, '');
    }

    // Extract NID / Smart ID
    const nidMatch = line.match(/(?:জাতীয়\s*পরিচয়পত্র\s*নং?|এনআইডি|স্মার্ট\s*আইডি|nid\s*no?)[:\s\-]*([০-৯0-9\s]+)/i);
    if (nidMatch) {
      currentRecord.nidNo = bnToEnDigits(nidMatch[1]).replace(/\s+/g, '');
    }

    // Extract Date of birth
    const dobMatch = line.match(/(?:জন্ম\s*তারিখ|জন্ম|dob|birth\s*date)[:\s\-]*([০-৯0-9]{1,2}[/\-.][০-৯0-9]{1,2}[/\-.][০-৯0-9]{2,4})/i);
    if (dobMatch) {
      currentRecord.dob = bnToEnDigits(dobMatch[1]);
    }

    // Extract Occupation
    const occMatch = line.match(/(?:পেশা|occupation)[:\s\-]+([^,;\n\r]+)/i);
    if (occMatch) {
      currentRecord.occupation = occMatch[1].replace(/(?:ঠিকানা|জন্ম|রক্ত).*/, '').trim();
    }

    // Extract Address / Village
    const addrMatch = line.match(/(?:ঠিকানা|বাসা\/হোল্ডিং|গ্রাম|address)[:\s\-]+([^,;\n\r]+)/i);
    if (addrMatch) {
      currentRecord.villageArea = addrMatch[1].trim();
    }

    // Extract isolated 10, 13, 17 digit NID / Voter numbers if not labeled
    if (!currentRecord.nidNo || !currentRecord.voterNo) {
      const longNumbers = line.match(/[০-৯0-9]{10,17}/g);
      if (longNumbers) {
        for (const num of longNumbers) {
          const enNum = bnToEnDigits(num);
          if (enNum.length === 10 || enNum.length === 17 || enNum.length === 13) {
            if (!currentRecord.nidNo) currentRecord.nidNo = enNum;
            else if (!currentRecord.voterNo) currentRecord.voterNo = enNum;
          }
        }
      }
    }
  }

  flushCurrent();
  return voters;
}

/**
 * Parse an entire Constituency Folder uploaded via HTML5 Directory Upload
 * (<input type="file" webkitdirectory directory multiple />)
 */
export async function parseConstituencyFolder(
  files: FileList | File[],
  onProgress?: (msg: string, percent: number) => void
): Promise<{ totalImported: number; seats: string[]; filesCount: number; records: VoterRecord[] }> {
  const fileArray = Array.from(files);
  const totalFiles = fileArray.length;
  let processedFiles = 0;
  const allRecords: VoterRecord[] = [];
  const seatsAffected = new Set<string>();

  onProgress?.(`মোট ${totalFiles} টি ফাইল পাওয়া গেছে। বিশ্লেষণ শুরু হচ্ছে...`, 5);

  for (let i = 0; i < totalFiles; i++) {
    const file = fileArray[i];
    const path = (file as any).webkitRelativePath || file.name;
    const lowerName = file.name.toLowerCase();

    const percent = Math.round(10 + ((i + 1) / totalFiles) * 80);
    onProgress?.(`ফাইল রিড হচ্ছে (${i + 1}/${totalFiles}): ${file.name}`, percent);

    try {
      if (lowerName.endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        const records = await parsePdfVoterFile(buffer, { filePath: path });
        if (records.length > 0) {
          allRecords.push(...records);
          records.forEach((r) => seatsAffected.add(r.seatNo));
        }
      } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const records = parseVotersFromExcelBuffer(buffer, extractMetaFromPath(path));
        if (records.length > 0) {
          allRecords.push(...records);
          records.forEach((r) => seatsAffected.add(r.seatNo));
        }
      } else if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt') || lowerName.endsWith('.tsv')) {
        const text = await file.text();
        const meta = extractMetaFromPath(path);
        const records = parseCsvToVoters(text, meta.defaultDistrict || 'সিরাজগঞ্জ', meta.folderSeat || 'সিরাজগঞ্জ-২');
        if (records.length > 0) {
          allRecords.push(...records);
          records.forEach((r) => seatsAffected.add(r.seatNo));
        }
      } else if (lowerName.endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);
        const meta = extractMetaFromPath(path);
        const records = parseJsonToVoters(json, meta.defaultDistrict || 'সিরাজগঞ্জ', meta.folderSeat || 'সিরাজগঞ্জ-২');
        if (records.length > 0) {
          allRecords.push(...records);
          records.forEach((r) => seatsAffected.add(r.seatNo));
        }
      }
    } catch (e) {
      console.warn(`Error parsing file ${path}:`, e);
    }
    processedFiles++;
  }

  // Bulk save all extracted records into IndexedDB
  if (allRecords.length > 0) {
    onProgress?.(`ডাটাবেজে ${allRecords.length} টি ভোটার রেকর্ড সেভ হচ্ছে...`, 95);
    await bulkInsertVoters(allRecords);
  }

  onProgress?.(`সম্পন্ন! মোট ${allRecords.length} টি ভোটার তথ্য সফলভাবে সেভ করা হয়েছে।`, 100);

  return {
    totalImported: allRecords.length,
    seats: Array.from(seatsAffected),
    filesCount: processedFiles,
    records: allRecords,
  };
}

/**
 * Parse a Constituency ZIP Archive containing Union subfolders and Village PDFs
 */
export async function parseConstituencyZip(
  zipBuffer: ArrayBuffer,
  onProgress?: (msg: string, percent: number) => void
): Promise<{ totalImported: number; seats: string[]; filesCount: number; records: VoterRecord[] }> {
  const zip = new JSZip();
  onProgress?.('জিপ আর্কাইভ আনপ্যাক করা হচ্ছে...', 10);
  const loadedZip = await zip.loadAsync(zipBuffer);

  const filePaths = Object.keys(loadedZip.files).filter((p) => !loadedZip.files[p].dir);
  const totalFiles = filePaths.length;
  const allRecords: VoterRecord[] = [];
  const seatsAffected = new Set<string>();

  for (let i = 0; i < totalFiles; i++) {
    const filePath = filePaths[i];
    const file = loadedZip.files[filePath];
    const lowerName = filePath.toLowerCase();
    const percent = Math.round(15 + ((i + 1) / totalFiles) * 75);

    onProgress?.(`জিপ থেকে প্রসেস হচ্ছে (${i + 1}/${totalFiles}): ${filePath.split('/').pop()}`, percent);

    try {
      if (lowerName.endsWith('.pdf')) {
        const buffer = await file.async('arraybuffer');
        const records = await parsePdfVoterFile(buffer, { filePath });
        if (records.length > 0) {
          allRecords.push(...records);
          records.forEach((r) => seatsAffected.add(r.seatNo));
        }
      } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        const buffer = await file.async('arraybuffer');
        const records = parseVotersFromExcelBuffer(buffer, extractMetaFromPath(filePath));
        if (records.length > 0) {
          allRecords.push(...records);
          records.forEach((r) => seatsAffected.add(r.seatNo));
        }
      } else if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt') || lowerName.endsWith('.tsv')) {
        const text = await file.async('text');
        const meta = extractMetaFromPath(filePath);
        const records = parseCsvToVoters(text, meta.defaultDistrict || 'সিরাজগঞ্জ', meta.folderSeat || 'সিরাজগঞ্জ-২');
        if (records.length > 0) {
          allRecords.push(...records);
          records.forEach((r) => seatsAffected.add(r.seatNo));
        }
      } else if (lowerName.endsWith('.json')) {
        const text = await file.async('text');
        const json = JSON.parse(text);
        const meta = extractMetaFromPath(filePath);
        const records = parseJsonToVoters(json, meta.defaultDistrict || 'সিরাজগঞ্জ', meta.folderSeat || 'সিরাজগঞ্জ-২');
        if (records.length > 0) {
          allRecords.push(...records);
          records.forEach((r) => seatsAffected.add(r.seatNo));
        }
      }
    } catch (err) {
      console.warn(`Error extracting ${filePath}:`, err);
    }
  }

  if (allRecords.length > 0) {
    onProgress?.(`ডাটাবেজে ${allRecords.length} টি ভোটার রেকর্ড সেভ হচ্ছে...`, 95);
    await bulkInsertVoters(allRecords);
  }

  onProgress?.(`সম্পন্ন! মোট ${allRecords.length} টি ভোটার রেকর্ড ডাটাবেজে যুক্ত হয়েছে।`, 100);

  return {
    totalImported: allRecords.length,
    seats: Array.from(seatsAffected),
    filesCount: totalFiles,
    records: allRecords,
  };
}

/**
 * Parse Excel Buffer (.xlsx, .xls) into VoterRecord array
 */
export function parseVotersFromExcelBuffer(
  buffer: ArrayBuffer,
  metaHint: ParseMetaHint = {}
): VoterRecord[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  if (jsonData.length < 2) return [];

  const headers: string[] = jsonData[0].map((h: any) => String(h || '').trim().toLowerCase());
  const headerMap: Record<string, number> = {};

  headers.forEach((h, idx) => {
    if (h.includes('name') || h.includes('নাম')) headerMap['name'] = idx;
    if (h.includes('father') || h.includes('পিতা')) headerMap['father'] = idx;
    if (h.includes('mother') || h.includes('মাতা')) headerMap['mother'] = idx;
    if (h.includes('spouse') || h.includes('স্বামী') || h.includes('স্ত্রী')) headerMap['spouse'] = idx;
    if (h.includes('nid') || h.includes('জাতীয়') || h.includes('স্মার্ট')) headerMap['nid'] = idx;
    if (h.includes('voter') || h.includes('ভোটার') || h.includes('pin') || h.includes('পিন')) headerMap['voter_no'] = idx;
    if (h.includes('dob') || h.includes('জন্ম')) headerMap['dob'] = idx;
    if (h.includes('gender') || h.includes('লিঙ্গ')) headerMap['gender'] = idx;
    if (h.includes('thana') || h.includes('উপজেলা') || h.includes('থানা')) headerMap['thana'] = idx;
    if (h.includes('union') || h.includes('ওয়ার্ড') || h.includes('ইউনিয়ন')) headerMap['union'] = idx;
    if (h.includes('village') || h.includes('গ্রাম') || h.includes('ঠিকানা')) headerMap['village'] = idx;
    if (h.includes('center') || h.includes('কেন্দ্র')) headerMap['center'] = idx;
    if (h.includes('seat') || h.includes('আসন')) headerMap['seat'] = idx;
    if (h.includes('occupation') || h.includes('পেশা')) headerMap['occupation'] = idx;
  });

  const parsed: VoterRecord[] = [];
  const defaultSeat = metaHint.defaultSeat || 'সিরাজগঞ্জ-২';
  const defaultDistrict = metaHint.defaultDistrict || 'সিরাজগঞ্জ';

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;

    const seat = (headerMap['seat'] !== undefined ? String(row[headerMap['seat']] || '') : '') || defaultSeat;
    const { district, division } = deduceDistrictAndDivision(seat, defaultDistrict);

    const record: VoterRecord = {
      id: `vtr-${seat}-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      serialNo: `${i}`,
      nameBn: headerMap['name'] !== undefined ? String(row[headerMap['name']] || '') : String(row[0] || 'ভোটার'),
      fatherName: headerMap['father'] !== undefined ? String(row[headerMap['father']] || '') : '',
      motherName: headerMap['mother'] !== undefined ? String(row[headerMap['mother']] || '') : '',
      spouseName: headerMap['spouse'] !== undefined ? String(row[headerMap['spouse']] || '') : '',
      dob: headerMap['dob'] !== undefined ? bnToEnDigits(String(row[headerMap['dob']] || '')) : '',
      nidNo: headerMap['nid'] !== undefined ? bnToEnDigits(String(row[headerMap['nid']] || '')) : '',
      voterNo: headerMap['voter_no'] !== undefined ? bnToEnDigits(String(row[headerMap['voter_no']] || '')) : '',
      gender: headerMap['gender'] !== undefined ? (String(row[headerMap['gender']]).includes('female') || String(row[headerMap['gender']]).includes('মহিলা') ? 'female' : 'male') : metaHint.defaultGender || 'male',
      occupation: headerMap['occupation'] !== undefined ? String(row[headerMap['occupation']] || '') : '',
      division,
      district,
      seatNo: seat,
      seatNameBn: seat,
      upazilaThana: headerMap['thana'] !== undefined ? String(row[headerMap['thana']] || '') : district,
      unionWard: headerMap['union'] !== undefined ? String(row[headerMap['union']] || '') : metaHint.defaultUnion || '',
      villageArea: headerMap['village'] !== undefined ? String(row[headerMap['village']] || '') : metaHint.defaultVillage || '',
      pollingCenter: headerMap['center'] !== undefined ? String(row[headerMap['center']] || '') : 'ভোট কেন্দ্র',
      createdAt: new Date().toISOString().split('T')[0],
    };

    parsed.push(record);
  }

  return parsed;
}

/**
 * Export Seat or Filtered Voter Data directly to Excel (.xlsx) file
 */
export function exportSeatToExcel(seatNo: string, records: VoterRecord[]): void {
  if (records.length === 0) return;

  const dataRows = records.map((r, idx) => ({
    'ক্রমিক নং': r.serialNo || `${idx + 1}`,
    'ভোটারের নাম': r.nameBn,
    'নাম (ইংরেজি)': r.nameEn || '',
    'পিতার নাম': r.fatherName || '',
    'মাতার নাম': r.motherName || '',
    'স্বামী/স্ত্রী': r.spouseName || '',
    'ভোটার নম্বর / পিন': r.voterNo || '',
    'জাতীয় পরিচয়পত্র (NID)': r.nidNo || '',
    'জন্ম তারিখ': r.dob || '',
    'লিঙ্গ': r.gender === 'female' ? 'মহিলা' : r.gender === 'other' ? 'তৃতীয় লিঙ্গ' : 'পুরুষ',
    'পেশা': r.occupation || '',
    'সংসদীয় আসন': r.seatNo || seatNo,
    'জেলা': r.district || '',
    'উপজেলা/থানা': r.upazilaThana || '',
    'ইউনিয়ন/ওয়ার্ড': r.unionWard || '',
    'গ্রাম/এলাকা': r.villageArea || '',
    'ভোট কেন্দ্র': r.pollingCenter || '',
    'এলাকা কোড': r.voterAreaCode || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataRows);
  
  // Set generous column widths
  worksheet['!cols'] = [
    { wch: 10 }, // ক্রমিক
    { wch: 25 }, // নাম
    { wch: 20 }, // English name
    { wch: 25 }, // পিতা
    { wch: 25 }, // মাতা
    { wch: 20 }, // স্বামী/স্ত্রী
    { wch: 18 }, // ভোটার নং
    { wch: 20 }, // এনআইডি
    { wch: 14 }, // জন্ম তারিখ
    { wch: 10 }, // লিঙ্গ
    { wch: 15 }, // পেশা
    { wch: 16 }, // আসন
    { wch: 14 }, // জেলা
    { wch: 18 }, // থানা
    { wch: 18 }, // ইউনিয়ন
    { wch: 20 }, // গ্রাম
    { wch: 25 }, // কেন্দ্র
    { wch: 12 }, // কোড
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ভোটার তালিকা');

  const cleanSeat = (seatNo || 'Export').replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, '_');
  const fileName = `Voter_List_${cleanSeat}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Export Entire Voter Database to Excel (.xlsx) file
 */
export function exportAllVotersToExcel(records: VoterRecord[]): void {
  if (records.length === 0) return;

  const dataRows = records.map((r, idx) => ({
    'ক্রমিক নং': r.serialNo || `${idx + 1}`,
    'ভোটারের নাম': r.nameBn,
    'নাম (ইংরেজি)': r.nameEn || '',
    'পিতার নাম': r.fatherName || '',
    'মাতার নাম': r.motherName || '',
    'স্বামী/স্ত্রী': r.spouseName || '',
    'ভোটার নম্বর / পিন': r.voterNo || '',
    'জাতীয় পরিচয়পত্র (NID)': r.nidNo || '',
    'জন্ম তারিখ': r.dob || '',
    'লিঙ্গ': r.gender === 'female' ? 'মহিলা' : r.gender === 'other' ? 'তৃতীয় লিঙ্গ' : 'পুরুষ',
    'পেশা': r.occupation || '',
    'সংসদীয় আসন': r.seatNo || '',
    'জেলা': r.district || '',
    'উপজেলা/থানা': r.upazilaThana || '',
    'ইউনিয়ন/ওয়ার্ড': r.unionWard || '',
    'গ্রাম/এলাকা': r.villageArea || '',
    'ভোট কেন্দ্র': r.pollingCenter || '',
    'এলাকা কোড': r.voterAreaCode || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataRows);
  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 25 },
    { wch: 20 },
    { wch: 25 },
    { wch: 25 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 10 },
    { wch: 15 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 25 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'সকল ভোটার তথ্য');

  const fileName = `All_Voter_Database_${records.length}_Voters_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

// Helpers for CSV / JSON parsers
function parseCsvToVoters(csvText: string, defaultDistrict: string, defaultSeat: string): VoterRecord[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(/[,\t;]/).map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
  const headerMap: Record<string, number> = {};
  headers.forEach((h, idx) => {
    if (h.includes('name') || h.includes('নাম')) headerMap['name'] = idx;
    if (h.includes('father') || h.includes('পিতা')) headerMap['father'] = idx;
    if (h.includes('mother') || h.includes('মাতা')) headerMap['mother'] = idx;
    if (h.includes('spouse') || h.includes('স্বামী') || h.includes('স্ত্রী')) headerMap['spouse'] = idx;
    if (h.includes('nid') || h.includes('জাতীয়')) headerMap['nid'] = idx;
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

function parseJsonToVoters(jsonData: any, defaultDistrict: string, defaultSeat: string): VoterRecord[] {
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
