import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";

export const revalidate = 0; // Prevent API route caching

export async function GET() {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.role === "ADMIN";
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    // Fetch all products along with their order items
    const products = await db.product.findMany({
      include: {
        orderItems: {
          include: {
            order: true
          }
        }
      }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recommendations = products.map((product: any) => {
      // Safely check order items and calculate sales velocity
      const recentSales = (product.orderItems || [])
        .filter((item: any) => item.order && new Date(item.order.createdAt) >= thirtyDaysAgo)
        .reduce((sum: number, item: any) => sum + item.quantity, 0);

      let strategy = "STABLE";
      let recommendedPrice = product.price;
      let reasoning = "Demand is stable. Maintain current price point to maximize customer retention.";

      // Strategy 1: High Velocity + Low Stock -> SURGE
      if (recentSales > 2 && product.stock <= 5 && product.stock > 0) {
        strategy = "SURGE";
        recommendedPrice = product.price * 1.15;
        reasoning = `High velocity (${recentSales} sold recently) coupled with low stock (${product.stock} left). Capitalize on urgency.`;
      } 
      // Strategy 2: Zero Sales + Excessive Stock -> LIQUIDATE
      else if (recentSales === 0 && product.stock > 10) {
        strategy = "LIQUIDATE";
        recommendedPrice = product.price * 0.85;
        reasoning = `Slow-moving stock. Zero sales in 30 days with inventory overhead (${product.stock} units). Markdown recommended to unlock cash flow.`;
      }
      // Strategy 3: Out of Stock -> RESTOCK
      else if (product.stock === 0) {
        strategy = "RESTOCK";
        reasoning = "Item completely sold out. Replenish inventory records before adjusting price matrices.";
      }

      return {
        id: product.id,
        name: product.name,
        currentPrice: product.price,
        stock: product.stock,
        recentSales,
        strategy,
        recommendedPrice: parseFloat(recommendedPrice.toFixed(2)),
        reasoning
      };
    });

    return NextResponse.json(recommendations, { status: 200 });
  } catch (error: any) {
    console.error("PRICING_ENGINE_API_ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}