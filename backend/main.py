from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="CHRONOS AI Backend",
    description="Autonomous Food Intervention and Decision Intelligence API",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RiskPredictionRequest(BaseModel):
    product_name: str = Field(..., min_length=2)
    days_remaining: float = Field(..., ge=0)
    temperature_anomaly: float = Field(default=0, ge=0)
    demand_multiplier: float = Field(default=1.0, gt=0)
    logistics_delay_hours: float = Field(default=0, ge=0)
    quantity_kg: float = Field(default=0, ge=0)


class RiskPredictionResponse(BaseModel):
    product_name: str
    risk_score: float
    risk_level: str
    confidence: float
    factors: dict[str, float]
    recommended_action: str


def calculate_risk(data: RiskPredictionRequest):
    # Base expiry risk: fewer days remaining means higher risk.
    expiry_risk = max(0, 100 - (data.days_remaining * 12))

    # Temperature anomaly increases spoilage risk.
    temperature_risk = min(data.temperature_anomaly * 15, 100)

    # Low demand increases the chance of inventory remaining unsold.
    demand_risk = max(0, (1.2 - data.demand_multiplier) * 70)

    # Delays increase operational pressure.
    logistics_risk = min(data.logistics_delay_hours * 4, 100)

    # Weighted combined score.
    risk_score = (
        expiry_risk * 0.45
        + temperature_risk * 0.25
        + demand_risk * 0.20
        + logistics_risk * 0.10
    )

    risk_score = round(min(100, max(0, risk_score)), 2)

    if risk_score >= 75:
        risk_level = "critical"
        action = "Emergency processing or immediate redistribution"
    elif risk_score >= 55:
        risk_level = "high"
        action = "Prioritize promotion and rapid redistribution"
    elif risk_score >= 30:
        risk_level = "medium"
        action = "Monitor closely and consider targeted promotion"
    else:
        risk_level = "low"
        action = "Continue normal monitoring"

    # Confidence is currently a transparent heuristic.
    confidence = round(
        min(
            95,
            70
            + min(data.quantity_kg / 1000, 10)
            + min(abs(data.demand_multiplier - 1) * 10, 10),
        ),
        2,
    )

    factors = {
        "expiry_risk": round(expiry_risk, 2),
        "temperature_risk": round(temperature_risk, 2),
        "demand_risk": round(demand_risk, 2),
        "logistics_risk": round(logistics_risk, 2),
    }

    return {
        "product_name": data.product_name,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "confidence": confidence,
        "factors": factors,
        "recommended_action": action,
    }


@app.get("/")
def root():
    return {
        "message": "CHRONOS AI Backend is running",
        "status": "operational",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "chronos-ai-backend",
    }


@app.post("/predict-risk", response_model=RiskPredictionResponse)
def predict_risk(data: RiskPredictionRequest):
    return calculate_risk(data)