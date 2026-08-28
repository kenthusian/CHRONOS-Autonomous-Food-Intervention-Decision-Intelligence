export interface RiskPredictionRequest {
  product_name: string;
  days_remaining: number;
  temperature_anomaly: number;
  demand_multiplier: number;
  logistics_delay_hours: number;
  quantity_kg: number;
}

export interface RiskFactors {
  expiry_risk: number;
  temperature_risk: number;
  demand_risk: number;
  logistics_risk: number;
}

export interface RiskPredictionResponse {
  product_name: string;
  risk_score: number;
  risk_level: string;
  confidence: number;
  factors: RiskFactors;
  recommended_action: string;
}

const API_BASE_URL = 'http://127.0.0.1:8000';

export async function predictRisk(
  data: RiskPredictionRequest
): Promise<RiskPredictionResponse> {
  const response = await fetch(`${API_BASE_URL}/predict-risk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Risk prediction failed with status ${response.status}`);
  }

  return response.json();
}