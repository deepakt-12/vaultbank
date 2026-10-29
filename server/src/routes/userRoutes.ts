import { Router } from "express";
import { UserController } from "../controllers/userController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.use(requireAuth);

router.get("/me", asyncHandler(UserController.getMe));
router.patch("/me", asyncHandler(UserController.updateProfile));
router.get("/me/security", asyncHandler(UserController.getSecurityInfo));

export default router;
