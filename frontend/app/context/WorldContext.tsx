'use client';

import React, {
  createContext,
  useReducer,
  useCallback,
  ReactNode,
} from 'react';

import {
  WorldState,
  ScenarioType,
  ImpactMetric,
  Decision,
  DecisionHistoryEntry,
  AppView,
  SimulationSettings,
} from '@/app/types';

import {
  mockKPIData,
  mockFoodBatches,
  mockAgentActivity,
  mockActiveEvents,
  mockImpactMetrics,
} from '@/app/data/mockData';

import { applyScenario } from '@/app/utils/scenarioEngine';
import { generateAgentActivityCycle } from '@/app/utils/agentSimulator';
import { evaluateActionOutcome } from '@/app/utils/decisionEngine';

/* =====================================================
   INITIAL WORLD STATE
===================================================== */

const createInitialState = (): WorldState => ({
  batches: mockFoodBatches,
  events: mockActiveEvents,
  activityFeed: mockAgentActivity,
  kpis: mockKPIData,
  impactMetrics: mockImpactMetrics,

  currentScenario: 'normal',

  demandMultiplier: 1.0,

  temperatureAnomalies: {},

  logisticsDisruption: {
    enabled: false,
    delayHours: 0,
    affectedBatches: [],
  },

  simulationTimestamp: new Date().toISOString(),

  decisionCount: mockKPIData.autonomousDecisions,

  decisionHistory: [],

  activeView: 'dashboard',

  settings: {
    riskSensitivity: 50,
    agentAutonomy: 'approval-required',
    alertThreshold: 'medium',
  },
});

/* =====================================================
   ACTION TYPES
===================================================== */

type Action =
  | {
      type: 'APPLY_SCENARIO';
      scenario: ScenarioType;
    }
  | {
      type: 'UPDATE_KPI';
      kpis: WorldState['kpis'];
    }
  | {
      type: 'SELECT_BATCH';
      batchId?: string;
    }
  | {
      type: 'SET_VIEW';
      view: AppView;
    }
  | {
      type: 'UPDATE_SETTINGS';
      settings: Partial<SimulationSettings>;
    }
  | {
      type: 'EXECUTE_DECISION';
      decision: Decision;
      selectedAlternativeId: string;
    }
  | {
      type: 'RESET';
    };

/* =====================================================
   HELPER FUNCTIONS
===================================================== */

const calculateKPIs = (
  state: WorldState
): WorldState['kpis'] => {
  const totalBatches = state.batches.length;

  const atRiskCount = state.batches.filter(
    (batch) =>
      batch.riskLevel === 'high' ||
      batch.riskLevel === 'critical'
  ).length;

  const overallHealth = Math.round(
    ((totalBatches - atRiskCount) / totalBatches) * 100
  );

  const wasteAvoided =
    state.currentScenario === 'normal'
      ? 12.4
      : 18.7;

  return {
    overallFoodHealth: overallHealth,
    atRiskBatches: atRiskCount,
    predictedWasteAvoided: wasteAvoided,
    autonomousDecisions: state.decisionCount,
  };
};

const calculateImpactMetrics = (
  state: WorldState
): ImpactMetric[] => {
  const baseMetrics: ImpactMetric[] = [
    {
      label: 'Food Saved',
      value: 847.3,
      unit: 'kg',
      change: 23,
    },
    {
      label: 'Waste Prevented',
      value: 92,
      unit: '%',
      change: 12,
    },
    {
      label: 'Value Recovered',
      value: 4230,
      unit: '$',
      change: 18,
    },
    {
      label: 'Interventions',
      value: state.decisionCount,
      unit: '',
      change: 7,
    },
  ];

  if (state.currentScenario === 'demand-spike') {
    baseMetrics[0].value *= 1.3;
    baseMetrics[2].value *= 1.2;
  } else if (state.currentScenario === 'cold-chain') {
    baseMetrics[1].value = 88;
  }

  return baseMetrics;
};

/* =====================================================
   REDUCER
===================================================== */

