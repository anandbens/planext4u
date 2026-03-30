import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, MapPin, Home, IndianRupee, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "independent_house", label: "Independent House" },
  { value: "villa", label: "Villa" },
  { value: "commercial_office", label: "Commercial Office" },
  { value: "commercial_shop", label: "Shop" },
];

function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

export default function PropertyValueEstimatorPage() {
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const [propertyType, setPropertyType] = useState("apartment");
  const [areaSqft, setAreaSqft] = useState("1000");
  const [bhk, setBhk] = useState("2");
  const [estimated, setEstimated] = useState(false);

  // Fetch benchmark data from active properties in same locality/city
  const { data: benchmarkData } = useQuery({
    queryKey: ["propertyBenchmark", city, locality, propertyType],
    queryFn: async () => {
      if (!city) return null;
      let query = supabase.from("properties" as any).select("price, area_sqft, transaction_type, bhk").eq("status", "active").eq("property_type", propertyType);
      if (locality) query = query.ilike("locality", `%${locality}%`);
      else query = query.ilike("city", `%${city}%`);
      const { data } = await query;
      return (data || []) as any[];
    },
    enabled: estimated && !!city,
  });

  const calcEstimate = () => {
    if (!city) return;
    setEstimated(true);
  };

  // Calculate estimates from benchmark data
  const saleProps = benchmarkData?.filter((p: any) => p.transaction_type === "sale" && p.area_sqft > 0) || [];
  const rentProps = benchmarkData?.filter((p: any) => p.transaction_type === "rent") || [];
  const area = Number(areaSqft) || 1000;

  const avgPricePerSqft = saleProps.length > 0
    ? saleProps.reduce((sum: number, p: any) => sum + (Number(p.price) / Number(p.area_sqft)), 0) / saleProps.length
    : 5500; // default fallback

  const estimatedSalePrice = Math.round(avgPricePerSqft * area);
  const saleLow = Math.round(estimatedSalePrice * 0.85);
  const saleHigh = Math.round(estimatedSalePrice * 1.15);

  const avgRent = rentProps.length > 0
    ? rentProps.reduce((sum: number, p: any) => sum + Number(p.price), 0) / rentProps.length
    : Math.round(estimatedSalePrice * 0.003);
  const rentLow = Math.round(avgRent * 0.85);
  const rentHigh = Math.round(avgRent * 1.15);

  return (
    <CustomerLayout>
      <div className="max-w-lg mx-auto pb-24 md:pb-6">
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Property Value Estimator</h1>
        </div>

        <div className="p-4 space-y-4">
          <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-sm">Estimate Your Property Value</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Get an approximate market value based on comparable properties in your area</p>

            <div className="space-y-3">
              <div><Label className="text-xs">City *</Label><Input value={city} onChange={(e) => { setCity(e.target.value); setEstimated(false); }} placeholder="e.g. Bangalore" /></div>
              <div><Label className="text-xs">Locality</Label><Input value={locality} onChange={(e) => { setLocality(e.target.value); setEstimated(false); }} placeholder="e.g. Koramangala" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Property Type</Label>
                  <Select value={propertyType} onValueChange={(v) => { setPropertyType(v); setEstimated(false); }}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Area (sq.ft)</Label><Input type="number" value={areaSqft} onChange={(e) => { setAreaSqft(e.target.value); setEstimated(false); }} /></div>
              </div>
              <div>
                <Label className="text-xs">BHK</Label>
                <div className="flex gap-2 mt-1">
                  {["1", "2", "3", "4", "5+"].map(b => (
                    <button key={b} onClick={() => { setBhk(b); setEstimated(false); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bhk === b ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      {b} BHK
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={calcEstimate}>
                <BarChart3 className="h-4 w-4 mr-2" /> Get Estimate
              </Button>
            </div>
          </Card>

          {estimated && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
              {/* Sale Estimate */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <IndianRupee className="h-4 w-4 text-success" />
                  <h3 className="font-bold text-sm">Sale Value Estimate</h3>
                </div>
                <div className="text-center py-3">
                  <p className="text-2xl font-bold text-primary">{formatPrice(estimatedSalePrice)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Estimated market value</p>
                </div>
                <div className="flex justify-between mt-3 px-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Low</p>
                    <p className="text-sm font-medium text-destructive flex items-center"><ArrowDownRight className="h-3 w-3" />{formatPrice(saleLow)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">High</p>
                    <p className="text-sm font-medium text-success flex items-center"><ArrowUpRight className="h-3 w-3" />{formatPrice(saleHigh)}</p>
                  </div>
                </div>
                <div className="mt-3 bg-secondary rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Avg. price per sq.ft: ₹{Math.round(avgPricePerSqft).toLocaleString("en-IN")} | Based on {saleProps.length} comparable {saleProps.length === 1 ? "property" : "properties"}</p>
                </div>
              </Card>

              {/* Rent Estimate */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Home className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-sm">Rental Value Estimate</h3>
                </div>
                <div className="text-center py-3">
                  <p className="text-2xl font-bold text-primary">{formatPrice(Math.round(avgRent))}<span className="text-sm text-muted-foreground font-normal">/month</span></p>
                </div>
                <div className="flex justify-between mt-3 px-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Low</p>
                    <p className="text-sm font-medium">{formatPrice(rentLow)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">High</p>
                    <p className="text-sm font-medium">{formatPrice(rentHigh)}</p>
                  </div>
                </div>
                <div className="mt-3 bg-secondary rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Based on {rentProps.length} rental {rentProps.length === 1 ? "listing" : "listings"} in area</p>
                </div>
              </Card>

              <p className="text-[10px] text-muted-foreground text-center px-4">
                * Estimates are approximate and based on listed properties. Actual values may vary based on exact location, condition, and market trends.
              </p>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
