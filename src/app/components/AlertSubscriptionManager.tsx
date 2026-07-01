"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";

interface AlertSubscriptionManagerProps {
  productId: string;
  stock: number;
  currentPrice: number;
}

export default function AlertSubscriptionManager({ productId, stock, currentPrice }: AlertSubscriptionManagerProps) {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [type, setType] = useState<"BACK_IN_STOCK" | "PRICE_DROP">(stock === 0 ? "BACK_IN_STOCK" : "PRICE_DROP");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const userEmail = session?.user?.email || email;
    if (!userEmail) {
      setMessage({ text: "Please enter your email address.", isError: true });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/alerts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          productId,
          type,
          targetPrice: type === "PRICE_DROP" && targetPrice ? Number(targetPrice) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to subscribe.");
      }

      setMessage({
        text: type === "BACK_IN_STOCK"
          ? "🎉 Success! We will email you the moment this product is back in stock."
          : "🎉 Success! We will watch this product and email you when the price drops.",
        isError: false,
      });

      // Clear input fields
      setEmail("");
      setTargetPrice("");
    } catch (err: any) {
      setMessage({ text: err.message || "An error occurred.", isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 mt-6 space-y-4">
      <div>
        <h4 className="text-sm font-black text-slate-900">
          {stock === 0 ? "⏰ Notify Me Back in Stock" : "📉 Price Drop Watchlist"}
        </h4>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          {stock === 0
            ? "Sign up to receive an automatic email alert as soon as this item restocks."
            : "Get notified immediately in your inbox when this product drops in price."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Guest email input (only if user is not authenticated) */}
        {!session?.user?.email && (
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
            />
          </div>
        )}

        {/* Target price input for PRICE_DROP (optional) */}
        {type === "PRICE_DROP" && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Price (Optional)</label>
              <span className="text-[10px] font-bold text-blue-600">Current: ₹{currentPrice.toLocaleString("en-IN")}</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Alert me when below this amount"
                className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
              />
            </div>
          </div>
        )}

        {/* Message response log */}
        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold border ${
              message.isError
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow transition cursor-pointer disabled:opacity-50"
        >
          {loading ? "Subscribing..." : "Enable Automatic Alert"}
        </button>
      </form>
    </div>
  );
}
