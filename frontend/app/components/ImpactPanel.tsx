'use client';

import React from 'react';
import { ImpactMetric } from '@/app/types';
import { TrendingUp } from 'lucide-react';

interface ImpactPanelProps {
  metrics: ImpactMetric[];
}

export default function ImpactPanel({ metrics }: ImpactPanelProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Impact Metrics</h2>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, idx) => (
          <div key={idx} className="bg-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">
              {metric.label}
            </p>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-2xl font-bold text-white">
                  {metric.value}
                  <span className="text-sm font-normal text-slate-400 ml-1">
                    {metric.unit}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-1 text-green-400">
                <TrendingUp size={16} />
                <span className="text-sm font-semibold">+{metric.change}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
