import { LayoutShell } from "@/components/layout-shell";
import { useDailyLogs } from "@/hooks/use-havaldar";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Reports() {
  const { data: logs, isLoading } = useDailyLogs();

  return (
    <LayoutShell>
       <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold font-heading">Reports & History</h1>
            <p className="text-muted-foreground">Complete log of all daily entries.</p>
          </div>
          <Button variant="outline" className="gap-2">
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
             </tr>
           </thead>
           <tbody className="divide-y">
             {isLoading ? (
               <tr><td colSpan={5} className="p-8 text-center">Loading...</td></tr>
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
               </tr>
             ))}
           </tbody>
         </table>
       </div>
    </LayoutShell>
  );
}
