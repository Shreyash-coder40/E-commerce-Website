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
      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-3.5 rounded-xl transition shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer uppercase tracking-wider whitespace-nowrap"
    >
      {copied ? "✓ Copied!" : "Copy Code"}
    </button>
  );
}
