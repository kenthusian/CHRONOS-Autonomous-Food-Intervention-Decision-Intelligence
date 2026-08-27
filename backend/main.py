from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import (
    DecisionRequest,
    DecisionResponse,
)
from chronos.decision_engine import make_decision


app = FastAPI(
    title="CHRONOS Autonomous Food Intervention API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {
        "status": "online",
        "system": "CHRONOS Decision Intelligence",
    }


@app.post("/decision", response_model=DecisionResponse)
def create_decision(request: DecisionRequest):
    return make_decision(request)


# Compatibility endpoint for the existing frontend.
@app.post("/predict-risk")
def predict_risk(request: DecisionRequest):
    result = make_decision(request)

    return {
        "product_name": request.product_name,
        "risk_score": result["risk_assessment"]["risk_score"],
        "risk_level": result["risk_assessment"]["risk_level"],
        "confidence": result["risk_assessment"]["confidence"],
        "factors": result["risk_assessment"]["factors"],
        "recommended_action": result["recommended_action"],
    }