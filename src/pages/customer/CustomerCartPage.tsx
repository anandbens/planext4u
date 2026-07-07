import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Minus, Plus, Trash2, Tag, ShoppingBag, ChevronLeft, ChevronDown, ChevronRight, Truck, Clock, Save, Heart, CheckCircle, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { toast } from "sonner";
import { api, CartItem } from "@/lib/api";
import { format, addDays, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, isSameMonth, isBefore, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { resolveCommissionCascade } from "@/lib/commission-cascade";
import { checkCartStock } from "@/lib/stock-check";
import { getCustomerAddressOwnerContext, requireCustomerAddressOwnerContext } from "@/lib/customer-address-auth";
import { useCurrency } from "@/lib/country-context";
import { CartRuleBreakup, type AppliedCartRule } from "@/components/cart/CartRuleBreakup";
import { AvailableCouponsPanel } from "@/components/customer/AvailableCouponsPanel";
import {
  recommendCouponsForCart,
  logRecommendationEvent,
  type CouponRecommendation,
} from "@/lib/coupons/recommendation";

const TIME_SLOTS = [
  { id: "morning", label: "Morning 9 - 11 AM" },
  { id: "afternoon", label: "Afternoon 12 - 3 PM" },
  { id: "evening", label: "Evening 4-6 PM" },
];

interface SavedAddress {
  id: string; label: string; type: string; address_line: string; city: string; pincode: string; is_default: boolean;
}

export default function CustomerCartPage() {
  const navigate = useNavigate();
  const { format: fmt, symbol: curSym } = useCurrency();
  const { customerUser } = useAuth();
  const customerId = customerUser?.customer_id || customerUser?.id || "";
  const [cart, setCart] = useState<CartItem[]>([]);
  const [savedForLater, setSavedForLater] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponInfo, setCouponInfo] = useState<{ campaign_id: string; discount_amount: number; product_id: string; name: string; code: string } | null>(null);
  const [pointsUsed, setPointsUsed] = useState(0);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [walletPoints, setWalletPoints] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState<"anytime" | "scheduled">("anytime");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [platformFeeValue, setPlatformFeeValue] = useState(10);
  const [platformFeeGst, setPlatformFeeGst] = useState(18);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [addressForm, setAddressForm] = useState({ label: "Home", type: "home", address_line: "", city: "", pincode: "" });
  const [referralCountThisMonth, setReferralCountThisMonth] = useState(0);
  const [itemRedemptionMap, setItemRedemptionMap] = useState<Record<string, { maxRedemption: number; redemptionSource: string }>>({});
  const [appliedCartRules, setAppliedCartRules] = useState<AppliedCartRule[]>([]);
  const [cartRuleDiscount, setCartRuleDiscount] = useState(0);
  const [recoCoupons, setRecoCoupons] = useState<CouponRecommendation[]>([]);
  const [bestCampaignId, setBestCampaignId] = useState<string | null>(null);
  const [autoApplyCampaignId, setAutoApplyCampaignId] = useState<string | null>(null);
  const [recoLoading, setRecoLoading] = useState(false);


  useEffect(() => {
    Promise.all([api.getCart(), api.getCustomerProfile(customerId), loadAddresses(), loadPlatformFees()]).then(async ([cartItems, profile]) => {
      setCart(cartItems);
      setWalletPoints(profile?.wallet_points || 0);
      try {
        const saved = JSON.parse(localStorage.getItem('app_db_saved_for_later') || '[]');
        setSavedForLater(saved);
      } catch {}

      // Resolve cascade max redemption for each cart item
      if (cartItems.length > 0) {
        const map: Record<string, { maxRedemption: number; redemptionSource: string }> = {};
        // Fetch product-level overrides
        const productIds = cartItems.map((i: any) => i.id);
        const { data: products } = await supabase.from('products').select('id, vendor_id, max_redemption_percentage, commission_override').in('id', productIds);
        for (const item of cartItems) {
          const product = (products || []).find((p: any) => p.id === item.id);
          if (product) {
            const cascade = await resolveCommissionCascade(
              item.vendor_id,
              product.commission_override,
              product.max_redemption_percentage,
            );
            map[item.id] = { maxRedemption: cascade.maxRedemption, redemptionSource: cascade.redemptionSource };
          } else {
            map[item.id] = { maxRedemption: 3, redemptionSource: 'plan' };
          }
        }
        setItemRedemptionMap(map);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [customerId]);

  const loadPlatformFees = async () => {
    const { data } = await supabase.from('platform_variables').select('key, value').in('key', ['platform_fee', 'platform_fee_gst_percent']);
    if (data) {
      data.forEach((v: any) => {
        if (v.key === 'platform_fee') {
          const n = Number(v.value);
          setPlatformFeeValue(Number.isFinite(n) ? n : 10);
        }
        if (v.key === 'platform_fee_gst_percent') {
          const n = Number(v.value);
          setPlatformFeeGst(Number.isFinite(n) ? n : 18);
        }
      });
    }
  };

  const loadAddresses = async () => {
    const { ownerIds } = await getCustomerAddressOwnerContext(customerUser);
    if (!ownerIds.length) return;

    const { data } = await supabase.from('customer_addresses').select('*').in('customer_id', ownerIds).order('is_default', { ascending: false });
    if (data) {
      setAddresses(data as SavedAddress[]);
      const def = (data as SavedAddress[]).find(a => a.is_default);
      if (def) setSelectedAddressId(def.id);
    }
  };

  const saveAddress = async () => {
    if (!addressForm.address_line.trim() || !addressForm.city.trim() || !addressForm.pincode.trim()) {
      toast.error("Please fill all address fields"); return;
    }
    if (editingAddress) {
      const { error } = await supabase.from('customer_addresses').update({
        label: addressForm.label, type: addressForm.type,
        address_line: addressForm.address_line, city: addressForm.city, pincode: addressForm.pincode,
      }).eq('id', editingAddress.id);
      if (error) throw error;
      toast.success("Address updated!");
    } else {
      const { preferredId } = await requireCustomerAddressOwnerContext(customerUser);
      const isFirst = addresses.length === 0;
      const { error } = await supabase.from('customer_addresses').insert({
        customer_id: preferredId, label: addressForm.label, type: addressForm.type,
        address_line: addressForm.address_line, city: addressForm.city, pincode: addressForm.pincode, is_default: isFirst,
      });
      if (error) throw error;
      toast.success("Address added!");
    }
    setShowAddressDialog(false);
    setEditingAddress(null);
    setAddressForm({ label: "Home", type: "home", address_line: "", city: "", pincode: "" });
    await loadAddresses();
  };

  const editAddress = (addr: SavedAddress) => {
    setEditingAddress(addr);
    setAddressForm({ label: addr.label, type: addr.type, address_line: addr.address_line, city: addr.city, pincode: addr.pincode });
    setShowAddressDialog(true);
  };

  const updateQty = async (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(1, item.qty + delta);
    await api.updateCartItem(id, newQty);
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: newQty } : i));
  };

  const removeItem = async (id: string) => {
    await api.removeFromCart(id);
    setCart(prev => prev.filter(i => i.id !== id));
    toast.info("Item removed from cart");
  };

  const saveForLater = (item: CartItem) => {
    // Move to wishlist (persistent)
    try {
      let wl = JSON.parse(localStorage.getItem('app_db_wishlist') || '[]') as string[];
      if (!wl.includes(item.id)) wl.push(item.id);
      localStorage.setItem('app_db_wishlist', JSON.stringify(wl));
      window.dispatchEvent(new Event('wishlist-changed'));
    } catch {}
    // Also save in saved-for-later list with full data
    const updated = [...savedForLater, item];
    setSavedForLater(updated);
    localStorage.setItem('app_db_saved_for_later', JSON.stringify(updated));
    setCart(prev => prev.filter(i => i.id !== item.id));
    api.removeFromCart(item.id);
    toast.success("Saved for later & added to wishlist ❤️");
  };

  const moveToCart = async (item: CartItem) => {
    await api.addToCart({ id: item.id, title: item.title, price: item.price, vendor_id: item.vendor_id || '', vendor_name: item.vendor, emoji: item.emoji, image: item.image, tax: item.tax, discount: item.discount, max_points_redeemable: item.maxPoints } as any, 1);
    setCart(prev => [...prev, { ...item, qty: 1 }]);
    const updated = savedForLater.filter(i => i.id !== item.id);
    setSavedForLater(updated);
    localStorage.setItem('app_db_saved_for_later', JSON.stringify(updated));
    toast.success("Moved to cart");
  };

  const mrpTotal = cart.reduce((sum, item) => sum + (item.price + item.discount) * item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalDiscount = mrpTotal - subtotal;

  // Calculate per-product max redeemable points using cascade logic (% of selling price)
  const perItemMaxPoints = cart.map(item => {
    const sellingPrice = item.price * item.qty;
    const redemptionPct = itemRedemptionMap[item.id]?.maxRedemption ?? 3;
    const maxFromProduct = Math.floor(sellingPrice * redemptionPct / 100);
    return {
      id: item.id,
      title: item.title,
      maxRedeemable: maxFromProduct,
      redemptionPct,
      source: itemRedemptionMap[item.id]?.redemptionSource || 'plan',
    };
  });

  // Check if 4+ referrals completed this month → zero platform fee
  useEffect(() => {
    if (!customerId) return;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    supabase.from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', customerId)
      .eq('first_order_placed', true)
      .gte('created_at', startOfMonth.toISOString())
      .then(({ count }) => setReferralCountThisMonth(count || 0));
  }, [customerId]);

  const platformFee = referralCountThisMonth >= 4 ? 0 : platformFeeValue;
  const gstOnPlatformFee = Math.round(platformFee * platformFeeGst / 100 * 100) / 100;
  const tax = cart.reduce((sum, item) => sum + item.tax * item.qty, 0);
  const discount = couponInfo?.discount_amount || 0;
  // Block wallet redemption on the coupon-tagged product's max
  const maxPoints = couponInfo
    ? Math.min(walletPoints, perItemMaxPoints.filter(i => i.id !== couponInfo.product_id).reduce((s, i) => s + i.maxRedeemable, 0))
    : Math.min(walletPoints, perItemMaxPoints.reduce((s, i) => s + i.maxRedeemable, 0));
  const total = subtotal + platformFee + gstOnPlatformFee - discount - cartRuleDiscount - pointsUsed;
  const savings = totalDiscount + discount + cartRuleDiscount + pointsUsed;

  // Evaluate active cart rules whenever subtotal/customer changes
  useEffect(() => {
    if (!customerId || subtotal <= 0 || cart.length === 0) {
      setAppliedCartRules([]);
      setCartRuleDiscount(0);
      return;
    }
    const vendorIds = Array.from(new Set(cart.map((c: any) => c.vendor_id).filter(Boolean)));
    (supabase.rpc as any)("evaluate_cart_rules", {
      _customer_id: customerId,
      _cart_total: subtotal,
      _vendor_ids: vendorIds,
      _module: "ecommerce",
    })
      .then(({ data, error }: any) => {
        if (error || !data) {
          setAppliedCartRules([]);
          setCartRuleDiscount(0);
          return;
        }
        const rules: AppliedCartRule[] = Array.isArray(data?.applied_rules)
          ? data.applied_rules
          : [];
        setAppliedCartRules(rules);
        setCartRuleDiscount(Number(data?.total_discount || 0));
      })
      .catch(() => {
        setAppliedCartRules([]);
        setCartRuleDiscount(0);
      });
  }, [customerId, subtotal, cart]);

  // ── Intelligent Coupon Recommendation Engine ─────────────────────────────
  // Re-evaluate eligible coupons whenever cart contents, subtotal, customer
  // or delivery address changes. All math happens on the backend.
  useEffect(() => {
    let cancelled = false;
    if (!customerId || cart.length === 0 || subtotal <= 0) {
      setRecoCoupons([]);
      setBestCampaignId(null);
      setAutoApplyCampaignId(null);
      return;
    }
    setRecoLoading(true);
    recommendCouponsForCart({
      customerId,
      cart: cart.map((c: any) => ({ id: c.id, vendor_id: c.vendor_id, qty: c.qty, price: c.price })),
      subtotal,
    })
      .then((res) => {
        if (cancelled) return;
        setRecoCoupons(res.coupons);
        setBestCampaignId(res.best_campaign_id);
        setAutoApplyCampaignId(res.auto_apply_campaign_id);
        logRecommendationEvent({
          customerId,
          event: "recommended",
          savings: res.coupons[0]?.discount_amount ?? 0,
          cart: cart as any,
        });
      })
      .finally(() => !cancelled && setRecoLoading(false));
    return () => {
      cancelled = true;
    };
  }, [customerId, subtotal, cart, selectedAddressId]);

  // Real-time validation: if the applied coupon is no longer eligible after
  // a cart change, silently drop it and inform the user.
  useEffect(() => {
    if (!couponInfo) return;
    const stillEligible = recoCoupons.some((c) => c.campaign_id === couponInfo.campaign_id);
    if (!stillEligible && recoCoupons.length > 0) {
      setCouponApplied(false);
      setCouponInfo(null);
      setCoupon("");
      toast.info("Coupon removed because the cart no longer qualifies.");
    }
  }, [recoCoupons]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-apply the campaign flagged as auto (if none applied yet)
  useEffect(() => {
    if (couponApplied || !autoApplyCampaignId) return;
    const auto = recoCoupons.find((c) => c.campaign_id === autoApplyCampaignId);
    if (!auto) return;
    setCouponInfo({
      campaign_id: auto.campaign_id,
      discount_amount: auto.discount_amount,
      product_id: auto.product_id || "",
      name: auto.campaign_name,
      code: auto.code,
    });
    setCoupon(auto.code);
    setCouponApplied(true);
    logRecommendationEvent({
      customerId,
      event: "auto_applied",
      campaignId: auto.campaign_id,
      code: auto.code,
      savings: auto.discount_amount,
    });
    toast.success(`Coupon auto-applied: ${auto.campaign_name} — you saved ₹${auto.discount_amount.toFixed(2)}`);
  }, [autoApplyCampaignId, recoCoupons, couponApplied, customerId]);

  const applyRecommendedCoupon = (c: CouponRecommendation) => {
    setCouponInfo({
      campaign_id: c.campaign_id,
      discount_amount: c.discount_amount,
      product_id: c.product_id || "",
      name: c.campaign_name,
      code: c.code,
    });
    setCoupon(c.code);
    setCouponApplied(true);
    logRecommendationEvent({
      customerId,
      event: "applied",
      campaignId: c.campaign_id,
      code: c.code,
      savings: c.discount_amount,
    });
    toast.success(`Coupon applied: ${c.campaign_name} — you saved ₹${c.discount_amount.toFixed(2)}`);
  };

  const removeRecommendedCoupon = () => {
    const prev = couponInfo;
    setCouponApplied(false);
    setCouponInfo(null);
    setCoupon("");
    if (prev) {
      logRecommendationEvent({
        customerId,
        event: "removed",
        campaignId: prev.campaign_id,
        code: prev.code,
      });
    }
    toast.info("Coupon removed. Original prices restored.");
  };


  const applyCoupon = async () => {
    if (!coupon.trim()) { toast.error("Enter a coupon code"); return; }
    // best-effort geo
    let lat: number | null = null, lng: number | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => {
        if (!("geolocation" in navigator)) return rej();
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 });
      });
      lat = pos.coords.latitude; lng = pos.coords.longitude;
    } catch {}
    const items = cart.map((c: any) => ({ id: c.id, vendor_id: c.vendor_id, qty: c.qty, price: c.price }));
    const { data, error } = await (supabase.rpc as any)("validate_coupon_code", {
      _code: coupon.trim().toUpperCase(),
      _customer_id: customerId,
      _cart_items: items,
      _subtotal: subtotal,
      _lat: lat, _lng: lng,
    });
    if (error) { toast.error(error.message || "Could not validate coupon"); return; }
    if (!data?.valid) { toast.error(data?.reason || "Invalid coupon"); return; }
    setCouponInfo({
      campaign_id: data.campaign_id,
      discount_amount: Number(data.discount_amount) || 0,
      product_id: data.product_id,
      name: data.name,
      code: data.code,
    });
    setCouponApplied(true);
    toast.success(`Coupon applied: ${data.name} — saved ₹${Number(data.discount_amount).toFixed(2)}`);
  };

  const removeCoupon = () => {
    setCouponApplied(false);
    setCouponInfo(null);
    setCoupon("");
  };

  const applyPoints = () => {
    if (pointsUsed > maxPoints) {
      toast.error(`Maximum redeemable points for this order is ${maxPoints}. Enter a value between 1 and ${maxPoints}.`);
      setPointsUsed(maxPoints);
      return;
    }
    if (pointsUsed < 0) {
      toast.error("Points must be a positive number");
      setPointsUsed(0);
      return;
    }
    toast.success(`${pointsUsed} points applied`);
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    if (!selectedAddressId) { toast.error("Please select a delivery address"); return; }
    if (deliveryMode === "scheduled") {
      if (!selectedDate) { toast.error("Please select a delivery date"); return; }
      if (!selectedTimeSlot) { toast.error("Please select a delivery time slot"); return; }
    }
    if (pointsUsed > maxPoints) {
      toast.error(`You can redeem a maximum of ${maxPoints} points for this order. Please enter a value between 1 and ${maxPoints}.`);
      return;
    }

    // Live stock cross-check before proceeding to payment
    try {
      const issues = await checkCartStock(cart as any);
      if (issues.length > 0) {
        const first = issues[0];
        toast.error(`Stock Unavailable for the Product ${first.title} so remove the item from the cart to checkout`, { duration: 6000 });
        return;
      }
    } catch (e) {
      console.error('Stock check failed', e);
    }

    navigate('/app/payment', {
      state: {
        cart, subtotal, mrpTotal, totalDiscount, platformFee, gstOnPlatformFee, discount, pointsUsed, total, savings,
        appliedCartRules, cartRuleDiscount,
        couponInfo,
        selectedAddress: addresses.find(a => a.id === selectedAddressId),
        deliveryMode,
        deliveryDate: deliveryMode === "scheduled" ? selectedDate?.toISOString() : null,
        deliverySlot: deliveryMode === "scheduled" ? selectedTimeSlot : 'anytime',
        itemRedemptionMap,
      }
    });
  };

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);
  const today = startOfDay(new Date());

  // Build full month calendar grid
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays: Date[] = [];
  let d = calStart;
  while (d <= calEnd) { calendarDays.push(d); d = addDays(d, 1); }
  const canGoPrev = !isBefore(startOfMonth(subMonths(calendarMonth, 1)), monthStart) ? false : !isBefore(endOfMonth(subMonths(calendarMonth, 1)), today);

  if (loading) {
    return <CustomerLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></CustomerLayout>;
  }

  return (
    <CustomerLayout>
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between md:hidden">
        <button
          onClick={() => {
            // Prefer real browser history; fall back to shop home so we never
            // land on auth/redirect screens or get stuck on the cart itself.
            if (window.history.length > 1 && document.referrer && !document.referrer.includes('/cart')) {
              navigate(-1);
            } else {
              navigate('/app/browse');
            }
          }}
          className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Go back"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h1 className="text-base font-semibold">Cart</h1>
        <Link to="/app/coupons" className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1">
          <Tag className="h-3.5 w-3.5" /> My Coupons
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 pb-44 md:pb-6">
        {cart.length === 0 && savedForLater.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mt-1">Browse products and add items to your cart</p>
            <Button asChild className="mt-4"><Link to="/app/browse">Continue Shopping</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Link to="/app" className="hover:text-foreground">Home</Link>
                  <ChevronRight className="h-3 w-3" />
                  <Link to="/app/browse" className="hover:text-foreground">Shop</Link>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-foreground font-medium">Cart</span>
                </div>
                <Link to="/app/coupons" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 whitespace-nowrap">
                  <Tag className="h-3.5 w-3.5" /> My Coupons →
                </Link>
              </div>

              <Tabs defaultValue="shop">
                <TabsList className="w-full">
                  <TabsTrigger value="shop" className="flex-1">Shop ({cart.length})</TabsTrigger>
                  <TabsTrigger value="saved" className="flex-1">Saved ({savedForLater.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="shop">
                  {/* Delivery Address */}
                  <Card className="p-3 mt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">Deliver To</p>
                        {selectedAddress ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-5 shrink-0">{selectedAddress.label}</Badge>
                            <span className="text-sm font-medium truncate">{selectedAddress.address_line}, {selectedAddress.city} - {selectedAddress.pincode}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No address selected</span>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="text-xs h-8 shrink-0 ml-2" onClick={() => setShowAddressDialog(true)}>
                        {selectedAddress ? "Change" : "Add"}
                      </Button>
                    </div>
                  </Card>

                  {/* Delivery Mode */}
                  <Card className="p-4 mt-3">
                    <h3 className="text-sm font-semibold mb-3">Delivery Schedule</h3>
                    <div className="space-y-2">
                      <button onClick={() => { setDeliveryMode("anytime"); setSelectedDate(null); setSelectedTimeSlot(""); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${deliveryMode === "anytime" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div className="text-left flex-1">
                          <p className="text-sm font-medium">Any Time</p>
                          <p className="text-[10px] text-muted-foreground">Standard delivery at the earliest</p>
                        </div>
                        {deliveryMode === "anytime" && <CheckCircle className="h-5 w-5 text-primary" />}
                      </button>
                      <button onClick={() => setDeliveryMode("scheduled")}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${deliveryMode === "scheduled" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                        <CalendarClock className="h-5 w-5 text-muted-foreground" />
                        <div className="text-left flex-1">
                          <p className="text-sm font-medium">Schedule An Appointment</p>
                          <p className="text-[10px] text-muted-foreground">Choose a specific date & time slot</p>
                        </div>
                        {deliveryMode === "scheduled" && <CheckCircle className="h-5 w-5 text-primary" />}
                      </button>
                    </div>

                    {deliveryMode === "scheduled" && (
                      <div className="border border-border/50 rounded-xl p-4 mt-3">
                        <p className="text-sm font-medium mb-3">Select Date</p>
                        <div className="flex items-center justify-between mb-3">
                          <button onClick={() => canGoPrev && setCalendarMonth(subMonths(calendarMonth, 1))}
                            className={`text-xs font-medium ${canGoPrev ? 'text-primary hover:underline' : 'text-muted-foreground/30 cursor-not-allowed'}`}
                            disabled={!canGoPrev}>← {format(subMonths(calendarMonth, 1), "MMM")}</button>
                          <span className="font-semibold text-sm">{format(calendarMonth, "MMMM yyyy")}</span>
                          <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                            className="text-xs text-primary hover:underline font-medium">{format(addMonths(calendarMonth, 1), "MMM")} →</button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                            <div key={d} className="text-center text-[10px] text-muted-foreground font-semibold py-1">{d}</div>
                          ))}
                          {calendarDays.map((day) => {
                            const inMonth = isSameMonth(day, calendarMonth);
                            const isToday = isSameDay(day, today);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isPast = isBefore(day, today) && !isToday;
                            return (
                              <button key={day.toISOString()} disabled={isPast || !inMonth}
                                onClick={() => setSelectedDate(day)}
                                className={`h-9 w-full rounded-full text-sm font-medium transition-all
                                  ${!inMonth ? 'text-transparent pointer-events-none' : ''}
                                  ${isPast && inMonth ? 'text-muted-foreground/25 cursor-not-allowed' : ''}
                                  ${isSelected ? 'bg-primary text-primary-foreground shadow-md' : ''}
                                  ${isToday && !isSelected ? 'ring-2 ring-primary/40 text-primary font-bold' : ''}
                                  ${!isPast && !isSelected && inMonth ? 'hover:bg-primary/10' : ''}`}>
                                {format(day, "d")}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-sm font-medium mt-3 mb-2">Select Time</p>
                        <div className="grid grid-cols-3 gap-2">
                          {TIME_SLOTS.map(slot => (
                            <button key={slot.id} onClick={() => { setSelectedTimeSlot(slot.id); toast.success(`Delivery scheduled: ${slot.label}`); }}
                              className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-colors
                                ${selectedTimeSlot === slot.id ? 'bg-primary text-primary-foreground' : 'border border-border hover:border-primary/30'}`}>
                              {slot.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Cart Items */}
                  <div className="space-y-3 mt-3">
                    {cart.map((item) => {
                      const discountPct = item.discount > 0 ? Math.round(item.discount / (item.price + item.discount) * 100) : 0;
                      return (
                        <Card key={item.id} className="p-4">
                          <div className="flex gap-3">
                            <Link to={`/app/product/${item.id}`} className="h-20 w-20 bg-secondary/30 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                              {item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" /> : <span className="text-3xl">{item.emoji}</span>}
                            </Link>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold leading-tight">{item.title}</h3>
                                  {item.selected_attributes && Object.keys(item.selected_attributes).length > 0 && (
                                    <p className="text-[10px] text-primary/80">{Object.entries(item.selected_attributes).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>
                                  )}
                                  <p className="text-[10px] text-muted-foreground">Vendor: {item.vendor}</p>
                                </div>
                                <p className="text-xs text-primary flex items-center gap-0.5 shrink-0 whitespace-nowrap"><Clock className="h-2.5 w-2.5" /> Delivery in 30 Mins</p>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                {item.discount > 0 && <span className="text-[10px] text-muted-foreground line-through">{fmt(item.price + item.discount)}</span>}
                                <span className="text-sm font-bold">{fmt(item.price)}</span>
                                {discountPct > 0 && <span className="text-[10px] text-success font-medium">{discountPct}% Off</span>}
                              </div>
                              <p className="text-[10px] text-success mt-0.5">Eligible for FREE Shipping</p>
                              {(() => {
                                const pim = perItemMaxPoints.find(p => p.id === item.id);
                                return pim && pim.maxRedeemable > 0 ? (
                                  <p className="text-[10px] text-primary mt-0.5">🎁 Up to {fmt(pim.maxRedeemable)} redeemable via points ({pim.redemptionPct}%)</p>
                                ) : null;
                              })()}
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <div className="flex items-center gap-1 border border-border rounded-lg">
                                  <button onClick={() => updateQty(item.id, -1)} className="h-7 w-7 flex items-center justify-center hover:bg-accent rounded-l-lg"><Minus className="h-3 w-3" /></button>
                                  <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                                  <button onClick={() => updateQty(item.id, 1)} className="h-7 w-7 flex items-center justify-center hover:bg-accent rounded-r-lg"><Plus className="h-3 w-3" /></button>
                                </div>
                                <button onClick={() => saveForLater(item)} className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
                                  <Heart className="h-3 w-3" /> SAVE FOR LATER
                                </button>
                                <button onClick={() => removeItem(item.id)} className="text-xs font-medium text-destructive hover:underline">REMOVE</button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
                <TabsContent value="saved">
                  {savedForLater.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No items saved for later</p>
                  ) : (
                    <div className="space-y-3 mt-3">
                      {savedForLater.map(item => (
                        <Card key={item.id} className="p-4 flex items-center gap-3">
                          <div className="h-14 w-14 bg-secondary/30 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                            {item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" /> : <span className="text-2xl">{item.emoji}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold truncate">{item.title}</h3>
                            <p className="text-sm font-bold mt-0.5">{fmt(item.price)}</p>
                          </div>
                          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => moveToCart(item)}>Move to Cart</Button>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column - Price Summary */}
            {cart.length > 0 && (
              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-2">Redeem Points</h3>
                  <div className="flex gap-2">
                    <Input type="number" placeholder={`Enter Points (max ${maxPoints})`} value={pointsUsed || ""} onChange={(e) => {
                      const raw = Number(e.target.value);
                      if (Number.isNaN(raw) || raw <= 0) { setPointsUsed(0); return; }
                      if (raw > maxPoints) {
                        toast.error(`You can redeem a maximum of ${maxPoints} points for this order.`);
                        setPointsUsed(maxPoints);
                        return;
                      }
                      setPointsUsed(Math.floor(raw));
                    }} className="h-10 flex-1" min={0} max={maxPoints} />
                    <Button className="h-10 px-6" onClick={applyPoints}>Apply</Button>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">💰 Wallet Balance</span>
                      <span className="font-semibold">{walletPoints.toLocaleString()} pts</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">🔓 Max Redeemable (this order)</span>
                      <span className="font-semibold text-primary">{maxPoints.toLocaleString()} pts</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">📉 Min Points to Redeem</span>
                      <span className="font-semibold">{maxPoints > 0 ? '1' : '0'} pt</span>
                    </div>
                  </div>
                  {maxPoints > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-2 bg-secondary/30 rounded-lg p-2">
                      💡 You can redeem between <strong>1</strong> and <strong>{maxPoints.toLocaleString()}</strong> points (1 point = {fmt(1)}). Max is calculated based on each product's redemption % limit.
                    </p>
                  )}
                  {pointsUsed > 0 && pointsUsed <= maxPoints && (
                    <div className="mt-2 p-2 bg-success/5 rounded-lg border border-success/20">
                      <p className="text-[10px] text-success font-semibold">✅ {pointsUsed} points applied = {fmt(pointsUsed)} discount</p>
                    </div>
                  )}
                  {pointsUsed > maxPoints && (
                    <p className="text-[10px] text-destructive mt-1 font-medium">⚠ Enter between 1 and {maxPoints} points</p>
                  )}
                  {/* Per-item redemption breakdown */}
                  {perItemMaxPoints.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-[10px] text-primary cursor-pointer font-medium">View per-item redemption limits</summary>
                      <div className="mt-1 space-y-1 pl-2 border-l-2 border-primary/20">
                        {perItemMaxPoints.map(p => (
                          <div key={p.id} className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground truncate max-w-[60%]">{p.title}</span>
                            <span>{fmt(p.maxRedeemable)} ({p.redemptionPct}%)</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </Card>
                <AvailableCouponsPanel
                  loading={recoLoading}
                  coupons={recoCoupons}
                  bestCampaignId={bestCampaignId}
                  appliedCampaignId={couponInfo?.campaign_id ?? null}
                  onApply={applyRecommendedCoupon}
                  onRemove={removeRecommendedCoupon}
                />
                <Card className="p-4">
                  <p className="text-[11px] text-muted-foreground mb-2">Have a code? Enter it manually.</p>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Enter coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} className="h-10 flex-1" disabled={couponApplied} />
                    {couponApplied ? (
                      <Button variant="outline" className="h-10" onClick={removeCoupon}>Remove</Button>
                    ) : (
                      <Button variant="secondary" className="h-10" onClick={applyCoupon}>Apply</Button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Missed a coupon?</span>
                    <Link to="/app/coupons" className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
                      View My Coupons →
                    </Link>
                  </div>
                  {couponInfo && (
                    <div className="mt-2 p-2 bg-success/5 rounded border border-success/20 text-[11px]">
                      <span className="text-success font-semibold">✓ {couponInfo.name}</span> — saved {fmt(couponInfo.discount_amount)}. Wallet points can't be used on this product.
                    </div>
                  )}
                </Card>
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-3">Bill Details</h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Item Total (MRP)</span><span>{fmt(mrpTotal)}</span></div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between pl-3 border-l-2 border-success/30 text-success">
                        <span>Product Discount</span><span>- {fmt(totalDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pl-3 border-l-2 border-border/50">
                      <span className="text-muted-foreground font-medium">Subtotal</span><span className="font-medium">{fmt(subtotal)}</span>
                    </div>
                    {(platformFee > 0 || referralCountThisMonth >= 4) && (
                      <div className="flex justify-between pl-3 border-l-2 border-border/50">
                        <div>
                          <span className="text-muted-foreground">Service & convenience fee</span>
                          {referralCountThisMonth >= 4
                            ? <p className="text-[10px] text-success font-medium">🎉 FREE (4+ referrals this month!)</p>
                            : <p className="text-[10px] text-muted-foreground/70">Inclusive of all applicable taxes</p>}
                        </div>
                        <span>
                          {referralCountThisMonth >= 4
                            ? <span className="line-through text-muted-foreground">{fmt(platformFeeValue + Math.round(platformFeeValue * platformFeeGst) / 100)}</span>
                            : `+ ${fmt(platformFee + gstOnPlatformFee)}`}
                        </span>
                      </div>
                    )}
                    {pointsUsed > 0 && (
                      <div className="flex justify-between pl-3 border-l-2 border-success/30 text-success">
                        <div>
                          <span>Wallet Points Redeemed</span>
                          <p className="text-[10px] text-success/70">{pointsUsed} pts × 1 = {fmt(pointsUsed)}</p>
                        </div>
                        <span>- {fmt(pointsUsed)}</span>
                      </div>
                    )}
                    {discount > 0 && <div className="flex justify-between text-success"><span>Coupon Discount</span><span>- {fmt(discount)}</span></div>}
                    {appliedCartRules.length > 0 && (
                      <div className="pt-1">
                        <CartRuleBreakup
                          rules={appliedCartRules}
                          totalDiscount={cartRuleDiscount}
                          audience="customer"
                        />
                      </div>
                    )}
                    <div className="border-t-2 border-dashed border-border/50 my-1" />
                    <div className="flex justify-between font-bold bg-success/5 rounded-lg px-3 py-2 -mx-1"><span>Total Amount</span><span className="text-success">{fmt(total)}</span></div>
                  </div>
                  {savings > 0 && (
                    <div className="mt-2 p-2 bg-success/5 rounded-lg border border-success/20">
                      <p className="text-xs text-success font-semibold text-center">🎉 You save {fmt(savings)} on this order!</p>
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-secondary/30 rounded-lg text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">Review your order and address details to avoid cancellations</p>
                    <p><strong>Note :-</strong> You can only cancel the order until your order is not accepted by the vendor and it can lead to some amount deduction from your order amount and your wallet points won't be refundable.</p>
                  </div>

                  <Button className="w-full h-12 mt-4 text-base font-semibold hidden md:flex" onClick={placeOrder} disabled={placing}>{placing ? "Placing..." : "Proceed To Checkout"}</Button>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Single sticky bottom CTA for mobile - no duplicate */}
      {cart.length > 0 && (
        <div className="fixed left-0 right-0 z-30 bg-card border-t border-border/50 px-4 py-3 md:hidden safe-area-bottom" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 3.5rem)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">{cart.reduce((s, i) => s + i.qty, 0)} item(s)</span>
            <span className="text-sm font-bold">{fmt(total)}</span>
          </div>
          <Button className="w-full h-12 rounded-xl text-base font-semibold" onClick={placeOrder} disabled={placing}>
            {placing ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : "Proceed To Checkout"}
          </Button>
        </div>
      )}


      {/* Address Picker Dialog (Zepto-style) */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0">
          <div className="p-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="text-base font-bold">Choose Delivery Address</DialogTitle>
          </div>

          {addresses.length > 0 ? (
            <div className="p-3 space-y-2">
              {addresses.map((addr) => {
                const isSelected = addr.id === selectedAddressId;
                return (
                  <button
                    key={addr.id}
                    onClick={() => {
                      setSelectedAddressId(addr.id);
                      setShowAddressDialog(false);
                      toast.success(`Delivering to ${addr.label}`);
                    }}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40 hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? "border-primary" : "border-muted-foreground/40"
                      }`}>
                        {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">{addr.label}</span>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {addr.type === "home" ? "🏠 Home" : addr.type === "work" ? "🏢 Work" : "📍 Other"}
                          </Badge>
                          {addr.is_default && <Badge className="bg-primary/10 text-primary border-0 text-[10px] h-5">Default</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{addr.address_line}</p>
                        <p className="text-xs text-muted-foreground">{addr.city} - {addr.pincode}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">No saved addresses yet</p>
            </div>
          )}

          <div className="p-3 border-t sticky bottom-0 bg-background">
            <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/app/set-location")}>
              <Save className="h-4 w-4" /> Add New Address
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
