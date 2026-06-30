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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo / Brand Link */}
        <Link href="/" className="text-xl font-black text-gray-950 tracking-tight hover:text-indigo-600 transition">
          🛒 NEXT<span className="text-indigo-600">SHOP</span>
        </Link>

        {/* Action Controls Column */}
        <div className="flex items-center gap-6">
          
          {/* Cart Status Indicator Widget */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-gray-600 hover:text-indigo-600 transition cursor-pointer bg-transparent border-0"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white font-black text-[10px] h-5 w-5 rounded-full flex items-center justify-center animate-pulse">
                {cartCount}
              </span>
            )}
          </button>

          {/* DYNAMIC AUTH BUTTON MATRIX CONTAINER */}
          {session?.user ? (
            <div className="flex items-center gap-4 flex-wrap">
              {session.user.role === "ADMIN" && (
                <>
                  <Link
                    href="/admin/dashboard"
                    className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-xl transition"
                  >
                    📈 Admin Dashboard
                  </Link>
                  <Link
                    href="/admin/add-product"
                    className="text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 px-4 py-2 rounded-xl transition"
                  >
                    ➕ Add Product
                  </Link>
                  <Link
                    href="/admin/manage-products"
                    className="text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2 rounded-xl transition"
                  >
                    📦 Manage Inventory
                  </Link>
                  <Link
                    href="/admin/feedback"
                    className="text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-4 py-2 rounded-xl transition"
                  >
                    💬 Q&A & Reviews
                  </Link>
                </>
              )}
              <Link
                href="/orders"
                className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-xl transition"
              >
                🛍️ My Orders
              </Link>
              <span className="text-xs font-bold text-gray-600 hidden sm:inline">
                Hi, <span className="text-gray-950">{session.user.name || "User"}</span>
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-xl transition animate-pulse"
              >
                Sign Out
              </button>
            </div>
          ) : (
            // FIXED: Explicitly shows the login button prominently when no session exists
            <Link
              href="/login"
              className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 border border-transparent px-5 py-2.5 rounded-xl shadow-sm transition"
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