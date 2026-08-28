import {
  FoodBatch,
  Decision,
  DecisionAlternative,
  WorldState,
  RiskCalculation,
} from '@/app/types';

import { calculateBatchRisk } from './riskEngine';

/**
 * Live intelligence received from the FastAPI AI backend.
 */
export interface LiveRiskInput {
  risk_score: number;
  risk_level: string;
  confidence: number;
  recommended_action: string;
  factors: {
    expiry_risk: number;
    temperature_risk: number;
    demand_risk: number;
    logistics_risk: number;
  };
}

/**
 * Generate an autonomous decision for a food batch.
 */
export const generateDecision = (
  batch: FoodBatch,
  worldState: WorldState,
  liveRisk?: LiveRiskInput | null
): Decision => {
  const decisionId = `decision-${batch.id}-${Date.now()}`;

  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Local simulation-based risk
  const localRisk = calculateBatchRisk(
    batch,
    worldState.demandMultiplier,
    getRiskTemperatureFactor(batch, worldState),
    getRiskLogisticsFactor(batch, worldState)
  );

  // Live AI risk, if available
  const liveRiskScore =
    liveRisk && Number.isFinite(Number(liveRisk.risk_score))
      ? Number(liveRisk.risk_score)
      : undefined;

  // Combine local and backend intelligence
  const effectiveRiskScore =
    liveRiskScore !== undefined
      ? (localRisk.score + liveRiskScore) / 2
      : localRisk.score;

  const riskFactors = generateRiskFactors(
    batch,
    localRisk,
    worldState,
    liveRisk
  );

  const alternatives = generateAlternatives(
    batch,
    worldState,
    riskFactors,
    effectiveRiskScore,
    liveRisk
  );

  const recommendedAlternative = alternatives.reduce(
    (best, alternative) =>
      alternative.overallScore > best.overallScore
        ? alternative
        : best
  );

  return {
    id: decisionId,
    batchId: batch.id,
    timestamp,
    recommendedActionName: recommendedAlternative.name,
    recommendedActionScore: recommendedAlternative.overallScore,
    recommendedActionExplanation: generateExplanation(
      batch,
      recommendedAlternative,
      worldState,
      liveRisk
    ),
    alternatives,
    riskFactors,
    executionMode: 'human-approval',
    status: 'pending',
  };
};

const getRiskTemperatureFactor = (
  batch: FoodBatch,
  worldState: WorldState
): number => {
  const locationMatch = Object.keys(
    worldState.temperatureAnomalies
  ).find((key) =>
    worldState.temperatureAnomalies[key].affectedBatches.includes(
      batch.id
    )
  );

  if (locationMatch) {
    const deviation =
      worldState.temperatureAnomalies[locationMatch].deviation;

    return Math.min(50, deviation * 5);
  }

  return 0;
};

const getRiskLogisticsFactor = (
  batch: FoodBatch,
  worldState: WorldState
): number => {
  if (
    worldState.logisticsDisruption.enabled &&
    worldState.logisticsDisruption.affectedBatches.includes(batch.id)
  ) {
    return Math.min(
      30,
      worldState.logisticsDisruption.delayHours * 2
    );
  }

  return 0;
};

