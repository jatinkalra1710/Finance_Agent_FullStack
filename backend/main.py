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

# NEW: Import Langchain's Google GenAI wrapper for advanced retry/token management
from langchain_google_genai import ChatGoogleGenerativeAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI App
app = FastAPI(
    title="AI Stock Analyst API - Enterprise Edition",
    description="7-Agent Institutional Intelligence Engine for deep equity research.",
    version="7.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HYPER-OPTIMIZED LLM CONFIGURATION ---
# This safely handles the 15 RPM limit by waiting and retrying automatically instead of crashing.
gemini_llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.environ.get("GEMINI_API_KEY"),
    temperature=0.2,       # Low temperature saves tokens and makes output more concise
    max_retries=6,         # CRITICAL: Automatically pauses and retries if 429 Quota Exceeded is hit
    timeout=60             # Gives the API enough time to respond without dropping the connection
)

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
    return {
        "status": "Operational",
        "service": "AI Stock Analyst Core API",
        "timestamp": datetime.now().isoformat(),
        "version": "7.0.0 (Token Optimized Engine)"
    }

# --- THE ADVANCED MASKED SCRAPER ---
def get_hybrid_metrics(ticker: str) -> dict:
    metrics = {}
    clean_ticker = ticker.replace('.NS', '').replace('.BO', '').split('.')[0]
    yf_ticker = f"{clean_ticker}.NS" if not ticker.startswith('^') else ticker
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    })
    
    # 1. YAHOO FINANCE DATA EXTRACTION
    try:
        stock = yf.Ticker(yf_ticker, session=session)
        hist = stock.history(period="1mo")
        fast = stock.fast_info
        
        if not hist.empty:
            metrics["Current Price"] = f"₹{hist['Close'].iloc[-1]:,.2f}"
            metrics["Today's Volume"] = f"{int(hist['Volume'].iloc[-1]):,}"
            
        if hasattr(fast, 'market_cap') and fast.market_cap:
            metrics["Market Cap"] = f"₹{fast.market_cap / 10000000:,.2f} Cr"
        if hasattr(fast, 'year_low') and hasattr(fast, 'year_high'):
            metrics["52-Wk Range"] = f"₹{fast.year_low:,.2f} - ₹{fast.year_high:,.2f}"

        info = stock.info
        if info:
            def safe_get(k, fmt):
                v = info.get(k)
                if v is None: return None
                if fmt == 'num': return f"{v:.2f}"
                if fmt == 'pct': return f"{v * 100:.2f}%"
                return str(v)

            if safe_get('trailingPE', 'num'): metrics['P/E Ratio'] = safe_get('trailingPE', 'num')
            elif safe_get('forwardPE', 'num'): metrics['P/E Ratio'] = safe_get('forwardPE', 'num')
            
            if safe_get('pegRatio', 'num'): metrics['PEG Ratio'] = safe_get('pegRatio', 'num')
            if safe_get('priceToBook', 'num'): metrics['P/B Ratio'] = safe_get('priceToBook', 'num')
            if safe_get('debtToEquity', 'num'): metrics['Debt to Eq'] = safe_get('debtToEquity', 'num')
            if safe_get('returnOnEquity', 'pct'): metrics['ROE'] = safe_get('returnOnEquity', 'pct')
            if safe_get('returnOnAssets', 'pct'): metrics['ROA'] = safe_get('returnOnAssets', 'pct')
            if safe_get('revenueGrowth', 'pct'): metrics['Rev Growth'] = safe_get('revenueGrowth', 'pct')
            if safe_get('profitMargins', 'pct'): metrics['Net Margin'] = safe_get('profitMargins', 'pct')
            if safe_get('trailingEps', 'num'): metrics['EPS (TTM)'] = f"₹{safe_get('trailingEps', 'num')}"
            
            div = info.get('dividendYield') or info.get('trailingAnnualDividendYield')
            if div: metrics['Div Yield'] = f"{div * 100:.2f}%"
            
    except Exception as e:
        logger.warning(f"YFinance Deep Extraction Failed: {e}")

    # 2. SCREENER.IN INDIAN FALLBACK EXTRACTION
    if not ticker.startswith('^'):
        try:
            url = f"https://www.screener.in/company/{clean_ticker}/consolidated/"
            res = session.get(url, timeout=5)
            if res.status_code != 200:
                res = session.get(f"https://www.screener.in/company/{clean_ticker}/", timeout=5)
            
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, 'html.parser')
                ul = soup.find('ul', id='top-ratios')
                if ul:
                    for li in ul.find_all('li'):
                        n_span = li.find('span', class_='name')
                        v_span = li.find('span', class_='number')
                        if n_span and v_span:
                            n_text = n_span.text.strip().lower()
                            v_text = v_span.text.strip()
                            
                            if 'stock p/e' in n_text and 'P/E Ratio' not in metrics: metrics['P/E Ratio'] = v_text
                            elif 'roce' in n_text and 'ROCE' not in metrics: metrics['ROCE'] = f"{v_text}%"
                            elif 'roe' in n_text and 'ROE' not in metrics: metrics['ROE'] = f"{v_text}%"
                            elif 'book value' in n_text and 'P/B Ratio' not in metrics: metrics['Book Value'] = f"₹{v_text}"
                            elif 'dividend' in n_text and 'Div Yield' not in metrics: metrics['Div Yield'] = f"{v_text}%"
                            elif 'face value' in n_text and 'Face Value' not in metrics: metrics['Face Value'] = f"₹{v_text}"
        except Exception as e:
            logger.warning(f"Screener fallback failed: {e}")

    if len(metrics) < 2:
        return {"Status": "Data Temporarily Blocked", "Message": "Anti-bot protections prevented deep ratio extraction."}
        
    return metrics

