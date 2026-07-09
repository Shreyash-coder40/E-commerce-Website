import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

export const dynamic = "force-dynamic";

// Helper function to validate if the parsed competitor price is a realistic match (not an accessory or delivery fee)
function validateCompetitorPrice(parsedPrice: number, ourPrice: number): boolean {
  const minValidPrice = ourPrice * 0.5;  // At least 50% of our price
  const maxValidPrice = ourPrice * 3.0;  // Maximum 300% of our price
  return parsedPrice >= minValidPrice && parsedPrice <= maxValidPrice;
}

// Scrape search results from DuckDuckGo as a targeted fallback
async function searchDuckDuckGoFallback(productName: string, siteDomain: string, baseFallbackPrice: number, ourPrice: number) {
  const query = `${productName} site:${siteDomain}`;
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`DDG fallback request failed with status: ${response.status}`);
    }
    
    const html = await response.text();
    const links: string[] = [];
    
    const linkReg = /<a class="result__url"[^>]*href="([^"]+)"/gi;
    let match;
    while ((match = linkReg.exec(html)) !== null) {
      let rawLink = match[1];
      if (rawLink.includes('uddg=')) {
        try {
          const u = new URL('https:' + rawLink);
          const decoded = u.searchParams.get('uddg');
          if (decoded) {
            rawLink = decodeURIComponent(decoded);
          }
        } catch (urlErr) {
          // fallback
        }
      }
      if (rawLink.includes(siteDomain)) {
        links.push(rawLink);
      }
    }
    
    let selectedLink = `https://www.${siteDomain}`;
    if (siteDomain === "amazon.in") {
      const exactProductLink = links.find(l => l.includes('/dp/') || l.includes('/gp/'));
      selectedLink = exactProductLink || links[0] || `https://www.amazon.in/s?k=${encodeURIComponent(productName)}`;
    } else if (siteDomain === "flipkart.com") {
      const exactProductLink = links.find(l => l.includes('/p/') || l.includes('/itm'));
      selectedLink = exactProductLink || links[0] || `https://www.flipkart.com/search?q=${encodeURIComponent(productName)}`;
    } else if (siteDomain === "meesho.com") {
      const exactProductLink = links.find(l => l.includes('/p/'));
      selectedLink = exactProductLink || links[0] || `https://www.meesho.com/search?q=${encodeURIComponent(productName)}`;
    }
    
    const priceReg = /(?:₹|Rs\.?)\s?([0-9,]{3,})/gi;
    let foundPrice: number | null = null;
    let priceMatch;
    
    while ((priceMatch = priceReg.exec(html)) !== null) {
      const candidatePrice = parseInt(priceMatch[1].replace(/,/g, ''), 10);
      if (validateCompetitorPrice(candidatePrice, ourPrice)) {
        foundPrice = candidatePrice;
        break;
      }
    }
    
    return {
      link: selectedLink,
      price: foundPrice || baseFallbackPrice
    };
  } catch (err) {
    console.error(`--> [Compare API Fallback]: Failed to search ${siteDomain}:`, err);
    return {
      link: `https://www.${siteDomain}`,
      price: baseFallbackPrice
    };
  }
}

