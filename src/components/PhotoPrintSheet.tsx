import React, { useState, useRef, useEffect } from 'react';
import { 
  Grid, 
  Upload, 
  Printer, 
  Download, 
  Plus, 
  Trash2, 
  Scissors, 
  Layers, 
  Eye,
  Sliders,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { PaperSize, PrintItem, PHOTO_PRESETS } from '../types';
import { mmToPx, loadImage, downloadDataUrl, drawCutGuides } from '../utils/imageProcessing';
import { PrintPreviewModal } from './PrintPreviewModal';

interface PhotoPrintSheetProps {
  initialItems?: PrintItem[];
}

export const PhotoPrintSheet: React.FC<PhotoPrintSheetProps> = ({ initialItems = [] }) => {
  const [paperSize, setPaperSize] = useState<PaperSize>('4R');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [presetPackage, setPresetPackage] = useState<string>('4PP_4STAMP');
  const [gapMm, setGapMm] = useState<number>(4);
  const [includeCutMarks, setIncludeCutMarks] = useState<boolean>(true);
  const [hasBorder, setHasBorder] = useState<boolean>(true);

  // Uploaded photo collection
  const [primaryPhoto, setPrimaryPhoto] = useState<string | null>(null);
  const [secondaryPhoto, setSecondaryPhoto] = useState<string | null>(null);

  // Custom Items list
  const [items, setItems] = useState<PrintItem[]>(initialItems);

  // Print modal
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Paper Dimensions
  const paperDimensions: Record<PaperSize, { w: number; h: number; nameBn: string }> = {
    '4R': { w: 102, h: 152, nameBn: '৪R (4"x6")' },
    '3R': { w: 89, h: 127, nameBn: '৩R (3.5"x5")' },
    'A4': { w: 210, h: 297, nameBn: 'A4 পেপার' },
    'Letter': { w: 216, h: 279, nameBn: 'লেটার' },
  };

  const dim = paperDimensions[paperSize] || paperDimensions['4R'];
  const paperWidthMm = orientation === 'portrait' ? dim.w : dim.h;
  const paperHeightMm = orientation === 'portrait' ? dim.h : dim.w;

  // Load sample demo passport photo
  const loadDemoPhoto = () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400">
        <rect width="100%" height="100%" fill="#5B92E5"/>
        <circle cx="160" cy="150" r="70" fill="#fed7aa"/>
        <path d="M 90 140 Q 160 60 230 140 Q 240 90 160 70 Q 80 90 90 140" fill="#1e293b"/>
        <circle cx="135" cy="145" r="6" fill="#1e293b"/>
        <circle cx="185" cy="145" r="6" fill="#1e293b"/>
        <path d="M 150 170 Q 160 180 170 170" stroke="#be185d" stroke-width="3" fill="none"/>
        <rect x="140" y="210" width="40" height="40" fill="#fed7aa"/>
        <path d="M 50 400 L 110 250 L 210 250 L 270 400 Z" fill="#0f172a"/>
        <polygon points="140,250 180,250 160,320" fill="#ffffff"/>
        <polygon points="150,250 170,250 160,370" fill="#dc2626"/>
      </svg>
    `;
    setPrimaryPhoto(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'primary' | 'secondary') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (target === 'primary') setPrimaryPhoto(url);
      else setSecondaryPhoto(url);
    };
    reader.readAsDataURL(file);
  };

  // Render Grid onto Print Canvas
  const renderPrintSheet = async (
    ctx: CanvasRenderingContext2D,
    widthPx: number,
    heightPx: number,
    dpi = 300
  ) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, widthPx, heightPx);

    const imgPrimary = primaryPhoto ? await loadImage(primaryPhoto) : null;
    const imgSecondary = secondaryPhoto ? await loadImage(secondaryPhoto) : null;

    if (!imgPrimary && !imgSecondary && items.length === 0) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('প্রিন্ট করার জন্য ছবি আপলোড করুন', widthPx / 2, heightPx / 2);
      return;
    }

    const gapPx = mmToPx(gapMm, dpi);

    // Standard Preset Sheet Layouts
    if (presetPackage === '4PP_4STAMP') {
      // 4 Passport (Top 2x2) + 4 Stamp (Bottom 4x1) on 4R
      const ppW = mmToPx(40, dpi);
      const ppH = mmToPx(50, dpi);
      const stW = mmToPx(20, dpi);
      const stH = mmToPx(25, dpi);

      // Top: 2x2 Passport
      const ppStartX = (widthPx - (2 * ppW + gapPx)) / 2;
      const ppStartY = mmToPx(8, dpi);

      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          const x = ppStartX + c * (ppW + gapPx);
          const y = ppStartY + r * (ppH + gapPx);
          if (imgPrimary) ctx.drawImage(imgPrimary, x, y, ppW, ppH);
          if (hasBorder) {
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, ppW, ppH);
          }
          if (includeCutMarks) drawCutGuides(ctx, x, y, ppW, ppH, 4);
        }
      }

      // Bottom: 4 Stamp
      const stTotalW = 4 * stW + 3 * gapPx;
      const stStartX = (widthPx - stTotalW) / 2;
      const stStartY = ppStartY + 2 * ppH + gapPx * 2;

      for (let c = 0; c < 4; c++) {
        const x = stStartX + c * (stW + gapPx);
        const y = stStartY;
        const targetImg = imgSecondary || imgPrimary;
        if (targetImg) ctx.drawImage(targetImg, x, y, stW, stH);
        if (hasBorder) {
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, stW, stH);
        }
        if (includeCutMarks) drawCutGuides(ctx, x, y, stW, stH, 4);
      }
    } else if (presetPackage === '8PP') {
      // 8 Passport photos (4x2 on 4R or A4)
      const ppW = mmToPx(38, dpi);
      const ppH = mmToPx(48, dpi);
      const cols = 2;
      const rows = 4;
      const totalW = cols * ppW + (cols - 1) * gapPx;
      const totalH = rows * ppH + (rows - 1) * gapPx;
      const startX = (widthPx - totalW) / 2;
      const startY = (heightPx - totalH) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * (ppW + gapPx);
          const y = startY + r * (ppH + gapPx);
          if (imgPrimary) ctx.drawImage(imgPrimary, x, y, ppW, ppH);
          if (hasBorder) {
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, ppW, ppH);
          }
          if (includeCutMarks) drawCutGuides(ctx, x, y, ppW, ppH, 4);
        }
      }
    } else if (presetPackage === '6PP_2STAMP') {
      // 6 Passport + 2 Stamp
      const ppW = mmToPx(38, dpi);
      const ppH = mmToPx(48, dpi);
      const stW = mmToPx(20, dpi);
      const stH = mmToPx(25, dpi);

      const startX = (widthPx - (2 * ppW + gapPx)) / 2;
      const startY = mmToPx(6, dpi);

      // 6 Passport (3 rows x 2 cols)
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          const x = startX + c * (ppW + gapPx);
          const y = startY + r * (ppH + gapPx);
          if (imgPrimary) ctx.drawImage(imgPrimary, x, y, ppW, ppH);
          if (hasBorder) {
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, ppW, ppH);
          }
          if (includeCutMarks) drawCutGuides(ctx, x, y, ppW, ppH, 4);
        }
      }
    } else if (presetPackage === '12STAMP') {
      // 12 Stamp photos (3x4 grid)
      const stW = mmToPx(22, dpi);
      const stH = mmToPx(28, dpi);
      const cols = 3;
      const rows = 4;
      const totalW = cols * stW + (cols - 1) * gapPx;
      const totalH = rows * stH + (rows - 1) * gapPx;
      const startX = (widthPx - totalW) / 2;
      const startY = (heightPx - totalH) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * (stW + gapPx);
          const y = startY + r * (stH + gapPx);
          const targetImg = imgSecondary || imgPrimary;
          if (targetImg) ctx.drawImage(targetImg, x, y, stW, stH);
          if (hasBorder) {
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, stW, stH);
          }
          if (includeCutMarks) drawCutGuides(ctx, x, y, stW, stH, 4);
        }
      }
    } else if (presetPackage === '16PP_A4') {
      // 16 Passport on A4 (4x4)
      const ppW = mmToPx(40, dpi);
      const ppH = mmToPx(50, dpi);
      const cols = 4;
      const rows = 4;
      const totalW = cols * ppW + (cols - 1) * gapPx;
      const totalH = rows * ppH + (rows - 1) * gapPx;
      const startX = (widthPx - totalW) / 2;
      const startY = (heightPx - totalH) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * (ppW + gapPx);
          const y = startY + r * (ppH + gapPx);
          if (imgPrimary) ctx.drawImage(imgPrimary, x, y, ppW, ppH);
          if (hasBorder) {
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, ppW, ppH);
          }
          if (includeCutMarks) drawCutGuides(ctx, x, y, ppW, ppH, 4);
        }
      }
    }
  };

  // Re-draw preview canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpi = 150;
    const wPx = mmToPx(paperWidthMm, dpi);
    const hPx = mmToPx(paperHeightMm, dpi);

    canvas.width = wPx;
    canvas.height = hPx;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      renderPrintSheet(ctx, wPx, hPx, dpi);
    }
  }, [paperSize, orientation, presetPackage, primaryPhoto, secondaryPhoto, gapMm, hasBorder, includeCutMarks, paperWidthMm, paperHeightMm]);

  const handleDownloadSheet = () => {
    const dpi = 300;
    const wPx = mmToPx(paperWidthMm, dpi);
    const hPx = mmToPx(paperHeightMm, dpi);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = wPx;
    outCanvas.height = hPx;
    const ctx = outCanvas.getContext('2d')!;
    renderPrintSheet(ctx, wPx, hPx, dpi).then(() => {
      const url = outCanvas.toDataURL('image/jpeg', 0.98);
      downloadDataUrl(url, `Studio_Print_Sheet_${presetPackage}_${paperSize}.jpg`);
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 font-bold">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              ৪R ও A4 মাল্টি-ফটো প্রিন্ট শিট জেনারেটর (Photo Sheet Studio)
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                4R & A4 PACKS
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              ১-ক্লিকে ৪ পাসপোর্ট + ৪ স্ট্যাম্প বা ৮ পাসপোর্ট ফটো কম্বো প্রিন্ট শিট তৈরি করে প্রিন্ট নিন।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDemoPhoto}
            className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            ডেমো ছবি লোড
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            অটো প্রিন্ট প্রিভিউ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Layout Presets & Paper Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Upload Primary / Secondary Photos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
              <span className="text-xs font-bold text-slate-800 block mb-2">১. মূল পাসপোর্ট ছবি</span>
              {primaryPhoto ? (
                <div className="h-28 rounded overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <img src={primaryPhoto} alt="Primary" className="h-full object-contain" />
                </div>
              ) : (
                <label className="h-28 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded flex flex-col items-center justify-center p-2 cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition">
                  <Upload className="w-4 h-4 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-700 font-semibold">ছবি আপলোড</span>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'primary')} className="hidden" />
                </label>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
              <span className="text-xs font-bold text-slate-800 block mb-2">২. স্ট্যাম্প ছবি (ঐচ্ছিক)</span>
              {secondaryPhoto ? (
                <div className="h-28 rounded overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <img src={secondaryPhoto} alt="Secondary" className="h-full object-contain" />
                </div>
              ) : (
                <label className="h-28 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded flex flex-col items-center justify-center p-2 cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition">
                  <Upload className="w-4 h-4 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-700 font-semibold">স্ট্যাম্প ছবি</span>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'secondary')} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* 2. Studio Package Presets */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 text-xs shadow-xs">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-tight flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              স্টুডিও প্রিন্ট প্যাকেজ নির্বাচন
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: '4PP_4STAMP', label: '৪ পাসপোর্ট + ৪ স্ট্যাম্প', desc: 'সবচেয়ে জনপ্রিয় ৪R প্যাকেজ', paper: '4R' },
                { id: '8PP', label: '৮টি পাসপোর্ট ফটো (4R)', desc: 'ফুল শিট পাসপোর্ট সাইজ', paper: '4R' },
                { id: '6PP_2STAMP', label: '৬ পাসপোর্ট + ২ স্ট্যাম্প', desc: 'কম্বো প্রিন্ট শিট', paper: '4R' },
                { id: '12STAMP', label: '১২টি স্ট্যাম্প ফটো (4R)', desc: 'স্কুল-কলেজ ভর্তি ফরম', paper: '4R' },
                { id: '16PP_A4', label: '১৬টি পাসপোর্ট ফটো (A4)', desc: 'A4 সাইজ বড় শিট', paper: 'A4' },
              ].map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => {
                    setPresetPackage(pkg.id);
                    if (pkg.paper === 'A4') setPaperSize('A4');
                    else setPaperSize('4R');
                  }}
                  className={`p-2.5 rounded border text-left transition ${
                    presetPackage === pkg.id
                      ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/30 text-blue-950'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <p className="font-bold text-xs text-slate-900">{pkg.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{pkg.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Paper & Spacing Controls */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 text-xs shadow-xs">
            <h3 className="text-[11px] font-bold uppercase text-slate-500 tracking-tight flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              কাগজ ও কাটিং সেটিংস
            </h3>

            {/* Paper selector */}
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-semibold">কাগজ সাইজ:</span>
              <div className="inline-flex rounded bg-slate-100 p-0.5 border border-slate-200">
                {(['4R', '3R', 'A4'] as PaperSize[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPaperSize(p)}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      paperSize === p ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-slate-700 font-semibold">কাগজের দিক:</span>
              <div className="inline-flex rounded bg-slate-100 p-0.5 border border-slate-200">
                <button
                  onClick={() => setOrientation('portrait')}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    orientation === 'portrait' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  খাড়া (Portrait)
                </button>
                <button
                  onClick={() => setOrientation('landscape')}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    orientation === 'landscape' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  আড়াআড়ি (Landscape)
                </button>
              </div>
            </div>

            {/* Gap & Cut Marks */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>ছবির মাঝের ফাঁকা (Gap)</span>
                  <span className="font-mono text-slate-800 font-bold">{gapMm} mm</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={gapMm}
                  onChange={(e) => setGapMm(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={hasBorder}
                    onChange={(e) => setHasBorder(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>কাটিং দাগ (Border)</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={includeCutMarks}
                    onChange={(e) => setIncludeCutMarks(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>কাঁচি কাটার গাইডলাইন</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Live Sheet Canvas Viewport & Action */}
        <div className="lg:col-span-7 space-y-4 flex flex-col">
          <div className="bg-white border border-slate-200 rounded-lg flex-1 flex flex-col overflow-hidden shadow-xs">
            <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                লাইভ প্রিন্ট শিট প্রিভিউ ({dim.nameBn})
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                {paperWidthMm} × {paperHeightMm} mm
              </span>
            </div>

            {/* Canvas */}
            <div className="flex-1 bg-slate-100 p-4 flex items-center justify-center relative min-h-[380px] overflow-auto">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[460px] object-contain shadow-md rounded border border-slate-200 bg-white"
              />
              <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 font-mono italic">
                300 DPI Photo Glossy Paper Ready
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-amber-500" />
                <span>কাঁচি দিয়ে কাটার জন্য নিখুঁত গ্যাপ ও কর্নার মার্ক যুক্ত আছে</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadSheet}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  HD শিট ডাউনলোড
                </button>

                <button
                  onClick={() => setShowPrintModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                >
                  <Printer className="w-4 h-4" />
                  অটো প্রিন্ট প্রিভিউ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="স্টুডিও মাল্টি-ফটো প্রিন্ট শিট"
        renderCanvasContent={renderPrintSheet}
        paperSize={paperSize}
        orientation={orientation}
      />
    </div>
  );
};
