import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_mockKeyId12345",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "mockSecret12345",
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Original Order ID is required." }, { status: 400 });
    }

    // 1. Fetch previous order details
    const oldOrder = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!oldOrder) {
      return NextResponse.json({ error: "Original order records not found." }, { status: 404 });
    }

    // Verify ownership
    if (oldOrder.userId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized order duplication request." }, { status: 403 });
    }

    // 2. Validate availability and stock of each product
    let serverTotalAmount = 0;
    const itemsValidationList: any[] = [];

    for (const oldItem of oldOrder.items) {
      const dbProduct = await db.product.findUnique({
        where: { id: oldItem.productId },
      });

      if (!dbProduct) {
        return NextResponse.json({ 
          error: `Product '${oldItem.product?.name || "Item"}' is no longer available in the catalog.` 
        }, { status: 400 });
      }

      if (dbProduct.stock < oldItem.quantity) {
        return NextResponse.json({
          error: `Insufficient stock to reorder '${dbProduct.name}'. Required: ${oldItem.quantity}, Available: ${dbProduct.stock}`
        }, { status: 400 });
      }

      serverTotalAmount += dbProduct.price * oldItem.quantity;
      itemsValidationList.push({
        productId: dbProduct.id,
        quantity: oldItem.quantity,
        price: dbProduct.price,
      });
    }

    // 3. Compute dynamic live taxes and shipping costs based on previous details
    const taxAmount = Number((serverTotalAmount * 0.18).toFixed(2));
    const shippingCost = serverTotalAmount >= 1000 ? 0 : 50;
    const finalTotalAmount = serverTotalAmount + taxAmount + shippingCost;

    // 4. Create new Pending Order records
    const savedOrder = await db.order.create({
      data: {
        userId: dbUser.id,
        totalAmount: finalTotalAmount,
        isPaid: false,
        status: "PENDING",
        shippingAddress: oldOrder.shippingAddress,
        pincode: oldOrder.pincode,
        shippingCost,
        taxAmount,
        // Schedule dynamic estimated arrival date (e.g. 3 days from now)
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        items: {
          create: itemsValidationList.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    });

    // 5. Create Razorpay Payment Invoice Order
    const amountInPaisa = Math.round(finalTotalAmount * 100);
    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaisa,
      currency: "INR",
      receipt: savedOrder.id,
    });

    return NextResponse.json({
      success: true,
      orderId: savedOrder.id,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_mockKeyId12345",
    });
  } catch (error: any) {
    console.error("REORDER_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to process 1-click reorder." }, { status: 500 });
  }
}
