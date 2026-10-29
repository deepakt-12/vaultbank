import { Router } from "express";
import { AccountController } from "../controllers/accountController";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validateRequest";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  createAccountSchema,
  simulationDepositSchema,
  simulationWithdrawalSchema,
} from "@vaultbank/shared";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(AccountController.getAccounts));
router.post("/", validateBody(createAccountSchema), asyncHandler(AccountController.createAccount));
router.get("/lookup/:accountNumber", asyncHandler(AccountController.lookupRecipient));
router.get("/:accountId", asyncHandler(AccountController.getAccountById));
router.get("/:accountId/transactions", asyncHandler(AccountController.getAccountTransactions));
router.get("/:accountId/export-csv", asyncHandler(AccountController.exportTransactionsCsv));

// Educational simulation endpoints
router.post(
  "/simulate-deposit",
  validateBody(simulationDepositSchema),
  asyncHandler(AccountController.simulateDeposit)
);
router.post(
  "/simulate-withdrawal",
  validateBody(simulationWithdrawalSchema),
  asyncHandler(AccountController.simulateWithdrawal)
);

export default router;
