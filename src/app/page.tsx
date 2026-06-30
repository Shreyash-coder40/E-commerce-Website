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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ProductFilters categories={categoriesList} currentPage={1} totalPages={1} />

      {products.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
          <h2 className="text-lg font-black text-gray-950 mb-2">🛍️ No Products Found</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Your inventory catalog is currently empty.
          </p>
          <Link
            href="/admin/add-product"
            className="inline-flex items-center text-xs font-bold text-white bg-indigo-600 px-5 py-3 rounded-xl hover:bg-indigo-500 transition shadow-md"
          >
            ➕ Add Your First Product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm group hover:shadow-md transition p-4 flex flex-col justify-between">
              <Link href={`/products/${product.id}`} className="block group cursor-pointer">
                <div className="relative aspect-square w-full bg-gray-50 rounded-xl overflow-hidden mb-4 group-hover:scale-[1.02] transition-transform duration-200">
                  <Image
                    src={product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"}
                    alt={product.name}
                    fill
                    className="object-contain p-2"
                  />
                </div>
                <h3 className="text-sm font-extrabold text-gray-950 group-hover:text-indigo-600 transition line-clamp-1 mb-1">{product.name}</h3>
                <p className="text-xs text-indigo-600 font-bold mb-3">{product.category}</p>
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
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 transition"
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
    </div>
  );
}