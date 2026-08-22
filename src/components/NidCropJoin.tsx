import React, { useState, useRef, useEffect } from 'react';
import { 
  CreditCard, 
  Upload, 
  Printer, 
  Download, 
  Layers, 
  Eye, 
  RefreshCw, 
  Sliders, 
  ShieldCheck, 
  Scissors, 
  ZoomIn, 
  ZoomOut,
  Maximize2,
  FileCheck2,
  Crop,
  Sparkles,
  FileText,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { NidSettings } from '../types';
import { mmToPx, applyFiltersToCanvas, drawWatermark, drawCutGuides, loadImage, downloadDataUrl } from '../utils/imageProcessing';
import { convertPdfToImages, isPdfFile } from '../utils/pdfHelper';
import { PrintPreviewModal } from './PrintPreviewModal';
import { InteractiveCropperModal } from './InteractiveCropperModal';

export const NidCropJoin: React.FC = () => {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [rawFrontImage, setRawFrontImage] = useState<string | null>(null);
  const [rawBackImage, setRawBackImage] = useState<string | null>(null);
  
  // Cropper Modal state
  const [croppingSide, setCroppingSide] = useState<'front' | 'back' | null>(null);

  // File loading & processing states
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  // Settings
  const [settings, setSettings] = useState<NidSettings>({
    layout: 'stacked',
    watermark: 'none',
    filterMode: 'color',
    border: true,
    scale: 100,
    cardMarginMm: 8,
    customWatermarkText: 'শুধু অফিসিয়াল কাজের জন্য',
  });

  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [cardType, setCardType] = useState<'smart' | 'old'>('smart'); // Smart (85.6x54mm) vs Old (90x60mm)
  
  // Interactive Crop & Zoom offsets for front and back
  const [frontTransform, setFrontTransform] = useState({ zoom: 100, x: 0, y: 0, rotate: 0 });
  const [backTransform, setBackTransform] = useState({ zoom: 100, x: 0, y: 0, rotate: 0 });
  
  // Print preview state
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Card dimensions in mm
  const cardWidthMm = cardType === 'smart' ? 85.6 : 90;
  const cardHeightMm = cardType === 'smart' ? 53.98 : 60;

  // Generic File Processor for Image & PDF
  const processUploadedFile = async (file: File, target: 'front' | 'back' | 'both') => {
    setIsProcessingFile(true);
    setUploadNotice(null);

    try {
      if (isPdfFile(file)) {
        setProcessingStatus('PDF ফাইল হাই-রেজোলিউশনে (300 DPI) রূপান্তর করা হচ্ছে...');
        const pageImages = await convertPdfToImages(file, 2.8);
        
        if (pageImages.length === 0) {
          throw new Error('PDF ফাইল থেকে কোনো পৃষ্ঠা পাওয়া যায়নি।');
        }

        if (target === 'both' || (target === 'front' && pageImages.length >= 2)) {
          // Multi-page PDF: Page 1 is Front, Page 2 is Back
          setRawFrontImage(pageImages[0]);
          setFrontImage(pageImages[0]);
          if (pageImages.length >= 2) {
            setRawBackImage(pageImages[1]);
            setBackImage(pageImages[1]);
            setUploadNotice('২-পৃষ্ঠার PDF থেকে সামনের ও পেছনের পাতা সফলভাবে লোড হয়েছে!');
          } else {
            setRawBackImage(pageImages[0]);
            setUploadNotice('১-পৃষ্ঠার PDF ফাইল লোড হয়েছে।');
            setCroppingSide('front');
          }
        } else if (target === 'front') {
          setRawFrontImage(pageImages[0]);
          setFrontImage(pageImages[0]);
          setUploadNotice('সামনের পাতা (PDF) সফলভাবে যুক্ত হয়েছে।');
          setCroppingSide('front');
        } else if (target === 'back') {
          const imgToUse = pageImages.length >= 2 ? pageImages[1] : pageImages[0];
          setRawBackImage(imgToUse);
          setBackImage(imgToUse);
          setUploadNotice('পেছনের পাতা (PDF) সফলভাবে যুক্ত হয়েছে।');
          setCroppingSide('back');
        }
      } else {
        // Standard or raw image format (PNG, JPG, JPEG, WEBP, BMP, HEIC, TIFF, etc.)
        setProcessingStatus('ছবি লোড করা হচ্ছে...');
        const reader = new FileReader();
        reader.onload = (ev) => {
          const url = ev.target?.result as string;
          if (target === 'front') {
            setRawFrontImage(url);
            setFrontImage(url);
            setUploadNotice('সামনের ছবি সফলভাবে যুক্ত হয়েছে।');
            setCroppingSide('front');
          } else if (target === 'back') {
            setRawBackImage(url);
            setBackImage(url);
            setUploadNotice('পেছনের ছবি সফলভাবে যুক্ত হয়েছে।');
            setCroppingSide('back');
          } else {
            setRawFrontImage(url);
            setFrontImage(url);
            if (!backImage) {
              setRawBackImage(url);
              setBackImage(url);
            }
            setUploadNotice('ছবি সফলভাবে যুক্ত হয়েছে।');
            setCroppingSide('front');
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error('File process error:', err);
      alert(err?.message || 'ফাইলটি প্রসেস করা সম্ভব হয়নি। দয়া করে সঠিক ফাইল দিন।');
    } finally {
      setIsProcessingFile(false);
      setProcessingStatus('');
    }
  };

  // Handle file input change
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'front' | 'back' | 'both') => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file, target);
    // Reset file input value so user can re-upload same file if needed
    e.target.value = '';
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, target: 'front' | 'back' | 'both') => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file, target);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Sample Demo NID if user wants to test immediately
  const loadDemoNid = () => {
    // Generate simple SVG placeholders as demo
    const makeDemoCard = (side: 'সামনের অংশ (Front)' | 'পেছনের অংশ (Back)', color: string) => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="856" height="540" viewBox="0 0 856 540">
          <rect width="100%" height="100%" fill="${color}" rx="20"/>
          <rect x="20" y="20" width="816" height="500" fill="#ffffff" rx="12" stroke="#cbd5e1" stroke-width="2"/>
          <circle cx="90" cy="80" r="40" fill="#15803d"/>
          <text x="150" y="70" font-family="sans-serif" font-size="28" font-weight="bold" fill="#047857">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</text>
          <text x="150" y="105" font-family="sans-serif" font-size="20" fill="#475569">Government of the People's Republic of Bangladesh</text>
          
          <rect x="50" y="150" width="200" height="240" fill="#e2e8f0" rx="8" stroke="#94a3b8"/>
          <circle cx="150" cy="240" r="50" fill="#64748b"/>
          <path d="M 90 350 Q 150 290 210 350" fill="#64748b"/>
          <text x="150" y="380" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#64748b">PHOTO</text>
          
          <text x="280" y="180" font-family="sans-serif" font-size="22" font-weight="bold" fill="#1e293b">নাম: মোঃ রফিকুল ইসলাম</text>
          <text x="280" y="220" font-family="sans-serif" font-size="20" fill="#334155">Name: MD RAFIQUL ISLAM</text>
          <text x="280" y="260" font-family="sans-serif" font-size="20" fill="#334155">পিতা: মোঃ আব্দুল করিম</text>
          <text x="280" y="300" font-family="sans-serif" font-size="20" fill="#334155">মাতা: মোসাঃ ফাতেমা বেগম</text>
          <text x="280" y="340" font-family="sans-serif" font-size="20" fill="#334155">Date of Birth: 12 Oct 1988</text>
          <text x="280" y="390" font-family="sans-serif" font-size="24" font-weight="bold" fill="#dc2626">NID NO: 1988 5678 9012 3456</text>
          
          <rect x="50" y="440" width="756" height="50" fill="#f8fafc" rx="6"/>
          <text x="428" y="472" font-family="sans-serif" font-size="18" text-anchor="middle" font-weight="bold" fill="#0f172a">জাতীয় পরিচয়পত্র [${side}]</text>
        </svg>
      `;
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    };

    const frontSvg = makeDemoCard('সামনের অংশ (Front)', '#f0fdf4');
    const backSvg = makeDemoCard('পেছনের অংশ (Back)', '#f8fafc');
    setRawFrontImage(frontSvg);
    setFrontImage(frontSvg);
    setRawBackImage(backSvg);
    setBackImage(backSvg);
  };

  // Main Render Routine for Composite Canvas
  const renderNidComposite = async (
    ctx: CanvasRenderingContext2D,
    widthPx: number,
    heightPx: number,
    dpi = 300
  ) => {
    // Fill white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, widthPx, heightPx);

    if (!frontImage && !backImage) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('এনআইডি কার্ডের ছবি আপলোড করুন', widthPx / 2, heightPx / 2);
      return;
    }

    const [frontImg, backImg] = await Promise.all([
      frontImage ? loadImage(frontImage) : null,
      backImage ? loadImage(backImage) : null,
    ]);

    const cardWPx = mmToPx(cardWidthMm, dpi);
    const cardHPx = mmToPx(cardHeightMm, dpi);
    const marginPx = mmToPx(settings.cardMarginMm, dpi);

    // Helper to draw single card onto specific bounding box with crop/zoom
    const drawCard = (
      img: HTMLImageElement | null,
      x: number,
      y: number,
      w: number,
      h: number,
      transform: { zoom: number; x: number; y: number; rotate: number }
    ) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();

      if (img) {
        // Offscreen canvas for filter processing
        const cardCanvas = document.createElement('canvas');
        cardCanvas.width = w;
        cardCanvas.height = h;
        const cCtx = cardCanvas.getContext('2d')!;

        cCtx.fillStyle = '#FFFFFF';
        cCtx.fillRect(0, 0, w, h);

        cCtx.save();
        cCtx.translate(w / 2 + transform.x, h / 2 + transform.y);
        cCtx.rotate((transform.rotate * Math.PI) / 180);
        cCtx.scale(transform.zoom / 100, transform.zoom / 100);

        // Aspect fit / cover
        const imgRatio = img.width / img.height;
        const targetRatio = w / h;
        let dw = w;
        let dh = h;
        if (imgRatio > targetRatio) {
          dw = h * imgRatio;
        } else {
          dh = w / imgRatio;
        }
        cCtx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        cCtx.restore();

        // Apply filters
        const filtered = applyFiltersToCanvas(cardCanvas, {
          brightness,
          contrast,
          grayscale: settings.filterMode === 'grayscale',
          photocopyMode: settings.filterMode === 'photocopy_bw',
        });

        ctx.drawImage(filtered, x, y);
      } else {
        ctx.fillStyle = '#F1F5F9';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#94A3B8';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ছবি নেই', x + w / 2, y + h / 2);
      }

      ctx.restore();

      // Border & Cut Marks
      if (settings.border) {
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
      }

      drawCutGuides(ctx, x, y, w, h, 6);
    };

    // Calculate Card Layout positions
    if (settings.layout === 'stacked') {
      // Top (Front) and Bottom (Back)
      const totalH = cardHPx * 2 + marginPx;
      const startX = (widthPx - cardWPx) / 2;
      const startY = (heightPx - totalH) / 2;

      drawCard(frontImg, startX, startY, cardWPx, cardHPx, frontTransform);
      drawCard(backImg, startX, startY + cardHPx + marginPx, cardWPx, cardHPx, backTransform);
    } else if (settings.layout === 'side_by_side') {
      // Left (Front) and Right (Back)
      const totalW = cardWPx * 2 + marginPx;
      const startX = (widthPx - totalW) / 2;
      const startY = (heightPx - cardHPx) / 2;

      drawCard(frontImg, startX, startY, cardWPx, cardHPx, frontTransform);
      drawCard(backImg, startX + cardWPx + marginPx, startY, cardWPx, cardHPx, backTransform);
    } else if (settings.layout === 'photocopy_page') {
      // Center stacked on A4 with header note
      const startX = (widthPx - cardWPx) / 2;
      const startY = heightPx * 0.22;

      drawCard(frontImg, startX, startY, cardWPx, cardHPx, frontTransform);
      drawCard(backImg, startX, startY + cardHPx + marginPx * 1.5, cardWPx, cardHPx, backTransform);

      // Add photocopy document title
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('জাতীয় পরিচয়পত্রের সত্যায়িত অনুলিপি (NID Photocopy)', widthPx / 2, startY - 40);
    } else if (settings.layout === 'four_r_duo') {
      // 2 Cards Side-by-side or Stacked for 4R
      const startX = (widthPx - cardWPx) / 2;
      const startY = (heightPx - (cardHPx * 2 + marginPx)) / 2;

      drawCard(frontImg, startX, startY, cardWPx, cardHPx, frontTransform);
      drawCard(backImg, startX, startY + cardHPx + marginPx, cardWPx, cardHPx, backTransform);
    }

    // Apply Watermark if selected
    if (settings.watermark !== 'none') {
      let wmText = '';
      if (settings.watermark === 'sim') wmText = 'শুধু সিম রেজিস্ট্রেশনের জন্য';
      else if (settings.watermark === 'bank') wmText = 'শুধু ব্যাংক অ্যাকাউন্টের জন্য';
      else if (settings.watermark === 'official') wmText = 'FOR OFFICIAL USE ONLY';
      else if (settings.watermark === 'custom') wmText = settings.customWatermarkText || 'অনুলিপি';

      drawWatermark(ctx, widthPx, heightPx, wmText, 0.28);
    }
  };

  // Re-render preview canvas whenever settings/images change
  useEffect(() => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return;

    // Default preview canvas dimensions based on layout
    const dpi = 150; // Fast preview dpi
    let previewWPx = mmToPx(210, dpi);
    let previewHPx = mmToPx(148, dpi);

    if (settings.layout === 'stacked') {
      previewWPx = mmToPx(cardWidthMm + 30, dpi);
      previewHPx = mmToPx(cardHeightMm * 2 + settings.cardMarginMm + 30, dpi);
    } else if (settings.layout === 'side_by_side') {
      previewWPx = mmToPx(cardWidthMm * 2 + settings.cardMarginMm + 30, dpi);
      previewHPx = mmToPx(cardHeightMm + 30, dpi);
    } else if (settings.layout === 'photocopy_page') {
      previewWPx = mmToPx(210, dpi); // A4
      previewHPx = mmToPx(297, dpi);
    } else if (settings.layout === 'four_r_duo') {
      previewWPx = mmToPx(102, dpi); // 4R
      previewHPx = mmToPx(152, dpi);
    }

    canvas.width = previewWPx;
    canvas.height = previewHPx;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      renderNidComposite(ctx, previewWPx, previewHPx, dpi);
    }
  }, [frontImage, backImage, settings, brightness, contrast, cardType, frontTransform, backTransform]);

  // Direct High-Res Download (PNG or JPEG)
  const handleDownloadHighRes = async (format: 'png' | 'jpeg' = 'png') => {
    const dpi = 300;
    let wPx = mmToPx(210, dpi);
    let hPx = mmToPx(297, dpi);

    if (settings.layout === 'stacked') {
      wPx = mmToPx(cardWidthMm + 20, dpi);
      hPx = mmToPx(cardHeightMm * 2 + settings.cardMarginMm + 20, dpi);
    } else if (settings.layout === 'side_by_side') {
      wPx = mmToPx(cardWidthMm * 2 + settings.cardMarginMm + 20, dpi);
      hPx = mmToPx(cardHeightMm + 20, dpi);
    } else if (settings.layout === 'four_r_duo') {
      wPx = mmToPx(102, dpi);
      hPx = mmToPx(152, dpi);
    }

    const canvas = document.createElement('canvas');
    canvas.width = wPx;
    canvas.height = hPx;
    const ctx = canvas.getContext('2d')!;
    await renderNidComposite(ctx, wPx, hPx, dpi);

    if (format === 'png') {
      const dataUrl = canvas.toDataURL('image/png');
      downloadDataUrl(dataUrl, `NID_Joined_${cardType}_${settings.layout}.png`);
    } else {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
      downloadDataUrl(dataUrl, `NID_Joined_${cardType}_${settings.layout}.jpg`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Info */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              এনআইডি ক্রপ ও জয়েন (NID Processing Parameters)
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                AUTO 300 DPI
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              সামনের এবং পিছনের পাতার ছবি ক্রপ করে ১ পাতায় নিখুঁত মাপে প্রিন্ট রেডি করুন।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDemoNid}
            className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            ডেমো এনআইডি লোড
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
        {/* Left Side: Upload & Fine Tuning Controls */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Universal NID / PDF Auto-Detect Dropzone */}
          <div 
            onDrop={(e) => handleDrop(e, 'both')}
            onDragOver={handleDragOver}
            className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-lg p-3.5 text-center transition group relative"
          >
            <input
              type="file"
              accept="image/*,.pdf,.png,.jpg,.jpeg,.webp,.bmp,.heic,.heif,.tiff,.gif"
              onChange={(e) => handleFileUpload(e, 'both')}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              title="যেকোনো ছবি বা PDF ফাইল ড্রপ করুন"
            />
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  ১ ক্লিকে সম্পূর্ণ NID / ২-পাতার PDF / স্ক্যান কপি
                  <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded-full">ALL FORMATS</span>
                </h4>
                <p className="text-[11px] text-slate-600">
                  PNG, JPG, JPEG, PDF, WebP সহ যেকোনো ফাইল ড্র্যাগ করুন বা ক্লিক করে আপলোড করুন
                </p>
              </div>
            </div>
          </div>

          {/* Loading Indicator for PDF/Image Processing */}
          {isProcessingFile && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2.5 text-xs text-blue-800 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
              <span className="font-semibold">{processingStatus || 'ফাইল প্রসেস করা হচ্ছে...'}</span>
            </div>
          )}

          {/* Upload Notice Badge */}
          {uploadNotice && !isProcessingFile && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{uploadNotice}</span>
              </div>
              <button 
                onClick={() => setUploadNotice(null)}
                className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* 1. Upload Boxes for Front and Back */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Front Upload */}
            <div 
              onDrop={(e) => handleDrop(e, 'front')}
              onDragOver={handleDragOver}
              className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col justify-between shadow-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  ১. সামনের পাতা (Front)
                </span>
                {frontImage && (
                  <button
                    onClick={() => {
                      setFrontImage(null);
                      setRawFrontImage(null);
                    }}
                    className="text-[11px] text-red-600 hover:underline font-medium"
                  >
                    মুছুন
                  </button>
                )}
              </div>

              {frontImage ? (
                <div className="space-y-2">
                  <div className="relative h-28 rounded border border-slate-200 overflow-hidden bg-slate-50 group">
                    <img src={frontImage} alt="Front NID" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setFrontTransform((t) => ({ ...t, zoom: Math.min(200, t.zoom + 15) }))}
                        className="p-1 rounded bg-white text-slate-800 hover:bg-slate-100"
                        title="জুম বাড়ান"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setFrontTransform((t) => ({ ...t, zoom: Math.max(50, t.zoom - 15) }))}
                        className="p-1 rounded bg-white text-slate-800 hover:bg-slate-100"
                        title="জুম কমান"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setFrontTransform((t) => ({ ...t, rotate: (t.rotate + 90) % 360 }))}
                        className="p-1 rounded bg-white text-slate-800 hover:bg-slate-100"
                        title="ঘোরান ৯০°"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setCroppingSide('front')}
                    className="w-full py-1.5 px-2 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-200 transition"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    ম্যানুয়াল ক্রপ করুন (Front)
                  </button>
                </div>
              ) : (
                <label className="h-28 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded flex flex-col items-center justify-center p-3 cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition text-center">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-700 font-semibold">সামনের ছবি বা PDF দিন</span>
                  <span className="text-[10px] text-slate-400 font-medium">PNG, JPG, PDF, WEBP</span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.png,.jpg,.jpeg,.webp,.bmp,.heic,.heif,.tiff,.gif"
                    onChange={(e) => handleFileUpload(e, 'front')}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Back Upload */}
            <div 
              onDrop={(e) => handleDrop(e, 'back')}
              onDragOver={handleDragOver}
              className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col justify-between shadow-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  ২. পেছনের পাতা (Back)
                </span>
                {backImage && (
                  <button
                    onClick={() => {
                      setBackImage(null);
                      setRawBackImage(null);
                    }}
                    className="text-[11px] text-red-600 hover:underline font-medium"
                  >
                    মুছুন
                  </button>
                )}
              </div>

              {backImage ? (
                <div className="space-y-2">
                  <div className="relative h-28 rounded border border-slate-200 overflow-hidden bg-slate-50 group">
                    <img src={backImage} alt="Back NID" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setBackTransform((t) => ({ ...t, zoom: Math.min(200, t.zoom + 15) }))}
                        className="p-1 rounded bg-white text-slate-800 hover:bg-slate-100"
                        title="জুম বাড়ান"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setBackTransform((t) => ({ ...t, zoom: Math.max(50, t.zoom - 15) }))}
                        className="p-1 rounded bg-white text-slate-800 hover:bg-slate-100"
                        title="জুম কমান"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setBackTransform((t) => ({ ...t, rotate: (t.rotate + 90) % 360 }))}
                        className="p-1 rounded bg-white text-slate-800 hover:bg-slate-100"
                        title="ঘোরান ৯০°"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setCroppingSide('back')}
                    className="w-full py-1.5 px-2 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200 transition"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    ম্যানুয়াল ক্রপ করুন (Back)
                  </button>
                </div>
              ) : (
                <label className="h-28 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded flex flex-col items-center justify-center p-3 cursor-pointer bg-slate-50 hover:bg-emerald-50/30 transition text-center">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-700 font-semibold">পেছনের ছবি বা PDF দিন</span>
                  <span className="text-[10px] text-slate-400 font-medium">PNG, JPG, PDF, WEBP</span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.png,.jpg,.jpeg,.webp,.bmp,.heic,.heif,.tiff,.gif"
                    onChange={(e) => handleFileUpload(e, 'back')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* 2. Layout Settings */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 text-xs shadow-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-[11px] font-bold uppercase text-slate-500 tracking-tight flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Processing Parameters & Layout
              </h3>
              <span 
                onClick={() => {
                  setBrightness(0);
                  setContrast(0);
                  setSettings((s) => ({ ...s, layout: 'stacked', filterMode: 'color' }));
                }}
                className="text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline"
              >
                Reset Defaults
              </span>
            </div>

            {/* Layout options */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">লেআউট নির্বাচন</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'stacked', label: 'উপরে-নিচে (Stacked)', desc: 'জনপ্রিয় NID ফরম্যাট' },
                  { id: 'side_by_side', label: 'পাশাপাশি (Side by Side)', desc: 'ওয়াইড ফরম্যাট' },
                  { id: 'photocopy_page', label: 'A4 ফটোকপি পেজ', desc: 'সত্যায়ন স্পেসসহ' },
                  { id: 'four_r_duo', label: '৪R ফটো পেপার', desc: '৪"x৬" প্রিন্ট' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSettings((s) => ({ ...s, layout: item.id as any }))}
                    className={`p-2 rounded border text-left transition ${
                      settings.layout === item.id
                        ? 'border-blue-500 bg-blue-50/60 text-blue-900 ring-1 ring-blue-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <p className="font-bold text-xs text-slate-900">{item.label}</p>
                    <p className="text-[10px] text-slate-500">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Card Type Selector */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-slate-700 font-semibold text-[11px]">কার্ডের সাইজ:</span>
              <div className="inline-flex rounded bg-slate-100 p-0.5 border border-slate-200 text-xs">
                <button
                  onClick={() => setCardType('smart')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    cardType === 'smart' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  স্মার্ট কার্ড (85.6 × 54mm)
                </button>
                <button
                  onClick={() => setCardType('old')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    cardType === 'old' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  পুরাতন NID (90 × 60mm)
                </button>
              </div>
            </div>

            {/* Print Filter Mode */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <span className="text-slate-700 font-semibold text-[11px]">কালার মোড:</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'color', label: 'আসল কালার' },
                  { id: 'photocopy_bw', label: 'ফটোকপি B&W' },
                  { id: 'grayscale', label: 'গ্রেস্কেল' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSettings((s) => ({ ...s, filterMode: m.id as any }))}
                    className={`py-1.5 px-2 rounded border text-center text-xs font-semibold transition ${
                      settings.filterMode === m.id
                        ? 'border-blue-500 bg-blue-600 text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Brightness / Contrast Adjustments */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>উজ্জ্বলতা (Brightness)</span>
                  <span className="font-mono text-slate-800 font-bold">{brightness}</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
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
                  min="-60"
                  max="60"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>

            {/* Watermark Selector */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <span className="text-slate-700 font-semibold text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                নিরাপত্তা ওয়াটারমার্ক
              </span>
              <select
                value={settings.watermark}
                onChange={(e) => setSettings((s) => ({ ...s, watermark: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800 text-xs focus:bg-white focus:border-blue-500"
              >
                <option value="none">কোন ওয়াটারমার্ক নেই</option>
                <option value="sim">শুধু সিম রেজিস্ট্রেশনের জন্য (SIM Registration Only)</option>
                <option value="bank">শুধু ব্যাংক অ্যাকাউন্টের জন্য (Bank Account Only)</option>
                <option value="official">FOR OFFICIAL USE ONLY</option>
                <option value="custom">কাস্টম ওয়াটারমার্ক...</option>
              </select>

              {settings.watermark === 'custom' && (
                <input
                  type="text"
                  placeholder="আপনার কাঙ্ক্ষিত ওয়াটারমার্ক লিখুন..."
                  value={settings.customWatermarkText}
                  onChange={(e) => setSettings((s) => ({ ...s, customWatermarkText: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800 text-xs mt-1"
                />
              )}
            </div>

            {/* Card Margin & Border */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={settings.border}
                  onChange={(e) => setSettings((s) => ({ ...s, border: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="font-medium">কাটিং দাগ (Border)</span>
              </label>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">দূরত্ব:</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={settings.cardMarginMm}
                  onChange={(e) => setSettings((s) => ({ ...s, cardMarginMm: Number(e.target.value) }))}
                  className="w-12 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-center font-bold text-slate-800"
                />
                <span className="text-slate-500 text-[11px]">mm</span>
              </div>
            </div>
          </div>

          {/* High Density Info Box */}
          <div className="bg-blue-900 text-white p-3 rounded-lg flex justify-between items-center shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center font-bold">
                <Printer className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <div className="text-xs font-bold tracking-tight">Auto Print Preview Enabled</div>
                <div className="text-[10px] text-blue-200">Layout is automatically calibrated at 300 DPI</div>
              </div>
            </div>
            <button
              onClick={() => setShowPrintModal(true)}
              className="bg-white text-blue-900 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-blue-50 transition"
            >
              View Sheet
            </button>
          </div>
        </div>

        {/* Right Side: Live Combined Preview & Print Action */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden shadow-xs">
            <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                Live Print Preview ({cardWidthMm} × {cardHeightMm} mm)
              </span>
              <button
                onClick={() => {
                  const canvas = compositeCanvasRef.current;
                  if (!canvas) return;
                  const ctx = canvas.getContext('2d');
                  if (ctx) renderNidComposite(ctx, canvas.width, canvas.height, 150);
                }}
                className="text-[10px] font-bold text-blue-600 px-2 py-0.5 border border-blue-500 rounded bg-white hover:bg-blue-50"
              >
                Refresh
              </button>
            </div>

            {/* Canvas Viewport */}
            <div className="p-4 bg-slate-100 flex items-center justify-center relative min-h-[380px] overflow-auto">
              <canvas
                ref={compositeCanvasRef}
                className="max-w-full max-h-[460px] object-contain shadow-md rounded border border-slate-200 bg-white"
              />
              <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 font-mono italic">
                Scale: 100% (300 DPI Calibrated)
              </div>
            </div>

            {/* Quick Action Footer */}
            <div className="p-3.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">ফটোকপি ও কালার ল্যামিনেশনের জন্য প্রস্তুত</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadHighRes('png')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-700 text-xs font-semibold transition"
                  title="উচ্চমানের স্বচ্ছ বা ক্রিস্প PNG ডাউনলোড"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  ডাউনলোড PNG
                </button>

                <button
                  onClick={() => handleDownloadHighRes('jpeg')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  ডাউনলোড JPG
                </button>

                <button
                  onClick={() => setShowPrintModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                >
                  <Printer className="w-4 h-4" />
                  প্রিন্ট করুন (Print Preview)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Manual Cropper Modal */}
      {croppingSide && (
        <InteractiveCropperModal
          isOpen={!!croppingSide}
          onClose={() => setCroppingSide(null)}
          imageSrc={
            croppingSide === 'front'
              ? rawFrontImage || frontImage || ''
              : rawBackImage || backImage || ''
          }
          title={
            croppingSide === 'front'
              ? 'সামনের পাতা ম্যানুয়াল ক্রপ করুন (Front Side Crop)'
              : 'পেছনের পাতা ম্যানুয়াল ক্রপ করুন (Back Side Crop)'
          }
          aspectRatioOptions={[
            { id: 'smart', label: 'স্মার্ট কার্ড (85.6 × 54 mm)', ratio: 85.6 / 54 },
            { id: 'old', label: 'পুরাতন NID (90 × 60 mm)', ratio: 90 / 60 },
            { id: 'free', label: 'ফ্রি-হ্যান্ড / কাস্টম (যেকোনো সাইজ)', ratio: null },
            { id: 'square', label: '১:১ বর্গাকার', ratio: 1 },
          ]}
          onCropComplete={(croppedUrl) => {
            if (croppingSide === 'front') {
              setFrontImage(croppedUrl);
            } else {
              setBackImage(croppedUrl);
            }
          }}
        />
      )}

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="এনআইডি জয়েন্ট প্রিন্ট"
        renderCanvasContent={renderNidComposite}
        paperSize={settings.layout === 'four_r_duo' ? '4R' : 'A4'}
        orientation={settings.layout === 'side_by_side' ? 'landscape' : 'portrait'}
      />
    </div>
  );
};
