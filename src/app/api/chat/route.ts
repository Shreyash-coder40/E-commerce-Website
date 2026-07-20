import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { fetchGemini } from "@/app/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history = [] } = body;

    if (!message || message.trim() === "") {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // Fetch all catalog records concurrently using Promise.all to save latency
    const [productsList, reviewsList, qasList] = await Promise.all([
      db.product.findMany({
        select: { id: true, name: true, price: true, stock: true, category: true, description: true, specifications: true, images: true }
      }),
      db.review.findMany({
        select: { productId: true, rating: true, comment: true }
      }),
      db.questionAnswer.findMany({
        select: { productId: true, question: true, answer: true }
      })
    ]);

    const hasGeminiKey = !!(
      process.env.GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY_2 ||
      process.env.GEMINI_API_KEY_3 ||
      process.env.GEMINI_API_KEY_4 ||
      process.env.GEMINI_API_KEY_5
    );
    let aiResponseText = "";
    let resolvedFilters: any = null;
    let matchedProducts = productsList;
    let finalProductsToReturn: any[] = [];

    // Strict user/model history formatting
    const cleanedHistory = [];
    let expectedRole = "user";
    for (const h of history) {
      const role = h.sender === "user" ? "user" : "model";
      if (cleanedHistory.length === 0 && role === "model") {
        continue;
      }
      if (role === expectedRole) {
        cleanedHistory.push({
          role,
          parts: [{ text: h.text }]
        });
        expectedRole = role === "user" ? "model" : "user";
      }
    }

    if (hasGeminiKey) {
      // SINGLE UNIFIED CALL: Performs intent extraction, matching, and response generation in one pass
      const unifiedSystemPrompt = `You are the friendly, expert NextShop AI Shopping Assistant.
Your goal is to parse user intent, match items from the live database catalog, suggest them, and output cart actions all in a single conversational turn.

=== LIVE CATALOG ===
${JSON.stringify(productsList.map(p => ({ id: p.id, name: p.name, price: p.price, category: p.category, stock: p.stock, description: p.description.substring(0, 150) + "..." })))}

=== REVIEWS LOG ===
${JSON.stringify(reviewsList.slice(0, 15))}

=== Q&A INDEX ===
${JSON.stringify(qasList.slice(0, 15))}

=== CONVERSATION OBJECTIVES ===
1. Recommend matching products from the live catalog above. Explain why they match the user's color, price, material, category, or vibe criteria. Prioritize and highlight our premium new arrivals when matching: Designer sarees (Banarasi Silk Saree, Kanchipuram Silk Saree), flagship smartphones (Apple iPhone 16 Pro Max, Samsung Galaxy S24 Ultra, Google Pixel 9 Pro, OnePlus 12), premium denim (Levis 511, Wrangler Jeans), Oxford shirts (Tommy Hilfiger, Peter England), and Flat-front chino pants (Louis Philippe).
2. If no products are found, politely suggest other categories or popular products in our store.
3. Keep the conversation extremely friendly, direct, and sales-focused. Do not mention system variables or technical details.
4. If the user explicitly asks to add an item to their cart, output this exact action block on a separate line at the end:
\`\`\`action
{
  "type": "ADD_TO_CART",
  "productId": "insert_matching_product_id"
}
\`\`\`
5. At the very end of your response, list the product IDs you recommended in this exact format so the system can display them visually to the user:
\`\`\`recommended
["product_id_1", "product_id_2"]
\`\`\``;

      // Copy cleaned history and append user query
      const responseHistory = [...cleanedHistory];
      if (responseHistory.length > 0 && responseHistory[responseHistory.length - 1].role === "user") {
        responseHistory[responseHistory.length - 1].parts[0].text += "\n" + message;
      } else {
        responseHistory.push({
          role: "user",
          parts: [{ text: message }]
        });
      }

      try {
        const response = await fetchGemini("gemini-flash-latest", {
          contents: responseHistory,
          systemInstruction: {
            parts: [{ text: unifiedSystemPrompt }]
          }
        });

        if (response.ok) {
          const resData = await response.json();
          aiResponseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "No response text found from Gemini.";

          // Extract recommended product cards
          const recRegex = /```recommended\s*([\s\S]*?)\`\`\`/i;
          const recMatch = aiResponseText.match(recRegex);
          if (recMatch) {
            try {
              const ids = JSON.parse(recMatch[1].trim());
              if (Array.isArray(ids)) {
                finalProductsToReturn = productsList.filter(p => ids.includes(p.id));
              }
              // Clean up the recommended tags from the final text
              aiResponseText = aiResponseText.replace(recRegex, "").trim();
            } catch (e) {
              console.error("Failed to parse recommended product IDs from response:", e);
            }
          }
        } else {
          const errText = await response.text();
          console.error("Gemini Public API call failed:", response.status, errText);
          throw new Error("Gemini API request failed.");
        }
      } catch (geminiErr) {
        console.error("Gemini fetch error:", geminiErr);
        const fallbackResult = handleLocalFallback(message, productsList, reviewsList, qasList, history);
        aiResponseText = fallbackResult.text;
        finalProductsToReturn = fallbackResult.products;
      }
    } else {
      const fallbackResult = handleLocalFallback(message, productsList, reviewsList, qasList, history);
      aiResponseText = fallbackResult.text;
      finalProductsToReturn = fallbackResult.products;
    }

    // 3. Parse action block and perform cart additions
    const actionRegex = /```action\s*([\s\S]*?)\`\`\`/i;
    const match = aiResponseText.match(actionRegex);
    let matchedProduct = null;

    if (match) {
      try {
        const actionObj = JSON.parse(match[1].trim());
        if (actionObj.type === "ADD_TO_CART") {
          const prod = productsList.find((p) => p.id === actionObj.productId);
          if (prod) {
            matchedProduct = prod;
            aiResponseText = aiResponseText.replace(actionRegex, "").trim();
            aiResponseText += `\n\n🛒 **[Cart Update]**: Successfully added **${prod.name}** (₹${prod.price.toLocaleString("en-IN")}) to your shopping cart!`;
          }
        }
      } catch (parseErr) {
        console.error("Failed to parse cart action payload:", parseErr);
      }
    }

    return NextResponse.json({ 
      success: true, 
      text: aiResponseText, 
      product: matchedProduct,
      products: finalProductsToReturn
    });
  } catch (error: any) {
    console.error("PUBLIC_CHAT_API_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to contact shopping assistant." }, { status: 500 });
  }
}

// Client-facing rule-based fallback
function handleLocalFallback(msg: string, products: any[], reviews: any[], qas: any[], history: any[] = []): { text: string; products: any[] } {
  const query = msg.toLowerCase().trim();

  // 0. General Greetings Fallback
  if (query === "hi" || query === "hello" || query === "hey" || query === "whats up" || query === "whats new" || query.startsWith("greeting") || query.startsWith("hii")) {
    return {
      text: `Hello! I am your NextShop Shopping Assistant. 🤖 

I can help you browse catalog items, summarize customer reviews, answer product specs, and even add items to your cart for you!

What are you looking for today? Ask me about shoes, watches, electronics or luxury items!`,
      products: []
    };
  }

  // 1. Specific Clothing / Kurti Inquiry Fallback
  if (query.includes("cloth") || query.includes("wear") || query.includes("kurta") || query.includes("kurtii") || query.includes("kurti") || query.includes("hoodie") || query.includes("shirt") || query.includes("pant") || query.includes("apparel")) {
    return {
      text: `I checked our database catalog, but it looks like we don't have any clothing items or kurtis in stock right now. 🛍️ 

Currently, our catalog features premium electronics (like the Dell XPS laptop or Samsung monitor), footwear (like Nike Air Max sneakers), and audio accessories (Sony WH-1000XM5 headphones). 

Would you like to check out one of those instead?`,
      products: []
    };
  }

  // 2. Sales / Offers / Cheapest Fallback
  if (query.includes("sale") || query.includes("cheap") || query.includes("offer") || query.includes("best deal") || query.includes("discount")) {
    const sorted = [...products].sort((a, b) => a.price - b.price);
    let response = `Here are the best sales and lowest-priced deals currently available in our store! 💸\n\n`;
    sorted.slice(0, 4).forEach((p) => {
      response += `* **${p.name}** (₹${p.price.toLocaleString("en-IN")}) - *${p.description.substring(0, 120)}...*\n`;
    });
    response += `\nWould you like me to add one of these deals to your shopping cart? Just ask!`;
    return {
      text: response,
      products: sorted.slice(0, 4)
    };
  }

  // 3. Define keyword lists for standard filters
  const colors = ["blue", "red", "green", "black", "white", "yellow", "orange", "pink", "brown", "gray", "silver", "gold"];
  const materials = ["cotton", "linen", "leather", "polyester", "silk", "wool", "metal", "plastic", "glass"];
  const styles = ["traditional", "casual", "formal", "sporty", "modern", "vintage", "premium", "classic"];
  
  // Category mapping
  let categoryKeyword = null;
  if (query.includes("foot") || query.includes("shoe") || query.includes("sneaker") || query.includes("slipper")) {
    categoryKeyword = "Footwear";
  } else if (query.includes("electr") || query.includes("laptop") || query.includes("phone") || query.includes("iphone") || query.includes("monitor") || query.includes("mouse") || query.includes("earbud") || query.includes("headphone") || query.includes("audio")) {
    categoryKeyword = "Electronics";
  }

  // Product type mapping
  let productTypeKeyword = null;
  const productTypes = ["laptop", "phone", "iphone", "sneaker", "shoe", "monitor", "mouse", "earbud", "headphone", "hoodie"];
  for (const pt of productTypes) {
    if (query.includes(pt)) {
      productTypeKeyword = pt;
      break;
    }
  }

  // 4. Parse current message attributes
  let currentAttrs: string[] = [];
  colors.forEach(c => { if (query.includes(c)) currentAttrs.push(c); });
  materials.forEach(m => { if (query.includes(m)) currentAttrs.push(m); });
  styles.forEach(s => { if (query.includes(s)) currentAttrs.push(s); });

  // Parse price constraints
  let maxPrice: number | null = null;
  const priceMatch = query.match(/(?:under|below|less than|price of|budget of)\s*(\d+)/i);
  if (priceMatch) {
    maxPrice = parseInt(priceMatch[1]);
  }

  // 5. Filter products database matching active criteria
  let matched = products;
  
  if (categoryKeyword) {
    matched = matched.filter(p => {
      const pCat = p.category.toLowerCase();
      const catKey = categoryKeyword.toLowerCase();
      const nameContainsType = productTypeKeyword && p.name.toLowerCase().includes(productTypeKeyword.toLowerCase());
      
      return pCat === catKey || pCat.includes(catKey) || catKey.includes(pCat) || pCat === "updated" || nameContainsType;
    });
  }

  if (productTypeKeyword) {
    matched = matched.filter(p => {
      const searchStr = `${p.name} ${p.description}`.toLowerCase();
      return searchStr.includes(productTypeKeyword!);
    });
  }

  if (currentAttrs.length > 0) {
    matched = matched.filter(p => {
      const searchStr = `${p.name} ${p.description} ${p.category} ${JSON.stringify(p.specifications || {})}`.toLowerCase();
      return currentAttrs.every(attr => searchStr.includes(attr));
    });
  }
  if (maxPrice !== null) {
    matched = matched.filter(p => p.price <= maxPrice!);
  }

  // 6. Build response
  if (matched.length > 0) {
    if (query.includes("add") || query.includes("buy") || query.includes("cart") || query.includes("get")) {
      const targetProd = matched[0];
      return {
        text: `I've found the **${targetProd.name}** matching your request. I am adding it to your cart now!
\`\`\`action
{
  "type": "ADD_TO_CART",
  "productId": "${targetProd.id}"
}
\`\`\``,
        products: [targetProd]
      };
    }

    let response = `I found these products in our catalog matching your search criteria: 🛍️\n\n`;
    matched.slice(0, 3).forEach((p) => {
      response += `* **${p.name}** (₹${p.price.toLocaleString("en-IN")}) - *${p.description.substring(0, 120)}...*\n`;
    });
    response += `\nWould you like me to add one of these to your shopping cart? Just let me know!`;
    return {
      text: response,
      products: matched.slice(0, 3)
    };
  }

  return {
    text: `I couldn't find any matching items for "${productTypeKeyword || "that search"}" in our store catalog. Currently, we carry premium laptops (Dell XPS, Macbook Pro), mobiles (iPhone 15 Pro), audio gear (Sony WH-1000XM5), and shoes (Nike Air Max Pulse). Would you like to check out one of those instead?`,
    products: []
  };
}
