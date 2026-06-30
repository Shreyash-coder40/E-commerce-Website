"use client";

import React from "react";
import { useCartStore } from "../store/useCartStore";

export default function HomeAddToCartButton({ product }: { product: any }) {
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

  return (
    <button
      onClick={handleAdd}
      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition shadow-md tracking-wide active:scale-[0.98] cursor-pointer shadow-blue-600/10 hover:shadow-blue-500/20"
    >
      Add to Cart
    </button>
  );
}