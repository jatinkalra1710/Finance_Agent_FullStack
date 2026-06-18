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
app = FastAPI(title="AI Stock Analyst API")

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

# --- Token-Optimized AI Tools ---
@tool("advanced_web_search")
def advanced_web_search(query: str) -> str:
    """Searches the web for recent financial news and context."""
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        search_query = f"{query} stock market India news {today}"
        
        response = tavily_client.search(
            query=search_query,
            max_results=3, # Reduced from 10 to 3 to save tokens
            search_depth="basic" # 'basic' uses fewer tokens than 'advanced' but yields great news headlines
        )
        
        if 'results' in response:
            results = [
                f"- {r.get('title')}: {r.get('content', '')[:150]}... ({r.get('url')})"
                for r in response['results']
            ]
            return "\n".join(results)
        return "No recent news found."
    except Exception as e:
        logger.error(f"Web search error: {e}")
        return f"Web search unavailable: {e}"

@tool("comprehensive_yfinance_data")
def comprehensive_yfinance_data(ticker: str) -> str:
    """Fetches dense, real-time financial data."""
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="5d") # Reduced from 1mo to 5d (we just need current trend)
        if hist.empty: return "No historical data."
        
        info = stock.info
        current_price = round(hist['Close'].iloc[-1], 2)
        day_change = ((current_price - hist['Close'].iloc[-2]) / hist['Close'].iloc[-2]) * 100 if len(hist)>1 else 0.0

        # Dense, token-efficient output string
        return (
            f"Price: {current_price} (Change: {day_change:.2f}%)\n"
            f"Mkt Cap: {info.get('marketCap', 'N/A')}, P/E: {info.get('trailingPE', 'N/A')}\n"
            f"52w Range: {info.get('fiftyTwoWeekLow')} - {info.get('fiftyTwoWeekHigh')}\n"
            f"Vol: {int(hist['Volume'].iloc[-1]) if 'Volume' in hist else 'N/A'} (Avg: {info.get('averageVolume', 'N/A')})"
        )
    except Exception as e:
        logger.error(f"YFinance error: {e}")
        return "Data fetch failed."

# --- API Endpoint ---
@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_stock(request: AnalyzeRequest):
    try:
        today = datetime.now().strftime("%B %d, %Y")
        ticker = request.ticker
        company = request.company_name

        # ========================================================================
        # AGENT 1: Data & Sentiment Gatherer (Combines Research + Sentiment)
        # ========================================================================
        data_agent = Agent(
            role="Data & News Analyst",
            goal=f"Extract key financial metrics and news sentiment for {company} ({ticker}).",
            backstory="Expert financial data gatherer. You extract precise numbers and current market sentiment quickly and accurately.",
            tools=[comprehensive_yfinance_data, advanced_web_search],
            llm=MODEL,
            verbose=True
        )
        
        # ========================================================================
        # AGENT 2: Core Analyst (Combines Quant, Tech, Sector, Risk)
        # ========================================================================
        analysis_agent = Agent(
            role="Lead Financial & Risk Analyst",
            goal="Analyze fundamentals, technicals, sector position, and top risks based strictly on provided data.",
            backstory="Veteran Wall Street analyst combining quantitative valuation, technical chart reading, and strict risk assessment.",
            llm=MODEL,
            verbose=True
        )
        
        # ========================================================================
        # AGENT 3: Strategist (Final Output Formatter)
        # ========================================================================
        strategist_agent = Agent(
            role="Chief Investment Strategist",
            goal="Synthesize raw analysis into a structured, executive markdown memo.",
            backstory="Top-tier portfolio manager known for concise, highly actionable, and impeccably formatted investment memos.",
            llm=MODEL,
            verbose=True
        )

        # ========================================================================
        # TASKS (Strictly enforcing concise intermediate outputs)
        # ========================================================================
        tasks = [
            Task(
                description=f"""Gather data for {company} ({ticker}) using your tools.
                1. Fetch financial metrics.
                2. Fetch latest news.
                Output ONLY dense bullet points containing facts, numbers, and the overall news sentiment (Bullish/Bearish/Neutral). No fluff.""",
                expected_output="Dense bulleted list of financial metrics and news sentiment.",
                agent=data_agent
            ),
            Task(
                description=f"""Review the data provided by the Data Analyst for {company} ({ticker}).
                Provide a rapid analysis of:
                1. Fundamental Valuation (P/E, Mkt Cap context)
                2. Technical Outlook (Price vs 52w range)
                3. Top 3 material risks (Macro/Micro)
                Output ONLY dense bullet points. Keep it analytical and brief.""",
                expected_output="Bulleted analytical breakdown of fundamentals, technicals, and risks.",
                agent=analysis_agent
            ),
            Task(
                description=f"""Create the Executive Investment Memo for {company} ({ticker}) using the previous analysis.
                
                **Required Markdown Structure:**
                ## Executive Summary
                ## Current Market Position & Financials
                ## Investment Thesis (Bull Case 💚 & Bear Case 🔴)
                ## Market Sentiment & Technical Outlook
                ## Key Risk Factors (List top 3)
                ## Conclusion
                
                **Rules:**
                - Use Indian Rupees (₹). Date: {today}.
                - Do not hallucinate data. If a metric is missing, omit it or state 'N/A'.
                - Keep it professional, highly scannable, and directly to the point.""",
                expected_output="A polished, professional markdown report following the exact structure requested.",
                agent=strategist_agent
            )
        ]

        # ========================================================================
        # CREW EXECUTION
        # ========================================================================
        crew = Crew(
            agents=[data_agent, analysis_agent, strategist_agent],
            tasks=tasks,
            process=Process.sequential
        )
        
        result = crew.kickoff(inputs={"company": company, "ticker": ticker})
        return AnalyzeResponse(ticker=ticker, report=str(result))
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
