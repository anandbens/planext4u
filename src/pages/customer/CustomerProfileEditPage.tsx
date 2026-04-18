import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Save, Plus, Trash2, MapPin, Check, Edit, Navigation, Loader2, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { logActivity } from "@/lib/activity-log";
import { supabase } from "@/integrations/supabase/client";
import { compressToWebP } from "@/lib/webp-compress";
import { useAuth } from "@/lib/auth";

interface SavedAddress {
  id: string; label: string; type: string; address_line: string; city: string; pincode: string; is_default: boolean;
}

interface Occupation {
  id: string; name: string;
}

// Google Maps key loaded from platform_variables with fallback
const FALLBACK_MAPS_KEY = "AIzaSyAoz0ZK26oE1qZSKK8pG1Ebh9sTTeaOl7M";
let CACHED_MAPS_KEY: string | null = null;

const getGoogleMapsKey = async (): Promise<string> => {
  if (CACHED_MAPS_KEY) return CACHED_MAPS_KEY;
  try {
    const { data } = await supabase.from('platform_variables').select('value').eq('key', 'google_maps_api_key').single();
    if (data?.value) { CACHED_MAPS_KEY = data.value; return data.value; }
  } catch {}
  CACHED_MAPS_KEY = FALLBACK_MAPS_KEY;
  return FALLBACK_MAPS_KEY;
};

