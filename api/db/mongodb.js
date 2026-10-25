import mongoose from "mongoose";

let isConnecting = false;
let reconnectTimer = null;

export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

// Setup event listeners once
mongoose.connection.on("connected", () => {
  console.log("🍃 [MongoDB] Connection established.");
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
});

mongoose.connection.on("reconnected", () => {
  console.log("🍃 [MongoDB] Connection re-established.");
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
});

mongoose.connection.on("error", (err) => {
  console.error("🍃 [MongoDB Error]:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("🍃 [MongoDB] Disconnected from MongoDB Atlas.");
});

export async function connectMongoDB(uri = process.env.MONGODB_URI, maxRetries = 5) {
  if (!uri) {
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    return null;
  }

  isConnecting = true;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 2,
      });

      console.log(`🍃 [MongoDB] Successfully connected to MongoDB Atlas (${conn.connection.name})`);
      isConnecting = false;
      return conn;
    } catch (err) {
      console.warn(`🍃 [MongoDB] Connection attempt ${attempt}/${maxRetries} failed:`, err.message);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  isConnecting = false;

  // Background retry if initial attempts failed (e.g. WiFi handshake latency on boot)
  if (!reconnectTimer && mongoose.connection.readyState !== 1) {
    console.log("🍃 [MongoDB] Background reconnect scheduled (retrying every 5s)...");
    reconnectTimer = setInterval(async () => {
      if (mongoose.connection.readyState === 1) {
        clearInterval(reconnectTimer);
        reconnectTimer = null;
        return;
      }
      try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
        console.log("🍃 [MongoDB] Reconnected to MongoDB Atlas in background.");
        clearInterval(reconnectTimer);
        reconnectTimer = null;
      } catch {
        // Silently retry in background
      }
    }, 5000);
  }

  return null;
}

export async function closeMongoDB() {
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}
