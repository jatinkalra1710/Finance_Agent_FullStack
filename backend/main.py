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
    version="8.1.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ORIGINAL UNCHAINED LLM CONFIGURATION ---
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
    return {
        "status": "Operational",
        "service": "AI Stock Analyst Core API",
        "timestamp": datetime.now().isoformat(),
        "version": "8.1.0 (Unchained Native Engine)"
    }

# --- THE ADVANCED MASKED SCRAPER (UNCHANGED) ---
def get_hybrid_metrics(ticker: str) -> dict:
    """
    Bypasses Yahoo Finance Cloudflare blocks using a masked browser session 
    and combines it with Screener.in data for maximum ratio extraction.
    """
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

# --- AI Tools (ORIGINAL FULL DEPTH) ---
@tool("advanced_web_search")
def advanced_web_search(query: str) -> str:
    """Deep web search for institutional financial news, insider trades, and macroeconomic context."""
    try:
        today = datetime.now().strftime("%B %d, %Y")
        search_query = f"{query} stock market financial news earnings management change {today}"
        
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
    """Fetches highly comprehensive real-time financial data, historical price action, and institutional holdings."""
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
        - Market Capitalization: {info.get('marketCap', 'N/A')}
        - P/E Ratio: {info.get('trailingPE', 'N/A')} | Forward P/E: {info.get('forwardPE', 'N/A')}
        - 52-Week Range: ₹{info.get('fiftyTwoWeekLow', 'N/A')} - ₹{info.get('fiftyTwoWeekHigh', 'N/A')}
        - Volume: {int(hist['Volume'].iloc[-1]) if 'Volume' in hist else 'N/A'} (Avg: {info.get('averageVolume', 'N/A')})
        - Profit Margins: {info.get('profitMargins', 'N/A')}
        - Operating Margins: {info.get('operatingMargins', 'N/A')}
        - Return on Equity (ROE): {info.get('returnOnEquity', 'N/A')}
        - Total Debt to Equity: {info.get('debtToEquity', 'N/A')}
        - Analyst Target Price: ₹{info.get('targetMeanPrice', 'N/A')}
        """
    except Exception as e:
        logger.error(f"YFinance tool error: {str(e)}")
        return f"❌ Data fetch failed: {str(e)}. Rely exclusively on web search data."

# --- Analysis Endpoint ---
@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_stock(request: AnalyzeRequest):
    try:
        today = datetime.now().strftime("%B %d, %Y")
        ticker = request.ticker
        company_name = request.company_name
        
        # Fetch rich UI metrics instantly using the Hybrid Engine
        ui_metrics = get_hybrid_metrics(ticker)

        # AGENTS COMPLETELY RESTORED TO NATIVE CREWAI LLM HANDLING
        research_agent = Agent(
            role="Senior Global Market Research Analyst",
            goal=f"Gather, cross-verify, and compile an exhaustive financial and news dossier for {company_name} ({ticker}) as of {today}.",
            backstory="You are an elite, highly meticulous market researcher. You dig deep into financial statements, recent earnings calls, management changes, and macroeconomic trends. You cross-reference Yahoo Finance data with deep web searches to ensure 100% accuracy. If data is missing, you state it clearly rather than hallucinating.",
            tools=[comprehensive_yfinance_data, advanced_web_search],
            llm=MODEL, verbose=True
        )
        
        quant_agent = Agent(
            role="Lead Quantitative Financial Engineer",
            goal="Execute a rigorous fundamental analysis of balance sheets, cash flows, and valuation multiples.",
            backstory="You specialize in forensic accounting and deep-value investing. You look beyond the P/E ratio, diving into Price-to-Book, Debt-to-Equity, Free Cash Flow yield, ROE, and ROCE. You compare the company's current valuation against its historical averages and sector peers. You highlight red flags in balance sheets instantly.",
            llm=MODEL, verbose=True
        )
        
        technical_agent = Agent(
            role="Master Technical Analyst (CMT)",
            goal="Analyze price momentum, volume profiles, moving averages, and key chart patterns to determine entry/exit viability.",
            backstory="You are a Chartered Market Technician (CMT). You analyze 50-day and 200-day moving averages, RSI, MACD, and volume anomalies. You identify strict support floors and resistance ceilings. You clearly state if a stock is technically overbought, oversold, or in consolidation.",
            llm=MODEL, verbose=True
        )
        
        sentiment_agent = Agent(
            role="Director of Market Sentiment & Behavioral Economics",
            goal="Synthesize news tone, retail chatter, institutional moves, and broader market psychology into a clear sentiment rating.",
            backstory="You are a behavioral economist. You analyze the tone of recent news articles, analyst upgrades/downgrades, and institutional buying pressure. You synthesize this abstract data into a concrete sentiment rating (Extreme Bullish, Bullish, Neutral, Bearish, Extreme Bearish) and provide the psychological reasoning behind current price movements.",
            llm=MODEL, verbose=True
        )
        
        sector_agent = Agent(
            role="Global Sector & Macro-Economic Strategist",
            goal=f"Analyze {company_name}'s competitive moat, market share dynamics, and vulnerability to macroeconomic shifts.",
            backstory="You understand the big picture. You analyze the entire sector's headwinds and tailwinds. You evaluate the company's 'economic moat' (brand power, switching costs, network effects). You factor in inflation, interest rates, government regulations, and geopolitical tensions.",
            llm=MODEL, verbose=True
        )
        
        risk_agent = Agent(
            role="Chief Risk & Compliance Officer",
            goal=f"Identify, categorize, and prioritize the top 5 absolute worst-case material risks for {company_name}.",
            backstory="You are a paranoid, highly effective Chief Risk Officer. Your job is to protect capital at all costs. You actively look for reasons NOT to invest. You evaluate liquidity crises, regulatory crackdowns, supply chain failures, key-man risks, and technological obsolescence. You assign a probability (Low/Med/High) and an impact severity (Low/Med/High) to every single risk.",
            llm=MODEL, verbose=True
        )
        
        strategist_agent = Agent(
            role="Chief Investment Officer (CIO)",
            goal="Synthesize the work of all 6 agents into a masterpiece Executive Investment Memo that is ready for a billionaire client.",
            backstory="You are the CIO of a massive institutional wealth management firm. You take the highly technical reports from your 6 analysts and weave them together into a beautiful, easy-to-read, highly actionable Executive Memo. Your writing is crisp, authoritative, and perfectly formatted. You balance the bull case and the bear case perfectly, and you always end with a definitive conclusion on suitability.",
            llm=MODEL, verbose=True
        )

        tasks = [
            Task(description=f"Gather all raw data for {company_name} ({ticker}). Extract exact current pricing, market cap, volume, and 52-week extremes.", expected_output="A massive raw data dossier.", agent=research_agent),
            Task(description=f"Calculate fundamental health of {company_name} ({ticker}). Evaluate P/E, PEG, P/B, Debt/Equity, Margins.", expected_output="Fundamental analysis report.", agent=quant_agent),
            Task(description=f"Analyze price action of {company_name} ({ticker}). Establish clear support and resistance levels.", expected_output="Technical analysis brief.", agent=technical_agent),
            Task(description=f"Read news events for {company_name} ({ticker}). Provide a definitive sentiment classification.", expected_output="Psychological sentiment report.", agent=sentiment_agent),
            Task(description=f"Determine {company_name} ({ticker})'s position in its industry. Identify top competitors and macro trends.", expected_output="Industry positioning report.", agent=sector_agent),
            Task(description=f"Review findings and outline top 3 to 5 catastrophic risks for {company_name} ({ticker}).", expected_output="Risk matrix.", agent=risk_agent),
            Task(
                description=f"""Write the final Executive Investment Memo for {company_name} ({ticker}).
                MUST STRICTLY FOLLOW THIS EXACT STRUCTURE IN MARKDOWN (Use ₹):
                # Executive Investment Brief: {company_name}
                **Date:** {today} | **Ticker:** {ticker}
                ## 1. Executive Summary
                ## 2. Investment Thesis (Bull Case 🟢 & Bear Case 🔴)
                ## 3. Fundamental & Quantitative Health
                ## 4. Technical Outlook & Price Action
                ## 5. Sector & Macro Environment
                ## 6. Market Sentiment
                ## 7. Critical Risk Matrix
                ## 8. Final CIO Verdict & Suitability
                """,
                expected_output="A perfectly formatted, elite-level markdown investment memo.",
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
