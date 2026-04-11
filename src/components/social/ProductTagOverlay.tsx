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
          <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-full text-xs font-medium shadow-lg animate-in fade-in duration-300 max-w-[160px]">
            {tag.socio_shopping_icon ? (
              <img src={tag.socio_shopping_icon} alt="" className="h-5 w-5 rounded object-cover shrink-0" />
            ) : tag.image ? (
              <img src={tag.image} alt="" className="h-5 w-5 rounded object-cover shrink-0" />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">{tag.title}</span>
            {tag.price && <span className="text-[10px] text-white/70">₹{tag.price.toLocaleString()}</span>}
          </div>
          {/* Arrow pointer */}
          <div className="w-0 h-0 mx-auto border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-black/80" />
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
