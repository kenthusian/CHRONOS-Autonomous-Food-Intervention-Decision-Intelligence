import {
  FoodBatch,
  Decision,
  DecisionAlternative,
  WorldState,
  RiskCalculation,
} from '@/app/types';

import { calculateBatchRisk } from './riskEngine';

/**
 * Live risk assessment returned by the CHRONOS FastAPI backend.
 * The backend assessment is optional so the decision engine can
 * still operate using the local simulation model as a fallback.
 */
export interface LiveRiskAssessment {
  product_name: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical' | string;
  confidence: number;
  factors?: {
    expiry_risk?: number;
    temperature_risk?: number;
    demand_risk?: number;
    logistics_risk?: number;
  };
  recommended_action?: string;
}

/**
 * Decision Engine: Generate intelligent decisions for food batches.
 *
 * When a live backend assessment is available, it is blended with
 * the local simulation risk so CHRONOS decisions respond to both
 * operational context and AI-generated risk intelligence.
 */
export const generateDecision = (
  batch: FoodBatch,
  worldState: WorldState,
  liveRisk?: LiveRiskAssessment
): Decision => {
  const decisionId = `decision-${batch.id}-${Date.now()}`;

  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Local CHRONOS simulation risk
  const localRisk = calculateBatchRisk(
    batch,
    worldState.demandMultiplier,
    getRiskTemperatureFactor(batch, worldState),
    getRiskLogisticsFactor(batch, worldState)
  );

  // Generate risk factors using live backend values when available.
  const riskFactors = generateRiskFactors(
    batch,
    localRisk,
    worldState,
    liveRisk
  );

  // Generate alternatives using the combined risk context.
  const alternatives = generateAlternatives(
    batch,
    worldState,
    riskFactors,
    liveRisk
  );

  // Select the highest-scoring alternative.
  const recommendedAlternative = alternatives.reduce((best, alternative) =>
    alternative.overallScore > best.overallScore
      ? alternative
      : best
  );

  // Autonomous execution is only enabled when risk is high enough
  // and the application settings allow autonomous operation.
  const executionMode =
    shouldUseAutonomousExecution(liveRisk, localRisk, worldState)
      ? 'autonomous'
      : 'human-approval';

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
    executionMode,
    status: 'pending',
  };
};

/**
 * Returns the live backend risk score on a 0-100 scale.
 *
 * If the backend returns a value between 0 and 1, it is interpreted
 * as a probability and converted to a percentage.
 */
const normalizeLiveRiskScore = (
  liveRisk?: LiveRiskAssessment
): number | null => {
  if (!liveRisk || typeof liveRisk.risk_score !== 'number') {
    return null;
  }

  const rawScore = liveRisk.risk_score;

  const normalizedScore =
    rawScore >= 0 && rawScore <= 1
      ? rawScore * 100
      : rawScore;

  return Math.max(0, Math.min(100, normalizedScore));
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
    worldState.logisticsDisruption.affectedBatches.includes(
      batch.id
    )
  ) {
    return Math.min(
      30,
      worldState.logisticsDisruption.delayHours * 2
    );
  }

  return 0;
};

/**
 * Builds explainable risk factors.
 *
 * Backend factors are used when present, while local simulation
 * factors provide the fallback.
 */
