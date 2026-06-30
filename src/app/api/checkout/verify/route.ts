import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !orderId) {
      return NextResponse.json({ error: "Missing required verification parameters." }, { status: 400 });
    }

    // 1. Verify Razorpay Signature
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(text)
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return NextResponse.json({ error: "Payment verification failed. Invalid signature." }, { status: 400 });
    }

    // 2. Perform DB transaction: Update Order and Decrement Product Stock
    await db.$transaction(async (tx: any) => {
      // Mark the order as paid and processing
      await tx.order.update({
        where: { id: orderId },
        data: {
          isPaid: true,
          status: "PROCESSING",
        },
      });

      // Retrieve items in this order
      const orderItems = await tx.orderItem.findMany({
        where: { orderId: orderId },
      });

      // Update stock levels
      for (const item of orderItems) {
        // Find product to see current stock level
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          const newStock = Math.max(0, product.stock - item.quantity);
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: newStock,
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: "Payment verified successfully!" });
  } catch (error: any) {
    console.error("VERIFICATION_API_ERROR:", error);
    return NextResponse.json({ error: error.message || "Verification processing fault" }, { status: 500 });
  }
}
