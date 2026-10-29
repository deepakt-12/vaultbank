import { Types } from "mongoose";
import { env } from "../config/env";
import { Transfer } from "../models/Transfer";
import { logger } from "../utils/logger";

export interface RiskEvaluationResult {
  riskScore: number;
  isHighRisk: boolean;
  reasons: string[];
}

export class FraudDetectionService {
  public static async evaluateTransferRisk(
    sourceAccountId: Types.ObjectId,
    sourceUserId: Types.ObjectId,
    amountCents: number
  ): Promise<RiskEvaluationResult> {
    const reasons: string[] = [];
    let riskScore = 0;

    // 1. Amount threshold check
    if (amountCents >= env.HIGH_RISK_TRANSFER_THRESHOLD_CENTS) {
      riskScore += 40;
      reasons.push(`Transfer amount exceeds high-risk threshold of ${env.HIGH_RISK_TRANSFER_THRESHOLD_CENTS / 100}`);
    }

    // 2. Velocity check: transfers initiated in the past 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTransfersCount = await Transfer.countDocuments({
      sourceAccountId,
      createdAt: { $gte: oneHourAgo },
    });

    if (recentTransfersCount >= env.VELOCITY_MAX_TRANSFERS_PER_HOUR) {
      riskScore += 50;
      reasons.push(`Velocity alert: ${recentTransfersCount} transfers sent in the past hour`);
    } else if (recentTransfersCount >= 5) {
      riskScore += 20;
      reasons.push(`Elevated velocity: ${recentTransfersCount} transfers in the past hour`);
    }

    // 3. Unique recipients in past 24 hours
    const pastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const distinctRecipients = await Transfer.distinct("destinationAccountId", {
      sourceAccountId,
      createdAt: { $gte: pastDay },
    });

    if (distinctRecipients.length > 8) {
      riskScore += 30;
      reasons.push(`Multiple unique recipients within 24 hours: ${distinctRecipients.length}`);
    }

    const isHighRisk = riskScore >= 50;

    if (riskScore > 0) {
      logger.info(
        {
          sourceAccountId,
          sourceUserId,
          amountCents,
          riskScore,
          reasons,
        },
        "Fraud detection risk evaluated"
      );
    }

    return {
      riskScore,
      isHighRisk,
      reasons,
    };
  }
}