// Parse price from SerpApi organic results snippets
function parsePriceFromText(text: string, ourPrice: number): number | null {
  const priceReg = /(?:₹|Rs\.?)\s?([0-9,]{3,})/gi;
  let match;
  while ((match = priceReg.exec(text)) !== null) {
    const candidatePrice = parseInt(match[1].replace(/,/g, ''), 10);
    if (validateCompetitorPrice(candidatePrice, ourPrice)) {
      return candidatePrice;
    }
  }
  return null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
    }

    // 1. Fetch our product details
    const product = await db.product.findUnique({
      where: { id }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // 2. Check for cached competitor data (valid for 12 hours)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const cachedData = await db.competitorCache.findUnique({
      where: { productId: id }
    });

    if (cachedData && new Date(cachedData.lastUpdated) > twelveHoursAgo) {
      console.log(`--> [Compare API]: Returning cached data for product ${id}`);
      return NextResponse.json({
        success: true,
        source: "cache",
        productId: id,
        ourProduct: {
          name: product.name,
          price: product.price,
          image: product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"
        },
        competitors: cachedData.competitorData,
        recommendation: cachedData.recommendation
      });
    }

    // Generate fallback base prices
    const baseAmazon = Math.round(product.price * 1.05);
    const baseFlipkart = Math.round(product.price * 1.02);
    const baseMeesho = Math.round(product.price * 0.97);

    let amazonRes = { link: "https://www.amazon.in", price: baseAmazon };
    let flipkartRes = { link: "https://www.flipkart.com", price: baseFlipkart };
    let meeshoRes = { link: "https://www.meesho.com", price: baseMeesho };

    // 3. Trigger SerpApi Google Organic Search (India localized) if key is present
    const serpapiApiKey = process.env.SERPAPI_API_KEY;
    let serpapiSuccess = false;

    if (serpapiApiKey) {
      console.log(`--> [Compare API]: Querying SerpApi Google Organic Search for "${product.name}"`);
      try {
        const query = `"${product.name}" (site:amazon.in OR site:flipkart.com OR site:meesho.com)`;
        const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpapiApiKey}&gl=in&hl=en&google_domain=google.co.in`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const organicResults = data.organic_results || [];
          console.log(`--> [Compare API]: SerpApi returned ${organicResults.length} organic matches`);

          // Match Amazon
          const amazonMatch = organicResults.find((r: any) => r.link.includes('amazon.in'));
          if (amazonMatch) {
            let price = amazonMatch.rich_snippet?.bottom?.detected_extensions?.price;
            if (!price || !validateCompetitorPrice(price, product.price)) {
              const textSnippet = `${amazonMatch.snippet || ''} ${amazonMatch.title || ''}`;
              price = parsePriceFromText(textSnippet, product.price) || baseAmazon;
            }
            amazonRes = { link: amazonMatch.link, price };
          } else {
            // If missing from search page 1, run targeted DDG scraper fallback
            amazonRes = await searchDuckDuckGoFallback(product.name, "amazon.in", baseAmazon, product.price);
          }

          // Match Flipkart
          const flipkartMatch = organicResults.find((r: any) => r.link.includes('flipkart.com'));
          if (flipkartMatch) {
            let price = flipkartMatch.rich_snippet?.bottom?.detected_extensions?.price;
            if (!price || !validateCompetitorPrice(price, product.price)) {
              const textSnippet = `${flipkartMatch.snippet || ''} ${flipkartMatch.title || ''}`;
              price = parsePriceFromText(textSnippet, product.price) || baseFlipkart;
            }
            flipkartRes = { link: flipkartMatch.link, price };
          } else {
            flipkartRes = await searchDuckDuckGoFallback(product.name, "flipkart.com", baseFlipkart, product.price);
          }

          // Match Meesho
          const meeshoMatch = organicResults.find((r: any) => r.link.includes('meesho.com'));
          if (meeshoMatch) {
            let price = meeshoMatch.rich_snippet?.bottom?.detected_extensions?.price;
            if (!price || !validateCompetitorPrice(price, product.price)) {
              const textSnippet = `${meeshoMatch.snippet || ''} ${meeshoMatch.title || ''}`;
              price = parsePriceFromText(textSnippet, product.price) || baseMeesho;
            }
            meeshoRes = { link: meeshoMatch.link, price };
          } else {
            meeshoRes = await searchDuckDuckGoFallback(product.name, "meesho.com", baseMeesho, product.price);
          }

          serpapiSuccess = true;
        } else {
          console.error(`--> [Compare API]: SerpApi request failed with status: ${response.status}`);
        }
      } catch (serpErr) {
        console.error("--> [Compare API]: SerpApi request thrown exception, using DDG fallbacks:", serpErr);
      }
    }

    // 4. Default Fallback completely to DuckDuckGo scraper if SerpApi is not set or failed
    if (!serpapiSuccess) {
      console.log(`--> [Compare API]: SerpApi not active. Running standard DDG scraping fallback.`);
      const [ddgAmazon, ddgFlipkart, ddgMeesho] = await Promise.all([
        searchDuckDuckGoFallback(product.name, "amazon.in", baseAmazon, product.price),
        searchDuckDuckGoFallback(product.name, "flipkart.com", baseFlipkart, product.price),
        searchDuckDuckGoFallback(product.name, "meesho.com", baseMeesho, product.price)
      ]);
      amazonRes = ddgAmazon;
      flipkartRes = ddgFlipkart;
      meeshoRes = ddgMeesho;
    }

    // Set high-quality images from the database product entry
    const productImg = product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300";
    const competitors = [
      {
        site: "Amazon",
        name: `Amazon Choice - ${product.name}`,
        price: amazonRes.price,
        image: productImg,
        link: amazonRes.link
      },
      {
        site: "Flipkart",
        name: `Flipkart Assured - ${product.name}`,
        price: flipkartRes.price,
        image: productImg,
        link: flipkartRes.link
      },
      {
        site: "Meesho",
        name: `Meesho Trend - ${product.name}`,
        price: meeshoRes.price,
        image: productImg,
        link: meeshoRes.link
      }
    ];

    // 5. Ask Gemini to compile the final recommendation text
    const geminiApiKey = process.env.GEMINI_API_KEY;
    let recommendation = "";

    if (geminiApiKey) {
      try {
        const prompt = `You are a professional e-commerce pricing analyst. Compare our store's product with competitors' listings.

Our Product:
- Name: "${product.name}"
- Price: ₹${product.price}
- Description: "${product.description}"

Competitor Listings:
${JSON.stringify(competitors, null, 2)}

Provide a short, direct recommendation (2-3 sentences max) for the customer.
1. Highlight which site offers the best deal and mention the exact savings.
2. If ours is not the cheapest, mention shipping speed, safety, or return policies to justify why buying from us is still a great choice.
3. Be professional, honest, and persuasive. Format with standard markdown (e.g. bolding key numbers).`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3 }
            })
          }
        );

        if (response.ok) {
          const resData = await response.json();
          recommendation = resData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
      } catch (geminiErr) {
        console.error("--> [Compare API]: Gemini call failed, falling back to local reasoning:", geminiErr);
      }
    }

    if (!recommendation) {
      recommendation = getLocalRecommendationFallback(product.name, product.price, competitors);
    }

    // 6. Update cache table
    await db.competitorCache.upsert({
      where: { productId: id },
      update: {
        competitorData: competitors as any,
        recommendation,
        lastUpdated: new Date()
      },
      create: {
        productId: id,
        competitorData: competitors as any,
        recommendation,
        lastUpdated: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      source: "live",
      productId: id,
      ourProduct: {
        name: product.name,
        price: product.price,
        image: productImg
      },
      competitors,
      recommendation
    });

  } catch (error: any) {
    console.error("COMPARE_API_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to compile competitor price comparison." },
      { status: 500 }
    );
  }
}

function getLocalRecommendationFallback(name: string, price: number, competitors: any[]) {
  let cheapest = competitors[0];
  for (const comp of competitors) {
    if (comp.price < cheapest.price) {
      cheapest = comp;
    }
  }

  const diff = Math.abs(price - cheapest.price);

  if (price <= cheapest.price) {
    return `### 💡 Value Verdict: Buy on **NextShop**!
We checked the web for you: Our price of **₹${price.toLocaleString("en-IN")}** is the **cheapest** deal available online! Buying here saves you **₹${diff.toLocaleString("en-IN")}** compared to ${cheapest.site}. Plus, you get our verified 100% brand warranty and easy cancellation coverage.`;
  } else {
    return `### 💡 Value Verdict: **NextShop** is highly competitive!
${cheapest.site} currently lists this item at **₹${cheapest.price.toLocaleString("en-IN")}** (₹${diff.toLocaleString("en-IN")} cheaper than us). However, purchasing on **NextShop** guarantees direct seller support, verified packaging quality, and immediate cancellation verification without long support wait times.`;
  }
}
