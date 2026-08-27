'use client';

import React from 'react';
import { BarChart3, AlertCircle, TrendingUp, Zap } from 'lucide-react';
import { KPIData, ScenarioType } from '@/app/types';

interface HeaderProps {
  kpiData: KPIData;
  currentScenario?: ScenarioType;
}

const getScenarioLabel = (scenario: ScenarioType): string => {
  const labels: Record<ScenarioType, string> = {
    normal: 'Normal Operations',
    'demand-spike': 'Demand Spike',
    'demand-drop': 'Demand Drop',
    'cold-chain': 'Cold Chain Failure',
    'delivery-delay': 'Delivery Delay',
    combined: 'Combined Crisis',
  };
  return labels[scenario] || 'Unknown';
};

const getScenarioBadgeColor = (scenario: ScenarioType): string => {
  switch (scenario) {
    case 'normal':
      return 'bg-green-900 text-green-300 border-green-700';
    case 'demand-spike':
      return 'bg-yellow-900 text-yellow-300 border-yellow-700';
    case 'demand-drop':
      return 'bg-purple-900 text-purple-300 border-purple-700';
    case 'cold-chain':
      return 'bg-red-900 text-red-300 border-red-700';
    case 'delivery-delay':
      return 'bg-orange-900 text-orange-300 border-orange-700';
    case 'combined':
      return 'bg-pink-900 text-pink-300 border-pink-700';
    default:
      return 'bg-slate-700 text-slate-300 border-slate-600';
  }
};

export default function Header({ kpiData, currentScenario = 'normal' }: HeaderProps) {
  const now = new Date();
  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeString = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="border-b border-slate-700 bg-slate-900 px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            CHRONOS Mission Control
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Autonomous Food Intervention Intelligence
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-3 justify-end mb-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${getScenarioBadgeColor(currentScenario)}`}
            >
              {getScenarioLabel(currentScenario)}
            </span>
          </div>
          <div className="flex items-center gap-2 justify-end mb-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-400">Systems Operational</span>
          </div>
          <div className="text-xs text-slate-400">
            {dateString} • {timeString}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Overall Food Health */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">
                Overall Food Health
              </p>
              <p className="text-2xl font-bold text-white mt-2">
                {kpiData.overallFoodHealth}%
              </p>
            </div>
            <BarChart3 className="text-blue-400" size={24} />
          </div>
        </div>

        {/* At-Risk Batches */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">
                At-Risk Batches
              </p>
              <p className="text-2xl font-bold text-white mt-2">
                {kpiData.atRiskBatches}
              </p>
            </div>
            <AlertCircle className="text-orange-400" size={24} />
          </div>
        </div>

        {/* Predicted Waste Avoided */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">
                Waste Avoided
              </p>
              <p className="text-2xl font-bold text-white mt-2">
                {kpiData.predictedWasteAvoided} T
              </p>
            </div>
            <TrendingUp className="text-green-400" size={24} />
          </div>
        </div>

        {/* Autonomous Decisions */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">
                Decisions
              </p>
              <p className="text-2xl font-bold text-white mt-2">
                {kpiData.autonomousDecisions}
              </p>
            </div>
            <Zap className="text-yellow-400" size={24} />
          </div>
        </div>
      </div>
    </div>
  );
}
