"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ManageProductsClient({ initialProducts }: { initialProducts: any[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Edit Form Fields State
  const [editForm, setEditForm] = useState({ name: "", price: "", stock: "", category: "", description: "" });
  const [loading, setLoading] = useState(false);

  // Trigger inline editing state populate
  const startEdit = (product: any) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category,
      description: product.description,
    });
  };

  // Handle PUT Update Action
  const handleUpdate = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error("Failed to save adjustments.");

      setProducts(products.map((p) => (p.id === id ? { ...p, ...editForm, price: parseFloat(editForm.price), stock: parseInt(editForm.stock) } : p)));
      setEditingId(null);
      router.refresh();
    } catch (err) {
      alert("Error updating product specifications.");
    } finally {
      setLoading(false);
    }
  };

  // Handle DELETE Destruction Action
  const handleDelete = async (id: string) => {
    if (!confirm("Are you completely sure you want to permanently delete this item?")) return;

    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed execution request.");

      setProducts(products.filter((p) => p.id !== id));
      router.refresh();
    } catch (err) {
      alert("Error executing product removal database command.");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <table className="min-w-full divide-y divide-slate-100 text-left text-sm text-slate-700">
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold border-b border-slate-200">
          <tr>
            <th className="px-6 py-4">Product Details</th>
            <th className="px-6 py-4">Category</th>
            <th className="px-6 py-4">Price</th>
            <th className="px-6 py-4">Stock Units</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-transparent">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-slate-50/50 transition">
              {editingId === product.id ? (
                /* Inline Editing Layout Row */
                <td colSpan={5} className="p-6 bg-slate-50 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/25 focus:border-[#0077B6] font-semibold" placeholder="Title" />
                    <input type="text" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/25 focus:border-[#0077B6] font-semibold" placeholder="Category" />
                    <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/25 focus:border-[#0077B6] font-semibold" placeholder="Price" />
                    <input type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/25 focus:border-[#0077B6] font-semibold" placeholder="Stock" />
                  </div>
                  <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/25 focus:border-[#0077B6] font-medium" rows={2} placeholder="Description details..." />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-650 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer">Cancel</button>
                    <button onClick={() => handleUpdate(product.id)} disabled={loading} className="px-4 py-1.5 bg-[#0077B6] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#005f91] transition cursor-pointer">{loading ? "Saving..." : "Save Changes"}</button>
                  </div>
                </td>
              ) : (
                /* Standard Render Table View Row */
                <>
                  <td className="px-6 py-4 flex items-center gap-3">
                    <img src={product.images?.[0] || "https://placehold.co/100"} alt="" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                    <div>
                      <div className="font-extrabold text-slate-900">{product.name}</div>
                      <div className="text-xs text-slate-500 max-w-[200px] truncate font-medium">{product.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-xs font-bold uppercase tracking-wide text-slate-650">{product.category}</span></td>
                  <td className="px-6 py-4 font-black text-[#0077B6]">₹{product.price.toLocaleString("en-IN")}</td>
                  <td className="px-6 py-4 font-semibold"><span className={product.stock === 0 ? "text-rose-600 font-black" : "text-slate-700"}>{product.stock} units</span></td>
                  <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                    <Link
                      href={`/admin/manage-products/${product.id}/reviews-qas`}
                      className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition inline-block align-middle"
                    >
                      💬 Reviews & Q&A
                    </Link>
                    <button onClick={() => startEdit(product)} className="text-xs font-bold text-[#0077B6] bg-indigo-50/30 border border-indigo-150 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition align-middle cursor-pointer">Edit</button>
                    <button onClick={() => handleDelete(product.id)} className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition align-middle cursor-pointer">Delete</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}