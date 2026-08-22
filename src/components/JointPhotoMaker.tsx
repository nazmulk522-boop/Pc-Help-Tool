import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Users, 
  Upload, 
  Printer, 
  Download, 
  FlipHorizontal, 
  RotateCw, 
  Sliders, 
  Palette, 
  Eye, 
  Send,
  Layers,
  ZoomIn,
  ZoomOut,
  Move,
  Crop,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { STUDIO_BG_COLORS, CoupleJointSettings, PHOTO_PRESETS } from '../types';
import { 
  loadImage, 
  downloadDataUrl, 
  mmToPx, 
  applyFiltersToCanvas,
  removeBackgroundAuto 
} from '../utils/imageProcessing';
import { PrintPreviewModal } from './PrintPreviewModal';
import { InteractiveCropperModal } from './InteractiveCropperModal';

interface JointPhotoMakerProps {
  onSendToPrintSheet?: (imageUrl: string, type: 'joint') => void;
}

export const JointPhotoMaker: React.FC<JointPhotoMakerProps> = ({ onSendToPrintSheet }) => {
  const [person1Raw, setPerson1Raw] = useState<string | null>(null);
  const [person2Raw, setPerson2Raw] = useState<string | null>(null);
  const [person1Cutout, setPerson1Cutout] = useState<string | null>(null); // transparent cutout
  const [person2Cutout, setPerson2Cutout] = useState<string | null>(null); // transparent cutout

  const [activePerson, setActivePerson] = useState<1 | 2>(1);
  const [selectedBgColor, setSelectedBgColor] = useState<string>('#5B92E5');
  const [targetWidthMm, setTargetWidthMm] = useState<number>(50);
  const [targetHeightMm, setTargetHeightMm] = useState<number>(40);
  const [showGuideLines, setShowGuideLines] = useState<boolean>(true);
  const [isProcessingBg1, setIsProcessingBg1] = useState<boolean>(false);
  const [isProcessingBg2, setIsProcessingBg2] = useState<boolean>(false);

  // Cropper Modal state
  const [croppingPerson, setCroppingPerson] = useState<1 | 2 | null>(null);

  // Transforms for Person 1 and Person 2
  const [settings, setSettings] = useState<CoupleJointSettings>({
    person1: {
      x: -26,
      y: 10,
      scale: 100,
      rotate: 0,
      flipH: false,
      brightness: 0,
      contrast: 0,
    },
    person2: {
      x: 26,
      y: 10,
      scale: 100,
      rotate: 0,
      flipH: false,
      brightness: 0,
      contrast: 0,
    },
    bgColor: '#5B92E5',
    preset: 'JOINT_50x40',
    order: 'p1_left',
    shoulderOverlap: 15,
  });

  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Automatic background removal for Person 1
  const processPerson1Bg = useCallback(async (srcUrl: string) => {
    setIsProcessingBg1(true);
    try {
      const res = await removeBackgroundAuto(srcUrl, { targetBgColor: null });
      setPerson1Cutout(res.transparentDataUrl);
    } catch (err) {
      console.error('Person 1 bg error:', err);
      setPerson1Cutout(srcUrl);
    } finally {
      setIsProcessingBg1(false);
    }
  }, []);

  // Automatic background removal for Person 2
  const processPerson2Bg = useCallback(async (srcUrl: string) => {
    setIsProcessingBg2(true);
    try {
      const res = await removeBackgroundAuto(srcUrl, { targetBgColor: null });
      setPerson2Cutout(res.transparentDataUrl);
    } catch (err) {
      console.error('Person 2 bg error:', err);
      setPerson2Cutout(srcUrl);
    } finally {
      setIsProcessingBg2(false);
    }
  }, []);

  // Demo Couple Images for fast testing
  const loadDemoCouple = () => {
    // Person 1 (Groom)
    const svg1 = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="380" viewBox="0 0 300 380">
        <rect width="100%" height="100%" fill="#94a3b8"/>
        <circle cx="150" cy="140" r="70" fill="#fed7aa"/>
        <path d="M 80 130 Q 150 50 220 130 Q 230 80 150 60 Q 70 80 80 130" fill="#1e293b"/>
        <circle cx="125" cy="135" r="6" fill="#1e293b"/>
        <circle cx="175" cy="135" r="6" fill="#1e293b"/>
        <path d="M 140 180 Q 150 190 160 180" stroke="#be185d" stroke-width="3" fill="none"/>
        <rect x="130" y="200" width="40" height="40" fill="#fed7aa"/>
        <path d="M 40 380 L 100 240 L 200 240 L 260 380 Z" fill="#0f172a"/>
        <polygon points="135,240 165,240 150,310" fill="#ffffff"/>
        <polygon points="145,240 155,240 150,350" fill="#dc2626"/>
      </svg>
    `;

    // Person 2 (Bride)
    const svg2 = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="380" viewBox="0 0 300 380">
        <rect width="100%" height="100%" fill="#cbd5e1"/>
        <circle cx="150" cy="140" r="68" fill="#fce7f3"/>
        <path d="M 60 150 Q 150 40 240 150 Q 260 90 150 50 Q 40 90 60 150" fill="#701a75"/>
        <circle cx="125" cy="135" r="6" fill="#1e293b"/>
        <circle cx="175" cy="135" r="6" fill="#1e293b"/>
        <path d="M 135 175 Q 150 190 165 175" stroke="#db2777" stroke-width="4" fill="none"/>
        <rect x="130" y="200" width="40" height="40" fill="#fce7f3"/>
        <path d="M 40 380 L 95 240 L 205 240 L 260 380 Z" fill="#be123c"/>
        <path d="M 70 380 L 120 240 L 180 240 L 230 380 Z" fill="#e11d48"/>
        <circle cx="150" cy="100" r="5" fill="#f59e0b"/>
      </svg>
    `;

    const url1 = `data:image/svg+xml;utf8,${encodeURIComponent(svg1)}`;
    const url2 = `data:image/svg+xml;utf8,${encodeURIComponent(svg2)}`;
    setPerson1Raw(url1);
    setPerson2Raw(url2);
    processPerson1Bg(url1);
    processPerson2Bg(url2);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, person: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (person === 1) {
        setPerson1Raw(url);
        processPerson1Bg(url);
      } else {
        setPerson2Raw(url);
        processPerson2Bg(url);
      }
    };
    reader.readAsDataURL(file);
  };

  // Render Joint Couple Canvas
  const renderJointCanvas = async (
    ctx: CanvasRenderingContext2D,
    widthPx: number,
    heightPx: number,
    dpi = 300,
    withGuides = false
  ) => {
    // 1. Fill unified studio background with selected color
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, widthPx, heightPx);

    const src1 = person1Cutout || person1Raw;
    const src2 = person2Cutout || person2Raw;

    const [img1, img2] = await Promise.all([
      src1 ? loadImage(src1) : null,
      src2 ? loadImage(src2) : null,
    ]);

    // Helper to draw single subject
    const drawPerson = (
      img: HTMLImageElement | null,
      t: typeof settings.person1,
      defaultXOffset: number
    ) => {
      if (!img) return;

      ctx.save();
      const posX = widthPx / 2 + (t.x / 100) * widthPx;
      const posY = heightPx / 2 + (t.y / 100) * heightPx;

      ctx.translate(posX, posY);
      ctx.rotate((t.rotate * Math.PI) / 180);
      if (t.flipH) {
        ctx.scale(-1, 1);
      }

      const scale = (t.scale / 100) * (heightPx / img.height) * 0.95;
      const renderW = img.width * scale;
      const renderH = img.height * scale;

      ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
      ctx.restore();
    };

    // Draw in order based on layer overlap preference
    if (settings.order === 'p1_left') {
      drawPerson(img2, settings.person2, 26);
      drawPerson(img1, settings.person1, -26);
    } else {
      drawPerson(img1, settings.person1, -26);
      drawPerson(img2, settings.person2, 26);
    }

    // Draw Alignment Guides on preview canvas if enabled
    if (withGuides) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Center divider
      ctx.beginPath();
      ctx.moveTo(widthPx / 2, 0);
      ctx.lineTo(widthPx / 2, heightPx);
      // Eye level line (around 38% from top)
      ctx.moveTo(0, heightPx * 0.38);
      ctx.lineTo(widthPx, heightPx * 0.38);
      // Chin level line (around 62% from top)
      ctx.moveTo(0, heightPx * 0.62);
      ctx.lineTo(widthPx, heightPx * 0.62);
      ctx.stroke();
      ctx.restore();
    }
  };

  // Re-draw main preview canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpi = 200;
    const wPx = mmToPx(targetWidthMm, dpi);
    const hPx = mmToPx(targetHeightMm, dpi);

    canvas.width = wPx;
    canvas.height = hPx;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      renderJointCanvas(ctx, wPx, hPx, dpi, showGuideLines);
    }
  }, [person1Cutout, person1Raw, person2Cutout, person2Raw, settings, selectedBgColor, targetWidthMm, targetHeightMm, showGuideLines]);

  const getJointDataUrl = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    return canvas.toDataURL('image/jpeg', 0.98);
  };

  const handleDownload = () => {
    const dpi = 300;
    const wPx = mmToPx(targetWidthMm, dpi);
    const hPx = mmToPx(targetHeightMm, dpi);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = wPx;
    outCanvas.height = hPx;
    const ctx = outCanvas.getContext('2d')!;
    renderJointCanvas(ctx, wPx, hPx, dpi, false).then(() => {
      const url = outCanvas.toDataURL('image/jpeg', 0.98);
      downloadDataUrl(url, `Joint_Passport_${targetWidthMm}x${targetHeightMm}mm.jpg`);
    });
  };

  // Render for Multi-Photo 4R Print Preview
  const renderPrintPage = (
    ctx: CanvasRenderingContext2D,
    widthPx: number,
    heightPx: number,
    dpi = 300
  ) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, widthPx, heightPx);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Draw 4 Joint Passport copies on 4R paper
    const photoWPx = mmToPx(targetWidthMm, dpi);
    const photoHPx = mmToPx(targetHeightMm, dpi);
    const gapPx = mmToPx(6, dpi);

    const cols = 2;
    const rows = 2;
    const totalW = cols * photoWPx + (cols - 1) * gapPx;
    const totalH = rows * photoHPx + (rows - 1) * gapPx;
    const startX = (widthPx - totalW) / 2;
    const startY = (heightPx - totalH) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (photoWPx + gapPx);
        const y = startY + r * (photoHPx + gapPx);

        ctx.drawImage(canvas, x, y, photoWPx, photoHPx);
        
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, photoWPx, photoHPx);
      }
    }
  };

  const currentPersonTransform = activePerson === 1 ? settings.person1 : settings.person2;

  const updateActiveTransform = (key: keyof typeof settings.person1, value: any) => {
    setSettings((s) => ({
      ...s,
      [activePerson === 1 ? 'person1' : 'person2']: {
        ...s[activePerson === 1 ? 'person1' : 'person2'],
        [key]: value,
      },
    }));
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              যৌথ পাসপোর্ট সাইজ ছবি মেকার (Joint Couple Photo Studio)
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                DUAL AUTO-CUTOUT
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              দুটি ছবি আপলোড করলেই অটো ব্যাকগ্রাউন্ড রিমুভ হবে এবং সিলেক্ট করা কালার ব্যাকগ্রাউন্ডে সেট হবে।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDemoCouple}
            className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            ডেমো বর-কনে লোড
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
        {/* Left Side: Uploads & Individual Transforms */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Upload Boxes for Person 1 & 2 */}
          <div className="grid grid-cols-2 gap-3">
            {/* Person 1 */}
            <div
              onClick={() => setActivePerson(1)}
              className={`p-3 rounded-lg border cursor-pointer transition shadow-xs ${
                activePerson === 1
                  ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500/30'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  ১. ১ম ছবি (বর/১ম ব্যক্তি)
                </span>
                {isProcessingBg1 && (
                  <span className="text-[10px] text-blue-600 font-bold animate-pulse">কাটআউট...</span>
                )}
              </div>

              {person1Raw ? (
                <div className="space-y-2">
                  <div className="h-28 rounded overflow-hidden bg-slate-900/10 border border-slate-200 flex items-center justify-center relative">
                    <img
                      src={person1Cutout || person1Raw}
                      alt="Person 1"
                      className="h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCroppingPerson(1);
                      }}
                      className="flex-1 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-bold flex items-center justify-center gap-1"
                    >
                      <Crop className="w-3 h-3" />
                      ক্রপ
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPerson1Raw(null);
                        setPerson1Cutout(null);
                      }}
                      className="px-2 py-1 rounded text-[11px] text-red-600 hover:bg-red-50"
                    >
                      মুছুন
                    </button>
                  </div>
                </div>
              ) : (
                <label className="h-28 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded flex flex-col items-center justify-center p-2 cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition">
                  <Upload className="w-4 h-4 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-700 font-semibold">১ম ছবি আপলোড</span>
                  <span className="text-[10px] text-slate-400">অটো কাটআউট হবে</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 1)}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Person 2 */}
            <div
              onClick={() => setActivePerson(2)}
              className={`p-3 rounded-lg border cursor-pointer transition shadow-xs ${
                activePerson === 2
                  ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500/30'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-600"></span>
                  ২. ২য় ছবি (কনে/২য় ব্যক্তি)
                </span>
                {isProcessingBg2 && (
                  <span className="text-[10px] text-pink-600 font-bold animate-pulse">কাটআউট...</span>
                )}
              </div>

              {person2Raw ? (
                <div className="space-y-2">
                  <div className="h-28 rounded overflow-hidden bg-slate-900/10 border border-slate-200 flex items-center justify-center relative">
                    <img
                      src={person2Cutout || person2Raw}
                      alt="Person 2"
                      className="h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCroppingPerson(2);
                      }}
                      className="flex-1 py-1 rounded bg-pink-100 hover:bg-pink-200 text-pink-800 text-[11px] font-bold flex items-center justify-center gap-1"
                    >
                      <Crop className="w-3 h-3" />
                      ক্রপ
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPerson2Raw(null);
                        setPerson2Cutout(null);
                      }}
                      className="px-2 py-1 rounded text-[11px] text-red-600 hover:bg-red-50"
                    >
                      মুছুন
                    </button>
                  </div>
                </div>
              ) : (
                <label className="h-28 border-2 border-dashed border-slate-200 hover:border-pink-500 rounded flex flex-col items-center justify-center p-2 cursor-pointer bg-slate-50 hover:bg-pink-50/30 transition">
                  <Upload className="w-4 h-4 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-700 font-semibold">২য় ছবি আপলোড</span>
                  <span className="text-[10px] text-slate-400">অটো কাটআউট হবে</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 2)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* 2. Unified Studio Background Color */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-tight flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-blue-600" />
                যৌথ ছবির ব্যাকগ্রাউন্ড কালার
              </span>
              <span className="text-[11px] text-slate-500">উভয় ব্যক্তির পেছনে একই কালার সেট হবে</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {STUDIO_BG_COLORS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setSelectedBgColor(bg.hex)}
                  className={`p-2 rounded border flex flex-col items-center gap-1.5 transition ${
                    selectedBgColor === bg.hex
                      ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/30'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full border border-slate-300 shadow-xs"
                    style={{ backgroundColor: bg.hex }}
                  />
                  <span className="text-[10px] text-slate-700 text-center font-bold leading-tight">
                    {bg.nameBn.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Color Input */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-600">কাস্টম কালার:</span>
              <input
                type="color"
                value={selectedBgColor}
                onChange={(e) => setSelectedBgColor(e.target.value)}
                className="w-7 h-7 rounded border border-slate-200 bg-transparent cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-slate-700">{selectedBgColor.toUpperCase()}</span>
            </div>
          </div>

          {/* 3. Fine Adjustments for Active Person */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 text-xs shadow-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                {activePerson === 1 ? '১ম ব্যক্তির' : '২য় ব্যক্তির'} পজিশন ও সাইজ সমন্বয়
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActivePerson(1)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activePerson === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  ব্যক্তি ১
                </button>
                <button
                  onClick={() => setActivePerson(2)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activePerson === 2 ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  ব্যক্তি ২
                </button>
              </div>
            </div>

            {/* Scale & Horizontal Position */}
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>সাইজ / স্কেল (Scale)</span>
                  <span className="font-mono text-slate-800 font-bold">{currentPersonTransform.scale}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={currentPersonTransform.scale}
                  onChange={(e) => updateActiveTransform('scale', Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>পাশাপাশি সরান (X Offset)</span>
                  <span className="font-mono text-slate-800 font-bold">{currentPersonTransform.x}</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={currentPersonTransform.x}
                  onChange={(e) => updateActiveTransform('x', Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>উপরে-নিচে সরান (Y Offset)</span>
                  <span className="font-mono text-slate-800 font-bold">{currentPersonTransform.y}</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={currentPersonTransform.y}
                  onChange={(e) => updateActiveTransform('y', Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>

            {/* Flip & Layer Order Controls */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => updateActiveTransform('flipH', !currentPersonTransform.flipH)}
                className={`px-3 py-1.5 rounded border text-xs font-semibold flex items-center gap-1.5 transition ${
                  currentPersonTransform.flipH
                    ? 'bg-blue-50 border-blue-500 text-blue-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                মুখোমুখি ফ্লিপ (Flip)
              </button>

              <button
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    order: s.order === 'p1_left' ? 'p2_left' : 'p1_left',
                  }))
                }
                className="px-3 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Layers className="w-3.5 h-3.5" />
                কাঁধ ওভারল্যাপ বদলান
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Live Combined Preview */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden shadow-xs">
            <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  যৌথ ছবির লাইভ প্রিভিউ ({targetWidthMm} × {targetHeightMm} mm)
                </span>
                {(isProcessingBg1 || isProcessingBg2) && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded animate-pulse">
                    কাটআউট প্রসেসিং চলছে...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGuideLines}
                    onChange={(e) => setShowGuideLines(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>গাইডলাইন</span>
                </label>
              </div>
            </div>

            {/* Canvas Viewport */}
            <div className="p-6 bg-slate-900/90 flex items-center justify-center relative min-h-[420px] overflow-auto">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[420px] object-contain shadow-2xl rounded border border-white/20"
              />
              <div className="absolute bottom-2 right-2 text-[10px] text-slate-300 font-mono bg-slate-800/80 px-2 py-0.5 rounded">
                Joint Studio • 300 DPI Calibrated
              </div>
            </div>

            {/* Quick Action Footer */}
            <div className="p-3.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  disabled={!person1Raw && !person2Raw}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  ডাউনলোড JPG
                </button>

                {onSendToPrintSheet && (
                  <button
                    onClick={() => {
                      const url = getJointDataUrl();
                      if (url) onSendToPrintSheet(url, 'joint');
                    }}
                    disabled={!person1Raw && !person2Raw}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    প্রিন্ট শীটে পাঠান
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowPrintModal(true)}
                disabled={!person1Raw && !person2Raw}
                className="inline-flex items-center gap-2 px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                অটো প্রিন্ট প্রিভিউ (4R Sheet)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Cropper Modal for Person 1 or 2 */}
      {croppingPerson && (
        <InteractiveCropperModal
          isOpen={!!croppingPerson}
          onClose={() => setCroppingPerson(null)}
          imageSrc={
            croppingPerson === 1
              ? person1Raw || ''
              : person2Raw || ''
          }
          title={
            croppingPerson === 1
              ? '১ম ব্যক্তির ছবি ম্যানুয়াল ক্রপ করুন'
              : '২য় ব্যক্তির ছবি ম্যানুয়াল ক্রপ করুন'
          }
          aspectRatioOptions={[
            { id: 'passport', label: 'পাসপোর্ট অনুপাত (৪৫ × ৩৫ mm)', ratio: 35 / 45 },
            { id: 'free', label: 'ফ্রি-হ্যান্ড / কাস্টম', ratio: null },
            { id: 'square', label: '১:১ বর্গাকার', ratio: 1 },
          ]}
          onCropComplete={(croppedUrl) => {
            if (croppingPerson === 1) {
              setPerson1Raw(croppedUrl);
              processPerson1Bg(croppedUrl);
            } else {
              setPerson2Raw(croppedUrl);
              processPerson2Bg(croppedUrl);
            }
          }}
        />
      )}

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="যৌথ পাসপোর্ট ফটো ৪R প্রিন্ট প্রিভিউ"
        renderCanvasContent={renderPrintPage}
        paperSize="4R"
        orientation="portrait"
      />
    </div>
  );
};
