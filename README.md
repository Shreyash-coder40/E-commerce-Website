# 🛒 NextShop — Modern AI-Powered E-Commerce Platform

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js Badge" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-blue?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS Badge" />
  <img src="https://img.shields.io/badge/Prisma-Database-blueviolet?style=for-the-badge&logo=prisma" alt="Prisma Badge" />
  <img src="https://img.shields.io/badge/Gemini_2.0-AI_Agent-orange?style=for-the-badge&logo=google-gemini" alt="Gemini Badge" />
  <img src="https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel" alt="Vercel Badge" />
</p>

---

## 🔗 Live Application
Experience the live application hosted on Vercel:  
👉 **[https://nextshop-coral-rho.vercel.app](https://nextshop-coral-rho.vercel.app)**

---

## ✨ Overview
**NextShop** is a premium, high-performance e-commerce platform built on Next.js 15. It features a unique, futuristic **Obsidian Space Glassmorphism** design theme, detailed admin business metrics, evolution charting, and is powered directly by advanced Google Gemini AI Agents to help both customers browse and admins manage products in real-time.

---

## 🎨 Key Features & Visual Refinements

### 🌌 Obsidian Space Glassmorphic Design
- Customized layout with smooth, luminous radial glow orbs (`bg-indigo-500/20`, `bg-violet-500/20`, and `bg-fuchsia-500/15`).
- Beautiful glass panels backed by `backdrop-blur-xl` and premium borders to make elements feel responsive and premium.
- Huge, semi-transparent background watermark logos (`NEXTSHOP` rotated at 12° with `9%` opacity) visible behind the product elements.

### 🤖 Gemini-Powered Customer AI Assistant
- Interactive floating customer chat assistant (**Shopping Assistant** 💬).
- Completely styled with dark theme panels and highly visible bubbles (your chats are dark indigo with white text; AI chats are clear light slate text).
- Capable of answering specs, calculating prices, summarising feedback sentiment, and directly adding products to your shopping cart (`addToCart` integration).

### 🖥️ NextShop AI Agent Command Center (Admin)
- Dedicated terminal dashboard powered by **`gemini-2.0-flash`** for instant response velocity (~3-4s processing).
- Interactive stats parameters (Total products, Out of stock, Low stock warnings) updated dynamically from the database.
- Full write authorization: admins can type or click quick suggestions (e.g. *“Add product Rolex Submariner, price 950000...”*) to execute database writes/updates directly via AI actions.

### 📈 Business Analytics & Operations Dashboard
- Real-time revenue metrics, order volumes, and financial transaction summaries.
- Role-based permissions guarding: Sidebar triggers and links are hidden for non-authenticated guests and partition functions strictly between customer profiles and administrator controls.

---

## 🛠️ Technology Stack
- **Core Framework**: Next.js 15 (App Router with Server/Client components)
- **Styling & Theme**: Tailwind CSS (Obsidian Space glassmorphic palette)
- **Database Engine**: Prisma ORM with SQLite/Postgres compatibility
- **Artificial Intelligence**: Google Gemini API (`gemini-2.0-flash`)
- **Payment Processing**: Razorpay Webhooks Integration
- **Deployments**: Vercel Serverless Hosting

---

## ⚙️ Local Development Setup

Follow these steps to run the application locally on your machine:

### 1. Clone the Repository
```bash
git clone https://github.com/Shreyash-coder40/E-commerce-Website.git
cd E-commerce-Website
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory and add the following keys:
```env
DATABASE_URL="file:./dev.db" # Or your remote SQL/Postgres URI
NEXTAUTH_SECRET="your_nextauth_secret_token"
NEXTAUTH_URL="http://localhost:3000"

# AI Integrations
GEMINI_API_KEY="your_google_gemini_api_key"

# Payments Configuration
RAZORPAY_KEY_ID="your_razorpay_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
```

### 4. Database Setup & Migrations
```bash
npx prisma generate
npx prisma db push
```

### 5. Spin up the Local Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to view the application.

---

## 🔒 Security & Privacy
No private credentials, API keys, or `.env` files are stored in this public repository. All secrets are configured locally or safely injected via the Vercel deployment console environment variables, keeping database and service integrations secure.
