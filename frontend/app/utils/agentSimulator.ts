import { FoodBatch, AgentActivityEntry, WorldState, ScenarioType } from '@/app/types';

/**
 * Agent Simulator: Generate agent activity cycle reflecting scenario changes
 */

export const generateAgentActivityCycle = (
  _previousState: WorldState,
  newState: WorldState,
  scenario: ScenarioType
): AgentActivityEntry[] => {
  const activityEntries: AgentActivityEntry[] = [];
  const baseTime = new Date();

  // Phase 1: Observe
  activityEntries.push({
    id: `activity-${Date.now()}-observe`,
    timestamp: formatTime(new Date(baseTime.getTime() + 0)),
    phase: 'observe',
    title: 'Inventory Scan',
    description: `Monitoring ${newState.batches.length} food batches across all storage zones. Scenario: ${formatScenarioName(scenario)}.`,
  });

  // Phase 2: Detect
  const eventCount = newState.events.length;
  const eventDescription =
    eventCount > 0
      ? `${eventCount} operational event(s) detected.`
      : 'All systems nominal.';

  activityEntries.push({
    id: `activity-${Date.now()}-detect`,
    timestamp: formatTime(new Date(baseTime.getTime() + 3000)),
    phase: 'detect',
    title: 'Event Detection',
    description: eventDescription,
  });

  // Phase 3: Analyze
  const healthScore = calculateHealthScore(newState);
  activityEntries.push({
    id: `activity-${Date.now()}-analyze`,
    timestamp: formatTime(new Date(baseTime.getTime() + 6000)),
    phase: 'analyze',
    title: 'Analysis Complete',
    description: `Inventory health assessment: ${healthScore}%. ${getAnalysisNarrative(scenario, newState)}.`,
  });

  // Phase 4: Risk Detection
  const criticalBatches = newState.batches.filter((b) => b.riskLevel === 'critical');
  const highRiskBatches = newState.batches.filter((b) => b.riskLevel === 'high');

  if (criticalBatches.length > 0 || highRiskBatches.length > 0) {
    const riskCount = criticalBatches.length + highRiskBatches.length;
    activityEntries.push({
      id: `activity-${Date.now()}-risk`,
      timestamp: formatTime(new Date(baseTime.getTime() + 9000)),
      phase: 'risk',
      title: 'Risk Detection',
      description: `${riskCount} batch(es) at elevated risk. ${getRiskNarrative(scenario, criticalBatches)}.`,
      batchId: criticalBatches[0]?.id,
    });
  }

  // Phase 5: Alternative Generation
  const alternatives = generateAlternatives(scenario);
  activityEntries.push({
    id: `activity-${Date.now()}-alternatives`,
    timestamp: formatTime(new Date(baseTime.getTime() + 12000)),
    phase: 'alternatives',
    title: 'Alternative Generation',
    description: `Generated ${alternatives.length} intervention paths: ${alternatives.join(', ')}.`,
  });

  // Phase 6: Simulate
  activityEntries.push({
    id: `activity-${Date.now()}-simulate`,
    timestamp: formatTime(new Date(baseTime.getTime() + 15000)),
    phase: 'simulate',
    title: 'Outcome Simulation',
    description: `Simulated ${alternatives.length} scenarios. ${getSimulationOutcome(scenario)} yields highest value recovery.`,
  });

  // Phase 7: Decide
  const selectedAction = selectOptimalAction(scenario);
  activityEntries.push({
    id: `activity-${Date.now()}-decide`,
    timestamp: formatTime(new Date(baseTime.getTime() + 18000)),
    phase: 'decide',
    title: 'Action Selected',
    description: `Algorithm selected "${selectedAction}" as optimal intervention. Estimated waste reduction: ${getWasteReductionEstimate(scenario)}%.`,
  });

  // Phase 8: Monitor
  activityEntries.push({
    id: `activity-${Date.now()}-monitor`,
    timestamp: formatTime(new Date(baseTime.getTime() + 21000)),
    phase: 'monitor',
    title: 'Outcome Monitoring',
    description: `${getMonitoringNarrative(scenario)}. AI vigilance maintained.`,
  });

  return activityEntries;
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const formatScenarioName = (scenario: ScenarioType): string => {
  const names: Record<ScenarioType, string> = {
    normal: 'Normal Operations',
    'demand-spike': 'Demand Spike',
    'demand-drop': 'Demand Drop',
    'cold-chain': 'Cold Chain Failure',
    'delivery-delay': 'Delivery Delay',
    combined: 'Combined Crisis',
  };
  return names[scenario];
};

const calculateHealthScore = (state: WorldState): number => {
  const criticalCount = state.batches.filter((b) => b.riskLevel === 'critical').length;
  const highCount = state.batches.filter((b) => b.riskLevel === 'high').length;
  const mediumCount = state.batches.filter((b) => b.riskLevel === 'medium').length;

  const baseScore = 100;
  const deduction = criticalCount * 15 + highCount * 8 + mediumCount * 3;
  return Math.max(10, Math.min(100, baseScore - deduction));
};

const getAnalysisNarrative = (scenario: ScenarioType, state: WorldState): string => {
  switch (scenario) {
    case 'demand-spike':
      return 'Strong demand signal detected. Inventory allocation optimized for rapid fulfillment';
    case 'demand-drop':
      return 'Demand contraction identified. Surplus risk escalating across perishable lines';
    case 'cold-chain':
      return `Temperature variance: +${state.temperatureAnomalies[Object.keys(state.temperatureAnomalies)[0]]?.deviation || 8}°C detected`;
    case 'delivery-delay':
      return `Logistics delay of ${state.logisticsDisruption.delayHours} hours projected. Supply buffer tightening`;
    case 'combined':
      return 'Multiple disruptions detected simultaneously. Cascade effect probability elevated';
    default:
      return 'All systems operating within normal parameters';
  }
};

const getRiskNarrative = (
  scenario: ScenarioType,
  criticalBatches: FoodBatch[]
): string => {
  if (criticalBatches.length === 0) return 'Risk levels manageable.';

  if (scenario === 'cold-chain') {
    return `Cold storage compromise affects ${criticalBatches.length} batch(es). Accelerated decay expected.`;
  }

  if (scenario === 'demand-drop') {
    return `Demand collapse exposes inventory to extended shelf time. ${criticalBatches.length} batch(es) face waste risk.`;
  }

  if (scenario === 'combined') {
    return `Crisis cascade detected. ${criticalBatches.length} batch(es) face multi-factor risk. Immediate intervention required.`;
  }

  return `${criticalBatches.length} batch(es) require urgent attention.`;
};

const generateAlternatives = (scenario: ScenarioType): string[] => {
  const baseAlternatives = ['Promote', 'Transform', 'Redistribute', 'Compost'];

  if (scenario === 'demand-spike') {
    return ['Accelerate Sales', 'Expand Distribution', 'Premium Pricing', 'Bulk Orders'];
  }

  if (scenario === 'demand-drop') {
    return ['Deep Discount', 'Process for Shelf', 'Partner Donation', 'Composting'];
  }

  if (scenario === 'cold-chain') {
    return ['Emergency Transfer', 'Accelerated Processing', 'Rapid Liquidation', 'Rescue Feed'];
  }

  if (scenario === 'delivery-delay') {
    return ['Extend Storage', 'Local Sourcing', 'Reduce Demand', 'Strategic Hold'];
  }

  if (scenario === 'combined') {
    return ['Crisis Protocol 1', 'Crisis Protocol 2', 'Crisis Protocol 3', 'Full Liquidation'];
  }

  return baseAlternatives;
};

const getSimulationOutcome = (scenario: ScenarioType): string => {
  if (scenario === 'demand-spike') return 'Accelerate Sales';
  if (scenario === 'demand-drop') return 'Partner Donation';
  if (scenario === 'cold-chain') return 'Emergency Processing';
  if (scenario === 'delivery-delay') return 'Strategic Hold';
  if (scenario === 'combined') return 'Crisis Protocol 1';
  return 'Promote';
};

const selectOptimalAction = (scenario: ScenarioType): string => {
  if (scenario === 'demand-spike') return 'Accelerated Sales Campaign';
  if (scenario === 'demand-drop') return 'Redistribute & Donation';
  if (scenario === 'cold-chain') return 'Emergency Transformation';
  if (scenario === 'delivery-delay') return 'Inventory Optimization';
  if (scenario === 'combined') return 'Coordinated Crisis Response';
  return 'Promote: Feature in weekly sale';
};

const getWasteReductionEstimate = (scenario: ScenarioType): number => {
  if (scenario === 'demand-spike') return 97;
  if (scenario === 'demand-drop') return 78;
  if (scenario === 'cold-chain') return 65;
  if (scenario === 'delivery-delay') return 82;
  if (scenario === 'combined') return 58;
  return 92;
};

const getMonitoringNarrative = (scenario: ScenarioType): string => {
  if (scenario === 'demand-spike')
    return 'Sales acceleration proceeding nominally. Inventory flowing optimally';
  if (scenario === 'demand-drop')
    return 'Redistribution network activated. Partner organizations receiving shipments';
  if (scenario === 'cold-chain')
    return 'Emergency processing underway. Cold chain breach contained. Damage assessment ongoing';
  if (scenario === 'delivery-delay')
    return 'Inventory rationing protocol active. Supply buffer consumption tracked. Resupply ETA monitored';
  if (scenario === 'combined')
    return 'Crisis response executing across all fronts. Continuous monitoring and dynamic re-planning active';
  return 'Standard monitoring resumed. All parameters nominal';
};
