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

# CORS Configuration for Frontend Deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change to your Netlify URL in production if you want strict security
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

# --- AI Tools ---
@tool("advanced_web_search")
def advanced_web_search(query: str) -> str:
    """
    Advanced web search for financial news with context
    Searches multiple sources and returns structured results
    """
    try:
        today = datetime.now().strftime("%B %d, %Y")
        search_query = f"{query} stock market India news {today}"
        
        response = tavily_client.search(
            query=search_query,
            max_results=10,
            search_depth="advanced"
        )
        
        if 'results' in response:
            formatted_results = []
            for idx, result in enumerate(response['results'][:5], 1):
                formatted_results.append(
                    f"{idx}. **{result.get('title', 'N/A')}**\n"
                    f"   Source: {result.get('url', 'N/A')}\n"
                    f"   Summary: {result.get('content', 'N/A')[:200]}...\n"
                )
            return "\n".join(formatted_results)
        
        return str(response)
        
    except Exception as e:
        logger.error(f"Web search error: {str(e)}")
        return f"⚠️ Web search temporarily unavailable: {str(e)}"

@tool("comprehensive_yfinance_data")
def comprehensive_yfinance_data(ticker: str) -> str:
    """Fetches comprehensive real-time financial data."""
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="1mo")
        if hist.empty:
            return "No historical data found."
        
        info = stock.info
        current_price = round(hist['Close'].iloc[-1], 2)
        
        if len(hist) > 1:
            prev_close = hist['Close'].iloc[-2]
            day_change = ((current_price - prev_close) / prev_close) * 100
        else:
            day_change = 0.0

        return f"""
        Market Data Summary:
        - Ticker: {ticker}
        - Current Price: {current_price} (Day Change: {day_change:.2f}%)
        - Market Capitalization: {info.get('marketCap', 'N/A')}
        - P/E Ratio: {info.get('trailingPE', 'N/A')}
        - 52-Week Range: {info.get('fiftyTwoWeekLow', 'N/A')} - {info.get('fiftyTwoWeekHigh', 'N/A')}
        - Volume: {int(hist['Volume'].iloc[-1]) if 'Volume' in hist else 'N/A'} (Avg: {info.get('averageVolume', 'N/A')})
        """
    except Exception as e:
        logger.error(f"YFinance tool error: {str(e)}")
        return f"❌ Data fetch failed: {str(e)}. Use web search as backup."

