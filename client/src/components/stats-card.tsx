import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
  alert?: boolean;
}

export function StatsCard({ title, value, icon: Icon, description, alert }: StatsCardProps) {
  return (
    <div className={`
      relative overflow-hidden rounded-xl border p-6 transition-all duration-300
      hover:shadow-lg hover:-translate-y-1
      ${alert ? "bg-destructive/10 border-destructive/20" : "bg-card border-border/50 shadow-sm"}
    `}>
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground font-heading uppercase tracking-wider">
          {title}
        </p>
        <div className={`p-2 rounded-full ${alert ? "bg-destructive/20 text-destructive" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className={`text-3xl font-bold font-heading ${alert ? "text-destructive" : "text-foreground"}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      
      {/* Decorative accent */}
      <div className={`absolute bottom-0 left-0 h-1 w-full ${alert ? "bg-destructive" : "bg-primary/50"}`} />
    </div>
  );
}
