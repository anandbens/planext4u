import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wallet, ArrowUpRight, Gift, ChevronLeft, ChevronRight, AlertTriangle, Share2, Heart, BookOpen, ShoppingBag, Users, Store, Clock, RotateCcw, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/country-context";

const ITEMS_PER_PAGE = 8;

const categoryConfig: Record<string, { label: string; icon: any; bg: string; text: string }> = {
  welcome: { label: "Welcome Bonus", icon: Gift, bg: "bg-[hsl(var(--primary)/0.08)]", text: "text-primary" },
  post_share: { label: "Post Share", icon: Share2, bg: "bg-[hsl(var(--info)/0.08)]", text: "text-info" },
  vendor_referral: { label: "Vendor Referral", icon: Store, bg: "bg-[hsl(var(--success)/0.08)]", text: "text-success" },
  referral: { label: "Customer Referral", icon: Users, bg: "bg-[hsl(var(--success)/0.08)]", text: "text-success" },
  post_like: { label: "Post Liked", icon: Heart, bg: "bg-[hsl(var(--destructive)/0.08)]", text: "text-destructive" },
  story_liked: { label: "Story Liked", icon: Heart, bg: "bg-[hsl(var(--destructive)/0.08)]", text: "text-destructive" },
  order_reward: { label: "Order Rewards", icon: ShoppingBag, bg: "bg-[hsl(var(--warning)/0.08)]", text: "text-warning" },
  earned: { label: "Earned", icon: Gift, bg: "bg-[hsl(var(--primary)/0.08)]", text: "text-primary" },
  redemption: { label: "Redeemed", icon: ArrowUpRight, bg: "bg-[hsl(var(--destructive)/0.08)]", text: "text-destructive" },
  refund: { label: "Refunds", icon: RotateCcw, bg: "bg-[hsl(var(--info)/0.08)]", text: "text-info" },
};

