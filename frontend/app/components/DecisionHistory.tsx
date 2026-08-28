'use client';

import React from 'react';
import { DecisionHistoryEntry } from '@/app/types';
import { CheckCircle, Calendar, Package } from 'lucide-react';

interface DecisionHistoryProps {
  history: DecisionHistoryEntry[];
}

export default function DecisionHistory({ history }: DecisionHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Decision History & Audit Trail</h2>
        <div className="text-center py-8">
          <Package className="mx-auto text-slate-500 mb-3" size={32} />
          <p className="text-slate-400">No decisions executed yet. Select a batch to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Decision History & Audit Trail</h2>

      <div className="space-y-4">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-emerald-400 flex-shrink-0 mt-1" size={20} />
                <div>
                  <p className="font-semibold text-white">{entry.batchName}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Calendar size={12} />
                    {entry.timestamp}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Action</p>
                <p className="font-semibold text-white text-sm">
                  {entry.decision.selectedAlternativeId
                    ? entry.decision.alternatives.find(
                        (alt) => alt.id === entry.decision.selectedAlternativeId
                      )?.name || 'Unknown'
                    : entry.decision.recommendedActionName}
                </p>
              </div>
            </div>

            {/* Outcome Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-slate-800 rounded px-3 py-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Waste Reduction</p>
                <p className="text-sm font-bold text-emerald-400 mt-1">
                  {entry.outcome.actualWasteReduction}%
                </p>
              </div>
              <div className="bg-slate-800 rounded px-3 py-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Value Recovery</p>
                <p className="text-sm font-bold text-blue-400 mt-1">
                  {entry.outcome.actualValueRecovery}%
                </p>
              </div>
              <div className="bg-slate-800 rounded px-3 py-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Status</p>
                <p className="text-sm font-bold text-slate-300 mt-1 capitalize">
                  {entry.decision.status}
                </p>
              </div>
            </div>

            {/* Notes */}
            <p className="text-xs text-slate-400 italic">{entry.outcome.notes}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
