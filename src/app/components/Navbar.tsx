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
    <>
    <header className="bg-navbar-bg backdrop-blur-md border-b border-navbar-border sticky top-0 z-40 text-navbar-text shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo / Brand Link */}
        <Link href="/" className="text-xl font-black text-navbar-text tracking-tight hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-2">
          <span className="text-indigo-600 dark:text-indigo-400">🛒</span> NEXT<span className="text-indigo-600 dark:text-indigo-400">SHOP</span>
        </Link>
 
        {/* Action Controls Column */}
        <div className="flex items-center gap-6">
          
          {/* Cart Status Indicator Widget */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-navbar-text hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer bg-transparent border-0"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-[10px] h-5 w-5 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.4)]">
                {cartCount}
              </span>
            )}
          </button>
 
          {/* DYNAMIC AUTH BUTTON MATRIX CONTAINER */}
          {session?.user ? (
            <div className="flex items-center gap-4 flex-wrap">
              {session.user.role === "ADMIN" && (
                <div className="relative group pb-2">
                  <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer">
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
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 px-4 py-2 rounded-xl transition"
              >
                🛍️ My Orders
              </Link>
              <span className="text-xs font-bold text-card-text-secondary hidden sm:inline">
                Hi, <span className="text-card-text-primary font-extrabold">{session.user.name || "User"}</span>
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border border-transparent px-5 py-2.5 rounded-xl shadow-md transition shadow-[0_4px_12px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)]"
            >
              Sign In
            </Link>
          )}
 
        </div>
      </div>
    </header>
    <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}