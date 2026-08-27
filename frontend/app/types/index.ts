// Type definitions for CHRONOS dashboard

export interface FoodBatch {
  id: string;
  name: string;
  location: string;
  quantity: number;
  quantityUnit: string;
  expiryDate: string;
  daysRemaining: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
  lastChecked: string;
}

export interface KPIData {
  overallFoodHealth: number;
  atRiskBatches: number;
  predictedWasteAvoided: number;
  autonomousDecisions: number;
}

export interface AgentActivityEntry {
  id: string;
  timestamp: string;
  phase: 'observe' | 'detect' | 'analyze' | 'risk' | 'alternatives' | 'simulate' | 'decide' | 'monitor';
  title: string;
  description: string;
  batchId?: string;
}

export interface ActiveEvent {
  id: string;
  type: 'temperature' | 'demand' | 'logistics' | 'other';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  timestamp: string;
  affectedBatches: number;
}

export interface ImpactMetric {
  label: string;
  value: number;
  unit: string;
  change: number;
}

export interface DecisionWindowPhase {
  name: string;
  timeRangeHours: string;
  isOptimal: boolean;
  action: string;
}

export type ScenarioType = 'normal' | 'demand-spike' | 'demand-drop' | 'cold-chain' | 'delivery-delay' | 'combined';

export type AppView = 'dashboard' | 'inventory' | 'alerts' | 'decisions' | 'settings';
export type AgentAutonomyMode = 'assisted' | 'approval-required' | 'autonomous';

export interface SimulationSettings {
  riskSensitivity: number;
  agentAutonomy: AgentAutonomyMode;
  alertThreshold: 'low' | 'medium' | 'high' | 'critical';
}

export interface DecisionAlternative {
  id: string;
  name: string;
  description: string;
  wasteReductionPercent: number;
  valueRecovery: number;
  operationalRiskLevel: 'low' | 'medium' | 'high';
  overallScore: number;
  explanation: string;
}

export interface Decision {
  id: string;
  batchId: string;
  timestamp: string;
  recommendedActionName: string;
  recommendedActionScore: number;
  recommendedActionExplanation: string;
  alternatives: DecisionAlternative[];
  selectedAlternativeId?: string;
  riskFactors: Array<{
    name: string;
    score: number;
    description: string;
  }>;
  executionMode: 'autonomous' | 'human-approval';
  status: 'pending' | 'executed' | 'approved' | 'rejected';
  executedAt?: string;
  approvedBy?: string;
}

export interface DecisionHistoryEntry {
  id: string;
  timestamp: string;
  batchId: string;
  batchName: string;
  decision: Decision;
  outcome: {
    actualWasteReduction: number;
    actualValueRecovery: number;
    notes: string;
  };
}

export interface WorldState {
  // Core data
  batches: FoodBatch[];
  events: ActiveEvent[];
  activityFeed: AgentActivityEntry[];
  kpis: KPIData;
  impactMetrics: ImpactMetric[];

  // Scenario & environmental state
  currentScenario: ScenarioType;
  demandMultiplier: number;
  temperatureAnomalies: {
    [locationId: string]: { deviation: number; affectedBatches: string[] };
  };
  logisticsDisruption: {
    enabled: boolean;
    delayHours: number;
    affectedBatches: string[];
  };

  // Simulation metadata
  simulationTimestamp: string;
  decisionCount: number;

  // Decision Intelligence
  selectedBatchId?: string;
  decisionHistory: DecisionHistoryEntry[];
  activeView: AppView;
  settings: SimulationSettings;
}

export interface RiskFactors {
  daysRemaining: number;
  quantity: number;
  baseRiskScore: number;
  demandFactor: number;
  temperatureFactor: number;
  logisticsFactor: number;
}

export interface RiskCalculation {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactors;
}
