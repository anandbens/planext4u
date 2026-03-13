import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, MapPin, CheckCircle, AlertCircle, Key, Globe } from "lucide-react";

export default function IntegrationsPage() {
  const [hypervergeEnabled, setHypervergeEnabled] = useState(false);
  const [mapsEnabled, setMapsEnabled] = useState(true);
  const [hvConfig, setHvConfig] = useState({ appId: "", appKey: "", sandbox: true });
  const [mapsConfig, setMapsConfig] = useState({ apiKey: "", defaultLat: "19.076", defaultLng: "72.877", defaultZoom: "12" });

  const saveHyperverge = () => {
    if (hypervergeEnabled && (!hvConfig.appId || !hvConfig.appKey)) {
      toast.error("Please fill App ID and App Key");
      return;
    }
    toast.success("Hyperverge configuration saved");
  };

  const saveMaps = () => {
    toast.success("Google Maps configuration saved");
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Key className="h-6 w-6" /> Integrations</h1>
        <p className="page-description">Configure third-party API integrations for verification and location services</p>
      </div>

      <Tabs defaultValue="hyperverge" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hyperverge" className="gap-2"><Shield className="h-4 w-4" /> Hyperverge KYC</TabsTrigger>
          <TabsTrigger value="maps" className="gap-2"><MapPin className="h-4 w-4" /> Google Maps</TabsTrigger>
        </TabsList>

        <TabsContent value="hyperverge">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Hyperverge KYC Verification</h3>
                  <p className="text-sm text-muted-foreground">GST & PAN verification for vendors and businesses</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={hypervergeEnabled ? "default" : "outline"}>
                  {hypervergeEnabled ? "Active" : "Inactive"}
                </Badge>
                <Switch checked={hypervergeEnabled} onCheckedChange={setHypervergeEnabled} />
              </div>
            </div>

            {hypervergeEnabled && (
              <div className="space-y-4 border-t border-border pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>App ID</Label>
                    <Input placeholder="hv_app_xxxxxxxx" value={hvConfig.appId} onChange={(e) => setHvConfig({...hvConfig, appId: e.target.value})} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>App Key (Secret)</Label>
                    <Input type="password" placeholder="Enter secret key" value={hvConfig.appKey} onChange={(e) => setHvConfig({...hvConfig, appKey: e.target.value})} className="mt-1.5" />
                    <p className="text-[10px] text-muted-foreground mt-1">⚠️ Secret key will be stored securely</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div>
                    <Label>Sandbox Mode</Label>
                    <p className="text-xs text-muted-foreground">Use test API for development</p>
                  </div>
                  <Switch checked={hvConfig.sandbox} onCheckedChange={(v) => setHvConfig({...hvConfig, sandbox: v})} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Supported Verifications</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { name: "GST Verification", desc: "Validate GSTIN number" },
                      { name: "PAN Verification", desc: "Verify PAN card details" },
                      { name: "Aadhaar eKYC", desc: "Aadhaar-based verification" },
                      { name: "Bank Account", desc: "Verify bank account details" },
                    ].map(v => (
                      <div key={v.name} className="p-3 rounded-lg border border-border/50 bg-card">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle className="h-3.5 w-3.5 text-success" />
                          <span className="text-xs font-semibold">{v.name}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{v.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-warning/10 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">API Usage Limits</p>
                    <p className="text-[10px] text-muted-foreground">Sandbox: 100 calls/day. Production: Based on plan. Each verification costs ₹2-5.</p>
                  </div>
                </div>
                <Button onClick={saveHyperverge}>Save Configuration</Button>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="maps">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Google Maps Integration</h3>
                  <p className="text-sm text-muted-foreground">Location tracking, address autocomplete, and delivery zone mapping</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={mapsEnabled ? "default" : "outline"}>
                  {mapsEnabled ? "Active" : "Inactive"}
                </Badge>
                <Switch checked={mapsEnabled} onCheckedChange={setMapsEnabled} />
              </div>
            </div>

            {mapsEnabled && (
              <div className="space-y-4 border-t border-border pt-4">
                <div>
                  <Label>Google Maps API Key (Publishable)</Label>
                  <Input placeholder="AIzaSy..." value={mapsConfig.apiKey} onChange={(e) => setMapsConfig({...mapsConfig, apiKey: e.target.value})} className="mt-1.5" />
                  <p className="text-[10px] text-muted-foreground mt-1">Ensure Maps JavaScript API, Places API, and Geocoding API are enabled</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Default Latitude</Label>
                    <Input value={mapsConfig.defaultLat} onChange={(e) => setMapsConfig({...mapsConfig, defaultLat: e.target.value})} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Default Longitude</Label>
                    <Input value={mapsConfig.defaultLng} onChange={(e) => setMapsConfig({...mapsConfig, defaultLng: e.target.value})} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Default Zoom</Label>
                    <Input value={mapsConfig.defaultZoom} onChange={(e) => setMapsConfig({...mapsConfig, defaultZoom: e.target.value})} className="mt-1.5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Enabled Features</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: "Customer Location Tracking", desc: "Track customer GPS for delivery" },
                      { name: "Address Autocomplete", desc: "Smart address suggestions" },
                      { name: "Vendor Service Area", desc: "Define vendor delivery zones" },
                      { name: "Delivery Route Optimization", desc: "Optimal delivery routes" },
                    ].map(f => (
                      <div key={f.name} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div>
                          <p className="text-xs font-medium">{f.name}</p>
                          <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-secondary/30 rounded-xl p-4 h-48 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Map Preview</p>
                    <p className="text-xs">Add API key to enable live preview</p>
                  </div>
                </div>
                <Button onClick={saveMaps}>Save Configuration</Button>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
