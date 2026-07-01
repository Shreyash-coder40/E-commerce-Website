"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface ReorderButtonProps {
  orderId: string;
}

export default function ReorderButton({ orderId }: ReorderButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReorder = async () => {
    setLoading(true);
    setError("");

    try {
      console.log("Triggering 1-click reorder pipeline for order:", orderId);
      const res = await fetch("/api/orders/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize reorder checkout.");
      }

      // Check if Razorpay script is loaded
      if (!(window as any).Razorpay) {
        throw new Error("Razorpay payment gateway failed to load. Please reload page and retry.");
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "NEXTSHOP",
        description: "1-Click Reorder Checkout",
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

            console.log("Reorder payment verification successful!");
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
          color: "#2563eb",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Reorder client error:", err);
      setError(err.message || "An unexpected error occurred during reorder.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-500 font-semibold bg-red-50 border border-red-200 p-2 rounded-xl">
          {error}
        </p>
      )}
      <button
        onClick={handleReorder}
        disabled={loading}
        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-sm transition active:scale-[0.98] cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
      >
        🔄 {loading ? "Initializing checkout..." : "Buy Again (1-Click)"}
      </button>
    </div>
  );
}
