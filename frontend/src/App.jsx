import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Activity, Search, TrendingUp, AlertCircle, ShieldAlert, BarChart3, Clock, CheckCircle2 } from 'lucide-react';
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

const POPULAR_STOCKS = [
  { name: "Reliance Industries", ticker: "RELIANCE.BO", tvSymbol: "BSE:RELIANCE" },
  { name: "HDFC Bank", ticker: "HDFCBANK.BO", tvSymbol: "BSE:HDFCBANK" },
  { name: "TCS", ticker: "TCS.BO", tvSymbol: "BSE:TCS" },
  { name: "Zomato", ticker: "ETERNAL.BO", tvSymbol: "BSE:ZOMATO" },
  { name: "Mahindra & Mahindra", ticker: "M&M.BO", tvSymbol: "BSE:M&M" },
];

export default function App() {
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  // Convert Yahoo Finance ticker to TradingView format for the chart
  const getTradingViewSymbol = (t) => {
    if (!t) return "BSE:SENSEX"; // Default chart
    const matched = POPULAR_STOCKS.find(s => s.ticker === t);
    if (matched) return matched.tvSymbol;
    if (t.endsWith('.NS')) return `NSE:${t.replace('.NS', '')}`;
    if (t.endsWith('.BO')) return `BSE:${t.replace('.BO', '')}`;
    return t; // Fallback
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!ticker) return;

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      
      const response = await fetch(`${backendUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticker: ticker.toUpperCase(), 
          company_name: companyName || ticker 
        }),
      });

      if (!response.ok) throw new Error('Analysis failed. The AI agents encountered an error or rate limit.');
      
      const data = await response.json();
      setReport(data.report);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPopular = (stock) => {
    setTicker(stock.ticker);
    setCompanyName(stock.name);
    setReport(null); // Clear previous report when a new stock is clicked
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      
      {/* --- Premium Header --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-xl shadow-lg shadow-blue-200">
              <Activity className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-indigo-700">
                AI Stock Analyst Pro
              </h1>
              <p className="text-slate-500 text-xs font-medium tracking-wide uppercase">7-Agent Institutional Intelligence</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Systems Operational
          </div>
        </div>
      </header>

      {/* --- Main Dashboard Content --- */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Top Section: Controls & Popular Stocks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Input Panel */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-slate-800">
                <Search className="w-5 h-5 text-blue-600" />
                Target Asset
              </h2>
              <form onSubmit={handleAnalyze} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Enter Ticker (e.g., RELIANCE.NS)"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-2 ml-1">Requires .NS (NSE) or .BO (BSE) suffix.</p>
                </div>
                
                <button
                  type="submit"
                  disabled={loading || !ticker}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3.5 px-4 rounded-xl transition-all shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <><Activity className="w-5 h-5 animate-spin" /> Orchestrating AI...</>
                  ) : (
                    <><TrendingUp className="w-5 h-5" /> Generate Investment Memo</>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Popular Stocks Panel */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-slate-800">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Quick Select Indices
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {POPULAR_STOCKS.map((stock) => (
                <button
                  key={stock.ticker}
                  onClick={() => handleSelectPopular(stock)}
                  className={`text-left px-4 py-3 rounded-xl border transition-all ${
                    ticker === stock.ticker 
                      ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' 
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-semibold text-slate-800 text-sm truncate">{stock.name}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{stock.ticker}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- Dynamic Content Area (Chart & Report) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Interactive Candlestick Chart */}
          <div className={`${report || loading ? 'lg:col-span-5' : 'lg:col-span-12'} transition-all duration-500 ease-in-out`}>
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 h-[600px] overflow-hidden">
              <AdvancedRealTimeChart 
                theme="light"
                symbol={getTradingViewSymbol(ticker)}
                autosize
                allow_symbol_change={false}
                hide_side_toolbar={false}
              />
            </div>
          </div>

          {/* Right Column: AI Analysis Report */}
          {(loading || report || error) && (
            <div className="lg:col-span-7 space-y-6">
              
              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl flex items-start gap-3 shadow-sm">
                  <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Analysis Interrupted</h3>
                    <p className="text-sm mt-1 opacity-90">{error}</p>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 h-[600px] flex flex-col items-center justify-center text-center relative overflow-hidden">
                  {/* Subtle pulsing background */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/50 to-indigo-50/50 animate-pulse"></div>
                  
                  <div className="relative z-10">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                      <Activity className="absolute inset-0 m-auto text-blue-600 w-8 h-8 animate-pulse" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">7 Agents Deployed</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mb-8">
                      Gathering institutional data, evaluating risk matrices, and calculating sentiment.
                    </p>
                    
                    {/* Simulated loading steps */}
                    <div className="space-y-3 text-left max-w-xs mx-auto w-full">
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-green-500" /> Connecting to Market Data
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-green-500" /> Scanning Global News
                      </div>
                      <div className="flex items-center gap-3 text-sm text-blue-600 font-medium">
                        <Clock className="w-4 h-4 animate-spin" /> Synthesizing Final Memo...
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Report State */}
              {report && !loading && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 h-[600px] overflow-y-auto custom-scrollbar">
                  <div className="prose prose-slate max-w-none 
                    prose-headings:text-slate-800 prose-headings:font-bold 
                    prose-h2:border-b prose-h2:pb-2 prose-h2:mt-8 prose-h2:text-2xl
                    prose-h3:text-xl prose-h3:text-blue-900
                    prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-slate-900 prose-ul:list-disc prose-li:my-1">
                    <ReactMarkdown>{report}</ReactMarkdown>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>

      {/* --- SEBI Regulatory Disclaimer Footer --- */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start gap-4 mb-6">
            <ShieldAlert className="w-8 h-8 text-amber-500 shrink-0" />
            <div>
              <h4 className="text-slate-200 font-semibold mb-2">REGULATORY & COMPLIANCE DISCLAIMER</h4>
              <ul className="text-xs space-y-2 leading-relaxed">
                <li><strong className="text-slate-300">Not SEBI Registered:</strong> This system is NOT registered with the Securities and Exchange Board of India (SEBI) as an Investment Advisor under the SEBI (Investment Advisers) Regulations, 2013.</li>
                <li><strong className="text-slate-300">No Financial Advice:</strong> This platform is for <strong>educational and informational purposes only</strong> and does not constitute investment advice, a recommendation to buy or sell securities, or any form of solicitation.</li>
                <li><strong className="text-slate-300">AI-Generated Content:</strong> Reports are generated by Artificial Intelligence systems (CrewAI & Google Gemini). Data may be delayed, incomplete, or subject to errors and hallucinations. Always independently verify all information.</li>
                <li><strong className="text-slate-300">Market Risks:</strong> Equity investments are subject to market risks. Past performance is not indicative of future results. Consult a SEBI-registered financial advisor before making investment decisions.</li>
              </ul>
            </div>
          </div>
          <div className="text-center text-xs border-t border-slate-800 pt-6">
            <p>© {new Date().getFullYear()} AI Stock Analyst Pro | Powered by 7-Agent Architecture</p>
          </div>
        </div>
      </footer>
      
      {/* Custom Scrollbar CSS embedded to keep it simple */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}
