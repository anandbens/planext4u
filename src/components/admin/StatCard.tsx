import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  trend: number;
  icon: LucideIcon;
  gradient: string;
}

export function StatCard({ title, value, trend, icon: Icon, gradient }: StatCardProps) {
  const isPositive = trend >= 0;

  return (
    <div className="stat-card bg-card">
      <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-bl-[80px] opacity-10", gradient)} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1 animate-count-up">{value}</p>
        </div>
        <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", gradient)}>
          <Icon className="h-5 w-5 text-card" />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3">
        {isPositive ? (
          <TrendingUp className="h-3.5 w-3.5 text-success" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-destructive" />
        )}
        <span className={cn("text-xs font-semibold", isPositive ? "text-success" : "text-destructive")}>
          {isPositive ? "+" : ""}{trend}%
        </span>
        <span className="text-xs text-muted-foreground">vs last month</span>
      </div>
    </div>
  );
}
