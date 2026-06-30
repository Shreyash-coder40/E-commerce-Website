import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";

// DELETE handler to remove a product
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.role === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const resolvedParams = await params;

    await db.product.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({ message: "Product deleted successfully." }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE_PRODUCT_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to delete product." }, { status: 550 });
  }
}

// PUT handler to update a product
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.role === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const resolvedParams = await params;
    const body = await req.json();
    const { name, description, price, category, stock } = body;

    const updatedProduct = await db.product.update({
      where: { id: resolvedParams.id },
      data: {
        name,
        description,
        price: parseFloat(price),
        category,
        stock: parseInt(stock),
      },
    });

    return NextResponse.json({ message: "Product updated successfully.", updatedProduct }, { status: 200 });
  } catch (error: any) {
    console.error("UPDATE_PRODUCT_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to update product." }, { status: 500 });
  }
}