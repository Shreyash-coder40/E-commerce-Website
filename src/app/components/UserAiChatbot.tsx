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

  // PDF attachment & client-side extraction states
  const [attachedPdf, setAttachedPdf] = useState<{ name: string; text: string } | null>(null);
  const [readingPdf, setReadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadPdfJs = () => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
        resolve(pdfjsLib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReadingPdf(true);
    try {
      const pdfjsLib: any = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += `--- Page ${i} ---\n${pageText}\n`;
      }
      
      setAttachedPdf({ name: file.name, text: fullText });
    } catch (err) {
      console.error("PDF text extraction failed:", err);
      alert("Failed to read PDF file content. Make sure it is not corrupted or scanned image-only.");
    } finally {
      setReadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
    if ((!textToSend.trim() && !attachedPdf) || loading) return;

    // Use empty space if sending document-only query
    const messageContent = textToSend.trim() || `Analyze the attached document: ${attachedPdf?.name}`;
    
    // Create clean message for local visual state
    const visualText = messageContent + (attachedPdf ? ` 📄 [Doc: ${attachedPdf.name}]` : "");
    const userMsg: Message = { sender: "user", text: visualText };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    // Format query text to inject full PDF text contents into model context
    let apiMessage = messageContent;
    if (attachedPdf) {
      apiMessage = `[Attached Document: ${attachedPdf.name}]\n\n--- Start of Document content ---\n${attachedPdf.text}\n--- End of Document content ---\n\nUser Question: ${messageContent}`;
    }

    // Keep reference and reset attachment state immediately
    const currentPdf = attachedPdf;
    setAttachedPdf(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: apiMessage,
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
        formatted.push(<strong key={i} className="font-extrabold text-slate-900">{parts[i]}</strong>);
      } else {
        const subparts = parts[i].split(/\*([\s\S]*?)\*/g);
        for (let j = 0; j < subparts.length; j++) {
          if (j % 2 === 1) {
            formatted.push(<em key={`${i}-${j}`} className="italic text-slate-650">{subparts[j]}</em>);
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
        elements.push(<h3 key={idx} className="text-sm font-black text-[#0077B6] mt-3 mb-1.5 uppercase tracking-wider">{formatInline(trimmed.replace(/^###\s*/, ""))}</h3>);
      } else if (trimmed.startsWith("####")) {
        elements.push(<h4 key={idx} className="text-xs font-black text-slate-700 mt-2 mb-1 uppercase tracking-wider">{formatInline(trimmed.replace(/^####\s*/, ""))}</h4>);
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        elements.push(
          <li key={idx} className="text-xs text-slate-700 ml-4 list-disc mb-1 leading-relaxed font-semibold">
            {formatInline(trimmed.substring(2))}
          </li>
        );
      } else if (/^\d+\.\s/.test(trimmed)) {
        elements.push(
          <li key={idx} className="text-xs text-slate-700 ml-4 list-decimal mb-1 leading-relaxed font-semibold">
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
        elements.push(<p key={idx} className="text-xs text-slate-700 leading-relaxed mb-2.5 font-semibold">{formatInline(line)}</p>);
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
    return (
      <div key={keyIdx} className="overflow-x-auto my-3 border border-slate-200 rounded-xl shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-[11px] text-left">
          <thead className="bg-slate-50">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-transparent">
            {dataRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-50/50 transition">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-3 py-2 text-slate-700 font-medium">{cell}</td>
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
          className="h-14 w-14 rounded-full bg-[#0077B6] text-white shadow-xl hover:shadow-indigo-550/25 hover:scale-105 active:scale-95 transition flex items-center justify-center cursor-pointer relative"
        >
          {isOpen ? (
            <span className="text-lg font-black">✕</span>
          ) : (
            <div className="relative">
              <span className="text-2xl">💬</span>
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
            </div>
          )}
        </button>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-6 bg-[#0077B6] text-white px-4 py-3 rounded-2xl text-xs font-black shadow-2xl z-55 flex items-center gap-2 animate-slide-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Chat drawer interface panel */}
      {isOpen && (
        <div className="fixed bottom-20 left-6 w-96 max-w-[calc(100vw-3rem)] h-[460px] max-h-[calc(100vh-6rem)] bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl z-55 flex flex-col overflow-hidden text-slate-800 animate-slide-in font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
          
          {/* Header */}
          <div className="bg-[#0077B6] text-white p-5 flex items-center justify-between shadow-sm">
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
          <div className="bg-slate-50 border-b border-slate-200 p-3 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
            <button
              onClick={() => handleSendMessage("Tell me about Nike Shoes")}
              className="bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-sm transition cursor-pointer inline-block"
            >
              👟 Show Nike Shoes
            </button>
            <button
              onClick={() => handleSendMessage("What is the price of the Rolex watch?")}
              className="bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-sm transition cursor-pointer inline-block"
            >
              ⌚ Rolex Details
            </button>
            <button
              onClick={() => handleSendMessage("Summarize the reviews for Samsung")}
              className="bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-sm transition cursor-pointer inline-block"
            >
              ⭐ Review summaries
            </button>
          </div>

          {/* Message scroll container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FAFAFA]">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} space-y-2`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-xs text-xs ${
                    msg.sender === "user"
                      ? "bg-[#0077B6] text-white font-bold rounded-bl-none"
                      : "bg-white border border-slate-200 text-slate-800 rounded-br-none"
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
                          className="min-w-[150px] max-w-[150px] snap-start bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden hover:shadow-md transition flex flex-col group"
                        >
                          {/* Image container */}
                          <div className="h-20 w-full bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                            <img 
                              src={image} 
                              alt={prod.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <span className="absolute top-1.5 left-1.5 bg-white border border-slate-200 text-slate-700 text-[8px] font-black px-1.5 py-0.5 rounded-md backdrop-blur-xs uppercase tracking-wider">
                              {prod.category}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1 bg-white">
                            <div>
                              <h5 className="text-[9px] font-black text-slate-800 line-clamp-2 leading-tight">
                                {prod.name}
                              </h5>
                              <div className="flex items-center gap-0.5 mt-0.5">
                                <span className="text-amber-500 text-[8px]">★</span>
                                <span className="text-slate-500 text-[8px] font-bold">{rating.toFixed(1)}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] font-black text-[#0077B6]">
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
                                className="h-5 w-5 rounded-md bg-[#0077B6] hover:bg-[#005f91] active:scale-95 text-white flex items-center justify-center shadow-xs transition cursor-pointer text-xs"
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
                <div className="bg-white border border-slate-200 rounded-2xl p-4 rounded-bl-none shadow-xs flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 bg-[#0077B6] rounded-full animate-bounce delay-75" />
                    <span className="h-1.5 w-1.5 bg-[#0077B6] rounded-full animate-bounce delay-150" />
                    <span className="h-1.5 w-1.5 bg-[#0077B6] rounded-full animate-bounce delay-300" />
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold">Shopping assistant searching...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attached Document Visual Indicators */}
          {readingPdf && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center text-xs text-[#0077B6] font-bold gap-2 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-[#0077B6] animate-ping" />
              <span>Parsing document text...</span>
            </div>
          )}
          {attachedPdf && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-emerald-600 font-semibold gap-2 animate-slide-in">
              <div className="flex items-center gap-2">
                <span>📄</span>
                <span className="truncate max-w-[200px] text-slate-800">{attachedPdf.name}</span>
                <span className="text-[10px] text-slate-450 font-bold">({Math.round(attachedPdf.text.length / 1024)} KB text extracted)</span>
              </div>
              <button 
                type="button" 
                onClick={() => setAttachedPdf(null)} 
                className="text-slate-400 hover:text-slate-700 font-black cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-200 transition"
              >
                ✕
              </button>
            </div>
          )}

          {/* Footer form box */}
          <form onSubmit={handleFormSubmit} className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2 backdrop-blur-xs">
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handlePdfUpload}
              accept=".pdf"
              className="hidden"
            />
            
            <button
              type="button"
              disabled={loading || readingPdf}
              onClick={() => fileInputRef.current?.click()}
              title="Attach PDF Document"
              className="h-9 w-9 rounded-xl bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition flex items-center justify-center cursor-pointer disabled:opacity-40 flex-shrink-0"
            >
              📎
            </button>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={attachedPdf ? "Ask something about the attached PDF..." : "Ask about price, warranty, reviews, or say 'add to cart'..."}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/25 focus:border-[#0077B6] transition"
            />
            <button
              type="submit"
              disabled={loading || readingPdf || (!inputValue.trim() && !attachedPdf)}
              className="bg-[#FF6B35] hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-40 flex-shrink-0"
            >
              Send
            </button>
          </form>

        </div>
      )}
    </>
  );
}
