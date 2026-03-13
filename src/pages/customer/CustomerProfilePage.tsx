import { Link } from "react-router-dom";
import { ArrowLeft, User, Package, Heart, MapPin, Coins, Gift, Settings, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const menuItems = [
  { icon: Package, label: "My Orders", to: "/app/orders", count: "4" },
  { icon: Heart, label: "Wishlist", to: "/app", count: "12" },
  { icon: MapPin, label: "Saved Addresses", to: "/app", count: "2" },
  { icon: Coins, label: "Loyalty Points", to: "/app", info: "1,250 pts" },
  { icon: Gift, label: "Referrals", to: "/app", info: "REF0042" },
  { icon: Settings, label: "Settings", to: "/app" },
];

export default function CustomerProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-semibold">Profile</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* User Info */}
        <Card className="p-6 flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Rahul Sharma</h2>
            <p className="text-sm text-muted-foreground">+91 98765 43210 • rahul@example.com</p>
            <p className="text-xs text-muted-foreground mt-0.5">Member since Jan 2026</p>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">1,250</p>
            <p className="text-xs text-muted-foreground">Points</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">4</p>
            <p className="text-xs text-muted-foreground">Orders</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">3</p>
            <p className="text-xs text-muted-foreground">Referrals</p>
          </Card>
        </div>

        {/* Menu */}
        <Card className="divide-y divide-border/50">
          {menuItems.map((item) => (
            <Link key={item.label} to={item.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors">
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              {item.count && <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{item.count}</span>}
              {item.info && <span className="text-xs text-primary font-medium">{item.info}</span>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
          <Separator />
          <button className="flex items-center gap-3 px-4 py-3.5 w-full hover:bg-muted/50 transition-colors text-destructive">
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </Card>
      </main>
    </div>
  );
}
