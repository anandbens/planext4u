import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Upload, X, Check, Home, MapPin, Building2, IndianRupee, Image, Radio, Snowflake, CloudRain, Wifi, Warehouse, Flame, Siren, Trees, BatteryCharging, Baby, ShieldCheck, Dumbbell, ParkingCircle, DoorOpen, Waves, Cctv, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const AMENITIES_WITH_ICONS: { name: string; icon: React.ComponentType<any> }[] = [
  { name: "Intercom", icon: Radio }, { name: "Air Conditioner", icon: Snowflake },
  { name: "Rain Water Harvesting", icon: CloudRain }, { name: "Internet Provider", icon: Wifi },
  { name: "Lift", icon: Building2 }, { name: "Club House", icon: Warehouse },
  { name: "Gas Pipeline", icon: Flame }, { name: "Fire Safety", icon: Siren },
  { name: "Park", icon: Trees }, { name: "Power Backup", icon: BatteryCharging },
  { name: "Children Play Area", icon: Baby }, { name: "Security Guard", icon: ShieldCheck },
  { name: "Gym", icon: Dumbbell }, { name: "Swimming Pool", icon: Waves },
  { name: "CCTV", icon: Cctv }, { name: "Visitor Parking", icon: ParkingCircle },
  { name: "Servant Room", icon: DoorOpen }, { name: "24x7 Water", icon: Droplets },
  { name: "Gated Community", icon: Home },
];

const STEPS = [
  { icon: Home, label: "Basic Info" },
  { icon: MapPin, label: "Location" },
  { icon: Building2, label: "Details" },
  { icon: IndianRupee, label: "Pricing" },
  { icon: Image, label: "Media" },
];

