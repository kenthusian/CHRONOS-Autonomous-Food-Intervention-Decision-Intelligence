import { FoodBatch, Decision, DecisionAlternative, WorldState, RiskCalculation } from '@/app/types';
import { calculateBatchRisk } from './riskEngine';

/**
 * Decision Engine: Generate intelligent decisions for food batches
 */

export const generateDecision = (
  batch: FoodBatch,
  worldState: WorldState
): Decision => {
  const decisionId = `decision-${batch.id}-${Date.now()}`;
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Calculate risk factors
  const risk = calculateBatchRisk(
    batch,
    worldState.demandMultiplier,
    getRiskTemperatureFactor(batch, worldState),
    getRiskLogisticsFactor(batch, worldState)
  );

  // Generate risk factors for display
  const riskFactors = generateRiskFactors(batch, risk, worldState);

  // Generate alternatives
  const alternatives = generateAlternatives(batch, worldState, riskFactors);

  // Select best action (highest score alternative)
  const recommendedAlternative = alternatives.reduce((best, alt) =>
    alt.overallScore > best.overallScore ? alt : best
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
      worldState
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
  // Check if batch is in a location affected by temperature anomalies
  const locationMatch = Object.keys(worldState.temperatureAnomalies).find(
    (key) =>
      worldState.temperatureAnomalies[key].affectedBatches.includes(batch.id)
  );

  if (locationMatch) {
    const deviation = worldState.temperatureAnomalies[locationMatch].deviation;
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
    return Math.min(30, worldState.logisticsDisruption.delayHours * 2);
  }
  return 0;
};

const generateRiskFactors = (
  batch: FoodBatch,
  _risk: RiskCalculation,
  worldState: WorldState
): Array<{ name: string; score: number; description: string }> => {
  const factors: Array<{ name: string; score: number; description: string }> = [];

  // Freshness Risk
  const freshnessScore = Math.max(
    0,
    Math.min(100, (5 - batch.daysRemaining) ** 2 * 5)
  );
  factors.push({
    name: 'Freshness Risk',
    score: freshnessScore,
    description: `${batch.daysRemaining} days remaining. Exponential decay curve applied.`,
  });

  // Demand Risk
  const demandScore = worldState.demandMultiplier < 1.0
    ? (1.0 - worldState.demandMultiplier) * 50
    : 0;
  factors.push({
    name: 'Demand Risk',
    score: demandScore,
    description: `Demand multiplier: ${(worldState.demandMultiplier * 100).toFixed(0)}%. ${
      worldState.demandMultiplier < 1.0 ? 'Surplus risk detected.' : 'Demand sufficient.'
    }`,
  });

  // Temperature Risk
  const tempFactor = getRiskTemperatureFactor(batch, worldState);
  if (tempFactor > 0) {
    factors.push({
      name: 'Temperature Risk',
      score: tempFactor,
      description: `Cold chain deviation detected. Accelerated decay risk.`,
    });
  }

  // Logistics Risk
  const logisticsFactor = getRiskLogisticsFactor(batch, worldState);
  if (logisticsFactor > 0) {
    factors.push({
      name: 'Logistics Risk',
      score: logisticsFactor,
      description: `Supply delay of ${worldState.logisticsDisruption.delayHours} hours projected.`,
    });
  }

  return factors;
};

const generateAlternatives = (
  batch: FoodBatch,
  worldState: WorldState,
  riskFactors: Array<{ name: string; score: number; description: string }>
): DecisionAlternative[] => {
  const alternatives: DecisionAlternative[] = [];

  // Calculate base score from risk factors
  const totalRiskScore = riskFactors.reduce((sum, f) => sum + f.score, 0) / Math.max(1, riskFactors.length);

  // Alternative 1: Monitor
  alternatives.push({
    id: `alt-monitor-${batch.id}`,
    name: 'Monitor',
    description: 'Continue standard inventory rotation and monitoring',
    wasteReductionPercent: 0,
    valueRecovery: 0,
    operationalRiskLevel: totalRiskScore > 60 ? 'high' : 'low',
    overallScore: Math.max(20, 70 - totalRiskScore * 0.5),
    explanation: 'Low intervention. Suitable only when risk is minimal.',
  });

  // Alternative 2: Promote
  alternatives.push({
    id: `alt-promote-${batch.id}`,
    name: 'Promote',
    description: 'Feature in sales, discounts, and marketing campaigns',
    wasteReductionPercent: 45,
    valueRecovery: 65,
    operationalRiskLevel: 'low',
    overallScore: Math.min(95, 60 + (worldState.demandMultiplier > 1.0 ? 25 : 15) - totalRiskScore * 0.3),
    explanation: 'Drives demand through promotional tactics. Effective for accelerating turnover.',
  });

  // Alternative 3: Transform
  alternatives.push({
    id: `alt-transform-${batch.id}`,
    name: 'Transform',
    description: 'Process into value-added products (ready-meals, soups, etc)',
    wasteReductionPercent: 78,
    valueRecovery: 55,
    operationalRiskLevel: 'medium',
    overallScore: Math.min(92, 50 + totalRiskScore * 0.6 - (batch.daysRemaining > 3 ? 15 : 0)),
    explanation: 'Converts at-risk inventory into new SKUs. High waste prevention but requires processing capacity.',
  });

  // Alternative 4: Redistribute
  alternatives.push({
    id: `alt-redistribute-${batch.id}`,
    name: 'Redistribute',
    description: 'Donate to food banks, charities, or partner organizations',
    wasteReductionPercent: 92,
    valueRecovery: 25,
    operationalRiskLevel: 'low',
    overallScore: Math.min(88, 40 + totalRiskScore * 0.7 - (worldState.demandMultiplier > 1.0 ? 20 : 0)),
    explanation: 'Maximum waste prevention through social impact. Lower recovery value but strong ESG benefits.',
  });

  // Alternative 5: Accelerated Clearance (premium alternative)
  alternatives.push({
    id: `alt-clearance-${batch.id}`,
    name: 'Accelerated Clearance',
    description: 'Deep discount or bundling strategy for rapid liquidation',
    wasteReductionPercent: 85,
    valueRecovery: 42,
    operationalRiskLevel: batch.daysRemaining <= 2 ? 'medium' : 'low',
    overallScore: Math.min(90, 65 + totalRiskScore * 0.4 - (batch.daysRemaining > 5 ? 25 : 0)),
    explanation: 'Time-sensitive aggressive pricing. Best when shelf life is critical (< 3 days).',
  });

  return alternatives.sort((a, b) => b.overallScore - a.overallScore);
};

const generateExplanation = (
  batch: FoodBatch,
  alternative: DecisionAlternative,
  worldState: WorldState
): string => {
  const fragments: string[] = [];

  // Current situation
  fragments.push(
    `${batch.name} (${batch.quantity} ${batch.quantityUnit}) located in ${batch.location}.`
  );

  // Shelf life context
  if (batch.daysRemaining <= 1) {
    fragments.push(`Critical freshness: only ${batch.daysRemaining} day remaining.`);
  } else if (batch.daysRemaining <= 3) {
    fragments.push(`Urgent freshness: ${batch.daysRemaining} days remaining.`);
  } else {
    fragments.push(`Moderate freshness: ${batch.daysRemaining} days remaining.`);
  }

  // Market context
  if (worldState.demandMultiplier > 1.2) {
    fragments.push('Strong market demand detected. Sales-focused action recommended.');
  } else if (worldState.demandMultiplier < 0.8) {
    fragments.push('Weak market demand. Value recovery or donation recommended.');
  }

  // Environmental context
  if (worldState.currentScenario === 'cold-chain') {
    fragments.push('Cold chain disruption active. Accelerated intervention necessary.');
  } else if (worldState.currentScenario === 'combined') {
    fragments.push('Multiple operational crises detected. Crisis protocol engagement required.');
  }

  // Why this action
  fragments.push(
    `Recommendation: ${alternative.name}. ${alternative.explanation}`
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
  // Scenario modifiers
  let wasteModifier = 1.0;
  let valueModifier = 1.0;

  if (worldState.currentScenario === 'demand-spike') {
    valueModifier = 1.3;
  } else if (worldState.currentScenario === 'demand-drop') {
    wasteModifier = 0.7;
    valueModifier = 0.6;
  } else if (worldState.currentScenario === 'cold-chain') {
    wasteModifier = 1.2;
  }

  const actualWaste = Math.round(alternative.wasteReductionPercent * wasteModifier);
  const actualValue = Math.round(alternative.valueRecovery * valueModifier);

  const notes = `${alternative.name} executed successfully. ${actualWaste}% waste reduction achieved. Value recovery: ${actualValue}%.`;

  return {
    actualWasteReduction: actualWaste,
    actualValueRecovery: actualValue,
    notes,
  };
};
