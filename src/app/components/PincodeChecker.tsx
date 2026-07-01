"use client";

import React, { useState } from "react";

export default function PincodeChecker() {
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    success: boolean;
    message: string;
    edd?: string;
    shippingFee?: number;
  } | null>(null);

  const calculateRates = (zip: string) => {
    // Basic serviceability logic
    if (!/^\d{6}$/.test(zip)) {
      return {
        success: false,
        message: "Please enter a valid 6-digit Pincode.",
      };
    }

    const prefix = zip.substring(0, 3);
    let days = 4;
    let fee = 50;

    if (prefix === "400") {
      days = 1; // Local zone
      fee = 0;
    } else if (["110", "560", "700"].includes(prefix)) {
      days = 2; // Metro zone
      fee = 40;
    } else if (zip.startsWith("190") || zip.startsWith("790")) {
      days = 7; // Remote zone
      fee = 90;
    }

    const eddDate = new Date();
    eddDate.setDate(eddDate.getDate() + days);

    const formattedDate = eddDate.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return {
      success: true,
      message: `Delivery available in this zone!`,
      edd: formattedDate,
      shippingFee: fee,
    };
  };

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode) return;
    setLoading(true);
    setTimeout(() => {
      const result = calculateRates(pincode);
      setStatus(result);
      setLoading(false);
    }, 400); // Small delay to feel organic
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Resolve mock location details based on coords to make it robust and local-friendly
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Fallback to a mock location for standard test paths (e.g. Mumbai)
          let resolvedPincode = "400001";
          
          // Quick mock logic to simulate geolocation resolving different zones based on latitude
          if (lat > 25) {
            resolvedPincode = "110001"; // Delhi region
          } else if (lng > 80) {
            resolvedPincode = "700001"; // Kolkata region
          }

          setPincode(resolvedPincode);
          const result = calculateRates(resolvedPincode);
          setStatus(result);
        } catch (err) {
          console.error("Location detection error:", err);
          setStatus({
            success: false,
            message: "Failed to resolve pincode from location. Please enter manually.",
          });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setStatus({
          success: false,
          message: "Location access denied. Please enter manually.",
        });
        setLoading(false);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 my-6 text-white">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Delivery Serviceability Check</h4>
      
      <form onSubmit={handleCheck} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 6-digit Pincode"
            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading || pincode.length !== 6}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer text-white"
        >
          {loading ? "Checking..." : "Verify"}
        </button>
        <button
          type="button"
          onClick={handleDetectLocation}
          className="bg-slate-850 hover:bg-slate-800 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer text-slate-300"
          title="Detect Location"
        >
          📍 <span className="hidden sm:inline">Auto-Detect</span>
        </button>
      </form>

      {status && (
        <div className={`mt-4 p-3 rounded-xl text-xs border ${
          status.success 
            ? "bg-blue-600/10 border-blue-500/20 text-blue-400" 
            : "bg-rose-600/10 border-rose-500/20 text-rose-400"
        }`}>
          <p className="font-extrabold flex items-center gap-1">
            {status.success ? "✅" : "⚠️"} {status.message}
          </p>
          {status.success && status.edd && (
            <div className="mt-2 space-y-1 font-medium text-slate-300">
              <p>📅 Delivery by: <strong className="text-white">{status.edd}</strong></p>
              <p>🚚 Shipping Charge: <strong className="text-white">{status.shippingFee === 0 ? "FREE" : `₹${status.shippingFee}`}</strong></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
