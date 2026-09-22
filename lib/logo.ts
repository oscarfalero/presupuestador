import type { LogoExt } from "./company";

const MAX_LOGO_SIDE = 400;

/**
 * Downscales an uploaded logo client-side so the persisted profile stays
 * small. PNG input keeps transparency (PNG out); anything else becomes JPEG.
 */
export function processLogoFile(file: File): Promise<{ dataUrl: string; ext: LogoExt }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const scale = Math.min(1, MAX_LOGO_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const keepPng = file.type === "image/png";
        resolve({
          dataUrl: canvas.toDataURL(keepPng ? "image/png" : "image/jpeg", 0.85),
          ext: keepPng ? "png" : "jpeg",
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error("logo processing failed"));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    img.src = url;
  });
}