# --- API Endpoint ---
@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_stock(request: AnalyzeRequest):
    try:
        today = datetime.now().strftime("%B %d, %Y")
        ticker = request.ticker
        company_name = request.company_name

        # ========================================================================
        # AGENT 1: Senior Market Research Analyst
        # ========================================================================
        research_agent = Agent(
            role="Senior Market Research Analyst",
            goal=f"Gather and validate comprehensive financial data and news for {company_name} ({ticker}) as of {today} in short",
            backstory="""You are a veteran market researcher with 15+ years at top investment banks 
            like Goldman Sachs and JP Morgan. You have access to multiple data sources and always 
            cross-verify information. You use web search as a backup when primary data sources fail. 
            You're known for your meticulous attention to detail and accuracy.""",
            tools=[comprehensive_yfinance_data, advanced_web_search],
            llm=MODEL,
            verbose=True
        )
        
        # ========================================================================
        # AGENT 2: Quantitative Financial Analyst
        # ========================================================================
        quant_agent = Agent(
            role="Quantitative Financial Analyst",
            goal="Perform fundamental analysis on financial metrics and company valuation in breif but dont miss important information",
            backstory="""You are a PhD in Financial Engineering from MIT, specializing in equity 
            valuation and financial modeling. You analyze P/E ratios, market cap, revenue growth, 
            profit margins, and other fundamental metrics. You compare companies against their 
            industry peers and historical performance. You provide data-driven insights without 
            speculation, always backing your analysis with numbers.""",
            llm=MODEL,
            verbose=True
        )
        
        # ========================================================================
        # AGENT 3: Technical Analyst
        # ========================================================================
        technical_agent = Agent(
            role="Senior Technical Analyst",
            goal="Analyze price trends, chart patterns, and technical indicators in breif but dont miss important information",
            backstory="""You are a Chartered Market Technician (CMT) with 30+ years of experience 
            in technical analysis. You analyze 52-week price ranges, volume trends, support and 
            resistance levels, and price momentum. You identify chart patterns like head and shoulders, 
            double tops/bottoms, and trend channels. You calculate relative strength and identify 
            whether stocks are overbought or oversold. Your insights help time market entry and exit.""",
            llm=MODEL,
            verbose=True
        )
        
        # ========================================================================
        # AGENT 4: Market Sentiment & News Analyst
        # ========================================================================
        sentiment_agent = Agent(
            role="Market Sentiment & News Analyst",
            goal="Determine investor sentiment (Bullish/Bearish/Neutral) based on news and market behavior",
            backstory="""You are a behavioral economist and former Bloomberg journalist who understands 
            how news cycles, social media, and analyst opinions impact stock prices. You analyze 
            sentiment from multiple angles: news tone, analyst ratings, social media buzz, and market 
            reaction to events. You can detect fear, greed, optimism, and pessimism in market behavior. 
            You classify sentiment as Bullish, Bearish, Neutral, or Mixed with supporting evidence.""",
            llm=MODEL,
            verbose=True
        )
        
        # ========================================================================
        # AGENT 5: Sector & Industry Specialist
        # ========================================================================
        sector_agent = Agent(
            role="Sector & Industry Specialist",
            goal=f"Analyze {company_name}'s position within its industry and identify competitive dynamics in breif but dont miss important information",
            backstory="""You are an industry analyst with 40+ years of experience who has covered multiple sectors for major 
            research firms. You understand industry trends, competitive landscapes, market share 
            dynamics, and sector-specific risks. You compare companies against their direct competitors, 
            identify market leaders and laggards, and spot emerging threats and opportunities. You 
            analyze how macroeconomic factors, regulatory changes, and technological disruptions 
            impact different sectors.""",
            llm=MODEL,
            verbose=True
        )
        
        # ========================================================================
        # AGENT 6: Chief Risk Officer
        # ========================================================================
        risk_agent = Agent(
            role="Chief Risk Officer",
            goal=f"Identify top 3-5 material risks facing {company_name} in current market conditions in breif but dont miss important information",
            backstory="""You are a highly experienced risk manager who has navigated multiple market 
            crashes including the 2000 dot com bubble, 2008 financial crisis and 2020 COVID crash, 2024-2025 tarrif correction, 2026 US-Iran War Dip. You have a keen eye 
            for spotting risks before they materialize. You focus on: regulatory and compliance risks, 
            macroeconomic headwinds, industry disruption, competitive threats, management quality issues, 
            debt and liquidity concerns, and company-specific vulnerabilities. You quantify risk impact 
            and probability whenever possible.""",
            llm=MODEL,
            verbose=True
        )
        
        # ========================================================================
        # AGENT 7: Lead Investment Strategist (Synthesizer)
        # ========================================================================
        strategist_agent = Agent(
            role="Lead Investment Strategist & Portfolio Manager",
            goal="Synthesize all findings into an executive investment memo with actionable insights in breif but dont miss important information",
            backstory="""You are a Managing Director and Portfolio Manager at a top investment firm 
            managing $50B+ in assets. You have an MBA from Harvard Business School and 20+ years of 
            experience. You write clear, professional reports for institutional investors, pension funds, 
            and ultra-high-net-worth individuals. Your reports are balanced, data-driven, and include 
            both bull and bear cases. You're known for your ability to synthesize complex information 
            into actionable investment recommendations. You always consider risk-adjusted returns and 
            investor suitability.""",
            llm=MODEL,
            verbose=True
        )

        # ========================================================================
        # TASKS
        # ========================================================================
        tasks = [
            Task(
                description=f"""Gather comprehensive data for {company_name} ({ticker}):
                1. **Financial Metrics:** Current stock price, Market cap, P/E ratio, 52-week high/low, Trading volume.
                2. **News & Events:** Latest news, earnings, corporate actions, management changes.
                3. **Market Context:** Recent price movements, Comparison with indices.
                **Important:** Use web search as backup if YFinance fails. Verify numbers.""",
                expected_output="Comprehensive data dossier with all metrics, news sources, and market context.",
                agent=research_agent
            ),
            Task(
                description=f"""Perform quantitative fundamental analysis on {company_name} ({ticker}):
                1. **Valuation Analysis:** Compare P/E, Market Cap.
                2. **Financial Health:** Revenue trends, debt levels, cash flow.
                3. **Growth Prospects:** Historical performance, trajectory.
                4. **Peer Comparison:** Compare to sector competitors.
                Provide numerical analysis with clear context.""",
                expected_output="Detailed fundamental analysis report with specific numbers.",
                agent=quant_agent
            ),
            Task(
                description=f"""Perform technical analysis on {company_name} ({ticker}):
                1. **Price Trend Analysis:** Momentum, support/resistance proximity.
                2. **Volume Analysis:** Unusual activity, buying/selling pressure.
                3. **Key Levels:** Support and resistance levels.
                4. **Technical Outlook:** Short and medium-term outlook, overbought/oversold status.""",
                expected_output="Technical analysis report with price trends and key levels.",
                agent=technical_agent
            ),
            Task(
                description=f"""Analyze market sentiment for {company_name} ({ticker}):
                1. **News Sentiment:** Overall tone of recent coverage.
                2. **Market Behavior:** Market reaction to news, institutional buying/selling.
                3. **Analyst Sentiment:** Upgrades/downgrades.
                4. **Overall Classification:** Bullish, Bearish, Neutral, or Mixed. Provide evidence.""",
                expected_output="Comprehensive sentiment analysis with clear classification and evidence.",
                agent=sentiment_agent
            ),
            Task(
                description=f"""Analyze {company_name} ({ticker}) within its industry context:
                1. **Industry Identification:** Sector characteristics.
                2. **Competitive Position:** Main competitors, market share, leadership status.
                3. **Industry Trends:** Growth trajectory, regulatory changes.
                4. **Competitive Advantages/Disadvantages:** Strengths, weaknesses, moats.
                5. **Sector Outlook:** Macroeconomic impacts.""",
                expected_output="Industry and competitive analysis report.",
                agent=sector_agent
            ),
            Task(
                description=f"""Identify and explain the TOP 3-5 material risks for {company_name} ({ticker}):
                Categories to consider: Regulatory, Macroeconomic, Industry/Competitive, Company-Specific, Market/Liquidity.
                For each risk: Explain it, Assess Impact (High/Med/Low), Assess Probability (Likely/Possible/Unlikely), Provide Mitigation.""",
                expected_output="Comprehensive risk assessment prioritizing top 3-5 risks.",
                agent=risk_agent
            ),
            Task(
                description=f"""Create the final Executive Investment Memo for {company_name} ({ticker}).
                Synthesize insights from all 6 previous analysts into a cohesive, professional report.
                
                **Required Structure:**
                ## Executive Summary
                ## Current Market Position
                ## Investment Thesis (Bull Case 💚 & Bear Case 🔴)
                ## Market Sentiment Analysis
                ## Industry & Competitive Context
                ## Technical Outlook
                ## Key Risk Factors (List top 3-5 with Impact/Probability)
                ## Financial Snapshot
                ## Conclusion & Suitability
                
                **Formatting Requirements:**
                Use Indian Rupees (₹). Include today's date: {today}. Use markdown. Professional tone. Length: 1000-1500 words.""",
                expected_output="Complete professional investment memo in markdown format covering all required sections.",
                agent=strategist_agent
            )
        ]

        # ========================================================================
        # CREW EXECUTION
        # ========================================================================
        crew = Crew(
            agents=[
                research_agent, quant_agent, technical_agent, 
                sentiment_agent, sector_agent, risk_agent, strategist_agent
            ],
            tasks=tasks,
            process=Process.sequential
        )
        
        result = crew.kickoff(inputs={"company": company_name, "ticker": ticker})
        return AnalyzeResponse(ticker=ticker, report=str(result))
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