export default function PostPropertyPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    transaction_type: "rent", property_type: "apartment", posted_by: "owner",
    city: "", locality: "", landmark: "", pincode: "",
    bhk: "", area_sqft: "", floor_number: "", total_floors: "",
    age_of_property: "", facing: "", furnishing: "unfurnished", parking: "none",
    availability_date: "",
    amenities: [] as string[],
    price: "", maintenance_charges: "", security_deposit: "",
    price_negotiable: false, preferred_tenant: "any",
    title: "", description: "",
    images: [] as string[],
    video_url: "", virtual_tour_url: "",
    pg_room_type: "", pg_gender_preference: "", pg_meals: [] as string[],
  });

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const toggleAmenity = (a: string) => update("amenities", form.amenities.includes(a) ? form.amenities.filter(x => x !== a) : [...form.amenities, a]);

  if (!customerUser) {
    return (
      <CustomerLayout>
        <div className="text-center py-20 px-4">
          <Home className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Login Required</h2>
          <p className="text-sm text-muted-foreground mt-1">Please login to post your property</p>
          <Button className="mt-4" onClick={() => navigate("/app/login")}>Login / Register</Button>
        </div>
      </CustomerLayout>
    );
  }

  const handleSubmit = async (asDraft: boolean) => {
    setSubmitting(true);
    try {
      const id = `PROP-${Date.now()}`;
      const { error } = await supabase.from("properties" as any).insert({
        id,
        user_id: customerUser.customer_id || customerUser.id,
        user_name: customerUser.name,
        transaction_type: form.transaction_type,
        property_type: form.property_type,
        posted_by: form.posted_by,
        title: form.title || `${form.bhk ? form.bhk + " BHK " : ""}${form.property_type.replace("_", " ")} in ${form.locality}`,
        description: form.description,
        city: form.city, locality: form.locality, landmark: form.landmark, pincode: form.pincode,
        bhk: form.bhk, area_sqft: parseFloat(form.area_sqft) || 0,
        floor_number: parseInt(form.floor_number) || 0, total_floors: parseInt(form.total_floors) || 0,
        age_of_property: form.age_of_property, facing: form.facing || null,
        furnishing: form.furnishing, parking: form.parking,
        amenities: form.amenities,
        price: parseFloat(form.price) || 0,
        maintenance_charges: parseFloat(form.maintenance_charges) || 0,
        security_deposit: parseFloat(form.security_deposit) || 0,
        price_negotiable: form.price_negotiable, preferred_tenant: form.preferred_tenant,
        images: form.images, video_url: form.video_url, virtual_tour_url: form.virtual_tour_url,
        status: asDraft ? "draft" : "submitted",
        pg_room_type: form.pg_room_type, pg_gender_preference: form.pg_gender_preference,
        pg_meals_included: form.pg_meals,
      } as any);
      if (error) throw error;
      toast.success(asDraft ? "Saved as draft!" : "Submitted for review!");
      navigate("/app/find-home/my-properties");
    } catch (err: any) {
      toast.error(err.message || "Failed to post");
    } finally { setSubmitting(false); }
  };

  const canProceed = () => {
    if (step === 0) return !!form.transaction_type && !!form.property_type;
    if (step === 1) return !!form.city && !!form.locality;
    if (step === 3) return !!form.price;
    return true;
  };

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto pb-24 md:pb-6">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background px-4 py-3 flex items-center gap-3 border-b border-border/30">
          <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} className="h-9 w-9 rounded-full border border-border/50 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-bold flex-1">Post Property</h1>
          <span className="text-xs text-muted-foreground">Step {step + 1} of 5</span>
        </div>

        {/* Progress */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${i < step ? "bg-success text-success-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className="text-[9px] font-medium text-muted-foreground hidden sm:block">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex mt-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full mx-0.5 ${i <= step ? "bg-primary" : "bg-secondary"}`} />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <Label className="text-sm font-semibold">Transaction Type</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {["rent", "sale", "lease", "pg"].map(t => (
                        <button key={t} onClick={() => update("transaction_type", t)}
                          className={`p-3 rounded-xl border text-center text-sm font-medium transition-all capitalize
                            ${form.transaction_type === t ? "border-primary bg-primary/5 text-primary" : "border-border/50 hover:border-primary/30"}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Property Type</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[["apartment", "Apartment"], ["independent_house", "Independent House"], ["villa", "Villa"], ["plot", "Plot"], ["pg_hostel", "PG/Hostel"], ["commercial_office", "Office"], ["commercial_shop", "Shop"], ["commercial_warehouse", "Warehouse"]].map(([k, v]) => (
                        <button key={k} onClick={() => update("property_type", k)}
                          className={`p-3 rounded-xl border text-sm font-medium transition-all
                            ${form.property_type === k ? "border-primary bg-primary/5 text-primary" : "border-border/50 hover:border-primary/30"}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Posted By</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {["owner", "agent", "builder"].map(t => (
                        <button key={t} onClick={() => update("posted_by", t)}
                          className={`p-3 rounded-xl border text-center text-sm font-medium transition-all capitalize
                            ${form.posted_by === t ? "border-primary bg-primary/5 text-primary" : "border-border/50 hover:border-primary/30"}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div><Label>City</Label><Input value={form.city} onChange={e => update("city", e.target.value)} placeholder="e.g. Coimbatore" className="mt-1" /></div>
                  <div><Label>Locality / Area</Label><Input value={form.locality} onChange={e => update("locality", e.target.value)} placeholder="e.g. RS Puram" className="mt-1" /></div>
                  <div><Label>Landmark</Label><Input value={form.landmark} onChange={e => update("landmark", e.target.value)} placeholder="Near..." className="mt-1" /></div>
                  <div><Label>Pincode</Label><Input value={form.pincode} onChange={e => update("pincode", e.target.value)} placeholder="641002" className="mt-1" /></div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label>BHK</Label>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {["studio", "1", "2", "3", "4", "5+"].map(b => (
                        <button key={b} onClick={() => update("bhk", b)}
                          className={`px-4 py-2 rounded-full border text-sm font-medium transition-all
                            ${form.bhk === b ? "border-primary bg-primary/5 text-primary" : "border-border/50"}`}>
                          {b === "studio" ? "Studio" : `${b} BHK`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Area (sq.ft)</Label><Input type="number" value={form.area_sqft} onChange={e => update("area_sqft", e.target.value)} className="mt-1" /></div>
                    <div><Label>Floor No.</Label><Input type="number" value={form.floor_number} onChange={e => update("floor_number", e.target.value)} className="mt-1" /></div>
                    <div><Label>Total Floors</Label><Input type="number" value={form.total_floors} onChange={e => update("total_floors", e.target.value)} className="mt-1" /></div>
                    <div><Label>Age</Label>
                      <Select value={form.age_of_property} onValueChange={v => update("age_of_property", v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {["0-1", "1-3", "3-5", "5-10", "10+"].map(a => <SelectItem key={a} value={a}>{a} years</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Facing</Label>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {["north", "south", "east", "west", "north_east", "north_west", "south_east", "south_west"].map(f => (
                        <button key={f} onClick={() => update("facing", f)}
                          className={`px-3 py-1.5 rounded-full border text-xs font-medium capitalize transition-all
                            ${form.facing === f ? "border-primary bg-primary/5 text-primary" : "border-border/50"}`}>
                          {f.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Furnishing</Label>
                    <div className="flex gap-2 mt-1">
                      {[["unfurnished", "Unfurnished"], ["semi_furnished", "Semi"], ["fully_furnished", "Fully"]].map(([k, v]) => (
                        <button key={k} onClick={() => update("furnishing", k)}
                          className={`flex-1 p-2 rounded-xl border text-xs font-medium transition-all
                            ${form.furnishing === k ? "border-primary bg-primary/5 text-primary" : "border-border/50"}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Parking</Label>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {[["none", "None"], ["two_wheeler", "2-Wheeler"], ["four_wheeler", "4-Wheeler"], ["both", "Both"]].map(([k, v]) => (
                        <button key={k} onClick={() => update("parking", k)}
                          className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all
                            ${form.parking === k ? "border-primary bg-primary/5 text-primary" : "border-border/50"}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Amenities</Label>
                    <div className="grid grid-cols-4 gap-3 mt-2">
                      {AMENITIES_WITH_ICONS.map(({ name, icon: IconComp }) => (
                        <button key={name} onClick={() => toggleAmenity(name)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all
                            ${form.amenities.includes(name) ? "border-primary bg-primary/5 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/30"}`}>
                          <IconComp className="h-5 w-5" />
                          <span className="text-center text-[10px] leading-tight">{name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div><Label>{form.transaction_type === "rent" ? "Expected Rent (₹/month)" : "Expected Price (₹)"}</Label>
                    <Input type="number" value={form.price} onChange={e => update("price", e.target.value)} placeholder="Enter amount" className="mt-1" /></div>
                  {form.transaction_type === "rent" && (
                    <>
                      <div><Label>Maintenance (₹/month)</Label><Input type="number" value={form.maintenance_charges} onChange={e => update("maintenance_charges", e.target.value)} className="mt-1" /></div>
                      <div><Label>Security Deposit (₹)</Label><Input type="number" value={form.security_deposit} onChange={e => update("security_deposit", e.target.value)} className="mt-1" /></div>
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <Label>Price Negotiable</Label>
                    <Switch checked={form.price_negotiable} onCheckedChange={v => update("price_negotiable", v)} />
                  </div>
                  <div>
                    <Label>Preferred Tenant</Label>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {["any", "family", "bachelors", "female", "company"].map(t => (
                        <button key={t} onClick={() => update("preferred_tenant", t)}
                          className={`px-3 py-1.5 rounded-full border text-xs font-medium capitalize transition-all
                            ${form.preferred_tenant === t ? "border-primary bg-primary/5 text-primary" : "border-border/50"}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div><Label>Property Title</Label>
                    <Input value={form.title} onChange={e => update("title", e.target.value)}
                      placeholder={`${form.bhk ? form.bhk + " BHK " : ""}${form.property_type.replace("_", " ")} in ${form.locality || "your locality"}`} className="mt-1" /></div>
                  <div><Label>Description</Label>
                    <Textarea value={form.description} onChange={e => update("description", e.target.value)}
                      placeholder="Describe your property..." rows={5} className="mt-1" /></div>
                  <div><Label>Image URLs (one per line)</Label>
                    <Textarea value={form.images.join("\n")} onChange={e => update("images", e.target.value.split("\n").filter(Boolean))}
                      placeholder="Paste image URLs" rows={3} className="mt-1" />
                    <p className="text-[10px] text-muted-foreground mt-1">Upload images to any hosting service and paste the URLs here</p></div>
                  <div><Label>Video URL (optional)</Label>
                    <Input value={form.video_url} onChange={e => update("video_url", e.target.value)} placeholder="YouTube or Google Drive link" className="mt-1" /></div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="px-4 pb-6 flex gap-3">
          {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">Back</Button>}
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="flex-1">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <div className="flex gap-2 flex-1">
              <Button variant="outline" onClick={() => handleSubmit(true)} disabled={submitting} className="flex-1">Save Draft</Button>
              <Button onClick={() => handleSubmit(false)} disabled={submitting} className="flex-1">
                {submitting ? "Submitting..." : "Submit for Review"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
