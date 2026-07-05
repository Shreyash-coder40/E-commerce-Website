"use client";

import React from "react";
import { useCartStore } from "../store/useCartStore";
import { useRouter } from "next/navigation";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { cart, removeFromCart, updateQuantity } = useCartStore();

  if (!isOpen) return null;

  const totalCost = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCheckoutRedirect = () => {
    onClose();
    router.push("/checkout");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900/90 backdrop-blur-xl border-l border-slate-800/80 shadow-2xl flex flex-col text-white">
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <h2 className="text-lg font-bold text-white">Your Shopping Cart</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl font-bold cursor-pointer">✕</button>
          </div>

          {/* Cart item list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cart.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <p className="text-sm">Your cart is completely empty.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Items in Cart</h3>
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 border-b border-slate-800/60 pb-4">
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-contain rounded-xl border border-slate-800 bg-slate-950 p-1" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-white line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-indigo-400 font-extrabold mt-0.5">₹{item.price.toLocaleString("en-IN")}</p>

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-3 py-1 bg-slate-950 hover:bg-slate-900 rounded text-xs font-black text-white border border-slate-800 transition cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-black text-white px-2">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-3 py-1 bg-slate-950 hover:bg-slate-900 rounded text-xs font-black text-white border border-slate-800 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-xs font-bold text-rose-500 hover:text-rose-400 self-start mt-1 cursor-pointer">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer total summary block */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-slate-800 bg-slate-950/60 space-y-4">
              <div className="flex justify-between text-base font-extrabold text-white">
                <span>Items Subtotal:</span>
                <span>₹{totalCost.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Taxes and delivery fees will be computed dynamically on the checkout page based on your shipping pincode.
              </p>
              <button
                onClick={handleCheckoutRedirect}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow transition active:scale-[0.98] cursor-pointer text-center block"
              >
                Proceed to Checkout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}