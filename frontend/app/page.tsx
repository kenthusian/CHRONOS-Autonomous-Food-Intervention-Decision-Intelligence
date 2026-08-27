'use client';

import React from 'react';
import { WorldProvider, useWorldState } from './context/WorldContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import InventoryRiskOverview from './components/InventoryRiskOverview';
import AgentActivityFeed from './components/AgentActivityFeed';
import DecisionWindowTimeline from './components/DecisionWindowTimeline';
import ActiveEvents from './components/ActiveEvents';
import ImpactPanel from './components/ImpactPanel';
import ScenarioSimulator from './components/ScenarioSimulator';
import DecisionIntelligencePanel from './components/DecisionIntelligencePanel';
import DecisionHistory from './components/DecisionHistory';
import {
  mockDecisionWindowPhases,
} from './data/mockData';
import { generateDecision } from './utils/decisionEngine';

function DashboardContent() {
  const { state, selectBatch } = useWorldState();

  const selectedBatch = state.selectedBatchId
    ? state.batches.find((b) => b.id === state.selectedBatchId)
    : null;

  const selectedBatchDecision = selectedBatch
    ? generateDecision(selectedBatch, state)
    : null;

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header kpiData={state.kpis} currentScenario={state.currentScenario} />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-8">
            {/* Inventory Risk Overview and Agent Activity - Side by side */}
            <div className="grid grid-cols-3 gap-8">
              <div className="col-span-2">
                <InventoryRiskOverview batches={state.batches} />
              </div>
              <div>
                <AgentActivityFeed activities={state.activityFeed} />
              </div>
            </div>

            {/* Decision Window Timeline - Full width */}
            <DecisionWindowTimeline phases={mockDecisionWindowPhases} />

            {/* Active Events and Impact Panel - Side by side */}
            <div className="grid grid-cols-2 gap-8">
              <ActiveEvents events={state.events} />
              <ImpactPanel metrics={state.impactMetrics} />
            </div>

            {/* Scenario Simulator - Full width */}
            <ScenarioSimulator />

            {/* Decision History - Full width */}
            {state.decisionHistory.length > 0 && (
              <DecisionHistory history={state.decisionHistory} />
            )}
          </div>
        </div>
      </div>

      {/* Decision Intelligence Panel Modal */}
      {selectedBatch && selectedBatchDecision && (
        <DecisionIntelligencePanel
          batch={selectedBatch}
          decision={selectedBatchDecision}
          onClose={() => selectBatch(undefined)}
        />
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <WorldProvider>
      <DashboardContent />
    </WorldProvider>
  );
}
