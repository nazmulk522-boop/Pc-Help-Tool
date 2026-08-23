// Image Processing and Canvas Utilities for Computer Shop Studio Toolkit

export interface ImageFilterOptions {
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  saturation?: number; // -100 to 100
  grayscale?: boolean;
  photocopyMode?: boolean; // high contrast black & white photocopy
  sharpen?: boolean;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// Convert MM to Pixels at specified DPI (default 300 DPI for Studio Print Quality)
export function mmToPx(mm: number, dpi = 300): number {
  return Math.round((mm * dpi) / 25.4);
}

export function pxToMm(px: number, dpi = 300): number {
  return Math.round((px * 25.4) / dpi);
}

// Format bytes to readable KB/MB
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Download helper
export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Client-side Smart Chroma / Flood / Floodfill & Edge Distance Background Extraction
export function removeBackgroundCanvas(
  sourceCanvas: HTMLCanvasElement,
  targetBgColor: string | null = null, // null for transparent PNG, or '#5B92E5' etc
  options: {
    tolerance?: number; // 10 to 90 (sample sensitivity)
    edgeFeather?: number; // 0 to 5 px
    cornerSample?: boolean;
    samplePoints?: Array<{ x: number; y: number }>;
  } = {}
): HTMLCanvasElement {
  const { tolerance = 38 } = options;
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext('2d', { willReadFrequently: true })!;

  const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })!;
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Sample background colors from outer top and side edges
  const sampleColors: Array<[number, number, number]> = [];
  const edgeSamples = [
    [2, 2],
    [width - 3, 2],
    [Math.floor(width / 2), 2],
    [Math.floor(width / 4), 2],
    [Math.floor((width * 3) / 4), 2],
    [2, Math.floor(height / 4)],
    [width - 3, Math.floor(height / 4)],
    [2, Math.floor(height / 2)],
    [width - 3, Math.floor(height / 2)],
  ];

  for (const [cx, cy] of edgeSamples) {
    const safeX = Math.max(0, Math.min(width - 1, cx));
    const safeY = Math.max(0, Math.min(height - 1, cy));
    const idx = (safeY * width + safeX) * 4;
    sampleColors.push([data[idx], data[idx + 1], data[idx + 2]]);
  }

  // Alpha mask array: default all 255 (keep foreground)
  const mask = new Uint8Array(width * height);
  mask.fill(255);

  // Helper to calculate color distance
  const colorDist = (r: number, g: number, b: number, sr: number, sg: number, sb: number) => {
    return Math.sqrt(
      Math.pow(r - sr, 2) * 0.3 +
      Math.pow(g - sg, 2) * 0.59 +
      Math.pow(b - sb, 2) * 0.11
    );
  };

  // Connected Flood-Fill Queue from outer boundary
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  // Seed boundary pixels (top row, left column, right column)
  for (let x = 0; x < width; x++) {
    queue.push(0 * width + x); // Top edge
    visited[0 * width + x] = 1;
  }
  for (let y = 0; y < height; y++) {
    queue.push(y * width + 0); // Left edge
    visited[y * width + 0] = 1;
    queue.push(y * width + (width - 1)); // Right edge
    visited[y * width + (width - 1)] = 1;
  }

  // Helper to detect human skin tones (protect face and neck from being cut)
  const isSkinTone = (r: number, g: number, b: number): boolean => {
    return (
      r > 55 &&
      g > 35 &&
      b > 20 &&
      r > g &&
      r > b &&
      Math.abs(r - g) > 10 &&
      r - b > 14
    );
  };

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);
    const idx = curr * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    // Portrait Body & Face Protection: Center-lower body/face region should never be removed as background
    const isPortraitCoreRegion =
      cx > width * 0.18 &&
      cx < width * 0.82 &&
      cy > height * 0.18;

    if (isPortraitCoreRegion && isSkinTone(r, g, b)) {
      // Definite face/neck skin pixel - DO NOT treat as background
      continue;
    }

    if (a < 10) {
      mask[curr] = 0;
    } else {
      let minDistance = 999;
      for (const [sr, sg, sb] of sampleColors) {
        const dist = colorDist(r, g, b, sr, sg, sb);
        if (dist < minDistance) minDistance = dist;
      }

      // Stricter threshold inside the central portrait chest/shirt zone
      const effectiveTolerance = isPortraitCoreRegion ? Math.min(tolerance, 28) : tolerance;

      if (minDistance < effectiveTolerance) {
        mask[curr] = 0; // Marked as background

        // Expand to 4 neighbors
        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (!visited[nIdx]) {
              visited[nIdx] = 1;
              queue.push(nIdx);
            }
          }
        }
      } else if (minDistance < effectiveTolerance + 10) {
        // Soft border transition
        mask[curr] = Math.round(((minDistance - effectiveTolerance) / 10) * 255);
      }
    }
  }

  // Apply new background color if selected
  if (targetBgColor) {
    outCtx.fillStyle = targetBgColor;
    outCtx.fillRect(0, 0, width, height);
  }

  // Write masked subject pixels
  const outImgData = outCtx.getImageData(0, 0, width, height);
  const outData = outImgData.data;

  for (let i = 0; i < width * height; i++) {
    const pIdx = i * 4;
    const alphaVal = mask[i];
    if (alphaVal === 0) {
      if (!targetBgColor) {
        outData[pIdx + 3] = 0;
      }
    } else if (alphaVal < 255) {
      const srcAlpha = alphaVal / 255;
      if (targetBgColor) {
        outData[pIdx] = Math.round(data[pIdx] * srcAlpha + outData[pIdx] * (1 - srcAlpha));
        outData[pIdx + 1] = Math.round(data[pIdx + 1] * srcAlpha + outData[pIdx + 1] * (1 - srcAlpha));
        outData[pIdx + 2] = Math.round(data[pIdx + 2] * srcAlpha + outData[pIdx + 2] * (1 - srcAlpha));
        outData[pIdx + 3] = 255;
      } else {
        outData[pIdx] = data[pIdx];
        outData[pIdx + 1] = data[pIdx + 1];
        outData[pIdx + 2] = data[pIdx + 2];
        outData[pIdx + 3] = alphaVal;
      }
    } else {
      outData[pIdx] = data[pIdx];
      outData[pIdx + 1] = data[pIdx + 1];
      outData[pIdx + 2] = data[pIdx + 2];
      outData[pIdx + 3] = 255;
    }
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outputCanvas;
}

