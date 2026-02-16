import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { 
  type Item, 
  type InsertItem, 
  type DailyLog, 
  type InventoryItem,
  type ConsumptionRecord,
  type DashboardStats
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// === ITEMS ===

export function useItems() {
  return useQuery<Item[]>({
    queryKey: [api.items.list.path],
    queryFn: async () => {
      const res = await fetch(api.items.list.path);
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (item: InsertItem) => {
      const res = await fetch(api.items.create.path, {
        method: api.items.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error("Failed to create item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.items.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.inventory.list.path] }); // Items affect inventory list
      toast({ title: "Item Created", description: "Added to master list." });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.items.delete.path, { id });
      const res = await fetch(url, { method: api.items.delete.method });
      if (!res.ok) throw new Error("Failed to delete item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.items.list.path] });
      toast({ title: "Item Deleted", description: "Removed from master list." });
    },
  });
}

// === INVENTORY ===

export function useInventory() {
  return useQuery<InventoryItem[]>({
    queryKey: [api.inventory.list.path],
    queryFn: async () => {
      const res = await fetch(api.inventory.list.path);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
  });
}

export function useAddStock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ itemId, quantity, reason }: { itemId: number; quantity: number; reason: string }) => {
      const url = buildUrl(api.inventory.update.path, { itemId });
      const res = await fetch(url, {
        method: api.inventory.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity, reason }),
      });
      if (!res.ok) throw new Error("Failed to update stock");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.inventory.list.path] });
      toast({ title: "Stock Updated", description: "Inventory counts adjusted." });
    },
  });
}

// === DAILY LOGS ===

export function useDailyLogs() {
  return useQuery<DailyLog[]>({
    queryKey: [api.dailyLogs.list.path],
    queryFn: async () => {
      const res = await fetch(api.dailyLogs.list.path);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
  });
}

export function useDailyLog(dateStr: string) {
  // Pass dateStr like "2023-10-27"
  return useQuery<DailyLog>({
    queryKey: [api.dailyLogs.get.path, dateStr],
    enabled: !!dateStr,
    queryFn: async () => {
      const url = buildUrl(api.dailyLogs.get.path, { date: dateStr });
      const res = await fetch(url);
      if (res.status === 404) return null; // Handle 404 as null
      if (!res.ok) throw new Error("Failed to fetch log");
      return res.json();
    },
  });
}

export function useCreateDailyLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.dailyLogs.create.path, {
        method: api.dailyLogs.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create log");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.dailyLogs.list.path] });
      // Invalidate specific date query
      const dateStr = data.date instanceof Date ? data.date.toISOString().split('T')[0] : data.date;
      queryClient.invalidateQueries({ queryKey: [api.dailyLogs.get.path, dateStr] });
      toast({ title: "Day Started", description: "Register entry created." });
    },
  });
}

export function useUpdateDailyLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const url = buildUrl(api.dailyLogs.update.path, { id });
      const res = await fetch(url, {
        method: api.dailyLogs.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update log");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dailyLogs.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dailyLogs.get.path] });
      toast({ title: "Saved", description: "Daily log updated." });
    },
  });
}

export function usePredictConsumption() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (logId: number) => {
      const url = buildUrl(api.dailyLogs.predict.path, { id: logId });
      const res = await fetch(url, { method: api.dailyLogs.predict.method });
      if (!res.ok) throw new Error("Failed to predict consumption");
      return res.json();
    },
    onSuccess: (_, logId) => {
      queryClient.invalidateQueries({ queryKey: [api.consumption.listByLog.path, logId] }); // Refresh consumption list
      toast({ title: "Auto-Calculated", description: "Consumption estimated based on history." });
    },
  });
}

export function useDeleteDailyLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.dailyLogs.delete.path, { id });
      const res = await fetch(url, { method: api.dailyLogs.delete.method });
      if (!res.ok) throw new Error("Failed to delete log");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dailyLogs.list.path] });
      toast({ title: "Log Deleted", description: "Entry removed from register." });
    },
  });
}

// === CONSUMPTION ===

export function useConsumption(logId: number) {
  return useQuery<ConsumptionRecord[]>({
    queryKey: [api.consumption.listByLog.path, logId],
    enabled: !!logId,
    queryFn: async () => {
      const url = buildUrl(api.consumption.listByLog.path, { logId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch consumption");
      return res.json();
    },
  });
}

export function useUpdateConsumptionBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ logId, entries }: { logId: number; entries: { itemId: number; quantityUsed: number }[] }) => {
      const url = buildUrl(api.consumption.batchUpdate.path, { logId });
      const res = await fetch(url, {
        method: api.consumption.batchUpdate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error("Failed to update consumption");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.consumption.listByLog.path, variables.logId] });
      toast({ title: "Consumption Saved", description: "Values updated for this day." });
    },
  });
}

// === DASHBOARD STATS ===

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: [api.stats.dashboard.path],
    queryFn: async () => {
      const res = await fetch(api.stats.dashboard.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });
}