const generateRiskFactors = (
  batch: FoodBatch,
  _risk: RiskCalculation,
  worldState: WorldState,
  liveRisk?: LiveRiskInput | null
): Array<{
  name: string;
  score: number;
  description: string;
}> => {
  const factors: Array<{
    name: string;
    score: number;
    description: string;
  }> = [];

  const freshnessScore = Math.max(
    0,
    Math.min(100, (5 - batch.daysRemaining) ** 2 * 5)
  );

  factors.push({
    name: 'Freshness Risk',
    score: freshnessScore,
    description: `${batch.daysRemaining} days remaining. Shelf-life risk calculated from remaining freshness.`,
  });

  const demandScore =
    worldState.demandMultiplier < 1
      ? (1 - worldState.demandMultiplier) * 50
      : 0;

  factors.push({
    name: 'Demand Risk',
    score: demandScore,
    description: `Demand multiplier: ${(
      worldState.demandMultiplier * 100
    ).toFixed(0)}%. ${
      worldState.demandMultiplier < 1
        ? 'Surplus risk detected.'
        : 'Demand sufficient.'
    }`,
  });

  const temperatureRisk = getRiskTemperatureFactor(
    batch,
    worldState
  );

  if (temperatureRisk > 0) {
    factors.push({
      name: 'Temperature Risk',
      score: temperatureRisk,
      description:
        'Cold chain deviation detected. Accelerated decay risk.',
    });
  }

  const logisticsRisk = getRiskLogisticsFactor(
    batch,
    worldState
  );

  if (logisticsRisk > 0) {
    factors.push({
      name: 'Logistics Risk',
      score: logisticsRisk,
      description: `Supply delay of ${worldState.logisticsDisruption.delayHours} hours projected.`,
    });
  }

  // Add backend intelligence safely
  if (liveRisk) {
    const safeRiskScore = Number(liveRisk.risk_score) || 0;
    const safeConfidence = Number(liveRisk.confidence) || 0;

    factors.push({
      name: 'Live AI Risk',
      score: Math.min(100, Math.max(0, safeRiskScore)),
      description: `FastAPI AI assessment: ${
        liveRisk.risk_level || 'unknown'
      } risk with ${safeConfidence.toFixed(1)}% confidence.`,
    });
  }

  return factors;
};

const generateAlternatives = (
  batch: FoodBatch,
  worldState: WorldState,
  riskFactors: Array<{
    name: string;
    score: number;
    description: string;
  }>,
  effectiveRiskScore: number,
  liveRisk?: LiveRiskInput | null
): DecisionAlternative[] => {
  const alternatives: DecisionAlternative[] = [];

  const safeRiskScore =
    Number.isFinite(effectiveRiskScore)
      ? effectiveRiskScore
      : 0;

  const backendRecommendation =
    liveRisk?.recommended_action?.toLowerCase() || '';

  const matchesBackendRecommendation = (keywords: string[]) =>
    keywords.some((keyword) =>
      backendRecommendation.includes(keyword)
    );

  alternatives.push({
    id: `alt-monitor-${batch.id}`,
    name: 'Monitor',
    description:
      'Continue standard inventory rotation and monitoring',
    wasteReductionPercent: 0,
    valueRecovery: 0,
    operationalRiskLevel:
      safeRiskScore > 60 ? 'high' : 'low',
    overallScore: Math.round(
      Math.max(10, 70 - safeRiskScore * 0.5)
    ),
    explanation:
      'Low intervention. Suitable only when overall risk remains minimal.',
  });

  alternatives.push({
    id: `alt-promote-${batch.id}`,
    name: 'Promote',
    description:
      'Feature in sales, discounts, and marketing campaigns',
    wasteReductionPercent: 45,
    valueRecovery: 65,
    operationalRiskLevel: 'low',
    overallScore: Math.round(
      Math.min(
        95,
        60 +
          (worldState.demandMultiplier > 1 ? 25 : 15) -
          safeRiskScore * 0.3 +
          (matchesBackendRecommendation([
            'promote',
            'discount',
            'sale',
          ])
            ? 15
            : 0)
      )
    ),
    explanation:
      'Drives demand through promotional tactics and accelerated turnover.',
  });

  alternatives.push({
    id: `alt-transform-${batch.id}`,
    name: 'Transform',
    description:
      'Process into value-added products such as ready-meals or soups',
    wasteReductionPercent: 78,
    valueRecovery: 55,
    operationalRiskLevel: 'medium',
    overallScore: Math.round(
      Math.min(
        95,
        50 +
          safeRiskScore * 0.6 -
          (batch.daysRemaining > 3 ? 15 : 0) +
          (matchesBackendRecommendation([
            'transform',
            'process',
          ])
            ? 15
            : 0)
      )
    ),
    explanation:
      'Converts at-risk inventory into value-added products while preventing waste.',
  });

  alternatives.push({
    id: `alt-redistribute-${batch.id}`,
    name: 'Redistribute',
    description:
      'Donate to food banks, charities, or partner organizations',
    wasteReductionPercent: 92,
    valueRecovery: 25,
    operationalRiskLevel: 'low',
    overallScore: Math.round(
      Math.min(
        95,
        40 +
          safeRiskScore * 0.7 -
          (worldState.demandMultiplier > 1 ? 20 : 0) +
          (matchesBackendRecommendation([
            'redistribute',
            'donate',
            'donation',
          ])
            ? 15
            : 0)
      )
    ),
    explanation:
      'Prioritizes maximum waste prevention and social impact for highly at-risk inventory.',
  });

  alternatives.push({
    id: `alt-clearance-${batch.id}`,
    name: 'Accelerated Clearance',
    description:
      'Use deep discounts or bundling for rapid inventory liquidation',
    wasteReductionPercent: 85,
    valueRecovery: 42,
    operationalRiskLevel:
      batch.daysRemaining <= 2 ? 'medium' : 'low',
    overallScore: Math.round(
      Math.min(
        95,
        65 +
          safeRiskScore * 0.4 -
          (batch.daysRemaining > 5 ? 25 : 0) +
          (matchesBackendRecommendation([
            'clearance',
            'liquidate',
            'discount',
          ])
            ? 15
            : 0)
      )
    ),
    explanation:
      'Time-sensitive pricing intervention designed for rapid turnover.',
  });

  return alternatives.sort(
    (a, b) => b.overallScore - a.overallScore
  );
};

