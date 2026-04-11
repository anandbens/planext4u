import { ShoppingBag, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProductTag {
  id: string;
  title: string;
  price?: number;
  image?: string;
  socio_shopping_icon?: string;
  x: number;
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
      {/* Inline keyframes for the ripple animation */}
      <style>{`
        @keyframes socio-ripple {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes socio-ripple-delay {
          0% { transform: scale(1); opacity: 0; }
          25% { transform: scale(1); opacity: 0.5; }
          75% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes socio-glow {
          0%, 100% { box-shadow: 0 0 6px 2px hsl(var(--primary) / 0.4); }
          50% { box-shadow: 0 0 14px 6px hsl(var(--primary) / 0.6); }
        }
      `}</style>
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
          <div className="flex items-center gap-3 bg-black/80 backdrop-blur-sm text-white rounded-full font-medium shadow-lg max-w-[320px] px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3">
            {/* Icon with animated ripple rings */}
            <div className="relative shrink-0 flex items-center justify-center w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32">
              <span
                className="absolute inset-0 rounded-full border-2 sm:border-3 md:border-4 border-primary/60"
                style={{ animation: "socio-ripple 2s ease-out infinite" }}
              />
              <span
                className="absolute inset-0 rounded-full border-2 sm:border-3 md:border-4 border-primary/40"
                style={{ animation: "socio-ripple-delay 2s ease-out 0.6s infinite" }}
              />
              {tag.socio_shopping_icon ? (
                <img
                  src={tag.socio_shopping_icon}
                  alt=""
                  className="relative w-14 h-14 sm:w-20 sm:h-20 md:w-28 md:h-28 rounded-full object-cover ring-2 sm:ring-3 md:ring-4 ring-primary"
                  style={{ animation: "socio-glow 2s ease-in-out infinite" }}
                />
              ) : tag.image ? (
                <img
                  src={tag.image}
                  alt=""
                  className="relative w-14 h-14 sm:w-20 sm:h-20 md:w-28 md:h-28 rounded-full object-cover ring-2 sm:ring-3 md:ring-4 ring-primary"
                  style={{ animation: "socio-glow 2s ease-in-out infinite" }}
                />
              ) : (
                <div
                  className="relative w-14 h-14 sm:w-20 sm:h-20 md:w-28 md:h-28 rounded-full bg-primary/20 flex items-center justify-center ring-2 sm:ring-3 md:ring-4 ring-primary"
                  style={{ animation: "socio-glow 2s ease-in-out infinite" }}
                >
                  <ShoppingBag className="h-7 w-7 sm:h-10 sm:w-10 md:h-14 md:w-14" />
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm sm:text-base md:text-lg leading-tight">{tag.title}</span>
              {tag.price != null && (
                <span className="text-xs sm:text-sm text-white/70 leading-tight">₹{tag.price.toLocaleString()}</span>
              )}
            </div>
          </div>
          {/* Arrow pointer */}
          <div className="w-0 h-0 mx-auto border-l-[7px] border-r-[7px] border-t-[7px] border-l-transparent border-r-transparent border-t-black/80" />
          {editable && onRemove && (
            <button
              className="absolute -top-2 -right-2 h-5 w-5 bg-destructive rounded-full flex items-center justify-center shadow"
              onClick={(e) => { e.stopPropagation(); onRemove(tag.id); }}
            >
              <X className="h-3 w-3 text-white" />
            </button>
          )}
        </div>
      ))}
    </>
  );
}
