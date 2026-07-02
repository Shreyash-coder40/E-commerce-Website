import React from "react";
import { db } from "@/app/lib/db";
import Link from "next/link";
import ProductFilters from "@/app/components/ProductFilters";
import Image from "next/image";
import HomeAddToCartButton from "@/app/components/HomeAddToCartButton";
import CopyCouponButton from "@/app/components/CopyCouponButton";

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
    <div className="bg-background text-foreground min-h-screen py-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Category Pills & Search Component */}
        <ProductFilters categories={categoriesList} currentPage={1} totalPages={1} />

        {/* Asymmetrical High-End Designer Hero Section with Fade In Animation */}
        {featuredProduct && !category && !search && (
          <div className="mb-12 relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50/40 via-white to-indigo-50/20 dark:from-slate-950 dark:via-slate-900/90 dark:to-indigo-950/20 border border-card-border shadow-2xl flex flex-col md:flex-row items-center justify-between min-h-[380px] shadow-indigo-500/5 dark:shadow-indigo-950/20 animate-fade-in transition-all duration-300">
            {/* Asymmetrical Matte Black Block Slicing Into Ice-White Canvas */}
            <div className="p-8 md:p-12 md:max-w-[50%] flex flex-col justify-center z-10">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3">★ Featured Drop</span>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-card-text-primary mb-4">
                {featuredProduct.name}
              </h1>
              <p className="text-sm text-card-text-secondary mb-6 line-clamp-3">
                {featuredProduct.description}
              </p>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-black text-card-text-primary">₹{featuredProduct.price.toLocaleString("en-IN")}</span>
                <Link
                  href={`/products/${featuredProduct.id}`}
                  className="text-xs font-black text-white dark:text-black bg-slate-950 dark:bg-white hover:bg-slate-900 dark:hover:bg-slate-100 px-7 py-4 rounded-full shadow-xl transition-all duration-300 ease-out hover:-translate-y-0.5 tracking-widest uppercase flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  Claim Offer →
                </Link>
              </div>
            </div>
            {/* Sliced Block Graphic & Product Image */}
            <div className="relative w-full md:w-[50%] h-[300px] md:h-[400px] bg-slate-50 dark:bg-slate-950/60 flex items-center justify-center p-6 md:p-12 overflow-hidden border-t md:border-t-0 md:border-l border-card-border transition-colors duration-300">
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-tr from-indigo-600/10 to-transparent pointer-events-none" />
              <div className="relative w-full h-full transform hover:scale-105 transition-transform duration-300 animate-float">
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
          <div className="text-center py-20 bg-card-bg border border-card-border rounded-3xl p-8 shadow-sm animate-fade-in">
            <h2 className="text-lg font-black text-card-text-primary mb-2">🛍️ No Products Found</h2>
            <p className="text-sm text-card-text-secondary mb-6 max-w-md mx-auto">
              Your inventory catalog is currently empty.
            </p>
            <Link
              href="/admin/add-product"
              className="inline-flex items-center text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-5 py-3 rounded-xl transition shadow-md shadow-indigo-500/10"
            >
              ➕ Add Your First Product
            </Link>
          </div>
        ) : (
          /* Responsive Layout: 2 columns on mobile, 3 on tablet, 4 on desktop, with proportional sizing */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-fade-in">
            {products.map((product) => (
              <div key={product.id} className="bg-card-bg border border-card-border rounded-3xl overflow-hidden shadow-sm hover:shadow-[0_20px_45px_-15px_var(--card-hover-shadow)] hover:scale-[1.02] hover:border-indigo-500/40 transition-all duration-300 p-3.5 sm:p-5 flex flex-col justify-between group text-card-text-primary">
                <Link href={`/products/${product.id}`} className="block group cursor-pointer">
                  <div className="relative aspect-square w-full bg-slate-50 dark:bg-slate-950/40 border border-card-border rounded-2xl overflow-hidden mb-3 sm:mb-4 group-hover:scale-[1.01] transition-transform duration-200 p-2 sm:p-4">
                    {/* Floating Urgency/Status Badges */}
                    {product.stock <= 5 && product.stock > 0 && (
                      <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-rose-600/90 backdrop-blur-sm text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 sm:py-1 rounded-md z-10 shadow-sm animate-pulse">
                        ⚡ Low Stock
                      </span>
                    )}
                    {product.stock === 0 && (
                      <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-slate-800/90 backdrop-blur-sm text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 sm:py-1 rounded-md z-10 shadow-sm">
                        Sold Out
                      </span>
                    )}
                    {product.stock > 12 && product.price > 30000 && (
                      <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-slate-850/90 backdrop-blur-sm text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 sm:py-1 rounded-md z-10 shadow-sm">
                        🔥 Trending
                      </span>
                    )}
                    {product.stock > 5 && product.stock <= 12 && (
                      <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-indigo-600/90 backdrop-blur-sm text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 sm:py-1 rounded-md z-10 shadow-sm">
                        ✨ Popular
                      </span>
                    )}
                    <Image
                      src={product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"}
                      alt={product.name}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-card-text-primary group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition line-clamp-1 mb-0.5 sm:mb-1">{product.name}</h3>
                  <p className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-extrabold mb-1.5 sm:mb-3">{product.category}</p>
                </Link>
                <div>
                  <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap mb-1 sm:mb-2">
                    <span className="text-sm sm:text-base font-black text-card-text-primary">₹{product.price.toLocaleString("en-IN")}</span>
                    {product.mrp && product.mrp > product.price && (
                      <>
                        <span className="text-[10px] sm:text-xs text-card-text-secondary line-through font-medium">₹{product.mrp.toLocaleString("en-IN")}</span>
                        <span className="text-[9px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400">({Math.round(((product.mrp - product.price) / product.mrp) * 100)}% off)</span>
                      </>
                    )}
                  </div>
                  <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${product.stock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                      {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
                    </span>
                    <Link
                      href={`/products/${product.id}`}
                      className="text-[10px] sm:text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition"
                    >
                      Details →
                    </Link>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <HomeAddToCartButton product={product} />
                    </div>
                    <Link
                      href={`/checkout?productId=${product.id}&quantity=1`}
                      className="flex-1 text-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-2.5 px-2 rounded-xl text-xs transition shadow-md tracking-wide active:scale-[0.98] cursor-pointer shadow-emerald-600/15 hover:shadow-emerald-500/25 flex items-center justify-center gap-0.5"
                    >
                      ⚡ Buy Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
 
        {/* Sleek Promotional & Brands Showcase Section */}
        {!category && !search && (
          <div className="mt-16 space-y-16">
            
            {/* Interactive Brands Spotlight with Custom Vector SVG Logos */}
            <div className="bg-card-bg border border-card-border rounded-3xl p-8 shadow-sm">
              <div className="text-center max-w-lg mx-auto mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Curated Collections</span>
                <h3 className="text-xl font-black text-card-text-primary mt-2">Partnered Technology Houses</h3>
                <p className="text-xs text-card-text-secondary mt-1">We partner directly with brand manufacturers to source authentic products.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 items-center justify-items-center">
                
                {/* Apple */}
                <div className="group flex flex-col items-center justify-center p-4 w-full h-24 rounded-3xl bg-pill-unselected-bg border border-pill-unselected-border hover:border-indigo-500/40 hover:bg-card-bg transition-all duration-300 cursor-default gap-2">
                  <svg className="h-6 w-6 text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-white transition duration-300 fill-current" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.83-.98 2.94 1.07.08 2.15-.52 2.81-1.33z"/>
                  </svg>
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500 group-hover:text-slate-850 dark:group-hover:text-slate-100 transition duration-350">Apple</span>
                </div>

                {/* Samsung */}
                <div className="group flex flex-col items-center justify-center p-4 w-full h-24 rounded-3xl bg-pill-unselected-bg border border-pill-unselected-border hover:border-indigo-500/40 hover:bg-card-bg transition-all duration-300 cursor-default gap-2.5">
                  <svg className="h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-white transition duration-300 fill-current" viewBox="0 0 100 20">
                    <path d="M10 2h-6v4h6c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-8v3h8c2.8 0 5-2.2 5-5v-2c0-2.8-2.2-5-5-5zm18 0l-5 13h-3l-5-13h3.5l3 8.5 3-8.5h3.5zm18 0h-8c-2.8 0-5 2.2-5 5v2c0 2.8 2.2 5 5 5h8v-3h-8c-1.1 0-2-.9-2-2v-2c0-1.1.9-2 2-2h8v-3zm18 0h-3v13h8v-3h-5v-10zm18 6.5c0-3.6-2.9-6.5-6.5-6.5s-6.5 2.9-6.5 6.5 2.9 6.5 6.5 6.5 6.5-2.9 6.5-6.5zm-3 0c0 1.9-1.6 3.5-3.5 3.5s-3.5-1.6-3.5-3.5 1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5z"/>
                  </svg>
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500 group-hover:text-slate-850 dark:group-hover:text-slate-100 transition duration-350">Samsung</span>
                </div>

                {/* Nike */}
                <div className="group flex flex-col items-center justify-center p-4 w-full h-24 rounded-3xl bg-pill-unselected-bg border border-pill-unselected-border hover:border-indigo-500/40 hover:bg-card-bg transition-all duration-300 cursor-default gap-2.5">
                  <svg className="h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-white transition duration-300 fill-current" viewBox="0 0 24 24">
                    <path d="M2.5 14.3c3.8-1.5 7.6-1.7 11.2-.5 4.2 1.3 7.6 4.3 9.8 7.9.3.4.1.9-.3.9-.7 0-1.5-.2-2.2-.5-5.3-2.1-10.7-2.3-15.9-.6-2.1.7-4.1 1.9-5.9 3.4-.3.2-.7 0-.7-.4-.1-3.6 1.3-7.5 4-10.2z"/>
                  </svg>
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500 group-hover:text-slate-850 dark:group-hover:text-slate-100 transition duration-350">Nike</span>
                </div>

                {/* Puma */}
                <div className="group flex flex-col items-center justify-center p-4 w-full h-24 rounded-3xl bg-pill-unselected-bg border border-pill-unselected-border hover:border-indigo-500/40 hover:bg-card-bg transition-all duration-300 cursor-default gap-2.5">
                  <svg className="h-6 w-6 text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-white transition duration-300 fill-current" viewBox="0 0 24 24">
                    <path d="M21 7.2c-1-.5-2.2-.4-3 .3L14.7 10c-.5.4-.8.9-.9 1.4L13 14.7c-.1.3-.3.6-.5.7L10 17c-.7.5-1.7.3-2.2-.3s-.3-1.7.3-2.2l2.3-1.8c.2-.2.3-.4.3-.6l.7-2.7c.1-.5.4-.9.9-1.2l3.3-2.2c.8-.5 1.9-.6 2.8-.2l3 .9c.6.2.9.8.7 1.4s-.8.9-1.4.7z"/>
                  </svg>
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500 group-hover:text-slate-850 dark:group-hover:text-slate-100 transition duration-350">Puma</span>
                </div>

                {/* Sony */}
                <div className="group flex flex-col items-center justify-center p-4 w-full h-24 rounded-3xl bg-pill-unselected-bg border border-pill-unselected-border hover:border-indigo-500/40 hover:bg-card-bg transition-all duration-300 cursor-default gap-2.5">
                  <svg className="h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-white transition duration-300 fill-current" viewBox="0 0 100 20">
                    <path d="M12 4h-8v3h7v3h-7v4h8v3h-12v-16h12v3zm18 0c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm0 9c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm18-9h-7v13h-3v-13h-7v-3h17v3zm18 10.3l-5.2-10.3h3.4l3.5 7.1 3.5-7.1h3.4l-5.2 10.3v5.7h-3.4v-5.7z"/>
                  </svg>
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500 group-hover:text-slate-850 dark:group-hover:text-slate-100 transition duration-350">Sony</span>
                </div>

                {/* Adidas */}
                <div className="group flex flex-col items-center justify-center p-4 w-full h-24 rounded-3xl bg-pill-unselected-bg border border-pill-unselected-border hover:border-indigo-500/40 hover:bg-card-bg transition-all duration-300 cursor-default gap-2.5">
                  <svg className="h-6 w-6 text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-white transition duration-300 fill-current" viewBox="0 0 24 24">
                    <path d="M4 18h3v-4.5H4zm5 0h3V11H9zm5 0h3v-9.5h-3z"/>
                  </svg>
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500 group-hover:text-slate-850 dark:group-hover:text-slate-100 transition duration-350">Adidas</span>
                </div>

              </div>
            </div>
 
            {/* Premium Coupon Promo Box (Maintained Dark for visual emphasis / call-to-action pop) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121829] to-[#0A0D17] border border-slate-800/80 text-white shadow-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600/10 via-transparent to-transparent pointer-events-none" />
              <div className="z-10 text-center md:text-left">
                <span className="bg-indigo-600/25 text-indigo-400 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-900/40">Limited Offer</span>
                <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-4 text-white">Get Flat 15% Off Your First Purchase</h3>
                <p className="text-sm text-slate-400 mt-2 max-w-md">Join our newsletter to unlock dynamic pricing suggestions and coupon vouchers.</p>
              </div>
              <div className="z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl px-5 py-3 flex items-center justify-between sm:w-64">
                  <span className="text-xs font-bold text-slate-400 uppercase">Coupon Code:</span>
                  <span className="text-sm font-black text-indigo-400 tracking-wider font-mono">NEXT15</span>
                </div>
                <CopyCouponButton code="NEXT15" />
              </div>
            </div>
 
          </div>
        )}
 
        {/* Trust Signals Section */}
        <div className="mt-20 border-t border-card-border pt-12 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex items-center gap-4 p-4 bg-card-bg border border-card-border rounded-2xl shadow-sm hover:border-indigo-500/20 transition-all duration-300">
              <span className="text-2xl">🛡️</span>
              <div>
                <h4 className="text-sm font-bold text-card-text-primary">SSL Secure Checkout</h4>
                <p className="text-xs text-card-text-secondary">256-bit encrypted connection</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-card-bg border border-card-border rounded-2xl shadow-sm hover:border-indigo-500/20 transition-all duration-300">
              <span className="text-2xl">📦</span>
              <div>
                <h4 className="text-sm font-bold text-card-text-primary">Guaranteed Safe Delivery</h4>
                <p className="text-xs text-card-text-secondary">Insured trackable shipping</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-card-bg border border-card-border rounded-2xl shadow-sm hover:border-indigo-500/20 transition-all duration-300">
              <span className="text-2xl">🤝</span>
              <div>
                <h4 className="text-sm font-bold text-card-text-primary">30-Day Return Window</h4>
                <p className="text-xs text-slate-500">No questions asked refunds</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-card-bg border border-card-border rounded-2xl shadow-sm hover:border-indigo-500/20 transition-all duration-300">
              <span className="text-2xl">💬</span>
              <div>
                <h4 className="text-sm font-bold text-card-text-primary">24/7 Shopper Support</h4>
                <p className="text-xs text-card-text-secondary">Expert live assistance</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}