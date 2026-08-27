'use client';

import React from 'react';
import { DecisionWindowPhase } from '@/app/types';
import { ChevronRight } from 'lucide-react';

interface DecisionWindowTimelineProps {
  phases: DecisionWindowPhase[];
}

export default function DecisionWindowTimeline({
  phases,
}: DecisionWindowTimelineProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-6">
        Decision Window Timeline
        <span className="text-xs font-normal text-slate-400 block mt-1">
          Salmon Batch - Optimal Action Window
        </span>
      </h2>

      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
        {phases.map((phase, idx) => (
          <React.Fragment key={idx}>
            {/* Phase Block */}
            <div
              className={`flex-shrink-0 rounded-lg border-2 p-4 w-40 transition-all ${
                phase.isOptimal
                  ? 'bg-green-900 border-green-400 shadow-lg shadow-green-900/50'
                  : 'bg-slate-700 border-slate-600'
              }`}
            >
              <div className="text-center">
                <h3
                  className={`text-sm font-bold uppercase tracking-wider ${
                    phase.isOptimal ? 'text-green-300' : 'text-slate-300'
                  }`}
                >
                  {phase.name}
                </h3>
                <p className="text-xs text-slate-400 mt-2">{phase.timeRangeHours}</p>
                <div className="mt-3 pt-3 border-t border-slate-600">
                  <p className="text-xs font-medium text-slate-200">
                    {phase.action}
                  </p>
                </div>
              </div>
            </div>

            {/* Arrow between phases */}
            {idx < phases.length - 1 && (
              <div className={`flex-shrink-0 ${phases[idx + 1].isOptimal ? 'text-green-400' : 'text-slate-500'}`}>
                <ChevronRight size={24} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-slate-700 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-xs text-slate-400">
            Optimal intervention window
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-600" />
          <span className="text-xs text-slate-400">Alternative options</span>
        </div>
      </div>
    </div>
  );
}
