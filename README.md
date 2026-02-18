# 🛒 TechZone - E-Commerce Backend

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

**RESTful API Backend for TechZone Electronics Store**

</div>

---

## ✨ Features

- 🔐 **Authentication & Authorization** - JWT-based auth with refresh token & RBAC permissions
- 🛍️ **Product Management** - Full CRUD with categories, filtering, pagination
- 🛒 **Shopping Cart** - Add, update, remove items
- 📦 **Order Management** - Complete order lifecycle with refund workflow
- 💳 **Payment Integration** - VNPay payment gateway
- 📊 **Dashboard & Analytics** - Revenue charts, inventory stats
- 📁 **File Upload** - Cloudinary integration for images
- 🏷️ **Inventory Management** - Stock vouchers with approval workflow

---

## 🏗️ Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| File Storage | Cloudinary |
| Payment | VNPay |
| Logging | Winston |

---

## 📁 Project Structure

```
src/
├── config/          # Database & Cloudinary configuration
├── controllers/     # Request handlers
├── interfaces/      # TypeScript interfaces
├── middlewares/     # Auth, permission, error handlers
├── models/          # Mongoose schemas
├── routes/          # API route definitions
├── services/        # Business logic
├── utils/           # Helper functions
└── server.ts        # Application entry point
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.x
- MongoDB (local or Atlas)
- Yarn package manager

### Installation

```bash
# Clone repository
git clone <repo-url>
cd betmdt

# Install dependencies
yarn install

# Setup environment
cp .env.dev .env

# Start development server
yarn dev
```

### Environment Variables

Create `.env` file with the following variables:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/techzone

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# VNPay
VNPAY_TMN_CODE=your-tmn-code
VNPAY_HASH_SECRET=your-hash-secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/login` | Login | ❌ |
| GET | `/api/auth/me` | Get current user | ✅ |
| PUT | `/api/auth/updatedetails` | Update profile | ✅ |
| POST | `/api/auth/change-password` | Change password | ✅ |

### Products
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/products` | List products (public) | ❌ |
| GET | `/api/products/:id` | Get product detail | ❌ |
| GET | `/api/products/admin` | List all products (admin) | ✅ |
| POST | `/api/products` | Create product | ✅ |
| PUT | `/api/products/:id` | Update product | ✅ |
| DELETE | `/api/products/:id` | Delete product | ✅ |

### Categories
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/categories` | List categories | ❌ |
| GET | `/api/categories/:id` | Get category | ❌ |
| POST | `/api/categories` | Create category | ✅ |
| PUT | `/api/categories/:id` | Update category | ✅ |
| DELETE | `/api/categories/:id` | Delete category | ✅ |

### Cart
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/cart` | Get user cart | ✅ |
| POST | `/api/cart` | Add item to cart | ✅ |
| PUT | `/api/cart/:itemId` | Update item quantity | ✅ |
| DELETE | `/api/cart/:itemId` | Remove item | ✅ |
| DELETE | `/api/cart` | Clear cart | ✅ |

### Orders
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/orders` | List all orders | ✅ Admin |
| GET | `/api/orders/myorders` | Get my orders | ✅ |
| GET | `/api/orders/:id` | Get order detail | ✅ |
| POST | `/api/orders` | Create order | ✅ |
| PUT | `/api/orders/:id/status` | Update status | ✅ Admin |
| PUT | `/api/orders/:id/pay` | Mark as paid | ✅ Admin |
| PUT | `/api/orders/:id/deliver` | Mark as delivered | ✅ Admin |
| POST | `/api/orders/:id/request-refund` | Request refund | ✅ |
| PUT | `/api/orders/:id/approve-refund` | Approve refund | ✅ Admin |
| PUT | `/api/orders/:id/reject-refund` | Reject refund | ✅ Admin |

### Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users` | List all users | ✅ Admin |
| GET | `/api/users/:id` | Get user | ✅ Admin |
| POST | `/api/users` | Create user | ✅ Admin |
| PUT | `/api/users/:id` | Update user | ✅ |
| DELETE | `/api/users/:id` | Delete user | ✅ Admin |
| POST | `/api/users/refresh` | Refresh token | ❌ |
| GET | `/api/users/wishlist` | Get wishlist | ✅ |
| POST | `/api/users/wishlist/:productId` | Add to wishlist | ✅ |
| DELETE | `/api/users/wishlist/:productId` | Remove from wishlist | ✅ |

### Stock Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/stock` | List stock vouchers | ✅ |
| GET | `/api/stock/history` | Stock history | ✅ |
| GET | `/api/stock/:id` | Get voucher detail | ✅ |
| POST | `/api/stock` | Create voucher | ✅ |
| PUT | `/api/stock/:id` | Update voucher | ✅ |
| DELETE | `/api/stock/:id` | Delete voucher | ✅ |
| PATCH | `/api/stock/:id/approve` | Approve voucher | ✅ |
| PATCH | `/api/stock/:id/reject` | Reject voucher | ✅ |
| PATCH | `/api/stock/:id/cancel` | Cancel voucher | ✅ |

### Payment
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/payment/create` | Create payment | ✅ |
| GET | `/api/payment/vnpay-ipn` | VNPay IPN callback | ❌ |
| GET | `/api/payment/vnpay-return` | VNPay return URL | ❌ |
| GET | `/api/payment/status/:orderId` | Get payment status | ✅ |

### Dashboard
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/dashboard/overview` | Overall stats | ✅ Admin |
| GET | `/api/dashboard/revenue-chart` | Revenue data | ✅ Admin |
| GET | `/api/dashboard/product-stats` | Product statistics | ✅ Admin |
| GET | `/api/dashboard/inventory-stats` | Inventory stats | ✅ Admin |

### Upload
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/upload` | Upload single image | ❌ |
| POST | `/api/upload/multiple` | Upload multiple images | ❌ |
| POST | `/api/upload/base64` | Upload base64 image | ❌ |
| DELETE | `/api/upload` | Delete image | ❌ |
| GET | `/api/upload/:public_id` | Get image info | ❌ |
| GET | `/api/upload` | List images | ❌ |

---

## 🔐 Permission System

The API uses Role-Based Access Control (RBAC). Available permissions:

| Module | Permissions |
|--------|-------------|
| Products | `products.create`, `products.edit`, `products.delete` |
| Categories | `categories.create`, `categories.edit`, `categories.delete` |
| Orders | `orders.view_all`, `orders.update_status`, `orders.update_payment`, `orders.update_delivery` |
| Users | `users.view`, `users.create`, `users.edit`, `users.delete` |
| Roles | `roles.view`, `roles.create`, `roles.edit`, `roles.delete` |
| Stock | `stock.view`, `stock.create`, `stock.edit`, `stock.delete`, `stock.approve`, `stock.reject`, `stock.cancel` |
| Transactions | `transactions.view`, `transactions.stats` |
| Admin | `admin.all` |

---

## 📝 Scripts

```bash
yarn dev      # Start development server with hot reload
yarn build    # Compile TypeScript to JavaScript
yarn start    # Run production build
yarn seed     # Seed database with sample data
yarn test     # Run tests
```

---

## 👨‍💻 Author

**TechZone Team**

---

## 📄 License

This project is licensed under the MIT License.
