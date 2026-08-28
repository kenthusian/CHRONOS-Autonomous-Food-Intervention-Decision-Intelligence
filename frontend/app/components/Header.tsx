'use client';

import React, { useEffect, useState } from 'react';
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

export default function Header({
  kpiData,
  currentScenario = 'normal',
}: HeaderProps) {
  // Start as null so the server and browser initially render the same content.
  // The live clock starts only after the component mounts in the browser.
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const dateString = currentTime
    ? currentTime.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const timeString = currentTime
    ? currentTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '';

  return (
    <div className="border-b border-slate-700 bg-slate-900 px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            CHRONOS Mission Control
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Autonomous Food Intervention Intelligence
          </p>
        </div>

        <div className="text-right">
          <div className="mb-3 flex items-center justify-end gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getScenarioBadgeColor(
                currentScenario
              )}`}
            >
              {getScenarioLabel(currentScenario)}
            </span>
          </div>

          <div className="mb-2 flex items-center justify-end gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-400">
              Systems Operational
            </span>
          </div>

          <div className="text-xs text-slate-400">
            {currentTime ? `${dateString} • ${timeString}` : 'Loading system time...'}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Overall Food Health */}
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Overall Food Health
              </p>

              <p className="mt-2 text-2xl font-bold text-white">
                {kpiData.overallFoodHealth}%
              </p>
            </div>

            <BarChart3 className="text-blue-400" size={24} />
          </div>
        </div>

        {/* At-Risk Batches */}
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                At-Risk Batches
              </p>

              <p className="mt-2 text-2xl font-bold text-white">
                {kpiData.atRiskBatches}
              </p>
            </div>

            <AlertCircle className="text-orange-400" size={24} />
          </div>
        </div>

        {/* Predicted Waste Avoided */}
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Waste Avoided
              </p>

              <p className="mt-2 text-2xl font-bold text-white">
                {kpiData.predictedWasteAvoided} T
              </p>
            </div>

            <TrendingUp className="text-green-400" size={24} />
          </div>
        </div>

        {/* Autonomous Decisions */}
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Decisions
              </p>

              <p className="mt-2 text-2xl font-bold text-white">
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