import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
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
  const { customerUser, customerLogout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const customerId = customerUser?.customer_id || customerUser?.id || '';
  const supabaseUid = customerUser?.supabase_uid || '';
  // Wait for the auth session to be fully restored before querying — otherwise
  // RLS rejects the read on a cold reload (auth.uid() is still null) and we
  // cache an empty profile until the next manual refresh.
  const queriesEnabled = !authLoading && !!customerId && !!supabaseUid;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["customerProfile", customerId, supabaseUid],
    queryFn: () => api.getCustomerProfile(customerId),
    enabled: queriesEnabled,
    staleTime: 30_000,
  });

  // Wishlist is stored in localStorage (see CustomerWishlistPage). Mirror that
  // count here so the profile menu matches what the user actually sees on the
  // wishlist screen — products + services + saved sellers.
  const readWishlistCount = () => {
    const safeLen = (key: string) => {
      try {
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(arr) ? arr.length : 0;
      } catch { return 0; }
    };
    return safeLen('app_db_wishlist') + safeLen('app_db_service_wishlist') + safeLen('app_db_seller_wishlist');
  };
  const [wishlistCount, setWishlistCount] = useState<number>(() => readWishlistCount());
  useEffect(() => {
    const refresh = () => setWishlistCount(readWishlistCount());
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('wishlist-changed', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('wishlist-changed', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const { data: counts } = useQuery({
    queryKey: ["profileCounts", customerId, supabaseUid],
    queryFn: async () => {
      const [classifieds, addresses, orders] = await Promise.all([
        supabase.from("classified_ads").select("id", { count: "exact", head: true }).eq("user_id", customerId),
        supabase.from("customer_addresses").select("id", { count: "exact", head: true }).eq("customer_id", customerId),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", customerId),
      ]);
      return {
        classifieds: classifieds.count || 0,
        addresses: addresses.count || 0,
        orders: orders.count || 0,
      };
    },
    enabled: queriesEnabled,
    staleTime: 30_000,
  });

  const handleLogout = () => {
    customerLogout();
    toast.success("Logged out successfully");
    navigate("/app");
  };

  const menuItems = [
    { icon: Edit, label: "Edit Profile", to: "/app/profile/edit" },
    { icon: Package, label: "My Orders", to: "/app/orders", count: String(counts?.orders || 0) },
    { icon: Heart, label: "Wishlist", to: "/app/wishlist", count: String(wishlistCount) },
    { icon: Wallet, label: "Wallet & Points", to: "/app/wallet", info: `${profile?.wallet_points?.toLocaleString() || 0} pts` },
    { icon: Shield, label: "KYC Verification", to: "/app/kyc" },
    { icon: MapPin, label: "Saved Addresses", to: "/app/profile/edit", count: String(counts?.addresses || 0) },
    { icon: Gift, label: "Referrals", to: "/app/referrals", info: profile?.referral_code || "" },
    { icon: Megaphone, label: "My Classifieds", to: "/app/classifieds", count: String(counts?.classifieds || 0) },
    { icon: FileText, label: "Support Tickets", to: "/app/support" },
    { icon: Lock, label: "Change Password", to: "/app/change-password" },
    { icon: Settings, label: "Settings", to: "/app/profile/edit" },
  ];

  // Helper to filter out synthetic emails
  const getRealEmail = (email?: string) => {
    if (!email || email.includes('@phone.planext4u.local')) return null;
    return email;
  };

  const displayEmail = getRealEmail(profile?.email) || getRealEmail(customerUser?.email) || '';
  const displayPhone = profile?.mobile || customerUser?.mobile || '';
  const displayName = profile?.name || customerUser?.name || '';

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-6 space-y-6">
        {isLoading ? <Skeleton className="h-24 rounded-xl" /> : (
          <Card className="p-6 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {profile?.profile_photo ? (
                <img
                  src={profile.profile_photo}
                  alt={displayName || 'Profile'}
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{displayName}</h2>
              <p className="text-sm text-muted-foreground">{displayPhone}{displayEmail ? ` • ${displayEmail}` : ''}</p>
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
