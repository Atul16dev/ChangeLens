import express from "express";
import mongoose from "mongoose";
import userRoutes from "./routes/user-routes.js";

const app = express();
app.use(express.json());
app.use("/api/users", userRoutes);

await mongoose.connect("mongodb://localhost:27017/mern-sample");
app.listen(3000);
