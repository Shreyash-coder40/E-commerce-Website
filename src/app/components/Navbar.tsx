"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/app/store/useCartStore";
import { signOut } from "next-auth/react";
import CartDrawer from "./CartDrawer";

interface NavbarProps {
  session: any;
}

export default function Navbar({ session }: NavbarProps) {
  const { cart } = useCartStore() as any;
  const cartCount = cart.reduce((acc: number, item: any) => acc + item.quantity, 0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
    <header className="bg-navbar-bg backdrop-blur-md border-b border-navbar-border sticky top-0 z-40 text-navbar-text shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left column Logo & Menu Trigger */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Sidebar Trigger Button */}
          {session?.user && (
            <button 
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-navbar-text"
              aria-label="Open navigation menu"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Logo / Brand Link (Responsive fonts to prevent overlap) */}
          <Link href="/" className="text-base sm:text-xl font-black text-navbar-text tracking-tight hover:text-white/95 transition flex items-center gap-1 sm:gap-2">
            <span className="text-orange-600 text-base sm:text-lg">🛒</span> 
            <span>NEXT</span><span className="text-orange-600">SHOP</span>
          </Link>
        </div>
 
        {/* Action Controls Column */}
        <div className="flex items-center gap-3 sm:gap-6">
          
          {/* Cart Status Indicator Widget */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-navbar-text hover:text-orange-600 transition cursor-pointer bg-transparent border-0"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-600 text-white font-black text-[10px] h-5 w-5 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(255,107,53,0.5)]">
                {cartCount}
              </span>
            )}
          </button>
 
          {/* DYNAMIC AUTH BUTTON MATRIX CONTAINER */}
          {session?.user ? (
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              {session.user.role === "ADMIN" && (
                <div className="relative group pb-2 hidden md:block">
                  <button className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                    🛠️ Admin Tools
                    <svg className="h-3 w-3 transition-transform group-hover:rotate-180 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute right-0 top-full w-48 pt-2 hidden group-hover:block hover:block z-50 transition-all">
                    <div className="bg-card-bg border border-card-border rounded-xl shadow-xl py-2">
                      <Link
                        href="/admin/dashboard"
                        className="block px-4 py-2 text-xs font-bold text-card-text-secondary hover:text-card-text-primary hover:bg-pill-unselected-bg transition"
                      >
                        📈 Dashboard
                      </Link>
                      <Link
                        href="/admin/add-product"
                        className="block px-4 py-2 text-xs font-bold text-card-text-secondary hover:text-card-text-primary hover:bg-pill-unselected-bg transition"
                      >
                        ➕ Add Product
                      </Link>
                      <Link
                        href="/admin/manage-products"
                        className="block px-4 py-2 text-xs font-bold text-card-text-secondary hover:text-card-text-primary hover:bg-pill-unselected-bg transition"
                      >
                        📦 Manage Inventory
                      </Link>
                      <Link
                        href="/admin/feedback"
                        className="block px-4 py-2 text-xs font-bold text-card-text-secondary hover:text-card-text-primary hover:bg-pill-unselected-bg transition"
                      >
                        💬 Q&A & Reviews
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              <Link
                href="/orders"
                className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-xl transition hidden sm:inline-block"
              >
                🛍️ My Orders
              </Link>
              <span className="text-xs font-bold text-white/80 hidden lg:inline">
                Hi, <span className="text-white font-extrabold">{session.user.name || "User"}</span>
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-xs font-bold text-rose-200 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 px-3.5 py-2 rounded-xl transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 border border-transparent px-5 py-2.5 rounded-xl shadow-md transition shadow-[0_4px_12px_rgba(255,107,53,0.2)] hover:shadow-[0_4px_20px_rgba(255,107,53,0.4)]"
            >
              Sign In
            </Link>
          )}
 
        </div>
      </div>
    </header>

    {/* Collapsible Navigation Sidebar Drawer (Left-aligned) */}
    {isSidebarOpen && session?.user && (
      <>
        {/* Overlay background */}
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 transition-opacity"
        />

        {/* Sidebar Panel container */}
        <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-slate-900/90 backdrop-blur-xl border-r border-slate-800/80 shadow-2xl z-50 transform translate-x-0 transition-transform duration-300 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] tracking-tight text-white">
          
          {/* Sidebar Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-650 to-violet-650 text-white">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛒</span>
              <span className="text-xs font-black tracking-wider uppercase">NextShop Navigation</span>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="text-white/80 hover:text-white font-black text-sm cursor-pointer"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto p-5 space-y-2">
            <h5 className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Storefront Portals</h5>
            
            <Link 
              href="/" 
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-950/40 text-slate-300 hover:text-white font-bold text-xs transition"
            >
              <span className="text-base">🏠</span> Home Storefront
            </Link>

            <Link 
              href="/orders" 
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-950/40 text-slate-300 hover:text-white font-bold text-xs transition"
            >
              <span className="text-base">📦</span> My Orders & Tracking
            </Link>

            <Link 
              href="/checkout" 
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-950/40 text-slate-300 hover:text-white font-bold text-xs transition"
            >
              <span className="text-base">🛍️</span> Proceed to Checkout
            </Link>

            {/* Admin Block Divider & Core Features */}
            {session?.user?.role === "ADMIN" && (
              <>
                <div className="border-t border-slate-800 my-4" />

                <h5 className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Admin Core Features</h5>

                <Link 
                  href="/admin/dashboard" 
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-950/40 text-slate-300 hover:text-white font-bold text-xs transition"
                >
                  <span className="text-base">📊</span> Admin P&L Dashboard
                </Link>

                <Link 
                  href="/admin/manage-products" 
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-950/40 text-slate-300 hover:text-white font-bold text-xs transition"
                >
                  <span className="text-base">📦</span> Inventory Restock Manager
                </Link>

                <Link 
                  href="/admin/add-product" 
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-950/40 text-slate-300 hover:text-white font-bold text-xs transition"
                >
                  <span className="text-base">➕</span> Publish New Asset
                </Link>

                <Link 
                  href="/admin/ai-assistant" 
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-950/40 text-slate-300 hover:text-white font-bold text-xs transition"
                >
                  <span className="text-base">🤖</span> Admin Assistant Console
                </Link>

                <Link 
                  href="/admin/pricing-engine" 
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-950/40 text-slate-300 hover:text-white font-bold text-xs transition"
                >
                  <span className="text-base">⚙️</span> Dynamic Pricing Console
                </Link>

                <Link 
                  href="/admin/feedback" 
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-950/40 text-slate-300 hover:text-white font-bold text-xs transition"
                >
                  <span className="text-base">💬</span> Customer Feedbacks & Q&A
                </Link>
              </>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-center">
            <span className="text-[10px] text-slate-500 font-bold">NEXTSHOP v1.2.5 • Navigation Sidebar</span>
          </div>

        </div>
      </>
    )}

    <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}