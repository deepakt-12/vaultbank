import { Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import { TransferService } from "../services/transferService";
import { Transfer } from "../models/Transfer";
import { verifyReauth } from "../middleware/auth";
import { env } from "../config/env";

export class TransferController {
  public static async createTransfer(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const input = req.body;

    // High risk re-auth requirement:
    // If amount >= HIGH_RISK_TRANSFER_THRESHOLD_CENTS ($5,000.00), require reauth password
    if (input.amountCents >= env.HIGH_RISK_TRANSFER_THRESHOLD_CENTS) {
      if (!input.reauthPassword) {
        throw new AppError(
          "High-value transfer requires re-authentication password.",
          403,
          "REAUTH_REQUIRED"
        );
      }

      const isValidPassword = await verifyReauth(req.user, input.reauthPassword);
      if (!isValidPassword) {
        throw new AppError("Invalid re-authentication password.", 401, "INVALID_REAUTH");
      }
    }

    const result = await TransferService.executeInternalTransfer(
      req.user._id,
      input,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(result.isIdempotentReplay ? 200 : 201).json({
      success: true,
      data: {
        transfer: result.transfer,
        isIdempotentReplay: result.isIdempotentReplay,
        receiptNumber: result.receiptNumber,
        message: result.isIdempotentReplay
          ? "Previous transfer returned (Idempotent replay)."
          : "Transfer completed successfully.",
      },
    });
  }

  public static async getTransferById(req: Request, res: Response): Promise<void> {
    const { transferId } = req.params;
    const transfer = await Transfer.findOne({ transferId })
      .populate("sourceAccountId", "accountNumber accountType")
      .populate("destinationAccountId", "accountNumber accountType")
      .populate("journalEntryId");

    if (!transfer) {
      throw new AppError("Transfer not found", 404);
    }

    // Authorization check: User must be sender or receiver, or staff
    const isOwner =
      req.user?._id.toString() === transfer.sourceUserId.toString() ||
      req.user?._id.toString() === transfer.destinationUserId.toString();
    const isStaff = ["ADMIN", "COMPLIANCE", "SUPPORT"].includes(req.user?.role || "");

    if (!isOwner && !isStaff) {
      throw new AppError("Unauthorized access to transfer record", 403, "FORBIDDEN");
    }

    res.status(200).json({
      success: true,
      data: { transfer },
    });
  }

  public static async getUserTransfers(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query = {
      $or: [{ sourceUserId: req.user._id }, { destinationUserId: req.user._id }],
    };

    const transfers = await Transfer.find(query)
      .populate("sourceAccountId", "accountNumber accountType")
      .populate("destinationAccountId", "accountNumber accountType")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transfer.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        transfers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  }
}

