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

  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo / Brand Link */}
        <Link href="/" className="text-xl font-black text-white tracking-tight hover:text-blue-400 transition flex items-center gap-2">
          <span className="text-blue-500">🛒</span> NEXT<span className="text-blue-500">SHOP</span>
        </Link>
 
        {/* Action Controls Column */}
        <div className="flex items-center gap-6">
          
          {/* Cart Status Indicator Widget */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-slate-300 hover:text-blue-400 transition cursor-pointer bg-transparent border-0"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white font-black text-[10px] h-5 w-5 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]">
                {cartCount}
              </span>
            )}
          </button>
 
          {/* DYNAMIC AUTH BUTTON MATRIX CONTAINER */}
          {session?.user ? (
            <div className="flex items-center gap-4 flex-wrap">
              {session.user.role === "ADMIN" && (
                <div className="relative group">
                  <button className="text-xs font-bold text-blue-400 bg-blue-950/40 hover:bg-blue-950/60 border border-blue-900/50 px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                    🛠️ Admin Tools
                    <svg className="h-3 w-3 transition-transform group-hover:rotate-180 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-2 hidden group-hover:block hover:block z-50 transition-all">
                    <Link
                      href="/admin/dashboard"
                      className="block px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                    >
                      📈 Dashboard
                    </Link>
                    <Link
                      href="/admin/add-product"
                      className="block px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                    >
                      ➕ Add Product
                    </Link>
                    <Link
                      href="/admin/manage-products"
                      className="block px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                    >
                      📦 Manage Inventory
                    </Link>
                    <Link
                      href="/admin/feedback"
                      className="block px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                    >
                      💬 Q&A & Reviews
                    </Link>
                  </div>
                </div>
              )}
              <Link
                href="/orders"
                className="text-xs font-bold text-blue-400 bg-blue-950/40 hover:bg-blue-950/60 border border-blue-900/50 px-4 py-2 rounded-xl transition"
              >
                🛍️ My Orders
              </Link>
              <span className="text-xs font-bold text-slate-300 hidden sm:inline">
                Hi, <span className="text-white font-extrabold">{session.user.name || "User"}</span>
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-xs font-bold text-rose-400 bg-rose-950/40 hover:bg-rose-950/60 border border-rose-900/50 px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 border border-transparent px-5 py-2.5 rounded-xl shadow-md transition shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.5)]"
            >
              Sign In
            </Link>
          )}
 
        </div>
      </div>
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
}