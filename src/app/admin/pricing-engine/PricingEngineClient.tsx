"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PricingEngineClient() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/pricing-engine")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load analytics records.");
        return res.json();
      })
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "An unexpected error occurred.");
        setLoading(false);
      });
  }, []);

  const applyPriceChange = async (id: string, newPrice: number) => {
    try {
      const selectedItem = items.find((i) => i.id === id);
      
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: newPrice,
          name: selectedItem?.name || "Optimized Product",
          category: "Updated",
          stock: selectedItem?.stock ?? 10,
          description: "Price optimized by dynamic engine automation.",
        }),
      });

      if (!response.ok) throw new Error();

      setItems(
        items.map((item) =>
          item.id === id
            ? { ...item, currentPrice: newPrice, strategy: "STABLE", reasoning: "Price updated successfully." }
            : item
        )
      );
      router.refresh();
      alert("Smart pricing metrics applied successfully!");
    } catch {
      alert("Failed to adjust price matrix target.");
    }
  };

  if (loading) return <div className="text-center py-20 text-sm font-medium text-slate-400">Analyzing inventory algorithms...</div>;
  if (error) return <div className="text-center py-20 text-sm font-medium text-red-400">Error: {error}</div>;
  if (items.length === 0) return <div className="text-center py-20 text-sm font-medium text-slate-400">No products found in the database.</div>;

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
      <table className="min-w-full divide-y divide-slate-800/60 text-left text-sm text-slate-300">
        <thead className="bg-slate-900/60 text-xs text-slate-400 uppercase font-bold">
          <tr>
            <th className="px-6 py-4">Product Details</th>
            <th className="px-6 py-4">30D Sales Volume</th>
            <th className="px-6 py-4">Strategy Outlook</th>
            <th className="px-6 py-4">Recommendation</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 bg-transparent">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-900/25 transition">
              <td className="px-6 py-4">
                <div className="font-bold text-white">{item.name}</div>
                <div className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{item.reasoning}</div>
              </td>
              <td className="px-6 py-4 font-semibold text-slate-300">{item.recentSales} units</td>
              <td className="px-6 py-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase ${
                  item.strategy === "SURGE" ? "bg-red-950/40 text-red-400 border border-red-900/30" :
                  item.strategy === "LIQUIDATE" ? "bg-amber-950/40 text-amber-400 border border-amber-900/30" :
                  "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30"
                }`}>
                  {item.strategy}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="text-xs text-slate-500">Current: <strong className="text-white">${item.currentPrice}</strong></div>
                {item.strategy !== "STABLE" && item.strategy !== "RESTOCK" && (
                  <div className="text-xs text-indigo-400 font-bold mt-0.5">Target: ${item.recommendedPrice}</div>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                {item.strategy !== "STABLE" && item.strategy !== "RESTOCK" ? (
                  <button
                    onClick={() => applyPriceChange(item.id, item.recommendedPrice)}
                    className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-xl shadow-sm transition cursor-pointer"
                  >
                    Apply Optimization
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 font-medium italic">Optimized</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}