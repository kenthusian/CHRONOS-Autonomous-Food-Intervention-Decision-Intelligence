import { FoodBatch, RiskCalculation, RiskFactors } from '@/app/types';

/**
 * Risk Engine: Calculate batch risk scores based on multiple factors
 */

export const calculateRiskFactors = (
  batch: FoodBatch,
  demandMultiplier: number = 1.0,
  temperatureFactor: number = 0,
  logisticsFactor: number = 0
): RiskFactors => {
  // Base risk from days remaining (exponential curve)
  const baseRiskScore =
    batch.daysRemaining <= 0 ? 100 : Math.min(100, (5 - batch.daysRemaining) ** 2 * 5);

  return {
    daysRemaining: batch.daysRemaining,
    quantity: batch.quantity,
    baseRiskScore,
    demandFactor: demandMultiplier < 1.0 ? (1.0 - demandMultiplier) * 30 : 0,
    temperatureFactor,
    logisticsFactor,
  };
};

export const calculateRiskScore = (factors: RiskFactors): number => {
  const totalRisk =
    factors.baseRiskScore +
    factors.demandFactor +
    factors.temperatureFactor +
    factors.logisticsFactor;
  return Math.min(100, Math.max(0, totalRisk));
};

export const riskScoreToLevel = (
  score: number
): 'low' | 'medium' | 'high' | 'critical' => {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
};

export const calculateBatchRisk = (
  batch: FoodBatch,
  demandMultiplier: number = 1.0,
  temperatureFactor: number = 0,
  logisticsFactor: number = 0
): RiskCalculation => {
  const factors = calculateRiskFactors(
    batch,
    demandMultiplier,
    temperatureFactor,
    logisticsFactor
  );
  const score = calculateRiskScore(factors);
  const level = riskScoreToLevel(score);

  return {
    score,
    level,
    factors,
  };
};

export const generateRecommendedAction = (
  batch: FoodBatch,
  risk: RiskCalculation,
  demandMultiplier: number
): string => {
  const { level } = risk;

  if (level === 'critical') {
    if (batch.daysRemaining <= 1) {
      return 'URGENT: Transform into processed products immediately';
    }
    return 'CRITICAL: Redistribute to partners or discount aggressively';
  }

  if (level === 'high') {
    if (demandMultiplier > 1.2) {
      return 'Promote: Feature heavily in sales and marketing';
    }
    return 'Action: Prepare for rapid turnover or value-added processing';
  }

  if (level === 'medium') {
    if (demandMultiplier < 0.8) {
      return 'Monitor: Consider bundling with other items';
    }
    return 'Monitor: Track demand and adjust inventory placement';
  }

  return 'Maintain: Continue standard inventory rotation';
};
