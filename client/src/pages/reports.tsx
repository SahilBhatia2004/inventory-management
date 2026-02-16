import { LayoutShell } from "@/components/layout-shell";
import { useDailyLogs, useConsumption } from "@/hooks/use-havaldar";
import { format } from "date-fns";
import { Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function Reports() {
  const { data: logs, isLoading } = useDailyLogs();
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const { data: consumption } = useConsumption(selectedLog?.id);

  const exportCSV = () => {
    if (!logs) return;
    const headers = ["Date", "Day Type", "Manpower", "Status", "Total Cost"];
    const rows = logs.map(log => [
      format(new Date(log.date), "yyyy-MM-dd"),
      log.dayType,
      log.manpowerCount,
      log.status,
      log.totalCost
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `daily_register_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <LayoutShell>
       <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold font-heading">Reports & History</h1>
            <p className="text-muted-foreground">Complete log of all daily entries.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
       </div>

       <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
         <table className="w-full">
           <thead className="bg-muted border-b">
             <tr>
               <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
               <th className="text-left p-4 font-medium text-muted-foreground">Day Type</th>
               <th className="text-right p-4 font-medium text-muted-foreground">Manpower</th>
               <th className="text-center p-4 font-medium text-muted-foreground">Status</th>
               <th className="text-right p-4 font-medium text-muted-foreground">Total Cost</th>
               <th className="p-4 w-12"></th>
             </tr>
           </thead>
           <tbody className="divide-y">
             {isLoading ? (
               <tr><td colSpan={6} className="p-8 text-center">Loading...</td></tr>
             ) : logs?.map((log) => (
               <tr key={log.id} className="hover:bg-muted/30">
                 <td className="p-4 font-medium font-mono">{format(new Date(log.date), "dd MMM yyyy")}</td>
                 <td className="p-4">{log.dayType}</td>
                 <td className="p-4 text-right">{log.manpowerCount}</td>
                 <td className="p-4 text-center">
                   <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                     log.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                   }`}>
                     {log.status}
                   </span>
                 </td>
                 <td className="p-4 text-right font-medium">₹{log.totalCost?.toLocaleString()}</td>
                 <td className="p-4 text-right">
                   <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                     <Eye className="h-4 w-4" />
                   </Button>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>

       <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle>Consumption Details - {selectedLog && format(new Date(selectedLog.date), "dd MMM yyyy")}</DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                <div><span className="text-muted-foreground">Day Type:</span> {selectedLog?.dayType}</div>
                <div><span className="text-muted-foreground">Manpower:</span> {selectedLog?.manpowerCount}</div>
             </div>
             <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 font-medium">Item</th>
                    <th className="text-right py-2 font-medium">Qty</th>
                    <th className="text-right py-2 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {consumption?.map((c: any) => (
                    <tr key={c.id}>
                      <td className="py-2">{c.item?.name}</td>
                      <td className="py-2 text-right">{c.quantityUsed} {c.item?.unit}</td>
                      <td className="py-2 text-right">₹{c.calculatedCost?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t font-bold">
                  <tr>
                    <td className="py-2">Total</td>
                    <td></td>
                    <td className="py-2 text-right">₹{selectedLog?.totalCost?.toLocaleString()}</td>
                  </tr>
                </tfoot>
             </table>
           </div>
         </DialogContent>
       </Dialog>
    </LayoutShell>
  );
}
