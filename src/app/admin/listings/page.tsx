"use client";

import React, { useEffect, useState } from "react";

type Listing = {
  id: string;
  title: string;
  price?: string | number;
  image?: string;
  make?: string;
  model?: string;
};

export default function AdminListingsPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", price: "", image_url: "", make: "", model: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/listings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ title: "", price: "", image_url: "", make: "", model: "" });
        await load();
      } else {
        console.error("create failed", await res.text());
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this listing?")) return;
    try {
      const res = await fetch(`/api/admin/listings?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        await load();
      } else {
        console.error("delete failed", await res.text());
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin — Listings</h1>
      <section className="mb-6">
        <form onSubmit={handleCreate} className="space-y-2 max-w-lg">
          <div>
            <label className="block text-sm">Title</label>
            <input className="w-full border p-2" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm">Price</label>
            <input className="w-full border p-2" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm">Image URL</label>
            <input className="w-full border p-2" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <input className="w-1/2 border p-2" placeholder="Make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
            <input className="w-1/2 border p-2" placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>
          <div>
            <button className="bg-yellow-500 px-4 py-2 rounded text-black">Create / Upsert</button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Listings</h2>
        {loading ? (
          <div>Loading…</div>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.id} className="p-3 border rounded flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {it.image ? <img src={it.image} alt="" className="w-16 h-16 object-cover" /> : <div className="w-16 h-16 bg-gray-100" />}
                  <div>
                    <div className="font-medium">{it.title}</div>
                    <div className="text-sm text-gray-600">{it.make} {it.model}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm">{typeof it.price === 'number' ? `£${it.price}` : it.price}</div>
                  <button className="text-red-600 text-sm" onClick={() => handleDelete(it.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
