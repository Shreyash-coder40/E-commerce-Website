"use client";

import React, { useState } from "react";
import { useCartStore } from "../store/useCartStore";
import { useRouter } from "next/navigation";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { cart, removeFromCart, updateQuantity, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const totalCost = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    setLoading(true);
    setError("");

    try {
      console.log("Sending checkout payload...", { cartItems: cart });

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cart,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Direct guest to login flow if not authenticated
          router.push("/login");
          onClose();
          return;
        }
        throw new Error(data.error || "Failed to initialize order payment profile.");
      }

      // Open Razorpay payment gateway
      if (!(window as any).Razorpay) {
        throw new Error("Razorpay payment gateway failed to load. Please refresh and try again.");
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "NEXTSHOP",
        description: "Secure Order Checkout",
        order_id: data.razorpayOrderId,
        handler: async function (paymentResponse: any) {
          setLoading(true);
          try {
            const verifyRes = await fetch("/api/checkout/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                orderId: data.orderId,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            console.log("Verification successful! Order paid.");
            clearCart();
            onClose();
            router.push("/orders");
            router.refresh();
          } catch (verifyErr: any) {
            console.error("Verification error:", verifyErr);
            setError(verifyErr.message || "Failed to verify transaction signature.");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
        theme: {
          color: "#4f46e5",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Frontend checkout catch error:", err);
      setError(err.message || "An unexpected error occurred during checkout.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-250 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Your Shopping Cart</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
          </div>

          {/* Cart item list wrapper */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-750 text-xs rounded-xl font-medium">
                <strong>Checkout Error:</strong> {error}
              </div>
            )}

            {cart.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-sm">Your cart is completely empty.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center gap-4 border-b border-gray-100 pb-4">
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xl border" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-indigo-600 font-extrabold mt-0.5">₹{item.price.toLocaleString("en-IN")}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-black text-black border border-gray-400 transition"
                      >
                        -
                      </button>
                      <span className="text-xs font-black text-gray-950 px-2">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                        disabled={item.quantity >= item.stock}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-black text-black border border-gray-400 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-xs font-bold text-red-500 hover:text-red-700 self-start mt-1">Remove</button>
                </div>
              ))
            )}
          </div>
 
          {/* Footer total summary block */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-gray-250 bg-gray-50">
              <div className="flex justify-between text-base font-bold text-gray-950">
                <span>Subtotal Amount:</span>
                <span>₹{totalCost.toLocaleString("en-IN")}</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow transition disabled:bg-indigo-400 active:scale-[0.98]"
              >
                {loading ? "Processing Payment..." : "Confirm & Pay"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}