const worldReducer = (
  state: WorldState,
  action: Action
): WorldState => {
  switch (action.type) {
    case 'APPLY_SCENARIO': {
      const scenarioChanges = applyScenario(
        state,
        action.scenario
      );

      const newState: WorldState = {
        ...state,
        ...scenarioChanges,
      };

      newState.kpis = calculateKPIs(newState);

      newState.activityFeed =
        generateAgentActivityCycle(
          state,
          newState,
          action.scenario
        );

      newState.impactMetrics =
        calculateImpactMetrics(newState);

      newState.decisionCount = Math.max(
        state.decisionCount + 1,
        newState.decisionCount
      );

      newState.simulationTimestamp =
        new Date().toISOString();

      return newState;
    }

    case 'UPDATE_KPI': {
      return {
        ...state,
        kpis: action.kpis,
      };
    }

    case 'SELECT_BATCH': {
      return {
        ...state,
        selectedBatchId: action.batchId,
      };
    }

    case 'SET_VIEW': {
      return {
        ...state,
        activeView: action.view,
      };
    }

    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.settings,
        },
      };
    }

    case 'EXECUTE_DECISION': {
      const {
        decision,
        selectedAlternativeId,
      } = action;

      const selectedAlternative =
        decision.alternatives.find(
          (alternative) =>
            alternative.id === selectedAlternativeId
        );

      if (!selectedAlternative) {
        return state;
      }

      const batch = state.batches.find(
        (currentBatch) =>
          currentBatch.id === decision.batchId
      );

      if (!batch) {
        return state;
      }

      const outcome = evaluateActionOutcome(
        batch,
        selectedAlternative,
        state
      );

      /* -------------------------
         DECISION HISTORY
      ------------------------- */

      const historyEntry: DecisionHistoryEntry = {
        id: `history-${Date.now()}`,

        timestamp: new Date().toLocaleTimeString(
          'en-US',
          {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }
        ),

        batchId: decision.batchId,

        batchName: batch.name,

        decision: {
          ...decision,
          selectedAlternativeId,
          status: 'executed',
          executedAt: new Date().toISOString(),
        },

        outcome,
      };

      const updatedHistory = [
        historyEntry,
        ...state.decisionHistory,
      ];

      /* -------------------------
         ACTIVITY FEED
      ------------------------- */

      const newActivity = {
        id: `activity-decision-${Date.now()}`,

        timestamp: new Date().toLocaleTimeString(
          'en-US',
          {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }
        ),

        phase: 'monitor' as const,

        title: `Decision Executed: ${selectedAlternative.name}`,

        description: `${batch.name} intervention: ${selectedAlternative.name}. Projected waste reduction: ${outcome.actualWasteReduction}%. ${outcome.notes}`,

        batchId: decision.batchId,
      };

      /* -------------------------
         UPDATE BATCH
      ------------------------- */

      const updatedBatches = state.batches.map(
        (currentBatch) =>
          currentBatch.id === batch.id
            ? {
                ...currentBatch,

                riskLevel: 'low' as const,

                recommendedAction: `Executed: ${selectedAlternative.name}`,

                lastChecked:
                  new Date().toLocaleString(
                    'en-US',
                    {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }
                  ),
              }
            : currentBatch
      );

      /* -------------------------
         UPDATE IMPACT METRICS
      ------------------------- */

      const updatedImpactMetrics =
        state.impactMetrics.map((metric) => {
          if (metric.label === 'Food Saved') {
            return {
              ...metric,

              value:
                metric.value +
                (batch.quantity *
                  outcome.actualWasteReduction) /
                  100,
            };
          }

          if (metric.label === 'Value Recovered') {
            return {
              ...metric,

              value:
                metric.value +
                outcome.actualValueRecovery,
            };
          }

          if (metric.label === 'Interventions') {
            return {
              ...metric,
              value: metric.value + 1,
            };
          }

          return metric;
        });

      const updatedDecisionCount =
        state.decisionCount + 1;

      /* =====================================================
         IMPORTANT FIX

         selectedBatchId IS NOT cleared here.

         The modal remains open so the verification screen
         can be displayed after execution.
      ===================================================== */

      return {
        ...state,

        batches: updatedBatches,

        kpis: {
          ...state.kpis,
          autonomousDecisions:
            updatedDecisionCount,
        },

        impactMetrics:
          updatedImpactMetrics,

        decisionHistory:
          updatedHistory,

        activityFeed: [
          newActivity,
          ...state.activityFeed,
        ],

        decisionCount:
          updatedDecisionCount,
      };
    }

    case 'RESET': {
      return createInitialState();
    }

    default:
      return state;
  }
};

/* =====================================================
   CONTEXT
===================================================== */

interface WorldContextType {
  state: WorldState;

  applyScenario: (
    scenario: ScenarioType
  ) => void;

  selectBatch: (
    batchId?: string
  ) => void;

  setView: (
    view: AppView
  ) => void;

  updateSettings: (
    settings: Partial<SimulationSettings>
  ) => void;

  executeDecision: (
    decision: Decision,
    selectedAlternativeId: string
  ) => void;

  reset: () => void;
}

const WorldContext =
  createContext<WorldContextType | undefined>(
    undefined
  );

/* =====================================================
   PROVIDER
===================================================== */

interface WorldProviderProps {
  children: ReactNode;
}

export const WorldProvider: React.FC<
  WorldProviderProps
> = ({ children }) => {
  const [state, dispatch] = useReducer(
    worldReducer,
    undefined,
    createInitialState
  );

  const applyScenarioAction = useCallback(
    (scenario: ScenarioType) => {
      dispatch({
        type: 'APPLY_SCENARIO',
        scenario,
      });
    },
    []
  );

  const selectBatchAction = useCallback(
    (batchId?: string) => {
      dispatch({
        type: 'SELECT_BATCH',
        batchId,
      });
    },
    []
  );

  const setViewAction = useCallback(
    (view: AppView) => {
      dispatch({
        type: 'SET_VIEW',
        view,
      });
    },
    []
  );

  const updateSettingsAction = useCallback(
    (
      settings: Partial<SimulationSettings>
    ) => {
      dispatch({
        type: 'UPDATE_SETTINGS',
        settings,
      });
    },
    []
  );

  const executeDecisionAction = useCallback(
    (
      decision: Decision,
      selectedAlternativeId: string
    ) => {
      dispatch({
        type: 'EXECUTE_DECISION',
        decision,
        selectedAlternativeId,
      });
    },
    []
  );

  const resetState = useCallback(() => {
    dispatch({
      type: 'RESET',
    });
  }, []);

  const value: WorldContextType = {
    state,

    applyScenario:
      applyScenarioAction,

    selectBatch:
      selectBatchAction,

    setView:
      setViewAction,

    updateSettings:
      updateSettingsAction,

    executeDecision:
      executeDecisionAction,

    reset:
      resetState,
  };

  return (
    <WorldContext.Provider value={value}>
      {children}
    </WorldContext.Provider>
  );
};

/* =====================================================
   CUSTOM HOOK
===================================================== */

export const useWorldState =
  (): WorldContextType => {
    const context =
      React.useContext(WorldContext);

    if (!context) {
      throw new Error(
        'useWorldState must be used within WorldProvider'
      );
    }

    return context;
  };