const generateExplanation = (
  batch: FoodBatch,
  alternative: DecisionAlternative,
  worldState: WorldState,
  liveRisk?: LiveRiskInput | null
): string => {
  const fragments: string[] = [];

  fragments.push(
    `${batch.name} (${batch.quantity} ${batch.quantityUnit}) located in ${batch.location}.`
  );

  if (batch.daysRemaining <= 1) {
    fragments.push(
      `Critical freshness: only ${batch.daysRemaining} day remaining.`
    );
  } else if (batch.daysRemaining <= 3) {
    fragments.push(
      `Urgent freshness: ${batch.daysRemaining} days remaining.`
    );
  } else {
    fragments.push(
      `Moderate freshness: ${batch.daysRemaining} days remaining.`
    );
  }

  if (worldState.demandMultiplier > 1.2) {
    fragments.push(
      'Strong market demand detected. Sales-focused action is favorable.'
    );
  } else if (worldState.demandMultiplier < 0.8) {
    fragments.push(
      'Weak market demand detected. More aggressive intervention may be required.'
    );
  }

  if (liveRisk) {
    fragments.push(
      `Live AI backend assessment reports ${
        liveRisk.risk_level || 'unknown'
      } risk with a score of ${
        Number(liveRisk.risk_score) || 0
      } and ${
        (Number(liveRisk.confidence) || 0).toFixed(1)
      }% confidence.`
    );
  }

  fragments.push(
    `Final CHRONOS recommendation: ${alternative.name}. ${alternative.explanation}`
  );

  return fragments.join(' ');
};

export const evaluateActionOutcome = (
  batch: FoodBatch,
  alternative: DecisionAlternative,
  worldState: WorldState
): {
  actualWasteReduction: number;
  actualValueRecovery: number;
  notes: string;
} => {
  let wasteModifier = 1;
  let valueModifier = 1;

  if (worldState.currentScenario === 'demand-spike') {
    valueModifier = 1.3;
  } else if (worldState.currentScenario === 'demand-drop') {
    wasteModifier = 0.7;
    valueModifier = 0.6;
  } else if (worldState.currentScenario === 'cold-chain') {
    wasteModifier = 1.2;
  }

  const actualWaste = Math.round(
    alternative.wasteReductionPercent * wasteModifier
  );

  const actualValue = Math.round(
    alternative.valueRecovery * valueModifier
  );

  const notes = `${alternative.name} executed successfully. ${actualWaste}% waste reduction achieved. Value recovery: ${actualValue}%.`;

  return {
    actualWasteReduction: actualWaste,
    actualValueRecovery: actualValue,
    notes,
  };
};