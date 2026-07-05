"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/app/store/useCartStore";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images?: string[];
  stock: number;
  category: string;
}

interface Message {
  sender: "user" | "ai";
  text: string;
  products?: Product[];
}

export default function UserAiChatbot() {
  const pathname = usePathname();
  const addToCart = useCartStore((state) => state.addToCart);

  // Hide the chatbot on admin pages entirely
  const isAdminPage = pathname.startsWith("/admin");
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "### Hello! I am your NextShop AI Shopping Assistant. 🤖\nI can help you browse catalog items, summarize customer reviews, answer product specs, and even add items to your cart for you!\n\nWhat are you looking for today? Ask me about shoes, watches, electronics or luxury items!"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // Show a temporary visual toast notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = { sender: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-10)
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessages((prev) => [...prev, { sender: "ai", text: data.text, products: data.products }]);
        
        // Execute client-side cart action if triggered by AI
        if (data.product) {
          addToCart({
            id: data.product.id,
            name: data.product.name,
            price: data.product.price,
            image: data.product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",
            stock: data.product.stock
          });
          triggerToast(`🛒 Added "${data.product.name}" to cart!`);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: `🚨 **Error**: ${data.error || "Failed to reach shopping assistant."}` }
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "🚨 **Error**: Connection failed. Please check network settings." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const formatInline = (text: string) => {
    let formatted: React.ReactNode[] = [];
    const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        formatted.push(<strong key={i} className="font-extrabold text-gray-950">{parts[i]}</strong>);
      } else {
        const subparts = parts[i].split(/\*([\s\S]*?)\*/g);
        for (let j = 0; j < subparts.length; j++) {
          if (j % 2 === 1) {
            formatted.push(<em key={`${i}-${j}`} className="italic text-gray-700">{subparts[j]}</em>);
          } else {
            formatted.push(subparts[j]);
          }
        }
      }
    }
    return formatted;
  };

  const parseMarkdown = (markdown: string) => {
    const lines = markdown.split("\n");
    let inTable = false;
    let tableRows: string[][] = [];
    const elements: React.JSX.Element[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        inTable = true;
        const cells = trimmed
          .split("|")
          .map((c) => c.trim())
          .filter((c, i, arr) => i > 0 && i < arr.length - 1);
        
        if (cells.every((c) => /^:?-+:?$/.test(c))) {
          return;
        }

        tableRows.push(cells);
        return;
      } else if (inTable) {
        elements.push(renderTable(tableRows, idx));
        tableRows = [];
        inTable = false;
      }

      if (trimmed.startsWith("###")) {
        elements.push(<h3 key={idx} className="text-sm font-black text-indigo-700 mt-3 mb-1.5 uppercase tracking-wider">{formatInline(trimmed.replace(/^###\s*/, ""))}</h3>);
      } else if (trimmed.startsWith("####")) {
        elements.push(<h4 key={idx} className="text-xs font-black text-slate-950 mt-2 mb-1 uppercase tracking-wider">{formatInline(trimmed.replace(/^####\s*/, ""))}</h4>);
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        elements.push(
          <li key={idx} className="text-xs text-slate-950 ml-4 list-disc mb-1 leading-relaxed font-semibold">
            {formatInline(trimmed.substring(2))}
          </li>
        );
      } else if (/^\d+\.\s/.test(trimmed)) {
        elements.push(
          <li key={idx} className="text-xs text-slate-950 ml-4 list-decimal mb-1 leading-relaxed font-semibold">
            {formatInline(trimmed.replace(/^\d+\.\s*/, ""))}
          </li>
        );
      } else if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
        elements.push(
          <code key={idx} className="inline-block px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-900 text-[10px] font-mono rounded font-semibold my-1">
            {trimmed.replace(/`/g, "")}
          </code>
        );
      } else if (trimmed !== "") {
        elements.push(<p key={idx} className="text-xs text-slate-950 leading-relaxed mb-2.5 font-semibold">{formatInline(line)}</p>);
      }
    });

    if (inTable && tableRows.length > 0) {
      elements.push(renderTable(tableRows, lines.length));
    }

    return elements;
  };

  const renderTable = (rows: string[][], keyIdx: number) => {
    if (rows.length === 0) return <div key={keyIdx} />;
    const headers = rows[0];
    const dataRows = rows.slice(1);

       <div key={keyIdx} className="overflow-x-auto my-3 border border-slate-800 rounded-xl shadow-sm">
        <table className="min-w-full divide-y divide-slate-800 text-[11px] text-left">
          <thead className="bg-slate-950/60">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 font-bold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-transparent">
            {dataRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-950/40 transition">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-3 py-2 text-slate-350 font-medium">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (isAdminPage) return null;

  return (
    <>
      {/* Floating Toggle Bubble */}
      <div className="fixed bottom-6 left-6 z-55">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xl hover:shadow-indigo-500/25 hover:scale-105 active:scale-95 transition flex items-center justify-center cursor-pointer relative"
        >
          {isOpen ? (
            <span className="text-lg font-black">✕</span>
          ) : (
            <div className="relative">
              <span className="text-2xl">💬</span>
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse" />
            </div>
          )}
        </button>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-6 bg-slate-900 border border-slate-850 text-white px-4 py-3 rounded-2xl text-xs font-black shadow-2xl z-55 flex items-center gap-2 animate-slide-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Chat drawer interface panel */}
      {isOpen && (
        <div className="fixed bottom-20 left-6 w-96 max-w-[calc(100vw-3rem)] h-[460px] max-h-[calc(100vh-6rem)] bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl z-55 flex flex-col overflow-hidden text-white animate-slide-in font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-650 to-violet-650 text-white p-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center text-lg">🤖</div>
              <div>
                <h4 className="text-xs font-black tracking-wider uppercase">Shopping Assistant</h4>
                <p className="text-[10px] text-indigo-100 font-bold flex items-center gap-1 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" /> AI Store Assistant
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white text-sm font-black cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Quick suggestions chips */}
          <div className="bg-slate-950/60 border-b border-slate-800/60 p-3 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
            <button
              onClick={() => handleSendMessage("Tell me about Nike Shoes")}
              className="bg-slate-950/40 hover:bg-slate-950/80 text-[10px] font-bold text-slate-200 border border-slate-800 px-2.5 py-1.5 rounded-xl shadow-sm transition cursor-pointer inline-block"
            >
              👟 Show Nike Shoes
            </button>
            <button
              onClick={() => handleSendMessage("What is the price of the Rolex watch?")}
              className="bg-slate-950/40 hover:bg-slate-950/80 text-[10px] font-bold text-slate-200 border border-slate-800 px-2.5 py-1.5 rounded-xl shadow-sm transition cursor-pointer inline-block"
            >
              ⌚ Rolex Details
            </button>
            <button
              onClick={() => handleSendMessage("Summarize the reviews for Samsung")}
              className="bg-slate-950/40 hover:bg-slate-950/80 text-[10px] font-bold text-slate-200 border border-slate-800 px-2.5 py-1.5 rounded-xl shadow-sm transition cursor-pointer inline-block"
            >
              ⭐ Review summaries
            </button>
          </div>

          {/* Message scroll container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-transparent">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} space-y-2`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-xs ${
                    msg.sender === "user"
                      ? "bg-sky-100 text-slate-950 font-bold border border-sky-200 rounded-bl-none"
                      : "bg-slate-950/60 border border-slate-800 text-slate-350 rounded-br-none"
                  }`}
                >
                  {parseMarkdown(msg.text)}
                </div>

                {/* Visual Product Carousel */}
                {msg.sender === "ai" && msg.products && msg.products.length > 0 && (
                  <div className="w-full max-w-full overflow-x-auto flex gap-3 py-1.5 no-scrollbar snap-x snap-mandatory">
                    {msg.products.map((prod) => {
                      const rating = 4 + (prod.name.length % 10) * 0.1;
                      const image = prod.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500";
                      
                      return (
                        <div 
                          key={prod.id}
                          className="min-w-[150px] max-w-[150px] snap-start bg-slate-950/80 border border-slate-800/80 rounded-2xl shadow-xs overflow-hidden hover:shadow-md transition flex flex-col group"
                        >
                          {/* Image container */}
                          <div className="h-20 w-full bg-slate-900/60 relative overflow-hidden flex items-center justify-center">
                            <img 
                              src={image} 
                              alt={prod.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <span className="absolute top-1.5 left-1.5 bg-slate-950/80 text-white text-[8px] font-black px-1 py-0.5 rounded-md backdrop-blur-xs uppercase tracking-wider">
                              {prod.category}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1">
                            <div>
                              <h5 className="text-[9px] font-black text-white line-clamp-2 leading-tight">
                                {prod.name}
                              </h5>
                              <div className="flex items-center gap-0.5 mt-0.5">
                                <span className="text-amber-500 text-[8px]">★</span>
                                <span className="text-slate-400 text-[8px] font-bold">{rating.toFixed(1)}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] font-black text-indigo-400">
                                ₹{prod.price.toLocaleString("en-IN")}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  addToCart({
                                    id: prod.id,
                                    name: prod.name,
                                    price: prod.price,
                                    image: image,
                                    stock: prod.stock
                                  });
                                  triggerToast(`🛒 Added "${prod.name}" to cart!`);
                                }}
                                className="h-5 w-5 rounded-md bg-indigo-650 hover:bg-indigo-500 active:scale-95 text-white flex items-center justify-center shadow-xs transition cursor-pointer text-xs"
                              >
                                ＋
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 rounded-bl-none shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce delay-75" />
                    <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce delay-150" />
                    <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce delay-300" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Shopping assistant searching...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer form box */}
          <form onSubmit={handleFormSubmit} className="p-4 border-t border-slate-800 bg-slate-950/60 flex gap-2 backdrop-blur-xs">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about price, warranty, reviews, or say 'add to cart'..."
              className="flex-1 bg-slate-950/45 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 focus:bg-slate-950/80 transition"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="bg-indigo-650 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-40"
            >
              Send
            </button>
          </form>

        </div>
      )}
    </>
  );
}
