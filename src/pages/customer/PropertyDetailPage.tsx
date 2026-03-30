import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, Share2, Shield, MapPin, Bed, Bath, Maximize2, Building2, Compass, Car, Calendar, Phone, MessageCircle, Flag, ChevronLeft, ChevronRight, Star, Clock, Calculator, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartment", independent_house: "Independent House", villa: "Villa",
  plot: "Plot", pg_hostel: "PG/Hostel", commercial_office: "Office",
  commercial_shop: "Shop", commercial_warehouse: "Warehouse", commercial_showroom: "Showroom",
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
  const totalPayment = emi * n;
  const totalInterest = totalPayment - P;

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
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data } = await supabase.from("properties" as any).select("*").eq("id", id).single();
      return data as any;
    },
    enabled: !!id,
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

  const images: string[] = Array.isArray(property.images) ? property.images : [];
  const amenities: string[] = Array.isArray(property.amenities) ? property.amenities : [];
  if (images.length === 0) images.push("/images/properties/apartment-2bhk.jpg");

  const handleSendEnquiry = async () => {
    if (!customerUser) { toast.error("Please login first"); navigate("/app/login"); return; }
    if (!enquiryMsg.trim()) { toast.error("Please enter a message"); return; }
    toast.success("Enquiry sent to the owner!");
    setShowContact(false);
    setEnquiryMsg("");
  };

  const handleScheduleVisit = async () => {
    if (!customerUser) { toast.error("Please login first"); navigate("/app/login"); return; }
    if (!visitDate || !visitTime) { toast.error("Please select date and time"); return; }
    toast.success("Visit request sent!");
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

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto pb-24 md:pb-6">
        {/* Back + Actions */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between md:relative md:bg-transparent">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-card border border-border/50 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-2">
            <button onClick={handleShare} className="h-9 w-9 rounded-full bg-card border border-border/50 flex items-center justify-center">
              <Share2 className="h-4 w-4" />
            </button>
            <button onClick={() => toast.info("Saved!")} className="h-9 w-9 rounded-full bg-card border border-border/50 flex items-center justify-center">
              <Heart className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="relative px-4">
          <div className="rounded-2xl overflow-hidden cursor-pointer" onClick={() => setShowGallery(true)}>
            <AnimatePresence mode="wait">
              <motion.img key={imgIdx} src={images[imgIdx]} alt={property.title}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-full h-56 sm:h-72 md:h-96 object-cover" />
            </AnimatePresence>
          </div>
          {images.length > 1 && (
            <>
              <button onClick={() => setImgIdx((prev) => (prev - 1 + images.length) % images.length)}
                className="absolute left-6 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setImgIdx((prev) => (prev + 1) % images.length)}
                className="absolute right-6 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center">
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-card/80 px-2 py-1 rounded-full text-xs font-medium">
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

        {/* Overview Grid */}
        <div className="px-4 py-4">
          <Card className="p-4">
            <h3 className="text-sm font-bold mb-3">Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {property.bhk && (
                <div className="flex items-center gap-2">
                  <Bed className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">BHK</p><p className="text-sm font-medium">{property.bhk === "studio" ? "Studio" : `${property.bhk} BHK`}</p></div>
                </div>
              )}
              {property.area_sqft > 0 && (
                <div className="flex items-center gap-2">
                  <Maximize2 className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">Area</p><p className="text-sm font-medium">{property.area_sqft} sq.ft</p></div>
                </div>
              )}
              {property.floor_number > 0 && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">Floor</p><p className="text-sm font-medium">{property.floor_number} of {property.total_floors}</p></div>
                </div>
              )}
              {property.facing && (
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">Facing</p><p className="text-sm font-medium capitalize">{property.facing.replace("_", " ")}</p></div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div><p className="text-xs text-muted-foreground">Furnishing</p><p className="text-sm font-medium capitalize">{property.furnishing?.replace("_", " ")}</p></div>
              </div>
              {property.parking && property.parking !== "none" && (
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">Parking</p><p className="text-sm font-medium capitalize">{property.parking.replace("_", " ")}</p></div>
                </div>
              )}
              {property.age_of_property && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">Age</p><p className="text-sm font-medium">{property.age_of_property} yrs</p></div>
                </div>
              )}
              {property.preferred_tenant && property.preferred_tenant !== "any" && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">Preferred</p><p className="text-sm font-medium capitalize">{property.preferred_tenant}</p></div>
                </div>
              )}
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

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="px-4 pb-4">
            <Card className="p-4">
              <h3 className="text-sm font-bold mb-3">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {amenities.map((a: string) => (
                  <span key={a} className="px-3 py-1.5 rounded-full bg-secondary text-xs font-medium">{a}</span>
                ))}
              </div>
            </Card>
          </div>
        )}

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
        <div className="px-4 pb-4 text-center">
          <button onClick={() => setShowReport(true)} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 mx-auto">
            <Flag className="h-3 w-3" /> Report this listing
          </button>
        </div>

        {/* Fixed Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/30 p-3 md:relative md:border-0 md:bg-transparent md:px-4 md:pb-6">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Button variant="outline" className="flex-1 h-11 gap-2 rounded-xl" onClick={() => setShowContact(true)}>
              <Phone className="h-4 w-4" /> Contact Owner
            </Button>
            <Button className="flex-1 h-11 gap-2 rounded-xl" onClick={() => setShowSchedule(true)}>
              <Calendar className="h-4 w-4" /> Schedule Visit
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

      {/* Schedule Visit Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Schedule a Visit</DialogTitle>
          <div className="space-y-3 pt-2">
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
            <div className="flex gap-2 flex-wrap">
              {["10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"].map((t) => (
                <button key={t} onClick={() => setVisitTime(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                    ${visitTime === t ? "bg-primary text-primary-foreground border-primary" : "border-border/50"}`}>{t}</button>
              ))}
            </div>
            <Button className="w-full" onClick={handleScheduleVisit}>Request Visit</Button>
          </div>
        </DialogContent>
      </Dialog>

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
          </div>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
