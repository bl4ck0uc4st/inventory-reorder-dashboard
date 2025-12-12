import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE || "http://localhost:5050";

const empty = {
  sku: "",
  name: "",
  unitCost: 0,
  dailyDemand: 0,
  leadTimeDays: 0,
  currentStock: 0,
  serviceLevel: "0.95",
  demandStdDev: 0
};

export default function App() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await fetch(`${API}/api/items`);
      const data = await res.json();
      setItems(data);
    } catch {
      setErr("Backend not reachable. Make sure server is running on http://localhost:5050");
    }
  }

  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      await fetch(`${API}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      setForm(empty);
      load();
    } catch {
      setErr("Save failed.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
          Inventory Reorder Dashboard
        </h1>

        {err && (
          <div style={{ background: "#fee2e2", color: "#991b1b", padding: 10, borderRadius: 8, marginBottom: 12 }}>
            {err}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "white", padding: 12, borderRadius: 12, marginBottom: 16 }}>
          <input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input type="number" placeholder="Unit Cost" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })} />
          <input type="number" placeholder="Daily Demand" value={form.dailyDemand} onChange={(e) => setForm({ ...form, dailyDemand: Number(e.target.value) })} />
          <input type="number" placeholder="Lead Time (days)" value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: Number(e.target.value) })} />
          <input type="number" placeholder="Current Stock" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })} />
          <button style={{ gridColumn: "1 / -1", background: "#0f172a", color: "white", padding: 10, borderRadius: 10 }}>
            Add Item
          </button>
        </form>

        <div style={{ background: "white", padding: 12, borderRadius: 12 }}>
          <h2 style={{ fontWeight: 600, marginBottom: 10 }}>Items</h2>
          <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th align="left">SKU</th>
                <th align="left">Name</th>
                <th align="center">Stock</th>
                <th align="center">ROP</th>
                <th align="center">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td>{i.sku}</td>
                  <td>{i.name}</td>
                  <td align="center">{i.currentStock}</td>
                  <td align="center">{i.metrics?.reorderPoint}</td>
                  <td align="center">{i.metrics?.status}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: 12, color: "#64748b" }}>
                    No items yet. Add your first SKU above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
          CSV Export: {API}/api/export.csv
        </p>
      </div>
    </div>
  );
}
