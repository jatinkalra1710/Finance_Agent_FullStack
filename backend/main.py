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

# --- BULLETPROOF Screener Metrics Function ---
def fetch_screener_metrics(ticker_symbol: str) -> dict:
    """
    Fetches comprehensive financial ratios using fast_info and history 
    to bypass Yahoo Finance's strict .info bot blockers.
    """
    try:
        logger.info(f"Fetching metrics for: {ticker_symbol}")
        
        # Auto-append .NS for Indian stocks
        if not ticker_symbol.endswith('.NS') and not ticker_symbol.endswith('.BO') and not ticker_symbol.startswith('^'):
            ticker_symbol = f"{ticker_symbol}.NS"

        stock = yf.Ticker(ticker_symbol)
        
        # Use fast_info and history as they are rarely blocked by Yahoo
        fast_info = stock.fast_info
        hist = stock.history(period="1mo")

        # We TRY to get info, but we do NOT rely on it
        try:
            info = stock.info
        except Exception:
            info = {}

        # Helper formatters with null safety
        def fmt_pct(val):
            try: return f"{float(val) * 100:.2f}%" if val else "N/A"
            except: return "N/A"
            
        def fmt_num(val):
            try: return f"{float(val):.2f}" if val else "N/A"
            except: return "N/A"
            
        def fmt_cr(val):
            try: return f"₹{float(val) / 10000000:,.2f} Cr" if val else "N/A"
            except: return "N/A"

        def fmt_price(val):
            try: return f"₹{float(val):,.2f}" if val else "N/A"
            except: return "N/A"

        metrics_dict = {}

        # 1. Price & Volume (100% Reliable via History)
        if not hist.empty:
            current_price = hist['Close'].iloc[-1]
            day_high = hist['High'].iloc[-1]
            day_low = hist['Low'].iloc[-1]
            volume = hist['Volume'].iloc[-1]
            
            metrics_dict["Current Price"] = fmt_price(current_price)
            metrics_dict["Day Range"] = f"{fmt_price(day_low)} - {fmt_price(day_high)}"
            metrics_dict["Today's Volume"] = f"{int(volume):,}" if volume else "N/A"

        # 2. Fast Info (Highly Reliable)
        try:
            if hasattr(fast_info, 'market_cap') and fast_info.market_cap:
                metrics_dict["Market Cap"] = fmt_cr(fast_info.market_cap)
            if hasattr(fast_info, 'year_high') and hasattr(fast_info, 'year_low'):
                metrics_dict["52-Week Range"] = f"{fmt_price(fast_info.year_low)} - {fmt_price(fast_info.year_high)}"
            if hasattr(fast_info, 'fifty_day_average') and fast_info.fifty_day_average:
                metrics_dict["50-Day MA"] = fmt_price(fast_info.fifty_day_average)
            if hasattr(fast_info, 'two_hundred_day_average') and fast_info.two_hundred_day_average:
                metrics_dict["200-Day MA"] = fmt_price(fast_info.two_hundred_day_average)
        except Exception as e:
            logger.warning(f"Fast info extraction failed: {str(e)}")

        # 3. Standard Info (Flaky, often blocked)
        if info:
            pe = info.get('trailingPE') or info.get('forwardPE')
            if pe: metrics_dict["P/E Ratio"] = fmt_num(pe)
            
            pb = info.get('priceToBook')
            if pb: metrics_dict["P/B Ratio"] = fmt_num(pb)
            
            roe = info.get('returnOnEquity')
            if roe: metrics_dict["ROE"] = fmt_pct(roe)
            
            div = info.get('dividendYield') or info.get('trailingAnnualDividendYield')
            if div: metrics_dict["Dividend Yield"] = fmt_pct(div)
            
            debt = info.get('debtToEquity')
            if debt: metrics_dict["Debt/Equity"] = fmt_num(debt)

            eps = info.get('trailingEps')
            if eps: metrics_dict["EPS (TTM)"] = fmt_price(eps)

            target = info.get('targetMeanPrice')
            if target: metrics_dict["Target Price"] = fmt_price(target)
            
            rating = info.get('recommendationKey')
            if rating: metrics_dict["Analyst Rating"] = str(rating).replace('_', ' ').title()

        # If literally nothing worked, trigger error
        if len(metrics_dict) < 2:
            raise ValueError("Insufficient metrics data retrieved")

        logger.info(f"Successfully fetched {len(metrics_dict)} metrics for {ticker_symbol}")
        return metrics_dict
        
    except Exception as e:
        logger.error(f"Screener Metrics Error for {ticker_symbol}: {str(e)}")
        # Return user-friendly error instead of empty dict
        return {
            "Status": "Data Unavailable",
            "Message": "Yahoo Finance is blocking requests for this ticker.",
            "Action": "Check symbol or try again"
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

        # Create 7 AI Agents
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
