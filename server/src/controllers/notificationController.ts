import { Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import { Notification } from "../models/Notification";

export class NotificationController {
  public static async getNotifications(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: false,
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  }

  public static async markAsRead(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { notificationId } = req.params;

    if (notificationId === "all") {
      await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    } else {
      await Notification.updateOne(
        { _id: notificationId, userId: req.user._id },
        { read: true }
      );
    }

    res.status(200).json({
      success: true,
      data: { message: "Notifications updated." },
    });
  }
}

