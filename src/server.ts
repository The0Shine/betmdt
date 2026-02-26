import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import mongoose from "mongoose";
import routes from "./routes";
import env from "./config/env";
import { StatusCodes } from "http-status-codes";
import HttpError from "./utils/httpError";
import { errorLogMiddleware } from "./middlewares/errorLogMiddleware";

import { initElasticsearch } from "./config/elasticsearch";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/api", routes);

// Test route
app.get("/", (req: Request, res: Response) => {
  res.send("Hello from TypeScript + Express server!");
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof HttpError) {
    errorLogMiddleware(err, req, res);
    return err.sendError(res);
  }

  console.error("Unexpected error:", err);
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    error: {
      title: "general_error",
      detail: "An error occurred. Please try again later.",
      code: StatusCodes.INTERNAL_SERVER_ERROR,
    },
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("✅ MongoDB connected");

    // Initialize Elasticsearch (non-blocking, app works without it)
    initElasticsearch().catch(() => {});

    app.listen(env.PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

startServer();
