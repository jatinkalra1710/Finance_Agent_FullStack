import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Activity, Search, TrendingUp, AlertCircle, ShieldAlert, BarChart3, Clock, CheckCircle2, Coffee, X, FileText, Scale, Sparkles, Download, LayoutDashboard, History, Crown, LogIn, ChevronRight, Zap, Target, Sun, Moon, Share2, Check } from 'lucide-react';
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

const POPULAR_STOCKS = [
  { name: "NIFTY 50", ticker: "^NSEI", tvSymbol: "NSE:NIFTY" },
  { name: "Reliance Ind.", ticker: "RELIANCE.NS", tvSymbol: "BSE:RELIANCE" },
  { name: "HDFC Bank", ticker: "HDFCBANK.NS", tvSymbol: "BSE:HDFCBANK" },
  { name: "TCS", ticker: "TCS.NS", tvSymbol: "BSE:TCS" },
  { name: "Infosys", ticker: "INFY.NS", tvSymbol: "BSE:INFY" },
  { name: "Zomato", ticker: "ZOMATO.NS", tvSymbol: "BSE:ZOMATO" },
];

export default function App() {
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [memoHistory, setMemoHistory] = useState([]);
  
  const [showPopup, setShowPopup] = useState(true);
  const [showLegal, setShowLegal] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showPro, setShowPro] = useState(false);
  
  const [loadingStep, setLoadingStep] = useState(0);
  const [theme, setTheme] = useState('dark'); 
  const [copied, setCopied] = useState(false);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const handleCopy = () => {
    if (report) {
      navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('ai_analyst_history');
    if (saved) setMemoHistory(JSON.parse(saved));
    const savedTheme = localStorage.getItem('ai_analyst_theme');
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('ai_analyst_theme', theme);
  }, [theme]);

  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < 5 ? prev + 1 : prev));
      }, 15000); 
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

      if (!response.ok) throw new Error('Analysis failed. The AI agents encountered a rate limit or timeout.');
      
      const data = await response.json();
      setReport(data.report);
      setMetrics(data.metrics);

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

  // Dynamic Theme Colors
  const baseBg = theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardBg = theme === 'dark' ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200';
  const cardHover = theme === 'dark' ? 'hover:bg-slate-800/50 hover:border-blue-500/50' : 'hover:bg-slate-50 hover:border-blue-300';
  const inputBg = theme === 'dark' ? 'bg-slate-950/50 border-slate-700 text-white focus:ring-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:ring-blue-500';
  const textMuted = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const textHeading = theme === 'dark' ? 'text-white' : 'text-slate-900';

  return (
    <div className={`flex h-screen font-sans overflow-hidden relative selection:bg-blue-500/30 transition-colors duration-500 ${baseBg}`}>
      
      {/* Mesmerizing Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full mix-blend-screen filter blur-[100px] animate-blob ${theme==='dark' ? 'bg-blue-900/30' : 'bg-blue-300/40'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000 ${theme==='dark' ? 'bg-emerald-900/20' : 'bg-emerald-200/40'}`}></div>
        {theme === 'dark' && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03]"></div>}
      </div>

      {/* --- UNIGNORABLE POPUP --- */}
      {showPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl transition-all">
          <div className={`${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'} rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in-up border overflow-hidden group`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            <button onClick={() => setShowPopup(false)} className={`absolute top-4 right-4 ${textMuted} hover:bg-blue-500/10 rounded-full p-1.5 transition-all`}><X className="w-5 h-5" /></button>
            <div className="flex justify-center mb-6">
              <div className={`${theme==='dark'?'bg-slate-800':'bg-blue-50'} p-5 rounded-2xl border ${theme==='dark'?'border-slate-700':'border-blue-100'} relative group-hover:border-blue-500/50 transition-colors duration-500`}>
                <Sparkles className="absolute -top-2 -right-2 text-blue-400 w-6 h-6 animate-pulse" />
                <Coffee className="w-10 h-10 text-blue-500" />
              </div>
            </div>
            <h2 className={`text-3xl font-extrabold text-center mb-3 tracking-tight ${textHeading}`}>AI Analyst <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Pro</span></h2>
            <p className={`text-center ${textMuted} mb-8 text-sm leading-relaxed font-medium`}>This platform uses 7 advanced AI agents to give you institutional-grade stock analysis. Running these intense AI models costs real money. If this tool helps you profit, please consider fueling the servers! ⚡</p>
            <div className="flex flex-col gap-3">
              <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" onClick={() => setShowPopup(false)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] flex justify-center items-center gap-2 hover:-translate-y-0.5 transition-all"><Coffee className="w-5 h-5" /> Buy me a Tea</a>
              <button onClick={() => setShowPopup(false)} className={`w-full ${textMuted} hover:${textHeading} font-semibold py-3 rounded-xl text-sm transition-colors`}>Continue to platform</button>
            </div>
          </div>
        </div>
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`w-72 ${cardBg} backdrop-blur-2xl hidden md:flex flex-col relative z-20 shadow-2xl transition-colors duration-500`}>
        <div className={`p-6 border-b ${theme==='dark'?'border-slate-800/80':'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/30"><Activity className="text-white w-6 h-6" /></div>
            <h1 className={`font-extrabold text-xl tracking-tight ${textHeading}`}>Analyst<span className="text-blue-500">Pro</span></h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <p className={`text-[10px] font-bold ${textMuted} uppercase tracking-widest px-4 mb-2 mt-2`}>Main Menu</p>
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' : `${textMuted} hover:${textHeading} border border-transparent`}`}>
            <LayoutDashboard className="w-5 h-5" /> Trading Terminal
          </button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'history' ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' : `${textMuted} hover:${textHeading} border border-transparent`}`}>
            <div className="flex items-center gap-3"><History className="w-5 h-5" /> Saved Memos</div>
            {memoHistory.length > 0 && <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">{memoHistory.length}</span>}
          </button>
        </nav>

        <div className={`p-4 border-t ${theme==='dark'?'border-slate-800/80 bg-slate-900/30':'border-slate-200 bg-slate-50'}`}>
          <div className={`bg-gradient-to-br ${theme==='dark'?'from-slate-800 to-slate-900':'from-indigo-50 to-white'} p-4 rounded-2xl border ${theme==='dark'?'border-slate-700':'border-indigo-100'} relative overflow-hidden group cursor-pointer`} onClick={() => setShowPro(true)}>
            <h4 className={`${textHeading} font-bold text-sm flex items-center gap-2 mb-1`}><Crown className="w-4 h-4 text-indigo-500"/> Pro Tier</h4>
            <p className={`text-xs ${textMuted} font-medium mb-3`}>Unlock unlimited API usage.</p>
            <button className={`text-xs font-bold ${theme==='dark'?'bg-white text-slate-900':'bg-indigo-600 text-white'} px-3 py-1.5 rounded-lg w-full transition-colors`}>Upgrade Now</button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        
        {/* Header */}
        <header className={`${cardBg} backdrop-blur-xl border-b sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm transition-colors duration-500`}>
          <div className="flex md:hidden items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm"><Activity className="text-white w-5 h-5" /></div>
            <h1 className={`font-extrabold ${textHeading} text-lg`}>Analyst<span className="text-blue-500">Pro</span></h1>
          </div>
          
          <div className={`hidden md:flex items-center gap-2 ${theme==='dark'?'bg-slate-800/50 border-slate-700':'bg-slate-100 border-slate-200'} px-4 py-1.5 rounded-full border`}>
            <Search className={`w-4 h-4 ${textMuted}`} />
            <span className={`text-xs font-semibold ${textMuted} uppercase tracking-widest`}>{activeTab === 'dashboard' ? 'Global Markets Terminal' : 'Encrypted History Vault'}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors ${theme==='dark'?'hover:bg-slate-800 text-amber-400':'hover:bg-slate-200 text-indigo-600'}`}>
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-bold text-xs transition-all shadow-md">
              <Zap className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Boost Servers</span>
            </a>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
          
          {/* TAB: DASHBOARD (TERMINAL) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-[1600px] mx-auto animate-fade-in-up">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Input Panel */}
                <div className={`lg:col-span-4 ${cardBg} backdrop-blur-xl p-6 rounded-3xl shadow-sm border flex flex-col justify-between relative overflow-hidden group transition-colors duration-500`}>
                  <div className="relative z-10">
                    <h2 className={`font-bold text-lg mb-6 flex items-center gap-2 ${textHeading}`}>
                      <Target className="w-5 h-5 text-blue-500" /> Target Asset Parameters
                    </h2>
                    <form onSubmit={handleAnalyze} className="space-y-5">
                      <div>
                        <input type="text" placeholder="Enter Ticker (e.g., RELIANCE.NS)" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} 
                          className={`w-full px-5 py-4 rounded-xl outline-none font-bold transition-all uppercase ${inputBg}`} required />
                        <p className={`text-[11px] ${textMuted} mt-2 ml-1 font-semibold uppercase tracking-wider`}>Required Suffix: .NS (NSE) or .BO (BSE)</p>
                      </div>
                      <button type="submit" disabled={loading || !ticker} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 flex justify-center items-center gap-2 hover:-translate-y-0.5 transition-all text-sm uppercase tracking-wider">
                        {loading ? <><Activity className="w-5 h-5 animate-spin" /> Executing Scan...</> : <><Zap className="w-5 h-5" /> Initialize AI Scan</>}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Quick Select */}
                <div className={`lg:col-span-8 ${cardBg} backdrop-blur-xl p-6 rounded-3xl shadow-sm border transition-colors duration-500`}>
                  <h2 className={`font-bold text-lg mb-6 flex items-center gap-2 ${textHeading}`}>
                    <BarChart3 className="w-5 h-5 text-blue-500" /> Global Indices & Watchlist
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                    {POPULAR_STOCKS.map((stock) => (
                      <button key={stock.ticker} onClick={() => handleSelectPopular(stock)} className={`text-left p-4 rounded-2xl border transition-all duration-300 ${ticker === stock.ticker ? `border-blue-500 ${theme==='dark'?'bg-blue-900/40':'bg-blue-50'} shadow-sm` : `${theme==='dark'?'border-slate-800/80 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-600':'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'}`}`}>
                        <div className={`font-extrabold ${textHeading} text-sm truncate mb-1`}>{stock.name}</div>
                        <div className="text-blue-500 text-[10px] font-bold uppercase tracking-wider">{stock.ticker}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic View Area: Chart & Live Data Side-by-Side */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
                
                {/* Left: TV Chart with Interval FIX */}
                <div className="lg:col-span-8 h-full">
                  <div className={`${cardBg} backdrop-blur-xl p-2 rounded-3xl shadow-sm border h-full overflow-hidden transition-colors duration-500`}>
                    <AdvancedRealTimeChart 
                      theme={theme} 
                      symbol={getTradingViewSymbol(ticker)} 
                      autosize 
                      allow_symbol_change={false} 
                      hide_side_toolbar={false} 
                      backgroundColor="transparent" 
                      interval="D" 
                    />
                  </div>
                </div>

                {/* Right: Financial Grid (MESMERIZING UI UPGRADE) */}
                <div className={`lg:col-span-4 h-full ${cardBg} backdrop-blur-xl rounded-3xl shadow-sm border overflow-hidden flex flex-col transition-colors duration-500`}>
                  <div className={`p-5 border-b ${theme==='dark'?'border-slate-800/80 bg-slate-900/80':'border-slate-200 bg-slate-50/80'} flex items-center justify-between`}>
                    <h3 className={`font-bold ${textHeading} flex items-center gap-2`}><Activity className="w-4 h-4 text-blue-500"/> Live Ratios</h3>
                    <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full font-bold uppercase border border-blue-500/20">Auto-Sync</span>
                  </div>
                  
                  <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
                    {!ticker && !loading && !metrics && (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                        <Target className={`w-12 h-12 ${textMuted} mb-4`} />
                        <p className={`text-sm font-semibold ${textMuted}`}>Select an asset to view fundamental ratios.</p>
                      </div>
                    )}

                    {loading && (
                      <div className="h-full grid grid-cols-2 gap-3 content-start">
                        {[...Array(12)].map((_, i) => (
                          <div key={i} className={`flex flex-col justify-center ${theme==='dark'?'bg-slate-800/30 border-slate-800':'bg-slate-100/50 border-slate-200'} p-4 rounded-xl border h-20`}>
                            <div className={`h-2 w-16 ${theme==='dark'?'bg-slate-700':'bg-slate-300'} rounded animate-pulse mb-2`}></div>
                            <div className={`h-4 w-20 ${theme==='dark'?'bg-slate-600':'bg-slate-400'} rounded animate-pulse delay-75`}></div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* NEW GRID LAYOUT FOR RATIOS */}
                    {metrics && Object.keys(metrics).length > 0 && !loading && (
                      <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                        {Object.entries(metrics).map(([key, val]) => (
                          <div key={key} className={`flex flex-col justify-center ${theme==='dark'?'bg-slate-800/40 border-slate-700/50':'bg-slate-50 border-slate-200'} p-3.5 rounded-xl border hover:border-blue-500/50 transition-colors`}>
                            <span className={`${textMuted} text-[10px] font-bold uppercase tracking-wider mb-1`}>{key}</span>
                            <span className={`${textHeading} font-extrabold text-sm ${val.includes('Buy') || val.includes('Strong') ? 'text-emerald-500' : ''}`}>{val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Report OR Loading Ad Space */}
              {(loading || report || error) && (
                <div className="w-full min-h-[600px] animate-fade-in-up">
                  {/* ... Same loading state and report render as before ... */}
                  {loading && (
                    <div className={`${cardBg} backdrop-blur-xl rounded-3xl shadow-sm border flex flex-col md:flex-row overflow-hidden min-h-[600px] transition-colors`}>
                      <div className={`w-full md:w-1/2 p-10 border-b md:border-b-0 md:border-r ${theme==='dark'?'border-slate-800/80':'border-slate-200'} relative flex flex-col justify-center`}>
                        <div className="relative z-10 mb-10">
                          <div className={`w-16 h-16 ${theme==='dark'?'bg-blue-900/30 border-blue-500/30':'bg-blue-100 border-blue-200'} border rounded-2xl flex items-center justify-center mb-6`}>
                            <Activity className="text-blue-500 w-8 h-8 animate-spin-slow" />
                          </div>
                          <h3 className={`text-3xl font-extrabold ${textHeading} mb-2`}>Protocol Initiated</h3>
                          <p className={`${textMuted} font-medium`}>Orchestrating 7 specialized institutional models.</p>
                        </div>
                        <div className="space-y-5 relative z-10">
                          {[
                            "Establishing secure socket to YFinance...",
                            "Sector Analyst compiling macro shifts...",
                            "Quant Agent running forensic equations...",
                            "Technical Agent mapping vectors...",
                            "Sentiment Agent parsing flows...",
                            "Chief Risk Officer identifying anomalies...",
                            "CIO synthesizing Executive Memo..."
                          ].map((text, i) => (
                            <div key={i} className={`flex items-center gap-4 text-sm font-bold transition-all duration-700 ${loadingStep > i ? textMuted : (loadingStep === i ? 'text-blue-500 translate-x-2' : (theme==='dark'?'text-slate-700':'text-slate-300'))}`}>
                              {loadingStep > i ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : (loadingStep === i ? <Clock className="w-5 h-5 animate-spin shrink-0" /> : <div className={`w-5 h-5 border-2 ${theme==='dark'?'border-slate-700':'border-slate-300'} rounded-full shrink-0`}></div>)}
                              {text}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className={`w-full md:w-1/2 ${theme==='dark'?'bg-slate-950/50':'bg-slate-50'} p-10 flex flex-col items-center justify-center relative`}>
                        <span className={`absolute top-6 left-8 text-[10px] ${textMuted} uppercase tracking-widest font-extrabold flex items-center gap-2`}><Zap className="w-3 h-3"/> Sponsored Payload</span>
                        <div className={`w-full max-w-[400px] h-[300px] ${cardBg} border border-dashed rounded-3xl flex flex-col items-center justify-center relative shadow-sm`}>
                          <BarChart3 className={`w-10 h-10 ${theme==='dark'?'text-slate-700':'text-slate-300'} mb-3`} />
                          <p className={`${textMuted} text-sm font-bold tracking-wide`}>Google AdSense Space</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {report && !loading && (
                    <div className={`${cardBg} backdrop-blur-xl p-10 lg:p-14 rounded-3xl shadow-sm border flex flex-col relative transition-colors`}>
                      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-8 border-b ${theme==='dark'?'border-slate-800/80':'border-slate-200'} gap-4`}>
                        <div>
                          <h2 className={`text-3xl font-extrabold ${textHeading}`}>Executive Investment Memo</h2>
                          <p className={`${textMuted} font-medium mt-1`}>Generated by 7-Agent Institutional Ensemble</p>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={handleCopy} className={`flex items-center gap-2 text-xs font-bold ${theme==='dark'?'text-white bg-slate-800 hover:bg-slate-700':'text-slate-700 bg-slate-100 hover:bg-slate-200'} px-5 py-2.5 rounded-full transition-all`}>
                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />} {copied ? "Copied!" : "Copy Memo"}
                          </button>
                          <button onClick={() => setShowPro(true)} className="flex items-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-full transition-all shadow-md hover:-translate-y-0.5">
                            <Download className="w-4 h-4" /> Export PDF
                          </button>
                        </div>
                      </div>
                      <div className={`prose ${theme==='dark'?'prose-invert':''} prose-lg max-w-none prose-headings:${textHeading} prose-headings:font-extrabold tracking-tight prose-h1:text-3xl prose-h1:border-b ${theme==='dark'?'prose-h1:border-slate-800/80':'prose-h1:border-slate-200'} prose-h1:pb-4 prose-h1:mb-8 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-6 prose-h2:text-blue-500 prose-h3:text-xl prose-h3:text-indigo-500 prose-p:${textHeading} prose-p:opacity-90 prose-p:leading-loose prose-p:font-medium prose-a:text-blue-500 hover:prose-a:text-blue-400 prose-strong:${textHeading} prose-strong:font-black prose-ul:list-none prose-ul:pl-0 prose-li:relative prose-li:pl-6 prose-li:my-3 prose-li:${textHeading} prose-li:opacity-90 prose-li:before:content-['▹'] prose-li:before:absolute prose-li:before:left-0 prose-li:before:text-blue-500 prose-li:before:font-bold prose-blockquote:border-l-4 prose-blockquote:border-blue-500 ${theme==='dark'?'prose-blockquote:bg-slate-800/50':'prose-blockquote:bg-blue-50'} prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic prose-blockquote:${textHeading} prose-blockquote:font-medium text-base`}>
                        <ReactMarkdown>{report}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${theme==='dark'?'#334155':'#cbd5e1'}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${theme==='dark'?'#475569':'#94a3b8'}; }
        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(50px, -50px) scale(1.1); } 66% { transform: translate(-30px, 30px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
        .animate-blob { animation: blob 10s infinite alternate; }
        .animation-delay-2000 { animation-delay: 2s; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-spin-slow { animation: spin 4s linear infinite; }
      `}} />
    </div>
  );
}
