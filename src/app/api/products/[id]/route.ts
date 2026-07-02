import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";

// GET handler to retrieve a product
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const product = await db.product.findUnique({
      where: { id: resolvedParams.id },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error("GET_PRODUCT_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch product details." }, { status: 500 });
  }
}

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

    // Fetch old details to compare price & stock updates
    const oldProduct = await db.product.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!oldProduct) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

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

    // Run notifications check in the background asynchronously to prevent HTTP lag
    process.nextTick(async () => {
      try {
        const oldStock = oldProduct.stock;
        const newStock = updatedProduct.stock;
        const oldPrice = oldProduct.price;
        const newPrice = updatedProduct.price;

        const isBackInStock = oldStock === 0 && newStock > 0;
        const isPriceDropped = newPrice < oldPrice;

        if (isBackInStock) {
          const subs = await db.alertSubscription.findMany({
            where: {
              productId: updatedProduct.id,
              type: "BACK_IN_STOCK",
              isNotified: false,
            },
          });

          if (subs.length > 0) {
            for (const sub of subs) {
              console.log(`[Alert Notification Engine] Dispatching BACK_IN_STOCK email to ${sub.email} for product ${updatedProduct.name}`);
            }

            await db.alertSubscription.updateMany({
              where: { id: { in: subs.map((s) => s.id) } },
              data: { isNotified: true },
            });
          }
        }

        if (isPriceDropped) {
          const subs = await db.alertSubscription.findMany({
            where: {
              productId: updatedProduct.id,
              type: "PRICE_DROP",
              isNotified: false,
              OR: [
                { targetPrice: null },
                { targetPrice: { gte: newPrice } },
              ],
            },
          });

          if (subs.length > 0) {
            for (const sub of subs) {
              console.log(`[Alert Notification Engine] Dispatching PRICE_DROP email to ${sub.email} for product ${updatedProduct.name} (Dropped from ₹${oldPrice} to ₹${newPrice})`);
            }

            await db.alertSubscription.updateMany({
              where: { id: { in: subs.map((s) => s.id) } },
              data: { isNotified: true },
            });
          }
        }
      } catch (err) {
        console.error("Alert subscription background processing error:", err);
      }
    });

    return NextResponse.json({ message: "Product updated successfully.", updatedProduct }, { status: 200 });
  } catch (error: any) {
    console.error("UPDATE_PRODUCT_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to update product." }, { status: 500 });
  }
}