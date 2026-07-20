"use client";

import React from "react";
import { useCartStore } from "../store/useCartStore";

export default function HomeAddToCartButton({ product, variant = "default" }: { product: any, variant?: "default" | "circular" }) {
  const addToCart = useCartStore((state) => state.addToCart);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault(); // Stop redirection link click triggers
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || "https://placehold.co/600x400?text=Product+Image",
      stock: product.stock || 10,
    });
  };

  if (variant === "circular") {
    return (
      <button
        onClick={handleAdd}
        title="Add to Cart"
        className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-750 text-white flex items-center justify-center shadow-md active:scale-95 transition cursor-pointer"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition shadow-md tracking-wide active:scale-[0.98] cursor-pointer shadow-indigo-600/15"
    >
      Add to Cart
    </button>
  );
}