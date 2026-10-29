import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { sessionMiddleware } from "./middleware/auth";
import { csrfProtection, ensureCsrfCookie } from "./middleware/csrf";
import { globalRateLimiter } from "./middleware/rateLimiter";
import apiRoutes from "./routes";

export const app = express();

// 1. Trust proxy when running behind reverse proxies (Nginx, Render, AWS ALB)
app.set("trust proxy", 1);

// 2. Helmet Security Headers (HSTS, CSP, X-Frame-Options, NoSniff)
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// 3. Strict CORS Policy
app.use(
  cors({
    origin: [env.CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-VaultBank-CSRF"],
    exposedHeaders: ["Content-Disposition"],
  })
);

// 4. Body parsers with defensive size constraints
app.use(express.json({ limit: "15kb" }));
app.use(express.urlencoded({ extended: true, limit: "15kb" }));

// 5. Cookie Parser & Session Middleware
app.use(cookieParser());
app.use(ensureCsrfCookie);
app.use(sessionMiddleware);

// 6. Anti-CSRF protection for mutating operations
app.use(csrfProtection);

// 7. Global Tiered Rate Limiter
app.use(globalRateLimiter);

// 8. API Routes
app.use("/api/v1", apiRoutes);

// 9. 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// 10. Centralized Error Handler
app.use(errorHandler);

