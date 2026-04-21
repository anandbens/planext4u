import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Clock, MapPin, Shield, Calendar, CheckCircle, ChevronLeft, Heart, AlertTriangle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/country-context";
import { supabase } from "@/integrations/supabase/client";

const serviceImages: Record<string, string> = {
  "cleaning": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600",
  "plumbing": "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600",
  "electrical": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600",
  "painting": "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600",
  "pest": "https://images.unsplash.com/photo-1632935190508-b25c2e7dc9f7?w=600",
  "carpentry": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600",
  "ac": "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600",
  "beauty": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600",
  "default": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600",
};

function getServiceImage(title: string, image?: string | null) {
  if (image && image.startsWith('http')) return image;
  const lower = title.toLowerCase();
  for (const [key, url] of Object.entries(serviceImages)) {
    if (lower.includes(key)) return url;
  }
  return serviceImages.default;
}

export default function CustomerServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { format: fmt, country } = useCurrency();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [showComplaint, setShowComplaint] = useState(false);
  const [complaintSubject, setComplaintSubject] = useState("");
  const [complaintDescription, setComplaintDescription] = useState("");
  const [complaintCategory, setComplaintCategory] = useState("general");

  useEffect(() => {
    if (!id) return;
    try {
      const saved = JSON.parse(localStorage.getItem('app_db_service_wishlist') || '[]');
      setIsWishlisted(saved.includes(id));
    } catch {}
  }, [id]);

  // Fetch generated slots from RPC (respects duration, buffer, overrides, existing bookings, booking window)
  const { data: rpcSlots = [] } = useQuery({
    queryKey: ["serviceSlots", id, selectedDate],
    queryFn: async () => {
      if (!id || !selectedDate) return [];
      const { data, error } = await (supabase.rpc as any)("generate_service_slots", {
        _service_id: id,
        _date: selectedDate,
      });
      if (error) { console.error("slots rpc:", error); return []; }
      return (data || []) as { start_time: string; end_time: string; is_booked: boolean }[];
    },
    enabled: !!id && !!selectedDate,
  });

  const { data: bookingWindowDays = 7 } = useQuery({
    queryKey: ["bookingWindowDays"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_variables").select("value").eq("key", "service_booking_window_days").maybeSingle();
      return parseInt((data as any)?.value || "7", 10) || 7;
    },
  });

  // Fetch real reviews from DB
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", "service", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews" as any)
        .select("*")
        .eq("entity_type", "service")
        .eq("entity_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);
      return (data || []) as any[];
    },
    enabled: !!id,
  });

  const { data: service, isLoading } = useQuery({
    queryKey: ["service", id],
    queryFn: async () => {
      if (!id) return null;
      const all = await api.getServices();
      return all.find((s: any) => s.id === id) || null;
    },
    enabled: !!id,
  });

  const { data: vendorAvailability } = useQuery({
    queryKey: ["vendorAvailability", service?.vendor_id, selectedDate],
    queryFn: async () => {
      if (!service?.vendor_id || !selectedDate) return null;
      const dayOfWeek = new Date(selectedDate).getDay();
      const { data } = await supabase
        .from("vendor_availability" as any)
        .select("*")
        .eq("vendor_id", service.vendor_id)
        .eq("day_of_week", dayOfWeek)
        .maybeSingle();
      return data as any;
    },
    enabled: !!service?.vendor_id && !!selectedDate,
  });

  const toggleServiceWishlist = () => {
    if (!id) return;
    try {
      const saved = JSON.parse(localStorage.getItem('app_db_service_wishlist') || '[]');
      const next = saved.includes(id) ? saved.filter((x: string) => x !== id) : [...saved, id];
      localStorage.setItem('app_db_service_wishlist', JSON.stringify(next));
      setIsWishlisted(next.includes(id));
      toast.success(next.includes(id) ? "Added to wishlist" : "Removed from wishlist");
    } catch {}
  };

  if (isLoading) return <CustomerLayout><div className="p-8"><Skeleton className="h-96 rounded-2xl" /></div></CustomerLayout>;
  if (!service) return <CustomerLayout><div className="p-8 text-center">Service not found</div></CustomerLayout>;

  const discountPct = service.discount ? Math.round((service.discount / service.price) * 100) : 0;
  const imgUrl = getServiceImage(service.title, service.image);
  const finalPrice = service.price - (service.discount || 0) + (service.tax || 0);

  // Build available time slots from vendor availability
  const isVendorAvailable = vendorAvailability ? vendorAvailability.is_available : true;
  const vendorSlots = vendorAvailability?.time_slots || [];
  const generateSlots = (slots: { start: string; end: string }[]) => {
    if (slots.length === 0) return ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"];
    const allHours: string[] = [];
    const parseTime = (t: string) => {
      const [time, ampm] = t.split(" ");
      const [h, m] = time.split(":").map(Number);
      return ampm === "PM" && h !== 12 ? h + 12 : ampm === "AM" && h === 12 ? 0 : h;
    };
    const formatHour = (h: number) => {
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${String(h12).padStart(2, "0")}:00 ${ampm}`;
    };
    slots.forEach((s) => {
      const startH = parseTime(s.start);
      const endH = parseTime(s.end);
      for (let h = startH; h < endH; h++) allHours.push(formatHour(h));
    });
    return allHours;
  };
  const allSlots = isVendorAvailable ? generateSlots(vendorSlots) : [];

  const handleBookNow = () => {
    if (!selectedDate || !selectedSlot) { toast.error("Select date and time"); return; }
    navigate('/app/payment', {
      state: {
        cart: [{
          id: service.id, title: service.title, price: service.price, qty: 1,
          vendor: service.vendor_name, vendor_id: service.vendor_id,
          emoji: service.emoji || '🔧', image: service.image,
          maxPoints: service.max_points_redeemable || 0, tax: service.tax || 0,
          discount: service.discount || 0,
        }],
        subtotal: service.price,
        platformFee: 0,
        discount: service.discount || 0,
        pointsUsed: 0,
        total: finalPrice,
        isServiceBooking: true,
        bookingDate: selectedDate,
        bookingSlot: selectedSlot,
      }
    });
  };

  const submitReview = async () => {
    if (!reviewComment.trim()) { toast.error("Please write a comment"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please login to review"); return; }
    const { data: customer } = await supabase.from("customers").select("name").eq("id", user.id).maybeSingle();
    const { error } = await supabase.from("reviews" as any).insert({
      user_id: user.id,
      user_name: customer?.name || "Customer",
      entity_type: "service",
      entity_id: id,
      rating: reviewRating,
      comment: reviewComment,
    } as any);
    if (error) { toast.error("Failed to submit review"); return; }
    toast.success("Thank you for your review!");
    setShowReview(false);
    setReviewComment("");
    setReviewRating(5);
    queryClient.invalidateQueries({ queryKey: ["reviews", "service", id] });
  };

  const submitComplaint = async () => {
    if (!complaintSubject.trim() || !complaintDescription.trim()) { toast.error("Fill all fields"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please login"); return; }
    const { data: customer } = await supabase.from("customers").select("name").eq("id", user.id).maybeSingle();
    const { error } = await supabase.from("complaints" as any).insert({
      user_id: user.id,
      user_name: customer?.name || "Customer",
      entity_type: "service",
      entity_id: id,
      category: complaintCategory,
      subject: complaintSubject,
      description: complaintDescription,
    } as any);
    if (error) { toast.error("Failed to submit complaint"); return; }
    toast.success("Complaint submitted successfully. We'll get back to you shortly.");
    setShowComplaint(false);
    setComplaintSubject("");
    setComplaintDescription("");
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const totalReviews = reviews.length;

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative rounded-2xl overflow-hidden h-72 md:h-96">
            <img src={imgUrl} alt={service.title} className="w-full h-full object-cover" />
            <button onClick={() => navigate(-1)} className="absolute top-4 left-4 h-8 w-8 rounded-full bg-card/80 backdrop-blur flex items-center justify-center md:hidden">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={toggleServiceWishlist} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-card/80 backdrop-blur flex items-center justify-center">
              <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-destructive text-destructive' : ''}`} />
            </button>
            <button onClick={async () => {
              const displayUrl = `https://www.planext4u.net/app/service/${id}`;
              const ogUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-share?type=service&id=${id}`;
              const text = `Check out ${service.title} - ${fmt(service.price, { decimals: 0 })} on P4U!`;
              if (navigator.share) {
                try {
                  const imgSrc = service.image || imgUrl;
                  let files: File[] = [];
                  if (imgSrc) {
                    try {
                      const resp = await fetch(imgSrc);
                      const blob = await resp.blob();
                      const ext = blob.type.includes('png') ? 'png' : 'jpg';
                      files = [new File([blob], `service.${ext}`, { type: blob.type })];
                    } catch {}
                  }
                  if (files.length && navigator.canShare?.({ files })) {
                    await navigator.share({ title: service.title, text: `${text}\n${displayUrl}`, files });
                  } else {
                    await navigator.share({ title: service.title, text, url: ogUrl });
                  }
                } catch {}
              } else {
                navigator.clipboard.writeText(`${text}\n${displayUrl}`);
                toast.success("Link copied to clipboard!");
              }
            }} className="absolute top-4 right-14 h-8 w-8 rounded-full bg-card/80 backdrop-blur flex items-center justify-center">
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          <div>
            <Badge variant="outline" className="mb-2">{service.category_name}</Badge>
            <h1 className="text-2xl font-bold">{service.title}</h1>
            <p className="text-sm text-primary font-medium mt-1">{service.vendor_name}</p>

            <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-warning text-warning" /><strong className="text-foreground">{avgRating}</strong> ({totalReviews} reviews)</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{service.duration}</span>
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{service.service_area}</span>
            </div>

            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-3xl font-bold">₹{service.price.toLocaleString()}</span>
              {discountPct > 0 && (
                <>
                  <span className="text-lg text-muted-foreground line-through">₹{(service.price + service.discount).toLocaleString()}</span>
                  <Badge className="bg-destructive/10 text-destructive border-0">{discountPct}% OFF</Badge>
                </>
              )}
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Calendar className="h-4 w-4" /> Select Date</h3>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date(); d.setDate(d.getDate() + i);
                  const label = d.toLocaleDateString(country.locale_code, { weekday: 'short', day: 'numeric' });
                  const val = d.toISOString().split('T')[0];
                  return (
                    <button key={i} onClick={() => { setSelectedDate(val); setSelectedSlot(""); }}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${selectedDate === val ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30'}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Clock className="h-4 w-4" /> Select Time</h3>
              {!selectedDate ? (
                <p className="text-xs text-muted-foreground">Select a date first</p>
              ) : !isVendorAvailable ? (
                <p className="text-xs text-destructive">Vendor is not available on this day</p>
              ) : allSlots.length === 0 ? (
                <p className="text-xs text-muted-foreground">No time slots available</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allSlots.map((slot) => {
                    const isBooked = bookedSlots.includes(slot);
                    return (
                      <button key={slot} onClick={() => !isBooked && setSelectedSlot(slot)} disabled={isBooked}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${isBooked ? 'border-border bg-muted text-muted-foreground line-through cursor-not-allowed opacity-50' : selectedSlot === slot ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30'}`}>
                        {slot}{isBooked ? ' (Booked)' : ''}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Button className="w-full mt-6" disabled={!selectedDate || !selectedSlot || !isVendorAvailable} onClick={handleBookNow}>
              Book Now — {fmt(finalPrice, { decimals: 0 })}
            </Button>

            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { icon: Shield, text: "Verified Professional" },
                { icon: CheckCircle, text: "Service Guarantee" },
                { icon: Calendar, text: "Flexible Scheduling" },
              ].map((b) => (
                <div key={b.text} className="flex flex-col items-center text-center gap-1 p-2 bg-secondary/30 rounded-lg">
                  <b.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="font-semibold mb-3">About this service</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-success" /> Professional & trained experts</div>
              <div className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-success" /> Eco-friendly products used</div>
              <div className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-success" /> 100% satisfaction guaranteed</div>
            </div>
            <Button variant="outline" size="sm" className="mt-4 text-destructive border-destructive/30" onClick={() => setShowComplaint(true)}>
              <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Raise Complaint
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Customer Reviews ({totalReviews})</h3>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setShowReview(true)}>Write Review</Button>
            </div>
            {/* Rating summary */}
            {totalReviews > 0 && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-secondary/30 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold">{avgRating}</p>
                  <div className="flex">{Array.from({ length: 5 }).map((_, j) => <Star key={j} className={`h-3 w-3 ${j < Math.round(Number(avgRating)) ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />)}</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{totalReviews} reviews</p>
                </div>
                <div className="flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map(n => {
                    const count = reviews.filter((r: any) => r.rating === n).length;
                    const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                    return (
                      <div key={n} className="flex items-center gap-2 text-xs">
                        <span className="w-3">{n}</span>
                        <Star className="h-2.5 w-2.5 fill-warning text-warning" />
                        <div className="flex-1 bg-border/50 rounded-full h-1.5"><div className="bg-warning h-1.5 rounded-full" style={{ width: `${pct}%` }} /></div>
                        <span className="w-5 text-right text-muted-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No reviews yet. Be the first to review!</p>
              ) : reviews.map((r: any) => (
                <div key={r.id} className="border-b border-border/30 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{r.user_name}</span>
                      <div className="flex">{Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="h-3 w-3 fill-warning text-warning" />)}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Rate & Review</DialogTitle>
          <div className="space-y-4 pt-2">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setReviewRating(n)}>
                  <Star className={`h-8 w-8 ${n <= reviewRating ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </div>
            <Textarea placeholder="Share your experience..." value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={3} />
            <Button className="w-full" onClick={submitReview}>Submit Review</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complaint Dialog */}
      <Dialog open={showComplaint} onOpenChange={setShowComplaint}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Raise a Complaint</DialogTitle>
          <div className="space-y-4 pt-2">
            <Select value={complaintCategory} onValueChange={setComplaintCategory}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {["quality", "delay", "damage", "behavior", "safety", "billing", "general"].map(c => (
                  <SelectItem key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Subject" value={complaintSubject} onChange={e => setComplaintSubject(e.target.value)} />
            <Textarea placeholder="Describe your issue in detail..." value={complaintDescription} onChange={e => setComplaintDescription(e.target.value)} rows={4} />
            <Button className="w-full" onClick={submitComplaint}>Submit Complaint</Button>
          </div>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
