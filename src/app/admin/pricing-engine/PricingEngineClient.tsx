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

  if (loading) return <div className="text-center py-20 text-sm font-medium text-gray-500">Analyzing inventory algorithms...</div>;
  if (error) return <div className="text-center py-20 text-sm font-medium text-red-500">Error: {error}</div>;
  if (items.length === 0) return <div className="text-center py-20 text-sm font-medium text-gray-500">No products found in the database.</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="min-w-full divide-y text-left text-sm text-gray-700">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold">
          <tr>
            <th className="px-6 py-4">Product Details</th>
            <th className="px-6 py-4">30D Sales Volume</th>
            <th className="px-6 py-4">Strategy Outlook</th>
            <th className="px-6 py-4">Recommendation</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y bg-white">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50/40 transition">
              <td className="px-6 py-4">
                <div className="font-bold text-gray-950">{item.name}</div>
                <div className="text-xs text-gray-400 mt-1 max-w-sm leading-relaxed">{item.reasoning}</div>
              </td>
              <td className="px-6 py-4 font-semibold text-gray-600">{item.recentSales} units</td>
              <td className="px-6 py-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase ${
                  item.strategy === "SURGE" ? "bg-red-50 text-red-700 border border-red-200" :
                  item.strategy === "LIQUIDATE" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                  "bg-green-50 text-green-700 border border-green-200"
                }`}>
                  {item.strategy}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="text-xs text-gray-400">Current: <strong className="text-gray-700">${item.currentPrice}</strong></div>
                {item.strategy !== "STABLE" && item.strategy !== "RESTOCK" && (
                  <div className="text-xs text-indigo-600 font-bold mt-0.5">Target: ${item.recommendedPrice}</div>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                {item.strategy !== "STABLE" && item.strategy !== "RESTOCK" ? (
                  <button
                    onClick={() => applyPriceChange(item.id, item.recommendedPrice)}
                    className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-xl shadow-sm transition"
                  >
                    Apply Optimization
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 font-medium italic">Optimized</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}