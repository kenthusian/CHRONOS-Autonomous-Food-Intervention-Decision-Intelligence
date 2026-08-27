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

import { mockDecisionWindowPhases } from './data/mockData';
import { generateDecision } from './utils/decisionEngine';

function DashboardContent() {
  const { state, selectBatch } = useWorldState();

  const selectedBatch = state.selectedBatchId
    ? state.batches.find((b) => b.id === state.selectedBatchId)
    : null;

  const selectedBatchDecision = selectedBatch
    ? generateDecision(selectedBatch, state)
    : null;

  const renderDashboard = () => (
    <div className="p-8 space-y-8">
      {/* Inventory and Agent Activity */}
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <InventoryRiskOverview batches={state.batches} />
        </div>

        <div>
          <AgentActivityFeed activities={state.activityFeed} />
        </div>
      </div>

      {/* Decision Timeline */}
      <DecisionWindowTimeline phases={mockDecisionWindowPhases} />

      {/* Events and Impact */}
      <div className="grid grid-cols-2 gap-8">
        <ActiveEvents events={state.events} />
        <ImpactPanel metrics={state.impactMetrics} />
      </div>

      {/* Scenario Simulator */}
      <ScenarioSimulator />

      {/* Decision History */}
      {state.decisionHistory.length > 0 && (
        <DecisionHistory history={state.decisionHistory} />
      )}
    </div>
  );

  const renderInventory = () => (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Inventory Intelligence</h2>
        <p className="text-sm text-slate-400 mt-2">
          Monitor all food batches and identify inventory at risk.
        </p>
      </div>

      <InventoryRiskOverview batches={state.batches} />
    </div>
  );

  const renderAlerts = () => (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Active Alerts</h2>
        <p className="text-sm text-slate-400 mt-2">
          Monitor operational events requiring attention.
        </p>
      </div>

      <ActiveEvents events={state.events} />

      <AgentActivityFeed activities={state.activityFeed} />
    </div>
  );

  const renderDecisions = () => (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Decision Intelligence</h2>
        <p className="text-sm text-slate-400 mt-2">
          Review autonomous interventions and decision outcomes.
        </p>
      </div>

      <DecisionWindowTimeline phases={mockDecisionWindowPhases} />

      {state.decisionHistory.length > 0 ? (
        <DecisionHistory history={state.decisionHistory} />
      ) : (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-slate-400">
            No autonomous decisions have been recorded yet.
          </p>
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">System Settings</h2>
        <p className="text-sm text-slate-400 mt-2">
          Configure CHRONOS simulation and intervention parameters.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">
          Simulation Controls
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-4">
            <div>
              <p className="font-medium text-white">Autonomous Decisions</p>
              <p className="text-sm text-slate-400">
                Allow CHRONOS to generate intervention recommendations.
              </p>
            </div>

            <span className="text-green-400 font-medium">Active</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-700 pb-4">
            <div>
              <p className="font-medium text-white">Risk Monitoring</p>
              <p className="text-sm text-slate-400">
                Continuously evaluate inventory freshness and demand.
              </p>
            </div>

            <span className="text-green-400 font-medium">Enabled</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Current Scenario</p>
              <p className="text-sm text-slate-400">
                Active simulation environment.
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-blue-900 text-blue-300 border border-blue-700 text-sm">
              {state.currentScenario}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentView = () => {
    switch (state.activeView) {
      case 'inventory':
        return renderInventory();

      case 'alerts':
        return renderAlerts();

      case 'decisions':
        return renderDecisions();

      case 'settings':
        return renderSettings();

      case 'dashboard':
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          kpiData={state.kpis}
          currentScenario={state.currentScenario}
        />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto">
          {renderCurrentView()}
        </main>
      </div>

      {/* Decision Intelligence Modal */}
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