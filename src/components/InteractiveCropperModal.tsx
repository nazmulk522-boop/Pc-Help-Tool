import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Check, 
  RotateCw, 
  RotateCcw, 
  Maximize, 
  ZoomIn, 
  ZoomOut, 
  Scissors, 
  Move,
  RefreshCw,
  Crop,
  Layers
} from 'lucide-react';
import { loadImage } from '../utils/imageProcessing';

export interface CropArea {
  x: number; // percentage 0-100 or relative px
  y: number;
  width: number;
  height: number;
}

interface InteractiveCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  title?: string;
  defaultAspectRatio?: number | null; // e.g. 85.6 / 54 or null for freeform
  aspectRatioOptions?: Array<{ label: string; ratio: number | null; id: string }>;
  onCropComplete: (croppedDataUrl: string) => void;
}

export const InteractiveCropperModal: React.FC<InteractiveCropperModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  title = 'ম্যানুয়াল ক্রপ করুন (Manual Crop Area)',
  defaultAspectRatio = null,
  aspectRatioOptions = [
    { id: 'free', label: 'ফ্রি-হ্যান্ড (Freeform)', ratio: null },
    { id: 'smart', label: 'স্মার্ট কার্ড (85.6 × 54 mm)', ratio: 85.6 / 54 },
    { id: 'old', label: 'পুরাতন NID (90 × 60 mm)', ratio: 90 / 60 },
    { id: 'square', label: '১:১ বর্গাকার', ratio: 1 },
    { id: 'passport', label: 'পাসপোর্ট (৪৫ × ৩৫ mm)', ratio: 35 / 45 },
  ],
  onCropComplete,
}) => {
  const [selectedRatioId, setSelectedRatioId] = useState<string>('free');
  const [rotation, setRotation] = useState<number>(0);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Normalized crop rectangle [0..1] relative to image dimensions
  const [cropNorm, setCropNorm] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0.08,
    y: 0.08,
    w: 0.84,
    h: 0.84,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null); // 'move', 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
  const dragStartRef = useRef<{ startX: number; startY: number; initialCrop: typeof cropNorm }>({
    startX: 0,
    startY: 0,
    initialCrop: { x: 0, y: 0, w: 0, h: 0 },
  });

  // Load image
  useEffect(() => {
    if (!imageSrc || !isOpen) return;
    let isMounted = true;
    loadImage(imageSrc).then((img) => {
      if (isMounted) {
        setImageObj(img);
        setRotation(0);
        // Default crop box nicely centered
        setCropNorm({
          x: 0.05,
          y: 0.05,
          w: 0.9,
          h: 0.9,
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [imageSrc, isOpen]);

  // Current Aspect Ratio
  const currentRatio = aspectRatioOptions.find((o) => o.id === selectedRatioId)?.ratio ?? null;

  // Enforce aspect ratio on cropNorm when ratio changes
  const applyRatioToCrop = (ratio: number | null) => {
    if (!ratio || !imageObj) return;
    setCropNorm((prev) => {
      let newW = prev.w;
      // Account for rotation
      const effectiveImgRatio = (rotation % 180 !== 0)
        ? imageObj.height / imageObj.width
        : imageObj.width / imageObj.height;

      // Desired h relative to normalized w
      let newH = (newW * effectiveImgRatio) / ratio;
      if (newH > 0.95) {
        newH = 0.95;
        newW = (newH * ratio) / effectiveImgRatio;
      }
      const newX = Math.max(0, Math.min(1 - newW, prev.x));
      const newY = Math.max(0, Math.min(1 - newH, prev.y));
      return { x: newX, y: newY, w: newW, h: newH };
    });
  };

  const handleRatioSelect = (id: string) => {
    setSelectedRatioId(id);
    const opt = aspectRatioOptions.find((o) => o.id === id);
    if (opt && opt.ratio) {
      applyRatioToCrop(opt.ratio);
    }
  };

  // Redraw Canvas View
  const drawCropper = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imageObj) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions of viewport
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    canvas.width = containerW;
    canvas.height = containerH;

    ctx.clearRect(0, 0, containerW, containerH);

    // Calculate rotated image dimensions
    const isRotated = rotation % 180 !== 0;
    const imgW = isRotated ? imageObj.height : imageObj.width;
    const imgH = isRotated ? imageObj.width : imageObj.height;

    // Fit image inside container with padding
    const padding = 24;
    const availW = containerW - padding * 2;
    const availH = containerH - padding * 2;
    const scale = Math.min(availW / imgW, availH / imgH);

    const renderW = imgW * scale;
    const renderH = imgH * scale;
    const renderX = (containerW - renderW) / 2;
    const renderY = (containerH - renderH) / 2;

    // 1. Draw Base Rotated Image
    ctx.save();
    ctx.translate(containerW / 2, containerH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    const drawImgW = imageObj.width * scale;
    const drawImgH = imageObj.height * scale;
    ctx.drawImage(imageObj, -drawImgW / 2, -drawImgH / 2, drawImgW, drawImgH);
    ctx.restore();

    // 2. Dark Overlay outside crop area
    const cropPixelX = renderX + cropNorm.x * renderW;
    const cropPixelY = renderY + cropNorm.y * renderH;
    const cropPixelW = cropNorm.w * renderW;
    const cropPixelH = cropNorm.h * renderH;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)'; // slate-900 / 65%

    // Draw 4 dark rectangles surrounding the crop box
    // Top
    ctx.fillRect(0, 0, containerW, cropPixelY);
    // Bottom
    ctx.fillRect(0, cropPixelY + cropPixelH, containerW, containerH - (cropPixelY + cropPixelH));
    // Left
    ctx.fillRect(0, cropPixelY, cropPixelX, cropPixelH);
    // Right
    ctx.fillRect(cropPixelX + cropPixelW, cropPixelY, containerW - (cropPixelX + cropPixelW), cropPixelH);

    // 3. Crop Box Border & Rule of Thirds Grid
    ctx.strokeStyle = '#2563EB'; // Blue 600
    ctx.lineWidth = 2;
    ctx.strokeRect(cropPixelX, cropPixelY, cropPixelW, cropPixelH);

    // Inner Grid Lines (Rule of thirds)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    ctx.beginPath();
    // Vertical grid
    ctx.moveTo(cropPixelX + cropPixelW / 3, cropPixelY);
    ctx.lineTo(cropPixelX + cropPixelW / 3, cropPixelY + cropPixelH);
    ctx.moveTo(cropPixelX + (cropPixelW * 2) / 3, cropPixelY);
    ctx.lineTo(cropPixelX + (cropPixelW * 2) / 3, cropPixelY + cropPixelH);
    // Horizontal grid
    ctx.moveTo(cropPixelX, cropPixelY + cropPixelH / 3);
    ctx.lineTo(cropPixelX + cropPixelW, cropPixelY + cropPixelH / 3);
    ctx.moveTo(cropPixelX, cropPixelY + (cropPixelH * 2) / 3);
    ctx.lineTo(cropPixelX + cropPixelW, cropPixelY + (cropPixelH * 2) / 3);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Corner Handles & Edge Handles
    const handleSize = 14;
    const drawHandle = (hx: number, hy: number) => {
      ctx.fillStyle = '#2563EB';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    };

    // Corners
    drawHandle(cropPixelX, cropPixelY); // NW
    drawHandle(cropPixelX + cropPixelW, cropPixelY); // NE
    drawHandle(cropPixelX, cropPixelY + cropPixelH); // SW
    drawHandle(cropPixelX + cropPixelW, cropPixelY + cropPixelH); // SE

    // Edges
    drawHandle(cropPixelX + cropPixelW / 2, cropPixelY); // N
    drawHandle(cropPixelX + cropPixelW / 2, cropPixelY + cropPixelH); // S
    drawHandle(cropPixelX, cropPixelY + cropPixelH / 2); // W
    drawHandle(cropPixelX + cropPixelW, cropPixelY + cropPixelH / 2); // E

    ctx.restore();
  }, [imageObj, rotation, cropNorm]);

  useEffect(() => {
    drawCropper();
  }, [drawCropper]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      drawCropper();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCropper]);

  // Helper to convert screen coordinates to image normalized coordinates
  const getRenderMetrics = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj) return null;
    const containerW = canvas.width;
    const containerH = canvas.height;
    const isRotated = rotation % 180 !== 0;
    const imgW = isRotated ? imageObj.height : imageObj.width;
    const imgH = isRotated ? imageObj.width : imageObj.height;

    const padding = 24;
    const availW = containerW - padding * 2;
    const availH = containerH - padding * 2;
    const scale = Math.min(availW / imgW, availH / imgH);

    const renderW = imgW * scale;
    const renderH = imgH * scale;
    const renderX = (containerW - renderW) / 2;
    const renderY = (containerH - renderH) / 2;

    return { renderX, renderY, renderW, renderH, scale, imgW, imgH };
  };

  // Determine which handle or area was clicked
  const getHandleAt = (clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    const metrics = getRenderMetrics();
    if (!canvas || !metrics) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const cropPixelX = metrics.renderX + cropNorm.x * metrics.renderW;
    const cropPixelY = metrics.renderY + cropNorm.y * metrics.renderH;
    const cropPixelW = cropNorm.w * metrics.renderW;
    const cropPixelH = cropNorm.h * metrics.renderH;

    const threshold = 18;

    // Corner checks
    if (Math.abs(x - cropPixelX) <= threshold && Math.abs(y - cropPixelY) <= threshold) return 'nw';
    if (Math.abs(x - (cropPixelX + cropPixelW)) <= threshold && Math.abs(y - cropPixelY) <= threshold) return 'ne';
    if (Math.abs(x - cropPixelX) <= threshold && Math.abs(y - (cropPixelY + cropPixelH)) <= threshold) return 'sw';
    if (Math.abs(x - (cropPixelX + cropPixelW)) <= threshold && Math.abs(y - (cropPixelY + cropPixelH)) <= threshold) return 'se';

    // Edge checks
    if (Math.abs(x - (cropPixelX + cropPixelW / 2)) <= threshold && Math.abs(y - cropPixelY) <= threshold) return 'n';
    if (Math.abs(x - (cropPixelX + cropPixelW / 2)) <= threshold && Math.abs(y - (cropPixelY + cropPixelH)) <= threshold) return 's';
    if (Math.abs(x - cropPixelX) <= threshold && Math.abs(y - (cropPixelY + cropPixelH / 2)) <= threshold) return 'w';
    if (Math.abs(x - (cropPixelX + cropPixelW)) <= threshold && Math.abs(y - (cropPixelY + cropPixelH / 2)) <= threshold) return 'e';

    // Inside box -> move
    if (x >= cropPixelX && x <= cropPixelX + cropPixelW && y >= cropPixelY && y <= cropPixelY + cropPixelH) {
      return 'move';
    }

    return null;
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    const handle = getHandleAt(clientX, clientY);
    if (handle) {
      setIsDragging(handle);
      dragStartRef.current = {
        startX: clientX,
        startY: clientY,
        initialCrop: { ...cropNorm },
      };
    }
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const metrics = getRenderMetrics();
    if (!metrics) return;

    const dx = (clientX - dragStartRef.current.startX) / metrics.renderW;
    const dy = (clientY - dragStartRef.current.startY) / metrics.renderH;
    const init = dragStartRef.current.initialCrop;

    let newX = init.x;
    let newY = init.y;
    let newW = init.w;
    let newH = init.h;

    const minSize = 0.05;

    if (isDragging === 'move') {
      newX = Math.max(0, Math.min(1 - init.w, init.x + dx));
      newY = Math.max(0, Math.min(1 - init.h, init.y + dy));
    } else if (isDragging === 'se') {
      newW = Math.max(minSize, Math.min(1 - init.x, init.w + dx));
      newH = Math.max(minSize, Math.min(1 - init.y, init.h + dy));
      if (currentRatio) {
        const effectiveImgRatio = (rotation % 180 !== 0)
          ? imageObj!.height / imageObj!.width
          : imageObj!.width / imageObj!.height;
        newH = (newW * effectiveImgRatio) / currentRatio;
      }
    } else if (isDragging === 'sw') {
      const targetRight = init.x + init.w;
      newX = Math.max(0, Math.min(targetRight - minSize, init.x + dx));
      newW = targetRight - newX;
      newH = Math.max(minSize, Math.min(1 - init.y, init.h + dy));
      if (currentRatio) {
        const effectiveImgRatio = (rotation % 180 !== 0)
          ? imageObj!.height / imageObj!.width
          : imageObj!.width / imageObj!.height;
        newH = (newW * effectiveImgRatio) / currentRatio;
      }
    } else if (isDragging === 'ne') {
      const targetBottom = init.y + init.h;
      newY = Math.max(0, Math.min(targetBottom - minSize, init.y + dy));
      newH = targetBottom - newY;
      newW = Math.max(minSize, Math.min(1 - init.x, init.w + dx));
      if (currentRatio) {
        const effectiveImgRatio = (rotation % 180 !== 0)
          ? imageObj!.height / imageObj!.width
          : imageObj!.width / imageObj!.height;
        newW = (newH * currentRatio) / effectiveImgRatio;
      }
    } else if (isDragging === 'nw') {
      const targetRight = init.x + init.w;
      const targetBottom = init.y + init.h;
      newX = Math.max(0, Math.min(targetRight - minSize, init.x + dx));
      newY = Math.max(0, Math.min(targetBottom - minSize, init.y + dy));
      newW = targetRight - newX;
      newH = targetBottom - newY;
    } else if (isDragging === 'e') {
      newW = Math.max(minSize, Math.min(1 - init.x, init.w + dx));
    } else if (isDragging === 'w') {
      const targetRight = init.x + init.w;
      newX = Math.max(0, Math.min(targetRight - minSize, init.x + dx));
      newW = targetRight - newX;
    } else if (isDragging === 's') {
      newH = Math.max(minSize, Math.min(1 - init.y, init.h + dy));
    } else if (isDragging === 'n') {
      const targetBottom = init.y + init.h;
      newY = Math.max(0, Math.min(targetBottom - minSize, init.y + dy));
      newH = targetBottom - newY;
    }

    // Bounds check
    newX = Math.max(0, Math.min(1 - minSize, newX));
    newY = Math.max(0, Math.min(1 - minSize, newY));
    newW = Math.max(minSize, Math.min(1 - newX, newW));
    newH = Math.max(minSize, Math.min(1 - newY, newH));

    setCropNorm({ x: newX, y: newY, w: newW, h: newH });
  };

  const handlePointerUp = () => {
    setIsDragging(null);
  };

  // Perform full resolution export of the cropped image
  const handleApplyCrop = () => {
    if (!imageObj) return;

    // 1. Create canvas for full-resolution rotated image
    const isRotated = rotation % 180 !== 0;
    const fullW = isRotated ? imageObj.height : imageObj.width;
    const fullH = isRotated ? imageObj.width : imageObj.height;

    const rotatedCanvas = document.createElement('canvas');
    rotatedCanvas.width = fullW;
    rotatedCanvas.height = fullH;
    const rCtx = rotatedCanvas.getContext('2d')!;

    rCtx.translate(fullW / 2, fullH / 2);
    rCtx.rotate((rotation * Math.PI) / 180);
    rCtx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);

    // 2. Crop high-resolution slice
    const sourceCropX = Math.round(cropNorm.x * fullW);
    const sourceCropY = Math.round(cropNorm.y * fullH);
    const sourceCropW = Math.max(10, Math.round(cropNorm.w * fullW));
    const sourceCropH = Math.max(10, Math.round(cropNorm.h * fullH));

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = sourceCropW;
    finalCanvas.height = sourceCropH;
    const fCtx = finalCanvas.getContext('2d')!;

    fCtx.drawImage(
      rotatedCanvas,
      sourceCropX,
      sourceCropY,
      sourceCropW,
      sourceCropH,
      0,
      0,
      sourceCropW,
      sourceCropH
    );

    const croppedUrl = finalCanvas.toDataURL('image/jpeg', 0.98);
    onCropComplete(croppedUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                {title}
                <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-blue-800/80 text-blue-200">
                  ম্যানুয়াল ক্রপার
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                ইচ্ছামতো ড্র্যাগ করে কার্ডের চার কোণা ও সীমানা নিখুঁতভাবে সিলেক্ট করুন।
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Aspect Ratio Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-slate-500 font-semibold text-[11px] mr-1">অনুপাত:</span>
            {aspectRatioOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleRatioSelect(opt.id)}
                className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition ${
                  selectedRatioId === opt.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Rotation & Reset Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
              title="বামে ৯০° ঘোরান"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
              title="ডানে ৯০° ঘোরান"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setRotation(0);
                setCropNorm({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
                setSelectedRatioId('free');
              }}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              রিসেট
            </button>
          </div>
        </div>

        {/* Main Interactive Canvas Area */}
        <div
          ref={containerRef}
          className="flex-1 bg-slate-950 p-2 sm:p-4 flex items-center justify-center relative select-none min-h-[380px] max-h-[60vh] overflow-hidden"
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerUp}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length > 0) {
              handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          onTouchEnd={handlePointerUp}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full max-h-[55vh] object-contain cursor-crosshair"
          />
          <div className="absolute top-3 left-3 bg-slate-900/80 text-white px-2.5 py-1 rounded text-[11px] font-mono pointer-events-none backdrop-blur-xs">
            ড্র্যাগ করুন এবং কোণা টেনে সাইজ ঠিক করুন
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ক্রপ করার পর কার্ডটি ৩০০ DPI স্পষ্ট রেজোলিউশনে রেন্ডার হবে।</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
            >
              বাতিল
            </button>

            <button
              onClick={handleApplyCrop}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg flex items-center gap-2 transition"
            >
              <Check className="w-4 h-4" />
              ক্রপ নিশ্চিত করুন (Apply Crop)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
