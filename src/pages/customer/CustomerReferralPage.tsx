import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Gift, Copy, Users, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export default function CustomerReferralPage() {
  const { customerUser } = useAuth();
  const customerId = customerUser?.customer_id || customerUser?.id || '';
  const { data: profile } = useQuery({ queryKey: ["customerProfile", customerId], queryFn: () => api.getCustomerProfile(customerId), enabled: !!customerId });
  const { data: referrals, isLoading } = useQuery({ queryKey: ["referrals"], queryFn: () => api.getReferrals({ page: 1, per_page: 50 }) });

  const myReferrals = referrals?.data?.filter(r => r.referrer_id === customerId) || [];
  const completed = myReferrals.filter(r => r.status === 'completed');
  const totalEarned = completed.reduce((s, r) => s + r.points_awarded, 0);

  const copyCode = () => {
    navigator.clipboard.writeText(profile?.referral_code || 'REF0001');
    toast.success("Referral code copied!");
  };

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-lg font-bold">Referrals</h1>
        </div>

        {/* Referral Card */}
        <Card className="p-6 bg-gradient-to-r from-warning/20 to-warning/5 border-warning/30">
          <div className="text-center">
            <Gift className="h-10 w-10 text-warning mx-auto mb-2" />
            <h2 className="text-lg font-bold">Refer & Earn 50 Points</h2>
            <p className="text-xs text-muted-foreground mt-1">Share your code with friends. Get 50 points when they place their first order!</p>
            <p className="text-[10px] text-muted-foreground mt-1">Points are credited after your friend's first order · Referral points expire monthly</p>
            <p className="text-[10px] text-primary font-semibold mt-1">🎉 Refer 4+ friends who order this month → Platform Fee becomes FREE!</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="bg-card px-6 py-2.5 rounded-lg border border-border font-mono text-lg font-bold tracking-widest">
                {profile?.referral_code || 'REF0001'}
              </div>
              <Button size="icon" variant="outline" onClick={copyCode}><Copy className="h-4 w-4" /></Button>
            </div>
            <Button className="mt-4 gap-2 bg-warning text-warning-foreground hover:bg-warning/90" onClick={() => {
              const code = profile?.referral_code || 'REF0001';
              const text = `Join P4U and get 200 bonus points! Use my referral code: ${code}`;
              if (navigator.share) {
                navigator.share({ title: 'Join P4U', text }).catch(() => {});
              } else {
                navigator.clipboard.writeText(text);
                toast.success("Referral message copied to clipboard!");
              }
            }}>
              <Users className="h-4 w-4" /> Share with Friends
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center"><p className="text-lg font-bold">{myReferrals.length}</p><p className="text-[10px] text-muted-foreground">Total Referrals</p></Card>
          <Card className="p-3 text-center"><p className="text-lg font-bold text-success">{completed.length}</p><p className="text-[10px] text-muted-foreground">First Order Done</p></Card>
          <Card className="p-3 text-center"><p className="text-lg font-bold text-primary">+{totalEarned}</p><p className="text-[10px] text-muted-foreground">Points Earned</p></Card>
        </div>

        {/* History */}
        <div>
          <h2 className="text-sm font-bold mb-3">Referral History</h2>
          <div className="space-y-2">
            {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />) :
              myReferrals.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No referrals yet. Share your code to start earning!</p> :
              myReferrals.map(r => (
                <Card key={r.id} className="p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                    {r.status === 'completed' ? <CheckCircle className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4 text-warning" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.referee_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {r.status === 'completed' ? '✅ First order placed' : '⏳ Registered · Waiting for first order'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  {r.status === 'completed' && <Badge className="bg-success/10 text-success border-0 text-xs">+{r.points_awarded} pts</Badge>}
                  {r.status === 'pending' && <Badge className="bg-warning/10 text-warning border-0 text-xs">Cooling</Badge>}
                </Card>
              ))}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
