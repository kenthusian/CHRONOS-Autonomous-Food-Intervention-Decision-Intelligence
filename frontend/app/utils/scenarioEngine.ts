import {
  ActiveEvent,
  ScenarioType,
  WorldState,
} from '@/app/types';
import {
  calculateBatchRisk,
  generateRecommendedAction,
} from './riskEngine';

/**
 * Scenario Engine: Apply scenario rules and update world state
 */

export const applyScenario = (
  currentState: WorldState,
  scenario: ScenarioType
): Partial<WorldState> => {
  switch (scenario) {
    case 'normal':
      return applyNormalOperations(currentState);
    case 'demand-spike':
      return applyDemandSpike(currentState);
    case 'demand-drop':
      return applyDemandDrop(currentState);
    case 'cold-chain':
      return applyColdChainFailure(currentState);
    case 'delivery-delay':
      return applyDeliveryDelay(currentState);
    case 'combined':
      return applyCombinedCrisis(currentState);
    default:
      return {};
  }
};

const applyNormalOperations = (
  state: WorldState
): Partial<WorldState> => {
  // Reset to baseline conditions
  const updatedBatches = state.batches.map((batch) => {
    const risk = calculateBatchRisk(batch, 1.0, 0, 0);
    return {
      ...batch,
      riskLevel: risk.level,
      recommendedAction: generateRecommendedAction(batch, risk, 1.0),
    };
  });

  return {
    currentScenario: 'normal',
    demandMultiplier: 1.0,
    temperatureAnomalies: {},
    logisticsDisruption: {
      enabled: false,
      delayHours: 0,
      affectedBatches: [],
    },
    batches: updatedBatches,
    events: [],
  };
};

const applyDemandSpike = (
  state: WorldState
): Partial<WorldState> => {
  const demandMultiplier = 1.5;

  const updatedBatches = state.batches.map((batch) => {
    const risk = calculateBatchRisk(batch, demandMultiplier, 0, 0);
    return {
      ...batch,
      riskLevel: risk.level,
      recommendedAction: generateRecommendedAction(batch, risk, demandMultiplier),
    };
  });

  const events: ActiveEvent[] = [
    {
      id: 'event-demand-spike',
      type: 'demand',
      severity: 'high',
      title: 'Demand Spike Event',
      description: 'Market demand increased 50%. Sales forecast revised upward.',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      affectedBatches: updatedBatches.filter((b) => b.riskLevel !== 'low').length,
    },
  ];

  return {
    currentScenario: 'demand-spike',
    demandMultiplier,
    batches: updatedBatches,
    events,
  };
};

const applyDemandDrop = (
  state: WorldState
): Partial<WorldState> => {
  const demandMultiplier = 0.5;

  const updatedBatches = state.batches.map((batch) => {
    const risk = calculateBatchRisk(batch, demandMultiplier, 0, 0);
    return {
      ...batch,
      riskLevel: risk.level,
      recommendedAction: generateRecommendedAction(batch, risk, demandMultiplier),
    };
  });

  const events: ActiveEvent[] = [
    {
      id: 'event-demand-drop',
      type: 'demand',
      severity: 'high',
      title: 'Demand Drop Event',
      description:
        'Market demand declined 50%. Sales forecast revised downward. Surplus risk escalating.',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      affectedBatches: updatedBatches.filter(
        (b) => b.riskLevel === 'high' || b.riskLevel === 'critical'
      ).length,
    },
  ];

  return {
    currentScenario: 'demand-drop',
    demandMultiplier,
    batches: updatedBatches,
    events,
  };
};

const applyColdChainFailure = (
  state: WorldState
): Partial<WorldState> => {
  // Find cold storage batches
  const coldStorageBatchIds = state.batches
    .filter((b) => b.location.toLowerCase().includes('cold') ||
                   b.location.toLowerCase().includes('frozen') ||
                   b.location.toLowerCase().includes('refrigeration'))
    .map((b) => b.id);

  const temperatureAnomalies: { [key: string]: { deviation: number; affectedBatches: string[] } } = {};
  coldStorageBatchIds.forEach((batchId) => {
    temperatureAnomalies[batchId] = {
      deviation: 8, // +8°C temperature spike
      affectedBatches: [batchId],
    };
  });

  const updatedBatches = state.batches.map((batch) => {
    const tempFactor = coldStorageBatchIds.includes(batch.id) ? 35 : 0;
    const risk = calculateBatchRisk(batch, 1.0, tempFactor, 0);
    return {
      ...batch,
      daysRemaining: coldStorageBatchIds.includes(batch.id)
        ? Math.max(0, batch.daysRemaining - 2)
        : batch.daysRemaining,
      riskLevel: risk.level,
      recommendedAction: generateRecommendedAction(batch, risk, 1.0),
    };
  });

  const events: ActiveEvent[] = [
    {
      id: 'event-cold-chain',
      type: 'temperature',
      severity: 'high',
      title: 'Cold Chain Failure',
      description: `Temperature anomaly detected: ${coldStorageBatchIds.length} cold storage units affected. +8°C deviation.`,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      affectedBatches: coldStorageBatchIds.length,
    },
  ];

  return {
    currentScenario: 'cold-chain',
    demandMultiplier: 1.0,
    temperatureAnomalies,
    batches: updatedBatches,
    events,
  };
};

