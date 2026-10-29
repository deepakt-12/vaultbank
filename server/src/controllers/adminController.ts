import { Request, Response } from "express";
import { Types } from "mongoose";
import { AppError } from "../middleware/errorHandler";
import { User } from "../models/User";
import { BankAccount } from "../models/BankAccount";
import { Transfer } from "../models/Transfer";
import { AuditEvent } from "../models/AuditEvent";
import { AdjustmentRequest } from "../models/AdjustmentRequest";
import { LedgerService } from "../services/ledgerService";
import { logAuditEvent } from "../services/auditService";
import {
  AdjustmentStatus,
  AuditAction,
  PostingDirection,
  TransactionType,
} from "@vaultbank/shared";

export class AdminController {
  public static async getUsers(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string)?.trim();

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  }

  public static async updateUserStatus(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const { status, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const prevStatus = user.status;
    user.status = status;
    if (status === "ACTIVE") {
      user.lockoutUntil = null;
      user.failedLoginAttempts = 0;
    }
    await user.save();

    await logAuditEvent({
      userId: req.user?._id,
      action: AuditAction.ADMIN_USER_STATUS_CHANGE,
      details: { targetUserId: user._id, prevStatus, newStatus: status, reason },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json({
      success: true,
      data: { user, message: `User status changed to ${status}.` },
    });
  }

  public static async updateAccountStatus(req: Request, res: Response): Promise<void> {
    const { accountId } = req.params;
    const { status, reason } = req.body;

    const account = await BankAccount.findById(accountId);
    if (!account) throw new AppError("Bank account not found", 404);

    const prevStatus = account.status;
    account.status = status;
    await account.save();

    await logAuditEvent({
      userId: req.user?._id,
      action: AuditAction.ADMIN_ACCOUNT_STATUS_CHANGE,
      details: { accountId: account._id, prevStatus, newStatus: status, reason },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json({
      success: true,
      data: { account, message: `Account status updated to ${status}.` },
    });
  }

  public static async getTransactions(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const transfers = await Transfer.find()
      .populate("sourceAccountId", "accountNumber")
      .populate("destinationAccountId", "accountNumber")
      .populate("sourceUserId", "fullName email")
      .populate("destinationUserId", "fullName email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Transfer.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        transfers,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  }

  public static async getAuditEvents(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;

    const events = await AuditEvent.find()
      .populate("userId", "fullName email role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await AuditEvent.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        events,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  }

  public static async requestAdjustment(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { accountId, direction, amountCents, reasonCode, notes } = req.body;

    const account = await BankAccount.findById(accountId);
    if (!account) throw new AppError("Target bank account not found", 404);

    const adjustment = await AdjustmentRequest.create({
      accountId: account._id,
      direction,
      amountCents,
      reasonCode,
      notes,
      requestedBy: req.user._id,
      status: AdjustmentStatus.PENDING_APPROVAL,
    });

    await logAuditEvent({
      userId: req.user._id,
      action: AuditAction.ADMIN_ADJUSTMENT_REQUESTED,
      details: { adjustmentId: adjustment._id, accountId, direction, amountCents, reasonCode },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({
      success: true,
      data: {
        adjustment,
        message: "Adjustment request submitted. Awaiting Maker-Checker authorization.",
      },
    });
  }

  public static async getAdjustmentQueue(req: Request, res: Response): Promise<void> {
    const adjustments = await AdjustmentRequest.find()
      .populate("accountId", "accountNumber currency availableBalanceCents")
      .populate("requestedBy", "fullName email role")
      .populate("reviewedBy", "fullName email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { adjustments },
    });
  }

  public static async reviewAdjustment(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { adjustmentId } = req.params;
    const { decision, reviewNotes } = req.body;

    const adjustment = await AdjustmentRequest.findById(adjustmentId);
    if (!adjustment) throw new AppError("Adjustment request not found", 404);

    if (adjustment.status !== AdjustmentStatus.PENDING_APPROVAL) {
      throw new AppError(`Adjustment already processed with status: ${adjustment.status}`, 400);
    }

    // Maker-Checker Invariant: Checker CANNOT be the Maker who requested the adjustment!
    if (adjustment.requestedBy.toString() === req.user._id.toString()) {
      throw new AppError(
        "Maker-Checker Security Policy: You cannot approve or review an adjustment you initiated yourself.",
        403,
        "MAKER_CHECKER_VIOLATION"
      );
    }

    adjustment.reviewedBy = req.user._id as Types.ObjectId;
    adjustment.reviewNotes = reviewNotes;

    if (decision === "REJECT") {
      adjustment.status = AdjustmentStatus.REJECTED;
      await adjustment.save();

      await logAuditEvent({
        userId: req.user._id,
        action: AuditAction.ADMIN_ADJUSTMENT_REJECTED,
        details: { adjustmentId: adjustment._id, reviewNotes },
      });

      res.status(200).json({
        success: true,
        data: { adjustment, message: "Adjustment request rejected." },
      });
      return;
    }

    // If APPROVED, execute atomic balanced journal entry
    const account = await BankAccount.findById(adjustment.accountId);
    if (!account) throw new AppError("Account not found", 404);

    const { settlementVault } = await LedgerService.ensureSystemAccounts(account.currency);

    // If Credit adjustment: Bank gives customer money (Debit Vault, Credit Customer)
    // If Debit adjustment: Bank deducts customer money (Debit Customer, Credit Vault)
    const postings =
      adjustment.direction === PostingDirection.CREDIT
        ? [
            {
              ledgerAccountId: settlementVault._id as Types.ObjectId,
              direction: PostingDirection.DEBIT,
              amountCents: adjustment.amountCents,
              currency: account.currency,
            },
            {
              ledgerAccountId: account.ledgerAccountId,
              bankAccountId: account._id as Types.ObjectId,
              direction: PostingDirection.CREDIT,
              amountCents: adjustment.amountCents,
              currency: account.currency,
            },
          ]
        : [
            {
              ledgerAccountId: account.ledgerAccountId,
              bankAccountId: account._id as Types.ObjectId,
              direction: PostingDirection.DEBIT,
              amountCents: adjustment.amountCents,
              currency: account.currency,
            },
            {
              ledgerAccountId: settlementVault._id as Types.ObjectId,
              direction: PostingDirection.CREDIT,
              amountCents: adjustment.amountCents,
              currency: account.currency,
            },
          ];

    const journal = await LedgerService.postJournalEntry({
      description: `Administrative Adjustment (${adjustment.reasonCode}): ${adjustment.notes}`,
      type: TransactionType.ADJUSTMENT,
      currency: account.currency,
      postings,
      metadata: {
        adjustmentId: adjustment._id,
        reasonCode: adjustment.reasonCode,
        makerId: adjustment.requestedBy,
        checkerId: req.user._id,
      },
    });

    if (adjustment.direction === PostingDirection.CREDIT) {
      account.availableBalanceCents += adjustment.amountCents;
      account.ledgerBalanceCents += adjustment.amountCents;
    } else {
      account.availableBalanceCents -= adjustment.amountCents;
      account.ledgerBalanceCents -= adjustment.amountCents;
    }
    await account.save();

    adjustment.status = AdjustmentStatus.APPROVED;
    adjustment.journalEntryId = journal._id as Types.ObjectId;
    await adjustment.save();

    await logAuditEvent({
      userId: req.user._id,
      action: AuditAction.ADMIN_ADJUSTMENT_APPROVED,
      details: {
        adjustmentId: adjustment._id,
        journalId: journal._id,
        amountCents: adjustment.amountCents,
        direction: adjustment.direction,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        adjustment,
        message: "Adjustment approved and posted to double-entry ledger successfully.",
      },
    });
  }

  public static async reconcileAccount(req: Request, res: Response): Promise<void> {
    const { accountId } = req.params;
    const result = await LedgerService.reconcileAccount(accountId);

    res.status(200).json({
      success: true,
      data: result,
    });
  }
}

