import { ShoppingBag, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProductTag {
  id: string;
  title: string;
  price?: number;
  image?: string;
  socio_shopping_icon?: string;
  x: number; // percentage position
  y: number;
}

interface ProductTagOverlayProps {
  tags: ProductTag[];
  editable?: boolean;
  onRemove?: (id: string) => void;
  onClick?: (tag: ProductTag) => void;
}

export default function ProductTagOverlay({ tags, editable, onRemove, onClick }: ProductTagOverlayProps) {
  const navigate = useNavigate();

  if (!tags || tags.length === 0) return null;

  return (
    <>
      {tags.map(tag => (
        <div
          key={tag.id}
          className="absolute z-10 cursor-pointer"
          style={{ left: `${tag.x}%`, top: `${tag.y}%`, transform: "translate(-50%, -100%)" }}
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick(tag);
            else navigate(`/app/product/${tag.id}`);
          }}
        >
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg animate-in fade-in duration-300 max-w-[200px]">
            <div className="relative shrink-0 flex items-center justify-center">
              {/* Pulsing ring animation */}
              <span className="absolute inset-0 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] bg-primary/40" />
              <span className="absolute -inset-1 rounded-full animate-[pulse_1.5s_ease-in-out_infinite] border-2 border-primary/50" />
              {tag.socio_shopping_icon ? (
                <img src={tag.socio_shopping_icon} alt="" className="relative h-8 w-8 rounded-full object-cover ring-2 ring-primary shadow-md" />
              ) : tag.image ? (
                <img src={tag.image} alt="" className="relative h-8 w-8 rounded-full object-cover ring-2 ring-primary shadow-md" />
              ) : (
                <ShoppingBag className="relative h-5 w-5 shrink-0" />
              )}
            </div>
            <span className="truncate">{tag.title}</span>
            {tag.price && <span className="text-xs text-white/70">₹{tag.price.toLocaleString()}</span>}
          </div>
          {/* Arrow pointer */}
          <div className="w-0 h-0 mx-auto border-l-[7px] border-r-[7px] border-t-[7px] border-l-transparent border-r-transparent border-t-black/80" />
          {editable && onRemove && (
            <button
              className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-destructive rounded-full flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); onRemove(tag.id); }}
            >
              <X className="h-2.5 w-2.5 text-white" />
            </button>
          )}
        </div>
      ))}
    </>
  );
}
