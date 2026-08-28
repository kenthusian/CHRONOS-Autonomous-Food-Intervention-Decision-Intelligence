'use client';

import React from 'react';
import { AgentActivityEntry } from '@/app/types';
import {
  Eye,
  AlertCircle,
  Microscope,
  TrendingDown,
  Lightbulb,
  BarChart3,
  CheckCircle,
  Activity,
} from 'lucide-react';

interface AgentActivityFeedProps {
  activities: AgentActivityEntry[];
}

const getPhaseIcon = (
  phase:
    | 'observe'
    | 'detect'
    | 'analyze'
    | 'risk'
    | 'alternatives'
    | 'simulate'
    | 'decide'
    | 'monitor'
) => {
  switch (phase) {
    case 'observe':
      return Eye;
    case 'detect':
      return AlertCircle;
    case 'analyze':
      return Microscope;
    case 'risk':
      return TrendingDown;
    case 'alternatives':
      return Lightbulb;
    case 'simulate':
      return BarChart3;
    case 'decide':
      return CheckCircle;
    case 'monitor':
      return Activity;
  }
};

const getPhaseColor = (
  phase:
    | 'observe'
    | 'detect'
    | 'analyze'
    | 'risk'
    | 'alternatives'
    | 'simulate'
    | 'decide'
    | 'monitor'
): string => {
  switch (phase) {
    case 'observe':
      return 'bg-blue-900 text-blue-300';
    case 'detect':
      return 'bg-purple-900 text-purple-300';
    case 'analyze':
      return 'bg-cyan-900 text-cyan-300';
    case 'risk':
      return 'bg-red-900 text-red-300';
    case 'alternatives':
      return 'bg-indigo-900 text-indigo-300';
    case 'simulate':
      return 'bg-orange-900 text-orange-300';
    case 'decide':
      return 'bg-green-900 text-green-300';
    case 'monitor':
      return 'bg-lime-900 text-lime-300';
  }
};

export default function AgentActivityFeed({ activities }: AgentActivityFeedProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-6">CHRONOS Agent Activity</h2>

      <div className="space-y-4">
        {activities.map((activity, idx) => {
          const PhaseIcon = getPhaseIcon(activity.phase);
          return (
            <div key={activity.id} className="flex gap-4">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${getPhaseColor(activity.phase)} flex-shrink-0`}
                >
                  <PhaseIcon size={18} />
                </div>
                {idx < activities.length - 1 && (
                  <div className="w-0.5 h-8 bg-slate-700 mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="font-semibold text-white text-sm">{activity.title}</h3>
                  <span className="text-xs text-slate-400">{activity.timestamp}</span>
                </div>
                <p className="text-xs text-slate-300">{activity.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
