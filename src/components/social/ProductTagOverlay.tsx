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
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes socio-ripple-delay {
          0% { transform: scale(1); opacity: 0; }
          30% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes socio-glow {
          0%, 100% { box-shadow: 0 0 8px 3px hsl(var(--primary) / 0.5); }
          50% { box-shadow: 0 0 20px 8px hsl(var(--primary) / 0.7); }
        }
        @keyframes socio-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
      {tags.map(tag => (
        <div
          key={tag.id}
          className="absolute z-10 cursor-pointer"
          style={{ left: `${tag.x}%`, top: `${tag.y}%`, transform: "translate(-50%, -50%)" }}
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick(tag);
            else navigate(`/app/product/${tag.id}`);
          }}
        >
          {/* Large circular icon with animations */}
          <div
            className="relative flex items-center justify-center"
            style={{ animation: "socio-bounce 2s ease-in-out infinite" }}
          >
            {/* Ripple ring 1 */}
            <span
              className="absolute rounded-full border-[3px] border-primary/60"
              style={{
                width: "calc(100% + 16px)",
                height: "calc(100% + 16px)",
                animation: "socio-ripple 2s ease-out infinite",
              }}
            />
            {/* Ripple ring 2 */}
            <span
              className="absolute rounded-full border-[3px] border-primary/40"
              style={{
                width: "calc(100% + 16px)",
                height: "calc(100% + 16px)",
                animation: "socio-ripple-delay 2s ease-out 0.7s infinite",
              }}
            />
            {/* The icon itself - large and responsive */}
            {tag.socio_shopping_icon ? (
              <img
                src={tag.socio_shopping_icon}
                alt=""
                className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full object-cover ring-[3px] ring-primary shadow-xl"
                style={{ animation: "socio-glow 2s ease-in-out infinite" }}
              />
            ) : tag.image ? (
              <img
                src={tag.image}
                alt=""
                className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full object-cover ring-[3px] ring-primary shadow-xl"
                style={{ animation: "socio-glow 2s ease-in-out infinite" }}
              />
            ) : (
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-primary/20 flex items-center justify-center ring-[3px] ring-primary shadow-xl"
                style={{ animation: "socio-glow 2s ease-in-out infinite" }}
              >
                <ShoppingBag className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-primary" />
              </div>
            )}
          </div>

          {/* Label below the icon */}
          <div className="mt-1.5 flex flex-col items-center max-w-[140px] sm:max-w-[180px] mx-auto">
            <span className="bg-black/75 backdrop-blur-sm text-white text-xs sm:text-sm font-medium px-2.5 py-1 rounded-full truncate max-w-full text-center shadow-lg">
              {tag.title}
            </span>
            {tag.price != null && (
              <span className="bg-primary/90 text-primary-foreground text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 shadow">
                ₹{tag.price.toLocaleString()}
              </span>
            )}
          </div>

          {editable && onRemove && (
            <button
              className="absolute -top-1 -right-1 h-6 w-6 bg-destructive rounded-full flex items-center justify-center shadow-lg"
              onClick={(e) => { e.stopPropagation(); onRemove(tag.id); }}
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          )}
        </div>
      ))}
    </>
  );
}
