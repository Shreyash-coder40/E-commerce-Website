"use client";

import React, { useState } from "react";

interface OrderData {
  id: string;
  totalAmount: number;
  createdAt: string | Date;
  isPaid: boolean;
  status: string;
}

interface DashboardChartsProps {
  orders: OrderData[];
}

export default function DashboardCharts({ orders }: DashboardChartsProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ idx: number; type: "sales" | "losses" } | null>(null);

  // Group last 7 days dynamically
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  }).reverse();

  // Map database orders into daily metrics tracking sales vs. losses
  const dailyMetrics = last7Days.map((dateStr) => {
    const dayOrders = orders.filter((o) => {
      const orderDate = new Date(o.createdAt).toISOString().split("T")[0];
      return orderDate === dateStr;
    });

    // Sales: Paid orders that are NOT cancelled or return-approved
    const daySales = dayOrders.filter((o) => o.isPaid && o.status !== "CANCELLED" && o.status !== "RETURN_APPROVED");
    const salesRevenue = daySales.reduce((sum, o) => sum + o.totalAmount, 0);

    // Losses: Cancelled or return-approved orders
    const dayLosses = dayOrders.filter((o) => o.status === "CANCELLED" || o.status === "RETURN_APPROVED");
    const lossRevenue = dayLosses.reduce((sum, o) => sum + o.totalAmount, 0);

    // Format readable date labels (e.g., "Jun 24")
    const label = new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return {
      label,
      sales: salesRevenue,
      losses: lossRevenue,
      salesCount: daySales.length,
      lossesCount: dayLosses.length,
    };
  });

  // Rolling 7-day metrics for card summaries
  const rollingSales = dailyMetrics.reduce((sum, m) => sum + m.sales, 0);
  const rollingLosses = dailyMetrics.reduce((sum, m) => sum + m.losses, 0);
  const rollingNet = rollingSales - rollingLosses;

  // Max value to scale heights accurately
  const maxVal = Math.max(...dailyMetrics.map((m) => Math.max(m.sales, m.losses)), 100);

  // Generate coordinates for SVG drawing
  const width = 700;
  const height = 200;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 20;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const salesPoints = dailyMetrics.map((m, idx) => ({
    x: paddingLeft + (idx / 6) * chartWidth,
    y: (height - paddingBottom) - (m.sales / maxVal) * chartHeight
  }));

  const lossesPoints = dailyMetrics.map((m, idx) => ({
    x: paddingLeft + (idx / 6) * chartWidth,
    y: (height - paddingBottom) - (m.losses / maxVal) * chartHeight
  }));

  // Path strings
  const salesPath = salesPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const lossesPath = lossesPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Filled area path strings
  const salesAreaPath = `${salesPath} L ${salesPoints[salesPoints.length - 1].x} ${height - paddingBottom} L ${salesPoints[0].x} ${height - paddingBottom} Z`;
  const lossesAreaPath = `${lossesPath} L ${lossesPoints[lossesPoints.length - 1].x} ${height - paddingBottom} L ${lossesPoints[0].x} ${height - paddingBottom} Z`;

  return (
    <div className="space-y-6 mb-10">
      {/* 1. Quick Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Gross Sales */}
        <div className="bg-white border border-card-border rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">7-Day Gross Sales</p>
            <h4 className="text-xl font-black text-slate-900 mt-1">₹{rollingSales.toLocaleString("en-IN")}</h4>
            <p className="text-[10px] text-slate-400 mt-1">From successfully paid checkouts</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
            📊
          </div>
        </div>

        {/* Card 2: Financial Losses */}
        <div className="bg-white border border-card-border rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">7-Day Financial Losses</p>
            <h4 className="text-xl font-black text-rose-600 mt-1">₹{rollingLosses.toLocaleString("en-IN")}</h4>
            <p className="text-[10px] text-slate-400 mt-1">From cancellations & approved returns</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm">
            📉
          </div>
        </div>

        {/* Card 3: Net Profit Performance */}
        <div className="bg-white border border-card-border rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">7-Day Net Profit Trend</p>
            <h4 className={`text-xl font-black mt-1 ${rollingNet >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              ₹{rollingNet.toLocaleString("en-IN")}
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">Net performance over the period</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            rollingNet >= 0 
              ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
              : "bg-rose-55 border-rose-100 text-rose-600"
          }`}>
            {rollingNet >= 0 ? "📈" : "📉"}
          </div>
        </div>
      </div>

      {/* 2. Interactive SVG Line Graph Canvas */}
      <div className="bg-white border border-card-border rounded-2xl p-6 shadow-xs relative">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Financial Trendlines</h3>
            <p className="text-xs text-slate-500 mt-0.5">Visualizing gross sales vs. returns and cancellation losses.</p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] font-bold">
            <div className="flex items-center gap-1.5 text-indigo-600">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block shadow-sm"></span>
              Gross Sales
            </div>
            <div className="flex items-center gap-1.5 text-rose-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-sm"></span>
              Refund/Cancel Loss
            </div>
          </div>
        </div>

        {/* Line Chart Grid Area */}
        <div className="relative h-60 w-full">
          {/* Tooltip Overlay */}
          {hoveredPoint && (
            <div 
              style={{ 
                left: `${((hoveredPoint.idx / 6) * 90) + 5}%`,
                top: `${hoveredPoint.type === "sales" ? salesPoints[hoveredPoint.idx].y - 45 : lossesPoints[hoveredPoint.idx].y - 45}px`
              }}
              className="absolute transform -translate-x-1/2 bg-white border border-slate-200 text-slate-800 text-[10px] font-black px-2.5 py-1.5 rounded-xl shadow-xl pointer-events-none z-30 transition-all duration-150 whitespace-nowrap"
            >
              {hoveredPoint.type === "sales" ? (
                <>
                  <p className="text-indigo-600">💰 Sales: ₹{dailyMetrics[hoveredPoint.idx].sales.toLocaleString("en-IN")}</p>
                  <p className="text-slate-500 text-[9px] font-normal">{dailyMetrics[hoveredPoint.idx].salesCount} successful checkouts</p>
                </>
              ) : (
                <>
                  <p className="text-rose-650">🚫 Loss: ₹{dailyMetrics[hoveredPoint.idx].losses.toLocaleString("en-IN")}</p>
                  <p className="text-slate-500 text-[9px] font-normal">{dailyMetrics[hoveredPoint.idx].lossesCount} cancellation/return requests</p>
                </>
              )}
              <span className="block text-[8px] text-slate-400 text-center mt-0.5">{dailyMetrics[hoveredPoint.idx].label}</span>
            </div>
          )}

          {/* SVG Canvas */}
          <svg className="w-full h-full" viewBox="0 0 700 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="lossesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Background Grid Accent Lines */}
            <line x1="40" y1="20" x2="680" y2="20" stroke="#f1f5f9" strokeDasharray="4 4" />
            <line x1="40" y1="100" x2="680" y2="100" stroke="#f1f5f9" strokeDasharray="4 4" />
            <line x1="40" y1="180" x2="680" y2="180" stroke="#e2e8f0" strokeWidth="1" />

            {/* Shaded Area Fills */}
            <path d={salesAreaPath} fill="url(#salesGrad)" />
            <path d={lossesAreaPath} fill="url(#lossesGrad)" />

            {/* Path Trendlines */}
            <path d={salesPath} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d={lossesPath} fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Sales Nodes */}
            {salesPoints.map((p, idx) => (
              <circle
                key={`sales-node-${idx}`}
                cx={p.x}
                cy={p.y}
                r={hoveredPoint?.idx === idx && hoveredPoint?.type === "sales" ? 7 : 4.5}
                fill="#6366f1"
                stroke="#ffffff"
                strokeWidth={1.5}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredPoint({ idx, type: "sales" })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}

            {/* Losses Nodes */}
            {lossesPoints.map((p, idx) => (
              <circle
                key={`losses-node-${idx}`}
                cx={p.x}
                cy={p.y}
                r={hoveredPoint?.idx === idx && hoveredPoint?.type === "losses" ? 7 : 4.5}
                fill="#f43f5e"
                stroke="#ffffff"
                strokeWidth={1.5}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredPoint({ idx, type: "losses" })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}
          </svg>
        </div>

        {/* X-Axis Date Labels Container */}
        <div className="flex justify-between items-center mt-3 px-[40px] text-[10px] font-bold text-slate-500">
          {dailyMetrics.map((day, idx) => (
            <span key={idx}>{day.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}