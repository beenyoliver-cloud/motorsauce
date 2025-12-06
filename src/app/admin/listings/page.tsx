"use client";

import React, { useEffect, useState } from "react";
import { AdminNav, AdminBreadcrumb } from "@/components/AdminNav";

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
    <div className="max-w-7xl mx-auto p-8">
      <AdminBreadcrumb current="Listings" />
      <AdminNav />
      
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage Listings</h1>
      
      <section className="mb-8 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Listing</h2>
        <form onSubmit={handleCreate} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-transparent" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
            <input className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-transparent" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
            <input className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-transparent" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <input className="w-1/2 border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-transparent" placeholder="Make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
            <input className="w-1/2 border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-transparent" placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>
          <div>
            <button className="bg-yellow-500 hover:bg-yellow-600 px-6 py-3 rounded-lg text-black font-semibold transition">Create / Upsert</button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Listings</h2>
        {loading ? (
          <div className="text-gray-600 py-4">Loading…</div>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.id} className="p-4 border border-gray-200 rounded-lg flex items-center justify-between hover:shadow-sm transition">
                <div className="flex items-center gap-4">
                  {it.image ? <img src={it.image} alt="" className="w-16 h-16 object-cover rounded-lg" /> : <div className="w-16 h-16 bg-gray-100 rounded-lg" />}
                  <div>
                    <div className="font-medium text-gray-900">{it.title}</div>
                    <div className="text-sm text-gray-600">{it.make} {it.model}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium text-gray-900">{typeof it.price === 'number' ? `£${it.price}` : it.price}</div>
                  <button className="text-red-600 hover:text-red-700 text-sm font-medium" onClick={() => handleDelete(it.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
