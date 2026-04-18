import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Activity, Search, TrendingUp, AlertCircle, ShieldAlert, BarChart3, Clock, CheckCircle2, Coffee, X } from 'lucide-react';
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

const POPULAR_STOCKS = [
  { name: "Reliance Industries", ticker: "RELIANCE.NS", tvSymbol: "BSE:RELIANCE" },
  { name: "HDFC Bank", ticker: "HDFCBANK.NS", tvSymbol: "BSE:HDFCBANK" },
  { name: "TCS", ticker: "TCS.NS", tvSymbol: "BSE:TCS" },
  { name: "Zomato", ticker: "ZOMATO.NS", tvSymbol: "BSE:ZOMATO" },
  { name: "Mahindra & Mahindra", ticker: "M&M.NS", tvSymbol: "BSE:M&M" },
];

export default function App() {
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  
  // NEW: State for the unignorable popup
  const [showPopup, setShowPopup] = useState(true);

  const getTradingViewSymbol = (t) => {
    if (!t) return "BSE:SENSEX"; 
    const matched = POPULAR_STOCKS.find(s => s.ticker === t);
    if (matched) return matched.tvSymbol;
    if (t.endsWith('.NS')) return `BSE:${t.replace('.NS', '')}`;
    if (t.endsWith('.BO')) return `BSE:${t.replace('.BO', '')}`;
    return t; 
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!ticker) return;

    setLoading(true);
    setError(null);
    setReport(null);
    setMetrics(null);

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
      setMetrics(data.metrics);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPopular = (stock) => {
    setTicker(stock.ticker);
    setCompanyName(stock.name);
    setReport(null);
    setMetrics(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col relative">
      
      {/* --- NEW: Unignorable "Buy Me a Tea" Popup --- */}
      {showPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex justify-center mb-6">
              <div className="bg-amber-100 p-4 rounded-full border border-amber-200 shadow-inner">
                <Coffee className="w-10 h-10 text-amber-600" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-3">Welcome to AI Stock Analyst!</h2>
            <p className="text-center text-slate-600 mb-8 leading-relaxed">
              This platform uses 7 advanced AI agents to give you institutional-grade stock analysis for free. Running these servers costs money. If this tool helps you make better trades, please consider buying me a tea! ☕
            </p>
            
            <div className="flex flex-col gap-3">
              <a 
                href="https://www.chai4.me/jatinkalra" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setShowPopup(false)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md flex justify-center items-center gap-2 text-lg"
              >
                <Coffee className="w-5 h-5" /> Buy me a Tea
              </a>
              <button 
                onClick={() => setShowPopup(false)}
                className="w-full text-slate-500 hover:text-slate-700 font-medium py-3 px-4 rounded-xl transition-colors text-sm"
              >
                Continue to platform
              </button>
            </div>
          </div>
        </div>
      )}

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
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Systems Operational
            </div>
            <a 
              href="https://www.chai4.me/jatinkalra" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-900 px-4 py-2 rounded-full font-medium text-sm transition-colors border border-amber-300 shadow-sm"
            >
              <Coffee className="w-4 h-4" />
              <span className="hidden sm:inline">Support the servers</span>
            </a>
          </div>
        </div>
      </header>

      {/* --- Main Dashboard Content --- */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-slate-800">
                <Search className="w-5 h-5 text-blue-600" /> Target Asset
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
                    <><TrendingUp className="w-5 h-5" /> Generate Memo</>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-slate-800">
              <BarChart3 className="w-5 h-5 text-blue-600" /> Quick Select Indices
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`${report || loading ? 'lg:col-span-5' : 'lg:col-span-12'} transition-all duration-500 ease-in-out`}>
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 h-[800px] overflow-hidden">
              <AdvancedRealTimeChart 
                theme="light"
                symbol={getTradingViewSymbol(ticker)}
                autosize
                allow_symbol_change={false}
                hide_side_toolbar={false}
              />
            </div>
          </div>

          {(loading || report || error) && (
            <div className="lg:col-span-7 flex flex-col h-[800px]">
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl flex items-start gap-3 shadow-sm mb-6">
                  <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Analysis Interrupted</h3>
                    <p className="text-sm mt-1 opacity-90">{error}</p>
                  </div>
                </div>
              )}

              {/* --- MODIFIED: Loading State with Google Ad Space --- */}
              {loading && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-grow flex flex-col relative overflow-hidden h-full">
                  
                  {/* Top Half: AI Animation */}
                  <div className="h-1/2 flex flex-col items-center justify-center p-8 border-b border-slate-100 relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/50 to-indigo-50/50 animate-pulse"></div>
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="relative w-16 h-16 mb-4">
                        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                        <Activity className="absolute inset-0 m-auto text-blue-600 w-6 h-6 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-1">Agents Orchestrating</h3>
                      <p className="text-slate-500 text-sm mb-4">Estimated time: 60-90 seconds</p>
                      <div className="flex items-center gap-2 text-sm text-blue-600 font-medium bg-blue-50 px-4 py-2 rounded-full">
                        <Clock className="w-4 h-4 animate-spin" /> Synthesizing data...
                      </div>
                    </div>
                  </div>

                  {/* Bottom Half: Google AdSense Container */}
                  <div className="h-1/2 bg-slate-50 p-6 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-3">Advertisement</span>
                    
                    {/* >>> GOOGLE ADSENSE CODE GOES HERE <<< */}
                    <div className="w-full max-w-md h-[250px] bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-inner overflow-hidden relative">
                      {/* Placeholder text (remove when adding real ad) */}
                      <p className="text-slate-400 text-sm text-center px-6">
                        Your Google AdSense block will render here while the user waits for the analysis.
                      </p>
                      
                      {/* Example of how the real code will look:
                      <ins className="adsbygoogle"
                           style={{ display: 'block', width: '100%', height: '100%' }}
                           data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                           data-ad-slot="XXXXXXXXXX"
                           data-ad-format="auto"
                           data-full-width-responsive="true"></ins>
                      */}
                    </div>
                  </div>

                </div>
              )}

              {/* Success Report State */}
              {report && !loading && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex-grow overflow-y-auto custom-scrollbar flex flex-col relative">
                  
                  {metrics && Object.keys(metrics).length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 shadow-sm shrink-0">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-4">
                        {Object.entries(metrics).map(([key, val]) => (
                          <div key={key} className="flex flex-col">
                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{key}</span>
                            <span className="text-slate-900 font-semibold text-sm">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="prose prose-slate prose-lg max-w-none 
                    prose-headings:text-slate-800 prose-headings:font-bold 
                    prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-3 prose-h2:mt-8 prose-h2:text-2xl
                    prose-h3:text-xl prose-h3:text-blue-800 prose-h3:mt-8
                    prose-p:text-slate-600 prose-p:leading-relaxed
                    prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-slate-900 prose-strong:font-semibold
                    prose-ul:list-disc prose-li:my-1.5 prose-li:text-slate-600
                    prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-slate-700">
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
                <li><strong className="text-slate-300">Not SEBI Registered:</strong> This system is NOT registered with SEBI as an Investment Advisor.</li>
                <li><strong className="text-slate-300">No Financial Advice:</strong> This platform is for <strong>educational and informational purposes only</strong>.</li>
              </ul>
            </div>
          </div>
          <div className="text-center text-xs border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© {new Date().getFullYear()} AI Stock Analyst Pro | Developed by Jatin Kalra</p>
            <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1">
              <Coffee className="w-3 h-3" /> Support this project
            </a>
          </div>
        </div>
      </footer>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}
