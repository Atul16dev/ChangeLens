import mongoose from "mongoose";

let isConnected = false;

export function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function connectMongoDB(uri = process.env.MONGODB_URI) {
  if (!uri) {
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    isConnected = true;
    console.log(`🍃 [MongoDB] Successfully connected to MongoDB Atlas (${conn.connection.name})`);

    mongoose.connection.on("error", (err) => {
      console.error("🍃 [MongoDB Error]:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("🍃 [MongoDB] Disconnected from MongoDB Atlas.");
      isConnected = false;
    });

    return conn;
  } catch (err) {
    console.error("🍃 [MongoDB] Connection failed:", err.message);
    isConnected = false;
    return null;
  }
}

export async function closeMongoDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    isConnected = false;
  }
}
