import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, price, mrp, category, stock, images, warranty, specifications } = body;

    // Simple validation
    if (!name || !description || !price || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // FIXED: Added mrp to the database creation payload block
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
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}