import { LayoutShell } from "@/components/layout-shell";
import { StatsCard } from "@/components/stats-card";
import { useDashboardStats, useDailyLogs } from "@/hooks/use-havaldar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  AlertTriangle, 
  ArrowRight, 
  CalendarDays, 
  Coins, 
  PackageCheck, 
  TrendingUp 
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: logs } = useDailyLogs();

  // Prepare chart data (last 7 logs)
  const chartData = logs
    ?.slice(0, 7)
    .reverse()
    .map(log => ({
      date: format(new Date(log.date), "dd MMM"),
      cost: log.totalCost,
    })) || [];

  return (
    <LayoutShell>
      <div className="flex flex-col gap-8">
        
        {/* Welcome & Action Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground p-8 rounded-2xl shadow-xl shadow-primary/20">
          <div>
            <h1 className="text-3xl font-bold font-heading mb-2">Morning, Havaldar.</h1>
            <p className="text-primary-foreground/80 max-w-md">
              System is operational. Daily prediction models are active.
            </p>
          </div>
          <Link href="/register">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 font-bold shadow-lg h-12 px-8 text-md"
            >
              Open Daily Register <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
          ) : (
            <>
              <StatsCard 
                title="Low Stock Alerts" 
                value={stats?.lowStockCount || 0} 
                icon={AlertTriangle} 
                description="Items below threshold"
                alert={(stats?.lowStockCount || 0) > 0}
              />
              <StatsCard 
                title="Total Items" 
                value={stats?.totalItems || 0} 
                icon={PackageCheck} 
                description="Active in master list"
              />
              <StatsCard 
                title="Monthly Cost" 
                value={`₹${(stats?.monthlyCost || 0).toLocaleString()}`} 
                icon={Coins} 
                description="Current month expenditure"
              />
              <StatsCard 
                title="Inventory Value" 
                value={`₹${(stats?.stockValue || 0).toLocaleString()}`} 
                icon={TrendingUp} 
                description="Total asset value"
              />
            </>
          )}
        </div>

        {/* Recent Activity & Chart */}
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Quick Log List */}
          <div className="md:col-span-1 bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                Recent Days
              </h3>
              <Link href="/register" className="text-sm text-primary hover:underline">View All</Link>
            </div>
            <div className="space-y-4">
              {logs?.slice(0, 5).map((log) => (
                <Link key={log.id} href={`/register?date=${log.date}`}>
                  <div className="group flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border/50 transition-all cursor-pointer">
                    <div>
                      <p className="font-medium">{format(new Date(log.date), "dd MMM yyyy")}</p>
                      <p className="text-xs text-muted-foreground">{log.dayType} • {log.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">₹{log.totalCost}</p>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                    </div>
                  </div>
                </Link>
              ))}
              {!logs?.length && (
                <div className="text-center py-8 text-muted-foreground text-sm">No logs recorded yet.</div>
              )}
            </div>
          </div>

          {/* Cost Trend Chart */}
          <div className="md:col-span-2 bg-card border rounded-xl p-6 shadow-sm flex flex-col">
            <h3 className="font-heading font-semibold text-lg mb-6 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              Consumption Trend (Last 7 Days)
            </h3>
            <div className="h-[300px] w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis 
                    dataKey="date" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `₹${value}`} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3} 
                    activeDot={{ r: 6 }} 
                    dot={{ strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
