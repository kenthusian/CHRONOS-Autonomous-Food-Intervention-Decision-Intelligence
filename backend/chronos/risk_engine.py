from models import DecisionRequest


def assess_risk(request: DecisionRequest) -> dict:
    # Expiry pressure: becomes stronger as days remaining decrease
    expiry_risk = max(0, min(100, (7 - request.days_remaining) / 7 * 100))

    # Weak demand increases the probability of unsold inventory
    demand_risk = max(
        0,
        min(100, (1 - request.demand_multiplier) * 100)
    )

    # Temperature anomalies accelerate deterioration
    temperature_risk = max(
        0,
        min(100, request.temperature_anomaly * 15)
    )

    # Logistics delays increase operational exposure
    logistics_risk = max(
        0,
        min(100, request.logistics_delay_hours * 4)
    )

    risk_score = (
        expiry_risk * 0.40
        + demand_risk * 0.25
        + temperature_risk * 0.20
        + logistics_risk * 0.15
    )

    risk_score = round(max(0, min(100, risk_score)), 2)

    if risk_score < 25:
        risk_level = "low"
    elif risk_score < 50:
        risk_level = "medium"
    elif risk_score < 75:
        risk_level = "high"
    else:
        risk_level = "critical"

    # Confidence increases when more meaningful risk signals are present.
    active_signals = sum(
        score > 0
        for score in [
            expiry_risk,
            demand_risk,
            temperature_risk,
            logistics_risk,
        ]
    )

    confidence = min(95, 70 + active_signals * 5)

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "confidence": confidence,
        "factors": {
            "expiry_risk": round(expiry_risk, 2),
            "demand_risk": round(demand_risk, 2),
            "temperature_risk": round(temperature_risk, 2),
            "logistics_risk": round(logistics_risk, 2),
        },
    }