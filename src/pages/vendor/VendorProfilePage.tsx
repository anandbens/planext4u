import { Link } from "react-router-dom";
import { ArrowLeft, Store, Mail, Phone, MapPin, Shield, Star, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function VendorProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/vendor"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-semibold">Business Profile</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">TechMart</h2>
                <Badge className="bg-success/10 text-success border-0 text-[10px]">Verified</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Ravi Kumar • Electronics</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                <span className="text-sm font-medium">4.8</span>
                <span className="text-xs text-muted-foreground">(245 reviews)</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold">Business Details</h3>
          {[
            { icon: Mail, label: "Email", value: "ravi@techmart.com" },
            { icon: Phone, label: "Phone", value: "+91 99887 76543" },
            { icon: MapPin, label: "Address", value: "Andheri West, Mumbai" },
            { icon: Shield, label: "Commission Rate", value: "8%" },
          ].map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <d.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{d.label}</p>
                <p className="text-sm font-medium">{d.value}</p>
              </div>
            </div>
          ))}
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold">Membership</h3>
          <div className="flex items-center justify-between bg-primary/5 rounded-xl p-4">
            <div>
              <p className="text-sm font-bold text-primary">Premium Plan</p>
              <p className="text-xs text-muted-foreground">Lower commission, priority support</p>
            </div>
            <Badge className="bg-primary text-primary-foreground">Active</Badge>
          </div>
        </Card>

        <Button variant="outline" className="w-full text-destructive"><LogOut className="h-4 w-4 mr-2" /> Logout</Button>
      </main>
    </div>
  );
}
