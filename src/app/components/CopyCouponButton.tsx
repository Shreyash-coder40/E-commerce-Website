"use client";
 
import React, { useState } from "react";
 
interface CopyCouponButtonProps {
  code: string;
}
 
export default function CopyCouponButton({ code }: CopyCouponButtonProps) {
  const [copied, setCopied] = useState(false);
 
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert(`Coupon Code: ${code}`);
    }
  };
 
  return (
    <button 
      onClick={handleCopy}
      className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold px-6 py-3.5 rounded-xl transition shadow-lg shadow-indigo-600/25 active:scale-95 cursor-pointer uppercase tracking-wider whitespace-nowrap"
    >
      {copied ? "✓ Copied!" : "Copy Code"}
    </button>
  );
}
