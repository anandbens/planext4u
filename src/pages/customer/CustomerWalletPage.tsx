import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wallet, ArrowUpRight, ArrowDownLeft, Gift, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api } from "@/lib/api";

export default function CustomerWalletPage() {
  const { data: profile } = useQuery({ queryKey: ["customerProfile"], queryFn: () => api.getCustomerProfile("USR-001") });
  const { data: transactions, isLoading } = useQuery({ queryKey: ["pointsTransactions"], queryFn: () => api.getPointsTransactions({ page: 1, per_page: 50 }) });

  const userTransactions = transactions?.data?.filter(t => t.user_id === 'USR-001') || [];

  const typeIcon = (type: string) => {
    if (type === 'welcome') return <Gift className="h-4 w-4 text-primary" />;
    if (type === 'referral') return <ArrowDownLeft className="h-4 w-4 text-success" />;
    return <ShoppingBag className="h-4 w-4 text-warning" />;
  };

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-lg font-bold">My Wallet</h1>
        </div>

        {/* Balance Card */}
        <Card className="p-6 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="h-8 w-8" />
            <div>
              <p className="text-xs opacity-80">Available Balance</p>
              <p className="text-3xl font-bold">{profile?.wallet_points?.toLocaleString() || 0} <span className="text-sm font-normal">points</span></p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button size="sm" variant="secondary" className="flex-1 gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" /> Redeem
            </Button>
            <Button size="sm" variant="secondary" className="flex-1 gap-1">
              <Gift className="h-3.5 w-3.5" /> Refer & Earn
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-success">+{userTransactions.filter(t => t.type === 'referral').reduce((s, t) => s + t.points, 0)}</p>
            <p className="text-[10px] text-muted-foreground">Referral Pts</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-warning">+{userTransactions.filter(t => t.type === 'order_reward').reduce((s, t) => s + t.points, 0)}</p>
            <p className="text-[10px] text-muted-foreground">Order Rewards</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-primary">200</p>
            <p className="text-[10px] text-muted-foreground">Welcome Bonus</p>
          </Card>
        </div>

        {/* Transaction History */}
        <div>
          <h2 className="text-sm font-bold mb-3">Transaction History</h2>
          <div className="space-y-2">
            {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />) :
              userTransactions.map(t => (
                <Card key={t.id} className="p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                    {typeIcon(t.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <Badge className="bg-success/10 text-success border-0 text-xs">+{t.points}</Badge>
                </Card>
              ))}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
