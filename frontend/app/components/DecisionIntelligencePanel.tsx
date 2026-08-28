'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';

import { FoodBatch, Decision } from '@/app/types';
import {
  predictRisk,
  BackendRiskAssessment,
  RiskRequest,
} from '@/app/utils/api';

interface DecisionIntelligencePanelProps {
  batch: FoodBatch;
  decision: Decision;
  onClose: () => void;
  onLiveRiskUpdate?: (
    batchId: string,
    assessment: BackendRiskAssessment
  ) => void;
}

const getTemperatureAnomaly = (batch: FoodBatch): number => {
  return batch.temperatureDeviation ?? 0;
};

const getLogisticsDelay = (batch: FoodBatch): number => {
  return batch.logisticsDelayHours ?? 0;
};

export default function DecisionIntelligencePanel({
  batch,
  decision,
  onClose,
  onLiveRiskUpdate,
}: DecisionIntelligencePanelProps) {
  const [assessment, setAssessment] =
    useState<BackendRiskAssessment | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRiskAssessment = async () => {
    try {
      setLoading(true);
      setError(null);

      const request: RiskRequest = {
        product_name: batch.name,
        days_remaining: batch.daysRemaining,
        quantity_kg:
          batch.quantityUnit.toLowerCase() === 'kg'
            ? batch.quantity
            : batch.quantity,
        demand_multiplier: 1,
        temperature_anomaly: getTemperatureAnomaly(batch),
        logistics_delay_hours: getLogisticsDelay(batch),
      };

      const result = await predictRisk(request);

      setAssessment(result);

      if (onLiveRiskUpdate) {
        onLiveRiskUpdate(batch.id, result);
      }
    } catch (err) {
      console.error('Failed to load AI risk assessment:', err);

      setError(
        'Unable to connect to the CHRONOS AI backend. Make sure FastAPI is running on port 8000.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRiskAssessment();
  }, [batch.id]);

  const backendRiskFactors = assessment
    ? [
        {
          name: 'Expiry',
          value: assessment.factors.expiry_risk,
        },
        {
          name: 'Temperature',
          value: assessment.factors.temperature_risk,
        },
        {
          name: 'Demand',
          value: assessment.factors.demand_risk,
        },
        {
          name: 'Logistics',
          value: assessment.factors.logistics_risk,
        },
      ]
    : [];

  /*
   * This section is important:
   *
   * When the backend assessment is available, CHRONOS displays
   * the actual risk factors calculated by FastAPI.
   *
   * If the backend is unavailable, the application falls back
   * to the existing frontend decision engine.
   */
  const displayRiskFactors = assessment
    ? [
        {
          name: 'Freshness Risk',
          score: assessment.factors.expiry_risk,
          description: `${batch.daysRemaining} days remaining. Shelf-life risk calculated by the live CHRONOS AI backend.`,
        },
        {
          name: 'Demand Risk',
          score: assessment.factors.demand_risk,
          description:
            'Demand conditions evaluated using the current inventory demand signal.',
        },
        {
          name: 'Temperature Risk',
          score: assessment.factors.temperature_risk,
          description:
            'Temperature anomaly impact evaluated by the live AI risk model.',
        },
        {
          name: 'Logistics Risk',
          score: assessment.factors.logistics_risk,
          description:
            'Logistics delays and operational impact evaluated by the AI backend.',
        },
      ]
    : decision.riskFactors;

  /*
   * Backend recommendation has priority.
   * If the API is unavailable, fall back to the local decision engine.
   */
  const recommendation =
    assessment?.recommended_action ??
    decision.recommendedActionName;

  /*
   * IMPORTANT:
   * risk_score represents inventory risk.
   * It should not be incorrectly displayed as the recommendation score.
   */
  const recommendationScore = decision.recommendedActionScore;

  const recommendationExplanation = assessment
    ? `CHRONOS selected ${assessment.recommended_action} after evaluating live expiry, demand, temperature, and logistics signals through the AI risk assessment service.`
    : decision.recommendedActionExplanation;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80">
      <div className="min-h-screen bg-slate-950">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-700 px-8 py-6">
          <div>
            <h2 className="text-3xl font-bold text-white">
              Decision Intelligence
            </h2>

            <p className="mt-2 text-lg text-slate-400">
              Analyzing: {batch.name}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={32} />
          </button>
        </div>

        <div className="space-y-8 p-8">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-blue-800 bg-blue-950/30 p-8">
              <Loader2
                className="animate-spin text-blue-400"
                size={28}
              />

              <span className="text-slate-300">
                CHRONOS AI is analyzing the current inventory state...
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-800 bg-red-950/30 p-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-red-300">{error}</p>

                <button
                  onClick={loadRiskAssessment}
                  className="rounded-lg bg-red-900/40 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-900/70"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          )}

          {/* Live AI Assessment */}
          {assessment && (
            <div className="rounded-xl border border-blue-600 bg-slate-900 p-8">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-blue-950 p-3">
                    <Brain
                      size={28}
                      className="text-blue-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold text-white">
                        Live AI Risk Assessment
                      </h3>

                      <span className="rounded-full bg-green-900/60 px-3 py-1 text-sm font-medium text-green-300">
                        FASTAPI CONNECTED
                      </span>
                    </div>

                    <p className="mt-2 text-slate-400">
                      Real-time backend intelligence informing the CHRONOS
                      decision engine.
                    </p>
                  </div>
                </div>

                <button
                  onClick={loadRiskAssessment}
                  className="rounded-lg bg-slate-800 p-3 text-slate-300 transition hover:bg-slate-700"
                  title="Refresh AI assessment"
                >
                  <RefreshCw size={22} />
                </button>
              </div>

              {/* Main Backend Metrics */}
              <div className="grid gap-5 md:grid-cols-3">
                <div className="rounded-xl bg-slate-800 p-6">
                  <p className="text-sm uppercase tracking-wider text-slate-400">
                    Live Risk Score
                  </p>

                  <p className="mt-3 text-4xl font-bold text-green-400">
                    {Number.isFinite(assessment.risk_score)
                      ? assessment.risk_score.toFixed(1)
                      : 'N/A'}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800 p-6">
                  <p className="text-sm uppercase tracking-wider text-slate-400">
                    Risk Level
                  </p>

                  <p className="mt-3 text-2xl font-bold capitalize text-green-400">
                    {assessment.risk_level}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800 p-6">
                  <p className="text-sm uppercase tracking-wider text-slate-400">
                    Model Confidence
                  </p>

                  <p className="mt-3 text-4xl font-bold text-blue-400">
                    {Number.isFinite(Number(assessment.confidence))
                      ? Number(assessment.confidence).toFixed(1)
                      : '0.0'}
                    %
                  </p>
                </div>
              </div>

              {/* Backend Recommendation */}
              <div className="mt-6 rounded-xl border border-blue-700 bg-blue-950/30 p-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">
                  Backend Recommendation
                </p>

                <p className="mt-3 text-2xl font-bold text-white">
                  {assessment.recommended_action}
                </p>
              </div>

              {/* Backend Risk Factors */}
              <div className="mt-6">
                <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Backend Risk Factors
                </p>

                <div className="grid gap-4 md:grid-cols-4">
                  {backendRiskFactors.map((factor) => (
                    <div
                      key={factor.name}
                      className="rounded-xl bg-slate-800 p-5"
                    >
                      <p className="text-slate-400">
                        {factor.name}
                      </p>

                      <p className="mt-3 text-2xl font-bold text-white">
                        {Number.isFinite(Number(factor.value))
                          ? Number(factor.value).toFixed(0)
                          : '0'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Final CHRONOS Recommendation */}
          {!loading && (
            <div className="rounded-xl border border-green-700 bg-green-950/30 p-8">
              <div className="flex items-center justify-between gap-8">
                <div className="flex items-start gap-4">
                  <CheckCircle2
                    size={36}
                    className="mt-1 text-green-400"
                  />

                  <div>
                    <h3 className="text-3xl font-bold text-white">
                      {recommendation}
                    </h3>

                    <p className="mt-4 max-w-3xl text-lg text-slate-300">
                      {recommendationExplanation}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm uppercase tracking-wider text-green-300">
                    Recommendation Score
                  </p>

                  <p className="mt-3 text-4xl font-bold text-green-300">
                    {Number.isFinite(recommendationScore)
                      ? Number(recommendationScore).toFixed(1)
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Key Risk Factors */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-8">
            <div className="mb-6 flex items-center gap-3">
              <AlertTriangle
                size={30}
                className="text-orange-400"
              />

              <h3 className="text-2xl font-bold text-white">
                Key Risk Factors
              </h3>
            </div>

            <div className="space-y-6">
              {displayRiskFactors.map((factor) => {
                const numericScore = Number(factor.score);

                const safeScore = Number.isFinite(numericScore)
                  ? Math.max(0, Math.min(100, numericScore))
                  : 0;

                return (
                  <div key={factor.name}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-white">
                          {factor.name}
                        </h4>

                        <p className="mt-1 text-sm text-slate-400">
                          {factor.description}
                        </p>
                      </div>

                      <span className="text-lg font-bold text-white">
                        {safeScore.toFixed(0)}
                      </span>
                    </div>

                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all duration-500"
                        style={{ width: `${safeScore}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Alternatives */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-8">
            <div className="mb-6 flex items-center gap-3">
              <ArrowUpRight
                size={30}
                className="text-blue-400"
              />

              <h3 className="text-2xl font-bold text-white">
                Action Alternatives
              </h3>
            </div>

            <div className="space-y-4">
              {decision.alternatives.map((alternative) => (
                <div
                  key={alternative.id}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-6 transition hover:border-blue-700"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xl font-bold text-white">
                        {alternative.name}
                      </h4>

                      <p className="mt-2 text-slate-400">
                        {alternative.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-6 text-sm">
                        <span className="text-slate-400">
                          Waste reduction:{' '}
                          <span className="font-semibold text-white">
                            {alternative.wasteReductionPercent}%
                          </span>
                        </span>

                        <span className="text-slate-400">
                          Operational risk:{' '}
                          <span className="font-semibold text-green-400">
                            {alternative.operationalRiskLevel}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="ml-6 text-right">
                      <p className="text-xs uppercase tracking-wider text-slate-400">
                        Score
                      </p>

                      <p className="mt-2 text-3xl font-bold text-white">
                        {Number.isFinite(
                          Number(alternative.overallScore)
                        )
                          ? Number(alternative.overallScore).toFixed(1)
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}