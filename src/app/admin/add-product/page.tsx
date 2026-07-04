import React from "react";
import ProductFormClient from "./ProductFormClient";

import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminAddProductPage() {
  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Huge Semi-Transparent Logo Watermark in Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
        <div className="text-[12vw] font-black tracking-tighter text-indigo-500/[0.04] rotate-12 flex items-center gap-4 whitespace-nowrap">
          <span>🛒</span> NEXT<span>SHOP</span>
        </div>
      </div>

      {/* Glowing Ambient Background Orbs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
      
      {/* Decorative Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />

      {/* Glassmorphic Form Container */}
      <div className="w-full max-w-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">🛒 REGISTER</span> 
              <span className="text-slate-400">MARKETPLACE ASSET</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Publish freshly curated product listings into the live public database cluster.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs font-bold text-slate-300 bg-slate-800/40 border border-slate-700/60 px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-800 hover:text-white transition w-fit backdrop-blur-md"
          >
            🏠 Back to Home
          </Link>
        </div>

        <ProductFormClient />
      </div>
    </div>
  );
}