import React from "react";
import { db } from "@/app/lib/db";
import Link from "next/link";
import ProductFilters from "@/app/components/ProductFilters";
import Image from "next/image";
import HomeAddToCartButton from "@/app/components/HomeAddToCartButton";
import CopyCouponButton from "@/app/components/CopyCouponButton";
import { fetchGemini, embedText } from "@/app/lib/gemini";
import { cosineSimilarity } from "@/app/lib/vector";

export const dynamic = "force-dynamic";

// In-memory cache for semantic search queries to bypass API latency (L1 Cache)
const semanticSearchCache = new Map<string, {
  productsList: any[];
  timestamp: number;
}>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes TTL

export default async function HomePage({ searchParams }: { searchParams: Promise<any> }) {
  const resolvedSearchParams = await searchParams;
  const category = resolvedSearchParams?.category || "";
  const search = resolvedSearchParams?.search || "";
  const semantic = resolvedSearchParams?.semantic === "true";

  // 1. Fetch live categories for the filter component layout
  const rawCategories = await db.product.findMany({
    select: { category: true },
    distinct: ["category"],
  });
  const categoriesList = rawCategories.map((c) => c.category);

  // 2. Query products using regular filter parameters
  let productsList = await db.product.findMany({
    where: {
      category: category ? category : undefined,
      // If semantic search is active, we fetch all products in the category and rank them via AI.
      // Otherwise, we do standard SQL contains matching.
      name: (search && !semantic) ? { contains: search, mode: "insensitive" } : undefined,
    },
    orderBy: { createdAt: "desc" },
  });

  if (search && semantic && productsList.length > 0) {
    const cacheKey = `${category}::${search.trim().toLowerCase()}`;
    const cachedEntry = semanticSearchCache.get(cacheKey);

    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL)) {
      console.log(`[Semantic Cache]: HIT for key "${cacheKey}"`);
      productsList = cachedEntry.productsList;
    } else {
      try {
        console.log(`--> [Vector Search]: Generating embedding for query "${search}"...`);
        const queryVector = await embedText(search.trim());

        const ratedProducts = productsList.map((p) => {
          const productVector = p.embedding as number[] | null;
          let similarity = 0;
          if (Array.isArray(productVector)) {
            similarity = cosineSimilarity(queryVector, productVector);
          } else {
            // Fallback: if embedding is missing, run basic keyword check to assign a score
            const matchesKeyword = p.name.toLowerCase().includes(search.toLowerCase()) || 
                                   p.description.toLowerCase().includes(search.toLowerCase());
            similarity = matchesKeyword ? 0.40 : 0.0;
          }

          return {
            ...p,
            searchScore: Math.round(similarity * 100),
            searchExplanation: `Matches search concept (similarity: ${Math.round(similarity * 100)}%) based on catalog details.`
          };
        });

        // Filter products with score >= 35, and sort them descending by score
        productsList = ratedProducts
          .filter((p) => p.searchScore >= 35)
          .sort((a, b) => b.searchScore - a.searchScore) as any;

        // Save to memory cache
        semanticSearchCache.set(cacheKey, {
          productsList,
          timestamp: Date.now()
        });
      } catch (geminiErr) {
        console.error("--> [Vector Search]: Vector matching failed, falling back to standard search:", geminiErr);
        // Fallback: standard keyword matching
        productsList = productsList.filter(p => 
          p.name.toLowerCase().includes(search.toLowerCase()) || 
          p.description.toLowerCase().includes(search.toLowerCase())
        );
      }
    }
  } else if (search && semantic) {
    // If search is active but products are empty, fall back to standard keyword matching
    productsList = productsList.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  const products = productsList;
  const featuredProduct = products[0] || null;

  return (
    <div className="bg-background text-foreground min-h-screen py-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Category Pills & Search Component */}
        <ProductFilters categories={categoriesList} currentPage={1} totalPages={1} />

        {/* Asymmetrical High-End Designer Hero Section with Fade In Animation */}
        {featuredProduct && !category && !search && (
          <div className="mb-12 relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50/40 via-white to-indigo-50/20 dark:from-slate-950 dark:via-slate-900/90 dark:to-indigo-950/20 border border-card-border shadow-2xl flex flex-col md:flex-row items-center justify-between min-h-[380px] shadow-indigo-500/5 dark:shadow-indigo-950/20 animate-fade-in transition-all duration-300 max-w-4xl mx-auto">
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
                    {/* AI Semantic Match Badge */}
                    {(product as any).searchScore !== undefined && (
                      <span 
                        className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 sm:py-1 rounded-md z-10 shadow-md transition hover:scale-105 select-none"
                        title={(product as any).searchExplanation}
                      >
                        🧠 AI Match: {(product as any).searchScore}%
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
                  <p className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-extrabold mb-1.5 sm:mb-2">{product.category}</p>
                  
                  {/* AI Match Explanation */}
                  {(product as any).searchExplanation && (
                    <div 
                      className="text-[9px] sm:text-[10px] text-indigo-600 dark:text-indigo-400 font-medium leading-relaxed bg-indigo-500/5 dark:bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/10 dark:border-indigo-500/20 mb-3 flex items-start gap-1 cursor-default hover:border-indigo-500/30 transition duration-200"
                      title={(product as any).searchExplanation}
                    >
                      <span className="shrink-0">💡</span>
                      <span className="line-clamp-2">{(product as any).searchExplanation}</span>
                    </div>
                  )}
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
            <div className="bg-card-bg border border-card-border rounded-3xl p-6 shadow-sm max-w-4xl mx-auto">
              <div className="text-center max-w-lg mx-auto mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Curated Collections</span>
                <h3 className="text-xl font-black text-card-text-primary mt-2">Partnered Houses</h3>
                <p className="text-xs text-card-text-secondary mt-1">We partner directly with brand manufacturers to source authentic products.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-center justify-items-center">
                
                {/* Samsung */}
                <div className="group flex flex-col items-center justify-center p-3 w-full h-24 rounded-2xl bg-pill-unselected-bg border border-pill-unselected-border hover:border-indigo-500/40 hover:bg-card-bg transition-all duration-300 cursor-default gap-2">
                  <div className="h-10 w-16 relative flex items-center justify-center overflow-hidden bg-transparent">
                    <img
                      src="https://images.samsung.com/is/image/samsung/assets/global/about-us/brand/logo/256_144_4.png?$512_N_PNG$"
                      alt="Samsung"
                      className="max-h-full max-w-full object-contain mix-blend-multiply dark:mix-blend-screen"
                    />
                  </div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500 group-hover:text-slate-850 dark:group-hover:text-slate-100 transition duration-350">Samsung</span>
                </div>

                {/* Nike */}
                <div className="group flex flex-col items-center justify-center p-3 w-full h-24 rounded-2xl bg-pill-unselected-bg border border-pill-unselected-border hover:border-indigo-500/40 hover:bg-card-bg transition-all duration-300 cursor-default gap-2">
                  <div className="h-10 w-16 relative flex items-center justify-center overflow-hidden bg-transparent">
                    <img
                      src="https://nmp.about.nike.com/originals/about/prod/cf68f541-fc92-4373-91cb-086ae0fe2f88/002-nike-logos-swoosh-white.jpg?s=0d91b6d512f3b96eb15376bfb84bd503140904583667147c21ca3d6c4594e7d2"
                      alt="Nike"
                      className="max-h-full max-w-full object-contain mix-blend-multiply invert dark:invert-0 dark:mix-blend-screen"
                    />
                  </div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500 group-hover:text-slate-850 dark:group-hover:text-slate-100 transition duration-350">Nike</span>
                </div>

                {/* Apple */}
                <div className="group flex flex-col items-center justify-center p-3 w-full h-24 rounded-2xl bg-pill-unselected-bg border border-pill-unselected-border hover:border-indigo-500/40 hover:bg-card-bg transition-all duration-300 cursor-default gap-2">
                  <div className="h-10 w-16 relative flex items-center justify-center overflow-hidden bg-transparent">
                    <img
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrrlnydtYrQvW8qJkFeha6TSYKGScNLtuBQd7j-WsavbrlZJxrKwCGHLU&s=10"
                      alt="Apple"
                      className="max-h-full max-w-full object-contain mix-blend-multiply dark:invert dark:mix-blend-screen"
                    />
                  </div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500 group-hover:text-slate-850 dark:group-hover:text-slate-100 transition duration-350">Apple</span>
                </div>

                {/* YSL */}
                <div className="group flex flex-col items-center justify-center p-3 w-full h-24 rounded-2xl bg-pill-unselected-bg border border-pill-unselected-border hover:border-indigo-500/40 hover:bg-card-bg transition-all duration-300 cursor-default gap-2">
                  <div className="h-10 w-16 relative flex items-center justify-center overflow-hidden bg-transparent">
                    <img
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQsXvPC0ap_HPqmlzizArYFArvdl4AmXq7eCJIGT0QE0yWsuWwEDA1OAeE&s=10"
                      alt="YSL"
                      className="max-h-full max-w-full object-contain mix-blend-multiply dark:invert dark:mix-blend-screen"
                    />
                  </div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500 group-hover:text-slate-850 dark:group-hover:text-slate-100 transition duration-350">YSL</span>
                </div>

                {/* Rolex */}
                <div className="group flex flex-col items-center justify-center p-3 w-full h-24 rounded-2xl bg-pill-unselected-bg border border-pill-unselected-border hover:border-indigo-500/40 hover:bg-card-bg transition-all duration-300 cursor-default gap-2">
                  <div className="h-10 w-16 relative flex items-center justify-center overflow-hidden bg-transparent">
                    <img
                      src="https://i.pinimg.com/236x/cf/ba/0b/cfba0bef4af32f8747efd16beb3d04ca.jpg"
                      alt="Rolex"
                      className="max-h-full max-w-full object-contain mix-blend-multiply dark:invert dark:mix-blend-screen"
                    />
                  </div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500 group-hover:text-slate-850 dark:group-hover:text-slate-100 transition duration-350">Rolex</span>
                </div>

              </div>
            </div>
 
            {/* Premium Coupon Promo Box (Maintained Dark for visual emphasis / call-to-action pop) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121829] to-[#0A0D17] border border-slate-800/80 text-white shadow-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
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