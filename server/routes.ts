
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === ITEMS ===
  app.get(api.items.list.path, async (req, res) => {
    const items = await storage.getItems();
    res.json(items);
  });

  app.post(api.items.create.path, async (req, res) => {
    try {
      const input = api.items.create.input.parse(req.body);
      const item = await storage.createItem(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.put(api.items.update.path, async (req, res) => {
    const item = await storage.updateItem(Number(req.params.id), req.body);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  });

  app.delete(api.items.delete.path, async (req, res) => {
    await storage.deleteItem(Number(req.params.id));
    res.status(204).send();
  });

  // === INVENTORY ===
  app.get(api.inventory.list.path, async (req, res) => {
    const inv = await storage.getInventory();
    res.json(inv);
  });

  app.post(api.inventory.update.path, async (req, res) => {
    const { quantity, reason } = req.body;
    const updated = await storage.updateStock(Number(req.params.itemId), quantity, reason);
    if (!updated) return res.status(404).json({ message: "Item not found" });
    res.json(updated);
  });

  // === DAILY LOGS ===
  app.get(api.dailyLogs.list.path, async (req, res) => {
    const logs = await storage.getDailyLogs();
    res.json(logs);
  });

  app.get(api.dailyLogs.get.path, async (req, res) => {
    // Check if param is date or ID
    const param = req.params.date;
    const isDate = /^\d{4}-\d{2}-\d{2}$/.test(param);
    
    let log;
    if (isDate) {
      log = await storage.getDailyLogByDate(param);
    } else {
      log = await storage.getDailyLog(Number(param));
    }

    if (!log) return res.status(404).json({ message: "Log not found" });
    res.json(log);
  });

  app.post(api.dailyLogs.create.path, async (req, res) => {
    try {
      const input = api.dailyLogs.create.input.parse(req.body);
      
      // Check duplicate
      const existing = await storage.getDailyLogByDate(input.date);
      if (existing) {
        // If exists, just return it instead of erroring, for smoother UX
        return res.json(existing);
      }

      const log = await storage.createDailyLog(input);
      res.status(201).json(log);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Invalid Input" });
    }
  });

  app.put(api.dailyLogs.update.path, async (req, res) => {
    const id = Number(req.params.id);
    const currentLog = await storage.getDailyLog(id);
    if (!currentLog) return res.status(404).json({ message: "Log not found" });

    const input = api.dailyLogs.update.input.parse(req.body);
    
    // If confirming, deduct stock!
    if (input.status === 'Confirmed' && currentLog.status === 'Draft') {
      const consumptions = await storage.getConsumption(id);
      for (const c of consumptions) {
        await storage.updateStock(c.itemId, -c.quantityUsed, `Daily Consumption: ${currentLog.date}`);
      }
    }
    
    const updated = await storage.updateDailyLog(id, input);
    res.json(updated);
  });

  // === CONSUMPTION ===
  app.get(api.consumption.listByLog.path, async (req, res) => {
    const records = await storage.getConsumption(Number(req.params.logId));
    res.json(records);
  });

  app.post(api.consumption.batchUpdate.path, async (req, res) => {
    const logId = Number(req.params.logId);
    const entries = req.body.entries;
    await storage.updateConsumption(logId, entries);
    res.json({ success: true });
  });

  // === LOGIC: PREDICTION ===
  app.post(api.dailyLogs.predict.path, async (req, res) => {
    const logId = Number(req.params.id);
    const log = await storage.getDailyLog(logId);
    if (!log) return res.status(404).json({ message: "Log not found" });

    const items = await storage.getItems();
    const predictions = [];

    for (const item of items) {
      // Logic: Avg per man * current manpower
      const avgPerMan = await storage.getAverageConsumption(item.id, log.dayType);
      
      if (avgPerMan > 0 && (log.manpowerCount || 0) > 0) {
        const predictedQty = avgPerMan * (log.manpowerCount || 0);
        predictions.push({
          itemId: item.id,
          quantityUsed: Math.round(predictedQty * 100) / 100, // Round to 2 decimals
          isSystemGenerated: true
        });
      }
    }

    if (predictions.length > 0) {
      await storage.updateConsumption(logId, predictions);
    }

    res.json({ message: "Predictions generated", predictions: predictions.length });
  });

  // === STATS ===
  app.get(api.stats.dashboard.path, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // === SEED DATA ===
  await seed();

  return httpServer;
}

async function seed() {
  const existingItems = await storage.getItems();
  if (existingItems.length === 0) {
    console.log("Seeding database...");
    
    // Items
    const rice = await storage.createItem({ name: "Rice (Basmati)", unit: "kg", costPerUnit: 60, category: "Rations", lowStockThreshold: 50 });
    const dal = await storage.createItem({ name: "Dal (Toor)", unit: "kg", costPerUnit: 120, category: "Rations", lowStockThreshold: 30 });
    const oil = await storage.createItem({ name: "Cooking Oil", unit: "liters", costPerUnit: 150, category: "Rations", lowStockThreshold: 20 });
    const milk = await storage.createItem({ name: "Milk", unit: "liters", costPerUnit: 50, category: "Rations", lowStockThreshold: 10 });
    const diesel = await storage.createItem({ name: "Diesel (Gen)", unit: "liters", costPerUnit: 90, category: "Fuel", lowStockThreshold: 100 });

    // Initial Stock
    await storage.updateStock(rice.id, 500, "Initial Stock");
    await storage.updateStock(dal.id, 200, "Initial Stock");
    await storage.updateStock(oil.id, 100, "Initial Stock");
    await storage.updateStock(milk.id, 50, "Initial Stock");
    await storage.updateStock(diesel.id, 1000, "Initial Stock");

    // Some History for predictions
    // Day 1: Normal
    const log1 = await storage.createDailyLog({ date: "2023-10-01", dayType: "Normal", manpowerCount: 100, status: "Confirmed" });
    await storage.updateConsumption(log1.id, [
      { itemId: rice.id, quantityUsed: 50 }, // 0.5kg per person
      { itemId: dal.id, quantityUsed: 20 },  // 0.2kg per person
      { itemId: diesel.id, quantityUsed: 10 },
    ]);

    // Day 2: Normal
    const log2 = await storage.createDailyLog({ date: "2023-10-02", dayType: "Normal", manpowerCount: 110, status: "Confirmed" });
    await storage.updateConsumption(log2.id, [
      { itemId: rice.id, quantityUsed: 56 }, // ~0.5kg per person
      { itemId: dal.id, quantityUsed: 23 },
      { itemId: diesel.id, quantityUsed: 12 },
    ]);
    
    console.log("Seeding complete.");
  }
}
