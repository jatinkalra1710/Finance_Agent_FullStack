import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Activity, Search, TrendingUp, AlertCircle, ShieldAlert, BarChart3, Clock, CheckCircle2, Coffee, X, FileText, Scale, Sparkles, Download, LayoutDashboard, History, Crown, LogIn, ChevronRight } from 'lucide-react';
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

// Added major Indices for the Startup feel
const POPULAR_STOCKS = [
  { name: "NIFTY 50", ticker: "^NSEI", tvSymbol: "NSE:NIFTY" },
  { name: "Reliance Ind.", ticker: "RELIANCE.NS", tvSymbol: "BSE:RELIANCE" },
  { name: "HDFC Bank", ticker: "HDFCBANK.NS", tvSymbol: "BSE:HDFCBANK" },
  { name: "TCS", ticker: "TCS.NS", tvSymbol: "BSE:TCS" },
  { name: "Infosys", ticker: "INFY.NS", tvSymbol: "BSE:INFY" },
  { name: "Zomato", ticker: "ZOMATO.NS", tvSymbol: "BSE:ZOMATO" },
];

export default function App() {
  // Core State
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  
  // App Navigation & History State
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'history'
  const [memoHistory, setMemoHistory] = useState([]);
  
  // Modals
  const [showPopup, setShowPopup] = useState(true);
  const [showLegal, setShowLegal] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showPro, setShowPro] = useState(false);
  
  const [loadingStep, setLoadingStep] = useState(0);

  // Load history from local storage on boot
  useEffect(() => {
    const saved = localStorage.getItem('ai_analyst_history');
    if (saved) {
      setMemoHistory(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < 5 ? prev + 1 : prev));
      }, 12000); 
    }
    return () => clearInterval(interval);
  }, [loading]);

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
    setActiveTab('dashboard');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase(), company_name: companyName || ticker }),
      });

      if (!response.ok) throw new Error('Analysis failed. The AI agents encountered an error or rate limit.');
      
      const data = await response.json();
      setReport(data.report);
      setMetrics(data.metrics);

      // Save to History!
      const newRecord = {
        id: Date.now(),
        ticker: data.ticker,
        companyName: companyName || data.ticker,
        report: data.report,
        metrics: data.metrics,
        timestamp: data.timestamp || new Date().toLocaleString()
      };
      const updatedHistory = [newRecord, ...memoHistory];
      setMemoHistory(updatedHistory);
      localStorage.setItem('ai_analyst_history', JSON.stringify(updatedHistory));

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
    setActiveTab('dashboard');
  };

  const loadHistoryItem = (item) => {
    setTicker(item.ticker);
    setCompanyName(item.companyName);
    setReport(item.report);
    setMetrics(item.metrics);
    setActiveTab('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      
      {/* --- Background Blobs --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-40 -left-40 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
      </div>

      {/* --- MODALS --- */}
      {/* Welcome Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in-up border border-slate-100 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
            <button onClick={() => setShowPopup(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1.5"><X className="w-5 h-5" /></button>
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-4 rounded-2xl border border-amber-200 relative">
                <Sparkles className="absolute -top-2 -right-2 text-amber-500 w-5 h-5 animate-pulse" />
                <Coffee className="w-10 h-10 text-amber-600" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-center text-slate-800 mb-3">Welcome to AI Analyst Pro</h2>
            <p className="text-center text-slate-600 mb-8 text-sm">This platform uses 7 advanced AI agents to give you institutional-grade stock analysis for free. Running these servers costs real money. If this tool helps you make better trades, consider fueling the dev! ☕</p>
            <div className="flex flex-col gap-3">
              <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" onClick={() => setShowPopup(false)} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg flex justify-center items-center gap-2"><Coffee className="w-5 h-5" /> Buy me a Tea</a>
              <button onClick={() => setShowPopup(false)} className="w-full text-slate-500 hover:text-slate-800 font-semibold py-3 rounded-xl text-sm">Continue to platform</button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal (Startup Feel) */}
      {showAuth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 relative animate-fade-in-up">
            <button onClick={() => setShowAuth(false)} className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 rounded-full p-1"><X className="w-5 h-5" /></button>
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6"><LogIn className="w-6 h-6" /></div>
            <h2 className="text-2xl font-bold mb-2">Sign In</h2>
            <p className="text-slate-500 text-sm mb-6">Save your memos permanently and sync across devices.</p>
            <div className="space-y-4">
              <input type="email" placeholder="Email address" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              <button className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800">Continue with Email</button>
            </div>
            <p className="text-center text-xs text-slate-400 mt-6">Authentication is currently in Beta.</p>
          </div>
        </div>
      )}

      {/* Pro Modal (Subscription Prep) */}
      {showPro && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in-up overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <button onClick={() => setShowPro(false)} className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 rounded-full p-1"><X className="w-5 h-5" /></button>
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6"><Crown className="w-6 h-6" /></div>
            <h2 className="text-2xl font-bold mb-2">Upgrade to Pro</h2>
            <p className="text-slate-500 text-sm mb-6">Get the ultimate edge in the market.</p>
            <ul className="space-y-3 mb-8 text-sm font-medium text-slate-700">
              <li className="flex gap-2 items-center"><CheckCircle2 className="w-5 h-5 text-indigo-500"/> Unlimited Daily Analyses</li>
              <li className="flex gap-2 items-center"><CheckCircle2 className="w-5 h-5 text-indigo-500"/> Real-time PDF Exports</li>
              <li className="flex gap-2 items-center"><CheckCircle2 className="w-5 h-5 text-indigo-500"/> Ad-Free Experience</li>
            </ul>
            <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all">Subscribe - ₹499/mo</button>
          </div>
        </div>
      )}

      {/* --- SIDEBAR (SAAS UI) --- */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col relative z-20 shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-lg shadow-md"><Activity className="text-white w-5 h-5" /></div>
            <h1 className="font-bold text-lg text-slate-800 tracking-tight">Analyst Pro</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'history' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <div className="flex items-center gap-3"><History className="w-5 h-5" /> History</div>
            {memoHistory.length > 0 && <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{memoHistory.length}</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-3">
          <button onClick={() => setShowPro(true)} className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-xl font-bold border border-indigo-100 hover:border-indigo-200 transition-colors">
            <Crown className="w-5 h-5" /> Upgrade Pro
          </button>
          <div className="flex items-center gap-3 px-4 py-2 mt-2">
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold">U</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">Guest User</p>
              <button onClick={() => setShowAuth(true)} className="text-xs text-blue-600 font-semibold hover:underline">Sign In</button>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
          <div className="flex md:hidden items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg"><Activity className="text-white w-4 h-4" /></div>
            <h1 className="font-bold text-slate-800">Analyst Pro</h1>
          </div>
          <div className="hidden md:flex text-sm font-semibold text-slate-500">
            {activeTab === 'dashboard' ? 'New Analysis Engine' : 'Your Generated Memos'}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> API Online
            </div>
            <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-amber-100 text-amber-900 px-4 py-1.5 rounded-full font-bold text-xs transition-all hover:bg-amber-200">
              <Coffee className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Support</span>
            </a>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
          
          {/* TAB: HISTORY */}
          {activeTab === 'history' && (
            <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
              <h2 className="text-2xl font-bold flex items-center gap-2"><History className="text-blue-600"/> Saved Memos</h2>
              {memoHistory.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-700">No history yet</h3>
                  <p className="text-slate-500 text-sm mt-2">Generate your first analysis to see it here.</p>
                  <button onClick={() => setActiveTab('dashboard')} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-full font-semibold">Go to Dashboard</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {memoHistory.map((memo) => (
                    <div key={memo.id} onClick={() => loadHistoryItem(memo)} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-lg text-slate-800">{memo.ticker}</h3>
                        <div className="bg-slate-100 p-1.5 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><ChevronRight className="w-4 h-4"/></div>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 mb-4 truncate">{memo.companyName}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                        <Clock className="w-3 h-3" /> {memo.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <h2 className="font-bold text-lg mb-5 flex items-center gap-2 text-slate-800"><Search className="w-5 h-5 text-blue-600" /> Target Asset</h2>
                    <form onSubmit={handleAnalyze} className="space-y-4">
                      <div>
                        <input type="text" placeholder="Enter Ticker (e.g., RELIANCE.NS)" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 outline-none font-semibold" required />
                      </div>
                      <button type="submit" disabled={loading || !ticker} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 disabled:opacity-50 flex justify-center items-center gap-2 hover:-translate-y-0.5 transition-transform">
                        {loading ? <><Activity className="w-5 h-5 animate-spin" /> Orchestrating...</> : <><TrendingUp className="w-5 h-5" /> Generate Memo</>}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <h2 className="font-bold text-lg mb-5 flex items-center gap-2 text-slate-800"><BarChart3 className="w-5 h-5 text-blue-600" /> Quick Select Indices</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {POPULAR_STOCKS.map((stock) => (
                      <button key={stock.ticker} onClick={() => handleSelectPopular(stock)} className={`text-left px-5 py-4 rounded-2xl border transition-all ${ticker === stock.ticker ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300 bg-white'}`}>
                        <div className="font-bold text-slate-800 text-sm truncate">{stock.name}</div>
                        <div className="text-slate-500 text-xs font-medium mt-1">{stock.ticker}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic View Area */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                <div className={`${report || loading ? 'lg:col-span-5' : 'lg:col-span-12'} transition-all duration-500`}>
                  <div className="bg-white p-2 rounded-3xl shadow-sm border border-slate-200 h-[800px] overflow-hidden hover:shadow-md transition-shadow">
                    <AdvancedRealTimeChart theme="light" symbol={getTradingViewSymbol(ticker)} autosize allow_symbol_change={false} hide_side_toolbar={false} />
                  </div>
                </div>

                {(loading || report || error) && (
                  <div className="lg:col-span-7 flex flex-col h-[800px] animate-fade-in-up">
                    
                    {error && (
                      <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-5 rounded-2xl flex items-start gap-3 shadow-sm mb-6">
                        <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                        <div><h3 className="font-bold text-lg">Analysis Interrupted</h3><p className="text-sm mt-1 font-medium">{error}</p></div>
                      </div>
                    )}

                    {/* Loading Ad Space */}
                    {loading && (
                      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex-grow flex flex-col relative overflow-hidden h-full">
                        <div className="h-1/2 flex flex-col justify-center p-10 border-b border-slate-100 relative bg-slate-900 overflow-hidden">
                          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                          <h3 className="text-2xl font-bold text-white mb-6 relative z-10 flex items-center gap-3"><Activity className="text-blue-400 animate-spin-slow" /> Protocol Initiated</h3>
                          <div className="space-y-4 relative z-10">
                            {[
                              "Establishing secure YFinance connection...",
                              "Sector Analyst scanning global news...",
                              "Quant Agent calculating fundamentals...",
                              "Strategist generating institutional memo..."
                            ].map((text, i) => (
                              <div key={i} className={`flex items-center gap-3 text-sm font-medium transition-all ${loadingStep >= i ? 'text-blue-400' : 'text-slate-600'}`}>
                                {loadingStep > i ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : (loadingStep === i ? <Clock className="w-5 h-5 animate-spin" /> : <div className="w-5 h-5 border-2 border-slate-600 rounded-full"></div>)}
                                {i+1}. {text}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="h-1/2 bg-slate-50 p-6 flex flex-col items-center justify-center relative">
                          <span className="absolute top-4 left-6 text-[10px] text-slate-400 uppercase font-bold">Advertisement</span>
                          {/* GOOGLE ADSENSE SPACE */}
                          <div className="w-full max-w-[336px] h-[280px] bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center relative">
                            <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
                            <p className="text-slate-400 text-sm font-medium">Google AdSense Space</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Report Render */}
                    {report && !loading && (
                      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex-grow overflow-y-auto custom-scrollbar flex flex-col relative">
                        {metrics && Object.keys(metrics).length > 0 && (
                          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm shrink-0">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-4">
                              {Object.entries(metrics).map(([key, val]) => (
                                <div key={key} className="flex flex-col">
                                  <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest mb-1">{key}</span>
                                  <span className="text-slate-800 font-bold text-[15px]">{val}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex justify-end mb-4">
                          <button onClick={() => setShowPro(true)} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 px-3 py-1.5 rounded-full transition-colors border border-slate-200"><Download className="w-3 h-3" /> Save PDF (Pro)</button>
                        </div>
                        <div className="prose prose-slate prose-lg max-w-none prose-headings:text-slate-900 prose-headings:font-extrabold tracking-tight prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-4 prose-h2:mt-10 prose-h2:text-2xl prose-h3:text-blue-700 prose-p:text-slate-600 prose-p:leading-loose prose-p:font-medium prose-a:text-blue-600 prose-strong:text-slate-900 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50/50 prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:rounded-r-xl prose-blockquote:not-italic text-sm sm:text-base">
                          <ReactMarkdown>{report}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-slate-200 pb-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-3"><ShieldAlert className="w-5 h-5 text-amber-500" /><h4 className="text-slate-700 font-bold text-sm">Disclaimer</h4></div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">Not SEBI Registered. AI-generated reports are for educational purposes only. Do not trade solely based on this data.</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowLegal(true)} className="text-xs font-medium text-slate-500 hover:text-slate-800">Privacy & Terms</button>
              </div>
            </div>
          </footer>
        </div>
      </div>
      
      {/* Launch Animations CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
        .animate-spin-slow { animation: spin 3s linear infinite; }
      `}} />
    </div>
  );
}