const generateRiskFactors = (
  batch: FoodBatch,
  _risk: RiskCalculation,
  worldState: WorldState,
  liveRisk?: LiveRiskAssessment
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

  const backendFactors = liveRisk?.factors;

  // Freshness / expiry risk
  const localFreshnessScore = Math.max(
    0,
    Math.min(
      100,
      (5 - batch.daysRemaining) ** 2 * 5
    )
  );

  const freshnessScore =
    backendFactors?.expiry_risk !== undefined
      ? Math.max(
          0,
          Math.min(100, backendFactors.expiry_risk)
        )
      : localFreshnessScore;

  factors.push({
    name: 'Freshness Risk',
    score: freshnessScore,
    description:
      backendFactors?.expiry_risk !== undefined
        ? `Live AI expiry analysis reports a risk score of ${freshnessScore.toFixed(
            1
          )}.`
        : `${batch.daysRemaining} days remaining. Exponential decay curve applied.`,
  });

  // Demand risk
  const localDemandScore =
    worldState.demandMultiplier < 1.0
      ? (1.0 - worldState.demandMultiplier) * 50
      : 0;

  const demandScore =
    backendFactors?.demand_risk !== undefined
      ? Math.max(
          0,
          Math.min(100, backendFactors.demand_risk)
        )
      : localDemandScore;

  factors.push({
    name: 'Demand Risk',
    score: demandScore,
    description:
      backendFactors?.demand_risk !== undefined
        ? `Live AI demand analysis reports a risk score of ${demandScore.toFixed(
            1
          )}.`
        : `Demand multiplier: ${(
            worldState.demandMultiplier * 100
          ).toFixed(0)}%. ${
            worldState.demandMultiplier < 1.0
              ? 'Surplus risk detected.'
              : 'Demand sufficient.'
          }`,
  });

  // Temperature risk
  const localTemperatureScore =
    getRiskTemperatureFactor(batch, worldState);

  const temperatureScore =
    backendFactors?.temperature_risk !== undefined
      ? Math.max(
          0,
          Math.min(
            100,
            backendFactors.temperature_risk
          )
        )
      : localTemperatureScore;

  if (temperatureScore > 0) {
    factors.push({
      name: 'Temperature Risk',
      score: temperatureScore,
      description:
        backendFactors?.temperature_risk !== undefined
          ? `Live AI cold-chain analysis reports a risk score of ${temperatureScore.toFixed(
              1
            )}.`
          : 'Cold chain deviation detected. Accelerated decay risk.',
    });
  }

  // Logistics risk
  const localLogisticsScore =
    getRiskLogisticsFactor(batch, worldState);

  const logisticsScore =
    backendFactors?.logistics_risk !== undefined
      ? Math.max(
          0,
          Math.min(
            100,
            backendFactors.logistics_risk
          )
        )
      : localLogisticsScore;

  if (logisticsScore > 0) {
    factors.push({
      name: 'Logistics Risk',
      score: logisticsScore,
      description:
        backendFactors?.logistics_risk !== undefined
          ? `Live AI logistics analysis reports a risk score of ${logisticsScore.toFixed(
              1
            )}.`
          : `Supply delay of ${worldState.logisticsDisruption.delayHours} hours projected.`,
    });
  }

  // Overall live AI risk factor
  const liveRiskScore = normalizeLiveRiskScore(liveRisk);

  if (liveRiskScore !== null) {
    factors.push({
      name: 'Live AI Risk Signal',
      score: liveRiskScore,
      description: `FastAPI risk engine classifies this batch as ${
        liveRisk?.risk_level
      } risk with ${
        Number(liveRisk?.confidence ?? 0).toFixed(2)
      }% model confidence.`,
    });
  }

  return factors;
};

/**
 * Generates intervention alternatives and adjusts their scores
 * according to live AI risk when available.
 */
const generateAlternatives = (
  batch: FoodBatch,
  worldState: WorldState,
  riskFactors: Array<{
    name: string;
    score: number;
    description: string;
  }>,
  liveRisk?: LiveRiskAssessment
): DecisionAlternative[] => {
  const alternatives: DecisionAlternative[] = [];

  const totalRiskScore =
    riskFactors.reduce(
      (sum, factor) => sum + factor.score,
      0
    ) / Math.max(1, riskFactors.length);

  const liveRiskScore =
    normalizeLiveRiskScore(liveRisk);

  const effectiveRiskScore =
    liveRiskScore !== null
      ? totalRiskScore * 0.55 + liveRiskScore * 0.45
      : totalRiskScore;

  // Monitor
  alternatives.push({
    id: `alt-monitor-${batch.id}`,
    name: 'Monitor',
    description:
      'Continue standard inventory rotation and enhanced monitoring',
    wasteReductionPercent: 0,
    valueRecovery: 0,
    operationalRiskLevel:
      effectiveRiskScore > 55 ? 'high' : 'low',
    overallScore: Math.max(
      10,
      82 - effectiveRiskScore * 0.8
    ),
    explanation:
      'Low intervention strategy. Best when both operational and live AI risk remain low.',
  });

  // Promote
  alternatives.push({
    id: `alt-promote-${batch.id}`,
    name: 'Promote',
    description:
      'Feature in sales, discounts, and marketing campaigns',
    wasteReductionPercent: 45,
    valueRecovery: 65,
    operationalRiskLevel: 'low',
    overallScore: Math.min(
      95,
      55 +
        (worldState.demandMultiplier > 1.0 ? 28 : 14) +
        effectiveRiskScore * 0.18
    ),
    explanation:
      'Drives demand through promotional tactics and accelerates inventory turnover.',
  });

  // Transform
  alternatives.push({
    id: `alt-transform-${batch.id}`,
    name: 'Transform',
    description:
      'Process into value-added products such as ready meals or soups',
    wasteReductionPercent: 78,
    valueRecovery: 55,
    operationalRiskLevel: 'medium',
    overallScore: Math.min(
      96,
      42 +
        effectiveRiskScore * 0.68 -
        (batch.daysRemaining > 4 ? 12 : 0)
    ),
    explanation:
      'Converts at-risk inventory into new SKUs. Strong waste prevention when intervention is required.',
  });

  // Redistribute
  alternatives.push({
    id: `alt-redistribute-${batch.id}`,
    name: 'Redistribute',
    description:
      'Donate or redirect inventory to food banks, charities, or partner organizations',
    wasteReductionPercent: 92,
    valueRecovery: 25,
    operationalRiskLevel: 'low',
    overallScore: Math.min(
      94,
      38 +
        effectiveRiskScore * 0.72 -
        (worldState.demandMultiplier > 1.0 ? 18 : 0)
    ),
    explanation:
      'Maximum waste prevention and social impact. Particularly valuable when recovery time is limited.',
  });

  // Accelerated Clearance
  alternatives.push({
    id: `alt-clearance-${batch.id}`,
    name: 'Accelerated Clearance',
    description:
      'Use deep discounts or product bundles for rapid liquidation',
    wasteReductionPercent: 85,
    valueRecovery: 42,
    operationalRiskLevel:
      batch.daysRemaining <= 2 ? 'medium' : 'low',
    overallScore: Math.min(
      97,
      52 +
        effectiveRiskScore * 0.55 -
        (batch.daysRemaining > 6 ? 25 : 0)
    ),
    explanation:
      'Time-sensitive aggressive pricing strategy designed for rapid inventory movement.',
  });

  // Sort alternatives from strongest to weakest recommendation.
  return alternatives.sort(
    (a, b) => b.overallScore - a.overallScore
  );
};

