import { LayoutShell } from "@/components/layout-shell";
import { useItems, useCreateItem, useDeleteItem } from "@/hooks/use-havaldar";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertItemSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Trash2, Plus, Search } from "lucide-react";
import { useState } from "react";

// Extend schema for form (coerce numbers)
const formSchema = insertItemSchema.extend({
  costPerUnit: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

export default function Items() {
  const { data: items, isLoading } = useItems();
  const createItem = useCreateItem();
  const deleteItem = useDeleteItem();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      unit: "kg",
      costPerUnit: 0,
      lowStockThreshold: 10,
      category: "General",
      isActive: true,
    },
  });

  const onSubmit = (data: FormValues) => {
    createItem.mutate(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  const filteredItems = items?.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <LayoutShell>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold font-heading">Items Master</h1>
            <p className="text-muted-foreground">Manage base items and costs.</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg">
                <Plus className="mr-2 h-5 w-5" /> Add New Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "General"}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="General">General</SelectItem>
                              <SelectItem value="Rations">Rations</SelectItem>
                              <SelectItem value="Ammunition">Ammunition</SelectItem>
                              <SelectItem value="Fuel">Fuel</SelectItem>
                              <SelectItem value="Maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <FormControl><Input {...field} placeholder="kg, ltr, pcs" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="costPerUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost per Unit (₹)</FormLabel>
                          <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lowStockThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Low Stock Alert</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createItem.isPending}>
                      {createItem.isPending ? "Creating..." : "Create Item"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2 bg-card border px-4 rounded-lg shadow-sm">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search items..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="border-none shadow-none focus-visible:ring-0 h-12 text-lg"
          />
        </div>

        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading inventory list...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Category</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Unit Cost</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Alert Level</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems?.map((item) => (
                  <tr key={item.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{item.name}</td>
                    <td className="p-4"><span className="px-2 py-1 rounded bg-secondary text-xs uppercase font-bold text-secondary-foreground">{item.category}</span></td>
                    <td className="p-4 text-right">₹{item.costPerUnit} / {item.unit}</td>
                    <td className="p-4 text-right">{item.lowStockThreshold} {item.unit}</td>
                    <td className="p-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm("Delete this item? This cannot be undone.")) {
                            deleteItem.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredItems?.length === 0 && (
                   <tr>
                     <td colSpan={5} className="p-8 text-center text-muted-foreground">No items found.</td>
                   </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </LayoutShell>
  );
}