export default function CustomerProfileEditPage() {
  const navigate = useNavigate();
  const { customerUser, isLoading: authLoading } = useAuth();
  const customerId = customerUser?.customer_id || customerUser?.id || '';
  const photoRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: "", email: "", mobile: "", dob: "", gender: "", occupation: "", about: "" });
  const [profilePhoto, setProfilePhoto] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [mapRef, setMapRef] = useState<any>(null);
  const [markerRef, setMarkerRef] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);

  // Address map modal state
  const [showMapModal, setShowMapModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapAddress, setMapAddress] = useState<{ lat: number; lng: number; formatted: string; area: string; city: string; pincode: string; street: string; district: string; state: string; country: string } | null>(null);
  const [addrForm, setAddrForm] = useState({ label: "Home", type: "home", apartment: "", houseNo: "", landmark: "", street: "" });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Wait for the auth session to finish restoring on cold reload — RLS
    // otherwise blocks the read while auth.uid() is still null and the form
    // ends up bound to stale/blank values.
    if (!authLoading && customerId) {
      loadProfile();
      loadAddresses();
      loadOccupations();
    }
  }, [customerId, authLoading]);

  const cleanEmail = (email: string | null | undefined): string => {
    if (!email || email.includes('@phone.planext4u.local')) return '';
    return email;
  };

  const loadProfile = async () => {
    setProfileLoading(true);
    const { data } = await supabase.from('customers').select('*').eq('id', customerId).single();
    if (data) {
      setForm({
        name: data.name || "", email: cleanEmail(data.email), mobile: data.mobile || "",
        dob: data.dob || "", gender: (data as any).gender || "", occupation: data.occupation || "",
        about: (data as any).about || "",
      });
      setProfilePhoto((data as any).profile_photo || "");
    }
    setProfileLoading(false);
  };

  const loadAddresses = async () => {
    const { data } = await supabase.from('customer_addresses').select('*').eq('customer_id', customerId).order('is_default', { ascending: false });
    if (data) setAddresses(data as SavedAddress[]);
  };

  const loadOccupations = async () => {
    const { data } = await supabase.from('occupations').select('id, name').eq('status', 'active').order('name');
    if (data) setOccupations(data);
  };

  // Profile completeness calculation
  const completeness = (() => {
    let score = 0;
    if (form.mobile) score += 20; // Mobile verified
    if (form.name && form.name.length >= 2) score += 10; // Name
    if (profilePhoto) score += 15; // Profile photo
    if (form.about && form.about.length > 0) score += 10; // About
    if (addresses.length > 0) score += 20; // Address
    // KYC is checked separately on KYC page, add 15% placeholder
    // We'll check from the customer record
    return Math.min(score, 100);
  })();

  const validateForm = (): string | null => {
    if (!form.name.trim() || form.name.length < 2) return "Name must be at least 2 characters";
    if (form.name.length > 100) return "Name must be under 100 characters";
    if (!/^[a-zA-Z\s]+$/.test(form.name)) return "Name can only contain letters and spaces";
    if (!form.mobile || !/^\d{10}$/.test(form.mobile.replace(/\+91/g, ''))) return "Valid 10-digit mobile required";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) return "Valid email is required";
    if (!form.dob) return "Date of birth is required";
    if (form.dob) {
      const dob = new Date(form.dob);
      const maxDate = new Date(2016, 11, 31);
      if (dob > maxDate) return "Date of birth must be on or before December 31, 2016";
    }
    if (form.about && form.about.length > 1000) return "About must be under 1000 characters";
    return null;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) { toast.error("Only JPG/PNG allowed"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2MB"); return; }

    setPhotoUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please log in"); return; }
      const { blob, contentType } = await compressToWebP(file);
      const fileName = `${user.id}/profile-${Date.now()}.webp`;
      const { error } = await supabase.storage.from('classified-images').upload(fileName, blob, { contentType, upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('classified-images').getPublicUrl(fileName);
      setProfilePhoto(urlData.publicUrl);
      toast.success("Photo uploaded!");
    } catch { toast.error("Upload failed"); }
    setPhotoUploading(false);
    if (e.target) e.target.value = "";
  };

  const handleSave = async () => {
    const err = validateForm();
    if (err) { toast.error(err); return; }
    
    setLoading(true);
    try {
      const cleanMobile = form.mobile.replace(/\+91/g, '').replace(/\s/g, '');

      const updateData: any = {
        name: form.name, email: form.email, mobile: cleanMobile, occupation: form.occupation,
        gender: form.gender, about: form.about, profile_photo: profilePhoto,
        profile_completeness: completeness,
      };
      if (form.dob) updateData.dob = form.dob;
      const { error } = await supabase.from('customers').update(updateData).eq('id', customerId);
      if (error) {
        if (error.message.includes('customers_mobile_unique')) {
          toast.error("This phone number is already used by another account");
        } else {
          toast.error("Failed to save: " + error.message);
        }
        setLoading(false);
        return;
      }
      logActivity('profile_update', `Profile updated: ${form.name}`);
      toast.success("Profile updated successfully!");
      navigate("/app/profile");
    } catch (saveErr: any) {
      toast.error(saveErr.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  // --- Map & Address Logic ---
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const mapsKey = await getGoogleMapsKey();
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsKey}`);
      const data = await res.json();
      if (data.status === "OK" && data.results.length > 0) {
        const result = data.results[0];
        const components = result.address_components || [];
        const get = (type: string) => components.find((c: any) => c.types.includes(type))?.long_name || "";
        const area = get("sublocality_level_1") || get("sublocality") || get("neighborhood") || get("locality");
        const city = get("locality") || get("administrative_area_level_2") || "";
        const pincode = get("postal_code") || "";
        const streetName = get("route") || "";
        const districtName = get("administrative_area_level_2") || "";
        const stateName = get("administrative_area_level_1") || "";
        const countryName = get("country") || "";
        const streetNumber = get("street_number") || get("premise") || get("subpremise") || "";
        setMapAddress({ lat, lng, formatted: result.formatted_address || "", area, city, pincode, street: streetName, district: districtName, state: stateName, country: countryName });
        setAddrForm(prev => ({ ...prev, apartment: area, street: streetName, houseNo: streetNumber || prev.houseNo }));
      } else {
        setMapAddress({ lat, lng, formatted: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, area: "", city: "", pincode: "", street: "", district: "", state: "", country: "" });
      }
    } catch {
      setMapAddress({ lat, lng, formatted: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, area: "", city: "", pincode: "", street: "", district: "", state: "", country: "" });
    }
  }, []);

  const initMap = useCallback((lat: number, lng: number) => {
    const mapContainer = document.getElementById('addr-map-container');
    if (!mapContainer || !(window as any).google?.maps) return;
    const map = new (window as any).google.maps.Map(mapContainer, {
      center: { lat, lng }, zoom: 16, disableDefaultUI: true, zoomControl: true,
      gestureHandling: 'greedy',
    });
    const marker = new (window as any).google.maps.Marker({
      position: { lat, lng }, map, draggable: true,
      animation: (window as any).google.maps.Animation.DROP,
    });
    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      reverseGeocode(pos.lat(), pos.lng());
    });
    map.addListener('click', (e: any) => {
      marker.setPosition(e.latLng);
      reverseGeocode(e.latLng.lat(), e.latLng.lng());
    });
    setMapRef(map);
    setMarkerRef(marker);
  }, [reverseGeocode]);

  const loadGoogleMapsScript = useCallback(async (): Promise<boolean> => {
    if ((window as any).google?.maps) return true;
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) { return new Promise(r => existing.addEventListener('load', () => r(true))); }
    const mapsKey = await getGoogleMapsKey();
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places`;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }, []);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await reverseGeocode(latitude, longitude);
        const loaded = await loadGoogleMapsScript();
        if (loaded) initMap(latitude, longitude);
        setLocating(false);
      },
      () => { setLocating(false); toast.error("Could not get location"); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [reverseGeocode, initMap, loadGoogleMapsScript]);

  const handleSearchMap = async () => {
    if (!searchQuery.trim()) return;
    setLocating(true);
    try {
      const mapsKey = await getGoogleMapsKey();
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${mapsKey}`);
      const data = await res.json();
      if (data.status === "OK" && data.results.length > 0) {
        const r = data.results[0];
        const lat = r.geometry.location.lat;
        const lng = r.geometry.location.lng;
        await reverseGeocode(lat, lng);
        const loaded = await loadGoogleMapsScript();
        if (loaded) {
          if (mapRef && markerRef) {
            const pos = new (window as any).google.maps.LatLng(lat, lng);
            mapRef.setCenter(pos);
            markerRef.setPosition(pos);
          } else {
            initMap(lat, lng);
          }
        }
      } else { toast.error("Location not found"); }
    } catch { toast.error("Search failed"); }
    finally { setLocating(false); }
  };

  const openAddAddress = () => {
    setEditingAddress(null);
    setAddrForm({ label: "Home", type: "home", apartment: "", houseNo: "", landmark: "", street: "" });
    setMapAddress(null); setMapRef(null); setMarkerRef(null); setSearchQuery("");
    setShowMapModal(true);
    setTimeout(() => getCurrentLocation(), 500);
  };

  const openEditAddress = (addr: SavedAddress) => {
    setEditingAddress(addr);
    setAddrForm({ label: addr.label, type: addr.type, apartment: addr.address_line, houseNo: "", landmark: "", street: "" });
    setMapAddress(null); setMapRef(null); setMarkerRef(null); setSearchQuery(addr.address_line);
    setShowMapModal(true);
    setTimeout(async () => {
      try {
        const mapsKey = await getGoogleMapsKey();
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr.address_line + ", " + addr.city)}&key=${mapsKey}`);
        const data = await res.json();
        if (data.status === "OK" && data.results.length > 0) {
          const r = data.results[0];
          await reverseGeocode(r.geometry.location.lat, r.geometry.location.lng);
          const loaded = await loadGoogleMapsScript();
          if (loaded) initMap(r.geometry.location.lat, r.geometry.location.lng);
        }
      } catch {}
    }, 500);
  };

  const saveAddress = async () => {
    if (!addrForm.apartment.trim()) { toast.error("Please enter apartment/road/area"); return; }
    if (!addrForm.houseNo.trim()) { toast.error("Please enter house/flat/block number"); return; }
    const addressLine = [addrForm.houseNo, addrForm.street, addrForm.apartment, addrForm.landmark].filter(Boolean).join(", ");
    const city = mapAddress?.city || "";
    const pincode = mapAddress?.pincode || "";

    const lat = mapAddress?.lat || 0;
    const lng = mapAddress?.lng || 0;

    if (editingAddress) {
      await supabase.from('customer_addresses').update({
        label: addrForm.label, type: addrForm.type, address_line: addressLine, city, pincode,
        latitude: lat, longitude: lng,
      } as any).eq('id', editingAddress.id);
      toast.success("Address updated!");
    } else {
      const isFirst = addresses.length === 0;
      await supabase.from('customer_addresses').insert({
        customer_id: customerId, label: addrForm.label, type: addrForm.type,
        address_line: addressLine, city, pincode, is_default: isFirst,
        latitude: lat, longitude: lng,
      } as any);
      toast.success("Address added!");
    }
    setShowMapModal(false);
    setEditingAddress(null);
    loadAddresses();
  };

  const deleteAddress = async (id: string) => {
    await supabase.from('customer_addresses').delete().eq('id', id);
    toast.success("Address removed");
    loadAddresses();
  };

  const setDefault = async (id: string) => {
    await supabase.from('customer_addresses').update({ is_default: false }).eq('customer_id', customerId);
    await supabase.from('customer_addresses').update({ is_default: true }).eq('id', id);
    toast.success("Default address updated");
    loadAddresses();
  };

  // Max DOB: must be on or before Dec 31, 2016
  const maxDob = "2016-12-31";

  if (profileLoading) {
    return <CustomerLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></CustomerLayout>;
  }

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-lg font-bold">Edit Profile</h1>
        </div>

        {/* Profile Completeness */}
        <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/app/kyc")}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Profile Completeness</p>
            <span className="text-sm font-bold text-primary">{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {completeness < 50 ? "Complete your profile & KYC for better experience" :
             completeness < 80 ? "Almost there! Complete KYC verification" : "Great! Your profile is well set up"}
          </p>
          {completeness < 100 && <p className="text-xs text-primary mt-1 font-medium">Tap to complete KYC verification →</p>}
        </Card>

        {/* Profile Photo */}
        <div className="flex justify-center">
          <div className="relative">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="h-24 w-24 rounded-full object-cover border-2 border-primary/20" />
            ) : (
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                {form.name.charAt(0) || <User className="h-10 w-10" />}
              </div>
            )}
            <button
              onClick={() => photoRef.current?.click()}
              disabled={photoUploading}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
            >
              {photoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={photoRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handlePhotoUpload} />
          </div>
        </div>

        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-bold">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name *</label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-11" maxLength={100} placeholder="Letters and spaces only" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
              <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-11" type="email" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Mobile *</label>
              <Input value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10)})} className="h-11" type="tel" maxLength={10} inputMode="numeric" placeholder="10-digit mobile number" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Date of Birth *</label>
              <Input value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} className="h-11" type="date" max={maxDob} />
              <p className="text-[10px] text-muted-foreground mt-0.5">Date of birth must be on or before Dec 31, 2016</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Gender</label>
              <Select value={form.gender} onValueChange={v => setForm({...form, gender: v})}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Occupation</label>
              <Select value={form.occupation} onValueChange={(val) => setForm({...form, occupation: val})}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select occupation" /></SelectTrigger>
                <SelectContent>
                  {occupations.map(occ => (
                    <SelectItem key={occ.id} value={occ.name}>{occ.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">About</label>
            <RichTextEditor value={form.about} onChange={(v) => setForm({...form, about: v})} placeholder="Tell us about yourself (max 1000 chars)" minHeight="100px" compact />
            <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{form.about.length}/1000</p>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Saved Addresses</h2>
            <Button variant="outline" size="sm" className="text-xs gap-1 h-8" onClick={openAddAddress}>
              <Plus className="h-3 w-3" /> Add Address
            </Button>
          </div>
          {addresses.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No saved addresses.</p>}
          <div className="space-y-3">
            {addresses.map(addr => (
              <div key={addr.id} className={`p-3 rounded-xl border transition-colors ${addr.is_default ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-semibold">{addr.label}</span>
                    {addr.is_default && <Badge className="bg-primary/10 text-primary border-0 text-[10px] h-5">Default</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAddress(addr)}><Edit className="h-3.5 w-3.5" /></Button>
                    {!addr.is_default && <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-primary" onClick={() => setDefault(addr.id)}><Check className="h-3 w-3" /> Default</Button>}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAddress(addr.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground ml-5">{addr.address_line}, {addr.city} - {addr.pincode}</p>
              </div>
            ))}
          </div>
        </Card>

        <Button onClick={handleSave} disabled={loading} className="w-full h-12 gap-2 bg-primary">
          <Save className="h-4 w-4" /> {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Map-based Address Modal */}
      <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
        <DialogContent className="max-w-lg p-0 gap-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>{editingAddress ? "Edit Address" : "Add New Address"}</DialogTitle>
          </DialogHeader>

          <div className="p-3 border-b">
            <div className="flex gap-2">
              <Input placeholder="Search area, street, locality..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearchMap()} className="h-10" />
              <Button variant="outline" size="sm" className="h-10 px-3" onClick={handleSearchMap} disabled={locating}>🔍</Button>
            </div>
          </div>

          <div className="relative h-[250px] bg-secondary/20">
            <div id="addr-map-container" className="w-full h-full" />
            {!mapAddress && (
              <div className="absolute inset-0 flex items-center justify-center">
                {locating ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <MapPin className="h-8 w-8 text-muted-foreground" />}
              </div>
            )}
            <button onClick={getCurrentLocation} disabled={locating}
              className="absolute bottom-3 right-3 bg-card shadow-lg rounded-full p-2 border hover:bg-accent z-10">
              <Navigation className="h-4 w-4 text-primary" />
            </button>
          </div>

          {mapAddress && (
            <p className="text-xs text-muted-foreground bg-secondary/30 p-3 mx-3 mt-3 rounded-lg">📍 {mapAddress.formatted}</p>
          )}

          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">House / Flat / Block No *</label>
              <Input value={addrForm.houseNo} onChange={e => setAddrForm({...addrForm, houseNo: e.target.value})} className="mt-1 h-10" placeholder="Enter house/flat number" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Street / Road</label>
              <Input value={addrForm.street} onChange={e => setAddrForm({...addrForm, street: e.target.value})} className="mt-1 h-10" placeholder="Street name" />
            </div>
            <div>
              <label className="text-xs font-semibold text-primary uppercase">Apartment / Road / Area *</label>
              <Input value={addrForm.apartment} onChange={e => setAddrForm({...addrForm, apartment: e.target.value})} className="mt-1 h-10" placeholder="Enter area name" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Landmark</label>
              <Input value={addrForm.landmark} onChange={e => setAddrForm({...addrForm, landmark: e.target.value})} className="mt-1 h-10" placeholder="Nearby landmark (optional)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">City</label>
                <Input value={mapAddress?.city || ""} className="h-10 bg-secondary/20" disabled />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Pincode</label>
                <Input value={mapAddress?.pincode || ""} className="h-10 bg-secondary/20" disabled />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">District</label>
                <Input value={mapAddress?.district || ""} className="h-10 bg-secondary/20" disabled />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">State</label>
                <Input value={mapAddress?.state || ""} className="h-10 bg-secondary/20" disabled />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase">Save As</label>
              <div className="flex gap-2 mt-2">
                {(["home", "work", "other"] as const).map(type => (
                  <button key={type} onClick={() => setAddrForm({...addrForm, label: type.charAt(0).toUpperCase() + type.slice(1), type})}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${addrForm.type === type ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={saveAddress} className="w-full h-11 mt-2" disabled={!addrForm.apartment.trim() || !addrForm.houseNo.trim()}>
              {editingAddress ? "Update Address" : "Save Address"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
