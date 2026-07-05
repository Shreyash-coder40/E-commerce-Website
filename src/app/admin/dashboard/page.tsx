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
      where: { isPaid: true },
      select: { id: true, totalAmount: true, createdAt: true },
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
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Huge Semi-Transparent Logo Watermark in Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
        <div className="text-[12vw] font-black tracking-tighter text-indigo-500/[0.09] rotate-12 flex items-center gap-4 whitespace-nowrap">
          <span>🛒</span> NEXT<span>SHOP</span>
        </div>
      </div>

      {/* Glowing Ambient Background Orbs */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-fuchsia-500/15 rounded-full blur-3xl animate-pulse" />
      
      {/* Decorative Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25" />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        
        {/* Header Title Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Business Analytics Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">Real-time revenue metrics, order volumes, and velocity charting.</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Link 
              href="/" 
              className="text-xs font-bold text-slate-300 bg-slate-800/40 border border-slate-700/60 px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-800 hover:text-white transition backdrop-blur-md"
            >
              🏠 Back to Home
            </Link>
            {/* 1. SMART PRICING ENGINE ACTION BUTTON */}
            <Link 
              href="/admin/pricing-engine" 
              className="text-xs font-bold text-slate-300 bg-slate-800/40 border border-slate-700/60 px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-800 hover:text-white transition backdrop-blur-md"
            >
              🔥 Pricing Engine
            </Link>
            {/* 2. INVENTORY MANAGEMENT ACTION BUTTON */}
            <Link 
              href="/admin/manage-products" 
              className="text-xs font-bold text-slate-300 bg-slate-800/40 border border-slate-700/60 px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-800 hover:text-white transition backdrop-blur-md"
            >
              🛠️ Manage Inventory
            </Link>
            {/* 3. AI ASSISTANT CONSOLE ACTION BUTTON */}
            <Link 
              href="/admin/ai-assistant" 
              className="text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 rounded-xl shadow-sm hover:from-indigo-400 hover:to-violet-400 transition"
            >
              🤖 AI Assistant Console
            </Link>
          </div>
        </div>

        {/* Injected Visual Representation Graph Matrix */}
        <DashboardCharts orders={allHistoricalOrders} />

        {/* 4-Column Stat Matrix Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Revenue</p>
            <h3 className="text-3xl font-black text-indigo-400 mt-2">₹{totalRevenue.toLocaleString("en-IN")}</h3>
            <p className="text-[11px] text-emerald-400 font-semibold mt-1">● Settled tracking sync</p>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales Invoiced</p>
            <h3 className="text-3xl font-black text-white mt-2">{totalOrders}</h3>
            <p className="text-[11px] text-slate-500 mt-1">Lifetime checkouts</p>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversion Volume</p>
            <h3 className="text-3xl font-black text-white mt-2">
              {totalOrders > 0 ? ((paidOrdersCount / totalOrders) * 100).toFixed(0) : 0}%
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">{paidOrdersCount} approvals</p>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock Warnings</p>
            <h3 className={`text-3xl font-black mt-2 ${lowStockProducts.length > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {lowStockProducts.length}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Products with ≤ 3 pieces</p>
          </div>
        </div>

        {/* Order and Customer Management Hub Row */}
        <div className="mb-10">
          <AdminOrderManager initialOrders={recentOrders} initialCustomers={allCustomersWithOrders} />
        </div>

        {/* Bottom Split List Tables Area */}
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-800/60 bg-slate-900/60">
              <h3 className="text-base font-bold text-white">Fulfillment Stock Alerts</h3>
            </div>
            <div className="p-6 divide-y divide-slate-800/60">
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-12 text-sm text-emerald-400 font-medium">✓ All storage inventory healthy.</div>
              ) : (
                lowStockProducts.map((product: any) => (
                  <div key={product.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-sm">
                    <div className="truncate">
                      <h4 className="font-bold text-white truncate">{product.name}</h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-950/45 text-amber-400 border border-amber-900/30">
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