const applyDeliveryDelay = (
  state: WorldState
): Partial<WorldState> => {
  const delayHours = 12;

  // Find items that depend on supply
  const affectedBatchIds = state.batches.slice(0, 3).map((b) => b.id);

  const updatedBatches = state.batches.map((batch) => {
    const logisticsFactor = affectedBatchIds.includes(batch.id) ? 20 : 0;
    const risk = calculateBatchRisk(batch, 1.0, 0, logisticsFactor);
    return {
      ...batch,
      riskLevel: risk.level,
      recommendedAction: generateRecommendedAction(batch, risk, 1.0),
    };
  });

  const events: ActiveEvent[] = [
    {
      id: 'event-delivery-delay',
      type: 'logistics',
      severity: 'high',
      title: 'Delivery Delay',
      description: `Supplier shipment delayed ${delayHours} hours. Inventory buffer impacted. ${affectedBatchIds.length} batches may face supply pressure.`,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      affectedBatches: affectedBatchIds.length,
    },
  ];

  return {
    currentScenario: 'delivery-delay',
    demandMultiplier: 1.0,
    logisticsDisruption: {
      enabled: true,
      delayHours,
      affectedBatches: affectedBatchIds,
    },
    batches: updatedBatches,
    events,
  };
};

const applyCombinedCrisis = (
  state: WorldState
): Partial<WorldState> => {
  const demandMultiplier = 0.6; // Demand drop
  const tempDeviation = 6; // Moderate temperature spike
  const delayHours = 8;

  // Find cold storage batches
  const coldStorageBatchIds = state.batches
    .filter((b) => b.location.toLowerCase().includes('cold') ||
                   b.location.toLowerCase().includes('frozen') ||
                   b.location.toLowerCase().includes('refrigeration'))
    .map((b) => b.id);

  const temperatureAnomalies: { [key: string]: { deviation: number; affectedBatches: string[] } } = {};
  coldStorageBatchIds.forEach((batchId) => {
    temperatureAnomalies[batchId] = {
      deviation: tempDeviation,
      affectedBatches: [batchId],
    };
  });

  const affectedBatchIds = state.batches.slice(0, 3).map((b) => b.id);

  const updatedBatches = state.batches.map((batch) => {
    const tempFactor = coldStorageBatchIds.includes(batch.id) ? 25 : 0;
    const logisticsFactor = affectedBatchIds.includes(batch.id) ? 15 : 0;
    const risk = calculateBatchRisk(batch, demandMultiplier, tempFactor, logisticsFactor);

    return {
      ...batch,
      daysRemaining: coldStorageBatchIds.includes(batch.id)
        ? Math.max(0, batch.daysRemaining - 1)
        : batch.daysRemaining,
      riskLevel: risk.level,
      recommendedAction: generateRecommendedAction(batch, risk, demandMultiplier),
    };
  });

  const events: ActiveEvent[] = [
    {
      id: 'event-combined-1',
      type: 'temperature',
      severity: 'high',
      title: 'Cold Chain Variance',
      description: `Temperature anomaly detected: +${tempDeviation}°C. ${coldStorageBatchIds.length} cold storage units affected.`,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      affectedBatches: coldStorageBatchIds.length,
    },
    {
      id: 'event-combined-2',
      type: 'demand',
      severity: 'high',
      title: 'Demand Collapse',
      description: 'Market demand declined 40%. Economic headwinds detected.',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      affectedBatches: state.batches.length,
    },
    {
      id: 'event-combined-3',
      type: 'logistics',
      severity: 'high',
      title: 'Supply Disruption',
      description: `Multiple shipments delayed ${delayHours}+ hours. Cascade effect likely.`,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      affectedBatches: affectedBatchIds.length,
    },
  ];

  return {
    currentScenario: 'combined',
    demandMultiplier,
    temperatureAnomalies,
    logisticsDisruption: {
      enabled: true,
      delayHours,
      affectedBatches: affectedBatchIds,
    },
    batches: updatedBatches,
    events,
  };
};
