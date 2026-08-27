'use client';

import AgentDecisionPipeline from './AgentDecisionPipeline';
import React, { useState } from 'react';
import { Decision, FoodBatch } from '@/app/types';
import {
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Zap,
  X,
  ShieldCheck,
  Activity,
  Clock,
  BarChart3,
} from 'lucide-react';
import { useWorldState } from '@/app/context/WorldContext';

interface DecisionIntelligencePanelProps {
  batch: FoodBatch;
  decision: Decision;
  onClose: () => void;
}

export default function DecisionIntelligencePanel({
  batch,
  decision,
  onClose,
}: DecisionIntelligencePanelProps) {
  const { executeDecision } = useWorldState();

  const [selectedAlternativeId, setSelectedAlternativeId] = useState(
    decision.alternatives[0]?.id
  );

  const [hasExecuted, setHasExecuted] = useState(false);

  const selectedAlternative = decision.alternatives.find(
    (alt) => alt.id === selectedAlternativeId
  );

  const recommendedAlternative = decision.alternatives[0];

  const estimatedPostExecutionRisk = selectedAlternative
    ? Math.max(
        0,
        Math.round(
          batch.riskScore -
            selectedAlternative.wasteReductionPercent * 0.55
        )
      )
    : batch.riskScore;

  const riskReduction = Math.max(
    0,
    batch.riskScore - estimatedPostExecutionRisk
  );

  const getRiskLabel = (score: number) => {
    if (score >= 75) return 'Critical';
    if (score >= 50) return 'High';
    if (score >= 25) return 'Medium';
    return 'Low';
  };

  const handleExecute = () => {
    if (!selectedAlternativeId || hasExecuted) return;

    executeDecision(decision, selectedAlternativeId);

    // IMPORTANT:
    // Do NOT call onClose() here.
    // Keep the modal open and move to verification.
    setHasExecuted(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Decision Intelligence
            </h2>

            <p className="text-sm text-slate-400 mt-1">
              {hasExecuted
                ? `Verification Report: ${batch.name}`
                : `Analyzing: ${batch.name}`}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
            aria-label="Close decision panel"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* AGENT DECISION PIPELINE */}
          <AgentDecisionPipeline
            batchName={batch.name}
            riskScore={batch.riskScore}
            recommendedAction={recommendedAlternative.name}
            alternativesCount={decision.alternatives.length}
            isExecuted={hasExecuted}
          />

          {/* ================= POST-EXECUTION VIEW ================= */}
          {hasExecuted && selectedAlternative && (
            <div className="space-y-6">
              <div className="bg-emerald-950 border border-emerald-700 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <ShieldCheck
                    className="text-emerald-400 flex-shrink-0 mt-1"
                    size={32}
                  />

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white">
                        Intervention Executed Successfully
                      </h3>

                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-900 text-emerald-300">
                        VERIFIED
                      </span>
                    </div>

                    <p className="text-sm text-emerald-200 mt-2">
                      CHRONOS executed the selected intervention and entered the
                      verification stage to evaluate the projected operational
                      outcome.
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <VerificationMetric
                  icon={<Activity size={20} className="text-orange-400" />}
                  label="Risk Score"
                  value={`${batch.riskScore} → ${estimatedPostExecutionRisk}`}
                  description={`${riskReduction} point projected reduction`}
                />

                <VerificationMetric
                  icon={<TrendingUp size={20} className="text-emerald-400" />}
                  label="Food Recovery"
                  value={`${selectedAlternative.wasteReductionPercent}%`}
                  description="Estimated batch recovery"
                />

                <VerificationMetric
                  icon={<BarChart3 size={20} className="text-blue-400" />}
                  label="Value Recovery"
                  value={`${selectedAlternative.valueRecovery}%`}
                  description="Projected economic value retained"
                />
              </div>

              {/* Verification Result */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-5">
                  <CheckCircle size={22} className="text-emerald-400" />

                  <h3 className="text-lg font-semibold text-white">
                    Autonomous Verification Result
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-slate-700 rounded-lg p-5">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                      Intervention Applied
                    </p>

                    <p className="text-lg font-bold text-white mt-2">
                      {selectedAlternative.name}
                    </p>

                    <p className="text-sm text-slate-300 mt-3">
                      The selected intervention has been recorded in the
                      operational decision history.
                    </p>
                  </div>

                  <div className="bg-slate-700 rounded-lg p-5">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                      Updated Risk Status
                    </p>

                    <p className="text-lg font-bold text-emerald-400 mt-2">
                      {getRiskLabel(estimatedPostExecutionRisk)}
                    </p>

                    <p className="text-sm text-slate-300 mt-3">
                      The agent projects a lower operational risk following the
                      intervention.
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-5 border-t border-slate-700 flex items-center gap-3">
                  <Clock size={18} className="text-blue-400" />

                  <p className="text-sm text-slate-300">
                    <span className="font-semibold text-white">
                      Next autonomous step:
                    </span>{' '}
                    Monitor the intervention outcome and trigger a new decision
                    cycle if conditions change.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} />
                Close Verification Report
              </button>
            </div>
          )}

          {/* ================= PRE-EXECUTION VIEW ================= */}
          {!hasExecuted && (
            <>
              {/* Recommended Action */}
              <div className="bg-emerald-900 border border-emerald-700 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <CheckCircle
                    className="text-emerald-400 flex-shrink-0 mt-1"
                    size={24}
                  />

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-white">
                        {recommendedAlternative.name}
                      </h3>

                      <div className="text-right">
                        <p className="text-xs text-emerald-300 uppercase tracking-wider font-semibold">
                          Recommendation Score
                        </p>

                        <p className="text-3xl font-bold text-emerald-300">
                          {recommendedAlternative.overallScore.toFixed(0)}
                        </p>
                      </div>
                    </div>

                    <p className="text-emerald-200 text-sm">
                      {decision.recommendedActionExplanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Risk Factors */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertCircle size={20} className="text-orange-400" />
                  Key Risk Factors
                </h3>

                <div className="space-y-3">
                  {decision.riskFactors.map((factor, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">
                          {factor.name}
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                          {factor.description}
                        </p>
                      </div>

                      <div className="ml-4 flex items-center gap-3">
                        <div className="w-24 bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              factor.score >= 70
                                ? 'bg-red-500'
                                : factor.score >= 40
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                            }`}
                            style={{ width: `${factor.score}%` }}
                          />
                        </div>

                        <span className="text-sm font-semibold text-white min-w-12 text-right">
                          {Math.round(factor.score)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alternatives */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-blue-400" />
                  Action Alternatives
                </h3>

                <div className="space-y-2">
                  {decision.alternatives.map((alt) => (
                    <button
                      key={alt.id}
                      onClick={() => setSelectedAlternativeId(alt.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedAlternativeId === alt.id
                          ? 'border-blue-500 bg-blue-900 bg-opacity-20'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-white">
                            {alt.name}
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            {alt.description}
                          </p>
                        </div>

                        <div className="text-right ml-4">
                          <p className="text-xs text-slate-400 uppercase tracking-wider">
                            Score
                          </p>

                          <p className="text-2xl font-bold text-white">
                            {alt.overallScore.toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Projected Outcome */}
              {selectedAlternative && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Zap size={20} className="text-yellow-400" />
                    Projected Outcome
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-700 rounded-lg p-4">
                      <p className="text-xs text-slate-400 uppercase tracking-wider">
                        Waste Reduction
                      </p>

                      <p className="text-3xl font-bold text-emerald-400 mt-3">
                        {selectedAlternative.wasteReductionPercent}%
                      </p>
                    </div>

                    <div className="bg-slate-700 rounded-lg p-4">
                      <p className="text-xs text-slate-400 uppercase tracking-wider">
                        Value Recovery
                      </p>

                      <p className="text-3xl font-bold text-blue-400 mt-3">
                        {selectedAlternative.valueRecovery}%
                      </p>
                    </div>

                    <div className="bg-slate-700 rounded-lg p-4">
                      <p className="text-xs text-slate-400 uppercase tracking-wider">
                        Risk Level
                      </p>

                      <p className="text-3xl font-bold text-yellow-400 mt-3 capitalize">
                        {selectedAlternative.operationalRiskLevel}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 mt-4">
                    {selectedAlternative.explanation}
                  </p>
                </div>
              )}

              {/* Controls */}
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium"
                >
                  Cancel
                </button>

                <button
                  onClick={handleExecute}
                  className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-2"
                >
                  <Zap size={20} />
                  Execute Decision
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface VerificationMetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}

function VerificationMetric({
  icon,
  label,
  value,
  description,
}: VerificationMetricProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
      <div className="flex items-center gap-2 text-slate-300">
        {icon}
        <p className="text-xs uppercase tracking-wider">{label}</p>
      </div>

      <p className="text-2xl font-bold text-white mt-4">{value}</p>

      <p className="text-xs text-slate-400 mt-2">{description}</p>
    </div>
  );
}