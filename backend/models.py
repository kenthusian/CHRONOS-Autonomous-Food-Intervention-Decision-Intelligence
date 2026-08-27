from typing import Dict, List
from pydantic import BaseModel, Field


class DecisionRequest(BaseModel):
    product_name: str
    days_remaining: int = Field(..., ge=0)
    quantity_kg: float = Field(..., gt=0)

    demand_multiplier: float = Field(default=1.0, gt=0)
    temperature_anomaly: float = Field(default=0.0, ge=0)
    logistics_delay_hours: float = Field(default=0.0, ge=0)


class RiskAssessment(BaseModel):
    risk_score: float
    risk_level: str
    confidence: float
    factors: Dict[str, float]


class ActionSimulation(BaseModel):
    action: str
    predicted_waste_percent: float
    predicted_value_recovery: float
    operational_cost: float
    operational_risk: str
    overall_score: float
    explanation: str


class DecisionResponse(BaseModel):
    product_name: str
    risk_assessment: RiskAssessment
    alternatives: List[ActionSimulation]
    recommended_action: str
    reasoning: List[str]