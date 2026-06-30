"use client";

import React, { useState } from "react";

interface OrderData {
  id: string;
  totalAmount: number;
  createdAt: string | Date;
}

interface DashboardChartsProps {
  orders: OrderData[];
}

export default function DashboardCharts({ orders }: DashboardChartsProps) {
  const [metricMode, setMetricMode] = useState<"revenue" | "aov">("revenue");

  // Group last 7 days of sales dynamically
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  }).reverse();

  // Map database orders into daily tracking buckets
  const dailyMetrics = last7Days.map((dateStr) => {
    const dayOrders = orders.filter((o) => {
      const orderDate = new Date(o.createdAt).toISOString().split("T")[0];
      return orderDate === dateStr;
    });

    const totalRevenue = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const aov = dayOrders.length > 0 ? totalRevenue / dayOrders.length : 0;

    // Format readable date labels (e.g., "Jun 24")
    const label = new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return { label, revenue: totalRevenue, aov, orderCount: dayOrders.length };
  });

  // Calculate high points to scale the graph heights accurately
  const maxRevenue = Math.max(...dailyMetrics.map((m) => m.revenue), 10);
  const maxAOV = Math.max(...dailyMetrics.map((m) => m.aov), 10);
  const currentMax = metricMode === "revenue" ? maxRevenue : maxAOV;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-10">
      
      {/* Chart Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-950">Store Velocity Pulse</h3>
          <p className="text-xs text-gray-500 mt-0.5">Tracking immediate volume fluctuations over the last rolling 7 days.</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl border">
          <button
            onClick={() => setMetricMode("revenue")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              metricMode === "revenue" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Gross Revenue
          </button>
          <button
            onClick={() => setMetricMode("aov")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              metricMode === "aov" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Avg Order Value (AOV)
          </button>
        </div>
      </div>

      {/* The Flexbox Bar Chart Matrix */}
      <div className="h-64 flex items-end justify-between gap-2 pt-4 px-2 relative border-b border-gray-200">
        
        {/* Background Grid Accent Lines */}
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-gray-100 pointer-events-none h-full flex flex-col justify-between">
          <div className="w-full border-b border-dashed border-gray-100"></div>
          <div className="w-full border-b border-dashed border-gray-100"></div>
          <div className="w-full border-b border-dashed border-gray-100"></div>
        </div>

        {dailyMetrics.map((day, idx) => {
          const currentVal = metricMode === "revenue" ? day.revenue : day.aov;
          // Calculate percentage height for the CSS block safely bounded to 100%
          const barHeight = `${Math.min((currentVal / currentMax) * 100, 100)}%`;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center group relative z-10">
              
              {/* Floating Tooltip Indicator */}
              <div className="absolute -top-12 bg-gray-950 text-white text-[10px] font-black px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow pointer-events-none whitespace-nowrap">
                {metricMode === "revenue" ? `Revenue: $${day.revenue.toFixed(2)}` : `AOV: $${day.aov.toFixed(2)}`}
                <span className="block text-[9px] font-normal text-gray-400 text-center">{day.orderCount} checkouts</span>
              </div>

              {/* Graphical Pillars */}
              <div 
                style={{ height: barHeight }} 
                className={`w-full max-w-[40px] rounded-t-xl transition-all duration-500 ease-out min-h-[4px] ${
                  currentVal > 0 
                    ? "bg-gradient-to-t from-indigo-600 to-indigo-500 shadow-sm group-hover:from-indigo-500 group-hover:to-indigo-400" 
                    : "bg-gray-100"
                }`}
              />

              {/* X-Axis Date Labels */}
              <span className="text-[10px] font-bold text-gray-500 mt-3 whitespace-nowrap select-none">
                {day.label}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
}