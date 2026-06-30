import React from "react";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardCharts from "./DashboardCharts";

export const revalidate = 0; // Forces Next.js to bypass caches and read live data on every single visit

export default async function AdminDashboardPage() {
  // 1. Secure verification layer
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  if (!isAdmin) {
    redirect("/");
  }

  // 2. Fetch dataset arrays from database engine concurrently
  const [
    revenueData,
    totalOrders,
    paidOrdersCount,
    lowStockProducts,
    recentOrders,
    allHistoricalOrders
  ] = await Promise.all([
    db.order.aggregate({
      where: { isPaid: true },
      _sum: { totalAmount: true },
    }),
    db.order.count(),
    db.order.count({ where: { isPaid: true } }),
    db.product.findMany({
      where: { stock: { lte: 3 } },
      orderBy: { stock: "asc" },
      take: 5,
    }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { name: true, email: true } } },
    }),
    // Fetch order history specifically to power the chart engine metrics
    db.order.findMany({
      where: { isPaid: true },
      select: { id: true, totalAmount: true, createdAt: true },
    }),
  ]);

  const totalRevenue = revenueData._sum.totalAmount || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Title Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight">Business Analytics Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Real-time revenue metrics, order volumes, and velocity charting.</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Link 
              href="/" 
              className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition"
            >
              🏠 Back to Home
            </Link>
            {/* 1. SMART PRICING ENGINE ACTION BUTTON */}
            <Link 
              href="/admin/pricing-engine" 
              className="text-xs font-bold text-white bg-indigo-600 px-4 py-2.5 rounded-xl shadow-sm hover:bg-indigo-500 transition"
            >
              🔥 Smart Pricing Engine
            </Link>
            {/* 2. INVENTORY MANAGEMENT ACTION BUTTON */}
            <Link 
              href="/admin/manage-products" 
              className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition"
            >
              🛠️ Manage Inventory
            </Link>
          </div>
        </div>

        {/* Injected Visual Representation Graph Matrix */}
        <DashboardCharts orders={allHistoricalOrders} />

        {/* 4-Column Stat Matrix Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gross Revenue</p>
            <h3 className="text-3xl font-black text-indigo-600 mt-2">₹{totalRevenue.toLocaleString("en-IN")}</h3>
            <p className="text-[11px] text-green-600 font-semibold mt-1">● Settled tracking sync</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Sales Invoiced</p>
            <h3 className="text-3xl font-black text-gray-950 mt-2">{totalOrders}</h3>
            <p className="text-[11px] text-gray-500 mt-1">Lifetime checkouts</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Conversion Volume</p>
            <h3 className="text-3xl font-black text-gray-950 mt-2">
              {totalOrders > 0 ? ((paidOrdersCount / totalOrders) * 100).toFixed(0) : 0}%
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">{paidOrdersCount} approvals</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Low Stock Warnings</p>
            <h3 className={`text-3xl font-black mt-2 ${lowStockProducts.length > 0 ? "text-red-500" : "text-green-600"}`}>
              {lowStockProducts.length}
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">Products with ≤ 3 pieces</p>
          </div>
        </div>

        {/* Bottom Split List Tables Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden lg:col-span-2">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-base font-bold text-gray-950">Recent Checkout Invoices</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {recentOrders.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500">No transactions recorded.</div>
              ) : (
                recentOrders.map((order: any) => (
                  <div key={order.id} className="p-4 sm:p-6 flex items-center justify-between gap-4 text-sm hover:bg-gray-50/50 transition">
                    <div className="truncate flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-950 truncate">Customer: {order.user?.name || "Anonymous Shopper"}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.isPaid 
                            ? "bg-green-100 text-green-700" 
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {order.isPaid ? "PAID" : "PENDING"}
                        </span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{order.user?.email}</p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="font-extrabold text-indigo-600">₹{order.totalAmount.toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-base font-bold text-gray-950">Fulfillment Stock Alerts</h3>
            </div>
            <div className="p-6 divide-y divide-gray-100">
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-12 text-sm text-green-600 font-medium">✓ All storage inventory healthy.</div>
              ) : (
                lowStockProducts.map((product) => (
                  <div key={product.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-sm">
                    <div className="truncate">
                      <h4 className="font-bold text-gray-950 truncate">{product.name}</h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-700">
                      {product.stock} left
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}