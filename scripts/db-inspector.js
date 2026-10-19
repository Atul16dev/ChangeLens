import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(envPath);
  } catch {}
}

const mongoUri = process.env.MONGODB_URI;

async function inspectMongoDB() {
  console.log("=================================================");
  console.log("       CHANGELENS DATABASE INSPECTOR             ");
  console.log("🗄️ Database: 🍃 MongoDB Atlas (Cloud Mode)");
  console.log("=================================================\n");

  if (!mongoUri) {
    console.log("⚠️ MONGODB_URI is not defined in .env file.");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log(`✅ Connected to MongoDB Atlas cluster: "${conn.connection.name}"\n`);

    const usersCol = conn.connection.collection("users");
    const users = await usersCol.find().sort({ createdAt: -1 }).toArray();

    console.log("👥 REGISTERED USERS:");
    if (users.length === 0) {
      console.log("   (No users registered in MongoDB yet)\n");
    } else {
      console.table(
        users.map((u) => ({
          ID: String(u._id).slice(0, 16) + "...",
          Name: u.name,
          Email: u.email,
          Provider: u.authProvider || "local",
          Verified: u.isEmailVerified ? "✅ Yes" : "❌ No",
          "Created At": u.createdAt ? new Date(u.createdAt).toISOString() : "N/A",
        }))
      );
    }

    const sessionsCol = conn.connection.collection("sessions");
    const sessions = await sessionsCol.find().toArray();

    console.log("\n🔑 ACTIVE SESSIONS:");
    if (sessions.length === 0) {
      console.log("   (No active sessions)\n");
    } else {
      console.table(
        sessions.map((s) => ({
          "Session ID": String(s._id).slice(0, 16) + "...",
          Expires: s.expires ? new Date(s.expires).toISOString() : "N/A",
        }))
      );
    }

    const otpCol = conn.connection.collection("otpchallenges");
    const otps = await otpCol.find().sort({ createdAt: -1 }).limit(5).toArray();

    console.log("\n✉️ RECENT OTP CHALLENGES:");
    if (otps.length === 0) {
      console.log("   (No OTP challenges recorded yet)\n");
    } else {
      console.table(
        otps.map((o) => ({
          Email: o.email,
          Purpose: o.purpose,
          Attempts: o.attemptsCount,
          Consumed: o.isConsumed ? "✅ Used" : "⏳ Active",
          Date: o.createdAt ? new Date(o.createdAt).toISOString() : "N/A",
        }))
      );
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error("❌ MongoDB Inspection Error:", err.message);
  }
}

inspectMongoDB();
