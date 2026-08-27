'use client';

import React, { useState } from 'react';
import { Decision, FoodBatch } from '@/app/types';
import {
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Zap,
  X,
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

  const recommendedAlternative = decision.alternatives[0]; // Already sorted by score

  const handleExecute = () => {
    if (selectedAlternativeId) {
      executeDecision(decision, selectedAlternativeId);
      setHasExecuted(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Decision Intelligence
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Analyzing: {batch.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Recommended Action Summary */}
          <div className="bg-emerald-900 border border-emerald-700 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="text-emerald-400 flex-shrink-0 mt-1" size={24} />
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
                <p className="text-emerald-200 text-sm mb-4">
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
                <div key={idx} className="flex items-center justify-between">
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
                        className={`h-2 rounded-full transition-all ${
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

          {/* Alternatives Comparison */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-400" />
              Action Alternatives (Select to Compare)
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
                      <p className="font-semibold text-white">{alt.name}</p>
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

          {/* What-If Comparison */}
          {selectedAlternative && selectedAlternativeId !== recommendedAlternative.id && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                What-If Analysis: {selectedAlternative.name}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Comparison: Recommended vs Selected */}
                <ComparisonMetric
                  label="Overall Score"
                  recommended={recommendedAlternative.overallScore}
                  alternative={selectedAlternative.overallScore}
                />
                <ComparisonMetric
                  label="Waste Reduction"
                  recommended={recommendedAlternative.wasteReductionPercent}
                  alternative={selectedAlternative.wasteReductionPercent}
                  suffix="%"
                />
                <ComparisonMetric
                  label="Value Recovery"
                  recommended={recommendedAlternative.valueRecovery}
                  alternative={selectedAlternative.valueRecovery}
                  suffix="%"
                />
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                    Operational Risk
                  </p>
                  <div className="grid grid-cols-2 text-center gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Recommended</p>
                      <p className="text-sm font-semibold text-emerald-400 capitalize">
                        {recommendedAlternative.operationalRiskLevel}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Selected</p>
                      <p className={`text-sm font-semibold capitalize ${
                        selectedAlternative.operationalRiskLevel === 'high'
                          ? 'text-red-400'
                          : selectedAlternative.operationalRiskLevel === 'medium'
                          ? 'text-yellow-400'
                          : 'text-emerald-400'
                      }`}>
                        {selectedAlternative.operationalRiskLevel}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Projected Outcomes */}
          {selectedAlternative && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap size={20} className="text-yellow-400" />
                Projected Outcome
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
                    Waste Reduction
                  </p>
                  <p className="text-3xl font-bold text-emerald-400">
                    {selectedAlternative.wasteReductionPercent}%
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Of batch can be saved
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
                    Value Recovery
                  </p>
                  <p className="text-3xl font-bold text-blue-400">
                    {selectedAlternative.valueRecovery}%
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Of original value
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
                    Risk Level
                  </p>
                  <p className={`text-3xl font-bold capitalize ${
                    selectedAlternative.operationalRiskLevel === 'high'
                      ? 'text-red-400'
                      : selectedAlternative.operationalRiskLevel === 'medium'
                      ? 'text-yellow-400'
                      : 'text-emerald-400'
                  }`}>
                    {selectedAlternative.operationalRiskLevel}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mt-4">
                {selectedAlternative.explanation}
              </p>
            </div>
          )}

          {/* Execution Controls */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExecute}
              disabled={hasExecuted}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                hasExecuted
                  ? 'bg-emerald-900 text-emerald-300'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {hasExecuted ? (
                <>
                  <CheckCircle size={20} />
                  Decision Executed
                </>
              ) : (
                <>
                  <Zap size={20} />
                  Execute Decision
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ComparisonMetricProps {
  label: string;
  recommended: number;
  alternative: number;
  suffix?: string;
}

function ComparisonMetric({
  label,
  recommended,
  alternative,
  suffix = '',
}: ComparisonMetricProps) {
  const isBetter = alternative > recommended;
  const diff = alternative - recommended;

  return (
    <div className="bg-slate-700 rounded-lg p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
        {label}
      </p>
      <div className="grid grid-cols-2 text-center gap-4">
        <div>
          <p className="text-xs text-slate-400 mb-1">Recommended</p>
          <p className="text-2xl font-bold text-emerald-400">
            {recommended.toFixed(0)}{suffix}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Selected</p>
          <p className="text-2xl font-bold text-white">
            {alternative.toFixed(0)}{suffix}
          </p>
          <p className={`text-xs mt-1 font-semibold ${
            isBetter ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {isBetter ? '+' : ''}{diff.toFixed(0)}{suffix}
          </p>
        </div>
      </div>
    </div>
  );
}
