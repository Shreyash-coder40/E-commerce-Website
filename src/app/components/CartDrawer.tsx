"use client";

import React, { useState, useEffect } from "react";
import { useCartStore } from "../store/useCartStore";
import { useRouter } from "next/navigation";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { cart, removeFromCart, updateQuantity, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Saved Addresses list state
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");

  // Address form fields state
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [saveToAddressBook, setSaveToAddressBook] = useState(true);

  const [detectingLoc, setDetectingLoc] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAddresses();
    }
  }, [isOpen]);

  const fetchAddresses = async () => {
    try {
      const res = await fetch("/api/addresses");
      const data = await res.json();
      if (res.ok && data.success) {
        setAddresses(data.addresses || []);
        // Autofill default if exists
        const defaultAddr = data.addresses?.find((a: any) => a.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          autofillAddress(defaultAddr);
        }
      }
    } catch (err) {
      console.error("Error fetching addresses:", err);
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

  if (!isOpen) return null;

  const totalCost = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Dynamic Live Calculations
  const isPincodeValid = /^\d{6}$/.test(pincode);

  let shippingCost = 0;
  let taxAmount = 0;
  let estimatedDelivery = "";
  let eddDateObj: Date | null = null;

  if (isPincodeValid && cart.length > 0) {
    const prefix = pincode.substring(0, 3);
    let days = 4;
    shippingCost = totalCost >= 1000 ? 0 : 50;

    if (prefix === "400") {
      days = 1;
      shippingCost = 0;
    } else if (["110", "560", "700"].includes(prefix)) {
      days = 2;
      shippingCost = totalCost >= 1000 ? 0 : 40;
    } else if (pincode.startsWith("190") || pincode.startsWith("790")) {
      days = 7;
      shippingCost = totalCost >= 1000 ? 0 : 90;
    }

    taxAmount = Number((totalCost * 0.18).toFixed(2)); // Standard 18% GST

    const calculatedEdd = new Date();
    calculatedEdd.setDate(calculatedEdd.getDate() + days);
    eddDateObj = calculatedEdd;

    estimatedDelivery = calculatedEdd.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const grandTotal = totalCost + shippingCost + taxAmount;

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        let resolvedPincode = "400001";
        let resolvedCity = "Mumbai";
        let resolvedState = "Maharashtra";

        if (lat > 25) {
          resolvedPincode = "110001";
          resolvedCity = "New Delhi";
          resolvedState = "Delhi";
        } else if (lng > 80) {
          resolvedPincode = "700001";
          resolvedCity = "Kolkata";
          resolvedState = "West Bengal";
        }

        setPincode(resolvedPincode);
        setCity(resolvedCity);
        setState(resolvedState);
        setDetectingLoc(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Location access denied or timed out. Please enter manually.");
        setDetectingLoc(false);
      },
      { timeout: 8000 }
    );
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError("");

    if (!shippingName || !shippingPhone || !streetAddress || !city || !state || !pincode) {
      setError("Please fill in all delivery address details before proceeding.");
      setLoading(false);
      return;
    }

    if (!isPincodeValid) {
      setError("Please enter a valid 6-digit pincode.");
      setLoading(false);
      return;
    }

    try {
      // Save new address to profile if checked
      if (selectedAddressId === "new" && saveToAddressBook) {
        try {
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
              isDefault: addresses.length === 0,
            }),
          });
        } catch (err) {
          console.error("Failed to save address to address book:", err);
        }
      }

      const fullConcatenatedAddress = `${streetAddress}${apartment ? `, ${apartment}` : ""}, ${city}, ${state}, India`;
      console.log("Sending checkout payload...", { cartItems: cart });

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cart,
          shippingName,
          shippingPhone,
          shippingAddress: fullConcatenatedAddress,
          pincode,
          shippingCost,
          taxAmount,
          estimatedDelivery: eddDateObj ? eddDateObj.toISOString() : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          onClose();
          return;
        }
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
          setLoading(true);
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
            clearCart();
            onClose();
            router.push("/orders");
            router.refresh();
          } catch (verifyErr: any) {
            console.error("Verification error:", verifyErr);
            setError(verifyErr.message || "Failed to verify transaction signature.");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
        theme: {
          color: "#2563eb",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Frontend checkout catch error:", err);
      setError(err.message || "An unexpected error occurred during checkout.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col text-slate-900">
          {/* Header */}
          <div className="p-6 border-b border-gray-250 flex items-center justify-between bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">Your Shopping Cart</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
          </div>

          {/* Cart item list & address form wrapper */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-750 text-xs rounded-xl font-medium">
                <strong>Checkout Error:</strong> {error}
              </div>
            )}

            {cart.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-sm">Your cart is completely empty.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Items in Cart</h3>
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 border-b border-gray-150 pb-4">
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-contain rounded-xl border bg-gray-50 p-1" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-blue-600 font-extrabold mt-0.5">₹{item.price.toLocaleString("en-IN")}</p>

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-black text-black border border-gray-400 transition"
                        >
                          -
                        </button>
                        <span className="text-xs font-black text-gray-950 px-2">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-black text-black border border-gray-400 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-xs font-bold text-red-500 hover:text-red-700 self-start mt-1">Remove</button>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="pt-6 border-t border-gray-200 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Details</h3>

                {/* Saved Address Selector */}
                {addresses.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Select Saved Address</label>
                    <select
                      value={selectedAddressId}
                      onChange={(e) => handleAddressSelect(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="new">➕ Add New Address</option>
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.recipientName} ({a.zipCode}) - {a.streetAddress}, {a.city} {a.isDefault ? "[Default]" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Geolocation auto-detect trigger */}
                {selectedAddressId === "new" && (
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLoc}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    📍 {detectingLoc ? "Detecting location details..." : "Auto-Detect Current Location"}
                  </button>
                )}

                {/* Recipient details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Full Name</label>
                    <input
                      type="text"
                      value={shippingName}
                      disabled={selectedAddressId !== "new"}
                      onChange={(e) => setShippingName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Phone Number</label>
                    <input
                      type="text"
                      value={shippingPhone}
                      disabled={selectedAddressId !== "new"}
                      onChange={(e) => setShippingPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Street address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Street Address</label>
                  <input
                    type="text"
                    value={streetAddress}
                    disabled={selectedAddressId !== "new"}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="123 Main Street"
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Apartment/Suite</label>
                    <input
                      type="text"
                      value={apartment}
                      disabled={selectedAddressId !== "new"}
                      onChange={(e) => setApartment(e.target.value)}
                      placeholder="Apt 4B (Optional)"
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Pincode</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={pincode}
                      disabled={selectedAddressId !== "new"}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                      placeholder="400001"
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">City</label>
                    <input
                      type="text"
                      value={city}
                      disabled={selectedAddressId !== "new"}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Mumbai"
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">State</label>
                    <input
                      type="text"
                      value={state}
                      disabled={selectedAddressId !== "new"}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Maharashtra"
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                {selectedAddressId === "new" && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="save_addr"
                      checked={saveToAddressBook}
                      onChange={(e) => setSaveToAddressBook(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <label htmlFor="save_addr" className="text-xs font-semibold text-slate-600 select-none">
                      Save this address to my profile for future purchases
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer total summary block */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-gray-250 bg-gray-50 space-y-4">
              <div className="space-y-1.5 text-xs text-slate-600 font-semibold border-b border-gray-200 pb-3">
                <div className="flex justify-between">
                  <span>Cart Items Subtotal:</span>
                  <span className="text-slate-900">₹{totalCost.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dynamic GST Tax (18%):</span>
                  <span className="text-slate-900">{isPincodeValid ? `₹${taxAmount.toLocaleString("en-IN")}` : "Enter Pincode"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Charges:</span>
                  <span className="text-slate-900">
                    {isPincodeValid ? (shippingCost === 0 ? "FREE" : `₹${shippingCost}`) : "Enter Pincode"}
                  </span>
                </div>
                {isPincodeValid && estimatedDelivery && (
                  <div className="flex justify-between pt-1 font-bold text-blue-600">
                    <span>📅 Estimated Arrival:</span>
                    <span>{estimatedDelivery}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-base font-extrabold text-gray-950">
                <span>Grand Total Amount:</span>
                <span>₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow transition disabled:bg-blue-400 active:scale-[0.98] cursor-pointer"
              >
                {loading ? "Processing Payment..." : "Confirm & Pay"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}