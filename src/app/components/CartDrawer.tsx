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
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col text-slate-900">
          {/* Header */}
          <div className="p-6 border-b border-gray-250 flex items-center justify-between bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">Your Shopping Cart</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer">✕</button>
          </div>

          {/* Cart item list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cart.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-sm">Your cart is completely empty.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Items in Cart</h3>
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 border-b border-gray-150 pb-4">
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-contain rounded-xl border bg-gray-50 p-1" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-blue-600 font-extrabold mt-0.5">₹{item.price.toLocaleString("en-IN")}</p>

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-black text-black border border-gray-400 transition cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-black text-gray-950 px-2">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-black text-black border border-gray-400 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-xs font-bold text-red-500 hover:text-red-700 self-start mt-1 cursor-pointer">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer total summary block */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-gray-250 bg-gray-50 space-y-4">
              <div className="flex justify-between text-base font-extrabold text-gray-950">
                <span>Items Subtotal:</span>
                <span>₹{totalCost.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                Taxes and delivery fees will be computed dynamically on the checkout page based on your shipping pincode.
              </p>
              <button
                onClick={handleCheckoutRedirect}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow transition active:scale-[0.98] cursor-pointer text-center block"
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