// Composite a transparent subject cutout over a chosen solid color
export function compositeCutoutWithColor(
  cutoutCanvas: HTMLCanvasElement,
  targetBgColor: string | null = '#5B92E5'
): HTMLCanvasElement {
  const width = cutoutCanvas.width;
  const height = cutoutCanvas.height;

  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const ctx = output.getContext('2d')!;

  if (targetBgColor) {
    ctx.fillStyle = targetBgColor;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(cutoutCanvas, 0, 0);
  return output;
}

// Full async background removal with Remove.bg API and intelligent local segmentation fallback
export async function removeBackgroundAuto(
  sourceDataUrl: string,
  options: {
    targetBgColor?: string | null;
    service?: 'remove_bg' | 'studio_ai';
    apiKey?: string;
    tolerance?: number;
  } = {}
): Promise<{
  transparentDataUrl: string;
  coloredDataUrl: string;
  source: 'remove.bg' | 'studio_ai';
}> {
  const clientKey = options.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('remove_bg_api_key') || undefined : undefined);
  const { targetBgColor = '#87CEEB', tolerance = 38 } = options;
  const apiKey = clientKey;

  // 1. Try server-side Remove.bg API
  try {
    const res = await fetch('/api/remove-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: sourceDataUrl,
        apiKey,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.imageBase64) {
        const img = await loadImage(json.imageBase64);
        const cutoutCanvas = document.createElement('canvas');
        cutoutCanvas.width = img.width;
        cutoutCanvas.height = img.height;
        const cCtx = cutoutCanvas.getContext('2d')!;
        cCtx.drawImage(img, 0, 0);

        const colored = compositeCutoutWithColor(cutoutCanvas, targetBgColor);
        return {
          transparentDataUrl: cutoutCanvas.toDataURL('image/png'),
          coloredDataUrl: colored.toDataURL('image/png'),
          source: 'remove.bg',
        };
      }
    }
  } catch (e) {
    console.warn('API BG removal failed, falling back to studio client-side segmentation:', e);
  }

  // 2. Client-side local engine fallback
  const img = await loadImage(sourceDataUrl);
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  const ctx = tempCanvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  // Generate transparent cutout
  const transparentCanvas = removeBackgroundCanvas(tempCanvas, null, { tolerance });
  // Generate colored composite
  const coloredCanvas = removeBackgroundCanvas(tempCanvas, targetBgColor, { tolerance });

  return {
    transparentDataUrl: transparentCanvas.toDataURL('image/png'),
    coloredDataUrl: coloredCanvas.toDataURL('image/png'),
    source: 'studio_ai',
  };
}

// Dedicated Gemini AI Passport Retouch & Background Transformer
export async function enhancePassportWithGemini(
  sourceDataUrl: string,
  prompt?: string
): Promise<{ success: boolean; imageBase64?: string; error?: string; promptUsed?: string }> {
  try {
    const res = await fetch('/api/gemini/enhance-passport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: sourceDataUrl,
        prompt,
      }),
    });

    const json = await res.json();
    if (res.ok && json.success && json.imageBase64) {
      return {
        success: true,
        imageBase64: json.imageBase64,
        promptUsed: json.promptUsed,
      };
    } else {
      return {
        success: false,
        error: json.error || 'Gemini প্রসেসিং সম্পন্ন করা যায়নি।',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'নেটওয়ার্ক এরর।',
    };
  }
}

