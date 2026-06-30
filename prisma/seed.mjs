import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// Create direct connection pool using DIRECT_URL for migrations/seeding stability
const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database with specifications, warranty, reviews, and Q&A...");

  // Clear existing records to allow re-seeding
  await prisma.questionAnswer.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});
  console.log("Existing data cleared.");

  // 1. Create Admin User
  const adminEmail = "admin@example.com";
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "System Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("Admin user seeded:", admin.email);

  // 2. Create Sample Customer User
  const customerEmail = "customer@example.com";
  const customerPassword = await bcrypt.hash("customer123", 10);
  const customer = await prisma.user.create({
    data: {
      email: customerEmail,
      name: "John Doe",
      password: customerPassword,
      role: "CUSTOMER",
    },
  });
  console.log("Customer user seeded:", customer.email);

  // 3. Create Sample Products
  const products = [
    {
      name: "Apple iPhone 15 Pro (128 GB) - Natural Titanium",
      description: "FORGED IN TITANIUM — iPhone 15 Pro has a strong and light aerospace-grade titanium design with a textured matte-glass back. It also features a Ceramic Shield front that’s tougher than any smartphone glass. And it’s splash, water, and dust resistant.\n\nDYNAMIC ISLAND — Dynamic Island bubbles up alerts and Live Activities — so you don’t miss them while you’re doing something else. You can track your next ride, see who’s calling, check your flight status, and so much more.",
      price: 129900,
      mrp: 134900,
      category: "Mobiles",
      stock: 15,
      images: ["https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800"],
      warranty: "1 Year Manufacturer Brand Warranty for Phone and 6 Months for Inbox Accessories",
      specifications: {
        "Model Name": "iPhone 15 Pro",
        "Color": "Natural Titanium",
        "Storage": "128 GB",
        "RAM": "8 GB",
        "Display Size": "6.1 inches",
        "Primary Camera": "48MP + 12MP + 12MP",
        "Secondary Camera": "12MP Front",
        "Processor Type": "A17 Pro Chip",
      },
    },
    {
      name: "Sony WH-1000XM5 Wireless Active Noise Cancelling Headphones",
      description: "Industry Leading Noise Cancelling-Two processors control 8 microphones for unprecedented noise cancelling. With Auto NC Optimizer, noise cancelling is automatically optimized based on your wearing conditions and environment.\n\nMagnificent Sound, engineered to perfection with the new Integrated Processor V1. Crystal clear hands-free calling with 4 beamforming microphones, precise voice pickup, and advanced audio signal processing.",
      price: 29990,
      mrp: 34990,
      category: "Audio",
      stock: 25,
      images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"],
      warranty: "1 Year Domestic Warranty from Sony India",
      specifications: {
        "Model Name": "WH-1000XM5",
        "Color": "Black",
        "Headphone Type": "On the Ear",
        "Connectivity": "Bluetooth / Wired",
        "Battery Life": "Up to 30 Hours",
        "Noise Cancellation": "Yes (Active Noise Cancellation)",
        "Charging Time": "3.5 Hours",
      },
    },
    {
      name: "Samsung 32-inch M8 Smart Monitor & TV",
      description: "Smart TV Experience: Enjoy Netflix, YouTube and other streaming services by simply connecting the monitor to WiFi. Samsung TV Plus also offers free live and on-demand content with no downloads or sign-ups needed, while Universal Guide provides personalized content recommendations.\n\nIconic Slim Design: The smart monitor is designed with your lifestyle in mind, offering a more cutting-edge design than ever. With an ultra-slim flat back, neat camera design and beautiful colors, the monitor offers a minimalist look.",
      price: 34999,
      mrp: 59999,
      category: "Electronics",
      stock: 8,
      images: ["https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800"],
      warranty: "3 Years Manufacturer Warranty",
      specifications: {
        "Model Name": "M8 Smart Monitor",
        "Screen Size": "32 inches",
        "Resolution": "3840 x 2160 Pixels (4K)",
        "Display Type": "LED",
        "Smart OS": "Tizen",
        "Connectivity": "HDMI, USB-C, Wi-Fi, Bluetooth",
        "Refresh Rate": "60 Hz",
      },
    },
    {
      name: "Nike Air Max Pulse Sneakers",
      description: "The Air Max Pulse pulls inspiration from the London music scene, bringing an underground touch to the iconic Air Max line. Its textile-wrapped midsole and point-loaded cushioning system deliver a clean look that's comfortable day in, day out.\n\nEngineered mesh upper offers lightweight breathability.",
      price: 13995,
      mrp: 15995,
      category: "Footwear",
      stock: 12,
      images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800"],
      warranty: "No Warranty",
      specifications: {
        "Model Name": "Air Max Pulse",
        "Color": "Summit White/Pistachio",
        "Gender": "Men",
        "Type": "Running Shoes",
        "Material": "Mesh & Synthetic",
        "Sole Material": "Rubber Sole",
      },
    },
    {
      name: "Dell XPS 13 Laptop (13.4-inch FHD+, Core i7, 16GB RAM, 512GB SSD)",
      description: "Stunning Display: A 13.4-inch FHD+ (1920 x 1200) anti-glare display with 500-nit brightness offers breathtaking views. Powerhouse Performance: 12th Gen Intel Core i7 processor and Intel Iris Xe graphics deliver exceptional speed.\n\nPremium Build: Crafted from CNC machined aluminum and carbon fiber, this notebook is lightweight yet highly durable.",
      price: 114990,
      mrp: 134990,
      category: "Electronics",
      stock: 5,
      images: ["https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800"],
      warranty: "1 Year Premium Support Plus Onsite Warranty",
      specifications: {
        "Model Name": "XPS 13 9315",
        "Processor": "Intel Core i7 12th Gen",
        "RAM": "16 GB LPDDR5",
        "Storage": "512 GB SSD",
        "Operating System": "Windows 11 Home",
        "Screen Size": "13.4 inches",
        "Graphics": "Intel Iris Xe Graphics",
        "Weight": "1.17 kg",
      },
    }
  ];

  const dbProducts = [];
  for (const product of products) {
    const dbProduct = await prisma.product.create({
      data: product,
    });
    dbProducts.push(dbProduct);
    console.log(`Product seeded: ${dbProduct.name} under ${dbProduct.category}`);
  }

  // 4. Create Sample Reviews
  await prisma.review.createMany({
    data: [
      {
        productId: dbProducts[0].id, // iPhone 15 Pro
        userId: customer.id,
        rating: 5,
        comment: "Excellent phone! Titanium design is extremely premium and feels significantly lighter. Battery life has been solid.",
      },
      {
        productId: dbProducts[0].id,
        userId: customer.id,
        rating: 4,
        comment: "Beautiful color and top notch screen. Replaced my old iPhone 12 and the difference is massive. Highly recommended.",
      },
      {
        productId: dbProducts[1].id, // Sony headphones
        userId: customer.id,
        rating: 5,
        comment: "Incredible noise cancellation! The sound stage is extremely balanced and battery lasts forever.",
      }
    ]
  });
  console.log("Sample reviews seeded.");

  // 5. Create Sample Q&As
  await prisma.questionAnswer.createMany({
    data: [
      {
        productId: dbProducts[0].id, // iPhone 15 Pro
        userId: customer.id,
        question: "Does it come with a power adapter in the box?",
        answer: "No, the box only contains the USB-C cable. You need to purchase a 20W USB-C power adapter separately.",
      },
      {
        productId: dbProducts[0].id,
        userId: customer.id,
        question: "Is the action button customizable?",
        answer: "Yes! You can configure the action button to toggle Silent Mode, Flashlight, Voice Memo, Camera, Translate, or custom Shortcuts.",
      },
      {
        productId: dbProducts[2].id, // Samsung Monitor
        userId: customer.id,
        question: "Does this monitor have built-in speakers?",
        answer: "Yes, it has built-in speakers and smart TV functionality so you can stream apps without a PC.",
      }
    ]
  });
  console.log("Sample Q&As seeded.");

  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
