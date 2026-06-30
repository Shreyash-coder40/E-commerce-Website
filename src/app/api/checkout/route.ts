import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";
import Razorpay from "razorpay";

// Initialize Razorpay SDK
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export async function POST(req: Request) {
  try {
    // 1. Secure Authentication Verification
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Please sign in to proceed with checkout." }, { status: 401 });
    }

    // Get database user
    const dbUser = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found in system database." }, { status: 404 });
    }

    // 2. Parse and Validate Cart Payload
    const body = await req.json();
    const cartItems = body.cartItems || body.items;

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Your shopping cart is empty." }, { status: 400 });
    }

    let serverTotalAmount = 0;
    const itemsValidationList = [];

    for (const item of cartItems) {
      const dbProduct = await db.product.findUnique({
        where: { id: item.id },
      });

      if (!dbProduct) {
        return NextResponse.json({ error: `Product '${item.name || "Item"}' not found.` }, { status: 404 });
      }

      // Check stock availability
      if (dbProduct.stock < item.quantity) {
        return NextResponse.json({ 
          error: `Insufficient stock for '${dbProduct.name}'. Only ${dbProduct.stock} units remaining.` 
        }, { status: 400 });
      }

      serverTotalAmount += dbProduct.price * item.quantity;
      itemsValidationList.push({
        productId: dbProduct.id,
        quantity: item.quantity,
        price: dbProduct.price,
      });
    }

    // 3. Create Pending Order in Database
    const savedOrder = await db.order.create({
      data: {
        userId: dbUser.id,
        totalAmount: serverTotalAmount,
        isPaid: false, // Marked as unpaid until payment verified
        status: "PENDING",
        items: {
          create: itemsValidationList.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    });

    // 4. Create Razorpay Payment Order
    const amountInPaisa = Math.round(serverTotalAmount * 100);
    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaisa,
      currency: "INR",
      receipt: savedOrder.id,
    });

    return NextResponse.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      razorpayOrderId: rzpOrder.id,
      orderId: savedOrder.id,
    });
  } catch (error: any) {
    console.error("CHECKOUT_API_ERROR:", error);
    return NextResponse.json({ error: error.message || "Checkout execution fault" }, { status: 500 });
  }
}