/**
 * Determines whether CHRONOS can mark the decision as autonomous.
 */
const shouldUseAutonomousExecution = (
  liveRisk: LiveRiskAssessment | undefined,
  localRisk: RiskCalculation,
  worldState: WorldState
): boolean => {
  if (worldState.settings.agentAutonomy !== 'autonomous') {
    return false;
  }

  const liveRiskScore =
    normalizeLiveRiskScore(liveRisk);

  const riskScore =
    liveRiskScore !== null
      ? liveRiskScore
      : localRisk.score;

  return riskScore >= 60;
};

const generateExplanation = (
  batch: FoodBatch,
  alternative: DecisionAlternative,
  worldState: WorldState,
  liveRisk?: LiveRiskAssessment
): string => {
  const fragments: string[] = [];

  fragments.push(
    `${batch.name} (${batch.quantity} ${batch.quantityUnit}) located in ${batch.location}.`
  );

  // Shelf-life context
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

  // Live backend intelligence
  if (liveRisk) {
    const liveRiskScore =
      normalizeLiveRiskScore(liveRisk);

    fragments.push(
      `Live AI assessment reports ${
        liveRisk.risk_level
      } risk${
        liveRiskScore !== null
          ? ` (${liveRiskScore.toFixed(1)}/100)`
          : ''
      } with ${Number(
        liveRisk.confidence
      ).toFixed(2)}% confidence.`
    );

    if (liveRisk.recommended_action) {
      fragments.push(
        `Backend guidance: ${liveRisk.recommended_action}.`
      );
    }
  }

  // Market context
  if (worldState.demandMultiplier > 1.2) {
    fragments.push(
      'Strong market demand detected. Sales-focused action is favored.'
    );
  } else if (worldState.demandMultiplier < 0.8) {
    fragments.push(
      'Weak market demand detected. Faster intervention and value recovery are favored.'
    );
  }

  // Environmental context
  if (worldState.currentScenario === 'cold-chain') {
    fragments.push(
      'Cold chain disruption is active. Accelerated intervention is necessary.'
    );
  } else if (
    worldState.currentScenario === 'combined'
  ) {
    fragments.push(
      'Multiple operational crises detected. Crisis protocol engagement is required.'
    );
  }

  fragments.push(
    `CHRONOS recommendation: ${alternative.name}. ${alternative.explanation}`
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
  let wasteModifier = 1.0;
  let valueModifier = 1.0;

  if (worldState.currentScenario === 'demand-spike') {
    valueModifier = 1.3;
  } else if (
    worldState.currentScenario === 'demand-drop'
  ) {
    wasteModifier = 0.7;
    valueModifier = 0.6;
  } else if (
    worldState.currentScenario === 'cold-chain'
  ) {
    wasteModifier = 1.2;
  }

  const actualWaste = Math.round(
    alternative.wasteReductionPercent * wasteModifier
  );

  const actualValue = Math.round(
    alternative.valueRecovery * valueModifier
  );

  const notes =
    `${alternative.name} executed successfully. ` +
    `${actualWaste}% waste reduction achieved. ` +
    `Value recovery: ${actualValue}%.`;

  return {
    actualWasteReduction: actualWaste,
    actualValueRecovery: actualValue,
    notes,
  };
};