import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, Clock, MapPin, Shield, Calendar, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { toast } from "sonner";
import { api } from "@/lib/api";

const reviews = [
  { user: "Priya M.", rating: 5, comment: "Excellent service! Very professional and thorough.", date: "2 days ago" },
  { user: "Rahul K.", rating: 4, comment: "Good work, arrived on time. Will book again.", date: "1 week ago" },
  { user: "Anita S.", rating: 5, comment: "Best service in Mumbai. Highly recommended!", date: "2 weeks ago" },
];

export default function CustomerServiceDetailPage() {
  const { id } = useParams();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  const { data: service, isLoading } = useQuery({
    queryKey: ["service", id],
    queryFn: () => api.getServiceById(id!),
    enabled: !!id,
  });

  if (isLoading) return <CustomerLayout><div className="p-8"><Skeleton className="h-96 rounded-2xl" /></div></CustomerLayout>;
  if (!service) return <CustomerLayout><div className="p-8 text-center">Service not found</div></CustomerLayout>;

  const discountPct = service.discount ? Math.round((service.discount / service.price) * 100) : 0;
  const slots = ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"];

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-secondary/50 to-secondary/20 rounded-2xl h-72 md:h-96 flex items-center justify-center text-8xl">
            {service.emoji}
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

            {/* Date Selection */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Calendar className="h-4 w-4" /> Select Date</h3>
              <div className="flex gap-2 overflow-x-auto">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + i);
                  const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
                  const val = d.toISOString().split('T')[0];
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(val)}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${selectedDate === val ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Clock className="h-4 w-4" /> Select Time</h3>
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${selectedSlot === slot ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30'}`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full mt-6"
              disabled={!selectedDate || !selectedSlot}
              onClick={() => toast.success(`Service booked for ${selectedDate} at ${selectedSlot}!`)}
            >
              Book Now — ₹{service.price.toLocaleString()}
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

        {/* Description & Reviews */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <h3 className="font-semibold mb-3">Customer Reviews</h3>
            <div className="space-y-3">
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
    </CustomerLayout>
  );
}
