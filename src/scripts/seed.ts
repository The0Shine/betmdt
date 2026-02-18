import mongoose from "mongoose";
import env from "../config/env";
import Role from "../models/role.model";
import User from "../models/user.model";
import Category from "../models/category.model";
import Product from "../models/product.model";
import Order from "../models/order.model";
import { Stock, StockHistory } from "../models/stock.model";
import { hashPassword } from "../utils/crypto";

const seedDatabase = async () => {
  try {
    console.log("🚀 Bắt đầu seeding database cho shop điện tử...");

    await mongoose.connect(env.MONGODB_URI);
    console.log("✅ Đã kết nối MongoDB");

    // Xóa dữ liệu cũ
    await Role.deleteMany({});
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Stock.deleteMany({});
    await StockHistory.deleteMany({});
    console.log("🧹 Đã xóa dữ liệu cũ");

    // ========================
    // ROLES
    // ========================
    const userRole = await Role.create({
      name: "user",
      description: "Người dùng thông thường",
      permissions: [
        "products.view",
        "orders.view",
        "orders.create",
        "profile.view",
        "profile.edit",
      ],
    });

    const adminRole = await Role.create({
      name: "admin",
      description: "Quản trị viên với quyền truy cập đầy đủ",
      permissions: [
        "admin.all",
        "super.admin",
        "products.view",
        "products.create",
        "products.edit",
        "products.delete",
        "orders.view",
        "orders.create",
        "orders.edit",
        "orders.delete",
        "users.view",
        "users.create",
        "users.edit",
        "users.delete",
        "roles.view",
        "roles.create",
        "roles.edit",
        "roles.delete",
        "inventory.view",
        "inventory.create",
        "inventory.edit",
        "inventory.delete",
        "dashboard.view",
      ],
    });

    console.log("✅ Đã tạo roles");

    // ========================
    // USERS
    // ========================
    const adminUser = await User.create({
      firstName: "Admin",
      lastName: "System",
      email: "admin@tmdt.com",
      password: hashPassword("admin123"),
      role: adminRole._id,
      phone: "0909000000",
      address: "123 Nguyễn Huệ, Quận 1, TP.HCM",
    });

    const users = await User.create([
      {
        firstName: "Nguyễn",
        lastName: "Văn An",
        email: "nguyenvanan@gmail.com",
        password: hashPassword("user123"),
        role: userRole._id,
        phone: "0901234567",
        address: "456 Lê Lợi, Quận 1, TP.HCM",
      },
      {
        firstName: "Trần",
        lastName: "Thị Bích",
        email: "tranbich@gmail.com",
        password: hashPassword("user123"),
        role: userRole._id,
        phone: "0907654321",
        address: "789 Hai Bà Trưng, Quận 3, TP.HCM",
      },
      {
        firstName: "Lê",
        lastName: "Minh Tuấn",
        email: "leminhtuan@gmail.com",
        password: hashPassword("user123"),
        role: userRole._id,
        phone: "0912345678",
        address: "321 Võ Văn Tần, Quận 3, TP.HCM",
      },
      {
        firstName: "Phạm",
        lastName: "Hoàng Nam",
        email: "phamhoangnam@gmail.com",
        password: hashPassword("user123"),
        role: userRole._id,
        phone: "0923456789",
        address: "654 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM",
      },
      {
        firstName: "Hoàng",
        lastName: "Thị Mai",
        email: "hoangmai@gmail.com",
        password: hashPassword("user123"),
        role: userRole._id,
        phone: "0934567890",
        address: "987 Cách Mạng Tháng 8, Quận Tân Bình, TP.HCM",
      },
    ]);

    console.log("✅ Đã tạo users");

    // ========================
    // CATEGORIES (Parent + Children)
    // ========================
    // Parent categories
    const catPhone = await Category.create({
      name: "Điện thoại & Tablet",
      description: "Điện thoại thông minh, máy tính bảng các thương hiệu hàng đầu",
      icon: "📱",
    });

    const catLaptop = await Category.create({
      name: "Laptop & PC",
      description: "Laptop, máy tính để bàn và linh kiện",
      icon: "💻",
    });

    const catAccessory = await Category.create({
      name: "Phụ kiện",
      description: "Tai nghe, sạc, cáp, ốp lưng và phụ kiện điện tử",
      icon: "🎧",
    });

    const catWatch = await Category.create({
      name: "Đồng hồ thông minh",
      description: "Smartwatch và thiết bị đeo thông minh",
      icon: "⌚",
    });

    const catAudio = await Category.create({
      name: "Thiết bị âm thanh",
      description: "Loa, tai nghe, soundbar và thiết bị âm thanh",
      icon: "🔊",
    });

    const catCamera = await Category.create({
      name: "Camera & Máy ảnh",
      description: "Camera an ninh, action cam và máy ảnh",
      icon: "📷",
    });

    // Sub-categories
    await Category.create([
      { name: "iPhone", description: "Điện thoại Apple iPhone", parent: catPhone._id },
      { name: "Samsung Galaxy", description: "Điện thoại Samsung Galaxy", parent: catPhone._id },
      { name: "Xiaomi", description: "Điện thoại Xiaomi", parent: catPhone._id },
      { name: "iPad & Tablet", description: "Máy tính bảng", parent: catPhone._id },
      { name: "Laptop Gaming", description: "Laptop chơi game", parent: catLaptop._id },
      { name: "Laptop Văn Phòng", description: "Laptop cho công việc", parent: catLaptop._id },
      { name: "PC Gaming", description: "Máy tính chơi game", parent: catLaptop._id },
      { name: "Linh kiện PC", description: "Linh kiện máy tính", parent: catLaptop._id },
      { name: "Tai nghe", description: "Tai nghe không dây và có dây", parent: catAccessory._id },
      { name: "Sạc & Cáp", description: "Sạc nhanh và cáp kết nối", parent: catAccessory._id },
      { name: "Ốp lưng & Bao da", description: "Phụ kiện bảo vệ điện thoại", parent: catAccessory._id },
      { name: "Bàn phím & Chuột", description: "Thiết bị ngoại vi", parent: catAccessory._id },
    ]);

    console.log("✅ Đã tạo categories");

    // ========================
    // PRODUCTS
    // ========================
    const products = await Product.create([
      // === ĐIỆN THOẠI ===
      {
        name: "iPhone 15 Pro Max 256GB",
        description: "iPhone 15 Pro Max với chip A17 Pro mạnh mẽ, camera 48MP ProRAW, khung titan siêu nhẹ và bền. Màn hình Super Retina XDR 6.7 inch, Dynamic Island thế hệ mới. Hỗ trợ USB-C và sạc nhanh 20W.",
        price: 29990000,
        oldPrice: 34990000,
        category: catPhone._id,
        quantity: 50,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1200&q=80",
          "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=1200&q=80",
        ],
        unit: "chiếc",
        costPrice: 26000000,
        featured: true,
        hot: true,
        rating: 4.9,
        reviews: 245,
        published: true,
        specifications: {
          "Màn hình": "6.7 inch Super Retina XDR",
          "Chip": "A17 Pro",
          "RAM": "8GB",
          "Bộ nhớ": "256GB",
          "Camera": "48MP + 12MP + 12MP",
          "Pin": "4422mAh",
          "Bảo hành": "12 tháng",
        },
      },
      {
        name: "iPhone 15 128GB",
        description: "iPhone 15 với Dynamic Island, camera 48MP nâng cấp, chip A16 Bionic mạnh mẽ. Thiết kế mặt kính mới ceramic shield, cổng sạc USB-C tiêu chuẩn.",
        price: 19990000,
        oldPrice: 22990000,
        category: catPhone._id,
        quantity: 80,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=1200&q=80",
        ],
        unit: "chiếc",
        costPrice: 17000000,
        new: true,
        rating: 4.7,
        reviews: 156,
        published: true,
        specifications: {
          "Màn hình": "6.1 inch Super Retina XDR",
          "Chip": "A16 Bionic",
          "Bộ nhớ": "128GB",
          "Camera": "48MP + 12MP",
          "Pin": "3349mAh",
        },
      },
      {
        name: "Samsung Galaxy S24 Ultra 512GB",
        description: "Galaxy S24 Ultra với Galaxy AI, màn hình Dynamic AMOLED 2X 6.8 inch, camera 200MP zoom quang 10x, bút S Pen tích hợp. Khung Titan bền bỉ, pin 5000mAh sạc siêu nhanh 45W.",
        price: 33990000,
        oldPrice: 36990000,
        category: catPhone._id,
        quantity: 35,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=1200&q=80",
        ],
        unit: "chiếc",
        costPrice: 29000000,
        featured: true,
        hot: true,
        rating: 4.8,
        reviews: 189,
        published: true,
        specifications: {
          "Màn hình": "6.8 inch Dynamic AMOLED 2X",
          "Chip": "Snapdragon 8 Gen 3",
          "RAM": "12GB",
          "Bộ nhớ": "512GB",
          "Camera": "200MP + 50MP + 12MP + 10MP",
          "Pin": "5000mAh",
        },
      },
      {
        name: "Samsung Galaxy S24 256GB",
        description: "Galaxy S24 với Galaxy AI, chip Exynos 2400 mạnh mẽ, camera 50MP OIS, màn hình FHD+ 120Hz. Thiết kế mỏng nhẹ, pin 4000mAh bền bỉ cả ngày.",
        price: 18990000,
        oldPrice: 21990000,
        category: catPhone._id,
        quantity: 60,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 15500000,
        new: true,
        rating: 4.6,
        reviews: 98,
        published: true,
        specifications: {
          "Màn hình": "6.2 inch Dynamic AMOLED 2X",
          "Chip": "Exynos 2400",
          "RAM": "8GB",
          "Bộ nhớ": "256GB",
        },
      },
      {
        name: "Xiaomi 14 Ultra 512GB",
        description: "Xiaomi 14 Ultra với ống kính Leica Summilux, cảm biến 1 inch LYT-900, chip Snapdragon 8 Gen 3, màn hình LTPO AMOLED 120Hz. Sạc nhanh 90W có dây và 80W không dây.",
        price: 24990000,
        category: catPhone._id,
        quantity: 25,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 21000000,
        featured: true,
        rating: 4.7,
        reviews: 67,
        published: true,
        specifications: {
          "Màn hình": "6.73 inch LTPO AMOLED",
          "Chip": "Snapdragon 8 Gen 3",
          "RAM": "16GB",
          "Bộ nhớ": "512GB",
          "Camera": "50MP Leica Summilux",
        },
      },
      {
        name: "iPad Pro M4 11 inch 256GB",
        description: "iPad Pro thế hệ mới với chip M4 siêu mạnh, màn hình Liquid Retina XDR, camera TrueDepth với Face ID. Hỗ trợ Apple Pencil Pro và Magic Keyboard.",
        price: 25990000,
        oldPrice: 27990000,
        category: catPhone._id,
        quantity: 30,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 22000000,
        featured: true,
        new: true,
        rating: 4.9,
        reviews: 112,
        published: true,
        specifications: {
          "Màn hình": "11 inch Liquid Retina XDR",
          "Chip": "Apple M4",
          "Bộ nhớ": "256GB",
        },
      },

      // === LAPTOP ===
      {
        name: "MacBook Pro 14 inch M3 Pro 512GB",
        description: "MacBook Pro 14 inch với chip M3 Pro 11 nhân CPU và 14 nhân GPU, màn hình Liquid Retina XDR, pin lên đến 17 giờ. Hỗ trợ 3 màn hình ngoài, MagSafe 3 sạc nhanh.",
        price: 49990000,
        oldPrice: 54990000,
        category: catLaptop._id,
        quantity: 20,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&q=80",
        ],
        unit: "chiếc",
        costPrice: 44000000,
        featured: true,
        rating: 4.9,
        reviews: 87,
        published: true,
        specifications: {
          "Màn hình": "14.2 inch Liquid Retina XDR",
          "Chip": "Apple M3 Pro",
          "RAM": "18GB",
          "SSD": "512GB",
          "Pin": "17 giờ",
          "Bảo hành": "24 tháng",
        },
      },
      {
        name: "MacBook Air 15 inch M3 256GB",
        description: "MacBook Air 15 inch siêu mỏng với chip M3, màn hình Liquid Retina, pin 18 giờ sử dụng. Thiết kế fanless hoạt động êm ái, camera 1080p FaceTime HD.",
        price: 32990000,
        category: catLaptop._id,
        quantity: 40,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 28000000,
        new: true,
        hot: true,
        rating: 4.8,
        reviews: 145,
        published: true,
        specifications: {
          "Màn hình": "15.3 inch Liquid Retina",
          "Chip": "Apple M3",
          "RAM": "8GB",
          "SSD": "256GB",
          "Pin": "18 giờ",
        },
      },
      {
        name: "ASUS ROG Strix G16 RTX 4070",
        description: "Laptop gaming ASUS ROG với Intel Core i9-14900HX, RTX 4070 8GB, màn hình 16 inch 240Hz, bàn phím RGB. Tản nhiệt Intelligent Cooling, công suất 140W TGP.",
        price: 45990000,
        oldPrice: 49990000,
        category: catLaptop._id,
        quantity: 15,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 40000000,
        featured: true,
        hot: true,
        rating: 4.7,
        reviews: 78,
        published: true,
        specifications: {
          "CPU": "Intel Core i9-14900HX",
          "GPU": "NVIDIA RTX 4070 8GB",
          "RAM": "32GB DDR5",
          "SSD": "1TB NVMe",
          "Màn hình": "16 inch 240Hz",
        },
      },
      {
        name: "Dell XPS 15 OLED Core i7",
        description: "Dell XPS 15 với màn hình 3.5K OLED InfinityEdge, Intel Core i7-13700H, NVIDIA RTX 4060. Thiết kế nhôm CNC cao cấp, bàn phím backlit, vân tay tích hợp.",
        price: 42990000,
        category: catLaptop._id,
        quantity: 18,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 37000000,
        recommended: true,
        rating: 4.6,
        reviews: 56,
        published: true,
        specifications: {
          "Màn hình": "15.6 inch 3.5K OLED",
          "CPU": "Intel Core i7-13700H",
          "GPU": "NVIDIA RTX 4060",
          "RAM": "16GB",
          "SSD": "512GB",
        },
      },
      {
        name: "Lenovo ThinkPad X1 Carbon Gen 11",
        description: "ThinkPad X1 Carbon Gen 11 với Intel Core i7-1365U, màn hình 14 inch 2.8K OLED, pin 15 giờ. Chuẩn quân đội MIL-STD-810H, bảo mật vân tay và IR camera.",
        price: 38990000,
        category: catLaptop._id,
        quantity: 22,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 34000000,
        recommended: true,
        rating: 4.8,
        reviews: 89,
        published: true,
        specifications: {
          "CPU": "Intel Core i7-1365U",
          "RAM": "16GB",
          "SSD": "512GB",
          "Màn hình": "14 inch 2.8K OLED",
          "Trọng lượng": "1.12kg",
        },
      },

      // === PHỤ KIỆN ===
      {
        name: "AirPods Pro 2 USB-C",
        description: "AirPods Pro thế hệ 2 với cổng USB-C, chip H2 mới, chống ồn chủ động gấp 2 lần, âm thanh thích ứng. Hộp sạc MagSafe hỗ trợ tìm kiếm chính xác, kháng nước IPX4.",
        price: 5990000,
        oldPrice: 6790000,
        category: catAccessory._id,
        quantity: 100,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&q=80",
        images: [],
        unit: "bộ",
        costPrice: 4800000,
        featured: true,
        hot: true,
        rating: 4.9,
        reviews: 567,
        published: true,
        specifications: {
          "Chip": "Apple H2",
          "Chống ồn": "Active Noise Cancellation",
          "Kháng nước": "IPX4",
          "Pin": "6 giờ (30 giờ với hộp)",
        },
      },
      {
        name: "Samsung Galaxy Buds3 Pro",
        description: "Galaxy Buds3 Pro với thiết kế blade mới, ANC thông minh, 360 Audio. Driver 2-way, codec SSC Hi-Fi, pin 7 giờ nghe nhạc với ANC bật.",
        price: 4490000,
        category: catAccessory._id,
        quantity: 80,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80",
        images: [],
        unit: "bộ",
        costPrice: 3600000,
        new: true,
        rating: 4.6,
        reviews: 234,
        published: true,
        specifications: {
          "Chống ồn": "Adaptive ANC",
          "Kháng nước": "IP57",
          "Pin": "7 giờ",
        },
      },
      {
        name: "Logitech MX Master 3S",
        description: "Chuột cao cấp MX Master 3S với cảm biến 8K DPI, cuộn MagSpeed, sạc USB-C. Kết nối đa thiết bị Bolt + Bluetooth, pin 70 ngày, hoạt động trên mọi bề mặt kể cả kính.",
        price: 2490000,
        category: catAccessory._id,
        quantity: 60,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 1900000,
        recommended: true,
        rating: 4.8,
        reviews: 312,
        published: true,
        specifications: {
          "DPI": "8000 DPI",
          "Kết nối": "Bluetooth + USB receiver",
          "Pin": "70 ngày",
        },
      },
      {
        name: "Bộ sạc nhanh Apple 35W USB-C",
        description: "Bộ sạc nhanh 35W với 2 cổng USB-C, sạc đồng thời 2 thiết bị. Tương thích iPhone, iPad, Apple Watch, AirPods. Thiết kế nhỏ gọn, công nghệ sạc thông minh.",
        price: 1290000,
        category: catAccessory._id,
        quantity: 150,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 900000,
        rating: 4.7,
        reviews: 189,
        published: true,
        specifications: {
          "Công suất": "35W",
          "Cổng": "2x USB-C",
        },
      },
      {
        name: "Cáp USB-C to Lightning 2m",
        description: "Cáp sạc nhanh USB-C to Lightning chính hãng Apple, dài 2m. Hỗ trợ sạc nhanh PD, truyền dữ liệu tốc độ cao, chứng nhận MFi.",
        price: 590000,
        category: catAccessory._id,
        quantity: 200,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
        images: [],
        unit: "sợi",
        costPrice: 400000,
        rating: 4.5,
        reviews: 445,
        published: true,
        specifications: {
          "Chiều dài": "2m",
          "Chuẩn": "MFi",
        },
      },
      {
        name: "Ốp lưng MagSafe Leather iPhone 15 Pro",
        description: "Ốp lưng da cao cấp với nam châm MagSafe, bảo vệ camera, lớp lót microfiber. Chất liệu da thuộc châu Âu cao cấp, phát triển patina theo thời gian.",
        price: 1490000,
        category: catAccessory._id,
        quantity: 120,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 1000000,
        new: true,
        rating: 4.6,
        reviews: 178,
        published: true,
        specifications: {
          "Chất liệu": "Da thật",
          "Tương thích": "iPhone 15 Pro",
          "MagSafe": "Có",
        },
      },

      // === ĐỒNG HỒ THÔNG MINH ===
      {
        name: "Apple Watch Series 9 45mm GPS",
        description: "Apple Watch Series 9 với chip S9 SiP, Double Tap gesture, màn hình Always-On Retina 2000 nits. Đo SpO2, ECG, phát hiện va chạm, SOS khẩn cấp.",
        price: 11990000,
        oldPrice: 12990000,
        category: catWatch._id,
        quantity: 45,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 9800000,
        featured: true,
        new: true,
        rating: 4.8,
        reviews: 234,
        published: true,
        specifications: {
          "Chip": "S9 SiP",
          "Màn hình": "45mm Always-On Retina",
          "Kháng nước": "WR50",
          "Pin": "18 giờ",
        },
      },
      {
        name: "Apple Watch Ultra 2",
        description: "Apple Watch Ultra 2 cho vận động viên mạo hiểm với vỏ titan 49mm, màn hình 3000 nits, GPS dual-frequency. Pin 36 giờ, chống nước 100m, đo độ sâu lặn.",
        price: 21990000,
        category: catWatch._id,
        quantity: 20,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 18500000,
        featured: true,
        hot: true,
        rating: 4.9,
        reviews: 145,
        published: true,
        specifications: {
          "Vỏ": "Titan 49mm",
          "Màn hình": "3000 nits",
          "Kháng nước": "100m",
          "Pin": "36 giờ",
        },
      },
      {
        name: "Samsung Galaxy Watch 6 Classic 47mm",
        description: "Galaxy Watch 6 Classic với vòng bezel xoay vật lý, màn hình Super AMOLED 1.5 inch, chip Exynos W930. Theo dõi giấc ngủ, SpO2, ECG, body composition.",
        price: 8990000,
        oldPrice: 9990000,
        category: catWatch._id,
        quantity: 35,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 7200000,
        rating: 4.6,
        reviews: 189,
        published: true,
        specifications: {
          "Màn hình": "1.5 inch Super AMOLED",
          "Chip": "Exynos W930",
          "Kháng nước": "5ATM + IP68",
        },
      },

      // === THIẾT BỊ ÂM THANH ===
      {
        name: "Sony WH-1000XM5",
        description: "Tai nghe over-ear chống ồn số 1 thế giới với 8 microphones, driver 30mm, chip V1 + QN1e. Âm thanh Hi-Res LDAC, pin 30 giờ, sạc nhanh 3 phút cho 3 giờ nghe.",
        price: 7990000,
        oldPrice: 8490000,
        category: catAudio._id,
        quantity: 40,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 6500000,
        featured: true,
        rating: 4.9,
        reviews: 456,
        published: true,
        specifications: {
          "Driver": "30mm",
          "Chống ồn": "Industry leading ANC",
          "Pin": "30 giờ",
          "Codec": "LDAC, AAC, SBC",
        },
      },
      {
        name: "JBL Charge 5 Bluetooth Speaker",
        description: "Loa bluetooth di động JBL Charge 5 với công suất 40W, PartyBoost kết nối nhiều loa, pin 20 giờ. Chuẩn IP67 chống nước chống bụi, powerbank sạc điện thoại.",
        price: 3290000,
        category: catAudio._id,
        quantity: 55,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 2600000,
        hot: true,
        rating: 4.7,
        reviews: 345,
        published: true,
        specifications: {
          "Công suất": "40W",
          "Pin": "20 giờ",
          "Kháng nước": "IP67",
        },
      },
      {
        name: "Marshall Stanmore III Bluetooth",
        description: "Loa bluetooth Marshall Stanmore III với thiết kế cổ điển, âm thanh phòng thu. Driver 15W woofer + 15W tweeter x2, Bluetooth 5.2, app điều khiển EQ.",
        price: 8990000,
        category: catAudio._id,
        quantity: 25,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 7200000,
        recommended: true,
        rating: 4.8,
        reviews: 167,
        published: true,
        specifications: {
          "Công suất": "80W",
          "Kết nối": "Bluetooth 5.2, 3.5mm, RCA",
        },
      },

      // === CAMERA ===
      {
        name: "GoPro HERO12 Black",
        description: "Action camera GoPro HERO12 Black với video 5.3K60, HDR 4K, HyperSmooth 6.0. Chip GP2, pin kéo dài gấp đôi, chống nước 10m, Timewarp 3.0.",
        price: 10990000,
        category: catCamera._id,
        quantity: 30,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 8800000,
        featured: true,
        new: true,
        rating: 4.7,
        reviews: 234,
        published: true,
        specifications: {
          "Video": "5.3K60, 4K120",
          "Ổn định": "HyperSmooth 6.0",
          "Kháng nước": "10m",
        },
      },
      {
        name: "DJI Osmo Pocket 3",
        description: "Camera gimbal DJI Osmo Pocket 3 với cảm biến 1 inch, video 4K120, màn hình xoay AMOLED 2 inch. Face tracking, ActiveTrack 6.0, timelapse chuyên nghiệp.",
        price: 13990000,
        category: catCamera._id,
        quantity: 20,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 11500000,
        recommended: true,
        rating: 4.8,
        reviews: 145,
        published: true,
        specifications: {
          "Cảm biến": "1 inch CMOS",
          "Video": "4K/120fps",
          "Màn hình": "2 inch AMOLED xoay",
        },
      },
      {
        name: "Camera an ninh Xiaomi 360° 2K",
        description: "Camera an ninh trong nhà Xiaomi 360° với độ phân giải 2K, hồng ngoại ban đêm 10m, phát hiện chuyển động AI. Đàm thoại 2 chiều, lưu cloud + thẻ SD.",
        price: 790000,
        category: catCamera._id,
        quantity: 100,
        status: "in-stock",
        image: "https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?w=800&q=80",
        images: [],
        unit: "chiếc",
        costPrice: 550000,
        hot: true,
        rating: 4.5,
        reviews: 567,
        published: true,
        specifications: {
          "Độ phân giải": "2K",
          "Góc nhìn": "360°",
          "Hồng ngoại": "10m",
        },
      },
    ]);

    console.log("✅ Đã tạo " + products.length + " sản phẩm");

    // ========================
    // ORDERS
    // ========================
    const orders = await Order.create([
      {
        user: users[0]._id,
        orderItems: [
          {
            product: products[0]._id,
            name: products[0].name,
            quantity: 1,
            price: products[0].price,
            image: products[0].image,
          },
          {
            product: products[11]._id,
            name: products[11].name,
            quantity: 1,
            price: products[11].price,
            image: products[11].image,
          },
        ],
        paymentMethod: "Banking",
        shippingAddress: {
          name: "Nguyễn Văn An",
          phone: "0901234567",
          address: "456 Lê Lợi, Quận 1, TP.HCM",
          city: "TP.HCM",
        },
        totalPrice: products[0].price + products[11].price,
        isPaid: true,
        paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        status: "completed",
        deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        user: users[1]._id,
        orderItems: [
          {
            product: products[6]._id,
            name: products[6].name,
            quantity: 1,
            price: products[6].price,
            image: products[6].image,
          },
        ],
        paymentMethod: "Banking",
        shippingAddress: {
          name: "Trần Thị Bích",
          phone: "0907654321",
          address: "789 Hai Bà Trưng, Quận 3, TP.HCM",
          city: "TP.HCM",
        },
        totalPrice: products[6].price,
        isPaid: true,
        paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: "completed",
        deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        user: users[2]._id,
        orderItems: [
          {
            product: products[2]._id,
            name: products[2].name,
            quantity: 1,
            price: products[2].price,
            image: products[2].image,
          },
          {
            product: products[12]._id,
            name: products[12].name,
            quantity: 1,
            price: products[12].price,
            image: products[12].image,
          },
          {
            product: products[17]._id,
            name: products[17].name,
            quantity: 1,
            price: products[17].price,
            image: products[17].image,
          },
        ],
        paymentMethod: "COD",
        shippingAddress: {
          name: "Lê Minh Tuấn",
          phone: "0912345678",
          address: "321 Võ Văn Tần, Quận 3, TP.HCM",
          city: "TP.HCM",
        },
        totalPrice: products[2].price + products[12].price + products[17].price,
        isPaid: false,
        status: "processing",
      },
      {
        user: users[3]._id,
        orderItems: [
          {
            product: products[8]._id,
            name: products[8].name,
            quantity: 1,
            price: products[8].price,
            image: products[8].image,
          },
        ],
        paymentMethod: "Banking",
        shippingAddress: {
          name: "Phạm Hoàng Nam",
          phone: "0923456789",
          address: "654 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM",
          city: "TP.HCM",
        },
        totalPrice: products[8].price,
        isPaid: true,
        paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: "processing",
      },
      {
        user: users[4]._id,
        orderItems: [
          {
            product: products[1]._id,
            name: products[1].name,
            quantity: 1,
            price: products[1].price,
            image: products[1].image,
          },
          {
            product: products[15]._id,
            name: products[15].name,
            quantity: 2,
            price: products[15].price,
            image: products[15].image,
          },
        ],
        paymentMethod: "COD",
        shippingAddress: {
          name: "Hoàng Thị Mai",
          phone: "0934567890",
          address: "987 Cách Mạng Tháng 8, Quận Tân Bình, TP.HCM",
          city: "TP.HCM",
        },
        totalPrice: products[1].price + products[15].price * 2,
        isPaid: false,
        status: "pending",
      },
      {
        user: users[0]._id,
        orderItems: [
          {
            product: products[20]._id,
            name: products[20].name,
            quantity: 1,
            price: products[20].price,
            image: products[20].image,
          },
        ],
        paymentMethod: "Banking",
        shippingAddress: {
          name: "Nguyễn Văn An",
          phone: "0901234567",
          address: "456 Lê Lợi, Quận 1, TP.HCM",
          city: "TP.HCM",
        },
        totalPrice: products[20].price,
        isPaid: true,
        paidAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        status: "completed",
        deliveredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        user: users[1]._id,
        orderItems: [
          {
            product: products[22]._id,
            name: products[22].name,
            quantity: 1,
            price: products[22].price,
            image: products[22].image,
          },
          {
            product: products[23]._id,
            name: products[23].name,
            quantity: 1,
            price: products[23].price,
            image: products[23].image,
          },
        ],
        paymentMethod: "COD",
        shippingAddress: {
          name: "Trần Thị Bích",
          phone: "0907654321",
          address: "789 Hai Bà Trưng, Quận 3, TP.HCM",
          city: "TP.HCM",
        },
        totalPrice: products[22].price + products[23].price,
        isPaid: false,
        status: "cancelled",
      },
      {
        user: users[2]._id,
        orderItems: [
          {
            product: products[4]._id,
            name: products[4].name,
            quantity: 1,
            price: products[4].price,
            image: products[4].image,
          },
        ],
        paymentMethod: "Banking",
        shippingAddress: {
          name: "Lê Minh Tuấn",
          phone: "0912345678",
          address: "321 Võ Văn Tần, Quận 3, TP.HCM",
          city: "TP.HCM",
        },
        totalPrice: products[4].price,
        isPaid: true,
        paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: "pending",
      },
    ]);

    console.log("✅ Đã tạo " + orders.length + " đơn hàng");

    // ========================
    // STOCK VOUCHERS (create sequentially to avoid duplicate voucherNumber)
    // ========================
    const stockVouchersData = [
      {
        type: "import",
        status: "approved",
        reason: "Nhập hàng đầu kỳ - Điện thoại",
        items: [
          {
            product: products[0]._id,
            productName: products[0].name,
            quantity: 50,
            unit: "chiếc",
            costPrice: 26000000,
          },
          {
            product: products[1]._id,
            productName: products[1].name,
            quantity: 80,
            unit: "chiếc",
            costPrice: 17000000,
          },
          {
            product: products[2]._id,
            productName: products[2].name,
            quantity: 35,
            unit: "chiếc",
            costPrice: 29000000,
          },
        ],
        totalValue: 50 * 26000000 + 80 * 17000000 + 35 * 29000000,
        createdBy: adminUser._id,
        approvedBy: adminUser._id,
        approvedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        notes: "Nhập hàng tháng 12/2025",
      },
      {
        type: "import",
        status: "approved",
        reason: "Nhập hàng - Laptop",
        items: [
          {
            product: products[6]._id,
            productName: products[6].name,
            quantity: 20,
            unit: "chiếc",
            costPrice: 44000000,
          },
          {
            product: products[7]._id,
            productName: products[7].name,
            quantity: 40,
            unit: "chiếc",
            costPrice: 28000000,
          },
          {
            product: products[8]._id,
            productName: products[8].name,
            quantity: 15,
            unit: "chiếc",
            costPrice: 40000000,
          },
        ],
        totalValue: 20 * 44000000 + 40 * 28000000 + 15 * 40000000,
        createdBy: adminUser._id,
        approvedBy: adminUser._id,
        approvedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        notes: "Nhập laptop các loại",
      },
      {
        type: "import",
        status: "approved",
        reason: "Nhập hàng - Phụ kiện",
        items: [
          {
            product: products[11]._id,
            productName: products[11].name,
            quantity: 100,
            unit: "bộ",
            costPrice: 4800000,
          },
          {
            product: products[13]._id,
            productName: products[13].name,
            quantity: 60,
            unit: "chiếc",
            costPrice: 1900000,
          },
        ],
        totalValue: 100 * 4800000 + 60 * 1900000,
        createdBy: adminUser._id,
        approvedBy: adminUser._id,
        approvedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        type: "export",
        status: "approved",
        reason: "Xuất bán đơn hàng",
        items: [
          {
            product: products[0]._id,
            productName: products[0].name,
            quantity: 2,
            unit: "chiếc",
            costPrice: 26000000,
          },
          {
            product: products[6]._id,
            productName: products[6].name,
            quantity: 1,
            unit: "chiếc",
            costPrice: 44000000,
          },
        ],
        totalValue: 2 * 26000000 + 1 * 44000000,
        createdBy: adminUser._id,
        approvedBy: adminUser._id,
        approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        relatedOrder: orders[0]._id,
      },
      {
        type: "import",
        status: "pending",
        reason: "Nhập bổ sung - Đồng hồ",
        items: [
          {
            product: products[17]._id,
            productName: products[17].name,
            quantity: 30,
            unit: "chiếc",
            costPrice: 9800000,
          },
          {
            product: products[18]._id,
            productName: products[18].name,
            quantity: 15,
            unit: "chiếc",
            costPrice: 18500000,
          },
        ],
        totalValue: 30 * 9800000 + 15 * 18500000,
        createdBy: adminUser._id,
        notes: "Chờ duyệt nhập hàng smartwatch",
      },
    ];

    // Create stock vouchers one by one to avoid duplicate voucherNumber
    const stockVouchers = [];
    for (const voucherData of stockVouchersData) {
      const voucher = new Stock(voucherData);
      await voucher.save();
      stockVouchers.push(voucher);
    }

    console.log("✅ Đã tạo " + stockVouchers.length + " phiếu kho");

    // ========================
    // SUMMARY
    // ========================
    console.log("\n📊 Tóm tắt Seeding:");
    console.log("==================");
    console.log(`Roles: 2 (admin, user)`);
    console.log(`Users: ${users.length + 1}`);
    console.log(`  - Admin: admin@tmdt.com / admin123`);
    console.log(`  - Users: nguyenvanan@gmail.com, tranbich@gmail.com,... / user123`);
    console.log(`Categories: ${await Category.countDocuments()} (6 parent + 12 sub)`);
    console.log(`Products: ${products.length}`);
    console.log(`Orders: ${orders.length}`);
    console.log(`Stock Vouchers: ${stockVouchers.length}`);
    console.log("\n✅ Seeding database hoàn tất!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
