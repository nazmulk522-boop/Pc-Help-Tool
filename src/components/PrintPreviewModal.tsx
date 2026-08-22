import React, { useEffect, useRef, useState } from 'react';
import { Printer, Download, X, ZoomIn, ZoomOut, RotateCcw, Copy, Check, FileText, Scissors } from 'lucide-react';
import { PaperSize } from '../types';
import { mmToPx } from '../utils/imageProcessing';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  renderCanvasContent: (ctx: CanvasRenderingContext2D, widthPx: number, heightPx: number, dpi: number) => void;
  paperSize?: PaperSize;
  orientation?: 'portrait' | 'landscape';
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  renderCanvasContent,
  paperSize = '4R',
  orientation = 'portrait',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [copies, setCopies] = useState<number>(1);
  const [includeCutMarks, setIncludeCutMarks] = useState<boolean>(true);
  const [selectedPaper, setSelectedPaper] = useState<PaperSize>(paperSize);
  const [selectedOrientation, setSelectedOrientation] = useState<'portrait' | 'landscape'>(orientation);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Paper dimensions in mm
  const paperDimensions: Record<PaperSize, { w: number; h: number; nameBn: string }> = {
    '4R': { w: 102, h: 152, nameBn: '৪R ফটো পেপার (4"x6")' },
    '3R': { w: 89, h: 127, nameBn: '৩R ফটো পেপার (3.5"x5")' },
    'A4': { w: 210, h: 297, nameBn: 'A4 স্ট্যান্ডার্ড পেপার' },
    'Letter': { w: 216, h: 279, nameBn: 'লেটার পেপার (Letter)' },
  };

  const dim = paperDimensions[selectedPaper] || paperDimensions['4R'];
  const paperWidthMm = selectedOrientation === 'portrait' ? dim.w : dim.h;
  const paperHeightMm = selectedOrientation === 'portrait' ? dim.h : dim.w;

  const dpi = 300;
  const widthPx = mmToPx(paperWidthMm, dpi);
  const heightPx = mmToPx(paperHeightMm, dpi);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Fill white paper background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // Render user content
    try {
      renderCanvasContent(ctx, widthPx, heightPx, dpi);
    } catch (err) {
      console.error('Error rendering print canvas:', err);
    }

    // Generate preview URL for direct printing iframe / media print
    setPreviewUrl(canvas.toDataURL('image/png', 1.0));
  }, [isOpen, selectedPaper, selectedOrientation, widthPx, heightPx, renderCanvasContent, includeCutMarks]);

  if (!isOpen) return null;

  const handlePrint = () => {
    // Print window using dedicated printable popup or window.print()
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - প্রিন্ট</title>
          <style>
            @page {
              size: ${paperWidthMm}mm ${paperHeightMm}mm;
              margin: 0mm;
            }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            img {
              width: ${paperWidthMm}mm;
              height: ${paperHeightMm}mm;
              object-fit: contain;
              display: block;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <img src="${previewUrl}" alt="Print Sheet" onload="window.print(); setTimeout(() => window.close(), 1000);" />
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/jpeg', 0.98);
    a.download = `${title.replace(/\s+/g, '_')}_${selectedPaper}_300DPI.jpg`;
    a.click();
  };

  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (blob && navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        } catch (e) {
          console.error('Clipboard copy error:', e);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-semibold text-white flex items-center gap-2">
                অটোমেটিক প্রিন্ট প্রিভিউ
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
                  ৩০০ DPI ক্রিস্প প্রিন্ট
                </span>
              </h2>
              <p className="text-xs text-slate-400">{title} • পেপার সাইজ: {dim.nameBn}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-slate-850 border-b border-slate-800 text-xs">
          {/* Paper selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">কাগজ:</span>
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              {(['4R', '3R', 'A4', 'Letter'] as PaperSize[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPaper(p)}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    selectedPaper === p
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Orientation */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">দিক:</span>
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                onClick={() => setSelectedOrientation('portrait')}
                className={`px-2.5 py-1 rounded-md transition font-medium ${
                  selectedOrientation === 'portrait'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                খাড়া (Portrait)
              </button>
              <button
                onClick={() => setSelectedOrientation('landscape')}
                className={`px-2.5 py-1 rounded-md transition font-medium ${
                  selectedOrientation === 'landscape'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                আড়াআড়ি (Landscape)
              </button>
            </div>
          </div>

          {/* Cut marks toggle */}
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeCutMarks}
              onChange={(e) => setIncludeCutMarks(e.target.checked)}
              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
            />
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>কাটার দাগ (Cut Line)</span>
          </label>

          {/* Zoom controls */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setZoom((z) => Math.max(30, z - 15))}
              className="p-1 text-slate-400 hover:text-white"
              title="জুম কমান"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-12 text-center font-mono text-slate-200">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(200, z + 15))}
              className="p-1 text-slate-400 hover:text-white"
              title="জুম বাড়ান"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="p-1 text-slate-400 hover:text-white ml-1"
              title="রিসেট জুম"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Canvas Viewport */}
        <div className="flex-1 bg-slate-950/90 overflow-auto p-4 md:p-8 flex items-center justify-center min-h-[360px]">
          <div
            className="relative bg-white shadow-2xl rounded-sm transition-transform duration-150 origin-center border border-slate-300"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'center center',
            }}
          >
            <canvas ref={canvasRef} className="block max-w-none shadow-inner" />
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-850 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            আকার: <strong className="text-slate-200">{paperWidthMm} × {paperHeightMm} মিমি</strong> ({widthPx} × {heightPx} px @ 300 DPI)
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyToClipboard}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {isCopied ? 'কপি হয়েছে!' : 'ছবি কপি'}
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-750 hover:bg-slate-700 text-white text-xs font-medium border border-slate-600 transition"
            >
              <Download className="w-4 h-4 text-sky-400" />
              HD ইমেজ ডাউনলোড
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-900/30 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <Printer className="w-4 h-4" />
              এখনই প্রিন্ট করুন (Print)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
