import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Navigation, X, Plus } from "lucide-react";
import { MOCK_AREAS } from "@/lib/mockData";

interface SavedAddress {
  id: string;
  label: string;
  type: "home" | "work" | "other";
  address: string;
  pincode: string;
}

const DEFAULT_ADDRESSES: SavedAddress[] = [
  { id: "addr-1", label: "P4U", type: "home", address: "SF NO 250/2 JJ NAGAR, SITE NO 15, NAGAMANAICKEN PALAYAM ROAD, PATTANAM POST - COIMBATORE - 641016", pincode: "641016" },
  { id: "addr-2", label: "P4U Office", type: "work", address: "SF NO 250/2 JJ NAGAR, SITE NO 15, NAGAMANAICKEN PALAYAM ROAD, PATTANAM POST - COIMBATORE - 641016", pincode: "641016" },
];

function loadAddresses(): SavedAddress[] {
  try {
    const raw = localStorage.getItem("app_db_addresses");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...DEFAULT_ADDRESSES];
}

function saveAddresses(addrs: SavedAddress[]) {
  localStorage.setItem("app_db_addresses", JSON.stringify(addrs));
}

export function loadSelectedLocation(): string {
  return localStorage.getItem("app_db_selected_location") || "";
}

export function saveSelectedLocation(loc: string) {
  localStorage.setItem("app_db_selected_location", loc);
}

interface LocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (address: string) => void;
}

export function LocationModal({ open, onOpenChange, onSelect }: LocationModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [addresses, setAddresses] = useState<SavedAddress[]>(loadAddresses);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPincode, setNewPincode] = useState("");

  const filteredAddresses = searchQuery
    ? addresses.filter(a => a.address.toLowerCase().includes(searchQuery.toLowerCase()) || a.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : addresses;

  const areas = MOCK_AREAS.filter(a => a.status === "active" && a.city_name === "Coimbatore");

  const handleUseCurrentLocation = () => {
    onSelect("JJ Nagar, Coimbator...");
    saveSelectedLocation("JJ Nagar, Coimbator...");
    onOpenChange(false);
  };

  const handleSelectAddress = (addr: SavedAddress) => {
    const short = addr.label + " - " + addr.pincode;
    onSelect(short);
    saveSelectedLocation(short);
    onOpenChange(false);
  };

  const handleAddAddress = () => {
    if (!newLabel || !newAddress) return;
    const addr: SavedAddress = {
      id: `addr-${Date.now()}`,
      label: newLabel,
      type: "other",
      address: newAddress,
      pincode: newPincode,
    };
    const updated = [...addresses, addr];
    setAddresses(updated);
    saveAddresses(updated);
    setShowAddForm(false);
    setNewLabel("");
    setNewAddress("");
    setNewPincode("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Select Location</DialogTitle>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search a Address"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        <button
          onClick={handleUseCurrentLocation}
          className="flex items-center gap-3 w-full p-3 rounded-xl border border-border/50 hover:bg-accent/50 transition-colors mt-2"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Navigation className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-primary">Use My Current Location</p>
            <p className="text-xs text-muted-foreground">Enable your current location for better services</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            Enable
          </Button>
        </button>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Saved Address</h3>
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary" onClick={() => setShowAddForm(true)}>
              <Plus className="h-3 w-3" /> Add New
            </Button>
          </div>

          {showAddForm && (
            <div className="p-3 border border-primary/20 rounded-xl mb-3 space-y-2 bg-accent/30">
              <Input placeholder="Label (e.g. Home, Office)" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="h-9 text-sm" />
              <Input placeholder="Full address" value={newAddress} onChange={e => setNewAddress(e.target.value)} className="h-9 text-sm" />
              <Input placeholder="Pincode" value={newPincode} onChange={e => setNewPincode(e.target.value)} className="h-9 text-sm" />
              <div className="flex gap-2">
                <Button size="sm" className="text-xs" onClick={handleAddAddress}>Save Address</Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filteredAddresses.map((addr) => (
              <button
                key={addr.id}
                onClick={() => handleSelectAddress(addr)}
                className="w-full text-left p-3 rounded-xl border border-primary/20 hover:border-primary/50 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-primary">{addr.label}</span>
                  <Badge className="bg-primary/10 text-primary border-0 text-[9px]">
                    {addr.type === "home" ? "Home" : addr.type === "work" ? "Work" : "Other"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground uppercase leading-relaxed">{addr.address}</p>
              </button>
            ))}
          </div>
        </div>

        {searchQuery && (
          <div className="mt-3">
            <h3 className="font-semibold text-sm mb-2">Nearby Areas</h3>
            <div className="space-y-1">
              {areas.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).map(area => (
                <button key={area.id}
                  onClick={() => { onSelect(`${area.name}, ${area.city_name}`); saveSelectedLocation(`${area.name}, ${area.city_name}`); onOpenChange(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent/50 text-sm flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {area.name}, {area.city_name} - {area.pincode}
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
