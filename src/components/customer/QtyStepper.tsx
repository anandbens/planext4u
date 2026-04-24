import { useEffect, useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type CartItem } from "@/lib/api";
import { toast } from "sonner";

/**
 * Blinkit-style "ADD" → quantity stepper.
 *
 * Renders a single "ADD" button until the product is in the cart, then
 * morphs into a compact -/qty/+ stepper. Reads cart state from the local
 * cart (api.getCart) and listens for the global "cart-changed" event so
 * multiple instances stay in sync without a heavy provider.
 */
interface QtyStepperProps {
  /** Full product record — needed because api.addToCart hydrates the cart entry from it. */
  product: any;
  /** Disable interactions (e.g. out-of-stock). */
  disabled?: boolean;
  /** Notify parent on every cart mutation so the page-level cart count badge stays in sync. */
  onChange?: (newQty: number) => void;
  /** Triggered when an unauthenticated shopper taps ADD. */
  onAuthRequired?: () => void;
  /** Whether the current shopper is signed in. */
  isAuthenticated?: boolean;
  className?: string;
}

const CART_EVENT = "cart-changed";

export function QtyStepper({
  product,
  disabled,
  onChange,
  onAuthRequired,
  isAuthenticated = true,
  className,
}: QtyStepperProps) {
  const [qty, setQty] = useState(0);
  const [busy, setBusy] = useState(false);

  // Initial load + cross-component sync.
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const cart: CartItem[] = await api.getCart();
      if (cancelled) return;
      const found = cart.find((c) => c.id === product.id);
      setQty(found?.qty ?? 0);
    };
    refresh();
    window.addEventListener(CART_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(CART_EVENT, refresh);
    };
  }, [product.id]);

  const broadcast = (newQty: number) => {
    setQty(newQty);
    onChange?.(newQty);
    window.dispatchEvent(new Event(CART_EVENT));
  };

  const handleAdd = async () => {
    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const result = await api.addToCart(product, 1);
      if ((result as any).blocked) {
        toast.error((result as any).message, { duration: 4000 });
        return;
      }
      broadcast(qty + 1);
    } finally {
      setBusy(false);
    }
  };

  const handleDec = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = qty - 1;
      await api.updateCartItem(product.id, next);
      broadcast(Math.max(0, next));
    } finally {
      setBusy(false);
    }
  };

  if (qty === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleAdd}
        disabled={disabled || busy}
        className={`h-8 w-full text-xs font-bold cat-themed-text cat-themed-border bg-card hover:cat-themed-soft-bg ${className || ""}`}
      >
        {disabled ? (
          <>
            <ShoppingCart className="h-3 w-3 mr-1" /> N/A
          </>
        ) : (
          "ADD"
        )}
      </Button>
    );
  }

  return (
    <div
      className={`h-8 w-full flex items-center justify-between rounded-md cat-themed-bg px-1 ${className || ""}`}
      style={{ color: "hsl(var(--primary-foreground))" }}
    >
      <button
        onClick={handleDec}
        disabled={busy}
        aria-label="Decrease quantity"
        className="h-7 w-7 flex items-center justify-center rounded hover:bg-black/10 disabled:opacity-50"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="text-sm font-bold tabular-nums">{qty}</span>
      <button
        onClick={handleAdd}
        disabled={busy}
        aria-label="Increase quantity"
        className="h-7 w-7 flex items-center justify-center rounded hover:bg-black/10 disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
