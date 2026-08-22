import React, { useState, useRef, useEffect } from 'react';
import { 
  FileCheck, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  Crop, 
  Eye,
  PenTool,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import { 
  compressCanvasToTargetKb, 
  applyFiltersToCanvas, 
  loadImage, 
  downloadDataUrl, 
  formatFileSize 
} from '../utils/imageProcessing';

export const JobApplicationResizer: React.FC = () => {
  // Photo State
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [photoResult, setPhotoResult] = useState<{
    dataUrl: string;
    sizeBytes: number;
    width: number;
    height: number;
  } | null>(null);

  // Signature State
  const [signSrc, setSignSrc] = useState<string | null>(null);
  const [signResult, setSignResult] = useState<{
    dataUrl: string;
    sizeBytes: number;
    width: number;
    height: number;
  } | null>(null);

  // Signature Contrast & Whitening Filter
  const [signThreshold, setSignThreshold] = useState<number>(140);
  const [photoBrightness, setPhotoBrightness] = useState<number>(5);
  const [photoContrast, setPhotoContrast] = useState<number>(10);

  // Load Demo Photo & Signature
  const loadDemoJobAssets = () => {
    // Demo Photo 300x300
    const photoSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
        <rect width="100%" height="100%" fill="#5B92E5"/>
        <circle cx="150" cy="115" r="55" fill="#fed7aa"/>
        <path d="M 95 105 Q 150 40 205 105 Q 210 60 150 45 Q 90 60 95 105" fill="#1e293b"/>
        <circle cx="130" cy="110" r="5" fill="#1e293b"/>
        <circle cx="170" cy="110" r="5" fill="#1e293b"/>
        <path d="M 142 130 Q 150 138 158 130" stroke="#be185d" stroke-width="2.5" fill="none"/>
        <rect x="135" y="160" width="30" height="30" fill="#fed7aa"/>
        <path d="M 60 300 L 110 190 L 190 190 L 240 300 Z" fill="#0f172a"/>
        <polygon points="135,190 165,190 150,250" fill="#ffffff"/>
      </svg>
    `;

    // Demo Signature 300x80
    const signSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="80" viewBox="0 0 300 80">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <path d="M 30 55 Q 50 15 70 45 T 100 35 T 130 50 Q 150 20 180 50 L 210 35 Q 240 60 270 40" fill="none" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 60 65 L 240 65" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;

    setPhotoSrc(`data:image/svg+xml;utf8,${encodeURIComponent(photoSvg)}`);
    setSignSrc(`data:image/svg+xml;utf8,${encodeURIComponent(signSvg)}`);
  };

  // Process 300x300 Photo (Max 100 KB)
  useEffect(() => {
    if (!photoSrc) {
      setPhotoResult(null);
      return;
    }

    const processPhoto = async () => {
      const img = await loadImage(photoSrc);
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d')!;

      // Center crop square
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 300, 300);

      // Filter
      const filtered = applyFiltersToCanvas(canvas, {
        brightness: photoBrightness,
        contrast: photoContrast,
      });

      // Compress to strictly < 100KB
      const res = await compressCanvasToTargetKb(filtered, 95, 300, 300, 'image/jpeg');
      setPhotoResult(res);
    };

    processPhoto();
  }, [photoSrc, photoBrightness, photoContrast]);

  // Process 300x80 Signature (Max 60 KB)
  useEffect(() => {
    if (!signSrc) {
      setSignResult(null);
      return;
    }

    const processSign = async () => {
      const img = await loadImage(signSrc);
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 80;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

      // White base
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 300, 80);

      // Aspect Fit in 300x80
      const ratio = Math.min(280 / img.width, 70 / img.height);
      const dw = img.width * ratio;
      const dh = img.height * ratio;
      const dx = (300 - dw) / 2;
      const dy = (80 - dh) / 2;

      ctx.drawImage(img, dx, dy, dw, dh);

      // Whitening filter & Dark Ink enhancement
      const imgData = ctx.getImageData(0, 0, 300, 80);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (gray > signThreshold) {
          // Pure white paper background
          d[i] = 255;
          d[i + 1] = 255;
          d[i + 2] = 255;
        } else {
          // Crisp black/dark ink
          const darkVal = Math.max(0, gray * 0.4);
          d[i] = darkVal;
          d[i + 1] = darkVal;
          d[i + 2] = darkVal;
        }
      }
      ctx.putImageData(imgData, 0, 0);

      // Compress to strictly < 60KB
      const res = await compressCanvasToTargetKb(canvas, 55, 300, 80, 'image/jpeg');
      setSignResult(res);
    };

    processSign();
  }, [signSrc, signThreshold]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'photo' | 'sign') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (target === 'photo') setPhotoSrc(url);
      else setSignSrc(url);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 font-bold">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              সরকারি চাকরি ও অনলাইন আবেদন ফটো/স্বাক্ষর রিসাইজার
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                TELETALK / BPSC READY
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              ছবি (৩০০×৩০০ px, Max 100KB) এবং স্বাক্ষর (৩০০×৮০ px, Max 60KB) ১০০% সঠিক অনুপাতে স্বয়ংক্রিয় প্রসেস করুন।
            </p>
          </div>
        </div>

        <button
          onClick={loadDemoJobAssets}
          className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
        >
          ডেমো ছবি ও স্বাক্ষর লোড
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Photo Section (300 x 300 px, Max 100 KB) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              ১. আবেদনকারীর ছবি (৩০০ × ৩০০ px)
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">
              MAX 100 KB
            </span>
          </div>

          {/* Upload or View */}
          {photoResult ? (
            <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="w-28 h-28 rounded overflow-hidden border border-slate-300 shadow-xs bg-white shrink-0">
                <img src={photoResult.dataUrl} alt="Job Photo" className="w-full h-full object-cover" />
              </div>

              <div className="space-y-1.5 flex-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-slate-800 font-bold">অনলাইন আবেদনের জন্য অনুমোদিত</span>
                </div>
                <div className="text-slate-600 space-y-0.5 text-[11px]">
                  <p>রেজোলিউশন: <strong className="text-slate-800">৩০০ × ৩০০ পিক্সেল</strong></p>
                  <p>ফাইলের আকার: <strong className="text-emerald-700 font-mono font-bold">{formatFileSize(photoResult.sizeBytes)}</strong> (Max 100KB)</p>
                  <p>ফরম্যাট: <strong className="text-slate-800">JPEG / JPG</strong></p>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => downloadDataUrl(photoResult.dataUrl, 'Applicant_Photo_300x300.jpg')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    ছবি ডাউনলোড
                  </button>

                  <label className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer">
                    পরিবর্তন
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo')} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <label className="h-40 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-lg flex flex-col items-center justify-center p-4 cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs text-slate-700 font-semibold">আবেদনকারীর ছবি আপলোড করুন</span>
              <span className="text-[10px] text-slate-400 mt-0.5">অটোমেটিক ৩০০×৩০০ পিক্সেল ও ১০০ KB-র নিচে করা হবে</span>
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo')} className="hidden" />
            </label>
          )}

          {/* Photo Adjustments */}
          {photoSrc && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-600 font-medium text-[11px] block mb-1">উজ্জ্বলতা (Brightness): {photoBrightness}</span>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={photoBrightness}
                  onChange={(e) => setPhotoBrightness(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <span className="text-slate-600 font-medium text-[11px] block mb-1">কনট্রাস্ট (Contrast): {photoContrast}</span>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={photoContrast}
                  onChange={(e) => setPhotoContrast(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Signature Section (300 x 80 px, Max 60 KB) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-emerald-600" />
              ২. আবেদনকারীর স্বাক্ষর (৩০০ × ৮০ px)
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">
              MAX 60 KB
            </span>
          </div>

          {/* Upload or View */}
          {signResult ? (
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="w-full h-18 rounded overflow-hidden border border-slate-300 shadow-inner bg-white flex items-center justify-center p-2">
                <img src={signResult.dataUrl} alt="Job Signature" className="max-w-full max-h-full object-contain" />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-slate-600 space-y-0.5 text-[11px]">
                  <p>রেজোলিউশন: <strong className="text-slate-800">৩০০ × ৮০ পিক্সেল</strong></p>
                  <p>ফাইলের আকার: <strong className="text-emerald-700 font-mono font-bold">{formatFileSize(signResult.sizeBytes)}</strong> (Max 60KB)</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadDataUrl(signResult.dataUrl, 'Applicant_Signature_300x80.jpg')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    স্বাক্ষর ডাউনলোড
                  </button>

                  <label className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer">
                    পরিবর্তন
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'sign')} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <label className="h-40 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-lg flex flex-col items-center justify-center p-4 cursor-pointer bg-slate-50 hover:bg-emerald-50/30 transition">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs text-slate-700 font-semibold">স্বাক্ষরের ছবি বা স্ক্যান কপি আপলোড করুন</span>
              <span className="text-[10px] text-slate-400 mt-0.5">অটোমেটিক সাদা ব্যাকগ্রাউন্ড ও ৩০০×৮০ পিক্সেল করা হবে</span>
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'sign')} className="hidden" />
            </label>
          )}

          {/* Signature Whitening Threshold */}
          {signSrc && (
            <div className="pt-3 border-t border-slate-100 text-xs space-y-1">
              <div className="flex justify-between text-[11px] text-slate-600">
                <span className="font-semibold">কাগজের ব্যাকগ্রাউন্ড সাদা করার মাত্রা (Clean White Level)</span>
                <span className="font-mono text-slate-800 font-bold">{signThreshold}</span>
              </div>
              <input
                type="range"
                min="80"
                max="220"
                value={signThreshold}
                onChange={(e) => setSignThreshold(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <span className="text-[10px] text-slate-500 block">ফোনে তোলা ছবিতে ছায়া থাকলে বাড়িয়ে পরিষ্কার করে নিন</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
