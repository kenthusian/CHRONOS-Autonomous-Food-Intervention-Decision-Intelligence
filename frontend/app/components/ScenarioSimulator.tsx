'use client';

import React from 'react';
import { Zap, Cloud, TrendingDown, AlertTriangle, Package, RotateCcw } from 'lucide-react';
import { ScenarioType } from '@/app/types';
import { useWorldState } from '@/app/context/WorldContext';

export default function ScenarioSimulator() {
  const { state, applyScenario, reset } = useWorldState();

  const scenarios = [
    {
      id: 'normal',
      icon: TrendingDown,
      title: 'Normal Operations',
      description: 'Baseline monitoring and standard interventions',
      color: 'from-blue-600 to-blue-700',
      borderColor: 'border-blue-600',
    },
    {
      id: 'demand-spike',
      icon: Zap,
      title: 'Demand Spike',
      description: 'Sudden 50% increase in demand forecast',
      color: 'from-yellow-600 to-yellow-700',
      borderColor: 'border-yellow-600',
    },
    {
      id: 'demand-drop',
      icon: TrendingDown,
      title: 'Demand Drop',
      description: 'Unexpected 40% reduction in sales',
      color: 'from-purple-600 to-purple-700',
      borderColor: 'border-purple-600',
    },
    {
      id: 'cold-chain',
      icon: AlertTriangle,
      title: 'Cold Chain Failure',
      description: 'Power outage or equipment malfunction',
      color: 'from-red-600 to-red-700',
      borderColor: 'border-red-600',
    },
    {
      id: 'delivery-delay',
      icon: Package,
      title: 'Delivery Delay',
      description: 'Supplier shipment delayed 12+ hours',
      color: 'from-orange-600 to-orange-700',
      borderColor: 'border-orange-600',
    },
    {
      id: 'combined',
      icon: Cloud,
      title: 'Combined Crisis',
      description: 'Multiple simultaneous failure modes',
      color: 'from-pink-600 to-pink-700',
      borderColor: 'border-pink-600',
    },
  ];

  const handleScenarioClick = (scenarioId: string) => {
    applyScenario(scenarioId as ScenarioType);
  };

  const handleReset = () => {
    reset();
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Scenario Simulator</h2>
        <button
          onClick={handleReset}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300"
          title="Reset to normal operations"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {scenarios.map((scenario) => {
          const Icon = scenario.icon;
          const isSelected = state.currentScenario === scenario.id;

          return (
            <button
              key={scenario.id}
              onClick={() => handleScenarioClick(scenario.id)}
              className={`p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? `border-${scenario.borderColor} bg-gradient-to-br ${scenario.color} shadow-lg`
                  : `border-slate-600 bg-slate-700 hover:border-slate-500`
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <Icon
                  size={24}
                  className={isSelected ? 'text-white mb-2' : 'text-slate-300 mb-2'}
                />
                <h3
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    isSelected ? 'text-white' : 'text-slate-200'
                  }`}
                >
                  {scenario.title}
                </h3>
                <p
                  className={`text-xs mt-2 line-clamp-2 ${
                    isSelected ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {scenario.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-slate-700 rounded-lg text-xs text-slate-300 border border-slate-600">
        <p>
          <span className="font-semibold text-blue-300">Current Scenario:</span> {scenarios.find(s => s.id === state.currentScenario)?.title}
        </p>
      </div>
    </div>
  );
}
