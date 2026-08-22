import * as pdfjsLib from 'pdfjs-dist';

// Set up worker source
try {
  // Use cloudflare CDN or unpkg with dynamic version fallback
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF.js worker setup warning:', e);
}

/**
 * Converts a PDF File or Blob to an array of high-resolution Data URLs (one per page).
 * Scale 2.5 or 3.0 gives crisp 300 DPI quality for NID cards.
 */
export async function convertPdfToImages(fileOrBlob: Blob, scale = 2.5): Promise<string[]> {
  try {
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/cmaps/`,
      cMapPacked: true,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const pageImages: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        // Fill white background before rendering PDF
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: ctx,
          canvas: canvas,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
        pageImages.push(canvas.toDataURL('image/png'));
      }
    }

    return pageImages;
  } catch (error) {
    console.error('Error converting PDF to image:', error);
    throw new Error('PDF ফাইলটি প্রসেস করা যায়নি। দয়া করে সঠিক PDF ফাইল আপলোড করুন।');
  }
}

/**
 * Checks if a file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
