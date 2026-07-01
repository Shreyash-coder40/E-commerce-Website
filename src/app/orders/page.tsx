import React from "react";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const revalidate = 0;

export default async function OrderHistoryPage() {
  // 1. Secure verification check
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect("/login");
  }

  // 2. Fetch all historical orders belonging to this active account profile
  const dbUser = await db.user.findUnique({
    where: { email: session.user.email },
  });

  const orders = dbUser
    ? await db.order.findMany({
        where: { userId: dbUser.id },
        include: {
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight">Your Order History</h1>
            <p className="text-sm text-gray-600 mt-1">Track payments, shipping metrics, and receipt manifests.</p>
          </div>
          <Link href="/" className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition w-fit inline-flex items-center gap-1.5">
            🏠 Back to Home
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <p className="text-gray-500 text-sm">You haven't placed any transactional orders yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Order Top Summary Ribbon */}
                <div className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6 grid grid-cols-2 gap-4 sm:flex sm:items-center sm:justify-between text-xs">
                  <div>
                    <p className="font-semibold text-gray-500 uppercase tracking-wider">Order Reference ID</p>
                    <p className="font-bold text-gray-950 mt-1 truncate max-w-[180px] sm:max-w-none">{order.id}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500 uppercase tracking-wider">Date Purchased</p>
                    <p className="font-bold text-gray-950 mt-1" suppressHydrationWarning>{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500 uppercase tracking-wider">Total Charge</p>
                    {/* Updated from order.total to match your schema's totalAmount */}
                    <p className="font-extrabold text-indigo-600 mt-1 text-sm">₹{order.totalAmount.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <span className={`inline-flex px-3 py-1 rounded-full font-bold tracking-wide uppercase text-[10px] ${
                      order.status === "PENDING" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-green-50 text-green-700 border border-green-200"
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Visual Status Progress Tracker */}
                <div className="p-4 sm:p-6 bg-gray-50/30 border-b border-gray-150">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-2">
                    <span>Order Placed</span>
                    <span>Processing</span>
                    <span>Shipped</span>
                    <span>Delivered</span>
                  </div>
                  <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full bg-indigo-600 transition-all duration-500 ${
                        order.status === "PENDING"
                          ? "w-[12%]"
                          : order.status === "PROCESSING"
                          ? "w-[38%]"
                          : order.status === "SHIPPED"
                          ? "w-[68%]"
                          : "w-full"
                      }`}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mt-3">
                    <span className="text-indigo-600">✓ Created</span>
                    <span className={order.status !== "PENDING" ? "text-indigo-600" : ""}>
                      {order.status !== "PENDING" ? "✓ Confirmed" : "○ Pending"}
                    </span>
                    <span className={["SHIPPED", "DELIVERED"].includes(order.status) ? "text-indigo-600" : ""}>
                      {["SHIPPED", "DELIVERED"].includes(order.status) ? "✓ Dispatched" : "○ Dispatched"}
                    </span>
                    <span className={order.status === "DELIVERED" ? "text-indigo-600" : ""}>
                      {order.status === "DELIVERED" ? "✓ Handed Over" : "○ Arriving soon"}
                    </span>
                  </div>
                  {/* Estimated Delivery Calculation */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center flex-wrap gap-2 text-xs font-bold">
                    <span className="text-gray-500">Estimated Delivery:</span>
                    <span className="text-gray-900" suppressHydrationWarning>
                      {order.estimatedDelivery ? (
                        new Date(order.estimatedDelivery).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })
                      ) : (
                        (() => {
                          const est = new Date(order.createdAt);
                          est.setDate(est.getDate() + 4);
                          return est.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
                        })()
                      )}
                    </span>
                  </div>
                </div>

                {/* Snapsoted delivery address for this order */}
                {order.shippingAddress && (
                  <div className="bg-gray-50/50 border-b border-gray-150 p-4 sm:p-6 text-xs border-t border-gray-200">
                    <p className="font-semibold text-gray-500 uppercase tracking-wider mb-1">Fulfillment Address</p>
                    <p className="font-bold text-gray-900">{order.shippingAddress}</p>
                  </div>
                )}

                {/* Sub-item purchase entries listing */}
                <div className="divide-y divide-gray-100 p-4 sm:p-6">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 gap-4">
                      <div className="flex items-center gap-4">
                        <img 
                          src={item.product?.images?.[0] || "https://placehold.co/600x400?text=Product+Image"} 
                          alt={item.product?.name || "Product Item"} 
                          className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-gray-950 line-clamp-1">{item.product?.name || "Deleted Product Item"}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">Quantity: {item.quantity} units</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-800">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>

                {/* Price breakdown summary logs */}
                <div className="bg-gray-50/30 p-4 sm:p-6 text-xs text-slate-500 font-semibold space-y-1.5 border-t border-gray-150">
                  <div className="flex justify-between">
                    <span>Items Subtotal:</span>
                    <span className="text-gray-900">₹{Number(order.totalAmount - (order.shippingCost || 0) - (order.taxAmount || 0)).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST Tax (18%):</span>
                    <span className="text-gray-900">₹{Number(order.taxAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Charges:</span>
                    <span className="text-gray-900">{(order.shippingCost || 0) === 0 ? "FREE" : `₹${order.shippingCost}`}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-indigo-600 border-t border-gray-200 pt-2.5 mt-2.5">
                    <span>Total Charge Settled:</span>
                    <span>₹{order.totalAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}