@app.get("/api/metrics/{ticker}")
async def serve_metrics(ticker: str):
    try:
        metrics = get_hybrid_metrics(ticker)
        return {"success": True, "ticker": ticker, "metrics": metrics, "timestamp": datetime.now().isoformat()}
    except Exception as e:
        return {"success": False, "metrics": {"Status": "API Error", "Message": str(e)}}

# --- TOKEN-OPTIMIZED AI TOOLS ---
@tool("advanced_web_search")
def advanced_web_search(query: str) -> str:
    """Deep web search. Token-optimized to return only crucial data."""
    try:
        today = datetime.now().strftime("%B %d, %Y")
        search_query = f"{query} stock financial news {today}"
        
        response = tavily_client.search(
            query=search_query, max_results=4, search_depth="basic" # Reduced results and depth to save thousands of tokens
        )
        
        if 'results' in response:
            formatted_results = []
            for idx, result in enumerate(response['results'], 1):
                # Truncate content to 150 chars to massively reduce prompt size
                formatted_results.append(
                    f"{idx}. {result.get('title', 'N/A')} - {result.get('content', 'N/A')[:150]}..."
                )
            return "\n".join(formatted_results)
        return "No significant news found."
    except Exception as e:
        return f"Web search unavailable."

@tool("comprehensive_yfinance_data")
def comprehensive_yfinance_data(ticker: str) -> str:
    """Fetches core financial data formatted tightly to save API tokens."""
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="1mo") # Reduced from 3mo to save tokens
        if hist.empty: return "No historical data found."
        
        info = stock.info
        current_price = round(hist['Close'].iloc[-1], 2)

        return f"""Data for {ticker}:
        Price: ₹{current_price}
        Market Cap: {info.get('marketCap', 'N/A')}
        P/E: {info.get('trailingPE', 'N/A')}
        Forward P/E: {info.get('forwardPE', 'N/A')}
        Margins (Profit/Operating): {info.get('profitMargins', 'N/A')} / {info.get('operatingMargins', 'N/A')}
        ROE: {info.get('returnOnEquity', 'N/A')}
        Debt/Eq: {info.get('debtToEquity', 'N/A')}
        Target: ₹{info.get('targetMeanPrice', 'N/A')}
        """
    except Exception as e:
        return f"Data fetch failed."

# --- Analysis Endpoint ---
@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_stock(request: AnalyzeRequest):
    try:
        today = datetime.now().strftime("%B %d, %Y")
        ticker = request.ticker
        company_name = request.company_name
        
        ui_metrics = get_hybrid_metrics(ticker)

        # Added max_iter=2 to EVERY agent. This prevents them from looping forever 
        # and eating your 15 RPM limit.
        research_agent = Agent(
            role="Senior Market Research Analyst",
            goal=f"Gather data for {company_name} ({ticker}).",
            backstory="Elite researcher.",
            tools=[comprehensive_yfinance_data, advanced_web_search],
            llm=gemini_llm, max_iter=2, verbose=True
        )
        
        quant_agent = Agent(
            role="Lead Quantitative Engineer",
            goal="Execute fundamental analysis.",
            backstory="Specialist in forensic accounting.",
            llm=gemini_llm, max_iter=2, verbose=True
        )
        
        technical_agent = Agent(
            role="Master Technical Analyst",
            goal="Analyze price momentum.",
            backstory="Chartered Market Technician.",
            llm=gemini_llm, max_iter=2, verbose=True
        )
        
        sentiment_agent = Agent(
            role="Director of Sentiment",
            goal="Synthesize market psychology.",
            backstory="Behavioral economist.",
            llm=gemini_llm, max_iter=2, verbose=True
        )
        
        sector_agent = Agent(
            role="Sector Strategist",
            goal=f"Analyze {company_name}'s moat.",
            backstory="Industry analyst.",
            llm=gemini_llm, max_iter=2, verbose=True
        )
        
        risk_agent = Agent(
            role="Chief Risk Officer",
            goal=f"Identify risks for {company_name}",
            backstory="Risk officer focused on worst-case scenarios.",
            llm=gemini_llm, max_iter=2, verbose=True
        )
        
        strategist_agent = Agent(
            role="Chief Investment Officer",
            goal="Synthesize findings into an executive memo.",
            backstory="CIO of major wealth management firm.",
            llm=gemini_llm, max_iter=2, verbose=True
        )

        tasks = [
            Task(description=f"Gather raw data for {company_name} ({ticker})", expected_output="Raw data dossier", agent=research_agent),
            Task(description=f"Fundamental analysis of {company_name}", expected_output="Fundamental report", agent=quant_agent),
            Task(description=f"Technical analysis of {company_name}", expected_output="Technical brief", agent=technical_agent),
            Task(description=f"Sentiment analysis for {company_name}", expected_output="Sentiment report", agent=sentiment_agent),
            Task(description=f"Industry positioning of {company_name}", expected_output="Sector report", agent=sector_agent),
            Task(description=f"Risk assessment for {company_name}", expected_output="Risk matrix", agent=risk_agent),
            Task(
                description=f"""Write final Executive Investment Memo for {company_name} ({ticker}).
                Structure: Executive Summary, Investment Thesis (Bull/Bear), Fundamentals, Technical, Sector, Sentiment, Risks, Verdict.
                Use Indian Rupees (₹). Professional markdown format. Do not use generic filler.""",
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
