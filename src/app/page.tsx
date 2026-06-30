import React from "react";
import { db } from "@/app/lib/db";
import Link from "next/link";
import ProductFilters from "@/app/components/ProductFilters";
import Image from "next/image";
import HomeAddToCartButton from "@/app/components/HomeAddToCartButton";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<any> }) {
  const resolvedSearchParams = await searchParams;
  const category = resolvedSearchParams?.category || "";
  const search = resolvedSearchParams?.search || "";

  // 1. Fetch live categories for the filter component layout
  const rawCategories = await db.product.findMany({
    select: { category: true },
    distinct: ["category"],
  });
  const categoriesList = rawCategories.map((c) => c.category);

  // 2. Query products using regular filter parameters
  const products = await db.product.findMany({
    where: {
      category: category ? category : undefined,
      name: search ? { contains: search, mode: "insensitive" } : undefined,
    },
    orderBy: { createdAt: "desc" },
  });

  const featuredProduct = products[0] || null;

  return (
    <div className="bg-[#F8FAFC] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProductFilters categories={categoriesList} currentPage={1} totalPages={1} />

        {/* Asymmetrical High-End Designer Hero Section */}
        {featuredProduct && !category && !search && (
          <div className="mb-12 relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between min-h-[380px]">
            {/* Asymmetrical Matte Black Block Slicing Into Ice-White Canvas */}
            <div className="p-8 md:p-12 md:max-w-[50%] flex flex-col justify-center z-10">
              <span className="text-xs font-black uppercase tracking-widest text-blue-500 mb-3">★ Featured Drop</span>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-white mb-4">
                {featuredProduct.name}
              </h1>
              <p className="text-sm text-slate-400 mb-6 line-clamp-3">
                {featuredProduct.description}
              </p>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-black text-white">₹{featuredProduct.price.toLocaleString("en-IN")}</span>
                <Link
                  href={`/products/${featuredProduct.id}`}
                  className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl transition shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 uppercase tracking-wider cursor-pointer"
                >
                  Claim Offer →
                </Link>
              </div>
            </div>
            {/* Sliced Block Graphic & Product Image */}
            <div className="relative w-full md:w-[50%] h-[300px] md:h-[400px] bg-slate-900 flex items-center justify-center p-6 md:p-12 overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-tr from-blue-600/20 to-transparent pointer-events-none" />
              <div className="relative w-full h-full transform hover:scale-105 transition-transform duration-300">
                <Image
                  src={featuredProduct.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"}
                  alt={featuredProduct.name}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        )}

        {products.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
            <h2 className="text-lg font-black text-gray-950 mb-2">🛍️ No Products Found</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Your inventory catalog is currently empty.
            </p>
            <Link
              href="/admin/add-product"
              className="inline-flex items-center text-xs font-bold text-white bg-blue-600 px-5 py-3 rounded-xl hover:bg-blue-500 transition shadow-md"
            >
              ➕ Add Your First Product
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm hover:shadow-[0_10px_15px_-3px_rgba(37,99,235,0.1)] hover:scale-[1.02] transition-all duration-300 p-4 flex flex-col justify-between group">
                <Link href={`/products/${product.id}`} className="block group cursor-pointer">
                  <div className="relative aspect-square w-full bg-gray-50 rounded-xl overflow-hidden mb-4 group-hover:scale-[1.02] transition-transform duration-200">
                    <Image
                      src={product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"}
                      alt={product.name}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                  <h3 className="text-sm font-extrabold text-gray-950 group-hover:text-blue-600 transition line-clamp-1 mb-1">{product.name}</h3>
                  <p className="text-xs text-blue-600 font-bold mb-3">{product.category}</p>
                </Link>
                <div>
                  <div className="flex items-baseline gap-2 flex-wrap mb-1">
                    <span className="text-base font-black text-gray-950">₹{product.price.toLocaleString("en-IN")}</span>
                    {product.mrp && product.mrp > product.price && (
                      <>
                        <span className="text-xs text-gray-400 line-through font-medium">₹{product.mrp.toLocaleString("en-IN")}</span>
                        <span className="text-xs font-bold text-green-600">({Math.round(((product.mrp - product.price) / product.mrp) * 100)}% off)</span>
                      </>
                    )}
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${product.stock > 0 ? "text-green-600" : "text-red-500"}`}>
                      {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
                    </span>
                    <Link
                      href={`/products/${product.id}`}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-500 transition"
                    >
                      View Details →
                    </Link>
                  </div>
                  <HomeAddToCartButton product={product} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trust Signals Section */}
        <div className="mt-20 border-t border-slate-200 pt-12 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <span className="text-2xl">🛡️</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">SSL Secure Checkout</h4>
                <p className="text-xs text-slate-500">256-bit encrypted connection</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <span className="text-2xl">📦</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Guaranteed Safe Delivery</h4>
                <p className="text-xs text-slate-500">Insured trackable shipping</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <span className="text-2xl">🤝</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">30-Day Return Window</h4>
                <p className="text-xs text-slate-500">No questions asked refunds</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <span className="text-2xl">💬</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">24/7 Shopper Support</h4>
                <p className="text-xs text-slate-500">Expert live assistance</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}