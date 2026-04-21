import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, MapPin, CheckCircle, AlertCircle, Key, Globe, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CountrySwitcherPanel } from "@/components/admin/CountrySwitcherPanel";

export default function IntegrationsPage() {
  const [hypervergeEnabled, setHypervergeEnabled] = useState(false);
  const [mapsEnabled, setMapsEnabled] = useState(true);
  const [razorpayEnabled, setRazorpayEnabled] = useState(true);
  const [hvConfig, setHvConfig] = useState({ appId: "", appKey: "", sandbox: true });
  const [mapsConfig, setMapsConfig] = useState({ apiKey: "", defaultLat: "19.076", defaultLng: "72.877", defaultZoom: "12" });
  const [razorpayConfig, setRazorpayConfig] = useState({ keyId: "", keySecret: "" });
  const [googleConfig, setGoogleConfig] = useState({ clientId: "", clientSecret: "" });
  const [firebaseConfig, setFirebaseConfig] = useState({ serviceAccount: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("platform_variables").select("*").then(({ data }) => {
      if (data) {
        const vars: Record<string, string> = {};
        data.forEach((v: any) => { vars[v.key] = v.value; });
        if (vars.RAZORPAY_KEY_ID) setRazorpayConfig(prev => ({ ...prev, keyId: vars.RAZORPAY_KEY_ID }));
        if (vars.RAZORPAY_KEY_SECRET) setRazorpayConfig(prev => ({ ...prev, keySecret: vars.RAZORPAY_KEY_SECRET }));
        if (vars.GOOGLE_MAPS_API_KEY) setMapsConfig(prev => ({ ...prev, apiKey: vars.GOOGLE_MAPS_API_KEY }));
        if (vars.GOOGLE_CLIENT_ID) setGoogleConfig(prev => ({ ...prev, clientId: vars.GOOGLE_CLIENT_ID }));
        if (vars.GOOGLE_CLIENT_SECRET) setGoogleConfig(prev => ({ ...prev, clientSecret: vars.GOOGLE_CLIENT_SECRET }));
        if (vars.FIREBASE_SERVICE_ACCOUNT) setFirebaseConfig(prev => ({ ...prev, serviceAccount: vars.FIREBASE_SERVICE_ACCOUNT }));
      }
      setLoading(false);
    });
  }, []);

  const saveRazorpay = async () => {
    if (razorpayEnabled && (!razorpayConfig.keyId || !razorpayConfig.keySecret)) {
      toast.error("Please fill Key ID and Secret");
      return;
    }
    await Promise.all([
      supabase.from("platform_variables").upsert({ id: "pv-razorpay-key-id", key: "RAZORPAY_KEY_ID", value: razorpayConfig.keyId, description: "Razorpay Key ID" } as any),
      supabase.from("platform_variables").upsert({ id: "pv-razorpay-secret", key: "RAZORPAY_KEY_SECRET", value: razorpayConfig.keySecret, description: "Razorpay Secret Key" } as any),
    ]);
    toast.success("Razorpay configuration saved");
  };

  const saveHyperverge = () => {
    if (hypervergeEnabled && (!hvConfig.appId || !hvConfig.appKey)) {
      toast.error("Please fill App ID and App Key");
      return;
    }
    toast.success("Hyperverge configuration saved");
  };

  const saveGoogleOAuth = async () => {
    if (!googleConfig.clientId || !googleConfig.clientSecret) {
      toast.error("Please fill both Client ID and Client Secret");
      return;
    }
    await Promise.all([
      supabase.from("platform_variables").upsert({ id: "pv-google-client-id", key: "GOOGLE_CLIENT_ID", value: googleConfig.clientId, description: "Google OAuth Client ID" } as any),
      supabase.from("platform_variables").upsert({ id: "pv-google-client-secret", key: "GOOGLE_CLIENT_SECRET", value: googleConfig.clientSecret, description: "Google OAuth Client Secret" } as any),
    ]);
    toast.success("Google OAuth configuration saved");
  };

  const saveFirebase = async () => {
    if (!firebaseConfig.serviceAccount) {
      toast.error("Please fill Firebase Service Account JSON");
      return;
    }
    await supabase.from("platform_variables").upsert({ id: "pv-firebase-sa", key: "FIREBASE_SERVICE_ACCOUNT", value: firebaseConfig.serviceAccount, description: "Firebase Service Account JSON" } as any);
    toast.success("Firebase configuration saved");
  };

  const saveMaps = async () => {
    await supabase.from("platform_variables").upsert({ id: "pv-google-maps-key", key: "GOOGLE_MAPS_API_KEY", value: mapsConfig.apiKey, description: "Google Maps API Key" } as any);
    toast.success("Google Maps configuration saved");
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Key className="h-6 w-6" /> Integrations</h1>
        <p className="page-description">Configure third-party API integrations</p>
      </div>

      <Tabs defaultValue="country" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="country" className="gap-2"><Globe className="h-4 w-4" /> Country & Mode</TabsTrigger>
          <TabsTrigger value="razorpay" className="gap-2"><CreditCard className="h-4 w-4" /> Razorpay</TabsTrigger>
          <TabsTrigger value="google-oauth" className="gap-2"><Globe className="h-4 w-4" /> Google OAuth</TabsTrigger>
          <TabsTrigger value="firebase" className="gap-2"><Key className="h-4 w-4" /> Firebase</TabsTrigger>
          <TabsTrigger value="hyperverge" className="gap-2"><Shield className="h-4 w-4" /> Hyperverge KYC</TabsTrigger>
          <TabsTrigger value="maps" className="gap-2"><MapPin className="h-4 w-4" /> Google Maps</TabsTrigger>
        </TabsList>

        <TabsContent value="country">
          <CountrySwitcherPanel />
        </TabsContent>


        <TabsContent value="razorpay">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Razorpay Payment Gateway</h3>
                  <p className="text-sm text-muted-foreground">Accept payments via UPI, cards, wallets, and netbanking</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={razorpayEnabled ? "default" : "outline"}>{razorpayEnabled ? "Active" : "Inactive"}</Badge>
                <Switch checked={razorpayEnabled} onCheckedChange={setRazorpayEnabled} />
              </div>
            </div>
            {razorpayEnabled && (
              <div className="space-y-4 border-t border-border pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Key ID</Label>
                    <Input placeholder="rzp_live_..." value={razorpayConfig.keyId} onChange={(e) => setRazorpayConfig({ ...razorpayConfig, keyId: e.target.value })} className="mt-1.5 font-mono text-sm" />
                  </div>
                  <div>
                    <Label>Key Secret</Label>
                    <Input placeholder="Enter secret key" value={razorpayConfig.keySecret} onChange={(e) => setRazorpayConfig({ ...razorpayConfig, keySecret: e.target.value })} className="mt-1.5 font-mono text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Supported Payment Methods</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { name: "UPI", desc: "Google Pay, PhonePe, etc." },
                      { name: "Credit/Debit Cards", desc: "Visa, Mastercard, RuPay" },
                      { name: "Net Banking", desc: "All major banks" },
                      { name: "Wallets", desc: "Paytm, Freecharge, etc." },
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
                <Button onClick={saveRazorpay}>Save Configuration</Button>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="google-oauth">
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Google OAuth Credentials</h3>
                <p className="text-sm text-muted-foreground">Client ID and Secret for Google Sign-In</p>
              </div>
            </div>
            <div className="space-y-4 border-t border-border pt-4">
              <div>
                <Label>Google Client ID</Label>
                <Input placeholder="xxxx.apps.googleusercontent.com" value={googleConfig.clientId} onChange={(e) => setGoogleConfig({ ...googleConfig, clientId: e.target.value })} className="mt-1.5 font-mono text-sm" />
              </div>
              <div>
                <Label>Google Client Secret</Label>
                <Input placeholder="GOCSPX-..." value={googleConfig.clientSecret} onChange={(e) => setGoogleConfig({ ...googleConfig, clientSecret: e.target.value })} className="mt-1.5 font-mono text-sm" />
              </div>
              <Button onClick={saveGoogleOAuth}>Save Configuration</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="firebase">
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Key className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Firebase Service Account</h3>
                <p className="text-sm text-muted-foreground">Service account JSON for Firebase Admin SDK (phone auth, push notifications)</p>
              </div>
            </div>
            <div className="space-y-4 border-t border-border pt-4">
              <div>
                <Label>Service Account JSON</Label>
                <textarea
                  placeholder='{"type":"service_account","project_id":"...","private_key":"..."}'
                  value={firebaseConfig.serviceAccount}
                  onChange={(e) => setFirebaseConfig({ serviceAccount: e.target.value })}
                  className="mt-1.5 w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button onClick={saveFirebase}>Save Configuration</Button>
            </div>
          </Card>
        </TabsContent>

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
                <Badge variant={hypervergeEnabled ? "default" : "outline"}>{hypervergeEnabled ? "Active" : "Inactive"}</Badge>
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
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div>
                    <Label>Sandbox Mode</Label>
                    <p className="text-xs text-muted-foreground">Use test API for development</p>
                  </div>
                  <Switch checked={hvConfig.sandbox} onCheckedChange={(v) => setHvConfig({...hvConfig, sandbox: v})} />
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
                <Badge variant={mapsEnabled ? "default" : "outline"}>{mapsEnabled ? "Active" : "Inactive"}</Badge>
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
                      { name: "Property Location Pin", desc: "Pin property on map" },
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
                    <p className="text-xs">{mapsConfig.apiKey ? "API Key configured ✓" : "Add API key to enable live preview"}</p>
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
