import { useState, useRef, useCallback, useEffect } from "react";
import { X, Type, Smile, Crop, Check, RotateCcw, Trash2, Move, Bold, Italic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

// Common emojis for social media
const EMOJI_SETS = {
  "Smileys": ["😀", "😂", "🥰", "😍", "🤩", "😎", "🥳", "😇", "🤗", "🤔", "😏", "😢", "😤", "🤯", "🥺", "😴"],
  "Gestures": ["👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "💪", "🫶", "❤️", "🔥", "⭐", "✨", "💯", "🎉", "🎊"],
  "Objects": ["📸", "🎵", "🎬", "🏆", "👑", "💎", "🎯", "🚀", "💡", "🎁", "🛍️", "🍕", "☕", "🌈", "🌟", "💫"],
};

interface TextOverlay {
  id: string;
  text: string;
  x: number; // percentage
  y: number; // percentage
  fontSize: number;
  color: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
}

interface EmojiOverlay {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
}

interface CropState {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedBlob: Blob) => void;
  onCancel: () => void;
}

const TEXT_COLORS = ["#ffffff", "#000000", "#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#007aff", "#af52de", "#ff2d55"];

export default function ImageEditor({ imageUrl, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"crop" | "text" | "emoji" | null>(null);
  const [texts, setTexts] = useState<TextOverlay[]>([]);
  const [emojis, setEmojis] = useState<EmojiOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingType, setDraggingType] = useState<"text" | "emoji" | null>(null);
  const [newText, setNewText] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(24);
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<keyof typeof EMOJI_SETS>("Smileys");
  const [isCropping, setIsCropping] = useState(false);
  const [cropBox, setCropBox] = useState<CropState>({ x: 10, y: 10, width: 80, height: 80 });
  const [cropAspect, setCropAspect] = useState<number | null>(null); // null = free
  const [cropDrag, setCropDrag] = useState<{ mode: "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"; startX: number; startY: number; box: CropState } | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; setImgLoaded(true); };
    img.src = imageUrl;
  }, [imageUrl]);

  const addText = () => {
    if (!newText.trim()) return;
    const t: TextOverlay = {
      id: crypto.randomUUID(),
      text: newText,
      x: 50, y: 50,
      fontSize: textSize,
      color: textColor,
      fontWeight: textBold ? "bold" : "normal",
      fontStyle: textItalic ? "italic" : "normal",
    };
    setTexts(prev => [...prev, t]);
    setNewText("");
    setSelectedTextId(t.id);
  };

  const addEmoji = (emoji: string) => {
    const e: EmojiOverlay = {
      id: crypto.randomUUID(),
      emoji,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      size: 40,
    };
    setEmojis(prev => [...prev, e]);
  };

  const removeText = (id: string) => {
    setTexts(prev => prev.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const removeEmoji = (id: string) => {
    setEmojis(prev => prev.filter(e => e.id !== id));
  };

  // Drag handling
  const handlePointerDown = (id: string, type: "text" | "emoji") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(id);
    setDraggingType(type);
    if (type === "text") setSelectedTextId(id);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (cropDrag) {
      const dx = ((e.clientX - cropDrag.startX) / rect.width) * 100;
      const dy = ((e.clientY - cropDrag.startY) / rect.height) * 100;
      let { x, y, width, height } = cropDrag.box;
      const minSize = 5;

      if (cropDrag.mode === "move") {
        x = Math.max(0, Math.min(100 - width, x + dx));
        y = Math.max(0, Math.min(100 - height, y + dy));
      } else {
        const m = cropDrag.mode;
        if (m.includes("e")) width = Math.max(minSize, Math.min(100 - x, width + dx));
        if (m.includes("w")) {
          const nw = Math.max(minSize, width - dx);
          const nx = Math.max(0, Math.min(x + width - minSize, x + dx));
          width = x + width - nx;
          x = nx;
        }
        if (m.includes("s")) height = Math.max(minSize, Math.min(100 - y, height + dy));
        if (m.includes("n")) {
          const nh = Math.max(minSize, height - dy);
          const ny = Math.max(0, Math.min(y + height - minSize, y + dy));
          height = y + height - ny;
          y = ny;
        }
        // Apply aspect ratio constraint if locked
        if (cropAspect) {
          // Convert aspect (in image-pixel space approximation): use container ratio so percent-based works visually
          const containerAspect = rect.width / rect.height;
          // ratio of width% to height% that yields cropAspect: (width% * cw) / (height% * ch) = cropAspect
          // => height% = width% * (cw/ch) / cropAspect
          const ratioPct = containerAspect / cropAspect;
          if (m === "e" || m === "w") {
            height = width / ratioPct;
            if (y + height > 100) height = 100 - y;
            if (m.includes("n")) y = cropDrag.box.y + cropDrag.box.height - height;
          } else if (m === "n" || m === "s") {
            width = height * ratioPct;
            if (x + width > 100) width = 100 - x;
            if (m.includes("w")) x = cropDrag.box.x + cropDrag.box.width - width;
          } else {
            // corner
            height = width / ratioPct;
            if (m.includes("n")) y = cropDrag.box.y + cropDrag.box.height - height;
          }
        }
      }
      setCropBox({ x, y, width, height });
      return;
    }

    if (!draggingId) return;
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
    if (draggingType === "text") {
      setTexts(prev => prev.map(t => t.id === draggingId ? { ...t, x, y } : t));
    } else {
      setEmojis(prev => prev.map(em => em.id === draggingId ? { ...em, x, y } : em));
    }
  }, [draggingId, draggingType, cropDrag, cropAspect]);

  const handlePointerUp = useCallback(() => {
    setDraggingId(null);
    setDraggingType(null);
    setCropDrag(null);
  }, []);

  const startCropDrag = (mode: "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCropDrag({ mode, startX: e.clientX, startY: e.clientY, box: cropBox });
  };

  // Render to canvas and export
  const handleSave = async () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const canvas = document.createElement("canvas");
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

    if (isCropping) {
      sx = (cropBox.x / 100) * img.naturalWidth;
      sy = (cropBox.y / 100) * img.naturalHeight;
      sw = (cropBox.width / 100) * img.naturalWidth;
      sh = (cropBox.height / 100) * img.naturalHeight;
    }

    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    // Draw text overlays
    for (const t of texts) {
      const tx = ((t.x - (isCropping ? cropBox.x : 0)) / (isCropping ? cropBox.width : 100)) * sw;
      const ty = ((t.y - (isCropping ? cropBox.y : 0)) / (isCropping ? cropBox.height : 100)) * sh;
      const scaledSize = (t.fontSize / 100) * sh * 0.8;
      ctx.font = `${t.fontStyle} ${t.fontWeight} ${scaledSize}px sans-serif`;
      ctx.fillStyle = t.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Shadow for readability
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = scaledSize * 0.15;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(t.text, tx, ty);
      ctx.shadowColor = "transparent";
    }

    // Draw emoji overlays
    for (const em of emojis) {
      const ex = ((em.x - (isCropping ? cropBox.x : 0)) / (isCropping ? cropBox.width : 100)) * sw;
      const ey = ((em.y - (isCropping ? cropBox.y : 0)) / (isCropping ? cropBox.height : 100)) * sh;
      const scaledSize = (em.size / 100) * sh * 0.8;
      ctx.font = `${scaledSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(em.emoji, ex, ey);
    }

    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/webp", 0.9);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-black/80" style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}>
        <button onClick={onCancel}><X className="h-6 w-6 text-white" /></button>
        <span className="text-white font-semibold">Edit Image</span>
        <Button size="sm" onClick={handleSave} className="gap-1"><Check className="h-4 w-4" /> Done</Button>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {imgLoaded && (
          <img loading="lazy" decoding="async"
            src={imageUrl}
            alt=""
            className="max-w-full max-h-full object-contain"
            style={isCropping ? { clipPath: `inset(${cropBox.y}% ${100 - cropBox.x - cropBox.width}% ${100 - cropBox.y - cropBox.height}% ${cropBox.x}%)` } : undefined}
          />
        )}

        {/* Crop overlay */}
        {activeTab === "crop" && (
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-black/50 pointer-events-none" style={{
              clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${cropBox.x}% ${cropBox.y}%, ${cropBox.x}% ${cropBox.y + cropBox.height}%, ${cropBox.x + cropBox.width}% ${cropBox.y + cropBox.height}%, ${cropBox.x + cropBox.width}% ${cropBox.y}%, ${cropBox.x}% ${cropBox.y}%)`
            }} />
            <div
              className="absolute border-2 border-white cursor-move"
              style={{
                left: `${cropBox.x}%`, top: `${cropBox.y}%`,
                width: `${cropBox.width}%`, height: `${cropBox.height}%`,
                touchAction: "none",
              }}
              onPointerDown={startCropDrag("move")}
            >
              <div className="absolute left-0 right-0 -top-1 h-2 cursor-n-resize" onPointerDown={startCropDrag("n")} style={{ touchAction: "none" }} />
              <div className="absolute left-0 right-0 -bottom-1 h-2 cursor-s-resize" onPointerDown={startCropDrag("s")} style={{ touchAction: "none" }} />
              <div className="absolute top-0 bottom-0 -left-1 w-2 cursor-w-resize" onPointerDown={startCropDrag("w")} style={{ touchAction: "none" }} />
              <div className="absolute top-0 bottom-0 -right-1 w-2 cursor-e-resize" onPointerDown={startCropDrag("e")} style={{ touchAction: "none" }} />
              <div className="absolute h-3 w-3 bg-white border border-black/40 -top-1.5 -left-1.5 cursor-nw-resize" onPointerDown={startCropDrag("nw")} style={{ touchAction: "none" }} />
              <div className="absolute h-3 w-3 bg-white border border-black/40 -top-1.5 -right-1.5 cursor-ne-resize" onPointerDown={startCropDrag("ne")} style={{ touchAction: "none" }} />
              <div className="absolute h-3 w-3 bg-white border border-black/40 -bottom-1.5 -left-1.5 cursor-sw-resize" onPointerDown={startCropDrag("sw")} style={{ touchAction: "none" }} />
              <div className="absolute h-3 w-3 bg-white border border-black/40 -bottom-1.5 -right-1.5 cursor-se-resize" onPointerDown={startCropDrag("se")} style={{ touchAction: "none" }} />
            </div>
          </div>
        )}

        {/* Text overlays */}
        {texts.map(t => (
          <div
            key={t.id}
            className={`absolute cursor-grab select-none ${selectedTextId === t.id ? "ring-2 ring-primary ring-offset-1" : ""}`}
            style={{
              left: `${t.x}%`, top: `${t.y}%`,
              transform: "translate(-50%, -50%)",
              fontSize: `${t.fontSize}px`,
              color: t.color,
              fontWeight: t.fontWeight,
              fontStyle: t.fontStyle,
              textShadow: "1px 1px 3px rgba(0,0,0,0.7)",
              touchAction: "none",
            }}
            onPointerDown={handlePointerDown(t.id, "text")}
          >
            {t.text}
            {selectedTextId === t.id && (
              <button
                className="absolute -top-3 -right-3 h-5 w-5 bg-destructive rounded-full flex items-center justify-center"
                onClick={(e) => { e.stopPropagation(); removeText(t.id); }}
              >
                <X className="h-3 w-3 text-white" />
              </button>
            )}
          </div>
        ))}

        {/* Emoji overlays */}
        {emojis.map(em => (
          <div
            key={em.id}
            className="absolute cursor-grab select-none group"
            style={{
              left: `${em.x}%`, top: `${em.y}%`,
              transform: "translate(-50%, -50%)",
              fontSize: `${em.size}px`,
              touchAction: "none",
            }}
            onPointerDown={handlePointerDown(em.id, "emoji")}
          >
            {em.emoji}
            <button
              className="absolute -top-2 -right-2 h-4 w-4 bg-destructive rounded-full items-center justify-center hidden group-hover:flex"
              onClick={(e) => { e.stopPropagation(); removeEmoji(em.id); }}
            >
              <X className="h-2.5 w-2.5 text-white" />
            </button>
          </div>
        ))}
      </div>

      {/* Tool tabs */}
      <div className="bg-black/90 border-t border-white/10" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}>
        <div className="flex items-center justify-around py-2">
          <button
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg ${activeTab === "crop" ? "bg-white/20 text-white" : "text-white/60"}`}
            onClick={() => { setActiveTab(activeTab === "crop" ? null : "crop"); setIsCropping(activeTab !== "crop"); }}
          >
            <Crop className="h-5 w-5" />
            <span className="text-[10px]">Crop</span>
          </button>
          <button
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg ${activeTab === "text" ? "bg-white/20 text-white" : "text-white/60"}`}
            onClick={() => setActiveTab(activeTab === "text" ? null : "text")}
          >
            <Type className="h-5 w-5" />
            <span className="text-[10px]">Text</span>
          </button>
          <button
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg ${activeTab === "emoji" ? "bg-white/20 text-white" : "text-white/60"}`}
            onClick={() => setActiveTab(activeTab === "emoji" ? null : "emoji")}
          >
            <Smile className="h-5 w-5" />
            <span className="text-[10px]">Emoji</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-white/60" onClick={() => { setTexts([]); setEmojis([]); setIsCropping(false); setCropBox({ x: 10, y: 10, width: 80, height: 80 }); setActiveTab(null); }}>
            <RotateCcw className="h-5 w-5" />
            <span className="text-[10px]">Reset</span>
          </button>
        </div>

        {/* Crop controls */}
        {activeTab === "crop" && (
          <div className="px-4 pb-4 space-y-3">
            <div className="flex gap-2">
              {[
                { label: "Free", w: 80, h: 80, aspect: null as number | null },
                { label: "1:1", w: 60, h: 60, aspect: 1 },
                { label: "4:5", w: 56, h: 70, aspect: 4 / 5 },
                { label: "16:9", w: 80, h: 45, aspect: 16 / 9 },
              ].map(preset => {
                const active = cropAspect === preset.aspect;
                return (
                  <button
                    key={preset.label}
                    className={`text-xs px-3 py-1.5 rounded-full border ${active ? "bg-white text-black border-white" : "text-white/70 border-white/20 hover:bg-white/10"}`}
                    onClick={() => {
                      setCropAspect(preset.aspect);
                      setCropBox({ x: (100 - preset.w) / 2, y: (100 - preset.h) / 2, width: preset.w, height: preset.h });
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Text controls */}
        {activeTab === "text" && (
          <div className="px-4 pb-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Type text..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-9 flex-1"
                onKeyDown={(e) => e.key === "Enter" && addText()}
              />
              <Button size="sm" onClick={addText} disabled={!newText.trim()} className="h-9">Add</Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {TEXT_COLORS.map(c => (
                  <button key={c} className={`h-6 w-6 rounded-full border-2 ${textColor === c ? "border-white scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} onClick={() => setTextColor(c)} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-xs w-10">Size</span>
              <Slider value={[textSize]} onValueChange={([v]) => setTextSize(v)} min={12} max={64} step={2} className="flex-1" />
              <span className="text-white text-xs w-6">{textSize}</span>
            </div>
            <div className="flex gap-2">
              <button className={`p-1.5 rounded ${textBold ? "bg-white/20" : ""}`} onClick={() => setTextBold(!textBold)}><Bold className="h-4 w-4 text-white" /></button>
              <button className={`p-1.5 rounded ${textItalic ? "bg-white/20" : ""}`} onClick={() => setTextItalic(!textItalic)}><Italic className="h-4 w-4 text-white" /></button>
            </div>
          </div>
        )}

        {/* Emoji picker */}
        {activeTab === "emoji" && (
          <div className="px-4 pb-4 space-y-3">
            <div className="flex gap-2">
              {Object.keys(EMOJI_SETS).map(cat => (
                <button key={cat}
                  className={`text-xs px-3 py-1 rounded-full ${emojiCategory === cat ? "bg-white/20 text-white" : "text-white/60 border border-white/20"}`}
                  onClick={() => setEmojiCategory(cat as keyof typeof EMOJI_SETS)}
                >{cat}</button>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_SETS[emojiCategory].map(emoji => (
                <button key={emoji} className="text-2xl hover:scale-125 transition-transform" onClick={() => addEmoji(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
