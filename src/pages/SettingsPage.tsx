import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, CreditCard, Shield, Globe } from "lucide-react";
import { api, PlatformVariable } from "@/lib/api";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [variables, setVariables] = useState<PlatformVariable[]>([]);

  useEffect(() => {
    api.getPlatformVariables().then(setVariables);
  }, []);

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Platform configuration and system settings</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="general" className="gap-2"><SettingsIcon className="h-4 w-4" /> General</TabsTrigger>
          <TabsTrigger value="payments" className="gap-2"><CreditCard className="h-4 w-4" /> Payments</TabsTrigger>
          <TabsTrigger value="seo" className="gap-2"><Globe className="h-4 w-4" /> SEO</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="bg-card rounded-xl border border-border/50 p-6 space-y-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <h3 className="text-base font-semibold">Platform Variables</h3>
            <div className="grid gap-4">
              {variables.map((v) => (
                <div key={v.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/20">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">{v.key}</Label>
                    <p className="text-xs text-muted-foreground">{v.description}</p>
                  </div>
                  <Input defaultValue={v.value} className="w-32 h-9 bg-card" />
                </div>
              ))}
            </div>
            <Button>Save Changes</Button>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="bg-card rounded-xl border border-border/50 p-6 space-y-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <h3 className="text-base font-semibold">Razorpay Configuration</h3>
            <div className="grid gap-4 max-w-md">
              <div className="flex items-center justify-between">
                <Label>Payment Gateway Enabled</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label>Sandbox Mode</Label>
                <Switch defaultChecked />
              </div>
              <div>
                <Label>Public Key (Publishable)</Label>
                <Input placeholder="rzp_test_xxxx" className="mt-1.5" />
              </div>
              <p className="text-xs text-muted-foreground">⚠️ Secret key is stored securely via environment variables, not in the database.</p>
            </div>
            <Button>Save Payment Settings</Button>
          </div>
        </TabsContent>

        <TabsContent value="seo">
          <div className="bg-card rounded-xl border border-border/50 p-6 space-y-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <h3 className="text-base font-semibold">SEO Configuration</h3>
            <div className="grid gap-4 max-w-lg">
              <div>
                <Label>Default Meta Title</Label>
                <Input placeholder="Your Marketplace - Buy & Sell" className="mt-1.5" />
              </div>
              <div>
                <Label>Default Meta Description</Label>
                <Input placeholder="Discover products, services, and classified ads..." className="mt-1.5" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-generate Sitemap</Label>
                  <p className="text-xs text-muted-foreground">Includes products, services, ads, categories</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>JSON-LD Structured Data</Label>
                  <p className="text-xs text-muted-foreground">Product and organization schema</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
            <Button>Save SEO Settings</Button>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="bg-card rounded-xl border border-border/50 p-6 space-y-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <h3 className="text-base font-semibold">Security Settings</h3>
            <div className="grid gap-4 max-w-md">
              <div className="flex items-center justify-between">
                <div>
                  <Label>OTP Rate Limiting</Label>
                  <p className="text-xs text-muted-foreground">Max 5 OTPs per 15 minutes</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>CORS Protection</Label>
                  <p className="text-xs text-muted-foreground">Restrict API access to allowed origins</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Server-side Payment Validation</Label>
                  <p className="text-xs text-muted-foreground">Validate order amounts on server</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
