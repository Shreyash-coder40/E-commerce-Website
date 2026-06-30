"use client";

import React, { useState } from "react";
import Image from "next/image";

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
}

export default function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  // Safe fallback if images array is empty or undefined
  const finalImages = images && images.length > 0 
    ? images 
    : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"];

  const [activeIndex, setActiveIndex] = useState(0);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent link triggers
    setActiveIndex((prevIndex) => 
      prevIndex === 0 ? finalImages.length - 1 : prevIndex - 1
    );
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent link triggers
    setActiveIndex((prevIndex) => 
      prevIndex === finalImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  const activeImage = finalImages[activeIndex];

  return (
    <div className="space-y-4">
      {/* Primary Large Active Display Frame */}
      <div className="relative aspect-square w-full bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 group shadow-sm">
        <Image
          src={activeImage}
          alt={productName}
          fill
          priority
          sizes="(max-w-7xl) 50vw, 100vw"
          className="object-contain p-4 group-hover:scale-102 transition duration-300"
        />

        {/* SLIDESHOW NAVIGATION BUTTONS: Rendered conditionally if more than 1 image exists */}
        {finalImages.length > 1 && (
          <>
            {/* Left/Prev Arrow Button */}
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white border border-gray-200 shadow-md backdrop-blur-sm transition flex items-center justify-center text-gray-800 hover:text-indigo-600 active:scale-95"
              aria-label="Previous image"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Right/Next Arrow Button */}
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white border border-gray-200 shadow-md backdrop-blur-sm transition flex items-center justify-center text-gray-800 hover:text-indigo-600 active:scale-95"
              aria-label="Next image"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Multi-Image Horizontal Slideshow Thumbnail Selection Grid */}
      {finalImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200">
          {finalImages.map((imgUrl, index) => {
            const isSelected = activeIndex === index;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative h-20 w-20 flex-shrink-0 bg-white border rounded-xl overflow-hidden shadow-sm transition-all duration-200 ${
                  isSelected 
                    ? "border-indigo-600 ring-2 ring-indigo-600/20 scale-95" 
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <Image
                  src={imgUrl}
                  alt={`${productName} thumbnail ${index + 1}`}
                  fill
                  sizes="80px"
                  className="object-contain p-1.5"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}