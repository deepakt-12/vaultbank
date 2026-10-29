import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { validateBody } from "../middleware/validateRequest";
import { requireAuth } from "../middleware/auth";
import { authRateLimiter } from "../middleware/rateLimiter";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  forgotPasswordSchema,
  loginSchema,
  mfaVerifySchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "@vaultbank/shared";

const router = Router();

router.post("/register", authRateLimiter, validateBody(registerSchema), asyncHandler(AuthController.register));
router.post("/login", authRateLimiter, validateBody(loginSchema), asyncHandler(AuthController.login));
router.post("/verify-email", validateBody(verifyEmailSchema), asyncHandler(AuthController.verifyEmail));
router.post("/forgot-password", authRateLimiter, validateBody(forgotPasswordSchema), asyncHandler(AuthController.forgotPassword));
router.post("/reset-password", authRateLimiter, validateBody(resetPasswordSchema), asyncHandler(AuthController.resetPassword));

// Authenticated session and MFA endpoints
router.post("/logout", requireAuth, asyncHandler(AuthController.logout));
router.post("/logout-all", requireAuth, asyncHandler(AuthController.logoutAll));
router.get("/sessions", requireAuth, asyncHandler(AuthController.getSessions));
router.delete("/sessions/:sessionId", requireAuth, asyncHandler(AuthController.revokeSession));
router.post("/mfa/setup", requireAuth, asyncHandler(AuthController.mfaSetup));
router.post("/mfa/verify", requireAuth, validateBody(mfaVerifySchema), asyncHandler(AuthController.mfaVerify));

export default router;
