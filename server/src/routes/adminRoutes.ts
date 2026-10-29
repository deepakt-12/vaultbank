import { Router } from "express";
import { AdminController } from "../controllers/adminController";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validateRequest";
import { asyncHandler } from "../middleware/asyncHandler";
import { UserRole } from "@vaultbank/shared";
import {
  accountStatusUpdateSchema,
  adminAdjustmentActionSchema,
  adminAdjustmentRequestSchema,
  userStatusUpdateSchema,
} from "@vaultbank/shared";

const router = Router();

router.use(requireAuth);
router.use(requireRole(UserRole.ADMIN, UserRole.COMPLIANCE, UserRole.SUPPORT));

router.get("/users", asyncHandler(AdminController.getUsers));
router.patch(
  "/users/:userId/status",
  validateBody(userStatusUpdateSchema),
  asyncHandler(AdminController.updateUserStatus)
);
router.patch(
  "/accounts/:accountId/status",
  validateBody(accountStatusUpdateSchema),
  asyncHandler(AdminController.updateAccountStatus)
);
router.get("/transactions", asyncHandler(AdminController.getTransactions));
router.get("/audit-events", asyncHandler(AdminController.getAuditEvents));
router.get("/reconcile/:accountId", asyncHandler(AdminController.reconcileAccount));

// Maker-Checker adjustments: ADMIN & COMPLIANCE only
router.get(
  "/adjustments",
  requireRole(UserRole.ADMIN, UserRole.COMPLIANCE),
  asyncHandler(AdminController.getAdjustmentQueue)
);
router.post(
  "/adjustments",
  requireRole(UserRole.ADMIN, UserRole.COMPLIANCE),
  validateBody(adminAdjustmentRequestSchema),
  asyncHandler(AdminController.requestAdjustment)
);
router.post(
  "/adjustments/:adjustmentId/review",
  requireRole(UserRole.ADMIN, UserRole.COMPLIANCE),
  validateBody(adminAdjustmentActionSchema),
  asyncHandler(AdminController.reviewAdjustment)
);

export default router;
