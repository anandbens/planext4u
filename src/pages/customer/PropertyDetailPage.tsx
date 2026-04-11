import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, Share2, Shield, MapPin, Bed, Bath, Maximize2, Building2, Compass, Car, Calendar, Phone, MessageCircle, Flag, ChevronLeft, ChevronRight, Star, Clock, Calculator, X, Wifi, Dumbbell, Trees, ShieldCheck, Baby, Zap, Droplets, Flame, ParkingCircle, Eye, Users, TrendingUp, Snowflake, CloudRain, Radio, DoorOpen, Warehouse, BatteryCharging, Siren, Cctv, Waves, Home, Dog, UtensilsCrossed, Key, Sofa } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

const PROPERTY_IMAGES = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop",
];

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartment", independent_house: "Independent House", villa: "Villa",
  plot: "Plot", pg_hostel: "PG/Hostel", commercial_office: "Office",
  commercial_shop: "Shop", commercial_warehouse: "Warehouse", commercial_showroom: "Showroom",
};

const AMENITY_ICON_MAP: Record<string, React.ComponentType<any>> = {
  "Intercom": Radio, "Air Conditioner": Snowflake, "Rain Water Harvesting": CloudRain,
  "Internet Provider": Wifi, "Lift": Building2, "Club House": Warehouse,
  "Gas Pipeline": Flame, "Fire Safety": Siren, "Park": Trees,
  "Power Backup": BatteryCharging, "Children Play Area": Baby, "Security": ShieldCheck,
  "Gym": Dumbbell, "Visitor Parking": ParkingCircle, "Servant Room": DoorOpen,
  "Swimming Pool": Waves, "CCTV": Cctv, "24x7 Water": Droplets,
  "Gated Community": Home, "Security Guard": ShieldCheck, "Water Supply 24x7": Droplets,
  "Garden": Trees, "Rainwater Harvesting": CloudRain,
  "Pet Allowed": Dog, "Non-Veg Allowed": UtensilsCrossed, "Gated Security": ShieldCheck,
};

function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

function EMICalculator({ price }: { price: number }) {
  const [loanAmount, setLoanAmount] = useState([Math.round(price * 0.8)]);
  const [rate, setRate] = useState([8.5]);
  const [tenure, setTenure] = useState([20]);
  const P = loanAmount[0];
  const r = rate[0] / 12 / 100;
  const n = tenure[0] * 12;
  const emi = r > 0 ? Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) : 0;
  const totalInterest = (emi * n) - P;

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-sm font-bold flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> EMI Calculator</h3>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Loan Amount: {formatPrice(loanAmount[0])}</p>
        <Slider value={loanAmount} onValueChange={setLoanAmount} min={100000} max={price} step={100000} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Interest Rate: {rate[0]}%</p>
        <Slider value={rate} onValueChange={setRate} min={5} max={15} step={0.1} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Tenure: {tenure[0]} years</p>
        <Slider value={tenure} onValueChange={setTenure} min={1} max={30} step={1} />
      </div>
      <div className="bg-secondary/30 rounded-lg p-3 text-center">
        <p className="text-xs text-muted-foreground">Monthly EMI</p>
        <p className="text-xl font-bold text-primary">₹{emi.toLocaleString("en-IN")}</p>
        <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>Principal: {formatPrice(P)}</span>
          <span>Interest: {formatPrice(totalInterest)}</span>
        </div>
      </div>
    </Card>
  );
}

