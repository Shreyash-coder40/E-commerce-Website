import React from "react";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardCharts from "./DashboardCharts";
import AdminOrderManager from "@/app/components/AdminOrderManager";
import AdminAiChatbot from "@/app/components/AdminAiChatbot";

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
    allHistoricalOrders,
    allCustomersWithOrders
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
      include: { 
        user: { select: { name: true, email: true } },
        items: { include: { product: true } }
      },
    }),
    // Fetch order history specifically to power the chart engine metrics
    db.order.findMany({
      select: { id: true, totalAmount: true, createdAt: true, isPaid: true, status: true },
    }),
    db.user.findMany({
      where: {
        orders: { some: {} }
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        addresses: true,
        orders: {
          select: {
            id: true,
            totalAmount: true,
            isPaid: true,
            status: true,
            createdAt: true,
            shippingCost: true,
            taxAmount: true,
            items: {
              include: {
                product: { select: { name: true } }
              }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    })
  ]);

  const totalRevenue = revenueData._sum.totalAmount || 0;

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Huge Semi-Transparent Logo Watermark in Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
        <div className="text-[12vw] font-black tracking-tighter text-indigo-500/[0.04] rotate-12 flex items-center gap-4 whitespace-nowrap">
          <span>🛒</span> NEXT<span>SHOP</span>
        </div>
      </div>

      {/* Glowing Ambient Background Orbs */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-indigo-500/[0.04] rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-500/[0.04] rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-orange-500/[0.02] rounded-full blur-3xl animate-pulse" />
      
      {/* Decorative Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60" />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        
        {/* Header Title Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Business Analytics Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Real-time revenue metrics, order volumes, and velocity charting.</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Link 
              href="/" 
              className="text-xs font-bold text-slate-650 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-xs hover:bg-slate-50 hover:text-slate-900 transition"
            >
              🏠 Back to Home
            </Link>
            {/* 1. SMART PRICING ENGINE ACTION BUTTON */}
            <Link 
              href="/admin/pricing-engine" 
              className="text-xs font-bold text-slate-650 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-xs hover:bg-slate-50 hover:text-slate-900 transition"
            >
              🔥 Pricing Engine
            </Link>
            {/* 2. INVENTORY MANAGEMENT ACTION BUTTON */}
            <Link 
              href="/admin/manage-products" 
              className="text-xs font-bold text-slate-650 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-xs hover:bg-slate-50 hover:text-slate-900 transition"
            >
              🛠️ Manage Inventory
            </Link>
            {/* 3. AI ASSISTANT CONSOLE ACTION BUTTON */}
            <Link 
              href="/admin/ai-assistant" 
              className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl shadow-md transition"
            >
              🤖 AI Assistant Console
            </Link>
          </div>
        </div>

        {/* Injected Visual Representation Graph Matrix */}
        <DashboardCharts orders={allHistoricalOrders} />

        {/* 4-Column Stat Matrix Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <div className="bg-white border border-card-border p-6 rounded-2xl shadow-xs">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Revenue</p>
            <h3 className="text-3xl font-black text-indigo-600 mt-2">₹{totalRevenue.toLocaleString("en-IN")}</h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">● Settled tracking sync</p>
          </div>
          <div className="bg-white border border-card-border p-6 rounded-2xl shadow-xs">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales Invoiced</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{totalOrders}</h3>
            <p className="text-[11px] text-slate-500 mt-1">Lifetime checkouts</p>
          </div>
          <div className="bg-white border border-card-border p-6 rounded-2xl shadow-xs">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conversion Volume</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">
              {totalOrders > 0 ? ((paidOrdersCount / totalOrders) * 100).toFixed(0) : 0}%
            </h3>
            <p className="text-[11px] text-slate-550 mt-1">{paidOrdersCount} approvals</p>
          </div>
          <div className="bg-white border border-card-border p-6 rounded-2xl shadow-xs">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock Warnings</p>
            <h3 className={`text-3xl font-black mt-2 ${lowStockProducts.length > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {lowStockProducts.length}
            </h3>
            <p className="text-[11px] text-slate-550 mt-1">Products with ≤ 3 pieces</p>
          </div>
        </div>

        {/* Order and Customer Management Hub Row */}
        <div className="mb-10">
          <AdminOrderManager initialOrders={recentOrders} initialCustomers={allCustomersWithOrders} />
        </div>

        {/* Bottom Split List Tables Area */}
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-white border border-card-border rounded-2xl shadow-xs overflow-hidden">
            <div className="p-6 border-b border-card-border bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">Fulfillment Stock Alerts</h3>
            </div>
            <div className="p-6 divide-y divide-slate-100">
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-12 text-sm text-emerald-600 font-medium">✓ All storage inventory healthy.</div>
              ) : (
                lowStockProducts.map((product: any) => (
                  <div key={product.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-sm">
                    <div className="truncate">
                      <h4 className="font-bold text-slate-800 truncate">{product.name}</h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-50 text-amber-600 border border-amber-200">
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