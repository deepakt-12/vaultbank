import { Request, Response, Router } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import accountRoutes from "./accountRoutes";
import transferRoutes from "./transferRoutes";
import adminRoutes from "./adminRoutes";
import notificationRoutes from "./notificationRoutes";
import { CSRF_COOKIE_NAME } from "../middleware/csrf";

const router = Router();

// Health check endpoint
router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    service: "VaultBank Core Banking API",
    version: "v1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// CSRF Bootstrap Token endpoint
router.get("/csrf-token", (req: Request, res: Response) => {
  const token = req.cookies[CSRF_COOKIE_NAME];
  res.status(200).json({
    success: true,
    data: { csrfToken: token },
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/accounts", accountRoutes);
router.use("/transfers", transferRoutes);
router.use("/admin", adminRoutes);
router.use("/notifications", notificationRoutes);

export default router;

