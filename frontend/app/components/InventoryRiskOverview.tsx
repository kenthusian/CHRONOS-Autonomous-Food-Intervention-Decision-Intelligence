'use client';

import React from 'react';
import { FoodBatch } from '@/app/types';
import { AlertTriangle, Clock, MapPin, AlertCircle } from 'lucide-react';
import { useWorldState } from '@/app/context/WorldContext';

interface InventoryRiskOverviewProps {
  batches: FoodBatch[];
}

const getRiskColor = (
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
): string => {
  switch (riskLevel) {
    case 'low':
      return 'bg-emerald-900 text-emerald-300 border-emerald-700';
    case 'medium':
      return 'bg-yellow-900 text-yellow-300 border-yellow-700';
    case 'high':
      return 'bg-orange-900 text-orange-300 border-orange-700';
    case 'critical':
      return 'bg-red-900 text-red-300 border-red-700';
  }
};

const getRiskIcon = (riskLevel: 'low' | 'medium' | 'high' | 'critical') => {
  switch (riskLevel) {
    case 'critical':
      return AlertTriangle;
    default:
      return AlertCircle;
  }
};

export default function InventoryRiskOverview({ batches }: InventoryRiskOverviewProps) {
  const { state, selectBatch } = useWorldState();

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Inventory Risk Overview</h2>

      <div className="space-y-3">
        {batches.map((batch) => {
          const RiskIcon = getRiskIcon(batch.riskLevel);
          const isSelected = state.selectedBatchId === batch.id;

          return (
            <button
              key={batch.id}
              onClick={() => selectBatch(isSelected ? undefined : batch.id)}
              className={`w-full text-left p-4 rounded-lg border transition-all ${
                isSelected
                  ? `border-blue-500 bg-blue-900 bg-opacity-20`
                  : getRiskColor(batch.riskLevel) + ' hover:border-blue-400'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{batch.name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-300">
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      {batch.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {batch.daysRemaining}d remaining
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RiskIcon size={20} />
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${getRiskColor(batch.riskLevel)}`}>
                    {batch.riskLevel}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                <div>
                  <p className="text-slate-400 text-xs">Quantity</p>
                  <p className="text-white font-medium">
                    {batch.quantity} {batch.quantityUnit}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Expiry</p>
                  <p className="text-white font-medium">{batch.expiryDate}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Last Checked</p>
                  <p className="text-white font-medium">{batch.lastChecked}</p>
                </div>
              </div>

              <div className="bg-slate-700 bg-opacity-50 rounded px-3 py-2">
                <p className="text-xs text-slate-300 font-medium">
                  <span className="text-blue-400">→ Recommended:</span> {batch.recommendedAction}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
