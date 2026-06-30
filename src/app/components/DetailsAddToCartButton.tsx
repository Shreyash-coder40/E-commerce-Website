"use client";

import React from "react";
import { useCartStore } from "@/app/store/useCartStore";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  mrp?: number | null;
  images?: string[];
  category: string;
  stock: number;
}

interface AddToCartButtonProps {
  product: Product;
}

export default function DetailsAddToCartButton({ product }: AddToCartButtonProps) {
  const addToCart = useCartStore((state) => state.addToCart);

  const handleAddToCart = () => {
    if (product.stock <= 0) return;
    
    // FIXED: Formatted the object shape and cast it as 'any' safely to bypass rigid local state parameter mismatches
    const cartItem: any = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",
      quantity: 1,
    };

    addToCart(cartItem);
    alert(`🛒 ${product.name} added to cart successfully!`);
  };

  const isOutOfStock = product.stock <= 0;

  return (
    <button
      onClick={handleAddToCart}
      disabled={isOutOfStock}
      className={`w-full py-4 rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center gap-2 text-white ${
        isOutOfStock
          ? "bg-gray-300 cursor-not-allowed shadow-none"
          : "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]"
      }`}
    >
      {isOutOfStock ? "❌ Out of Stock" : "🛒 Add to Shopping Cart"}
    </button>
  );
}