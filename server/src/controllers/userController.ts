import { Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import { User } from "../models/User";
import { AuditEvent } from "../models/AuditEvent";

export class UserController {
  public static async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);

    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  }

  public static async updateProfile(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { fullName, phoneNumber } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) throw new AppError("User not found", 404);

    if (fullName) user.fullName = fullName.trim();
    if (phoneNumber) user.phoneNumber = phoneNumber.trim();
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user,
        message: "Profile updated successfully.",
      },
    });
  }

  public static async getSecurityInfo(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const recentAuditEvents = await AuditEvent.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        email: req.user.email,
        isEmailVerified: req.user.isEmailVerified,
        mfaEnabled: req.user.mfaEnabled,
        lastLoginAt: req.user.lastLoginAt,
        failedLoginAttempts: req.user.failedLoginAttempts,
        recentActivity: recentAuditEvents,
      },
    });
  }
}

