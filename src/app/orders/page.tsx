import React from "react";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReorderButton from "@/app/components/ReorderButton";
import OrderActions from "@/app/components/OrderActions";

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return { text: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" };
      case "PROCESSING":
        return { text: "Processing", className: "bg-blue-50 text-blue-700 border-blue-200" };
      case "SHIPPED":
        return { text: "Shipped", className: "bg-purple-50 text-purple-700 border-purple-200" };
      case "DELIVERED":
        return { text: "Delivered", className: "bg-emerald-50 text-emerald-700 border-emerald-250" };
      case "CANCELLED":
        return { text: "Cancelled", className: "bg-rose-50 text-rose-700 border-rose-250" };
      case "CANCELLATION_PENDING":
        return { text: "Cancellation Pending", className: "bg-orange-50 text-orange-700 border-orange-200" };
      case "RETURN_REQUESTED":
        return { text: "Return Requested", className: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "RETURN_APPROVED":
        return { text: "Return Approved", className: "bg-emerald-50 text-emerald-700 border-emerald-250" };
      case "RETURN_REJECTED":
        return { text: "Return Rejected", className: "bg-slate-100 text-slate-655 border-slate-200" };
      default:
        return { text: status, className: "bg-slate-100 text-slate-655 border-slate-200" };
    }
  };

  const renderProgressTracker = (order: any) => {
    const status = order.status;
    if (status === "CANCELLED") {
      return (
        <div className="p-4 sm:p-6 bg-rose-50/50 border-b border-rose-100 text-xs">
          <div className="flex justify-between items-center text-xs font-bold text-rose-700 mb-2">
            <span>Order Placed</span>
            <span>Cancelled</span>
          </div>
          <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-rose-650 w-full" />
          </div>
          <p className="text-xs text-rose-700 font-semibold mt-3">
            🚫 This order has been cancelled. {order.cancellationReason && `Reason: ${order.cancellationReason}`}
          </p>
          {order.adminNotes && (
            <p className="text-[11px] text-slate-500 mt-1">
              <strong>Seller Note:</strong> {order.adminNotes}
            </p>
          )}
        </div>
      );
    }

    if (status === "CANCELLATION_PENDING") {
      return (
        <div className="p-4 sm:p-6 bg-orange-50/50 border-b border-orange-100 text-xs">
          <div className="flex justify-between items-center text-xs font-bold text-orange-700 mb-2">
            <span>Order Placed</span>
            <span>Cancellation Review</span>
          </div>
          <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-orange-500 w-1/2" />
          </div>
          <p className="text-xs text-orange-700 font-semibold mt-3 animate-pulse">
            ⏳ Cancellation requested and under review. Reason: {order.cancellationReason}
          </p>
        </div>
      );
    }

    if (["RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_REJECTED"].includes(status)) {
      let returnLabel = "";
      let returnColor = "";
      let returnBarColor = "";
      let returnPercent = "";

      if (status === "RETURN_REQUESTED") {
        returnLabel = "Return Requested - Under Review";
        returnColor = "text-indigo-705";
        returnBarColor = "bg-indigo-650";
        returnPercent = "w-1/2";
      } else if (status === "RETURN_APPROVED") {
        returnLabel = "Return Approved - Refund Processed";
        returnColor = "text-emerald-700";
        returnBarColor = "bg-emerald-600";
        returnPercent = "w-full";
      } else {
        returnLabel = "Return Request Rejected";
        returnColor = "text-slate-500";
        returnBarColor = "bg-slate-400";
        returnPercent = "w-full";
      }

      return (
        <div className="p-4 sm:p-6 bg-indigo-50/50 border-b border-indigo-200 text-xs">
          <div className="flex justify-between items-center text-xs font-bold text-slate-550 mb-2">
            <span>Delivered</span>
            <span>Return Progress</span>
          </div>
          <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className={`absolute top-0 left-0 h-full ${returnBarColor} ${returnPercent}`} />
          </div>
          <p className={`text-xs ${returnColor} font-bold mt-3`}>
            🔄 {returnLabel}
          </p>
          {order.returnReason && (
            <p className="text-xs text-slate-600 mt-1.5 font-semibold">
              <strong>Return Info:</strong> {order.returnReason.split(" | Image:")[0]}
            </p>
          )}
          {order.adminNotes && (
            <p className="text-[11px] text-slate-500 mt-1">
              <strong>Seller Note:</strong> {order.adminNotes}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200">
        <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-2">
          <span>Order Placed</span>
          <span>Processing</span>
          <span>Shipped</span>
          <span>Delivered</span>
        </div>
        <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full bg-[#0077B6] transition-all duration-500 ${
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
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mt-3">
          <span className="text-[#0077B6]">✓ Created</span>
          <span className={order.status !== "PENDING" ? "text-[#0077B6]" : ""}>
            {order.status !== "PENDING" ? "✓ Confirmed" : "○ Pending"}
          </span>
          <span className={["SHIPPED", "DELIVERED"].includes(order.status) ? "text-[#0077B6]" : ""}>
            {["SHIPPED", "DELIVERED"].includes(order.status) ? "✓ Dispatched" : "○ Dispatched"}
          </span>
          <span className={order.status === "DELIVERED" ? "text-[#0077B6]" : ""}>
            {order.status === "DELIVERED" ? "✓ Handed Over" : "○ Arriving soon"}
          </span>
        </div>
        {/* Estimated Delivery Calculation */}
        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center flex-wrap gap-2 text-xs font-bold">
          <span className="text-slate-500">Estimated Delivery:</span>
          <span className="text-slate-900" suppressHydrationWarning>
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
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Huge Semi-Transparent Logo Watermark in Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
        <div className="text-[12vw] font-black tracking-tighter text-slate-100 rotate-12 flex items-center gap-4 whitespace-nowrap">
          <span>🛒</span> NEXT<span>SHOP</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Your Order History</h1>
            <p className="text-sm text-slate-500 mt-1">Track payments, shipping metrics, and returns.</p>
          </div>
          <Link href="/" className="text-xs font-bold text-slate-655 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-50 hover:text-slate-900 transition w-fit inline-flex items-center gap-1.5">
            🏠 Back to Home
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
            <p className="text-slate-500 text-sm">You haven't placed any transactional orders yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const statusBadge = getStatusBadge(order.status);
              return (
                <div key={order.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  {/* Order Top Summary Ribbon */}
                  <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-6 grid grid-cols-2 gap-4 sm:flex sm:items-center sm:justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-550 uppercase tracking-wider">Order Reference ID</p>
                      <p className="font-bold text-slate-900 mt-1 truncate max-w-[180px] sm:max-w-none">{order.id}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-555 uppercase tracking-wider">Date Purchased</p>
                      <p className="font-bold text-slate-900 mt-1" suppressHydrationWarning>{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-555 uppercase tracking-wider">Total Charge</p>
                      <p className="font-extrabold text-[#0077B6] mt-1 text-sm">₹{order.totalAmount.toLocaleString("en-IN")}</p>
                    </div>
                    <div>
                      <span className={`inline-flex px-3 py-1 rounded-full font-bold tracking-wide uppercase text-[10px] border ${statusBadge.className}`}>
                        {statusBadge.text}
                      </span>
                    </div>
                    <div>
                      <ReorderButton orderId={order.id} />
                    </div>
                  </div>

                  {/* Render Visual Status Progress */}
                  {renderProgressTracker(order)}

                  {/* Snapshotted delivery address for this order */}
                  {order.shippingAddress && (
                    <div className="bg-slate-50/50 border-b border-slate-200 p-4 sm:p-6 text-xs">
                      <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1">Fulfillment Address</p>
                      <p className="font-bold text-slate-900">{order.shippingAddress}</p>
                    </div>
                  )}

                  {/* Sub-item purchase entries listing */}
                  <div className="divide-y divide-slate-100 p-4 sm:p-6">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 gap-4">
                        <div className="flex items-center gap-4">
                          <img 
                            src={item.product?.images?.[0] || "https://placehold.co/600x400?text=Product+Image"} 
                            alt={item.product?.name || "Product Item"} 
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                          />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{item.product?.name || "Deleted Product Item"}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Quantity: {item.quantity} units</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-slate-800">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                      </div>
                    ))}
                  </div>

                  {/* Price breakdown summary logs */}
                  <div className="bg-slate-50/50 p-4 sm:p-6 text-xs text-slate-600 font-semibold space-y-1.5 border-t border-slate-200">
                    <div className="flex justify-between">
                      <span>Items Subtotal:</span>
                      <span className="text-slate-800">₹{Number(order.totalAmount - (order.shippingCost || 0) - (order.taxAmount || 0)).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST Tax (18%):</span>
                      <span className="text-slate-800">₹{Number(order.taxAmount || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping Charges:</span>
                      <span className="text-slate-800">{(order.shippingCost || 0) === 0 ? "FREE" : `₹${order.shippingCost}`}</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-[#0077B6] border-t border-slate-200 pt-2.5 mt-2.5">
                      <span>Total Charge Settled:</span>
                      <span>₹{order.totalAmount.toLocaleString("en-IN")}</span>
                    </div>

                    {/* Order actions (Cancel/Return) embedded */}
                    <OrderActions order={order} />
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}