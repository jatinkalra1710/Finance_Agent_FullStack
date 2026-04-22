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
    version="4.0.0"
)

# CORS Configuration for Frontend Deployment
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

# --- Pydantic Models for API ---
class AnalyzeRequest(BaseModel):
    ticker: str
    company_name: str

class AnalyzeResponse(BaseModel):
    ticker: str
    report: str
    metrics: dict  
    timestamp: str 

# --- Health Check Endpoint ---
@app.get("/")
async def health_check():
    """Keeps the server awake and provides status for Vercel/Render"""
    return {
        "status": "Operational",
        "service": "AI Stock Analyst Core API",
        "timestamp": datetime.now().isoformat(),
        "agents_online": 7
    }

# --- ENHANCED Screener Metrics Function with ALL 25+ Ratios ---
def fetch_screener_metrics(ticker_symbol: str) -> dict:
    """Fetches 25+ comprehensive financial ratios with bulletproof error handling."""
    try:
        logger.info(f"Fetching comprehensive metrics for: {ticker_symbol}")
        
        # Auto-append .NS for Indian stocks if not provided and not an index
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
                if val is None or val == 'N/A': return "N/A"
                return f"{float(val) * 100:.2f}%"
            except: return "N/A"
            
        def fmt_num(val):
            try: 
                if val is None or val == 'N/A': return "N/A"
                return f"{float(val):.2f}"
            except: return "N/A"
            
        def fmt_cr(val):
            try: 
                if val is None or val == 'N/A': return "N/A"
                return f"₹{float(val) / 10000000:,.2f} Cr"
            except: return "N/A"

        def fmt_price(val):
            try:
                if val is None or val == 'N/A': return "N/A"
                return f"₹{float(val):,.2f}"
            except: return "N/A"

        def fmt_volume(val):
            try:
                if val is None or val == 'N/A': return "N/A"
                return f"{int(val):,}"
            except: return "N/A"

        def format_rating(rating):
            if not rating or not isinstance(rating, str): return "Hold"
            return rating.replace('_', ' ').title()

        # Extract ALL available metrics with multiple fallbacks
        market_cap = info.get('marketCap')
        current_price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
        
        # Price ranges
        day_high = info.get('dayHigh') or info.get('regularMarketDayHigh')
        day_low = info.get('dayLow') or info.get('regularMarketDayLow')
        high_52 = info.get('fiftyTwoWeekHigh')
        low_52 = info.get('fiftyTwoWeekLow')
        
        # Valuation ratios
        pe = info.get('trailingPE') or info.get('forwardPE')
        pb_ratio = info.get('priceToBook')
        ps_ratio = info.get('priceToSalesTrailing12Months')
        peg_ratio = info.get('pegRatio')
        
        # Profitability metrics
        profit_margin = info.get('profitMargins')
        operating_margin = info.get('operatingMargins')
        gross_margin = info.get('grossMargins')
        
        # Returns
        roe = info.get('returnOnEquity')
        roa = info.get('returnOnAssets')
        
        # Dividends
        dividend_yield = info.get('dividendYield') or info.get('trailingAnnualDividendYield')
        dividend_rate = info.get('dividendRate')
        payout_ratio = info.get('payoutRatio')
        
        # Financial health
        debt_to_equity = info.get('debtToEquity')
        current_ratio = info.get('currentRatio')
        quick_ratio = info.get('quickRatio')
        
        # Per share metrics
        eps = info.get('trailingEps')
        book_value = info.get('bookValue')
        
        # Growth
        earnings_growth = info.get('earningsQuarterlyGrowth')
        revenue_growth = info.get('revenueGrowth')
        earnings_growth_annual = info.get('earningsGrowth')
        
        # Technical indicators
        fifty_ma = info.get('fiftyDayAverage')
        two_hundred_ma = info.get('twoHundredDayAverage')
        beta = info.get('beta')
        
        # Analyst metrics
        target_price = info.get('targetMeanPrice')
        target_high = info.get('targetHighPrice')
        target_low = info.get('targetLowPrice')
        analyst_rating = info.get('recommendationKey')
        num_analysts = info.get('numberOfAnalystOpinions')
        
        # Volume
        avg_volume = info.get('averageVolume') or info.get('averageVolume10days')
        volume = info.get('volume') or info.get('regularMarketVolume')
        
        # Additional metrics
        forward_pe = info.get('forwardPE')
        trailing_pe = info.get('trailingPE')
        enterprise_value = info.get('enterpriseValue')
        price_to_sales = info.get('priceToSalesTrailing12Months')

        # Build comprehensive metrics dictionary - ALWAYS include keys even if N/A
        metrics_dict = {
            # PRIMARY METRICS (Always show these first)
            "Market Cap": fmt_cr(market_cap),
            "Current Price": fmt_price(current_price),
            
            # PRICE RANGES
            "Day High": fmt_price(day_high),
            "Day Low": fmt_price(day_low),
            "52W High": fmt_price(high_52),
            "52W Low": fmt_price(low_52),
            
            # VALUATION RATIOS
            "P/E Ratio": fmt_num(pe),
            "Forward P/E": fmt_num(forward_pe),
            "P/B Ratio": fmt_num(pb_ratio),
            "P/S Ratio": fmt_num(ps_ratio),
            "PEG Ratio": fmt_num(peg_ratio),
            
            # PROFITABILITY
            "Profit Margin": fmt_pct(profit_margin),
            "Operating Margin": fmt_pct(operating_margin),
            "Gross Margin": fmt_pct(gross_margin),
            
            # RETURNS
            "ROE": fmt_pct(roe),
            "ROA": fmt_pct(roa),
            
            # DIVIDENDS
            "Dividend Yield": fmt_pct(dividend_yield),
            "Div Rate": fmt_price(dividend_rate),
            "Payout Ratio": fmt_pct(payout_ratio),
            
            # FINANCIAL HEALTH
            "Debt/Equity": fmt_num(debt_to_equity),
            "Current Ratio": fmt_num(current_ratio),
            "Quick Ratio": fmt_num(quick_ratio),
            
            # PER SHARE
            "EPS (TTM)": fmt_price(eps),
            "Book Value": fmt_price(book_value),
            
            # GROWTH
            "Earnings Growth": fmt_pct(earnings_growth),
            "Revenue Growth": fmt_pct(revenue_growth),
            "Annual EPS Growth": fmt_pct(earnings_growth_annual),
            
            # TECHNICAL
            "50-Day MA": fmt_price(fifty_ma),
            "200-Day MA": fmt_price(two_hundred_ma),
            "Beta": fmt_num(beta),
            
            # ANALYST
            "Target Price": fmt_price(target_price),
            "Target High": fmt_price(target_high),
            "Target Low": fmt_price(target_low),
            "Wall St Rating": format_rating(analyst_rating),
            "Analysts": str(num_analysts) if num_analysts else "N/A",
            
            # VOLUME
            "Avg Volume": fmt_volume(avg_volume),
            "Today Volume": fmt_volume(volume),
        }

        # Filter out rows where BOTH key metrics are N/A (keep at least current price and market cap)
        essential_keys = ["Market Cap", "Current Price"]
        filtered_metrics = {}
        
        for key, value in metrics_dict.items():
            # Always keep essential metrics
            if key in essential_keys:
                filtered_metrics[key] = value
            # Keep other metrics only if they have real data
            elif value != "N/A":
                filtered_metrics[key] = value
        
        # Ensure we have at least some data
        if len(filtered_metrics) < 3:
            logger.warning(f"Very limited data for {ticker_symbol}")
            # Return at least basic info
            return {
                "Market Cap": fmt_cr(market_cap),
                "Current Price": fmt_price(current_price),
                "Status": "Limited Data",
                "Action": "Some metrics unavailable"
            }

        logger.info(f"Successfully fetched {len(filtered_metrics)} metrics for {ticker_symbol}")
        return filtered_metrics
        
    except Exception as e:
        logger.error(f"Screener Metrics Error for {ticker_symbol}: {str(e)}")
        
        # Return user-friendly error instead of empty dict
        return {
            "Status": "Data Unavailable",
            "Ticker": ticker_symbol,
            "Action": "Verify symbol",
            "Error": str(e)[:50]
        }

# --- Instant Metrics Endpoint ---
@app.get("/api/metrics/{ticker}")
async def get_metrics(ticker: str):
    """Fetches ONLY the financial ratios instantly for the frontend grid."""
    metrics = fetch_screener_metrics(ticker)
    return {"metrics": metrics}

# --- AI Tools ---
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

# --- API Endpoint ---
@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_stock(request: AnalyzeRequest):
    try:
        today = datetime.now().strftime("%B %d, %Y")
        ticker = request.ticker
        company_name = request.company_name
        
        ui_metrics = fetch_screener_metrics(ticker)

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
            timestamp=datetime.now().strftime("%b %d, %Y - %I:%M %p")
        )
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
