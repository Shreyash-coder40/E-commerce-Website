"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCartStore } from "../store/useCartStore";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, clearCart } = useCartStore();

  const productId = searchParams.get("productId");
  const quantityParam = searchParams.get("quantity");
  const checkoutQty = quantityParam ? parseInt(quantityParam) : 1;

  // Checkout product / items states
  const [buyNowProduct, setBuyNowProduct] = useState<any>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [checkingOutCart, setCheckingOutCart] = useState(false);

  // Address states
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");

  // Form states
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [saveToAddressBook, setSaveToAddressBook] = useState(true);

  // Loader & error states
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [error, setError] = useState("");

  // Check login session & fetch addresses
  useEffect(() => {
    fetchAddresses();
    if (productId) {
      fetchBuyNowProduct(productId);
    } else {
      setCheckingOutCart(true);
    }
  }, [productId]);

  const fetchAddresses = async () => {
    try {
      const res = await fetch("/api/addresses");
      if (res.status === 401) {
        router.push("/login?callback=/checkout");
        return;
      }
      const data = await res.json();
      if (res.ok && data.success) {
        setAddresses(data.addresses || []);
        const defaultAddr = data.addresses?.find((a: any) => a.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          autofillAddress(defaultAddr);
        }
      }
    } catch (err) {
      console.error("Error loading addresses:", err);
    }
  };

  const fetchBuyNowProduct = async (id: string) => {
    setLoadingProduct(true);
    try {
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setBuyNowProduct(data.product);
      } else {
        setError(data.error || "Failed to load product details.");
      }
    } catch (err: any) {
      setError("Failed to fetch product specs.");
    } finally {
      setLoadingProduct(false);
    }
  };

  const autofillAddress = (addr: any) => {
    setShippingName(addr.recipientName || "");
    setShippingPhone(addr.phone || "");
    setStreetAddress(addr.streetAddress || "");
    setApartment(addr.apartment || "");
    setCity(addr.city || "");
    setState(addr.state || "");
    setPincode(addr.zipCode || "");
  };

  const handleAddressSelect = (id: string) => {
    setSelectedAddressId(id);
    if (id === "new") {
      setShippingName("");
      setShippingPhone("");
      setStreetAddress("");
      setApartment("");
      setCity("");
      setState("");
      setPincode("");
    } else {
      const addr = addresses.find((a: any) => a.id === id);
      if (addr) {
        autofillAddress(addr);
      }
    }
  };

  // Location Auto-Detect Geolocation simulation
  const handleAutoDetectLocation = () => {
    setDetectingLoc(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      setDetectingLoc(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const mockCities = [
          { name: "Mumbai", state: "Maharashtra", pin: "400001" },
          { name: "New Delhi", state: "Delhi", pin: "110001" },
          { name: "Bengaluru", state: "Karnataka", pin: "560001" },
          { name: "Kolkata", state: "West Bengal", pin: "700001" },
        ];
        const randomCity = mockCities[Math.floor(Math.random() * mockCities.length)];

        setShippingName(shippingName || "Auto Customer");
        setShippingPhone(shippingPhone || "9999988888");
        setStreetAddress("Auto Location Detection Street");
        setCity(randomCity.name);
        setState(randomCity.state);
        setPincode(randomCity.pin);
        setDetectingLoc(false);
      },
      (err) => {
        alert("Failed to access your location settings. Defaulting manually.");
        setDetectingLoc(false);
      }
    );
  };

  // Determine active checkout items
  const checkoutItems = productId
    ? buyNowProduct
      ? [{ ...buyNowProduct, quantity: checkoutQty }]
      : []
    : cart;

  const isPincodeValid = /^\d{6}$/.test(pincode.trim());
  const itemsSubtotal = checkoutItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Dynamic calculations
  let shippingCost = 0;
  let taxAmount = 0;
  let estimatedDelivery = "";
  let eddDateObj: Date | null = null;

  if (isPincodeValid && checkoutItems.length > 0) {
    const prefix = pincode.trim().substring(0, 3);
    let days = 4;
    shippingCost = 90; // Default remote rate

    if (prefix.startsWith("400")) {
      days = 1; // Local Mumbai transit speed
      shippingCost = 0; // Local Mumbai free shipping waiver
    } else if (["110", "560", "700", "600", "500"].some((p) => prefix.startsWith(p))) {
      days = 2; // Metro speed
      shippingCost = 40; // Metro discounted shipping fee
    }

    if (itemsSubtotal >= 1000) {
      shippingCost = 0;
    }

    taxAmount = parseFloat((itemsSubtotal * 0.18).toFixed(2));
    const now = new Date();
    now.setDate(now.getDate() + days);
    eddDateObj = now;
    estimatedDelivery = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }

  const finalTotalAmount = itemsSubtotal + shippingCost + taxAmount;

  // Form validation - made more flexible for various phone input formats
  const isFormValid =
    shippingName.trim() !== "" &&
    shippingPhone.replace(/\D/g, "").length >= 10 &&
    streetAddress.trim() !== "" &&
    city.trim() !== "" &&
    state.trim() !== "" &&
    isPincodeValid;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setError("Please fill out all address details with a valid 10-digit phone number and 6-digit pincode.");
      return;
    }

    setLoadingSubmit(true);
    setError("");

    try {
      if (selectedAddressId === "new" && saveToAddressBook) {
        await fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientName: shippingName,
            phone: shippingPhone,
            streetAddress,
            apartment,
            city,
            state,
            zipCode: pincode,
            isDefault: false,
          }),
        });
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: checkoutItems.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
          shippingName,
          shippingPhone,
          shippingAddress: `${streetAddress}${apartment ? `, ${apartment}` : ""}, ${city}, ${state}`,
          pincode,
          shippingCost,
          taxAmount,
          estimatedDelivery: eddDateObj ? eddDateObj.toISOString() : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize order payment profile.");
      }

      if (!(window as any).Razorpay) {
        throw new Error("Razorpay payment gateway failed to load. Please refresh and try again.");
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "NEXTSHOP",
        description: "Secure Order Checkout",
        order_id: data.razorpayOrderId,
        handler: async function (paymentResponse: any) {
          setLoadingSubmit(true);
          try {
            const verifyRes = await fetch("/api/checkout/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                orderId: data.orderId,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            console.log("Verification successful! Order paid.");
            if (!productId) {
              clearCart();
            }
            alert("🎉 Purchase completed successfully! Thank you for shopping with NextShop.");
            router.push("/orders");
            router.refresh();
          } catch (verifyErr: any) {
            console.error("Verification error:", verifyErr);
            setError(verifyErr.message || "Failed to verify transaction signature.");
          } finally {
            setLoadingSubmit(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoadingSubmit(false);
          },
        },
        theme: {
          color: "#4f46e5",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during checkout.");
      setLoadingSubmit(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-500">Loading purchase product specs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 text-slate-900">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-black text-gray-950 tracking-tight mb-8">Secure Checkout Details</h1>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-bold">
            🚨 {error}
          </div>
        )}

        {checkoutItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
            <p className="text-gray-500 text-sm mb-4">Your checkout bag is empty.</p>
            <button
              onClick={() => router.push("/")}
              className="text-xs font-bold text-white bg-indigo-600 px-6 py-2.5 rounded-xl shadow hover:bg-indigo-500 transition cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left side address information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Address selector / Address book */}
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">1. Select Delivery Destination</h3>
                {addresses.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Saved Addresses</label>
                    <select
                      value={selectedAddressId}
                      onChange={(e) => handleAddressSelect(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                    >
                      <option value="new">Add New Address (+)</option>
                      {addresses.map((addr) => (
                        <option key={addr.id} value={addr.id}>
                          {addr.recipientName} ({addr.phone}) - {addr.streetAddress}, {addr.city}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Address Parameters</h4>
                  <button
                    type="button"
                    onClick={handleAutoDetectLocation}
                    disabled={detectingLoc}
                    className="text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    📍 {detectingLoc ? "Detecting..." : "Auto-Detect"}
                  </button>
                </div>

                <form className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">Recipient Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={shippingName}
                      onChange={(e) => setShippingName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">10-Digit Mobile Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={shippingPhone}
                      onChange={(e) => setShippingPhone(e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">Street Address</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Flat No, Building Name, Area"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">Landmark / Apartment (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Near Star Mall"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={apartment}
                      onChange={(e) => setApartment(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">6-Digit Pin Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 400001"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">Town / City</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mumbai"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">State</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maharashtra"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>

                  {selectedAddressId === "new" && (
                    <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="save-address"
                        className="rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                        checked={saveToAddressBook}
                        onChange={(e) => setSaveToAddressBook(e.target.checked)}
                      />
                      <label htmlFor="save-address" className="text-xs text-gray-500 font-semibold cursor-pointer">
                        Save this address to your address book for future purchases
                      </label>
                    </div>
                  )}
                </form>
              </div>

              {/* Items Summary list */}
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">2. Review Items</h3>
                <div className="divide-y divide-gray-100">
                  {checkoutItems.map((item) => (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={item.images?.[0] || item.image || "https://placehold.co/100"}
                          alt=""
                          className="w-12 h-12 object-cover rounded-xl border border-gray-100"
                        />
                        <div>
                          <h4 className="text-xs font-black text-gray-950 line-clamp-1">{item.name}</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">Quantity: {item.quantity} units</p>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-gray-900">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side checkout computations (Flipkart style) */}
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">Price Details</h3>
                <div className="text-xs space-y-3 font-semibold text-gray-600">
                  <div className="flex justify-between">
                    <span>Price ({checkoutItems.reduce((acc, i) => acc + i.quantity, 0)} items)</span>
                    <span className="text-gray-900">₹{itemsSubtotal.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>GST Tax (18% calculated)</span>
                    <span className="text-gray-900">
                      {isPincodeValid ? `₹${taxAmount.toLocaleString("en-IN")}` : <span className="text-[10px] text-gray-450 font-medium">Verify Pincode</span>}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Delivery Charges</span>
                    <span className="text-gray-900">
                      {isPincodeValid ? (
                        shippingCost === 0 ? (
                          <span className="text-green-600 font-bold uppercase text-[10px]">Free Delivery</span>
                        ) : (
                          `₹${shippingCost}`
                        )
                      ) : (
                        <span className="text-[10px] text-gray-450 font-medium">Verify Pincode</span>
                      )}
                    </span>
                  </div>

                  {isPincodeValid && estimatedDelivery && (
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[10px] text-indigo-700 space-y-0.5">
                      <p className="font-black">📅 Delivery Arrival Guarantee:</p>
                      <p className="font-semibold">{estimatedDelivery}</p>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-black text-indigo-600 border-t border-gray-200 pt-4 mt-2">
                    <span>Amount Payable</span>
                    <span>₹{finalTotalAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleCheckoutSubmit}
                    disabled={loadingSubmit || !isFormValid}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/10 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingSubmit ? "Processing..." : "PAY & SECURE CHECKOUT"}
                  </button>
                  {!isFormValid && (
                    <p className="text-[9px] text-center text-gray-400 font-bold mt-2.5">
                      Fill out delivery address & pincode to activate checkout.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-500">Loading secure checkout parameters...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