export default function CustomerWalletPage() {
  const { customerUser } = useAuth();
  const customerId = customerUser?.customer_id || customerUser?.id || '';

  const { data: profile } = useQuery({
    queryKey: ["customerProfile", customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const { data } = await supabase.from('customers').select('*').eq('id', customerId).single();
      return data;
    },
    enabled: !!customerId,
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["pointsTransactions", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data } = await supabase.from('points_transactions').select('*').eq('user_id', customerId).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!customerId,
  });

  // Platform variables for cooling
  const { data: platformVars } = useQuery({
    queryKey: ["platformVars-wallet"],
    queryFn: async () => {
      const { data } = await supabase.from('platform_variables').select('key, value').in('key', ['referral_cooling_enabled', 'points_expiry_days', 'expiry_reminder_days']);
      const map: Record<string, string> = {};
      (data || []).forEach((v: any) => { map[v.key] = v.value; });
      return map;
    },
  });

  const coolingEnabled = platformVars?.referral_cooling_enabled === '1';

  // Points expiring soon
  const { data: expiringPoints } = useQuery({
    queryKey: ["expiringPoints", customerId],
    queryFn: async () => {
      if (!customerId) return 0;
      const reminderDays = Number(platformVars?.expiry_reminder_days || '10');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + reminderDays);
      const { data } = await supabase.from('points_transactions')
        .select('points')
        .eq('user_id', customerId)
        .eq('is_expired', false)
        .eq('cooling_status', 'credited')
        .not('expires_at', 'is', null)
        .lte('expires_at', futureDate.toISOString())
        .gt('points', 0);
      return (data || []).reduce((s: number, t: any) => s + t.points, 0);
    },
    enabled: !!customerId && !!platformVars,
  });

  const allTx = transactions || [];
  const creditedTx = allTx.filter((t: any) => t.cooling_status === 'credited');
  const coolingTx = allTx.filter((t: any) => t.cooling_status === 'pending');

  const totalEarned = creditedTx.filter((t: any) => t.points > 0).reduce((s: number, t: any) => s + t.points, 0);
  const totalRedeemed = Math.abs(creditedTx.filter((t: any) => t.points < 0).reduce((s: number, t: any) => s + t.points, 0));
  const totalBalance = profile?.wallet_points || 0;
  const coolingTotal = coolingTx.reduce((s: number, t: any) => s + t.points, 0);

  // Category-wise breakdown
  const categoryTotals: Record<string, number> = {};
  creditedTx.filter((t: any) => t.points > 0).forEach((t: any) => {
    const type = t.type || 'earned';
    categoryTotals[type] = (categoryTotals[type] || 0) + t.points;
  });

  // Categories to show
  const categoriesToShow = ['welcome', 'post_share', 'vendor_referral', 'referral', 'post_like', 'story_liked', 'order_reward', 'refund', 'earned']
    .filter(k => (categoryTotals[k] || 0) > 0 || ['welcome', 'post_share', 'vendor_referral', 'referral', 'post_like', 'story_liked'].includes(k));

  const [currentPage, setCurrentPage] = useState(1);
  const displayTx = creditedTx;
  const totalPages = Math.max(1, Math.ceil(displayTx.length / ITEMS_PER_PAGE));
  const paginated = displayTx.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const typeIcon = (type: string) => {
    const cfg = categoryConfig[type] || categoryConfig.earned;
    const Icon = cfg.icon;
    return <Icon className={`h-4 w-4 ${cfg.text}`} />;
  };

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-6 space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-lg font-bold">My Wallet</h1>
        </div>

        {/* Hero Card */}
        <Card className="p-6 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.75)] text-primary-foreground rounded-2xl">
          <div className="flex items-center gap-3 mb-1">
            <Wallet className="h-7 w-7" />
            <p className="text-xs opacity-80">Total Points</p>
          </div>
          <p className="text-4xl font-extrabold">{totalBalance.toLocaleString()}</p>
          <div className="flex gap-3 mt-4">
            <Button size="sm" variant="secondary" className="flex-1 gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" /> Redeem
            </Button>
            <Button size="sm" variant="secondary" className="flex-1 gap-1" asChild>
              <Link to="/app/referrals"><Gift className="h-3.5 w-3.5" /> Refer & Earn</Link>
            </Button>
          </div>
        </Card>

        {/* Summary: Earned / Redeemed / Balance */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-success">+{totalEarned.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Total Earned</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-destructive">-{totalRedeemed.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Total Redeemed</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{totalBalance.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Balance</p>
          </Card>
        </div>

        {/* Expiring points alert */}
        {(expiringPoints || 0) > 0 && (
          <Card className="p-3 bg-warning/10 border-warning/30 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-semibold text-warning">{expiringPoints} points expiring soon!</p>
              <p className="text-[10px] text-muted-foreground">Use them before they expire by placing orders</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 text-xs h-7" asChild>
              <Link to="/app/browse">Shop Now</Link>
            </Button>
          </Card>
        )}

        {/* Cooling period section */}
        {coolingEnabled && coolingTotal > 0 && (
          <Card className="p-3 bg-info/10 border-info/30 flex items-center gap-3">
            <Clock className="h-5 w-5 text-info shrink-0" />
            <div>
              <p className="text-sm font-semibold text-info">{coolingTotal} points on cooling period</p>
              <p className="text-[10px] text-muted-foreground">These referral points will be credited once the referred user places their first order</p>
            </div>
          </Card>
        )}

        {/* Category-wise breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {categoriesToShow.map((key) => {
            const cfg = categoryConfig[key] || categoryConfig.earned;
            const Icon = cfg.icon;
            return (
              <Card key={key} className={`p-4 text-center ${cfg.bg}`}>
                <p className="text-sm font-semibold mb-2">{cfg.label}</p>
                <div className="h-10 w-10 rounded-full bg-card mx-auto flex items-center justify-center mb-2">
                  <Icon className={`h-5 w-5 ${cfg.text}`} />
                </div>
                <p className="text-2xl font-extrabold">{(categoryTotals[key] || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Points</p>
              </Card>
            );
          })}
        </div>

        {/* Wallet Points Structure Link */}
        <Link to="/app/cms/wallet-points-structure">
          <Card className="p-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/30 transition">
            <BookOpen className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Wallet Points Structure</p>
              <p className="text-[10px] text-muted-foreground">Learn how points work, earning & redemption rules</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>

        {/* Transaction History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">Transaction History</h2>
            <span className="text-xs text-muted-foreground">{displayTx.length} transactions</span>
          </div>
          <div className="space-y-2">
            {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />) :
              paginated.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">No transactions yet</p> :
              paginated.map((t: any) => (
                <Card key={t.id} className="p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                    {typeIcon(t.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      {t.cooling_status === 'pending' && <Badge className="bg-info/10 text-info border-0 text-[8px]">Cooling</Badge>}
                      {t.expires_at && !t.is_expired && (
                        <span className="text-[8px] text-muted-foreground">Exp: {new Date(t.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      )}
                      {t.is_expired && <Badge className="bg-destructive/10 text-destructive border-0 text-[8px]">Expired</Badge>}
                    </div>
                  </div>
                  <Badge className={`border-0 text-xs ${t.points >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {t.points >= 0 ? '+' : ''}{t.points}
                  </Badge>
                </Card>
              ))}
          </div>

          {displayTx.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
