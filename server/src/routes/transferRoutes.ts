import { Router } from "express";
import { TransferController } from "../controllers/transferController";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validateRequest";
import { transferRateLimiter } from "../middleware/rateLimiter";
import { asyncHandler } from "../middleware/asyncHandler";
import { transferSchema } from "@vaultbank/shared";

const router = Router();

router.use(requireAuth);

router.post(
  "/",
  transferRateLimiter,
  validateBody(transferSchema),
  asyncHandler(TransferController.createTransfer)
);
router.get("/", asyncHandler(TransferController.getUserTransfers));
router.get("/:transferId", asyncHandler(TransferController.getTransferById));

export default router;
