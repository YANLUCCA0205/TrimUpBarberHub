import { useState, useRef, useCallback } from "react";
import db from "../lib/db";

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Magic bytes for image formats
const MAGIC_BYTES = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  // WebP: starts with RIFF....WEBP
};

function checkMagicBytes(bytes) {
  const arr = new Uint8Array(bytes);
  // Check JPEG
  if (arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) return true;
  // Check PNG
  if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47) return true;
  // Check WebP (RIFF....WEBP)
  if (arr.length >= 12) {
    const riff = arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46;
    const webp = arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50;
    if (riff && webp) return true;
  }
  return false;
}

function readFileBytes(file, numBytes) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsArrayBuffer(file.slice(0, numBytes));
  });
}

function validateImageLoad(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(true);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });
}

export default function ImageUpload({
  value,
  onChange,
  onRemove,
  maxSizeMB = 5,
  label = "Imagem",
  aspect = "square",
  className = "",
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  const [showCropModal, setShowCropModal] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [rawFile, setRawFile] = useState(null);

  const frameWidth = aspect === "banner" ? 360 : 250;
  const frameHeight = aspect === "banner" ? 120 : 250;

  const aspectClass = aspect === "banner"
    ? "aspect-[3/1] rounded-xl"
    : "aspect-square rounded-xl w-40";

  const validateFile = useCallback(async (file) => {
    setError("");

    // 1. Extension check
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Extensão não permitida. Use: ${ALLOWED_EXTENSIONS.join(", ")}`);
      return false;
    }

    // 2. MIME type check
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError(`Tipo de arquivo inválido: ${file.type}`);
      return false;
    }

    // 3. File size check
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Arquivo muito grande. Máximo: ${maxSizeMB}MB`);
      return false;
    }

    // 4. Magic bytes validation
    try {
      const bytes = await readFileBytes(file, 12);
      if (!checkMagicBytes(bytes)) {
        setError("O arquivo não parece ser uma imagem válida.");
        return false;
      }
    } catch {
      setError("Erro ao validar arquivo.");
      return false;
    }

    // 5. Image load validation
    const isImage = await validateImageLoad(file);
    if (!isImage) {
      setError("Não foi possível carregar a imagem. Arquivo corrompido?");
      return false;
    }

    return true;
  }, [maxSizeMB]);

  const handleUpload = useCallback(async (file) => {
    if (!file) return;

    const valid = await validateFile(file);
    if (!valid) return;

    setRawFile(file);
    const localUrl = URL.createObjectURL(file);
    setCropSrc(localUrl);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setShowCropModal(true);
    setError("");
  }, [validateFile]);

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setImgSize({ w: naturalWidth, h: naturalHeight });
    
    // Centered offset
    const baseScale = Math.max(frameWidth / naturalWidth, frameHeight / naturalHeight);
    const wActual = naturalWidth * baseScale;
    const hActual = naturalHeight * baseScale;
    
    setOffset({
      x: (frameWidth - wActual) / 2,
      y: (frameHeight - hActual) / 2
    });
  };

  const getDisplaySize = () => {
    if (!imgSize.w || !imgSize.h) return { w: 0, h: 0 };
    const baseScale = Math.max(frameWidth / imgSize.w, frameHeight / imgSize.h);
    return {
      w: imgSize.w * baseScale * zoom,
      h: imgSize.h * baseScale * zoom
    };
  };

  const displaySize = getDisplaySize();

  const clampOffsets = (x, y, currentZoom) => {
    if (!imgSize.w || !imgSize.h) return { x: 0, y: 0 };
    const baseScale = Math.max(frameWidth / imgSize.w, frameHeight / imgSize.h);
    const wActual = imgSize.w * baseScale * currentZoom;
    const hActual = imgSize.h * baseScale * currentZoom;
    
    const minX = frameWidth - wActual;
    const minY = frameHeight - hActual;
    
    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y))
    };
  };

  const handleStart = (clientX, clientY) => {
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMove = (clientX, clientY) => {
    if (!dragStart) return;
    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;
    setOffset(clampOffsets(newX, newY, zoom));
  };

  const handleEnd = () => {
    setDragStart(null);
  };

  const handleMouseDown = (e) => {
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  const handleZoomChange = (newZoom) => {
    setZoom(newZoom);
    setOffset(prev => clampOffsets(prev.x, prev.y, newZoom));
  };

  const confirmCrop = () => {
    if (!rawFile || !cropSrc || !imgSize.w) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const targetWidth = aspect === "banner" ? 1200 : 500;
      const targetHeight = aspect === "banner" ? 400 : 500;
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      
      const baseScale = Math.max(frameWidth / imgSize.w, frameHeight / imgSize.h);
      const scale = baseScale * zoom;
      
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const sw = frameWidth / scale;
      const sh = frameHeight / scale;
      
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError("Erro ao processar imagem.");
          setShowCropModal(false);
          return;
        }
        
        const croppedFile = new File([blob], rawFile.name, { type: "image/jpeg" });
        setShowCropModal(false);
        setUploading(true);
        setError("");
        
        try {
          const result = await db.integrations.Core.UploadFile(croppedFile);
          if (result?.file_url) {
            onChange?.(result.file_url);
            setPreview(null);
          } else {
            setError("Erro ao obter URL do arquivo.");
            setPreview(null);
          }
        } catch (err) {
          console.error("Upload error:", err);
          setError(`Erro no upload: ${err?.message || "Tente novamente."}`);
          setPreview(null);
        } finally {
          setUploading(false);
        }
      }, "image/jpeg", 0.9);
    };
    img.src = cropSrc;
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  }, [handleUpload]);

  const handleRemove = useCallback((e) => {
    e.stopPropagation();
    setPreview(null);
    setError("");
    onRemove?.();
  }, [onRemove]);

  const displayUrl = preview || value;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-zinc-400 block">{label}</label>
      )}

      {displayUrl ? (
        <div className="relative group inline-block">
          <div className={`overflow-hidden border-2 border-zinc-700/50 bg-zinc-900 ${aspectClass}`}>
            <img
              src={displayUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 bg-zinc-900/80 flex flex-col items-center justify-center backdrop-blur-sm rounded-xl">
                <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-2" />
                <span className="text-xs text-amber-400 font-medium">Enviando...</span>
              </div>
            )}
          </div>
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              title="Remover imagem"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            relative cursor-pointer transition-all duration-200
            border-2 border-dashed rounded-xl
            flex flex-col items-center justify-center gap-2 py-8 px-4
            ${dragOver
              ? "border-amber-500 bg-amber-500/10 scale-[1.01]"
              : "border-zinc-700 hover:border-amber-500/50 bg-zinc-900/50 hover:bg-zinc-800/50"
            }
            ${aspect === "banner" ? "min-h-[120px]" : "min-h-[160px] max-w-[220px]"}
          `}
        >
          {uploading ? (
            <>
              <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
              <span className="text-xs text-amber-400 font-medium">Enviando...</span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-xs text-zinc-300 font-medium">
                  Arraste ou <span className="text-amber-500 underline underline-offset-2">clique para enviar</span>
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  JPG, PNG ou WebP • até {maxSizeMB}MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {showCropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full flex flex-col items-center gap-5 shadow-2xl">
            <div className="text-center w-full">
              <h4 className="text-sm font-semibold text-white">Ajustar Imagem</h4>
              <p className="text-[10px] text-zinc-400 mt-1">Arrastar para reposicionar • Zoom para ampliar</p>
            </div>

            <div 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative overflow-hidden cursor-move bg-zinc-950 border border-zinc-800/80 rounded-xl"
              style={{ width: `${frameWidth}px`, height: `${frameHeight}px` }}
            >
              <img
                src={cropSrc}
                alt="Crop Preview"
                draggable={false}
                onLoad={handleImageLoad}
                className="absolute max-w-none origin-top-left select-none pointer-events-none"
                style={{
                  width: `${displaySize.w}px`,
                  height: `${displaySize.h}px`,
                  transform: `translate(${offset.x}px, ${offset.y}px)`
                }}
              />
              <div 
                className={`absolute inset-0 border-2 border-amber-500 pointer-events-none ${
                  aspect === "square" ? "rounded-full shadow-[0_0_0_9999px_rgba(9,9,11,0.6)]" : "shadow-[0_0_0_9999px_rgba(9,9,11,0.6)]"
                }`} 
              />
            </div>

            <div className="w-full space-y-1.5 px-1">
              <div className="flex justify-between text-[11px] text-zinc-400 font-medium">
                <span>Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={e => handleZoomChange(parseFloat(e.target.value))}
                className="w-full accent-amber-500 bg-zinc-800 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCropModal(false);
                  setRawFile(null);
                  setCropSrc(null);
                }}
                className="h-9 rounded-xl border border-zinc-700 text-zinc-300 text-xs font-medium hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmCrop}
                className="h-9 rounded-xl bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 transition-colors"
              >
                Cortar e Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
