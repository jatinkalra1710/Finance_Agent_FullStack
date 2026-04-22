import os
import logging
from datetime import datetime
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
from tavily import TavilyClient
from crewai.tools import tool
from crewai import Agent, Task, Crew, Process

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI App
app = FastAPI(
    title="AI Stock Analyst API - Enterprise Edition",
    description="7-Agent Institutional Intelligence Engine for deep equity research.",
    version="4.1.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
MODEL = "gemini/gemini-2.5-flash"
tavily_client = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY", ""))

# --- Pydantic Models ---
class AnalyzeRequest(BaseModel):
    ticker: str
    company_name: str

class AnalyzeResponse(BaseModel):
    ticker: str
    report: str
    metrics: dict  
    timestamp: str 

# --- Health Check ---
@app.get("/")
async def health_check():
    """Keeps the server awake and provides status"""
    return {
        "status": "Operational",
        "service": "AI Stock Analyst Core API",
        "timestamp": datetime.now().isoformat(),
        "agents_online": 7,
        "version": "4.1.0"
    }

# --- ENHANCED Screener Metrics Function ---
def fetch_screener_metrics(ticker_symbol: str) -> dict:
    """
    Fetches comprehensive financial ratios with bulletproof error handling.
    Returns a populated dict even if API fails.
    """
    try:
        logger.info(f"Fetching metrics for: {ticker_symbol}")
        
        # Auto-append .NS for Indian stocks
        if not ticker_symbol.endswith('.NS') and not ticker_symbol.endswith('.BO') and not ticker_symbol.startswith('^'):
            ticker_symbol = f"{ticker_symbol}.NS"

        stock = yf.Ticker(ticker_symbol)
        info = stock.info
        
        # Validate we got data
        if not info or len(info) < 5:
            logger.warning(f"Insufficient data from yfinance for {ticker_symbol}")
            raise ValueError("Yahoo Finance returned minimal data")

        # Helper formatters with null safety
        def fmt_pct(val):
            try: 
                if val is None: return "N/A"
                return f"{float(val) * 100:.2f}%"
            except: return "N/A"
            
        def fmt_num(val):
            try: 
                if val is None: return "N/A"
                return f"{float(val):.2f}"
            except: return "N/A"
            
        def fmt_cr(val):
            try: 
                if val is None: return "N/A"
                return f"₹{float(val) / 10000000:,.2f} Cr"
            except: return "N/A"

        def fmt_price(val):
            try:
                if val is None: return "N/A"
                return f"₹{float(val):,.2f}"
            except: return "N/A"

        def format_rating(rating):
            if not rating or not isinstance(rating, str): return "Hold"
            return rating.replace('_', ' ').title()

        # Extract all possible metrics with fallbacks
        market_cap = info.get('marketCap')
        current_price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
        day_high = info.get('dayHigh') or info.get('regularMarketDayHigh')
        day_low = info.get('dayLow') or info.get('regularMarketDayLow')
        high_52 = info.get('fiftyTwoWeekHigh')
        low_52 = info.get('fiftyTwoWeekLow')
        
        # Valuation metrics
        pe = info.get('trailingPE') or info.get('forwardPE')
        pb_ratio = info.get('priceToBook')
        ps_ratio = info.get('priceToSalesTrailing12Months')
        
        # Profitability
        dividend_yield = info.get('dividendYield') or info.get('trailingAnnualDividendYield')
        profit_margin = info.get('profitMargins')
        operating_margin = info.get('operatingMargins')
        
        # Returns
        roe = info.get('returnOnEquity')
        roa = info.get('returnOnAssets')
        
        # Debt
        debt_to_equity = info.get('debtToEquity')
        current_ratio = info.get('currentRatio')
        
        # Earnings
        eps = info.get('trailingEps')
        earnings_growth = info.get('earningsQuarterlyGrowth')
        revenue_growth = info.get('revenueGrowth')
        
        # Technical
        fifty_ma = info.get('fiftyDayAverage')
        two_hundred_ma = info.get('twoHundredDayAverage')
        beta = info.get('beta')
        
        # Analyst
        target_price = info.get('targetMeanPrice')
        analyst_rating = info.get('recommendationKey')
        num_analysts = info.get('numberOfAnalystOpinions')

        # Volume
        avg_volume = info.get('averageVolume')
        volume = info.get('volume') or info.get('regularMarketVolume')

        # Build comprehensive metrics dict
        metrics_dict = {
            "Market Cap": fmt_cr(market_cap),
            "Current Price": fmt_price(current_price),
            "Day Range": f"{fmt_price(day_low)} - {fmt_price(day_high)}" if day_high and day_low else "N/A",
            "52-Week Range": f"{fmt_price(low_52)} - {fmt_price(high_52)}" if high_52 and low_52 else "N/A",
            
            # Valuation
            "P/E Ratio": fmt_num(pe),
            "P/B Ratio": fmt_num(pb_ratio),
            "P/S Ratio": fmt_num(ps_ratio),
            
            # Profitability
            "Profit Margin": fmt_pct(profit_margin),
            "Operating Margin": fmt_pct(operating_margin),
            "Dividend Yield": fmt_pct(dividend_yield),
            
            # Returns
            "ROE": fmt_pct(roe),
            "ROA": fmt_pct(roa),
            
            # Financial Health
            "Debt/Equity": fmt_num(debt_to_equity),
            "Current Ratio": fmt_num(current_ratio),
            
            # Growth
            "EPS (TTM)": fmt_price(eps),
            "Earnings Growth": fmt_pct(earnings_growth),
            "Revenue Growth": fmt_pct(revenue_growth),
            
            # Technical
            "50-Day MA": fmt_price(fifty_ma),
            "200-Day MA": fmt_price(two_hundred_ma),
            "Beta": fmt_num(beta),
            
            # Analyst
            "Target Price": fmt_price(target_price),
            "Analyst Rating": format_rating(analyst_rating),
            "Analysts Covering": str(num_analysts) if num_analysts else "N/A",
            
            # Volume
            "Avg Volume": f"{int(avg_volume):,}" if avg_volume else "N/A",
            "Today's Volume": f"{int(volume):,}" if volume else "N/A",
        }

        # Filter out completely empty rows (all N/A)
        metrics_dict = {k: v for k, v in metrics_dict.items() if v != "N/A"}
        
        # Ensure we have at least some data
        if len(metrics_dict) < 3:
            logger.warning(f"Very limited data for {ticker_symbol}: {metrics_dict}")
            raise ValueError("Insufficient metrics data")

        logger.info(f"Successfully fetched {len(metrics_dict)} metrics for {ticker_symbol}")
        return metrics_dict
        
    except Exception as e:
        logger.error(f"Screener Metrics Error for {ticker_symbol}: {str(e)}")
        
        # Return user-friendly error instead of empty dict
        return {
            "Status": "Data Unavailable",
            "Ticker": ticker_symbol,
            "Action": "Verify symbol or try again",
            "Error": "API timeout or invalid ticker"
        }

# --- Instant Metrics Endpoint ---
@app.get("/api/metrics/{ticker}")
async def get_metrics(ticker: str):
    """
    Fetches financial ratios instantly for the frontend grid.
    Always returns valid JSON, never fails completely.
    """
    try:
        logger.info(f"Metrics endpoint called for: {ticker}")
        metrics = fetch_screener_metrics(ticker)
        
        return {
            "success": True,
            "ticker": ticker,
            "metrics": metrics,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Metrics endpoint error: {str(e)}")
        
        # Return error in friendly format
        return {
            "success": False,
            "ticker": ticker,
            "metrics": {
                "Status": "API Error",
                "Message": str(e),
                "Action": "Please retry"
            },
            "timestamp": datetime.now().isoformat()
        }

# --- AI Tools ---
@tool("advanced_web_search")
def advanced_web_search(query: str) -> str:
    """Deep web search for institutional financial news"""
    try:
        today = datetime.now().strftime("%B %d, %Y")
        search_query = f"{query} stock market financial news earnings {today}"
        
        response = tavily_client.search(
            query=search_query, max_results=15, search_depth="advanced"
        )
        
        if 'results' in response:
            formatted_results = []
            for idx, result in enumerate(response['results'][:8], 1):
                formatted_results.append(
                    f"{idx}. **{result.get('title', 'N/A')}**\n"
                    f"   Source: {result.get('url', 'N/A')}\n"
                    f"   Summary: {result.get('content', 'N/A')[:350]}...\n"
                )
            return "\n".join(formatted_results)
        return str(response)
    except Exception as e:
        logger.error(f"Web search error: {str(e)}")
        return f"⚠️ Web search temporarily unavailable: {str(e)}"

@tool("comprehensive_yfinance_data")
def comprehensive_yfinance_data(ticker: str) -> str:
    """Fetches comprehensive real-time financial data"""
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="3mo")
        if hist.empty:
            return "No historical data found for this ticker."
        
        info = stock.info
        current_price = round(hist['Close'].iloc[-1], 2)
        
        if len(hist) > 1:
            prev_close = hist['Close'].iloc[-2]
            day_change = ((current_price - prev_close) / prev_close) * 100
        else:
            day_change = 0.0

        return f"""Market Data Summary for {ticker}:
        - Current Price: ₹{current_price} (Day Change: {day_change:.2f}%)
        - Market Cap: {info.get('marketCap', 'N/A')}
        - P/E Ratio: {info.get('trailingPE', 'N/A')} | Forward P/E: {info.get('forwardPE', 'N/A')}
        - 52-Week Range: ₹{info.get('fiftyTwoWeekLow', 'N/A')} - ₹{info.get('fiftyTwoWeekHigh', 'N/A')}
        - Volume: {int(hist['Volume'].iloc[-1]) if 'Volume' in hist else 'N/A'} (Avg: {info.get('averageVolume', 'N/A')})
        - Profit Margins: {info.get('profitMargins', 'N/A')}
        - Operating Margins: {info.get('operatingMargins', 'N/A')}
        - ROE: {info.get('returnOnEquity', 'N/A')}
        - Debt/Equity: {info.get('debtToEquity', 'N/A')}
        - Target Price: ₹{info.get('targetMeanPrice', 'N/A')}
        """
    except Exception as e:
        logger.error(f"YFinance tool error: {str(e)}")
        return f"❌ Data fetch failed: {str(e)}. Rely on web search."

# --- Analysis Endpoint ---
@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_stock(request: AnalyzeRequest):
    try:
        today = datetime.now().strftime("%B %d, %Y")
        ticker = request.ticker
        company_name = request.company_name
        
        # Fetch UI metrics
        ui_metrics = fetch_screener_metrics(ticker)

        # Create 7 AI Agents (keeping your original implementation)
        research_agent = Agent(
            role="Senior Global Market Research Analyst",
            goal=f"Gather comprehensive data for {company_name} ({ticker}) as of {today}",
            backstory="Elite market researcher with deep expertise in financial analysis and news gathering.",
            tools=[comprehensive_yfinance_data, advanced_web_search],
            llm=MODEL, verbose=True
        )
        
        quant_agent = Agent(
            role="Lead Quantitative Financial Engineer",
            goal="Execute rigorous fundamental analysis",
            backstory="PhD in Financial Engineering specializing in forensic accounting and deep-value investing.",
            llm=MODEL, verbose=True
        )
        
        technical_agent = Agent(
            role="Master Technical Analyst (CMT)",
            goal="Analyze price action and technical indicators",
            backstory="Chartered Market Technician with expertise in chart patterns and momentum analysis.",
            llm=MODEL, verbose=True
        )
        
        sentiment_agent = Agent(
            role="Director of Market Sentiment",
            goal="Synthesize market psychology and sentiment",
            backstory="Behavioral economist analyzing news tone and institutional positioning.",
            llm=MODEL, verbose=True
        )
        
        sector_agent = Agent(
            role="Global Sector Strategist",
            goal=f"Analyze {company_name}'s competitive moat and sector dynamics",
            backstory="Industry analyst understanding macro trends and competitive landscapes.",
            llm=MODEL, verbose=True
        )
        
        risk_agent = Agent(
            role="Chief Risk & Compliance Officer",
            goal=f"Identify top material risks for {company_name}",
            backstory="Paranoid risk officer focused on capital preservation and worst-case scenarios.",
            llm=MODEL, verbose=True
        )
        
        strategist_agent = Agent(
            role="Chief Investment Officer",
            goal="Synthesize findings into executive investment memo",
            backstory="CIO of major wealth management firm creating institutional-grade reports.",
            llm=MODEL, verbose=True
        )

        # Create tasks
        tasks = [
            Task(description=f"Gather all data for {company_name} ({ticker})", expected_output="Raw data dossier", agent=research_agent),
            Task(description=f"Fundamental analysis of {company_name}", expected_output="Fundamental report", agent=quant_agent),
            Task(description=f"Technical analysis of {company_name}", expected_output="Technical brief", agent=technical_agent),
            Task(description=f"Sentiment analysis for {company_name}", expected_output="Sentiment report", agent=sentiment_agent),
            Task(description=f"Industry positioning of {company_name}", expected_output="Sector report", agent=sector_agent),
            Task(description=f"Risk assessment for {company_name}", expected_output="Risk matrix", agent=risk_agent),
            Task(
                description=f"""Write final Executive Investment Memo for {company_name} ({ticker}).
                Structure: Executive Summary, Investment Thesis (Bull/Bear), Fundamentals, Technical, Sector, Sentiment, Risks, Verdict.
                Use Indian Rupees (₹). Professional markdown format. 1000-1500 words.""",
                expected_output="Complete investment memo in markdown",
                agent=strategist_agent
            )
        ]

        # Execute crew
        crew = Crew(
            agents=[research_agent, quant_agent, technical_agent, sentiment_agent, sector_agent, risk_agent, strategist_agent],
            tasks=tasks,
            process=Process.sequential
        )
        
        result = crew.kickoff(inputs={"company": company_name, "ticker": ticker})
        
        return AnalyzeResponse(
            ticker=ticker, 
            report=str(result), 
            metrics=ui_metrics,
            timestamp=datetime.now().strftime("%b %d, %Y - %I:%M %p IST")
        )
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
