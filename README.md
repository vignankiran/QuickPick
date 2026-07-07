# 🚀 QuickPick

An AI-powered food pre-order and smart inventory management platform for restaurants and customers.

---

## 📖 Overview

QuickPick enables customers to pre-order food for pickup while helping restaurant owners manage inventory, monitor orders, analyze sales, and receive AI-driven business insights.

---

## ✨ Features

### 👤 Customer
- User Registration & Login (JWT Authentication)
- Browse Shops
- Browse Categories & Items
- Add/Update/Remove Cart
- Place Orders
- Cancel Orders
- View Order History

### 🏪 Owner
- Shop Management
- Category Management
- Item Management
- Daily Inventory Management
- Kitchen Queue
- Dashboard
- Analytics
- AI Business Insights

---

## 🤖 AI Features

- Business Insights
- Smart Inventory Suggestions
- Demand Prediction
- Kitchen Intelligence
- Daily Action Plan

---

## 📊 Analytics

- Revenue Analytics
- Best Selling Items
- Peak Hours
- Sales Trend
- Top Customers
- Waste Analysis
- Item Performance

---

## 🛠 Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT Authentication
- bcryptjs

### Database
- MongoDB

### API Testing
- Postman

---

## 📁 Backend Structure

```text
server/
├── config/
├── controllers/
├── helpers/
├── middleware/
├── models/
├── routes/
├── services/
├── utils/
├── .env.example
├── package.json
└── server.js
```

---

## 🔐 Authentication

- JWT Based Authentication
- Role Based Access
  - Customer
  - Owner
  - Admin

---

## 📦 Modules

- Authentication
- Shops
- Categories
- Items
- Inventory
- Cart
- Orders
- Dashboard
- Analytics
- AI

---

## ⚙ Environment Variables

Create `server/.env`

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
NODE_ENV=development
```

---

## 🚀 Installation

```bash
git clone https://github.com/vignankiran/QuickPick.git

cd QuickPick/server

npm install

npm run dev
```

---

## 📌 Current Status

- ✅ Backend Completed
- 🔄 Frontend In Progress

---

## 📄 License

This project is developed for learning and portfolio purposes.