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
    version="2.0.0"
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

# --- Screener Metrics Function ---
def fetch_screener_metrics(ticker_symbol: str) -> dict:
    """Fetches key financial ratios for the UI grid alongside the chart."""
    try:
        stock = yf.Ticker(ticker_symbol)
        info = stock.info
        
        def fmt_pct(val):
            return f"{val * 100:.2f}%" if val is not None else "N/A"
        def fmt_num(val):
            return f"{val:.2f}" if val is not None else "N/A"
        def fmt_cr(val):
            return f"₹{val / 10000000:,.2f} Cr" if val is not None else "N/A"

        market_cap = info.get('marketCap')
        current_price = info.get('currentPrice') or info.get('regularMarketPrice')
        high = info.get('fiftyTwoWeekHigh')
        low = info.get('fiftyTwoWeekLow')
        pe = info.get('trailingPE') or info.get('forwardPE')
        book_value = info.get('bookValue')
        dividend_yield = info.get('dividendYield') or info.get('trailingAnnualDividendYield')
        roce = info.get('returnOnAssets') 
        roe = info.get('returnOnEquity')
        pb_ratio = info.get('priceToBook')
        debt_to_equity = info.get('debtToEquity')
        eps = info.get('trailingEps')
        beta = info.get('beta')
        revenue_growth = info.get('revenueGrowth')

        return {
            "Market Cap": fmt_cr(market_cap),
            "Current Price": f"₹{current_price}" if current_price else "N/A",
            "52W High/Low": f"₹{high} / ₹{low}" if high and low else "N/A",
            "Stock P/E": fmt_num(pe),
            "Book Value": f"₹{book_value}" if book_value else "N/A",
            "Price to Book": fmt_num(pb_ratio),
            "Dividend Yield": fmt_pct(dividend_yield),
            "ROCE (Est)": fmt_pct(roce),
            "ROE": fmt_pct(roe),
            "Debt to Equity": fmt_num(debt_to_equity),
            "EPS (TTM)": f"₹{eps}" if eps else "N/A",
            "Beta": fmt_num(beta),
            "Rev Growth (YoY)": fmt_pct(revenue_growth)
        }
    except Exception as e:
        logger.error(f"Failed to fetch metrics: {str(e)}")
        return {}

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
        
        # 1. Fetch metrics for the frontend sidebar immediately
        ui_metrics = fetch_screener_metrics(ticker)

        # ========================================================================
        # UNREDUCED, FULLY EXPANDED AGENT DEFINITIONS
        # ========================================================================
        research_agent = Agent(
            role="Senior Global Market Research Analyst",
            goal=f"Gather, cross-verify, and compile an exhaustive financial and news dossier for {company_name} ({ticker}) as of {today}.",
            backstory="""You are an elite, highly meticulous market researcher with 20 years of experience working at Goldman Sachs and Morgan Stanley. 
            You do not accept surface-level data. You dig deep into financial statements, recent earnings calls, management changes, and macroeconomic 
            trends affecting the specific stock. You cross-reference Yahoo Finance data with deep web searches to ensure 100% accuracy. 
            If data is missing, you state it clearly rather than hallucinating.""",
            tools=[comprehensive_yfinance_data, advanced_web_search],
            llm=MODEL, 
            verbose=True
        )
        
        quant_agent = Agent(
            role="Lead Quantitative Financial Engineer",
            goal="Execute a rigorous fundamental analysis of balance sheets, cash flows, and valuation multiples.",
            backstory="""You hold a PhD in Financial Engineering from MIT. You specialize in forensic accounting and deep-value investing. 
            You look beyond the P/E ratio, diving into Price-to-Book, Debt-to-Equity, Free Cash Flow yield, ROE, and ROCE. 
            You compare the company's current valuation against its historical averages and sector peers. You are purely numbers-driven, completely emotionless, 
            and you highlight red flags in balance sheets instantly.""",
            llm=MODEL, 
            verbose=True
        )
        
        technical_agent = Agent(
            role="Master Technical Analyst (CMT)",
            goal="Analyze price momentum, volume profiles, moving averages, and key chart patterns to determine entry/exit viability.",
            backstory="""You are a Chartered Market Technician (CMT) who has managed algorithmic trading desks. You do not care about the company's business model; 
            you only care about price action. You analyze 50-day and 200-day moving averages, RSI (Relative Strength Index), MACD, and volume anomalies. 
            You identify strict support floors and resistance ceilings. You clearly state if a stock is technically overbought, oversold, or in consolidation.""",
            llm=MODEL, 
            verbose=True
        )
        
        sentiment_agent = Agent(
            role="Director of Market Sentiment & Behavioral Economics",
            goal="Synthesize news tone, retail chatter, institutional moves, and broader market psychology into a clear sentiment rating.",
            backstory="""You are a former hedge fund manager turned behavioral economist. You understand that markets are driven by fear and greed. 
            You analyze the tone of recent news articles, recent analyst upgrades/downgrades, and institutional buying pressure. 
            You synthesize this abstract data into a concrete sentiment rating (Extreme Bullish, Bullish, Neutral, Bearish, Extreme Bearish) 
            and provide the psychological reasoning behind current price movements.""",
            llm=MODEL, 
            verbose=True
        )
        
        sector_agent = Agent(
            role="Global Sector & Macro-Economic Strategist",
            goal=f"Analyze {company_name}'s competitive moat, market share dynamics, and vulnerability to macroeconomic shifts.",
            backstory="""You are a top-tier industry analyst who understands the big picture. You analyze the entire sector's headwinds and tailwinds. 
            You evaluate the company's 'economic moat' (brand power, switching costs, network effects). You factor in inflation, interest rates, 
            government regulations, and geopolitical tensions. You determine if the company is a market leader, a disruptor, or falling behind its peers.""",
            llm=MODEL, 
            verbose=True
        )
        
        risk_agent = Agent(
            role="Chief Risk & Compliance Officer",
            goal=f"Identify, categorize, and prioritize the top 5 absolute worst-case material risks for {company_name}.",
            backstory="""You are a paranoid, highly effective Chief Risk Officer. Your job is to protect capital at all costs. You actively look for reasons NOT to invest. 
            You evaluate liquidity crises, regulatory crackdowns, supply chain failures, key-man risks (CEO dependencies), and technological obsolescence. 
            You assign a probability (Low/Med/High) and an impact severity (Low/Med/High) to every single risk you identify.""",
            llm=MODEL, 
            verbose=True
        )
        
        strategist_agent = Agent(
            role="Chief Investment Officer (CIO)",
            goal="Synthesize the work of all 6 agents into a masterpiece Executive Investment Memo that is ready for a billionaire client.",
            backstory="""You are the CIO of a massive institutional wealth management firm. You take the highly technical reports from your 6 underlying analysts 
            and weave them together into a beautiful, easy-to-read, highly actionable Executive Memo. Your writing is crisp, authoritative, and perfectly formatted. 
            You balance the bull case and the bear case perfectly, and you always end with a definitive conclusion on suitability.""",
            llm=MODEL, 
            verbose=True
        )

        # ========================================================================
        # UNREDUCED TASKS
        # ========================================================================
        tasks = [
            Task(
                description=f"Gather all raw data for {company_name} ({ticker}). Execute a deep web search for the latest news from the past 7 days. Extract exact current pricing, market cap, volume, and 52-week extremes.", 
                expected_output="A massive raw data dossier containing verified numbers and summarized news events.", 
                agent=research_agent
            ),
            Task(
                description=f"Using the data dossier, calculate the fundamental health of {company_name} ({ticker}). Evaluate the P/E, PEG, P/B, Debt/Equity, and Margins. Determine if it is undervalued, fairly valued, or overvalued.", 
                expected_output="A heavily numerical fundamental analysis report detailing valuation and balance sheet health.", 
                agent=quant_agent
            ),
            Task(
                description=f"Analyze the price action of {company_name} ({ticker}). Identify exactly where the current price sits relative to its 52-week high/low. Establish clear support and resistance levels. Evaluate volume trends.", 
                expected_output="A technical analysis brief detailing momentum, trend direction, and key price levels.", 
                agent=technical_agent
            ),
            Task(
                description=f"Read the news events gathered by the Research Agent for {company_name} ({ticker}). Determine the overall market sentiment. Is the media bullish or bearish? Provide a definitive sentiment classification.", 
                expected_output="A psychological sentiment report classifying the stock's current momentum narrative.", 
                agent=sentiment_agent
            ),
            Task(
                description=f"Determine {company_name} ({ticker})'s position in its broader industry. Identify its top 2 competitors. Explain the current macroeconomic trends affecting this specific sector right now.", 
                expected_output="An industry positioning report evaluating economic moats and sector tailwinds.", 
                agent=sector_agent
            ),
            Task(
                description=f"Review all findings and outline the top 3 to 5 catastrophic risks for {company_name} ({ticker}). Format them strictly with [Risk Name]: [Explanation] - Impact: [High/Med/Low], Probability: [High/Med/Low].", 
                expected_output="A bulleted risk matrix prioritizing the most dangerous threats to the stock price.", 
                agent=risk_agent
            ),
            Task(
                description=f"""Write the final Executive Investment Memo for {company_name} ({ticker}).
                You must format this beautifully using Markdown. Use Indian Rupees (₹). Include today's date: {today}.
                
                MUST STRICTLY FOLLOW THIS EXACT STRUCTURE:
                # Executive Investment Brief: {company_name}
                **Date:** {today} | **Ticker:** {ticker}
                
                ## 1. Executive Summary
                (A powerful 3-sentence overview of the company's current status)
                
                ## 2. Investment Thesis
                **🟢 The Bull Case:** (Why to buy)
                **🔴 The Bear Case:** (Why to sell/avoid)
                
                ## 3. Fundamental & Quantitative Health
                (Synthesize the Quant Agent's findings. Discuss valuation multiples and debt)
                
                ## 4. Technical Outlook & Price Action
                (Synthesize the Technical Agent's findings. Mention support/resistance)
                
                ## 5. Sector & Macro Environment
                (Synthesize the Sector Agent's findings on competitors and industry trends)
                
                ## 6. Market Sentiment
                (Synthesize the Sentiment Agent's findings)
                
                ## 7. Critical Risk Matrix
                (List the top risks identified by the Risk Agent)
                
                ## 8. Final CIO Verdict & Suitability
                (Your final authoritative conclusion. Who should hold this stock?)
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
