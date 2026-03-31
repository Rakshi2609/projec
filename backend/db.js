require("dotenv").config();
const mongoose = require("mongoose");

const mongoURL = process.env.MONGODB_URL;

if (!mongoURL) {
  console.error("❌ MONGODB_URL is not set in .env");
  process.exit(1);
}

mongoose.connect(mongoURL)
.then(() => {
    console.log("✅ MongoDB Connected Successfully");
})
.catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
});
