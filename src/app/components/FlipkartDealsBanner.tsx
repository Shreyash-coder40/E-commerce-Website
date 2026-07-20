"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  price: number;
  mrp?: number | null;
  images: string[];
  category: string;
}

export default function FlipkartDealsBanner({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 11, minutes: 45, seconds: 30 });

  // Live ticking countdown timer for Deals of the Day
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { hours: prev.hours, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 12, minutes: 0, seconds: 0 }; // reset
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -450 : 450;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!products || products.length === 0) return null;

  // Curate products with deals
  const dealsProducts = products.slice(0, 10);

  return (
    <div className="w-full bg-white border border-card-border rounded-3xl overflow-hidden shadow-sm mb-8">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-indigo-650 via-indigo-700 to-indigo-800 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-indigo-700 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-600 flex items-center justify-center text-xl shadow-md shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight uppercase">Best Deals of the Day</h2>
              <span className="bg-orange-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse">
                HOT
              </span>
            </div>
            <p className="text-xs text-white/80 font-medium mt-0.5">
              Handpicked discounts across Electronics, Fashion & more
            </p>
          </div>
        </div>

        {/* Timer & View All Controls */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          {/* Live Countdown Badge */}
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-1.5 rounded-xl text-xs font-bold font-mono tracking-wider">
            <span className="text-orange-400">⏱️ Ends in:</span>
            <span>
              {String(timeLeft.hours).padStart(2, "0")}h :{" "}
              {String(timeLeft.minutes).padStart(2, "0")}m :{" "}
              {String(timeLeft.seconds).padStart(2, "0")}s
            </span>
          </div>

          {/* Desktop Scroll Arrows */}
          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => scroll("left")}
              className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white text-white hover:text-indigo-900 font-black transition flex items-center justify-center text-sm shadow-xs"
              title="Scroll Left"
            >
              ‹
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white text-white hover:text-indigo-900 font-black transition flex items-center justify-center text-sm shadow-xs"
              title="Scroll Right"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Product Carousel */}
      <div className="relative group/carousel p-4 sm:p-6 bg-slate-50/50">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {dealsProducts.map((prod, idx) => {
            const discountPercent =
              prod.mrp && prod.mrp > prod.price
                ? Math.round(((prod.mrp - prod.price) / prod.mrp) * 100)
                : 25 + (idx % 25); // deal tag percentage

            const dealTag =
              discountPercent >= 40
                ? `Min. ${discountPercent}% Off`
                : discountPercent >= 30
                ? `Flat ${discountPercent}% Off`
                : `Special Price`;

            return (
              <Link
                key={prod.id}
                href={`/products/${prod.id}`}
                className="min-w-[170px] sm:min-w-[210px] max-w-[220px] bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col items-center text-center shadow-xs hover:shadow-md hover:border-indigo-500/30 hover:scale-[1.02] transition-all duration-300 group snap-start shrink-0 relative"
              >
                {/* Top Badge */}
                <div className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-2xs z-10">
                  {dealTag}
                </div>

                {/* Product Image */}
                <div className="w-36 h-36 relative bg-slate-50/80 rounded-xl overflow-hidden p-3 flex items-center justify-center mb-3 mt-4 border border-slate-100">
                  <Image
                    src={prod.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300"}
                    alt={prod.name}
                    fill
                    className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Title */}
                <h4 className="text-xs font-bold text-slate-800 truncate w-full group-hover:text-indigo-600 transition mb-1">
                  {prod.name}
                </h4>

                {/* Deal Highlights (Flipkart green/orange tags) */}
                <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wide mb-1">
                  From ₹{prod.price.toLocaleString("en-IN")}
                </span>

                {/* MRP strikethrough */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <span>MRP:</span>
                  <span className="line-through">
                    ₹{(prod.mrp || Math.round(prod.price * 1.35)).toLocaleString("en-IN")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Mobile helper prompt */}
        <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3 sm:hidden">
          ← Swipe to explore more deals →
        </div>
      </div>
    </div>
  );
}
