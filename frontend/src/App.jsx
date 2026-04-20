import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Activity, Search, TrendingUp, AlertCircle, ShieldAlert, BarChart3, Clock, CheckCircle2, Coffee, X, FileText, Scale, Sparkles, Download, LayoutDashboard, History, Crown, LogIn, ChevronRight, Zap, Target } from 'lucide-react';
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

  useEffect(() => {
    const saved = localStorage.getItem('ai_analyst_history');
    if (saved) setMemoHistory(JSON.parse(saved));
  }, []);

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

  return (
    // PREMIUM DARK MODE BASE
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden relative selection:bg-blue-500/30">
      
      {/* --- MESMERIZING ANIMATED BACKGROUND --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-indigo-900/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03]"></div>
      </div>

      {/* --- UNIGNORABLE POPUP --- */}
      {showPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl transition-all">
          <div className="bg-slate-900 rounded-3xl shadow-2xl shadow-blue-900/20 max-w-md w-full p-8 relative animate-fade-in-up border border-slate-800 overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            <button onClick={() => setShowPopup(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full p-1.5 transition-all"><X className="w-5 h-5" /></button>
            
            <div className="flex justify-center mb-6">
              <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 relative group-hover:border-blue-500/50 transition-colors duration-500">
                <Sparkles className="absolute -top-2 -right-2 text-blue-400 w-6 h-6 animate-pulse" />
                <Coffee className="w-10 h-10 text-blue-500" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-center text-white mb-3 tracking-tight">AI Analyst <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Pro</span></h2>
            <p className="text-center text-slate-400 mb-8 text-sm leading-relaxed font-medium">This platform uses 7 advanced AI agents to give you institutional-grade stock analysis. Running these intense AI models costs real money. If this tool helps you profit, please consider fueling the servers! ⚡</p>
            <div className="flex flex-col gap-3">
              <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" onClick={() => setShowPopup(false)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] flex justify-center items-center gap-2 hover:-translate-y-0.5 transition-all"><Coffee className="w-5 h-5" /> Buy me a Tea</a>
              <button onClick={() => setShowPopup(false)} className="w-full text-slate-400 hover:text-white font-semibold py-3 rounded-xl text-sm transition-colors">Continue to platform</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS (LEGAL / AUTH / PRO) --- */}
      {showLegal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-fade-in-up border border-slate-800">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-t-3xl">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white"><Scale className="text-blue-500 w-5 h-5"/> Terms & Privacy Policy</h2>
              <button onClick={() => setShowLegal(false)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar prose prose-invert prose-sm text-slate-300 max-w-none">
              <h3 className="text-white">Terms of Service</h3>
              <p>By using AI Stock Analyst Pro, you agree that the information provided is for educational purposes only. We are not SEBI registered financial advisors. The AI-generated reports should not be considered financial advice. You are solely responsible for your own investment decisions.</p>
              <h3 className="text-white">Privacy Policy</h3>
              <p>We do not store your personal search history or financial data on our servers. The stock tickers you search are sent securely to our backend to generate the report and are immediately discarded. We use third-party services (like Google AdSense) which may use cookies to serve personalized ads based on your visit to this and other websites.</p>
              <h3 className="text-white">Google AdSense Disclaimer</h3>
              <p>Third party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites. Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet.</p>
            </div>
          </div>
        </div>
      )}

      {showAuth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-slate-900 rounded-3xl shadow-2xl shadow-blue-900/20 max-w-sm w-full p-8 relative animate-fade-in-up border border-slate-800">
            <button onClick={() => setShowAuth(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 rounded-full p-1"><X className="w-5 h-5" /></button>
            <div className="w-12 h-12 bg-blue-900/50 border border-blue-500/30 text-blue-400 rounded-xl flex items-center justify-center mb-6"><LogIn className="w-6 h-6" /></div>
            <h2 className="text-2xl font-bold mb-2 text-white">Access Terminal</h2>
            <p className="text-slate-400 text-sm mb-6">Save your institutional memos permanently.</p>
            <div className="space-y-4">
              <input type="email" placeholder="Secure Email Address" className="w-full px-4 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500" />
              <button className="w-full bg-white text-slate-900 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors">Authenticate</button>
            </div>
            <p className="text-center text-xs text-slate-500 mt-6 flex items-center justify-center gap-1"><ShieldAlert className="w-3 h-3"/> End-to-end encrypted</p>
          </div>
        </div>
      )}

      {showPro && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-slate-900 rounded-3xl shadow-2xl shadow-purple-900/20 max-w-md w-full p-8 relative animate-fade-in-up overflow-hidden border border-slate-800">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            <button onClick={() => setShowPro(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 rounded-full p-1"><X className="w-5 h-5" /></button>
            <div className="w-12 h-12 bg-purple-900/30 border border-purple-500/30 text-purple-400 rounded-xl flex items-center justify-center mb-6"><Crown className="w-6 h-6" /></div>
            <h2 className="text-2xl font-bold mb-2 text-white">Analyst <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Pro</span></h2>
            <p className="text-slate-400 text-sm mb-6">Unlock unrestricted API access to all 7 agents.</p>
            <ul className="space-y-4 mb-8 text-sm font-medium text-slate-300">
              <li className="flex gap-3 items-center"><div className="bg-emerald-500/20 p-1 rounded-full"><CheckCircle2 className="w-4 h-4 text-emerald-400"/></div> Unlimited Daily Analysis</li>
              <li className="flex gap-3 items-center"><div className="bg-emerald-500/20 p-1 rounded-full"><CheckCircle2 className="w-4 h-4 text-emerald-400"/></div> Export to PDF & CSV</li>
              <li className="flex gap-3 items-center"><div className="bg-emerald-500/20 p-1 rounded-full"><CheckCircle2 className="w-4 h-4 text-emerald-400"/></div> Ad-Free Terminal Experience</li>
            </ul>
            <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2">
              Subscribe - ₹499/mo
            </button>
          </div>
        </div>
      )}

      {/* --- SIDEBAR (SAAS UI) --- */}
      <aside className="w-72 bg-slate-900/50 backdrop-blur-2xl border-r border-slate-800 hidden md:flex flex-col relative z-20 shadow-2xl">
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.5)]"><Activity className="text-white w-6 h-6" /></div>
            <h1 className="font-extrabold text-xl text-white tracking-tight">Analyst<span className="text-blue-500">Pro</span></h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 mt-2">Main Menu</p>
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'}`}>
            <LayoutDashboard className="w-5 h-5" /> Trading Terminal
          </button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'history' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'}`}>
            <div className="flex items-center gap-3"><History className="w-5 h-5" /> Saved Memos</div>
            {memoHistory.length > 0 && <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-[0_0_10px_rgba(37,99,235,0.5)]">{memoHistory.length}</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800/50 space-y-4 bg-slate-900/30">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-2xl border border-slate-700 relative overflow-hidden group cursor-pointer" onClick={() => setShowPro(true)}>
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/20 rounded-bl-full filter blur-xl group-hover:bg-purple-500/40 transition-all"></div>
            <h4 className="text-white font-bold text-sm flex items-center gap-2 mb-1"><Crown className="w-4 h-4 text-purple-400"/> Pro Tier</h4>
            <p className="text-xs text-slate-400 font-medium mb-3">Unlock unlimited API usage.</p>
            <button className="text-xs font-bold bg-white text-slate-900 px-3 py-1.5 rounded-lg w-full group-hover:bg-purple-50 transition-colors">Upgrade Now</button>
          </div>
          
          <div className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-slate-800/50 rounded-xl transition-colors" onClick={() => setShowAuth(true)}>
            <div className="w-9 h-9 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 font-bold shadow-inner">G</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white leading-none mb-1">Guest User</p>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Click to Sign In</p>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        
        {/* Header */}
        <header className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex md:hidden items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-[0_0_10px_rgba(37,99,235,0.5)]"><Activity className="text-white w-5 h-5" /></div>
            <h1 className="font-extrabold text-white text-lg">Analyst<span className="text-blue-500">Pro</span></h1>
          </div>
          
          <div className="hidden md:flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-4 py-1.5 rounded-full">
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{activeTab === 'dashboard' ? 'Global Markets Terminal' : 'Encrypted History Vault'}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_5px_#34d399]"></span> Core Online
            </div>
            <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-bold text-xs transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] border border-blue-500">
              <Zap className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Boost Servers</span>
            </a>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
          
          {/* TAB: HISTORY */}
          {activeTab === 'history' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Saved Memos</h2>
                  <p className="text-slate-400 font-medium">Access your previously generated institutional reports instantly.</p>
                </div>
              </div>

              {memoHistory.length === 0 ? (
                <div className="bg-slate-900/50 backdrop-blur-md p-16 rounded-3xl border border-slate-800 text-center shadow-2xl flex flex-col items-center">
                  <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-700 shadow-inner">
                    <FileText className="w-10 h-10 text-slate-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Vault Empty</h3>
                  <p className="text-slate-400 font-medium max-w-sm mx-auto mb-8">You haven't generated any AI analysis reports yet. Run a scan on the terminal to populate your vault.</p>
                  <button onClick={() => setActiveTab('dashboard')} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-2">
                    <Activity className="w-5 h-5"/> Launch Terminal
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {memoHistory.map((memo) => (
                    <div key={memo.id} onClick={() => loadHistoryItem(memo)} className="bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full filter blur-xl group-hover:bg-blue-500/10 transition-colors"></div>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <h3 className="font-extrabold text-xl text-white group-hover:text-blue-400 transition-colors">{memo.ticker}</h3>
                        <div className="bg-slate-800 p-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white text-slate-400 transition-colors"><ChevronRight className="w-4 h-4"/></div>
                      </div>
                      <p className="text-sm font-semibold text-slate-400 mb-6 truncate relative z-10">{memo.companyName}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider relative z-10 bg-slate-950/50 py-1.5 px-3 rounded-lg inline-flex border border-slate-800">
                        <Clock className="w-3 h-3" /> {memo.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: DASHBOARD (TERMINAL) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-[1600px] mx-auto animate-fade-in-up">
              
              {/* Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Input Panel */}
                <div className="lg:col-span-4 bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-slate-800 flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
                  <div className="relative z-10">
                    <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-white">
                      <Target className="w-5 h-5 text-blue-500" /> Target Asset Parameters
                    </h2>
                    <form onSubmit={handleAnalyze} className="space-y-5">
                      <div>
                        <input type="text" placeholder="Enter Ticker (e.g., RELIANCE.NS)" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} 
                          className="w-full px-5 py-4 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-white placeholder-slate-600 shadow-inner transition-all uppercase" required />
                        <p className="text-[11px] text-slate-500 mt-2 ml-1 font-semibold uppercase tracking-wider">Required Suffix: .NS (NSE) or .BO (BSE)</p>
                      </div>
                      <button type="submit" disabled={loading || !ticker} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2 hover:-translate-y-0.5 transition-all text-sm uppercase tracking-wider">
                        {loading ? <><Activity className="w-5 h-5 animate-spin" /> Executing Scan...</> : <><Zap className="w-5 h-5" /> Initialize AI Scan</>}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Quick Select */}
                <div className="lg:col-span-8 bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-slate-800">
                  <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-white">
                    <BarChart3 className="w-5 h-5 text-blue-500" /> Global Indices & Watchlist
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                    {POPULAR_STOCKS.map((stock) => (
                      <button key={stock.ticker} onClick={() => handleSelectPopular(stock)} className={`text-left p-4 rounded-2xl border transition-all duration-300 ${ticker === stock.ticker ? 'border-blue-500 bg-blue-900/40 shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'border-slate-800 hover:border-slate-600 bg-slate-950/50 hover:bg-slate-800'}`}>
                        <div className="font-extrabold text-white text-sm truncate mb-1">{stock.name}</div>
                        <div className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">{stock.ticker}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic View Area: Chart & Live Data Side-by-Side */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
                
                {/* Left: TV Chart */}
                <div className="lg:col-span-8 h-full">
                  <div className="bg-slate-900/50 backdrop-blur-xl p-2 rounded-3xl shadow-2xl border border-slate-800 h-full overflow-hidden">
                    <AdvancedRealTimeChart theme="dark" symbol={getTradingViewSymbol(ticker)} autosize allow_symbol_change={false} hide_side_toolbar={false} backgroundColor="rgba(15, 23, 42, 0)" />
                  </div>
                </div>

                {/* Right: Financial Grid OR Loading Data OR Initial State */}
                <div className="lg:col-span-4 h-full bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500"/> Live Ratios</h3>
                    <span className="text-[10px] bg-blue-900/50 text-blue-400 px-2 py-1 rounded-full font-bold uppercase border border-blue-500/30">Auto-Sync</span>
                  </div>
                  
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                    {!ticker && !loading && !metrics && (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                        <Target className="w-12 h-12 text-slate-500 mb-4" />
                        <p className="text-sm font-semibold text-slate-400">Select an asset to view fundamental ratios.</p>
                      </div>
                    )}

                    {loading && (
                      <div className="h-full flex flex-col gap-4">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="flex justify-between items-center bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                            <div className="h-3 w-20 bg-slate-700 rounded animate-pulse"></div>
                            <div className="h-4 w-16 bg-slate-600 rounded animate-pulse delay-75"></div>
                          </div>
                        ))}
                      </div>
                    )}

                    {metrics && Object.keys(metrics).length > 0 && !loading && (
                      <div className="flex flex-col gap-3 animate-fade-in-up">
                        {Object.entries(metrics).map(([key, val]) => (
                          <div key={key} className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{key}</span>
                            <span className="text-white font-extrabold text-sm">{val}</span>
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
                  
                  {error && (
                    <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-6 rounded-3xl flex items-start gap-4 shadow-2xl mb-6">
                      <AlertCircle className="w-8 h-8 shrink-0 text-red-500 mt-1" />
                      <div><h3 className="font-bold text-xl text-red-400 mb-1">Critical Analysis Error</h3><p className="text-sm font-medium leading-relaxed">{error}</p></div>
                    </div>
                  )}

                  {/* Loading Dashboard & Ad Space */}
                  {loading && (
                    <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 flex flex-col md:flex-row overflow-hidden min-h-[600px]">
                      
                      {/* Left: AI Orchestration Terminal */}
                      <div className="w-full md:w-1/2 p-10 border-b md:border-b-0 md:border-r border-slate-800 relative flex flex-col justify-center">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                        <div className="absolute top-6 right-6 flex space-x-2"><div className="h-2.5 w-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]"></div><div className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse delay-75 shadow-[0_0_8px_#10b981]"></div><div className="h-2.5 w-2.5 bg-purple-500 rounded-full animate-pulse delay-150 shadow-[0_0_8px_#a855f7]"></div></div>
                        
                        <div className="relative z-10 mb-10">
                          <div className="w-16 h-16 bg-blue-900/30 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(37,99,235,0.2)]">
                            <Activity className="text-blue-400 w-8 h-8 animate-spin-slow" />
                          </div>
                          <h3 className="text-3xl font-extrabold text-white mb-2">Agent Protocol Initiated</h3>
                          <p className="text-slate-400 font-medium">Orchestrating 7 specialized institutional models. Estimated completion: 60-90s.</p>
                        </div>
                        
                        <div className="space-y-5 relative z-10">
                          {[
                            "Establishing secure socket to YFinance API...",
                            "Sector Analyst compiling macro-economic shifts...",
                            "Quant Agent running forensic fundamental equations...",
                            "Technical Agent mapping support/resistance vectors...",
                            "Sentiment Agent parsing social & institutional flows...",
                            "Chief Risk Officer identifying black-swan variables...",
                            "CIO synthesizing final Markdown Executive Memo..."
                          ].map((text, i) => (
                            <div key={i} className={`flex items-center gap-4 text-sm font-bold transition-all duration-700 ${loadingStep > i ? 'text-slate-500' : (loadingStep === i ? 'text-blue-400 translate-x-2' : 'text-slate-700')}`}>
                              {loadingStep > i ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : (loadingStep === i ? <Clock className="w-5 h-5 animate-spin shrink-0" /> : <div className="w-5 h-5 border-2 border-slate-700 rounded-full shrink-0"></div>)}
                              {text}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: AdSense Revenue Container */}
                      <div className="w-full md:w-1/2 bg-slate-950 p-10 flex flex-col items-center justify-center relative">
                        <span className="absolute top-6 left-8 text-[10px] text-slate-600 uppercase tracking-widest font-extrabold flex items-center gap-2">
                          <Zap className="w-3 h-3 text-slate-500"/> Sponsored Payload
                        </span>
                        
                        {/* >>> GOOGLE ADSENSE SPACE <<< */}
                        <div className="w-full max-w-[400px] h-[300px] bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center relative hover:border-slate-700 transition-colors shadow-2xl">
                          <BarChart3 className="w-10 h-10 text-slate-700 mb-3" />
                          <p className="text-slate-500 text-sm font-bold tracking-wide">Google AdSense Space</p>
                          <p className="text-slate-600 text-xs font-medium mt-2 px-8 text-center">Your high-RPM finance ad will render here while the user waits.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Report Render */}
                  {report && !loading && (
                    <div className="bg-slate-900/80 backdrop-blur-xl p-10 lg:p-14 rounded-3xl shadow-2xl border border-slate-800 flex flex-col relative">
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-8 border-b border-slate-800 gap-4">
                        <div>
                          <h2 className="text-3xl font-extrabold text-white">Executive Investment Memo</h2>
                          <p className="text-slate-400 font-medium mt-1">Generated by 7-Agent Institutional Ensemble</p>
                        </div>
                        <button onClick={() => setShowPro(true)} className="flex items-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-full transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:-translate-y-0.5">
                          <Download className="w-4 h-4" /> Export to PDF
                        </button>
                      </div>

                      <div className="prose prose-invert prose-lg max-w-none 
                        prose-headings:text-white prose-headings:font-extrabold tracking-tight
                        prose-h1:text-3xl prose-h1:border-b prose-h1:border-slate-800 prose-h1:pb-4 prose-h1:mb-8
                        prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-6 prose-h2:text-blue-400
                        prose-h3:text-xl prose-h3:text-indigo-400
                        prose-p:text-slate-300 prose-p:leading-loose prose-p:font-medium
                        prose-a:text-blue-400 hover:prose-a:text-blue-300
                        prose-strong:text-white prose-strong:font-black
                        prose-ul:list-none prose-ul:pl-0 prose-li:relative prose-li:pl-6 prose-li:my-3 prose-li:text-slate-300
                        prose-li:before:content-['▹'] prose-li:before:absolute prose-li:before:left-0 prose-li:before:text-blue-500 prose-li:before:font-bold
                        prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-slate-800/50 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic prose-blockquote:text-slate-300 prose-blockquote:font-medium prose-blockquote:shadow-inner text-base">
                        <ReactMarkdown>{report}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* --- Institutional Footer --- */}
          <footer className="mt-16 pt-10 border-t border-slate-800 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start gap-10">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-4"><ShieldAlert className="w-6 h-6 text-amber-500" /><h4 className="text-white font-extrabold text-sm uppercase tracking-widest">Regulatory Disclaimer</h4></div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Not SEBI Registered. AI-generated reports are for educational purposes only. Do not trade solely based on this data. The algorithms may hallucinate or provide delayed data. AI Stock Analyst Pro and its developers assume no liability for financial losses incurred.
                </p>
              </div>
              <div className="flex flex-col gap-4 min-w-[200px]">
                <h4 className="text-white font-extrabold text-sm uppercase tracking-widest">Legal & Compliance</h4>
                <button onClick={() => setShowLegal(true)} className="text-left text-xs font-bold text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-2"><FileText className="w-4 h-4"/> Privacy Policy</button>
                <button onClick={() => setShowLegal(true)} className="text-left text-xs font-bold text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-2"><Scale className="w-4 h-4"/> Terms of Service</button>
              </div>
            </div>
            <div className="mt-12 pt-6 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">© {new Date().getFullYear()} Analyst Pro | By Jatin Kalra</p>
              <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors bg-blue-900/20 px-4 py-2 rounded-full border border-blue-500/20 hover:border-blue-500/40">
                <Coffee className="w-4 h-4" /> Support Development
              </a>
            </div>
          </footer>
        </div>
      </div>
      
      {/* --- Launch Animations CSS --- */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
        
        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(50px, -50px) scale(1.1); } 66% { transform: translate(-30px, 30px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
        .animate-blob { animation: blob 10s infinite alternate; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .animate-spin-slow { animation: spin 4s linear infinite; }
      `}} />
    </div>
  );
}