// Apply Filters (Brightness, Contrast, Photocopy B&W, Grayscale)
export function applyFiltersToCanvas(
  canvas: HTMLCanvasElement,
  options: ImageFilterOptions
): HTMLCanvasElement {
  const {
    brightness = 0,
    contrast = 0,
    grayscale = false,
    photocopyMode = false,
  } = options;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = canvas.width;
  outCanvas.height = canvas.height;
  const ctx = outCanvas.getContext('2d', { willReadFrequently: true })!;

  ctx.drawImage(canvas, 0, 0);

  if (brightness === 0 && contrast === 0 && !grayscale && !photocopyMode) {
    return outCanvas;
  }

  const imgData = ctx.getImageData(0, 0, outCanvas.width, outCanvas.height);
  const d = imgData.data;

  // Contrast factor
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];

    // Brightness
    if (brightness !== 0) {
      r = Math.min(255, Math.max(0, r + brightness * 1.5));
      g = Math.min(255, Math.max(0, g + brightness * 1.5));
      b = Math.min(255, Math.max(0, b + brightness * 1.5));
    }

    // Contrast
    if (contrast !== 0) {
      r = Math.min(255, Math.max(0, factor * (r - 128) + 128));
      g = Math.min(255, Math.max(0, factor * (g - 128) + 128));
      b = Math.min(255, Math.max(0, factor * (b - 128) + 128));
    }

    // Grayscale
    if (grayscale || photocopyMode) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      if (photocopyMode) {
        // High contrast photocopy threshold for crisp text and sharp photo outline
        const thresh = 145;
        const val = gray > thresh ? 255 : Math.max(0, gray * 0.7);
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      } else {
        d[i] = gray;
        d[i + 1] = gray;
        d[i + 2] = gray;
      }
    } else {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return outCanvas;
}

// Compress to target size in KB (Iterative quality decrease)
export async function compressCanvasToTargetKb(
  canvas: HTMLCanvasElement,
  targetKb: number,
  exactWidth?: number,
  exactHeight?: number,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<{ dataUrl: string; sizeBytes: number; width: number; height: number }> {
  // If exact dimensions requested, resize canvas first
  let targetCanvas = canvas;
  if (exactWidth && exactHeight && (canvas.width !== exactWidth || canvas.height !== exactHeight)) {
    targetCanvas = document.createElement('canvas');
    targetCanvas.width = exactWidth;
    targetCanvas.height = exactHeight;
    const ctx = targetCanvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, exactWidth, exactHeight);
    ctx.drawImage(canvas, 0, 0, exactWidth, exactHeight);
  }

  let quality = 0.95;
  let dataUrl = targetCanvas.toDataURL(format, quality);
  let sizeBytes = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75);

  const targetBytes = targetKb * 1024;

  if (sizeBytes <= targetBytes || format === 'image/png') {
    return {
      dataUrl,
      sizeBytes,
      width: targetCanvas.width,
      height: targetCanvas.height,
    };
  }

  // Binary search or iterative step down
  while (sizeBytes > targetBytes && quality > 0.1) {
    quality -= 0.08;
    dataUrl = targetCanvas.toDataURL(format, quality);
    sizeBytes = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75);
  }

  return {
    dataUrl,
    sizeBytes,
    width: targetCanvas.width,
    height: targetCanvas.height,
  };
}

// Render Watermark Text onto canvas
export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  opacity = 0.35
) {
  if (!text) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = `bold ${Math.round(width * 0.05)}px sans-serif`;
  ctx.fillStyle = '#DC2626';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// Render Cutting Guide dashed lines and corner markers
export function drawCutGuides(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bleed = 8
) {
  ctx.save();
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  // Dashed rectangle
  ctx.strokeRect(x, y, w, h);

  // Corner scissor marks
  ctx.setLineDash([]);
  ctx.strokeStyle = '#64748B';
  const len = 6;
  // Top left
  ctx.beginPath();
  ctx.moveTo(x - bleed, y);
  ctx.lineTo(x - bleed + len, y);
  ctx.moveTo(x, y - bleed);
  ctx.lineTo(x, y - bleed + len);
  // Bottom right
  ctx.moveTo(x + w + bleed, y + h);
  ctx.lineTo(x + w + bleed - len, y + h);
  ctx.moveTo(x + w, y + h + bleed);
  ctx.lineTo(x + w, y + h + bleed - len);
  ctx.stroke();

  ctx.restore();
}
