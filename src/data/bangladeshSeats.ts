import { ParliamentarySeat } from '../types';

export interface DistrictInfo {
  nameBn: string;
  nameEn: string;
  divisionBn: string;
  seats: string[]; // e.g. ["ঢাকা-১", "ঢাকা-২", ..., "ঢাকা-২০"]
}

export const BANGLADESH_DIVISIONS: string[] = [
  'সকল বিভাগ',
  'ঢাকা',
  'চট্টগ্রাম',
  'রাজশাহী',
  'খুলনা',
  'বরিশাল',
  'সিলেট',
  'রংপুর',
  'ময়মনসিংহ',
];

export const BANGLADESH_DISTRICTS: DistrictInfo[] = [
  // ঢাকা বিভাগ (13 জেলা)
  { nameBn: 'ঢাকা', nameEn: 'Dhaka', divisionBn: 'ঢাকা', seats: Array.from({ length: 20 }, (_, i) => `ঢাকা-${i + 1}`) },
  { nameBn: 'গাজীপুর', nameEn: 'Gazipur', divisionBn: 'ঢাকা', seats: ['গাজীপুর-১', 'গাজীপুর-২', 'গাজীপুর-৩', 'গাজীপুর-৪', 'গাজীপুর-৫'] },
  { nameBn: 'নারায়ণগঞ্জ', nameEn: 'Narayanganj', divisionBn: 'ঢাকা', seats: ['নারায়ণগঞ্জ-১', 'নারায়ণগঞ্জ-২', 'নারায়ণগঞ্জ-৩', 'নারায়ণগঞ্জ-৪', 'নারায়ণগঞ্জ-৫'] },
  { nameBn: 'নরসিংদী', nameEn: 'Narsingdi', divisionBn: 'ঢাকা', seats: ['নরসিংদী-১', 'নরসিংদী-২', 'নরসিংদী-৩', 'নরসিংদী-৪', 'নরসিংদী-৫'] },
  { nameBn: 'মুন্সীগঞ্জ', nameEn: 'Munshiganj', divisionBn: 'ঢাকা', seats: ['মুন্সীগঞ্জ-১', 'মুন্সীগঞ্জ-২', 'মুন্সীগঞ্জ-৩'] },
  { nameBn: 'মানিকগঞ্জ', nameEn: 'Manikganj', divisionBn: 'ঢাকা', seats: ['মানিকগঞ্জ-১', 'মানিকগঞ্জ-২', 'মানিকগঞ্জ-৩'] },
  { nameBn: 'টাঙ্গাইল', nameEn: 'Tangail', divisionBn: 'ঢাকা', seats: Array.from({ length: 8 }, (_, i) => `টাঙ্গাইল-${i + 1}`) },
  { nameBn: 'কিশোরগঞ্জ', nameEn: 'Kishoreganj', divisionBn: 'ঢাকা', seats: Array.from({ length: 6 }, (_, i) => `কিশোরগঞ্জ-${i + 1}`) },
  { nameBn: 'ফরিদপুর', nameEn: 'Faridpur', divisionBn: 'ঢাকা', seats: ['ফরিদপুর-১', 'ফরিদপুর-২', 'ফরিদপুর-৩', 'ফরিদপুর-৪'] },
  { nameBn: 'মাদারীপুর', nameEn: 'Madaripur', divisionBn: 'ঢাকা', seats: ['মাদারীপুর-১', 'মাদারীপুর-২', 'মাদারীপুর-৩'] },
  { nameBn: 'শরীয়তপুর', nameEn: 'Shariatpur', divisionBn: 'ঢাকা', seats: ['শরীয়তপুর-১', 'শরীয়তপুর-২', 'শরীয়তপুর-৩'] },
  { nameBn: 'গোপালগঞ্জ', nameEn: 'Gopalganj', divisionBn: 'ঢাকা', seats: ['গোপালগঞ্জ-১', 'গোপালগঞ্জ-২', 'গোপালগঞ্জ-৩'] },
  { nameBn: 'রাজবাড়ী', nameEn: 'Rajbari', divisionBn: 'ঢাকা', seats: ['রাজবাড়ী-১', 'রাজবাড়ী-২'] },

  // চট্টগ্রাম বিভাগ (11 জেলা)
  { nameBn: 'কুমিল্লা', nameEn: 'Cumilla', divisionBn: 'চট্টগ্রাম', seats: Array.from({ length: 11 }, (_, i) => `কুমিল্লা-${i + 1}`) },
  { nameBn: 'চট্টগ্রাম', nameEn: 'Chattogram', divisionBn: 'চট্টগ্রাম', seats: Array.from({ length: 16 }, (_, i) => `চট্টগ্রাম-${i + 1}`) },
  { nameBn: 'ব্রাহ্মণবাড়িয়া', nameEn: 'Brahmanbaria', divisionBn: 'চট্টগ্রাম', seats: Array.from({ length: 6 }, (_, i) => `ব্রাহ্মণবাড়িয়া-${i + 1}`) },
  { nameBn: 'চাঁদপুর', nameEn: 'Chandpur', divisionBn: 'চট্টগ্রাম', seats: ['চাঁদপুর-১', 'চাঁদপুর-২', 'চাঁদপুর-৩', 'চাঁদপুর-৪', 'চাঁদপুর-৫'] },
  { nameBn: 'নোয়াখালী', nameEn: 'Noakhali', divisionBn: 'চট্টগ্রাম', seats: ['নোয়াখালী-১', 'নোয়াখালী-২', 'নোয়াখালী-৩', 'নোয়াখালী-৪', 'নোয়াখালী-৫', 'নোয়াখালী-৬'] },
  { nameBn: 'ফেনী', nameEn: 'Feni', divisionBn: 'চট্টগ্রাম', seats: ['ফেনী-১', 'ফেনী-২', 'ফেনী-৩'] },
  { nameBn: 'লক্ষ্মীপুর', nameEn: 'Lakshmipur', divisionBn: 'চট্টগ্রাম', seats: ['লক্ষ্মীপুর-১', 'লক্ষ্মীপুর-২', 'লক্ষ্মীপুর-৩', 'লক্ষ্মীপুর-৪'] },
  { nameBn: 'কক্সবাজার', nameEn: 'Cox\'s Bazar', divisionBn: 'চট্টগ্রাম', seats: ['কক্সবাজার-১', 'কক্সবাজার-২', 'কক্সবাজার-৩', 'কক্সবাজার-৪'] },
  { nameBn: 'খাগড়াছড়ি', nameEn: 'Khagrachhari', divisionBn: 'চট্টগ্রাম', seats: ['খাগড়াছড়ি-১'] },
  { nameBn: 'রাঙ্গামাটি', nameEn: 'Rangamati', divisionBn: 'চট্টগ্রাম', seats: ['রাঙ্গামাটি-১'] },
  { nameBn: 'বান্দরবান', nameEn: 'Bandarban', divisionBn: 'চট্টগ্রাম', seats: ['বান্দরবান-১'] },

  // রাজশাহী বিভাগ (8 জেলা)
  { nameBn: 'বগুড়া', nameEn: 'Bogura', divisionBn: 'রাজশাহী', seats: Array.from({ length: 7 }, (_, i) => `বগুড়া-${i + 1}`) },
  { nameBn: 'রাজশাহী', nameEn: 'Rajshahi', divisionBn: 'রাজশাহী', seats: Array.from({ length: 6 }, (_, i) => `রাজশাহী-${i + 1}`) },
  { nameBn: 'সিরাজগঞ্জ', nameEn: 'Sirajganj', divisionBn: 'রাজশাহী', seats: ['সিরাজগঞ্জ-১', 'সিরাজগঞ্জ-২', 'সিরাজগঞ্জ-৩', 'সিরাজগঞ্জ-৪', 'সিরাজগঞ্জ-৫', 'সিরাজগঞ্জ-৬'] },
  { nameBn: 'পাবনা', nameEn: 'Pabna', divisionBn: 'রাজশাহী', seats: ['পাবনা-১', 'পাবনা-২', 'পাবনা-৩', 'পাবনা-৪', 'পাবনা-৫'] },
  { nameBn: 'নওগাঁ', nameEn: 'Naogaon', divisionBn: 'রাজশাহী', seats: ['নওগাঁ-১', 'নওগাঁ-২', 'নওগাঁ-৩', 'নওগাঁ-৪', 'নওগাঁ-৫', 'নওগাঁ-৬'] },
  { nameBn: 'নাটোর', nameEn: 'Natore', divisionBn: 'রাজশাহী', seats: ['নাটোর-১', 'নাটোর-২', 'নাটোর-৩', 'নাটোর-৪'] },
  { nameBn: 'জয়পুরহাট', nameEn: 'Joypurhat', divisionBn: 'রাজশাহী', seats: ['জয়পুরহাট-১', 'জয়পুরহাট-২'] },
  { nameBn: 'চাঁপাইনবাবগঞ্জ', nameEn: 'Chapai Nawabganj', divisionBn: 'রাজশাহী', seats: ['চাঁপাইনবাবগঞ্জ-১', 'চাঁপাইনবাবগঞ্জ-২', 'চাঁপাইনবাবগঞ্জ-৩'] },

  // খুলনা বিভাগ (10 জেলা)
  { nameBn: 'খুলনা', nameEn: 'Khulna', divisionBn: 'খুলনা', seats: Array.from({ length: 6 }, (_, i) => `খুলনা-${i + 1}`) },
  { nameBn: 'যশোর', nameEn: 'Jashore', divisionBn: 'খুলনা', seats: Array.from({ length: 6 }, (_, i) => `যশোর-${i + 1}`) },
  { nameBn: 'কুষ্টিয়া', nameEn: 'Kushtia', divisionBn: 'খুলনা', seats: ['কুষ্টিয়া-১', 'কুষ্টিয়া-২', 'কুষ্টিয়া-৩', 'কুষ্টিয়া-৪'] },
  { nameBn: 'ঝিনাইদহ', nameEn: 'Jhenaidah', divisionBn: 'খুলনা', seats: ['ঝিনাইদহ-১', 'ঝিনাইদহ-২', 'ঝিনাইদহ-৩', 'ঝিনাইদহ-৪'] },
  { nameBn: 'সাতক্ষীরা', nameEn: 'Satkhira', divisionBn: 'খুলনা', seats: ['সাতক্ষীরা-১', 'সাতক্ষীরা-২', 'সাতক্ষীরা-৩', 'সাতক্ষীরা-৪'] },
  { nameBn: 'বাগেরহাট', nameEn: 'Bagerhat', divisionBn: 'খুলনা', seats: ['বাগেরহাট-১', 'বাগেরহাট-২', 'বাগেরহাট-৩', 'বাগেরহাট-৪'] },
  { nameBn: 'মাগুরা', nameEn: 'Magura', divisionBn: 'খুলনা', seats: ['মাগুরা-১', 'মাগুরা-২'] },
  { nameBn: 'চুয়াডাঙ্গা', nameEn: 'Chuadanga', divisionBn: 'খুলনা', seats: ['চুয়াডাঙ্গা-১', 'চুয়াডাঙ্গা-২'] },
  { nameBn: 'মেহেরপুর', nameEn: 'Meherpur', divisionBn: 'খুলনা', seats: ['মেহেরপুর-১', 'মেহেরপুর-২'] },
  { nameBn: 'নড়াইল', nameEn: 'Narail', divisionBn: 'খুলনা', seats: ['নড়াইল-১', 'নড়াইল-২'] },

  // বরিশাল বিভাগ (6 জেলা)
  { nameBn: 'বরিশাল', nameEn: 'Barishal', divisionBn: 'বরিশাল', seats: Array.from({ length: 6 }, (_, i) => `বরিশাল-${i + 1}`) },
  { nameBn: 'পটুয়াখালী', nameEn: 'Patuakhali', divisionBn: 'বরিশাল', seats: ['পটুয়াখালী-১', 'পটুয়াখালী-২', 'পটুয়াখালী-৩', 'পটুয়াখালী-৪'] },
  { nameBn: 'ভোলা', nameEn: 'Bhola', divisionBn: 'বরিশাল', seats: ['ভোলা-১', 'ভোলা-২', 'ভোলা-৩', 'ভোলা-৪'] },
  { nameBn: 'পিরোজপুর', nameEn: 'Pirojpur', divisionBn: 'বরিশাল', seats: ['পিরোজপুর-১', 'পিরোজপুর-২', 'পিরোজপুর-৩'] },
  { nameBn: 'বরগুনা', nameEn: 'Barguna', divisionBn: 'বরিশাল', seats: ['বরগুনা-১', 'বরগুনা-২'] },
  { nameBn: 'ঝালকাঠি', nameEn: 'Jhalokati', divisionBn: 'বরিশাল', seats: ['ঝালকাঠি-১', 'ঝালকাঠি-২'] },

  // সিলেট বিভাগ (4 জেলা)
  { nameBn: 'সিলেট', nameEn: 'Sylhet', divisionBn: 'সিলেট', seats: Array.from({ length: 6 }, (_, i) => `সিলেট-${i + 1}`) },
  { nameBn: 'সুনামগঞ্জ', nameEn: 'Sunamganj', divisionBn: 'সিলেট', seats: ['সুনামগঞ্জ-১', 'সুনামগঞ্জ-২', 'সুনামগঞ্জ-৩', 'সুনামগঞ্জ-৪', 'সুনামগঞ্জ-৫'] },
  { nameBn: 'হবিগঞ্জ', nameEn: 'Habiganj', divisionBn: 'সিলেট', seats: ['হবিগঞ্জ-১', 'হবিগঞ্জ-২', 'হবিগঞ্জ-৩', 'হবিগঞ্জ-৪'] },
  { nameBn: 'মৌলভীবাজার', nameEn: 'Moulvibazar', divisionBn: 'সিলেট', seats: ['মৌলভীবাজার-১', 'মৌলভীবাজার-২', 'মৌলভীবাজার-৩', 'মৌলভীবাজার-৪'] },

  // রংপুর বিভাগ (8 জেলা)
  { nameBn: 'রংপুর', nameEn: 'Rangpur', divisionBn: 'রংপুর', seats: Array.from({ length: 6 }, (_, i) => `রংপুর-${i + 1}`) },
  { nameBn: 'দিনাজপুর', nameEn: 'Dinajpur', divisionBn: 'রংপুর', seats: Array.from({ length: 6 }, (_, i) => `দিনাজপুর-${i + 1}`) },
  { nameBn: 'গাইবান্ধা', nameEn: 'Gaibandha', divisionBn: 'রংপুর', seats: ['গাইবান্ধা-১', 'গাইবান্ধা-২', 'গাইবান্ধা-৩', 'গাইবান্ধা-৪', 'গাইবান্ধা-৫'] },
  { nameBn: 'কুড়িগ্রাম', nameEn: 'Kurigram', divisionBn: 'রংপুর', seats: ['কুড়িগ্রাম-১', 'কুড়িগ্রাম-২', 'কুড়িগ্রাম-৩', 'কুড়িগ্রাম-৪'] },
  { nameBn: 'নীলফামারী', nameEn: 'Nilphamari', divisionBn: 'রংপুর', seats: ['নীলফামারী-১', 'নীলফামারী-২', 'নীলফামারী-৩', 'নীলফামারী-৪'] },
  { nameBn: 'ঠাকুরগাঁও', nameEn: 'Thakurgaon', divisionBn: 'রংপুর', seats: ['ঠাকুরগাঁও-১', 'ঠাকুরগাঁও-২', 'ঠাকুরগাঁও-৩'] },
  { nameBn: 'লালমনিরহাট', nameEn: 'Lalmonirhat', divisionBn: 'রংপুর', seats: ['লালমনিরহাট-১', 'লালমনিরহাট-২', 'লালমনিরহাট-৩'] },
  { nameBn: 'পঞ্চগড়', nameEn: 'Panchagarh', divisionBn: 'রংপুর', seats: ['পঞ্চগড়-১', 'পঞ্চগড়-২'] },

  // ময়মনসিংহ বিভাগ (4 জেলা)
  { nameBn: 'ময়মনসিংহ', nameEn: 'Mymensingh', divisionBn: 'ময়মনসিংহ', seats: Array.from({ length: 11 }, (_, i) => `ময়মনসিংহ-${i + 1}`) },
  { nameBn: 'নেত্রকোণা', nameEn: 'Netrokona', divisionBn: 'ময়মনসিংহ', seats: ['নেত্রকোণা-১', 'নেত্রকোণা-২', 'নেত্রকোণা-৩', 'নেত্রকোণা-৪', 'নেত্রকোণা-৫'] },
  { nameBn: 'জামালপুর', nameEn: 'Jamalpur', divisionBn: 'ময়মনসিংহ', seats: ['জামালপুর-১', 'জামালপুর-২', 'জামালপুর-৩', 'জামালপুর-৪', 'জামালপুর-৫'] },
  { nameBn: 'শেরপুর', nameEn: 'Sherpur', divisionBn: 'ময়মনসিংহ', seats: ['শেরপুর-১', 'শেরপুর-২', 'শেরপুর-৩'] },
];

export const POPULAR_SEATS_LIST = [
  'ঢাকা-১০',
  'ঢাকা-৮',
  'ঢাকা-৫',
  'কুমিল্লা-৬',
  'চট্টগ্রাম-৯',
  'বগুড়া-৬',
  'সিলেট-১',
  'রাজশাহী-২',
  'খুলনা-২',
  'ময়মনসিংহ-৪',
  'বরিশাল-৫',
  'রংপুর-৩',
];
