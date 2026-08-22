import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Upload, 
  Printer, 
  Download, 
  Palette, 
  Eraser, 
  Brush, 
  Crop, 
  Sliders, 
  RotateCcw, 
  Check, 
  ZoomIn, 
  ZoomOut,
  Send,
  Eye,
  Globe,
  Settings,
  RefreshCw,
  Key,
  Info,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { STUDIO_BG_COLORS, PHOTO_PRESETS, StudioBgColor } from '../types';
import { 
  removeBackgroundAuto,
  compositeCutoutWithColor,
  applyFiltersToCanvas, 
  loadImage, 
  downloadDataUrl, 
  mmToPx 
} from '../utils/imageProcessing';
import { PrintPreviewModal } from './PrintPreviewModal';
import { InteractiveCropperModal } from './InteractiveCropperModal';

const DEFAULT_GEMINI_PROMPT = `Make bd passport size photo \nFace 100% match ,Face Cleaning Retouching Smoothing &\nSoftening, Pimples Remove, Remove shadows from all faces Brightness Adjust, and Background Change light blue Background Add`;

interface BackgroundRemoverProps {
  onSendToPrintSheet?: (imageUrl: string, type: 'passport' | 'stamp') => void;
}

export const BackgroundRemover: React.FC<BackgroundRemoverProps> = ({ onSendToPrintSheet }) => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [cutoutImage, setCutoutImage] = useState<string | null>(null); // Pure transparent PNG
  const [selectedBgColor, setSelectedBgColor] = useState<string>('#87CEEB'); // Light Sky Blue default
  const [tolerance, setTolerance] = useState<number>(38);
  const [isTransparent, setIsTransparent] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('PASSPORT_BD');
  const [isRemovingBg, setIsRemovingBg] = useState<boolean>(false);
  const [apiSourceInfo, setApiSourceInfo] = useState<string | null>(null);

  // Manual Cropper state
  const [isCropping, setIsCropping] = useState<boolean>(false);

  // Brush Mode
  const [brushMode, setBrushMode] = useState<'none' | 'erase' | 'restore'>('none');
  const [brushSize, setBrushSize] = useState<number>(20);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Filters
  const [brightness, setBrightness] = useState<number>(5);
  const [contrast, setContrast] = useState<number>(8);
  const [zoom, setZoom] = useState<number>(100);
  const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  // Print Preview
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Canvas Refs
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setOriginalImage(url);
      setCutoutImage(null);
      executeBackgroundRemoval(url);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setOriginalImage(url);
      setCutoutImage(null);
      executeBackgroundRemoval(url);
    };
    reader.readAsDataURL(file);
  };

  // Perform background cutout via Cutout.pro / Remove.bg / Gemini / Studio AI
  const executeBackgroundRemoval = useCallback(async (sourceImgUrl: string) => {
    setIsRemovingBg(true);
    try {
      const result = await removeBackgroundAuto(sourceImgUrl, {
        targetBgColor: null, // Always generate pure transparent cutout
        service: 'remove_bg',
        tolerance,
      });

      setCutoutImage(result.transparentDataUrl);
      if (result.source === 'remove.bg') {
        setApiSourceInfo('Remove.bg ইঞ্জিন দ্বারা নিখুঁত ব্যাকগ্রাউন্ড রিমুভ সম্পন্ন হয়েছে।');
      } else {
        setApiSourceInfo('স্টুডিও স্মার্ট অ্যালগরিদম দ্বারা ব্যাকগ্রাউন্ড প্রসেস হয়েছে।');
      }
    } catch (err) {
      console.error('BG removal error:', err);
    } finally {
      setIsRemovingBg(false);
    }
  }, [tolerance]);

  // When original image is loaded or changed, perform initial background removal
  useEffect(() => {
    if (originalImage && !cutoutImage) {
      executeBackgroundRemoval(originalImage);
    }
  }, [originalImage, cutoutImage, executeBackgroundRemoval]);

  // Real-time Composite: whenever selectedBgColor, filters, or cutout changes
  useEffect(() => {
    if (!originalImage) return;

    let isMounted = true;
    const sourceToUse = cutoutImage || originalImage;

    loadImage(sourceToUse).then((img) => {
      if (!isMounted) return;
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // 1. Fill chosen background color if not transparent
      if (!isTransparent && cutoutImage) {
        ctx.fillStyle = selectedBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Draw cutout subject
      ctx.drawImage(img, 0, 0);

      // 3. Apply brightness & contrast filters
      const filtered = applyFiltersToCanvas(canvas, { brightness, contrast });

      // 4. Render to display canvas
      const displayCanvas = displayCanvasRef.current;
      if (displayCanvas) {
        displayCanvas.width = filtered.width;
        displayCanvas.height = filtered.height;
        const dCtx = displayCanvas.getContext('2d')!;
        dCtx.drawImage(filtered, 0, 0);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [originalImage, cutoutImage, selectedBgColor, isTransparent, brightness, contrast]);

  // AI Portrait Enhancement / Advice using server-side Gemini
  const handleAiAnalyze = async () => {
    if (!originalImage) return;
    setIsProcessingAI(true);
    setAiAdvice(null);

    try {
      const res = await fetch('/api/ai/analyze-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: originalImage }),
      });

      const json = await res.json();
      if (json.data) {
        if (json.data.recommendedBgColor) {
          setSelectedBgColor(json.data.recommendedBgColor);
          setIsTransparent(false);
        }
        if (json.data.enhancementAdvice) {
          setAiAdvice(json.data.enhancementAdvice);
        } else {
          setAiAdvice('AI অ্যানালাইসিস সম্পন্ন: ব্যাকগ্রাউন্ড সঠিক স্কাই ব্লুতে অ্যাডজাস্ট করা হয়েছে।');
        }
      }
    } catch (err) {
      console.error('AI analyze err:', err);
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Brush Erase / Restore Canvas Interactivity
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (brushMode === 'none') return;
    setIsDrawing(true);
    applyBrushAtEvent(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || brushMode === 'none') return;
    applyBrushAtEvent(e);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const applyBrushAtEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d')!;
    ctx.save();
    if (brushMode === 'erase') {
      ctx.fillStyle = selectedBgColor;
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // Export current cropped/enhanced photo
  const getProcessedDataUrl = (format: 'image/png' = 'image/png'): string => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return '';
    return canvas.toDataURL(format);
  };

  const handleDownload = () => {
    const url = getProcessedDataUrl('image/png');
    if (url) {
      downloadDataUrl(url, `Studio_Photo_${selectedPreset}.png`);
    }
  };

  // Render for Automatic Print Preview Modal (4R sheet or single passport)
  const renderPrintPage = (
    ctx: CanvasRenderingContext2D,
    widthPx: number,
    heightPx: number,
    dpi = 300
  ) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, widthPx, heightPx);

    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    // Draw 4 Passport copies onto 4R paper
    const preset = PHOTO_PRESETS[selectedPreset] || PHOTO_PRESETS.PASSPORT_BD;
    const photoWPx = mmToPx(preset.widthMm, dpi);
    const photoHPx = mmToPx(preset.heightMm, dpi);
    const gapPx = mmToPx(5, dpi);

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
        
        // 0.5pt cut border
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, photoWPx, photoHPx);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 font-bold">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              পাসপোর্ট ফটো ও ব্যাকগ্রাউন্ড স্টুডিও (Passport Studio)
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                CUTOUT.PRO & GEMINI AI
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Cutout.pro ও Gemini AI দিয়ে ব্যাকগ্রাউন্ড রিমুভ, ফেস স্মুথিং, পিম্পল রিমুভ ও স্কাই ব্লু পাসপোর্ট তৈরি করুন।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
        {/* Left/Main Column: Unified Customer Photo Upload & Live Canvas Workspace */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden shadow-xs">
            {/* Header: Title */}
            <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-blue-600" />
                  কাস্টমারের ছবি ও লাইভ প্রিভিউ
                </span>
                {isRemovingBg && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded animate-pulse flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    ব্যাকগ্রাউন্ড রিমুভ হচ্ছে...
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-mono font-medium">
                {selectedPreset === 'PASSPORT_BD' ? '45×35 mm • 300 DPI' : selectedPreset === 'STAMP_BD' ? '25×20 mm' : selectedPreset === 'US_VISA' ? '50×50 mm' : 'Freehand / Original'}
              </span>
            </div>

            {/* Canvas / Upload Drop Area */}
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="p-4 sm:p-6 bg-slate-900/95 flex items-center justify-center relative min-h-[440px] overflow-auto select-none"
              style={{
                backgroundImage: isTransparent
                  ? 'radial-gradient(#334155 1px, transparent 1px)'
                  : 'none',
                backgroundSize: '16px 16px',
              }}
            >
              {originalImage ? (
                <div className="relative flex items-center justify-center">
                  <canvas
                    ref={displayCanvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    className={`max-w-full max-h-[430px] object-contain shadow-2xl rounded border border-white/20 transition-all ${
                      brushMode !== 'none' ? 'cursor-crosshair' : 'cursor-default'
                    }`}
                  />
                  {isRemovingBg && (
                    <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs rounded flex flex-col items-center justify-center text-white gap-2.5 p-4 text-center z-10">
                      <div className="w-10 h-10 border-3 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-blue-200">
                        ব্যাকগ্রাউন্ড রিমুভ ও সিলেক্টেড কালার সেট হচ্ছে...
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <label 
                  className="group border-2 border-dashed border-slate-600 hover:border-blue-400 hover:bg-slate-800/90 rounded-2xl flex flex-col items-center justify-center p-8 sm:p-12 cursor-pointer bg-slate-800/60 transition-all text-center max-w-md w-full mx-auto shadow-lg"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center mb-4 transition-all shadow-inner">
                    <Upload className="w-7 h-7" />
                  </div>
                  <span className="text-base text-slate-100 font-bold mb-1 group-hover:text-blue-300 transition-colors">
                    কাস্টমারের ছবি আপলোড করুন
                  </span>
                  <span className="text-xs text-slate-400 mb-5">
                    যেকোনো ফরম্যাট (JPG, PNG, WebP, HEIC, BMP) আপলোড করুন বা ড্র্যাগ করে দিন
                  </span>
                  <div className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 group-hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all">
                    <Upload className="w-4 h-4" />
                    <span>ফাইল সিলেক্ট করুন</span>
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*,.jpg,.jpeg,.png,.webp,.bmp,.heic,.heif,.tiff,.gif" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>
              )}

              {/* Resolution Tag */}
              {originalImage && (
                <div className="absolute bottom-2 right-2 text-[10px] text-slate-300 font-mono bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
                  300 DPI • Official Passport Ready
                </div>
              )}
            </div>

            {/* Engine Selector Bar & Action Buttons */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-3">
              {/* Engine Switcher / Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 text-xs font-bold flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    কাটআউট ইঞ্জিন:
                  </span>
                  <span className="px-3 py-1 rounded text-xs font-bold bg-blue-600 text-white shadow-xs flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Remove.bg (অটোমেটিক)
                  </span>
                </div>
                {apiSourceInfo && (
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                    {apiSourceInfo}
                  </span>
                )}
              </div>

              {/* Crop, New Photo & Size Presets directly under Cut Engine */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCropping(true)}
                    disabled={!originalImage}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-700 text-xs font-bold transition disabled:opacity-50"
                    title="পাসপোর্ট সাইজ অনুযায়ী ম্যানুয়াল ক্রপ"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    ক্রপ
                  </button>

                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold bg-white cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    নতুন ছবি
                    <input type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.bmp,.heic,.heif,.tiff,.gif" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-600 font-bold">মাপ:</span>
                  <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  >
                    <option value="PASSPORT_BD">BD পাসপোর্ট (45×35 mm)</option>
                    <option value="STAMP_BD">স্ট্যাম্প সাইজ (25×20 mm)</option>
                    <option value="US_VISA">ইউএস ভিসা (50×50 mm)</option>
                    <option value="CUSTOM">ফ্রি-হ্যান্ড / অরিজিনাল</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons: Downloads, Print Sheet, 4R Print */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleDownload}
                    disabled={!originalImage}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                    title="উচ্চমানের পিএনজি (PNG) ফাইল হিসেবে সংরক্ষণ করুন"
                  >
                    <Download className="w-3.5 h-3.5" />
                    ডাউনলোড PNG
                  </button>

                  {onSendToPrintSheet && (
                    <button
                      onClick={() => {
                        const url = getProcessedDataUrl('image/png');
                        if (url) onSendToPrintSheet(url, 'passport');
                      }}
                      disabled={!originalImage}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      প্রিন্ট শীটে পাঠান
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowPrintModal(true)}
                  disabled={!originalImage}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  অটো ৪R প্রিন্ট প্রিভিউ
                </button>
              </div>
            </div>
          </div>

          {/* Feedback Status */}
          {apiSourceInfo && (
            <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{apiSourceInfo}</span>
            </div>
          )}
        </div>

        {/* Right/Companion Column: Color Palette & Fine Tuning Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Studio Background Colors */}
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
              <span className="text-xs font-bold text-slate-700">কাস্টম কালার বেছে নিন:</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedBgColor}
                  onChange={(e) => {
                    setSelectedBgColor(e.target.value);
                    setIsTransparent(false);
                  }}
                  className="w-8 h-8 rounded border border-slate-300 bg-transparent cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                  {selectedBgColor.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Refinement & Magic Tools */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 text-xs shadow-xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="text-[11px] font-bold uppercase text-slate-500 tracking-tight flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                কাটআউট সংবেদনশীলতা ও কালার টিউন
              </h3>
              {originalImage && (
                <button
                  onClick={() => executeBackgroundRemoval(originalImage)}
                  disabled={isRemovingBg}
                  className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isRemovingBg ? 'animate-spin' : ''}`} />
                  পুনরায় কাটআউট
                </button>
              )}
            </div>

            {/* Tolerance */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                <span>ব্যাকগ্রাউন্ড সেন্সিটিভিটি (Tolerance)</span>
                <span className="font-mono text-slate-800 font-bold">{tolerance}</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Brightness & Contrast */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>উজ্জ্বলতা (Brightness)</span>
                  <span className="font-mono text-slate-800 font-bold">{brightness}</span>
                </div>
                <input
                  type="range"
                  min="-40"
                  max="40"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>কনট্রাস্ট (Contrast)</span>
                  <span className="font-mono text-slate-800 font-bold">{contrast}</span>
                </div>
                <input
                  type="range"
                  min="-40"
                  max="40"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>

            {/* Magic Touch Up Brush */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-semibold text-[11px] flex items-center gap-1.5">
                  <Eraser className="w-3.5 h-3.5 text-amber-500" />
                  ম্যানুয়াল ব্রাশ (Touch-up Brush)
                </span>
                <span className="text-[10px] text-slate-400">ছবিতে ড্র্যাগ করে মুছুন</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBrushMode(brushMode === 'erase' ? 'none' : 'erase')}
                  className={`px-3 py-1.5 rounded border text-xs font-semibold flex items-center gap-1.5 transition ${
                    brushMode === 'erase'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-500/30'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" />
                  মুছুন ব্রাশ (Erase BG)
                </button>

                {brushMode !== 'none' && (
                  <div className="flex items-center gap-2 flex-1 ml-2">
                    <span className="text-[10px] text-slate-500 font-medium">সাইজ:</span>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* AI Portrait Assist */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={handleAiAnalyze}
                disabled={isProcessingAI || !originalImage}
                className="w-full py-1.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                {isProcessingAI ? 'AI অ্যানালাইসিস চলছে...' : 'AI স্মার্ট ব্যাকগ্রাউন্ড সাজেস্ট'}
              </button>

              {aiAdvice && (
                <div className="mt-2 p-2 rounded bg-blue-50/60 border border-blue-200 text-blue-900 text-xs font-medium">
                  {aiAdvice}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Cropper Modal */}
      {isCropping && originalImage && (
        <InteractiveCropperModal
          isOpen={isCropping}
          onClose={() => setIsCropping(false)}
          imageSrc={originalImage}
          title="পাসপোর্ট ফটো ম্যানুয়াল ক্রপ (Passport Framing)"
          aspectRatioOptions={[
            { id: 'passport', label: 'BD পাসপোর্ট (৪৫ × ৩৫ mm)', ratio: 35 / 45 },
            { id: 'stamp', label: 'স্ট্যাম্প সাইজ (২৫ × ২০ mm)', ratio: 20 / 25 },
            { id: 'square', label: '১:১ ভিসা (৫০ × ৫০ mm)', ratio: 1 },
            { id: 'free', label: 'ফ্রি-হ্যান্ড / কাস্টম', ratio: null },
          ]}
          onCropComplete={(croppedUrl) => {
            setOriginalImage(croppedUrl);
            setCutoutImage(null); // Re-trigger background removal for newly cropped framing
          }}
        />
      )}

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="পাসপোর্ট ফটো ৪R প্রিন্ট প্রিভিউ"
        renderCanvasContent={renderPrintPage}
        paperSize="4R"
        orientation="portrait"
      />
    </div>
  );
};
