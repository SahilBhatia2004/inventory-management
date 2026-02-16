
import { db } from "./db";
import {
  items, inventory, dailyLogs, consumption, stockTransactions,
  type Item, type InsertItem, type UpdateItemRequest,
  type InventoryItem, type UpdateStockRequest,
  type DailyLog, type CreateDailyLogRequest, type UpdateDailyLogRequest,
  type ConsumptionRecord, type BatchConsumptionInput,
  type DashboardStats
} from "@shared/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Items
  getItems(): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, item: UpdateItemRequest): Promise<Item>;
  deleteItem(id: number): Promise<void>;

  // Inventory
  getInventory(): Promise<InventoryItem[]>;
  updateStock(itemId: number, change: number, reason: string): Promise<InventoryItem>;
  
  // Daily Logs
  getDailyLogs(): Promise<DailyLog[]>;
  getDailyLogByDate(date: string): Promise<DailyLog | undefined>;
  getDailyLog(id: number): Promise<DailyLog | undefined>;
  createDailyLog(log: CreateDailyLogRequest): Promise<DailyLog>;
  updateDailyLog(id: number, log: UpdateDailyLogRequest): Promise<DailyLog>;
  
  // Consumption
  getConsumption(logId: number): Promise<ConsumptionRecord[]>;
  updateConsumption(logId: number, entries: { itemId: number; quantityUsed: number; isSystemGenerated?: boolean }[]): Promise<void>;
  
  // Stats & Logic
  getDashboardStats(): Promise<DashboardStats>;
  getAverageConsumption(itemId: number, dayType: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // === ITEMS ===
  async getItems(): Promise<Item[]> {
    return await db.select().from(items).orderBy(items.name);
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const [item] = await db.insert(items).values(insertItem).returning();
    // Also initialize inventory for this item
    await db.insert(inventory).values({ itemId: item.id, currentStock: 0 });
    return item;
  }

  async updateItem(id: number, update: UpdateItemRequest): Promise<Item> {
    const [item] = await db.update(items).set(update).where(eq(items.id, id)).returning();
    return item;
  }

  async deleteItem(id: number): Promise<void> {
    // Note: In real app, might want soft delete or check foreign keys first
    await db.delete(stockTransactions).where(eq(stockTransactions.itemId, id));
    await db.delete(consumption).where(eq(consumption.itemId, id));
    await db.delete(inventory).where(eq(inventory.itemId, id));
    await db.delete(items).where(eq(items.id, id));
  }

  // === INVENTORY ===
  async getInventory(): Promise<InventoryItem[]> {
    return await db.query.inventory.findMany({
      with: { item: true },
      orderBy: (inv, { desc }) => [desc(inv.lastUpdated)],
    });
  }

  async updateStock(itemId: number, change: number, reason: string): Promise<InventoryItem> {
    const [inv] = await db.select().from(inventory).where(eq(inventory.itemId, itemId));
    const newStock = (inv?.currentStock || 0) + change;
    
    // Update inventory table
    const [updated] = await db.update(inventory)
      .set({ currentStock: newStock, lastUpdated: new Date() })
      .where(eq(inventory.itemId, itemId))
      .returning();

    // Log transaction
    await db.insert(stockTransactions).values({
      itemId,
      changeAmount: change,
      reason,
    });

    return updated;
  }

  // === DAILY LOGS ===
  async getDailyLogs(): Promise<DailyLog[]> {
    return await db.select().from(dailyLogs).orderBy(desc(dailyLogs.date));
  }

  async getDailyLogByDate(date: string): Promise<DailyLog | undefined> {
    const [log] = await db.select().from(dailyLogs).where(eq(dailyLogs.date, date));
    return log;
  }

  async getDailyLog(id: number): Promise<DailyLog | undefined> {
    const [log] = await db.select().from(dailyLogs).where(eq(dailyLogs.id, id));
    return log;
  }

  async createDailyLog(log: CreateDailyLogRequest): Promise<DailyLog> {
    const [newLog] = await db.insert(dailyLogs).values(log).returning();
    return newLog;
  }

  async updateDailyLog(id: number, update: UpdateDailyLogRequest): Promise<DailyLog> {
    const [updated] = await db.update(dailyLogs).set(update).where(eq(dailyLogs.id, id)).returning();
    return updated;
  }

  // === CONSUMPTION ===
  async getConsumption(logId: number): Promise<ConsumptionRecord[]> {
    return await db.query.consumption.findMany({
      where: eq(consumption.logId, logId),
      with: { item: true },
    });
  }

  async updateConsumption(logId: number, entries: { itemId: number; quantityUsed: number; isSystemGenerated?: boolean }[]): Promise<void> {
    // 1. Clear existing consumption for this log (simple full replacement strategy for this app)
    // In a more complex app we might diff, but for a "Register" save, replacing is often safer/easier
    await db.delete(consumption).where(eq(consumption.logId, logId));

    if (entries.length === 0) return;

    // 2. Insert new entries
    for (const entry of entries) {
      const item = await this.getItem(entry.itemId);
      if (!item) continue;

      const cost = entry.quantityUsed * item.costPerUnit;

      await db.insert(consumption).values({
        logId,
        itemId: entry.itemId,
        quantityUsed: entry.quantityUsed,
        calculatedCost: cost,
        isSystemGenerated: entry.isSystemGenerated || false,
      });
      
      // Note: We do NOT deduct stock here. Stock deduction happens when the Daily Log is marked "Confirmed".
      // This allows the user to play with numbers ("Draft" mode) without messing up inventory.
    }
    
    // 3. Update total cost on the log
    const totalCost = entries.reduce((sum, e) => {
      // Need to re-fetch item cost or pass it in. For safety, re-fetching or assuming caller logic.
      // Optimally we do this in one SQL query or the caller handles it.
      // Let's do a quick calculation here via DB aggregation
      return sum; 
    }, 0);

    // Recalculate total cost from DB to be precise
    const result = await db.select({ 
      total: sql<number>`sum(${consumption.calculatedCost})` 
    }).from(consumption).where(eq(consumption.logId, logId));
    
    await this.updateDailyLog(logId, { totalCost: result[0]?.total || 0 } as any);
  }

  // === LOGIC & STATS ===
  async getDashboardStats(): Promise<DashboardStats> {
    const [itemsCount] = await db.select({ count: sql<number>`count(*)` }).from(items);
    
    // Low stock: inventory < item.lowStockThreshold
    const lowStock = await db.execute(sql`
      SELECT count(*) as count 
      FROM ${inventory} i 
      JOIN ${items} it ON i.item_id = it.id 
      WHERE i.current_stock <= it.low_stock_threshold
    `);
    
    // Stock Value
    const stockVal = await db.execute(sql`
      SELECT sum(i.current_stock * it.cost_per_unit) as value
      FROM ${inventory} i 
      JOIN ${items} it ON i.item_id = it.id
    `);

    // Monthly Cost (Current Month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const costRes = await db.select({ 
      sum: sql<number>`sum(${dailyLogs.totalCost})` 
    }).from(dailyLogs).where(gte(dailyLogs.date, startOfMonth.toISOString().split('T')[0]));

    return {
      totalItems: Number(itemsCount.count),
      lowStockCount: Number(lowStock.rows[0].count),
      stockValue: Number(stockVal.rows[0].value) || 0,
      monthlyCost: Number(costRes[0]?.sum) || 0,
    };
  }

  async getAverageConsumption(itemId: number, dayType: string): Promise<number> {
    // Simple heuristic: Average consumption per manpower for this day type
    // If manpower is 0/null, just average total.
    // We try to normalize by manpower if possible.
    
    const history = await db.execute(sql`
      SELECT 
        c.quantity_used, 
        d.manpower_count 
      FROM ${consumption} c
      JOIN ${dailyLogs} d ON c.log_id = d.id
      WHERE c.item_id = ${itemId} 
      AND d.day_type = ${dayType}
      AND d.status = 'Confirmed'
      ORDER BY d.date DESC
      LIMIT 10
    `);

    if (history.rowCount === 0) return 0;

    let totalUnitPerMan = 0;
    let count = 0;

    for (const row of history.rows) {
      const qty = Number(row.quantity_used);
      const man = Number(row.manpower_count);
      
      if (man > 0) {
        totalUnitPerMan += qty / man;
        count++;
      }
    }

    if (count === 0) return 0;
    return totalUnitPerMan / count; // Average unit per person
  }
}

export const storage = new DatabaseStorage();
