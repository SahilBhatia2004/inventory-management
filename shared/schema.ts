
import { pgTable, text, serial, integer, boolean, timestamp, real, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Items (Master Data)
export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull(), // e.g., kg, liters, pcs
  costPerUnit: real("cost_per_unit").notNull(),
  lowStockThreshold: real("low_stock_threshold").default(10),
  category: text("category").default("General"), // e.g., Rations, Ammunition, Fuel
  isActive: boolean("is_active").default(true),
});

// Inventory (Current Stock)
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => items.id).notNull().unique(), // One-to-one with items
  currentStock: real("current_stock").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Daily Log (The "Register" Entry)
export const dailyLogs = pgTable("daily_logs", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(), // One log per day
  dayType: text("day_type").notNull().default("Normal"), // Normal, Special, Exercise, Holiday
  manpowerCount: integer("manpower_count").default(0),
  status: text("status").notNull().default("Draft"), // Draft, Confirmed
  totalCost: real("total_cost").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Consumption Details (Line items for a daily log)
export const consumption = pgTable("consumption", {
  id: serial("id").primaryKey(),
  logId: integer("log_id").references(() => dailyLogs.id).notNull(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  quantityUsed: real("quantity_used").notNull(),
  calculatedCost: real("calculated_cost").notNull(),
  isSystemGenerated: boolean("is_system_generated").default(false), // Was this auto-predicted?
});

// Stock Transactions (Inward/Outward history for audit)
export const stockTransactions = pgTable("stock_transactions", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  changeAmount: real("change_amount").notNull(), // Positive for add, negative for consume
  reason: text("reason").notNull(), // "Purchase", "Daily Consumption", "Adjustment"
  date: timestamp("date").defaultNow(),
});

// === RELATIONS ===
export const inventoryRelations = relations(inventory, ({ one }) => ({
  item: one(items, {
    fields: [inventory.itemId],
    references: [items.id],
  }),
}));

export const dailyLogsRelations = relations(dailyLogs, ({ many }) => ({
  consumptions: many(consumption),
}));

export const consumptionRelations = relations(consumption, ({ one }) => ({
  dailyLog: one(dailyLogs, {
    fields: [consumption.logId],
    references: [dailyLogs.id],
  }),
  item: one(items, {
    fields: [consumption.itemId],
    references: [items.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertItemSchema = createInsertSchema(items).omit({ id: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, lastUpdated: true });
export const insertDailyLogSchema = createInsertSchema(dailyLogs).omit({ id: true, createdAt: true, totalCost: true });
export const insertConsumptionSchema = createInsertSchema(consumption).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(stockTransactions).omit({ id: true, date: true });

// === EXPLICIT API CONTRACT TYPES ===

// Items
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type UpdateItemRequest = Partial<InsertItem>;

// Inventory
export type InventoryItem = typeof inventory.$inferSelect & { item?: Item };
export type UpdateStockRequest = { quantity: number; reason: string }; // Custom for adding stock

// Daily Logs
export type DailyLog = typeof dailyLogs.$inferSelect;
export type CreateDailyLogRequest = InsertDailyLogSchema; // Renaming for clarity
type InsertDailyLogSchema = z.infer<typeof insertDailyLogSchema>;
export type UpdateDailyLogRequest = Partial<InsertDailyLogSchema> & { status?: "Draft" | "Confirmed" };

// Consumption
export type ConsumptionRecord = typeof consumption.$inferSelect & { item?: Item };
export type ConsumptionInput = z.infer<typeof insertConsumptionSchema>;
export type BatchConsumptionInput = {
  logId: number;
  entries: { itemId: number; quantityUsed: number }[];
};

// Dashboard / Reports
export type DashboardStats = {
  totalItems: number;
  lowStockCount: number;
  monthlyCost: number;
  stockValue: number;
};

export type LowStockAlert = {
  item: Item;
  currentStock: number;
  shortage: number;
};
