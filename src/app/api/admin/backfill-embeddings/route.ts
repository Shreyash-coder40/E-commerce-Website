import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";
import { embedText } from "@/app/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. Verify admin session permissions
    const session = await auth();
    const isAdmin = (session?.user as any)?.role === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    console.log("--> [Backfill API]: Starting backfill of product vector embeddings...");
    
    const products = await db.product.findMany();
    console.log(`--> [Backfill API]: Found ${products.length} products to check.`);
    
    let successCount = 0;
    let skippedCount = 0;
    const details = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      // Check if it already has an embedding
      if (product.embedding) {
        skippedCount++;
        details.push({ name: product.name, status: "skipped" });
        continue;
      }
      
      console.log(`--> [Backfill API]: Generating embedding for "${product.name}"...`);
      const textToEmbed = `${product.name} ${product.category} ${product.description}`;
      
      try {
        const vector = await embedText(textToEmbed);
        
        await db.product.update({
          where: { id: product.id },
          data: {
            embedding: vector
          }
        });
        
        successCount++;
        details.push({ name: product.name, status: "success" });
        
        // Brief sleep to avoid hitting rate limits on free keys
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (err: any) {
        console.error(`--> [Backfill API]: Failed for "${product.name}":`, err.message);
        details.push({ name: product.name, status: "failed", error: err.message });
      }
    }
    
    return NextResponse.json({
      message: "Backfill completed.",
      summary: {
        totalChecked: products.length,
        newEmbeddings: successCount,
        skipped: skippedCount,
        failed: products.length - successCount - skippedCount
      },
      details
    });
  } catch (error: any) {
    console.error("--> [Backfill API]: Fatal error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
