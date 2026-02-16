import { LayoutShell } from "@/components/layout-shell";
import { useInventory, useAddStock } from "@/hooks/use-havaldar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { PackagePlus, AlertTriangle } from "lucide-react";

export default function Inventory() {
  const { data: inventory, isLoading } = useInventory();
  const addStock = useAddStock();
  const [selectedItem, setSelectedItem] = useState<{id: number, name: string, unit: string} | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Purchase");

  const handleAddStock = () => {
    if (!selectedItem || !quantity) return;
    addStock.mutate({
      itemId: selectedItem.id,
      quantity: parseFloat(quantity),
      reason,
    }, {
      onSuccess: () => {
        setSelectedItem(null);
        setQuantity("");
        setReason("Purchase");
      }
    });
  };

  return (
    <LayoutShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold font-heading">Current Stock</h1>
          <p className="text-muted-foreground">Real-time view of all available resources.</p>
        </div>

        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent>
             <DialogHeader>
               <DialogTitle>Add Stock: {selectedItem?.name}</DialogTitle>
             </DialogHeader>
             <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label>Quantity to Add ({selectedItem?.unit})</Label>
                 <Input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)} 
                    placeholder="0.00"
                    autoFocus
                  />
               </div>
               <div className="space-y-2">
                 <Label>Reason / Source</Label>
                 <Input 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)} 
                    placeholder="e.g. Monthly Purchase, Local Buy"
                  />
               </div>
             </div>
             <DialogFooter>
               <Button onClick={handleAddStock} disabled={addStock.isPending}>
                 {addStock.isPending ? "Updating..." : "Confirm Addition"}
               </Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
             <div className="col-span-full p-8 text-center">Loading stock...</div>
          ) : inventory?.map((inv) => {
            const isLow = (inv.currentStock || 0) <= (inv.item?.lowStockThreshold || 0);
            return (
              <div 
                key={inv.id} 
                className={`
                  relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all
                  ${isLow ? "border-destructive/50 bg-destructive/5" : "hover:border-primary/50"}
                `}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{inv.item?.name}</h3>
                    <p className="text-sm text-muted-foreground uppercase">{inv.item?.category}</p>
                  </div>
                  {isLow && (
                    <div className="bg-destructive/10 text-destructive p-2 rounded-full animate-pulse">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                  )}
                </div>
                
                <div className="flex items-baseline gap-1 mb-6">
                   <span className={`text-4xl font-bold font-heading ${isLow ? "text-destructive" : "text-foreground"}`}>
                     {inv.currentStock}
                   </span>
                   <span className="text-muted-foreground font-medium">{inv.item?.unit}</span>
                </div>

                <Button 
                  className="w-full gap-2" 
                  variant="outline"
                  onClick={() => setSelectedItem({
                    id: inv.itemId, 
                    name: inv.item?.name || "", 
                    unit: inv.item?.unit || ""
                  })}
                >
                  <PackagePlus className="h-4 w-4" /> Add Stock
                </Button>

                {/* Progress bar visual for stock vs threshold */}
                {isLow && (
                   <div className="absolute bottom-0 left-0 h-1 bg-destructive w-full" />
                )}
              </div>
            );
          })}
        </div>
        
        {inventory?.length === 0 && (
          <div className="text-center py-12 bg-card border border-dashed rounded-xl">
            <p className="text-muted-foreground">No inventory records found. Add items to the master list first.</p>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
