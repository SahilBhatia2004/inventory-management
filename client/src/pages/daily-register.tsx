import { LayoutShell } from "@/components/layout-shell";
import { useDailyLog, useCreateDailyLog, useDailyLogs, useUpdateDailyLog, useConsumption, useItems, usePredictConsumption, useUpdateConsumptionBatch } from "@/hooks/use-havaldar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Calendar as CalendarIcon, Save, Calculator, CheckCircle, Lock, Edit3 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

// === SUB-COMPONENT: CONSUMPTION TABLE ===
function ConsumptionTable({ logId, isConfirmed }: { logId: number, isConfirmed: boolean }) {
  const { data: consumption, isLoading } = useConsumption(logId);
  const { data: items } = useItems();
  const updateBatch = useUpdateConsumptionBatch();
  const [localValues, setLocalValues] = useState<Record<number, number>>({});
  
  // Sync local state when data loads
  useEffect(() => {
    if (consumption) {
      const values: Record<number, number> = {};
      consumption.forEach(c => values[c.itemId] = c.quantityUsed);
      setLocalValues(values);
    }
  }, [consumption]);

  const handleInputChange = (itemId: number, val: string) => {
    setLocalValues(prev => ({
      ...prev,
      [itemId]: parseFloat(val) || 0
    }));
  };

  const handleSave = () => {
    const entries = Object.entries(localValues).map(([itemId, quantityUsed]) => ({
      itemId: parseInt(itemId),
      quantityUsed
    }));
    updateBatch.mutate({ logId, entries });
  };

  if (isLoading || !items) return <div className="p-8 text-center">Loading registry...</div>;

  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
        <h3 className="font-heading font-semibold text-lg">Consumption Log</h3>
        {!isConfirmed && (
           <Button onClick={handleSave} disabled={updateBatch.isPending} className="gap-2">
             <Save className="w-4 h-4" />
             {updateBatch.isPending ? "Saving..." : "Save Changes"}
           </Button>
        )}
      </div>
      
      <div className="max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground sticky top-0">
            <tr>
              <th className="text-left p-4 font-medium w-1/3">Item Name</th>
              <th className="text-left p-4 font-medium">Category</th>
              <th className="text-right p-4 font-medium">Cost/Unit</th>
              <th className="text-right p-4 font-medium w-32">Qty Used</th>
              <th className="text-right p-4 font-medium w-20">Unit</th>
              <th className="text-right p-4 font-medium">Total Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map(item => {
              const qty = localValues[item.id] || 0;
              const cost = qty * item.costPerUnit;
              
              return (
                <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4 text-muted-foreground text-xs uppercase tracking-wider">{item.category}</td>
                  <td className="p-4 text-right text-muted-foreground">₹{item.costPerUnit}</td>
                  <td className="p-4 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      disabled={isConfirmed}
                      value={qty || ""}
                      onChange={(e) => handleInputChange(item.id, e.target.value)}
                      className={`
                        w-full text-right p-2 rounded-md border-2 font-mono text-lg
                        focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                        ${qty > 0 ? "bg-primary/5 border-primary/20 font-bold" : "bg-transparent border-transparent hover:border-border"}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-4 text-right text-muted-foreground text-xs">{item.unit}</td>
                  <td className="p-4 text-right font-medium">
                    {cost > 0 ? `₹${cost.toFixed(2)}` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// === MAIN PAGE ===

export default function DailyRegister() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Parse date from URL or default to today
  const searchParams = new URLSearchParams(window.location.search);
  const dateParam = searchParams.get("date");
  const [date, setDate] = useState<Date>(dateParam ? new Date(dateParam) : new Date());
  
  const dateStr = format(date, "yyyy-MM-dd");
  
  const { data: log, isLoading: logLoading } = useDailyLog(dateStr);
  const createLog = useCreateDailyLog();
  const updateLog = useUpdateDailyLog();
  const predict = usePredictConsumption();
  
  // Form State for Log Header
  const [dayType, setDayType] = useState("Normal");
  const [manpower, setManpower] = useState("0");

  // Sync state when log loads
  useEffect(() => {
    if (log) {
      setDayType(log.dayType);
      setManpower(log.manpowerCount?.toString() || "0");
    } else {
      setDayType("Normal");
      setManpower("0");
    }
  }, [log]);

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      setLocation(`/register?date=${format(newDate, "yyyy-MM-dd")}`);
    }
  };

  const handleStartDay = () => {
    createLog.mutate({
      date: dateStr,
      dayType,
      manpowerCount: parseInt(manpower),
      status: "Draft",
    });
  };

  const handleUpdateHeader = () => {
    if (!log) return;
    updateLog.mutate({
      id: log.id,
      dayType,
      manpowerCount: parseInt(manpower),
    });
  };

  const handlePredict = () => {
    if (!log) return;
    // Save header first, then predict
    updateLog.mutate(
      { id: log.id, dayType, manpowerCount: parseInt(manpower) },
      { onSuccess: () => predict.mutate(log.id) }
    );
  };

  const handleConfirmDay = () => {
    if (!log) return;
    if (confirm("Are you sure? This will deduct stock permanently and lock this day.")) {
      updateLog.mutate({ id: log.id, status: "Confirmed" });
    }
  };

  const isConfirmed = log?.status === "Confirmed";

  return (
    <LayoutShell>
      <div className="space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold font-heading mb-2">Daily Register</h1>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal text-lg h-12">
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {format(date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />
                </PopoverContent>
              </Popover>
              {log && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isConfirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {log.status}
                </span>
              )}
            </div>
          </div>
          
          {log && (
             <div className="text-right">
               <div className="text-sm text-muted-foreground uppercase tracking-widest font-heading">Total Cost</div>
               <div className="text-4xl font-bold text-primary font-heading">₹{log.totalCost?.toLocaleString() || "0"}</div>
             </div>
          )}
        </div>

        {logLoading ? (
          <div className="h-64 flex items-center justify-center">Loading...</div>
        ) : !log ? (
          /* EMPTY STATE - START DAY */
          <div className="flex flex-col items-center justify-center py-16 bg-card border border-dashed rounded-xl">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CalendarIcon className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold font-heading mb-2">No Entry for {format(date, "MMMM do")}</h2>
            <p className="text-muted-foreground mb-8 max-w-sm text-center">
              Start the day by setting the activity type and manpower count.
            </p>
            
            <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-6">
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Day Type</label>
                 <Select value={dayType} onValueChange={setDayType}>
                    <SelectTrigger className="h-12 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Special">Special Activity</SelectItem>
                      <SelectItem value="Holiday">Holiday</SelectItem>
                      <SelectItem value="Exercise">Field Exercise</SelectItem>
                    </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Manpower</label>
                 <Input 
                   type="number" 
                   value={manpower} 
                   onChange={(e) => setManpower(e.target.value)} 
                   className="h-12 bg-background text-lg"
                 />
               </div>
            </div>

            <Button size="lg" onClick={handleStartDay} disabled={createLog.isPending} className="w-full max-w-xs h-14 text-lg shadow-lg">
              {createLog.isPending ? "Creating..." : "Start Day Entry"}
            </Button>
          </div>
        ) : (
          /* ACTIVE LOG VIEW */
          <div className="space-y-6">
            
            {/* Control Bar */}
            <div className="bg-card p-6 rounded-xl border shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Day Type</label>
                 <Select value={dayType} onValueChange={setDayType} disabled={isConfirmed}>
                    <SelectTrigger className="h-12 bg-background font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Special">Special Activity</SelectItem>
                      <SelectItem value="Holiday">Holiday</SelectItem>
                      <SelectItem value="Exercise">Field Exercise</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Manpower</label>
                 <Input 
                   type="number" 
                   value={manpower} 
                   onChange={(e) => setManpower(e.target.value)} 
                   disabled={isConfirmed}
                   className="h-12 bg-background text-lg font-medium"
                 />
              </div>
              
              {!isConfirmed && (
                <>
                  <Button 
                    variant="secondary" 
                    className="h-12 w-full gap-2 border-2 border-primary/10 hover:border-primary/30"
                    onClick={handlePredict}
                    disabled={predict.isPending || updateLog.isPending}
                  >
                    <Calculator className="h-4 w-4" />
                    {predict.isPending ? "Calculating..." : "Auto-Calculate"}
                  </Button>
                  
                  <Button 
                    className="h-12 w-full gap-2 bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
                    onClick={handleConfirmDay}
                    disabled={updateLog.isPending}
                  >
                    <CheckCircle className="h-5 w-5" />
                    Confirm Day
                  </Button>
                </>
              )}

              {isConfirmed && (
                <div className="flex items-center justify-center h-12 bg-muted rounded-md text-muted-foreground gap-2 font-medium">
                  <Lock className="h-4 w-4" /> Entry Locked
                </div>
              )}
            </div>

            {/* Main Table */}
            <ConsumptionTable logId={log.id} isConfirmed={isConfirmed} />
            
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
