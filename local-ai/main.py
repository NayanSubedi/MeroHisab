from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
import numbers
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from bson.objectid import ObjectId

# Load .env mapping
dotenv_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
load_dotenv(dotenv_path)

DATABASE_URL = os.environ.get("DATABASE_URL")
try:
    client = MongoClient(DATABASE_URL)
    db = client.get_database() # connects to default db parsing URI
    transactions_collections = db.transactions
except Exception as e:
    print("WARNING: Could not connect to MongoDB:", e)

app = FastAPI(title="Local AI Forecast Service")

# Allow the React frontend to run and communicate without CORS issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ForecastRequest(BaseModel):
    businessId: str
    steps: int
    granularity: str = "monthly"

class ForecastResponse(BaseModel):
    historical_labels: List[str]
    historical_incomes: List[float]
    historical_expenses: List[float]
    future_labels: List[str]
    future_incomes: List[float]
    future_expenses: List[float]

class SampleForecastResponse(BaseModel):
    historical_incomes: List[float]
    historical_expenses: List[float]
    future_incomes: List[float]
    future_expenses: List[float]

@app.post("/forecast", response_model=ForecastResponse)
def get_forecast(request: ForecastRequest):
    try:
        businessId = request.businessId
        steps = request.steps
        granularity = request.granularity
        

        query = {"businessId": businessId}
        # In case the database stores it as ObjectId
        if hasattr(ObjectId, "is_valid") and ObjectId.is_valid(businessId):
            query = {"$or": [{"businessId": businessId}, {"businessId": ObjectId(businessId)}]}
             
        cursor = transactions_collections.find(query).sort("date", 1)
        raw_transactions = list(cursor)

        if len(raw_transactions) == 0:
            return {"future_incomes": [0.0]*steps, "future_expenses": [0.0]*steps}
            
        # 2. Convert to DataFrame
        df = pd.DataFrame(raw_transactions)
        
        # Ensure we have required columns
        if 'date' not in df.columns or 'type' not in df.columns or 'amount' not in df.columns:
             return {"future_incomes": [0.0]*steps, "future_expenses": [0.0]*steps}

        df['date'] = pd.to_datetime(df['date'])
        
        # Set date as index
        df.set_index('date', inplace=True)
        
        # 3. Aggregate by Granularity 
        # Map frontend granularity to pandas offset
        rule = 'ME' # default monthly
        if granularity == 'weekly': rule = 'W-MON'
        elif granularity == 'yearly': rule = 'YE'

        # Separate sales and expenses
        sales_df = df[df['type'] == 'SALES']
        exp_df = df[df['type'] == 'EXPENSE']
        
        # Resample and sum amounts
        sales_agg = sales_df['amount'].resample(rule).sum().fillna(0)
        exp_agg = exp_df['amount'].resample(rule).sum().fillna(0)
        
        # Determine the full index range spanning both constraints
        full_idx = pd.Index([])
        if not sales_agg.empty and not exp_agg.empty:
            full_idx = sales_agg.index.union(exp_agg.index)
        elif not sales_agg.empty:
            full_idx = sales_agg.index
        elif not exp_agg.empty:
            full_idx = exp_agg.index
            
        sales_agg = sales_agg.reindex(full_idx, fill_value=0).sort_index()
        exp_agg = exp_agg.reindex(full_idx, fill_value=0).sort_index()
        
        incomes = sales_agg.tolist()
        expenses = exp_agg.tolist()

        if len(incomes) == 0:
            return ForecastResponse(
                historical_labels=[], historical_incomes=[], historical_expenses=[],
                future_labels=[], future_incomes=[0.0]*steps, future_expenses=[0.0]*steps
            )

        # Apply Exponential Smoothing (Holt variant) internally using Statsmodels
        def generate_forecast(series_data):
            try:
                if len(series_data) < 2:
                    return [series_data[-1]] * steps
                model = ExponentialSmoothing(series_data, trend='add', seasonal=None, initialization_method="estimated")
                fit_model = model.fit()
                return fit_model.forecast(steps).tolist()
            except Exception as ml_err:
                print(f"StatsModels smoothing failed: {ml_err}. Falling back to naive.")
                return [series_data[-1]] * steps

        f_inc = generate_forecast(incomes)
        f_exp = generate_forecast(expenses)

        f_inc = [max(0.0, float(val)) if isinstance(val, numbers.Number) else 0.0 for val in f_inc]
        f_exp = [max(0.0, float(val)) if isinstance(val, numbers.Number) else 0.0 for val in f_exp]

        # Generate proper timeline labels
        hist_labels = []
        fmt = "%b %y" if granularity == 'monthly' else "%b %d"
        for t in full_idx:
            hist_labels.append(t.strftime(fmt))
            
        # Future labels
        future_labels = []
        if len(full_idx) > 0:
            last_dt = full_idx[-1]
            if granularity == 'monthly':
                freq = 'MS' # Month Start
            else:
                freq = 'W-MON'
                
            future_dates = pd.date_range(start=last_dt, periods=steps + 1, freq=freq)[1:]
            for fd in future_dates:
                future_labels.append(fd.strftime(fmt))
        
        # Slicing the last 6 months equivalent to what the frontend was doing
        hist_slice = -6
        return ForecastResponse(
            historical_labels=hist_labels[hist_slice:],
            historical_incomes=incomes[hist_slice:],
            historical_expenses=expenses[hist_slice:],
            future_labels=future_labels,
            future_incomes=f_inc,
            future_expenses=f_exp
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sample-forecast", response_model=SampleForecastResponse)
def get_sample_forecast(steps: int = 3):
    import random
    try:
        # Generate 18 months of historical sample data
        historical_incomes = []
        historical_expenses = []
        
        # We'll go from oldest (month -18) to newest (month 0)
        # Assuming current month is month 0, Dashain is usually around month -8 and month -20
        # Let's just create a synthetic cycle
        for i in range(18):
            is_dashain = (i % 12 == 3) # Arbitrary seasonality spike
            is_year_end = (i % 12 == 11)
            
            # Base revenue: 150k + variance
            income = 150000 + random.uniform(0, 50000)
            if is_dashain: income *= 1.4
            if is_year_end: income *= 1.25
            
            # Base expense: 90k + variance
            expense = 90000 + random.uniform(0, 20000)
            if is_dashain: expense *= 1.3
            
            historical_incomes.append(round(income, 2))
            historical_expenses.append(round(expense, 2))

        # Use the same exact Holt-Winters logic internally
        def generate_forecast(series_data):
            try:
                model = ExponentialSmoothing(series_data, trend='add', seasonal=None, initialization_method="estimated")
                fit_model = model.fit()
                return fit_model.forecast(steps).tolist()
            except Exception as ml_err:
                print(f"StatsModels smoothing failed: {ml_err}. Falling back to naive.")
                return [series_data[-1]] * steps

        f_inc = generate_forecast(historical_incomes)
        f_exp = generate_forecast(historical_expenses)

        f_inc = [max(0.0, float(val)) for val in f_inc]
        f_exp = [max(0.0, float(val)) for val in f_exp]

        return SampleForecastResponse(
            historical_incomes=historical_incomes,
            historical_expenses=historical_expenses,
            future_incomes=f_inc,
            future_expenses=f_exp
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
