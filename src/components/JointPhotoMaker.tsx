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
  RefreshCw,
  Trash2,
  Check,
  Globe,
  RotateCcw,
  Plus
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
  const [isTransparent, setIsTransparent] = useState<boolean>(false);
  const [targetWidthMm, setTargetWidthMm] = useState<number>(50);
  const [targetHeightMm, setTargetHeightMm] = useState<number>(40);
  const [selectedPreset, setSelectedPreset] = useState<string>('JOINT_50x40');
  const [showGuideLines, setShowGuideLines] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isProcessingBg1, setIsProcessingBg1] = useState<boolean>(false);
  const [isProcessingBg2, setIsProcessingBg2] = useState<boolean>(false);
  const [apiSourceInfo, setApiSourceInfo] = useState<string | null>('Remove.bg / স্টুডিও AI অটো কাটআউট সক্রিয়');

  // Cropper Modal state
  const [croppingPerson, setCroppingPerson] = useState<1 | 2 | null>(null);

  // Transforms for Person 1 and Person 2
  const [settings, setSettings] = useState<CoupleJointSettings>({
    person1: {
      x: -24,
      y: 8,
      scale: 100,
      rotate: 0,
      flipH: false,
      brightness: 0,
      contrast: 0,
    },
    person2: {
      x: 24,
      y: 8,
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
  const fileInput1Ref = useRef<HTMLInputElement | null>(null);
  const fileInput2Ref = useRef<HTMLInputElement | null>(null);

  // Automatic background removal for Person 1
  const processPerson1Bg = useCallback(async (srcUrl: string) => {
    setIsProcessingBg1(true);
    try {
      const res = await removeBackgroundAuto(srcUrl, { 
        targetBgColor: null,
        service: 'remove_bg',
      });
      setPerson1Cutout(res.transparentDataUrl);
      setApiSourceInfo('১ম ছবির ব্যাকগ্রাউন্ড সফলভাবে রিমুভ হয়েছে।');
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
      const res = await removeBackgroundAuto(srcUrl, { 
        targetBgColor: null,
        service: 'remove_bg',
      });
      setPerson2Cutout(res.transparentDataUrl);
      setApiSourceInfo('২য় ছবির ব্যাকগ্রাউন্ড সফলভাবে রিমুভ হয়েছে।');
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
        setActivePerson(1);
      } else {
        setPerson2Raw(url);
        processPerson2Bg(url);
        setActivePerson(2);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, person: 1 | 2) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (person === 1) {
        setPerson1Raw(url);
        processPerson1Bg(url);
        setActivePerson(1);
      } else {
        setPerson2Raw(url);
        processPerson2Bg(url);
        setActivePerson(2);
      }
    };
    reader.readAsDataURL(file);
  };

  // Change Preset Size
  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    if (presetKey === 'JOINT_50x40') {
      setTargetWidthMm(50);
      setTargetHeightMm(40);
    } else if (presetKey === 'JOINT_45x35') {
      setTargetWidthMm(45);
      setTargetHeightMm(35);
    } else if (presetKey === 'JOINT_50x50') {
      setTargetWidthMm(50);
      setTargetHeightMm(50);
    } else if (presetKey === 'JOINT_60x40') {
      setTargetWidthMm(60);
      setTargetHeightMm(40);
    }
  };

  // Render Joint Couple Canvas
  const renderJointCanvas = async (
    ctx: CanvasRenderingContext2D,
    widthPx: number,
    heightPx: number,
    dpi = 300,
    withGuides = false
  ) => {
    // 1. Fill unified studio background with selected color or transparent
    if (isTransparent) {
      ctx.clearRect(0, 0, widthPx, heightPx);
    } else {
      ctx.fillStyle = selectedBgColor;
      ctx.fillRect(0, 0, widthPx, heightPx);
    }

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
      drawPerson(img2, settings.person2, 24);
      drawPerson(img1, settings.person1, -24);
    } else {
      drawPerson(img1, settings.person1, -24);
      drawPerson(img2, settings.person2, 24);
    }

    // Draw Alignment Guides on preview canvas if enabled
    if (withGuides) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);

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
  }, [
    person1Cutout, 
    person1Raw, 
    person2Cutout, 
    person2Raw, 
    settings, 
    selectedBgColor, 
    isTransparent,
    targetWidthMm, 
    targetHeightMm, 
    showGuideLines
  ]);

  const getJointDataUrl = (format: 'image/jpeg' | 'image/png' = 'image/png'): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    return canvas.toDataURL(format, format === 'image/jpeg' ? 0.98 : 1.0);
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
      const mime = isTransparent ? 'image/png' : 'image/jpeg';
      const ext = isTransparent ? 'png' : 'jpg';
      const url = outCanvas.toDataURL(mime, 0.98);
      downloadDataUrl(url, `Joint_Couple_Passport_${targetWidthMm}x${targetHeightMm}mm.${ext}`);
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

  const resetActiveTransform = () => {
    setSettings((s) => ({
      ...s,
      [activePerson === 1 ? 'person1' : 'person2']: {
        x: activePerson === 1 ? -24 : 24,
        y: 8,
        scale: 100,
        rotate: 0,
        flipH: false,
        brightness: 0,
        contrast: 0,
      },
    }));
  };

  const hasAnyPhoto = Boolean(person1Raw || person2Raw);

  return (
    <div className="space-y-4">
      {/* Top Banner Bar matching Passport Studio */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 font-bold shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              যৌথ পাসপোর্ট ছবি ও ব্যাকগ্রাউন্ড স্টুডিও
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                DUAL AUTO-CUTOUT
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              নিচে পিক ১ ও পিক ২ যোগ করুন। ছবি দুটি স্বয়ংক্রিয়ভাবে কাটআউট হয়ে যৌথ পাসপোর্ট ছবিতে প্রিভিউ হবে।
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
            disabled={!hasAnyPhoto}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            অটো প্রিন্ট প্রিভিউ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (7 cols): Main Viewport Canvas + Action Toolbar + Bottom Pic 1 & Pic 2 Cards */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* 1. Main Viewport Box (Exactly like BackgroundRemover) */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            {/* Viewport Top Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  যৌথ ছবির লাইভ প্রিভিউ ({targetWidthMm} × {targetHeightMm} mm)
                </span>
                {(isProcessingBg1 || isProcessingBg2) && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded animate-pulse">
                    কাটআউট প্রসেসিং চলছে...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Guidelines Toggle */}
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showGuideLines}
                    onChange={(e) => setShowGuideLines(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span>গাইডলাইন</span>
                </label>

                {/* Zoom Controls */}
                <div className="hidden sm:flex items-center border border-slate-200 rounded bg-white overflow-hidden shadow-2xs">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                    className="p-1 hover:bg-slate-100 text-slate-600 transition"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-[10px] font-mono font-bold text-slate-700">
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(180, z + 10))}
                    className="p-1 hover:bg-slate-100 text-slate-600 transition"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Dark Studio Canvas Stage */}
            <div className="p-6 sm:p-8 bg-slate-950/95 flex items-center justify-center relative min-h-[380px] sm:min-h-[420px] overflow-auto">
              {hasAnyPhoto ? (
                <div 
                  className="transition-transform duration-100 flex items-center justify-center"
                  style={{ transform: `scale(${zoomLevel / 100})` }}
                >
                  <canvas
                    ref={canvasRef}
                    className="max-w-full max-h-[380px] sm:max-h-[420px] object-contain shadow-2xl rounded border border-white/20"
                  />
                </div>
              ) : (
                <div className="text-center space-y-4 max-w-sm mx-auto p-6">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto shadow-inner">
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      যৌথ ছবি তৈরি করতে নিচে ছবি যুক্ত করুন
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      নিচে পিক ১ ও পিক ২ ঘরে বর ও কনের ছবি দিন অথবা সরাসরি ডেমো ছবি দিয়ে টেস্ট করুন।
                    </p>
                  </div>
                  <button
                    onClick={loadDemoCouple}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>ডেমো বর-কনে লোড করুন</span>
                  </button>
                </div>
              )}

              {/* 300 DPI Resolution Tag */}
              {hasAnyPhoto && (
                <div className="absolute bottom-2 right-2 text-[10px] text-slate-300 font-mono bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700 shadow-sm">
                  300 DPI • Couple Passport Ready
                </div>
              )}
            </div>

            {/* Engine Status & Action Buttons Toolbar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2.5">
              {/* Engine Switcher / Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 text-xs font-bold flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    কাটআউট ইঞ্জিন:
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white shadow-xs flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Remove.bg / স্টুডিও AI
                  </span>
                </div>
                {apiSourceInfo && (
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                    {apiSourceInfo}
                  </span>
                )}
              </div>

              {/* Action Buttons: Downloads, Print Sheet, 4R Print */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleDownload}
                    disabled={!hasAnyPhoto}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 active:scale-98"
                    title="যৌথ পাসপোর্ট ছবি ডাউনলোড করুন"
                  >
                    <Download className="w-3.5 h-3.5" />
                    ডাউনলোড {isTransparent ? 'PNG' : 'JPG'}
                  </button>

                  {onSendToPrintSheet && (
                    <button
                      onClick={() => {
                        const url = getJointDataUrl('image/png');
                        if (url) onSendToPrintSheet(url, 'joint');
                      }}
                      disabled={!hasAnyPhoto}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      প্রিন্ট শীটে পাঠান
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowPrintModal(true)}
                  disabled={!hasAnyPhoto}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  অটো ৪R প্রিন্ট প্রিভিউ
                </button>
              </div>
            </div>
          </div>

          {/* 2. DEDICATED BOTTOM CARDS: PIC 1 & PIC 2 (With Crop & Delete features) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                নিচের ছবিগুলো নিয়ন্ত্রণ করুন (পিক ১ ও পিক ২):
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                ক্রপ বা ডিলিট করে নতুন ছবি দিতে পারবেন
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* CARD: PIC 1 (Person 1) */}
              <div 
                onClick={() => setActivePerson(1)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 1)}
                className={`bg-white rounded-xl border p-3.5 transition-all shadow-xs flex flex-col justify-between ${
                  activePerson === 1
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      ১
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      পিক ১ (বর / ১ম ব্যক্তি)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isProcessingBg1 ? (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded animate-pulse">
                        কাটআউট...
                      </span>
                    ) : person1Raw ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        যুক্ত আছে
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Card Body */}
                {person1Raw ? (
                  <div className="space-y-3">
                    <div className="relative h-32 rounded-lg bg-slate-900/10 border border-slate-200 flex items-center justify-center overflow-hidden group">
                      <img
                        src={person1Cutout || person1Raw}
                        alt="Person 1"
                        className="h-full w-full object-contain p-1"
                      />
                      {activePerson === 1 && (
                        <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          সিলেক্টেড
                        </div>
                      )}
                    </div>

                    {/* Crop & Delete Buttons as requested */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCroppingPerson(1);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-2xs"
                        title="পিক ১ ক্রপ করুন"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>ক্রপ</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPerson1Raw(null);
                          setPerson1Cutout(null);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-2xs"
                        title="পিক ১ মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ডিলিট</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label 
                    onClick={() => fileInput1Ref.current?.click()}
                    className="h-36 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-lg flex flex-col items-center justify-center p-3 cursor-pointer bg-slate-50 hover:bg-blue-50/40 transition text-center group"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center mb-2 transition">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 mb-0.5">
                      পিক ১ যোগ করুন
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ক্লিক করুন বা ড্র্যাগ করে দিন
                    </span>
                    <input
                      ref={fileInput1Ref}
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.webp,.bmp"
                      onChange={(e) => handleFileUpload(e, 1)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* CARD: PIC 2 (Person 2) */}
              <div 
                onClick={() => setActivePerson(2)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 2)}
                className={`bg-white rounded-xl border p-3.5 transition-all shadow-xs flex flex-col justify-between ${
                  activePerson === 2
                    ? 'border-pink-500 ring-2 ring-pink-500/20 bg-pink-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-pink-600 text-white flex items-center justify-center text-xs font-bold">
                      ২
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      পিক ২ (কনে / ২য় ব্যক্তি)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isProcessingBg2 ? (
                      <span className="text-[10px] font-bold text-pink-700 bg-pink-100 px-2 py-0.5 rounded animate-pulse">
                        কাটআউট...
                      </span>
                    ) : person2Raw ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        যুক্ত আছে
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Card Body */}
                {person2Raw ? (
                  <div className="space-y-3">
                    <div className="relative h-32 rounded-lg bg-slate-900/10 border border-slate-200 flex items-center justify-center overflow-hidden group">
                      <img
                        src={person2Cutout || person2Raw}
                        alt="Person 2"
                        className="h-full w-full object-contain p-1"
                      />
                      {activePerson === 2 && (
                        <div className="absolute top-1.5 right-1.5 bg-pink-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          সিলেক্টেড
                        </div>
                      )}
                    </div>

                    {/* Crop & Delete Buttons as requested */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCroppingPerson(2);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-700 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-2xs"
                        title="পিক ২ ক্রপ করুন"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>ক্রপ</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPerson2Raw(null);
                          setPerson2Cutout(null);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-2xs"
                        title="পিক ২ মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ডিলিট</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label 
                    onClick={() => fileInput2Ref.current?.click()}
                    className="h-36 border-2 border-dashed border-slate-300 hover:border-pink-500 rounded-lg flex flex-col items-center justify-center p-3 cursor-pointer bg-slate-50 hover:bg-pink-50/40 transition text-center group"
                  >
                    <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-600 group-hover:bg-pink-600 group-hover:text-white flex items-center justify-center mb-2 transition">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-pink-700 mb-0.5">
                      পিক ২ যোগ করুন
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ক্লিক করুন বা ড্র্যাগ করে দিন
                    </span>
                    <input
                      ref={fileInput2Ref}
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.webp,.bmp"
                      onChange={(e) => handleFileUpload(e, 2)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Background Color Palette, Size Presets, Fine Tuning */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Studio Background Colors (Exactly matching BackgroundRemover) */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase text-slate-800 tracking-tight flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-blue-600" />
                যে কালার দিবেন ব্যাকগ্রাউন্ডে ওই কালার সেট হবে
              </span>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition">
                <input
                  type="checkbox"
                  checked={isTransparent}
                  onChange={(e) => setIsTransparent(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold text-xs">স্বচ্ছ (PNG)</span>
              </label>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {STUDIO_BG_COLORS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => {
                    setSelectedBgColor(bg.hex);
                    setIsTransparent(false);
                  }}
                  className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition-all ${
                    selectedBgColor === bg.hex && !isTransparent
                      ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/40 shadow-xs'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-full border border-slate-300/80 shadow-xs"
                    style={{ backgroundColor: bg.hex }}
                  />
                  <span className="text-[11px] text-slate-800 text-center font-bold leading-tight">
                    {bg.nameBn.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Color Input */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">কাস্টম কালার:</span>
                <input
                  type="color"
                  value={selectedBgColor}
                  onChange={(e) => {
                    setSelectedBgColor(e.target.value);
                    setIsTransparent(false);
                  }}
                  className="w-8 h-8 rounded border border-slate-300 bg-transparent cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-slate-700">
                  {selectedBgColor.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Photo Size & Preset Selector */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">
                যৌথ ছবির সাইজ ও প্রিসেট:
              </span>
              <span className="text-xs font-mono font-bold text-blue-600">
                {targetWidthMm} × {targetHeightMm} mm
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handlePresetChange('JOINT_50x40')}
                className={`p-2 rounded-lg border text-left transition ${
                  selectedPreset === 'JOINT_50x40'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold">BD স্ট্যান্ডার্ড (50×40 mm)</div>
                <div className="text-[10px] text-slate-500">কাবিননামা ও হজ্ব পাসপোর্ট</div>
              </button>

              <button
                onClick={() => handlePresetChange('JOINT_45x35')}
                className={`p-2 rounded-lg border text-left transition ${
                  selectedPreset === 'JOINT_45x35'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold">কমপ্যাক্ট (45×35 mm)</div>
                <div className="text-[10px] text-slate-500">ছোট আবেদন ফরম</div>
              </button>

              <button
                onClick={() => handlePresetChange('JOINT_50x50')}
                className={`p-2 rounded-lg border text-left transition ${
                  selectedPreset === 'JOINT_50x50'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold">বর্গাকার ভিসা (50×50 mm)</div>
                <div className="text-[10px] text-slate-500">বিশেষ ভিসা ও দলিল</div>
              </button>

              <button
                onClick={() => handlePresetChange('JOINT_60x40')}
                className={`p-2 rounded-lg border text-left transition ${
                  selectedPreset === 'JOINT_60x40'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold">ওয়াইড কাপল (60×40 mm)</div>
                <div className="text-[10px] text-slate-500">ল্যান্ডস্কেপ যৌথ ছবি</div>
              </button>
            </div>
          </div>

          {/* 3. Fine Adjustments for Active Person */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 text-xs shadow-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                পজিশন ও সাইজ সমন্বয় (Active Transform)
              </span>

              {/* Selector for Person 1 / 2 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActivePerson(1)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                    activePerson === 1 
                      ? 'bg-blue-600 text-white shadow-2xs' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  পিক ১
                </button>
                <button
                  onClick={() => setActivePerson(2)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                    activePerson === 2 
                      ? 'bg-pink-600 text-white shadow-2xs' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  পিক ২
                </button>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span className="font-semibold">সাইজ / স্কেল (Scale):</span>
                  <span className="font-mono text-blue-700 font-bold">{currentPersonTransform.scale}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={currentPersonTransform.scale}
                  onChange={(e) => updateActiveTransform('scale', Number(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span className="font-semibold">পাশাপাশি সরান (X Offset):</span>
                  <span className="font-mono text-blue-700 font-bold">{currentPersonTransform.x}</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={currentPersonTransform.x}
                  onChange={(e) => updateActiveTransform('x', Number(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span className="font-semibold">উপরে-নিচে সরান (Y Offset):</span>
                  <span className="font-mono text-blue-700 font-bold">{currentPersonTransform.y}</span>
                </div>
                <input
                  type="range"
                  min="-35"
                  max="35"
                  value={currentPersonTransform.y}
                  onChange={(e) => updateActiveTransform('y', Number(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Actions for active person */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateActiveTransform('flipH', !currentPersonTransform.flipH)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                    currentPersonTransform.flipH
                      ? 'bg-blue-50 border-blue-500 text-blue-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="মুখোমুখি ফ্লিপ করুন"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  ফ্লিপ
                </button>

                <button
                  onClick={() =>
                    setSettings((s) => ({
                      ...s,
                      order: s.order === 'p1_left' ? 'p2_left' : 'p1_left',
                    }))
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                  title="কার কাঁধ সামনে বা পেছনে থাকবে"
                >
                  <Layers className="w-3.5 h-3.5" />
                  কাঁধ ওভারল্যাপ
                </button>
              </div>

              <button
                onClick={resetActiveTransform}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition"
                title="পজিশন রিসেট করুন"
              >
                <RotateCcw className="w-3 h-3" />
                রিসেট
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
              ? '১ম ব্যক্তির ছবি ক্রপ করুন'
              : '২য় ব্যক্তির ছবি ক্রপ করুন'
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

