import express from "express";
import cors from "cors";
import { initDb, db } from "./db.js";
import { z } from "zod";
import { computeMetrics } from "./metrics.js";

const app = express();
app.use(cors());
app.use(express.json());

initDb();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "inventory-api" });
});

const ItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  unitCost: z.number().nonnegative(),
  dailyDemand: z.number().nonnegative(),
  leadTimeDays: z.number().nonnegative(),
  currentStock: z.number().nonnegative(),
  serviceLevel: z.enum(["0.90", "0.95", "0.97", "0.99"]).default("0.95"),
  demandStdDev: z.number().nonnegative().default(0)
});

function rowToItem(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    unitCost: row.unit_cost,
    dailyDemand: row.daily_demand,
    leadTimeDays: row.lead_time_days,
    currentStock: row.current_stock,
    serviceLevel: row.service_level,
    demandStdDev: row.demand_std_dev
  };
}

// LIST + SEARCH
app.get("/api/items", (req, res) => {
  const q = (req.query.q ?? "").toString().trim().toLowerCase();

  const rows = q
    ? db
        .prepare(
          `SELECT * FROM items
           WHERE LOWER(sku) LIKE ? OR LOWER(name) LIKE ?
           ORDER BY updated_at DESC`
        )
        .all(`%${q}%`, `%${q}%`)
    : db.prepare(`SELECT * FROM items ORDER BY updated_at DESC`).all();

  const enriched = rows.map((r) => {
    const item = rowToItem(r);
    return { ...item, metrics: computeMetrics(item) };
  });

  res.json(enriched);
});

// GET ONE
app.get("/api/items/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare(`SELECT * FROM items WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ message: "Not found" });

  const item = rowToItem(row);
  res.json({ ...item, metrics: computeMetrics(item) });
});

// CREATE
app.post("/api/items", (req, res) => {
  const parsed = ItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const it = parsed.data;

  const stmt = db.prepare(`
    INSERT INTO items
      (sku, name, unit_cost, daily_demand, lead_time_days, current_stock, service_level, demand_std_dev)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    it.sku,
    it.name,
    it.unitCost,
    it.dailyDemand,
    it.leadTimeDays,
    it.currentStock,
    it.serviceLevel,
    it.demandStdDev
  );

  const row = db.prepare(`SELECT * FROM items WHERE id = ?`).get(info.lastInsertRowid);
  const item = rowToItem(row);
  res.status(201).json({ ...item, metrics: computeMetrics(item) });
});

// UPDATE
app.put("/api/items/:id", (req, res) => {
  const id = Number(req.params.id);
  const exists = db.prepare(`SELECT id FROM items WHERE id = ?`).get(id);
  if (!exists) return res.status(404).json({ message: "Not found" });

  const parsed = ItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const it = parsed.data;

  db.prepare(`
    UPDATE items SET
      sku = ?, name = ?, unit_cost = ?, daily_demand = ?, lead_time_days = ?, current_stock = ?,
      service_level = ?, demand_std_dev = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    it.sku,
    it.name,
    it.unitCost,
    it.dailyDemand,
    it.leadTimeDays,
    it.currentStock,
    it.serviceLevel,
    it.demandStdDev,
    id
  );

  const row = db.prepare(`SELECT * FROM items WHERE id = ?`).get(id);
  const item = rowToItem(row);
  res.json({ ...item, metrics: computeMetrics(item) });
});

// DELETE
app.delete("/api/items/:id", (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare(`DELETE FROM items WHERE id = ?`).run(id);
  if (info.changes === 0) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true });
});

// CSV EXPORT
app.get("/api/export.csv", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM items ORDER BY updated_at DESC`).all();

  const header = [
    "id","sku","name","unitCost","dailyDemand","leadTimeDays","currentStock",
    "serviceLevel","demandStdDev","safetyStock","reorderPoint","daysOfStock","annualUsageValue"
  ];

  const lines = [header.join(",")];

  for (const r of rows) {
    const item = rowToItem(r);
    const m = computeMetrics(item);

    const values = [
      item.id,
      csv(item.sku),
      csv(item.name),
      item.unitCost,
      item.dailyDemand,
      item.leadTimeDays,
      item.currentStock,
      item.serviceLevel,
      item.demandStdDev,
      m.safetyStock,
      m.reorderPoint,
      m.daysOfStock,
      m.annualUsageValue
    ];
    lines.push(values.join(","));
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="inventory_export.csv"');
  res.send(lines.join("\n"));
});

function csv(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
