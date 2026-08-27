'use client';

import React from 'react';
import {
  Eye,
  Brain,
  Route,
  FlaskConical,
  CheckCircle2,
  Zap,
  ShieldCheck,
} from 'lucide-react';

interface PipelineStep {
  id: string;
  label: string;
  description: string;
  status: 'completed' | 'active' | 'pending';
}

interface AgentDecisionPipelineProps {
  batchName: string;
  riskScore?: number;
  recommendedAction?: string;
  alternativesCount?: number;
  isExecuted?: boolean;
}

export default function AgentDecisionPipeline({
  batchName,
  riskScore = 0,
  recommendedAction = 'No recommendation available',
  alternativesCount = 0,
  isExecuted = false,
}: AgentDecisionPipelineProps) {
  const steps: PipelineStep[] = [
    {
      id: 'observe',
      label: 'OBSERVE',
      description: `Detected live inventory state for ${batchName}.`,
      status: 'completed',
    },
    {
      id: 'reason',
      label: 'REASON',
      description: `Risk assessment completed. Current risk score: ${riskScore}/100.`,
      status: 'completed',
    },
    {
      id: 'plan',
      label: 'PLAN',
      description: `${alternativesCount || 3} intervention alternatives generated.`,
      status: 'completed',
    },
    {
      id: 'simulate',
      label: 'SIMULATE',
      description: 'Projected operational outcomes evaluated before action.',
      status: 'completed',
    },
    {
      id: 'decide',
      label: 'DECIDE',
      description: `Selected: ${recommendedAction}`,
      status: 'completed',
    },
    {
      id: 'act',
      label: 'ACT',
      description: isExecuted
        ? 'Decision executed and recorded in the audit trail.'
        : 'Awaiting execution or approval.',
      status: isExecuted ? 'completed' : 'active',
    },
    {
      id: 'verify',
      label: 'VERIFY',
      description: isExecuted
        ? 'Monitoring post-intervention risk and outcome.'
        : 'Verification will begin after execution.',
      status: isExecuted ? 'active' : 'pending',
    },
  ];

  const icons = [
    Eye,
    Brain,
    Route,
    FlaskConical,
    CheckCircle2,
    Zap,
    ShieldCheck,
  ];

  const getStatusStyles = (status: PipelineStep['status']) => {
    if (status === 'active') {
      return 'border-blue-500 bg-blue-950/40';
    }

    if (status === 'completed') {
      return 'border-green-800 bg-slate-900';
    }

    return 'border-slate-800 bg-slate-900/50 opacity-60';
  };

  const getIconStyles = (status: PipelineStep['status']) => {
    if (status === 'active') return 'text-blue-400';
    if (status === 'completed') return 'text-green-400';
    return 'text-slate-500';
  };

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-5">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-white">
          Autonomous Agent Pipeline
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          How CHRONOS reasoned from observation to intervention.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {steps.map((step, index) => {
          const Icon = icons[index];

          return (
            <div
              key={step.id}
              className={`border rounded-lg p-4 ${getStatusStyles(
                step.status
              )}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon size={18} className={getIconStyles(step.status)} />
                <span className="text-xs font-bold tracking-wider text-white">
                  {index + 1}. {step.label}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}