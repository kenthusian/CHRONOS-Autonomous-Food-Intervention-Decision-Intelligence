import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime, date

def train_and_predict_demand(history: list[dict], target_date: str) -> float:
    """
    Trains a Random Forest Regressor on historical demand data to predict the target date's demand.
    Extracts features like day of week and day of month for seasonality.
    """
    if not history:
        return 0.0
        
    df = pd.DataFrame(history)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date")
    
    # Feature Engineering
    df["day_of_week"] = df["date"].dt.dayofweek
    df["day_of_month"] = df["date"].dt.day
    df["is_weekend"] = df["day_of_week"].apply(lambda x: 1 if x >= 5 else 0)
    
    X = df[["day_of_week", "day_of_month", "is_weekend"]]
    y = df["quantity_sold"]
    
    if len(df) < 3:
        # Not enough data for a robust ML model, fallback to mean
        return float(y.mean())
        
    model = RandomForestRegressor(n_estimators=50, random_state=42)
    model.fit(X, y)
    
    # Predict for target_date
    target_dt = pd.to_datetime(target_date)
    X_target = pd.DataFrame([{
        "day_of_week": target_dt.dayofweek,
        "day_of_month": target_dt.day,
        "is_weekend": 1 if target_dt.dayofweek >= 5 else 0
    }])
    
    prediction = model.predict(X_target)[0]
    return float(prediction)
