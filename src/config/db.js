const mongoose = require('mongoose');

const connectDB = async () => {
  console.log('🔍 DATABASE_URL từ process.env:', process.env.DATABASE_URL); // Debug

  const DATABASE_URL = process.env.DATABASE_URL; // Kiểm tra tên biến

  if (!DATABASE_URL) {
    console.error('❌ Không tìm thấy DATABASE_URL! Vui lòng kiểm tra file .env.');
    process.exit(1);
  }

  try {
    // Set connection options
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    };

    // Connect to MongoDB
    await mongoose.connect(DATABASE_URL, options);
    console.log('✅ MongoDB connected successfully');

    // Test the connection by listing collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📚 Available collections:', collections.map((c) => c.name).join(', '));

    // Check if categories collection exists
    const hasCategories = collections.some((c) => c.name === 'categories');
    console.log(hasCategories ? '✅ Categories collection exists' : '❌ Categories collection does not exist');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
