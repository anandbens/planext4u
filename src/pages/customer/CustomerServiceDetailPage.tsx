import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, Clock, MapPin, Shield, Calendar, CheckCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { toast } from "sonner";
import { api } from "@/lib/api";

const serviceImages: Record<string, string> = {
  "cleaning": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600",
  "plumbing": "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600",
  "electrical": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600",
  "painting": "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600",
  "pest": "https://images.unsplash.com/photo-1632935190508-b25c2e7dc9f7?w=600",
  "carpentry": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600",
  "ac": "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600",
  "beauty": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600",
  "repair": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600",
  "appliance": "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600",
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
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const { data: service, isLoading } = useQuery({
    queryKey: ["service", id],
    queryFn: () => api.getServiceById(id!),
    enabled: !!id,
  });

  if (isLoading) return <CustomerLayout><div className="p-8"><Skeleton className="h-96 rounded-2xl" /></div></CustomerLayout>;
  if (!service) return <CustomerLayout><div className="p-8 text-center">Service not found</div></CustomerLayout>;

  const discountPct = service.discount ? Math.round((service.discount / service.price) * 100) : 0;
  const slots = ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"];
  const imgUrl = getServiceImage(service.title, service.image);
  const finalPrice = service.price - (service.discount || 0) + (service.tax || 0);

  const handleBookNow = () => {
    if (!selectedDate || !selectedSlot) { toast.error("Select date and time"); return; }
    // Navigate to payment page with service booking details
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

  const submitReview = () => {
    toast.success("Thank you for your review!");
    setShowReview(false);
  };

  const reviews = [
    { user: "Priya M.", rating: 5, comment: "Excellent service! Very professional and thorough.", date: "2 days ago" },
    { user: "Rahul K.", rating: 4, comment: "Good work, arrived on time. Will book again.", date: "1 week ago" },
    { user: "Anita S.", rating: 5, comment: "Best service in Mumbai. Highly recommended!", date: "2 weeks ago" },
  ];

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 pb-28 md:pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative rounded-2xl overflow-hidden h-72 md:h-96">
            <img src={imgUrl} alt={service.title} className="w-full h-full object-cover" />
            <button onClick={() => navigate(-1)} className="absolute top-4 left-4 h-8 w-8 rounded-full bg-card/80 backdrop-blur flex items-center justify-center md:hidden">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div>
            <Badge variant="outline" className="mb-2">{service.category_name}</Badge>
            <h1 className="text-2xl font-bold">{service.title}</h1>
            <p className="text-sm text-primary font-medium mt-1">{service.vendor_name}</p>

            <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-warning text-warning" /><strong className="text-foreground">{service.rating}</strong> ({service.reviews} reviews)</span>
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
                  const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
                  const val = d.toISOString().split('T')[0];
                  return (
                    <button key={i} onClick={() => setSelectedDate(val)}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${selectedDate === val ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30'}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Clock className="h-4 w-4" /> Select Time</h3>
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button key={slot} onClick={() => setSelectedSlot(slot)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${selectedSlot === slot ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30'}`}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full mt-6" disabled={!selectedDate || !selectedSlot} onClick={handleBookNow}>
              Book Now — ₹{finalPrice.toLocaleString()}
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
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Customer Reviews</h3>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setShowReview(true)}>Write Review</Button>
            </div>
            <div className="space-y-3 mb-4">
              {reviews.map((r, i) => (
                <div key={i} className="border-b border-border/30 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{r.user}</span>
                      <div className="flex">{Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="h-3 w-3 fill-warning text-warning" />)}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">{r.date}</span>
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
    </CustomerLayout>
  );
}
