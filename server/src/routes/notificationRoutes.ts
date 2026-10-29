import { Router } from "express";
import { NotificationController } from "../controllers/notificationController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(NotificationController.getNotifications));
router.patch("/:notificationId/read", asyncHandler(NotificationController.markAsRead));

export default router;
