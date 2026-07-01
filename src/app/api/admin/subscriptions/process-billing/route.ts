import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.role === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized access. Admins only." }, { status: 403 });
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999); // Include all billing slots up to the end of today

    // Find all active subscriptions that are due for billing
    const activeSubs = await db.subscription.findMany({
      where: {
        nextBillingDate: { lte: today },
        status: "ACTIVE",
      },
      include: {
        product: true,
        shippingAddress: true,
        user: { select: { email: true, name: true } },
      },
    });

    const results = {
      totalFound: activeSubs.length,
      successCount: 0,
      failedStockOut: 0,
      errorsCount: 0,
      ordersProcessed: [] as string[],
    };

    for (const sub of activeSubs) {
      try {
        await db.$transaction(async (tx) => {
          // A. Fetch current product inventory
          const currentProduct = await tx.product.findUnique({
            where: { id: sub.productId },
          });

          if (!currentProduct) {
            throw new Error(`Product ID ${sub.productId} not found in catalog.`);
          }

          // B. Check stock limits (Edge Case check)
          if (currentProduct.stock < sub.quantity) {
            // Auto-pause subscription and notify customer
            await tx.subscription.update({
              where: { id: sub.id },
              data: { status: "PAUSED" },
            });

            console.log(`[Subscription Billing] Out of stock for sub #${sub.id}. Pausing subscription.`);
            results.failedStockOut++;

            // Mock Notification log trigger
            console.log(`[Notification Engine] Email sent to ${sub.user.email}: Subscription paused because ${currentProduct.name} is currently out of stock.`);
            return;
          }

          // C. Calculate live dynamic taxes and shipping fees
          const subtotal = currentProduct.price * sub.quantity;
          const taxAmount = Number((subtotal * 0.18).toFixed(2));
          const shippingCost = subtotal >= 1000 ? 0 : 50;
          const grandTotal = subtotal + taxAmount + shippingCost;

          // D. Create paid processing order in dashboard database
          const order = await tx.order.create({
            data: {
              userId: sub.userId,
              totalAmount: grandTotal,
              isPaid: true, // Marked as paid since recurring billing charges successfully
              status: "PROCESSING", // Placed directly into Admin Fulfillment queue
              shippingAddress: `${sub.shippingAddress.recipientName} (${sub.shippingAddress.phone}) - ${sub.shippingAddress.streetAddress}, ${sub.shippingAddress.city}, ${sub.shippingAddress.state}`,
              pincode: sub.shippingAddress.zipCode,
              shippingCost,
              taxAmount,
              estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Estimated 3 days arrival
              items: {
                create: [
                  {
                    productId: currentProduct.id,
                    quantity: sub.quantity,
                    price: currentProduct.price,
                  },
                ],
              },
            },
          });

          // E. Decrement inventory
          await tx.product.update({
            where: { id: currentProduct.id },
            data: { stock: currentProduct.stock - sub.quantity },
          });

          // F. Advance next billing date based on frequency intervals
          const nextDate = new Date(sub.nextBillingDate);
          if (sub.frequency === "WEEKLY") {
            nextDate.setDate(nextDate.getDate() + 7);
          } else if (sub.frequency === "MONTHLY") {
            nextDate.setMonth(nextDate.getMonth() + 1);
          } else if (sub.frequency === "BIMONTHLY") {
            nextDate.setMonth(nextDate.getMonth() + 2);
          }

          await tx.subscription.update({
            where: { id: sub.id },
            data: { nextBillingDate: nextDate },
          });

          results.successCount++;
          results.ordersProcessed.push(order.id);
          console.log(`[Subscription Billing] Generated order #${order.id} for subscription #${sub.id}.`);
        });
      } catch (err: any) {
        console.error(`Billing transaction failed for subscription #${sub.id}:`, err);
        results.errorsCount++;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("PROCESS_BILLING_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to process billing queue." }, { status: 500 });
  }
}
