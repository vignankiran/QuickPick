const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const shopRoutes = require("./routes/shopRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const itemRoutes = require("./routes/itemRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const aiRoutes = require("./routes/aiRoutes");


require("dotenv").config();

const connectDB = require("./config/db");
connectDB();

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow Postman, mobile apps and server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("This origin is not allowed by CORS.")
      );
    },
  })
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiRoutes);


app.get("/", (req, res) => {
  res.send("QuickPick API is running...");
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "Backend connected successfully",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});