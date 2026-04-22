import os
import logging
import requests
from bs4 import BeautifulSoup
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
    version="5.0.0"
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
        "version": "5.0.0"
    }

# --- NEW: SCREENER.IN SCRAPER ---
def fetch_screener_in_data(ticker: str) -> dict:
    """Scrapes highly accurate Indian stock data directly from Screener.in"""
    try:
        # Clean ticker for Screener.in URL (e.g., RELIANCE.NS -> RELIANCE)
        clean_ticker = ticker.replace('.NS', '').replace('.BO', '').split('.')[0]
        url = f"https://www.screener.in/company/{clean_ticker}/consolidated/"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code != 200:
            # Fallback to standalone page if consolidated fails
            url = f"https://www.screener.in/company/{clean_ticker}/"
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code != 200:
                raise ValueError("Screener.in page not found")

        soup = BeautifulSoup(response.text, 'html.parser')
        metrics = {}
        
        # Extract from the Top Ratios unordered list
        ul = soup.find('ul', id='top-ratios')
        if not ul:
            raise ValueError("Could not find ratios grid on Screener")
            
        li_items = ul.find_all('li')
        for li in li_items:
            name_span = li.find('span', class_='name')
            value_span = li.find('span', class_='number')
            
            if name_span and value_span:
                name = name_span.text.strip()
                value = value_span.text.strip()
                
                if 'Market Cap' in name: metrics['Market Cap'] = f"₹{value} Cr"
                elif 'Current Price' in name: metrics['Current Price'] = f"₹{value}"
                elif 'High / Low' in name: metrics['52-Week Range'] = f"₹{value.replace(' ', '')}"
                elif 'Stock P/E' in name: metrics['P/E Ratio'] = value
                elif 'Book Value' in name: metrics['P/B Ratio'] = value
                elif 'Dividend Yield' in name: metrics['Dividend Yield'] = f"{value}%"
                elif 'ROCE' in name: metrics['ROCE (Est)'] = f"{value}%"
                elif 'ROE' in name: metrics['ROE'] = f"{value}%"
                elif 'Face Value' in name: metrics['Face Value'] = f"₹{value}"
        
        if len(metrics) > 0:
            logger.info(f"Successfully scraped Screener.in for {clean_ticker}")
            return metrics
        else:
            raise ValueError("Parsed empty data from Screener")
            
    except Exception as e:
        logger.error(f"Screener scraping failed for {ticker}: {str(e)}")
        return {}

# --- YFINANCE FALLBACK ---
def fetch_yfinance_metrics(ticker_symbol: str) -> dict:
    """Fallback for Global indices or if Screener.in fails"""
    try:
        stock = yf.Ticker(ticker_symbol)
        fast_info = stock.fast_info
        hist = stock.history(period="1mo")
        
        metrics = {}
        if not hist.empty:
            metrics["Current Price"] = f"₹{hist['Close'].iloc[-1]:.2f}"
            metrics["Today's Volume"] = f"{int(hist['Volume'].iloc[-1]):,}"
            
        try:
            if hasattr(fast_info, 'market_cap') and fast_info.market_cap:
                metrics["Market Cap"] = f"₹{fast_info.market_cap / 10000000:,.2f} Cr"
            if hasattr(fast_info, 'year_high') and hasattr(fast_info, 'year_low'):
                metrics["52-Week Range"] = f"₹{fast_info.year_low:,.2f} - ₹{fast_info.year_high:,.2f}"
        except: pass
        
        return metrics
    except Exception as e:
        logger.error(f"YFinance fallback failed: {str(e)}")
        return {}

# --- MASTER METRICS ROUTER ---
def get_hybrid_metrics(ticker: str) -> dict:
    """Tries Screener.in first (for Indian stocks), falls back to YFinance."""
    metrics = {}
    
    # Try Screener.in if it looks like an Indian stock (not starting with ^)
    if not ticker.startswith('^'):
        metrics = fetch_screener_in_data(ticker)
        
    # If Screener failed or it's an index, use YFinance
    if not metrics:
        metrics = fetch_yfinance_metrics(ticker)
        
    if not metrics:
        return {
            "Status": "Data Unavailable",
            "Message": "Could not extract ratios from Screener or YFinance.",
            "Action": "Check ticker symbol"
        }
        
    return metrics

# --- Instant Metrics Endpoint (THIS IS WHAT YOUR FRONTEND IS LOOKING FOR!) ---
@app.get("/api/metrics/{ticker}")
async def serve_metrics(ticker: str):
    """Fetches financial ratios instantly for the frontend grid."""
    try:
        logger.info(f"Metrics endpoint called for: {ticker}")
        metrics = get_hybrid_metrics(ticker)
        
        return {
            "success": True,
            "ticker": ticker,
            "metrics": metrics,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "metrics": {"Status": "API Error", "Message": str(e)}
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
        
        # Fetch UI metrics instantly from Screener.in
        ui_metrics = get_hybrid_metrics(ticker)

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
