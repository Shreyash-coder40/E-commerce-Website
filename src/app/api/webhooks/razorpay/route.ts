import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    // Use Webhook Secret if configured, otherwise fallback to standard Key Secret
    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "";

    if (!signature) {
      return NextResponse.json({ error: "Missing x-razorpay-signature header." }, { status: 400 });
    }

    // 1. Verify Signature authenticity
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    const isAuthentic = expectedSignature === signature;

    if (!isAuthentic) {
      console.warn("Razorpay Webhook verification failed. Invalid signature signature.");
      return NextResponse.json({ error: "Payment verification failed. Invalid signature." }, { status: 400 });
    }

    const payload = JSON.parse(body);
    const event = payload.event;
    console.log(`[Webhook] Received Razorpay Event: ${event}`);

    let orderId = "";

    // 2. Identify database order ID from event payload
    if (event === "order.paid") {
      orderId = payload.payload.order.entity.receipt;
    } else if (event === "payment.captured") {
      const paymentEntity = payload.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;

      if (razorpayOrderId) {
        // Fetch order receipt directly from Razorpay API
        const Razorpay = (await import("razorpay")).default;
        const rzp = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID || "",
          key_secret: process.env.RAZORPAY_KEY_SECRET || "",
        });
        const rzpOrder = await rzp.orders.fetch(razorpayOrderId);
        orderId = rzpOrder.receipt || "";
      }
    }

    // 3. Process database update and stock deduction if not already paid
    if (orderId) {
      const dbOrder = await db.order.findUnique({
        where: { id: orderId },
      });

      if (dbOrder && !dbOrder.isPaid) {
        console.log(`[Webhook] Processing fulfillment for order: ${orderId}`);
        await db.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: {
              isPaid: true,
              status: "PROCESSING",
            },
          });

          const orderItems = await tx.orderItem.findMany({
            where: { orderId: orderId },
          });

          for (const item of orderItems) {
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
        console.log(`[Webhook] Order ${orderId} successfully completed.`);
      } else {
        console.log(`[Webhook] Order ${orderId} is already paid. Skipping updates.`);
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed successfully" });
  } catch (error: any) {
    console.error("WEBHOOK_API_ERROR:", error);
    return NextResponse.json({ error: error.message || "Webhook processing fault" }, { status: 500 });
  }
}
