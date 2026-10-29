import { Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import { AccountService } from "../services/accountService";
import { TransferService } from "../services/transferService";
import { BankAccount } from "../models/BankAccount";
import { User } from "../models/User";
import { maskAccountNumber } from "@vaultbank/shared";

export class AccountController {
  public static async getAccounts(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const accounts = await AccountService.getUserAccounts(req.user._id);

    // Calculate aggregated metrics
    const totalAvailableCents = accounts.reduce((sum, acc) => sum + acc.availableBalanceCents, 0);
    const totalLedgerCents = accounts.reduce((sum, acc) => sum + acc.ledgerBalanceCents, 0);

    res.status(200).json({
      success: true,
      data: {
        accounts,
        summary: {
          totalAvailableCents,
          totalLedgerCents,
          primaryCurrency: accounts[0]?.currency || "USD",
          accountCount: accounts.length,
        },
      },
    });
  }

  public static async getAccountById(req: Request, res: Response): Promise<void> {
    const { accountId } = req.params;
    const account = await AccountService.getAccountById(
      accountId,
      req.user?._id,
      ["ADMIN", "COMPLIANCE", "SUPPORT"].includes(req.user?.role || "")
    );

    res.status(200).json({
      success: true,
      data: { account },
    });
  }

  public static async createAccount(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { accountType, currency, nickname } = req.body;
    const newAccount = await AccountService.createAccount(
      req.user._id,
      accountType,
      currency,
      nickname
    );

    res.status(201).json({
      success: true,
      data: {
        account: newAccount,
        message: "New account opened successfully.",
      },
    });
  }

  public static async getAccountTransactions(req: Request, res: Response): Promise<void> {
    const { accountId } = req.params;
    // Verify ownership
    await AccountService.getAccountById(
      accountId,
      req.user?._id,
      ["ADMIN", "COMPLIANCE", "SUPPORT"].includes(req.user?.role || "")
    );

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const data = await AccountService.getAccountTransactions(accountId, page, limit);

    res.status(200).json({
      success: true,
      data,
    });
  }

  public static async exportTransactionsCsv(req: Request, res: Response): Promise<void> {
    const { accountId } = req.params;
    // Verify ownership
    const account = await AccountService.getAccountById(
      accountId,
      req.user?._id,
      ["ADMIN", "COMPLIANCE", "SUPPORT"].includes(req.user?.role || "")
    );

    const csvData = await AccountService.exportTransactionsCsv(accountId);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="transactions_${account.accountNumber}_${Date.now()}.csv"`
    );
    res.status(200).send(csvData);
  }

  public static async lookupRecipient(req: Request, res: Response): Promise<void> {
    const { accountNumber } = req.params;
    const account = await BankAccount.findOne({ accountNumber: accountNumber.trim(), status: "ACTIVE" });

    if (!account) {
      throw new AppError("Recipient account not found or is currently inactive.", 404);
    }

    const owner = await User.findById(account.userId);

    // Return masked info for verification display
    res.status(200).json({
      success: true,
      data: {
        accountNumber: account.accountNumber,
        maskedAccountNumber: maskAccountNumber(account.accountNumber),
        accountType: account.accountType,
        currency: account.currency,
        recipientName: owner?.fullName || "VaultBank Account Holder",
      },
    });
  }

  public static async simulateDeposit(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { accountId, amountCents, description } = req.body;
    const updatedAccount = await TransferService.executeSimulatedDeposit(
      req.user._id,
      accountId,
      amountCents,
      description
    );

    res.status(200).json({
      success: true,
      data: {
        account: updatedAccount,
        message: "Simulated deposit credited successfully.",
      },
    });
  }

  public static async simulateWithdrawal(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { accountId, amountCents, description } = req.body;
    const updatedAccount = await TransferService.executeSimulatedWithdrawal(
      req.user._id,
      accountId,
      amountCents,
      description
    );

    res.status(200).json({
      success: true,
      data: {
        account: updatedAccount,
        message: "Simulated withdrawal processed successfully.",
      },
    });
  }
}

