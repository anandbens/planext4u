import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { User, Package, Heart, MapPin, Coins, Gift, Settings, LogOut, ChevronRight, Megaphone, Shield, Wallet, Edit, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function CustomerProfilePage() {
  const { customerUser, customerLogout } = useAuth();
  const navigate = useNavigate();
  const customerId = customerUser?.customer_id || customerUser?.id || '';
  const { data: profile, isLoading } = useQuery({
    queryKey: ["customerProfile", customerId],
    queryFn: () => api.getCustomerProfile(customerId),
    enabled: !!customerId,
  });

  const { data: counts } = useQuery({
    queryKey: ["profileCounts", customerId],
    queryFn: async () => {
      const [wishlist, classifieds, addresses, orders] = await Promise.all([
        supabase.from("property_bookmarks").select("id", { count: "exact", head: true }).eq("user_id", customerId),
        supabase.from("classified_ads").select("id", { count: "exact", head: true }).eq("user_id", customerId),
        supabase.from("customer_addresses").select("id", { count: "exact", head: true }).eq("customer_id", customerId),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", customerId),
      ]);
      return {
        wishlist: wishlist.count || 0,
        classifieds: classifieds.count || 0,
        addresses: addresses.count || 0,
        orders: orders.count || 0,
      };
    },
    enabled: !!customerId,
  });

  const handleLogout = () => {
    customerLogout();
    toast.success("Logged out successfully");
    navigate("/app");
  };

  const menuItems = [
    { icon: Edit, label: "Edit Profile", to: "/app/profile/edit" },
    { icon: Package, label: "My Orders", to: "/app/orders", count: String(counts?.orders || 0) },
    { icon: Heart, label: "Wishlist", to: "/app/wishlist", count: String(counts?.wishlist || 0) },
    { icon: Wallet, label: "Wallet & Points", to: "/app/wallet", info: `${profile?.wallet_points?.toLocaleString() || 0} pts` },
    { icon: Shield, label: "KYC Verification", to: "/app/kyc" },
    { icon: MapPin, label: "Saved Addresses", to: "/app/profile/edit", count: String(counts?.addresses || 0) },
    { icon: Gift, label: "Referrals", to: "/app/referrals", info: profile?.referral_code || "" },
    { icon: Megaphone, label: "My Classifieds", to: "/app/classifieds", count: String(counts?.classifieds || 0) },
    { icon: FileText, label: "Support Tickets", to: "/app/support" },
    { icon: Lock, label: "Change Password", to: "/app/change-password" },
    { icon: Settings, label: "Settings", to: "/app/profile/edit" },
  ];

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-6 space-y-6">
        {isLoading ? <Skeleton className="h-24 rounded-xl" /> : (
          <Card className="p-6 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{customerUser?.name || profile?.name}</h2>
              <p className="text-sm text-muted-foreground">{customerUser?.mobile || profile?.mobile} • {customerUser?.email || profile?.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Member since {new Date(profile?.created_at || '').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
            </div>
            <Link to="/app/profile/edit"><Button variant="outline" size="sm">Edit</Button></Link>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center"><p className="text-2xl font-bold text-primary">{profile?.wallet_points?.toLocaleString() || 0}</p><p className="text-xs text-muted-foreground">Points</p></Card>
          <Card className="p-4 text-center"><p className="text-2xl font-bold">{counts?.orders || 0}</p><p className="text-xs text-muted-foreground">Orders</p></Card>
          <Card className="p-4 text-center"><p className="text-2xl font-bold">{profile?.total_referrals || 0}</p><p className="text-xs text-muted-foreground">Referrals</p></Card>
        </div>

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
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3.5 w-full hover:bg-muted/50 transition-colors text-destructive">
            <LogOut className="h-5 w-5" /><span className="text-sm font-medium">Logout</span>
          </button>
        </Card>
      </div>
    </CustomerLayout>
  );
}