// NoBroker-style Schedule Visit with date chips and time slots
function ScheduleVisitSheet({ open, onClose, property, onSubmit }: any) {
  const today = new Date();
  const dates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [selectedTime, setSelectedTime] = useState('');
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const timeSlots: Record<string, string[]> = {
    morning: ['07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM'],
    afternoon: ['12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'],
    evening: ['04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM'],
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <div className="p-5">
          <DialogTitle className="text-lg font-bold text-center">Schedule Visit for Free</DialogTitle>
          <p className="text-xs text-muted-foreground text-center mt-1 flex items-center justify-center gap-1">
            👥 {Math.floor(Math.random() * 15 + 5)} People are visiting this property
          </p>
        </div>
        <div className="px-5 pb-4">
          <h4 className="text-sm font-bold mb-3">Pick a Date</h4>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            <div className="flex items-center justify-center text-xs font-bold text-muted-foreground px-2 shrink-0">
              {monthNames[dates[0].getMonth()]}
            </div>
            {dates.map((d, i) => (
              <button key={i} onClick={() => setSelectedDate(i)}
                className={`shrink-0 flex flex-col items-center rounded-xl px-4 py-2 border transition-colors
                  ${selectedDate === i ? 'border-primary bg-primary/5' : 'border-border/50'}`}>
                <span className="text-lg font-bold">{d.getDate()}</span>
                <span className="text-[10px] text-muted-foreground">{i === 0 ? 'Today' : dayNames[d.getDay()]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 pb-3">
          <div className="flex gap-2">
            {(['morning', 'afternoon', 'evening'] as const).map(t => (
              <button key={t} onClick={() => { setTimeOfDay(t); setSelectedTime(''); }}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border text-xs font-medium transition-colors capitalize
                  ${timeOfDay === t ? 'border-primary text-primary bg-primary/5' : 'border-border/50 text-muted-foreground'}`}>
                {t === 'morning' ? '🌅' : t === 'afternoon' ? '☀️' : '🌙'} {t}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {timeSlots[timeOfDay].map(t => (
              <button key={t} onClick={() => setSelectedTime(t)}
                className={`py-2.5 rounded-lg border text-xs font-medium transition-colors
                  ${selectedTime === t ? 'border-primary bg-primary text-primary-foreground' : 'border-border/50 hover:border-primary/30'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 pb-5">
          <Button className="w-full rounded-xl h-11" disabled={!selectedTime}
            onClick={() => { onSubmit(dates[selectedDate].toISOString().split('T')[0], selectedTime); }}>
            Confirm Visit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [imgIdx, setImgIdx] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [enquiryMsg, setEnquiryMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data } = await supabase.from("properties" as any).select("*").eq("id", id).single();
      return data as any;
    },
    enabled: !!id,
  });

  // Fetch similar properties
  const { data: similarProps = [] } = useQuery({
    queryKey: ["similar-properties", property?.city, property?.transaction_type, id],
    queryFn: async () => {
      const { data } = await supabase.from("properties" as any).select("*")
        .eq("status", "active")
        .eq("transaction_type", property.transaction_type)
        .neq("id", id)
        .limit(6);
      return (data || []) as any[];
    },
    enabled: !!property,
  });

  if (isLoading) return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </CustomerLayout>
  );

  if (!property) return (
    <CustomerLayout>
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Property Not Found</h2>
        <Link to="/app/find-home"><Button className="mt-4">Back to Search</Button></Link>
      </div>
    </CustomerLayout>
  );

  const dbImages: string[] = Array.isArray(property.images) ? property.images.filter(Boolean) : [];
  const images = dbImages.length >= 2 ? dbImages : [
    ...dbImages,
    ...PROPERTY_IMAGES.slice(0, 5 - dbImages.length),
  ];
  const amenities: string[] = Array.isArray(property.amenities) ? property.amenities : [
    "Intercom", "Air Conditioner", "Rain Water Harvesting", "Internet Provider",
    "Lift", "Club House", "Gas Pipeline", "Fire Safety",
    "Park", "Power Backup", "Children Play Area", "Security",
    "Gym", "Visitor Parking", "Servant Room",
  ];

  const suggestedQuestions = [
    "When can I visit?",
    "Is the property still available?",
    `Can I finalize the rent for Rs. ${Math.round(property.price * 0.9).toLocaleString("en-IN")}?`,
    `Can I finalize the rent for Rs. ${Math.round(property.price * 0.95).toLocaleString("en-IN")}?`,
  ];

  const handleSendEnquiry = async () => {
    if (!customerUser) { toast.error("Please login first"); navigate("/app/login"); return; }
    if (!enquiryMsg.trim()) { toast.error("Please enter a message"); return; }
    const seekerId = customerUser.customer_id || customerUser.id;
    // Insert a property message for 1-1 chat
    const { error } = await supabase.from("property_messages" as any).insert({
      property_id: id,
      sender_id: seekerId,
      sender_name: customerUser.name || "User",
      receiver_id: property.user_id,
      message: enquiryMsg.trim(),
      is_read: false,
    } as any);
    if (error) { toast.error("Failed to send message"); return; }
    // Also create enquiry record
    await supabase.from("property_enquiries" as any).insert({
      property_id: id,
      seeker_id: seekerId,
      seeker_name: customerUser.name || "User",
      message: enquiryMsg.trim(),
      status: "pending",
    } as any);
    toast.success("Message sent to the owner!");
    setShowContact(false);
    setEnquiryMsg("");
  };

  const handleScheduleVisit = async (date: string, time: string) => {
    if (!customerUser) { toast.error("Please login first"); navigate("/app/login"); return; }
    const seekerId = customerUser.customer_id || customerUser.id;
    const { error } = await supabase.from("property_visits" as any).insert({
      property_id: id,
      seeker_id: seekerId,
      seeker_name: customerUser.name || "User",
      visit_date: date,
      visit_time: time,
      status: "scheduled",
    } as any);
    if (error) { toast.error("Failed to schedule visit"); return; }
    toast.success(`Visit scheduled for ${date} at ${time}`);
    setShowSchedule(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: property.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    }
  };

  const handleImageScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.offsetWidth;
    setImgIdx(Math.round(scrollLeft / width));
  };

  const scrollToImage = (idx: number) => {
    setImgIdx(idx);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: idx * scrollRef.current.offsetWidth, behavior: 'smooth' });
    }
  };

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto pb-32 md:pb-6">
        {/* Back + Actions - NoBroker red header style */}
        <div className="sticky top-0 z-30 bg-destructive px-4 py-3 flex items-center justify-between text-white">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium truncate max-w-[200px]">{property.bhk ? `${property.bhk} BHK` : ''} in {property.locality || property.city}</span>
          </button>
          <div className="flex gap-3">
            <button onClick={() => toast.info("Reported")}><Flag className="h-5 w-5" /></button>
            <button onClick={handleShare}><Share2 className="h-5 w-5" /></button>
            <button onClick={() => toast.success("Saved!")}><Heart className="h-5 w-5" /></button>
          </div>
        </div>

        {/* Scrollable Image Gallery - NoBroker style */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide cursor-pointer"
            onScroll={handleImageScroll}
            onClick={() => setShowGallery(true)}
          >
            {images.map((img: string, i: number) => (
              <div key={i} className="min-w-full h-56 sm:h-72 md:h-96 snap-center shrink-0">
                <img src={img} alt={`${property.title} - ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
          {/* Nav arrows */}
          {images.length > 1 && (
            <>
              {imgIdx > 0 && (
                <button onClick={() => scrollToImage(imgIdx - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center shadow">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {imgIdx < images.length - 1 && (
                <button onClick={() => scrollToImage(imgIdx + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center shadow">
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-xs font-medium">
                {imgIdx + 1} / {images.length}
              </div>
            </>
          )}
        </div>

        {/* Title & Price */}
        <div className="px-4 pt-4">
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge className="bg-primary/10 text-primary capitalize">{property.transaction_type}</Badge>
            <Badge variant="outline" className="capitalize">{PROPERTY_TYPE_LABELS[property.property_type]}</Badge>
            {property.is_verified && <Badge className="bg-success/10 text-success"><Shield className="h-3 w-3 mr-1" />Verified</Badge>}
            {property.posted_by && <Badge variant="outline" className="capitalize">By {property.posted_by}</Badge>}
          </div>
          <h1 className="text-xl font-bold">{property.title}</h1>
          <div className="flex items-center gap-1 mt-1 text-muted-foreground text-sm">
            <MapPin className="h-3.5 w-3.5" />
            <span>{property.locality}, {property.city} - {property.pincode}</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{formatPrice(property.price)}</span>
            {property.transaction_type === "rent" && <span className="text-sm text-muted-foreground">/ month</span>}
            {property.price_negotiable && <Badge variant="outline" className="text-success border-success/30">Negotiable</Badge>}
          </div>
          {property.maintenance_charges > 0 && (
            <p className="text-xs text-muted-foreground mt-1">+ ₹{property.maintenance_charges.toLocaleString("en-IN")} maintenance/month</p>
          )}
          {property.security_deposit > 0 && (
            <p className="text-xs text-muted-foreground">Security deposit: ₹{property.security_deposit.toLocaleString("en-IN")}</p>
          )}
        </div>

        {/* Overview Grid - NoBroker style 2-column bordered */}
        <div className="px-4 py-4">
          <Card className="p-4">
            <h3 className="text-sm font-bold mb-1">Overview</h3>
            <div className="w-12 h-0.5 bg-destructive mb-4" />
            <div className="grid grid-cols-2 border border-border/50 rounded-lg overflow-hidden">
              {[
                property.bhk && { icon: Bed, value: property.bhk === "studio" ? "Studio" : property.bhk, label: "Bedroom" },
                { icon: Calendar, value: new Date(property.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }), label: "Posted On" },
                property.area_sqft > 0 && { icon: Bath, value: Math.ceil(parseInt(property.bhk || "1")), label: "Bathrooms" },
                { icon: Key, value: property.availability_date ? new Date(property.availability_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Immediately", label: "Possession" },
                { icon: UtensilsCrossed, value: "Yes", label: "Nonveg Allowed" },
                { icon: ShieldCheck, value: property.amenities?.includes?.("Gated Security") || property.amenities?.includes?.("Gated Community") ? "Yes" : "No", label: "Gated Security" },
                property.parking && property.parking !== "none" && { icon: Car, value: property.parking === "four_wheeler" ? "Car" : property.parking === "two_wheeler" ? "Bike" : property.parking === "both" ? "Both" : "Car", label: "Parking" },
                { icon: Building2, value: PROPERTY_TYPE_LABELS[property.property_type] || "Apartment", label: "" },
                { icon: Dog, value: "NA", label: "Pet Allowed" },
              ].filter(Boolean).map((item: any, i: number) => (
                <div key={i} className={`flex items-center gap-3 p-3 ${i % 2 === 0 ? "border-r border-border/50" : ""} ${i < 7 ? "border-b border-border/50" : ""}`}>
                  <item.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-bold">{item.value}</p>
                    {item.label && <p className="text-[11px] text-muted-foreground">{item.label}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex justify-between border-b border-border/30 pb-1"><span>Last Updated On</span><span className="font-medium text-foreground">{new Date(property.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}</span></div>
              <div className="flex justify-between border-b border-border/30 pb-1"><span>Furnishing Status</span><span className="font-medium text-foreground capitalize">{property.furnishing?.replace("_", " ") || "Unfurnished"}</span></div>
              {property.facing && <div className="flex justify-between border-b border-border/30 pb-1"><span>Facing</span><span className="font-medium text-foreground capitalize">{property.facing.replace("_", " ")}</span></div>}
              {property.age_of_property && <div className="flex justify-between border-b border-border/30 pb-1"><span>Age</span><span className="font-medium text-foreground">{property.age_of_property} years</span></div>}
            </div>
          </Card>
        </div>

        {/* Description */}
        {property.description && (
          <div className="px-4 pb-4">
            <Card className="p-4">
              <h3 className="text-sm font-bold mb-2">About this Property</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{property.description}</p>
            </Card>
          </div>
        )}

        {/* Ask Owner - suggested questions */}
        <div className="px-4 pb-4">
          <Card className="p-4 bg-muted/30">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-bold">Got Questions about this property?</h3>
                <p className="text-xs text-primary mt-0.5">Ask the owner directly for quick Answers</p>
              </div>
              <span className="text-2xl">💬</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Input placeholder="Type your question..." value={enquiryMsg} onChange={(e) => setEnquiryMsg(e.target.value)} className="flex-1 h-10 rounded-full text-sm" />
              <Button size="icon" className="h-10 w-10 rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                onClick={handleSendEnquiry}>
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-primary font-medium">Suggested questions</p>
              {suggestedQuestions.map((q) => (
                <button key={q} onClick={() => { setEnquiryMsg(q); }}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg border border-border/50 text-xs hover:bg-secondary/50 transition-colors">
                  {q} <span className="ml-auto text-muted-foreground">+</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">Sending an inquiry means you agree to getting the owner's details</p>
          </Card>
        </div>

        {/* Amenities - NoBroker grid style with icons */}
        {amenities.length > 0 && (
          <div className="px-4 pb-4">
            <Card className="p-4">
              <h3 className="text-sm font-bold mb-1">Amenities</h3>
              <div className="w-12 h-0.5 bg-destructive mb-4" />
              <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                {amenities.map((a: string) => {
                  const IconComp = AMENITY_ICON_MAP[a] || Home;
                  return (
                    <div key={a} className="flex flex-col items-center text-center gap-2">
                      <div className="h-12 w-12 rounded-lg border border-border/50 flex items-center justify-center">
                        <IconComp className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <span className="text-[11px] text-muted-foreground leading-tight">{a}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* Rent Trends */}
        {property.transaction_type === "rent" && (
          <div className="px-4 pb-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold">Rent trends of similar properties</h3>
                <Badge variant="outline" className="text-[10px]">Powered by P4U</Badge>
              </div>
              <div className="w-12 h-0.5 bg-destructive mb-3" />
              <p className="text-xs text-muted-foreground mb-3">Observed from similar rentals</p>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <Badge className="bg-foreground text-background mb-2">Average Rent</Badge>
                <div className="relative h-2 bg-muted rounded-full mt-4 mb-2">
                  <div className="absolute left-[20%] right-[30%] h-full bg-primary rounded-full" />
                  <div className="absolute left-1/2 -translate-x-1/2 -top-5 bg-foreground text-background px-2 py-0.5 rounded text-[10px] font-bold">
                    {formatPrice(property.price)}
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{formatPrice(Math.round(property.price * 0.6))}</span>
                  <span>{formatPrice(Math.round(property.price * 0.8))}</span>
                  <span>{formatPrice(Math.round(property.price * 1.1))}</span>
                  <span>{formatPrice(Math.round(property.price * 1.3))}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Property Insights */}
        <div className="px-4 pb-4">
          <Card className="p-4">
            <h3 className="text-sm font-bold mb-1">P4U Insights</h3>
            <div className="w-12 h-0.5 bg-destructive mb-4" />
            <p className="text-xs text-muted-foreground mb-3">Property Views</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-1">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold">{property.views_count || 297}</p>
                <p className="text-[10px] text-muted-foreground">Unique Views</p>
              </div>
              <div>
                <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-1">
                  <Heart className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold">{property.enquiry_count || 3}</p>
                <p className="text-[10px] text-muted-foreground">ShortLists</p>
              </div>
              <div>
                <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-1">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold">{property.contact_reveals || 1}</p>
                <p className="text-[10px] text-muted-foreground">Contacted</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Neighbourhood */}
        <div className="px-4 pb-4">
          <Card className="p-4">
            <h3 className="text-sm font-bold mb-1">Neighbourhood</h3>
            <div className="w-12 h-0.5 bg-destructive mb-4" />
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-destructive" />
              <span className="text-sm">{property.landmark || property.locality}, {property.city}</span>
            </div>
            <Tabs defaultValue="transit" className="w-full">
              <TabsList className="w-full bg-transparent border-b border-border/30 rounded-none h-auto p-0 gap-0">
                <TabsTrigger value="transit" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs py-2">TRANSIT</TabsTrigger>
                <TabsTrigger value="essentials" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs py-2">ESSENTIALS</TabsTrigger>
                <TabsTrigger value="utility" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs py-2">UTILITY</TabsTrigger>
              </TabsList>
              <TabsContent value="transit" className="space-y-3 pt-3">
                <div>
                  <p className="text-xs text-primary font-semibold mb-1">✈️ Airport</p>
                  <p className="text-sm">{property.city} International Airport</p>
                  <p className="text-xs text-muted-foreground">~45 km | 1 hour 15 mins</p>
                </div>
                <div>
                  <p className="text-xs text-primary font-semibold mb-1">🚆 Railway</p>
                  <p className="text-sm">{property.city} Metro Station</p>
                  <p className="text-xs text-muted-foreground">~3.5 km | 12 mins</p>
                </div>
                <div>
                  <p className="text-xs text-primary font-semibold mb-1">🚌 Bus Stop</p>
                  <p className="text-sm">{property.locality} Bus Stop</p>
                  <p className="text-xs text-muted-foreground">~0.8 km | 3 mins</p>
                </div>
              </TabsContent>
              <TabsContent value="essentials" className="space-y-3 pt-3">
                <div><p className="text-xs text-primary font-semibold mb-1">🏥 Hospital</p><p className="text-sm">Apollo Hospital</p><p className="text-xs text-muted-foreground">~2.1 km | 8 mins</p></div>
                <div><p className="text-xs text-primary font-semibold mb-1">🛒 Grocery</p><p className="text-sm">More Supermarket</p><p className="text-xs text-muted-foreground">~0.5 km | 2 mins</p></div>
                <div><p className="text-xs text-primary font-semibold mb-1">🏫 School</p><p className="text-sm">DPS International School</p><p className="text-xs text-muted-foreground">~1.8 km | 7 mins</p></div>
              </TabsContent>
              <TabsContent value="utility" className="space-y-3 pt-3">
                <div><p className="text-xs text-primary font-semibold mb-1">🏦 Bank</p><p className="text-sm">SBI & HDFC Bank</p><p className="text-xs text-muted-foreground">~0.3 km | 1 min</p></div>
                <div><p className="text-xs text-primary font-semibold mb-1">⛽ Fuel</p><p className="text-sm">HP Petrol Pump</p><p className="text-xs text-muted-foreground">~1.2 km | 5 mins</p></div>
                <div><p className="text-xs text-primary font-semibold mb-1">📮 Post Office</p><p className="text-sm">{property.locality} Post Office</p><p className="text-xs text-muted-foreground">~1.5 km | 6 mins</p></div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Owner Card */}
        <div className="px-4 pb-4">
          <Card className="p-4">
            <h3 className="text-sm font-bold mb-3">Posted by</h3>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{property.user_name?.charAt(0) || "U"}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{property.user_name || "Property Owner"}</p>
                <p className="text-xs text-muted-foreground capitalize">{property.posted_by} • Member since 2024</p>
              </div>
              {property.is_verified && <Badge className="bg-success/10 text-success text-[10px]"><Shield className="h-3 w-3 mr-0.5" />Verified</Badge>}
            </div>
          </Card>
        </div>

        {/* EMI Calculator for sale */}
        {property.transaction_type === "sale" && (
          <div className="px-4 pb-4">
            <EMICalculator price={property.price} />
          </div>
        )}

        {/* Report */}
        <div className="px-4 pb-4">
          <Card className="p-4 border-destructive/20 bg-destructive/5">
            <h3 className="text-sm font-bold mb-2 flex items-center gap-1"><Flag className="h-4 w-4 text-destructive" /> Report what wasn't correct in this property</h3>
            <div className="flex flex-wrap gap-2">
              {["Listed by Broker", "Rented Out", "Wrong Info"].map(r => (
                <button key={r} onClick={() => { toast.success("Report submitted. Thank you!"); }}
                  className="px-3 py-1.5 rounded-lg border border-border/50 text-xs hover:bg-secondary transition-colors">
                  {r}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Similar Properties */}
        {similarProps.length > 0 && (
          <div className="px-4 pb-4">
            <h3 className="text-base font-bold mb-3">Similar Properties</h3>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {similarProps.map((sp: any, i: number) => {
                const spImages = Array.isArray(sp.images) && sp.images.length > 0 ? sp.images : PROPERTY_IMAGES;
                return (
                  <Link key={sp.id} to={`/app/find-home/${sp.id}`} className="shrink-0 w-48 rounded-xl overflow-hidden border border-border/50 bg-card hover:shadow-md transition-all">
                    <div className="relative h-32">
                      <img src={spImages[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <button className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/80 flex items-center justify-center" onClick={(e) => { e.preventDefault(); toast.success("Saved!"); }}>
                        <Heart className="h-3.5 w-3.5" />
                      </button>
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        {sp.security_deposit && <Badge className="bg-black/60 text-white text-[9px]">Deposit: {formatPrice(sp.security_deposit)}</Badge>}
                        {sp.area_sqft && <Badge className="bg-black/60 text-white text-[9px]">{sp.area_sqft} sqft</Badge>}
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-bold truncate">{sp.title}</p>
                      <p className="text-sm font-bold text-primary">{formatPrice(sp.price)}</p>
                    </div>
                    <button className="w-full py-2 bg-destructive text-white text-xs font-medium hover:bg-destructive/90 transition-colors">
                      Contact Owner
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Fixed Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/30 p-3 md:relative md:border-0 md:bg-transparent md:px-4 md:pb-6">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Button variant="outline" className="flex-1 h-11 gap-2 rounded-xl" onClick={() => setShowContact(true)}>
              Contact
            </Button>
            <Button className="flex-1 h-11 gap-2 rounded-xl bg-destructive hover:bg-destructive/90 text-white" onClick={() => setShowSchedule(true)}>
              Schedule Visit
            </Button>
          </div>
        </div>
      </div>

      {/* Contact Dialog */}
      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Contact Owner</DialogTitle>
          <div className="space-y-3 pt-2">
            <Textarea placeholder="Hi, I'm interested in this property..." value={enquiryMsg} onChange={(e) => setEnquiryMsg(e.target.value)} rows={3} />
            <Button className="w-full" onClick={handleSendEnquiry}>Send Enquiry</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Visit */}
      <ScheduleVisitSheet open={showSchedule} onClose={() => setShowSchedule(false)} property={property} onSubmit={handleScheduleVisit} />

      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Report Listing</DialogTitle>
          <div className="space-y-2 pt-2">
            {["Fake listing", "Wrong price", "Already sold/rented", "Spam", "Other"].map((reason) => (
              <button key={reason} onClick={() => { toast.success("Report submitted"); setShowReport(false); }}
                className="w-full text-left px-4 py-2.5 rounded-lg border border-border/50 text-sm hover:bg-secondary transition-colors">
                {reason}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Gallery */}
      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-3xl p-0">
          <DialogTitle className="sr-only">Image Gallery</DialogTitle>
          <div className="relative">
            <img src={images[imgIdx]} alt="" className="w-full h-auto max-h-[80vh] object-contain bg-black" />
            <button onClick={() => setShowGallery(false)} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIdx((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/80 flex items-center justify-center">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={() => setImgIdx((prev) => (prev + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/80 flex items-center justify-center">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            {/* Thumbnail strip */}
            <div className="flex gap-1 p-2 bg-black/80 overflow-x-auto">
              {images.map((img: string, i: number) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`shrink-0 h-14 w-20 rounded overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-primary' : 'border-transparent opacity-60'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
