export interface RiskRequest {
  product_name: string;
  days_remaining: number;
  quantity_kg: number;
  demand_multiplier: number;
  temperature_anomaly: number;
  logistics_delay_hours: number;
}

export interface BackendRiskAssessment {
  product_name: string;
  risk_score: number;
  risk_level: string;
  confidence: number;
  factors: {
    expiry_risk: number;
    demand_risk: number;
    temperature_risk: number;
    logistics_risk: number;
  };
  recommended_action: string;
}

const API_BASE_URL = 'http://127.0.0.1:8000';

export async function predictRisk(
  data: RiskRequest
): Promise<BackendRiskAssessment> {
  const response = await fetch(`${API_BASE_URL}/predict-risk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to get AI risk prediction');
  }

  return response.json();
}