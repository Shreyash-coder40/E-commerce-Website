import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { embedText } from "@/app/lib/gemini";

export const dynamic = "force-dynamic";

// GET: Fetch all products (used by admin console stats panel & other pages)
export async function GET() {
  try {
    const products = await db.product.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        price: true,
        mrp: true,
        category: true,
        stock: true,
        images: true,
        description: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error("GET /api/products Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// POST: Create a new product
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, price, mrp, category, stock, images, warranty, specifications } = body;

    // Simple validation
    if (!name || !description || !price || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate vector embedding
    let embeddingVector: number[] | null = null;
    try {
      const textToEmbed = `${name} ${category} ${description}`;
      embeddingVector = await embedText(textToEmbed);
    } catch (embedErr) {
      console.error("--> [Product Creation]: Failed to generate vector embedding:", embedErr);
    }

    const newProduct = await db.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        mrp: mrp ? parseFloat(mrp) : null,
        category,
        stock: parseInt(stock, 10) || 0,
        images: images || [],
        warranty: warranty || null,
        specifications: specifications || null,
        embedding: embeddingVector || undefined
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/products Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}