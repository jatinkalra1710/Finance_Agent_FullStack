import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Activity, Search, TrendingUp, AlertCircle, ShieldAlert, BarChart3, Clock, CheckCircle2, Coffee, X, FileText, Scale, Sparkles, Download, LayoutDashboard, History, Crown, LogIn, ChevronRight, Zap, Target, Sun, Moon, Share2, Check, Lock } from 'lucide-react';
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

// --- FIREBASE IMPORTS ---
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

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
  const [fetchingMetrics, setFetchingMetrics] = useState(false);
  const [report, setReport] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [memoHistory, setMemoHistory] = useState([]);
  
  // MODALS & SAAS STATE
  const [showPopup, setShowPopup] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showPro, setShowPro] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  
  // USER ACCOUNT STATE
  const [user, setUser] = useState(null); 
  const [userTier, setUserTier] = useState('free'); 
  const [generationsToday, setGenerationsToday] = useState(0);

  const [loadingStep, setLoadingStep] = useState(0);
  const [theme, setTheme] = useState('dark'); 
  const [copied, setCopied] = useState(false);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // Daily Quota Logic
  const checkDailyLimit = () => {
    if (userTier === 'ultra') return true; 
    if (userTier === 'pro' && generationsToday < 10) return true; 
    if (userTier === 'basic' && generationsToday < 5) return true; 
    if (userTier === 'free' && generationsToday < 1) return true; 
    
    setShowPro(true);
    return false;
  };

  const handleCopy = (e) => {
    if (userTier === 'free') {
      e.preventDefault();
      alert("Copying text is restricted in the Free Tier. Please upgrade to Pro.");
      setShowPro(true);
      return;
    }
    if (report) {
      navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // --- BULLETPROOF INSTANT METRICS FETCHING ---
  const fetchLiveRatios = async (targetTicker) => {
    if (!targetTicker) return;
    setFetchingMetrics(true);
    
    // Auto-append .NS for the API call if user just typed a raw word
    let safeTicker = targetTicker.toUpperCase();
    if (!safeTicker.includes('.') && !safeTicker.startsWith('^')) {
      safeTicker = `${safeTicker}.NS`;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/metrics/${encodeURIComponent(safeTicker)}`);
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
      } else {
        setMetrics({}); // Will trigger the "Unavailable" fallback UI gracefully
      }
    } catch (err) {
      console.error("Failed to fetch preliminary metrics", err);
      setMetrics({});
    } finally {
      setFetchingMetrics(false);
    }
  };

  // Auto-fetch metrics 1 second after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ticker && ticker.length >= 3) {
        fetchLiveRatios(ticker);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [ticker]);

  useEffect(() => {
    const saved = localStorage.getItem('ai_analyst_history');
    if (saved) setMemoHistory(JSON.parse(saved));
    const savedTheme = localStorage.getItem('ai_analyst_theme');
    if (savedTheme) setTheme(savedTheme);
    
    const hasAgreed = localStorage.getItem('ai_terms_agreed');
    if (!hasAgreed) setShowPopup(true);

    const today = new Date().toDateString();
    const usageStr = localStorage.getItem('ai_daily_usage');
    if (usageStr) {
      const usage = JSON.parse(usageStr);
      if (usage.date === today) {
        setGenerationsToday(usage.count);
      } else {
        localStorage.setItem('ai_daily_usage', JSON.stringify({ date: today, count: 0 }));
      }
    }
  }, []);

  useEffect(() => { localStorage.setItem('ai_analyst_theme', theme); }, [theme]);

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
    if (!checkDailyLimit()) return; 

    setLoading(true);
    setError(null);
    setReport(null);
    // Note: We DO NOT clear setMetrics(null) here so the live ratios stay on screen!
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

      const newCount = generationsToday + 1;
      setGenerationsToday(newCount);
      localStorage.setItem('ai_daily_usage', JSON.stringify({ date: new Date().toDateString(), count: newCount }));

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
    // Instant metrics fetch is triggered automatically by the useEffect
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

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const loggedInUser = result.user;
      
      setUser({ 
        name: loggedInUser.displayName || "Pro Investor", 
        email: loggedInUser.email,
        uid: loggedInUser.uid
      });
      
      setShowAuth(false);
    } catch (error) {
      console.error("Login Failed:", error);
      alert("Authentication failed. Please check your network or Firebase configuration.");
    }
  };

  const getFilteredHistory = () => {
    if (userTier !== 'free') return memoHistory;
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return memoHistory.filter(memo => memo.id > sevenDaysAgo);
  };

  const visibleHistory = getFilteredHistory();

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
      </div>

      {/* --- ALL MODALS --- */}
      
      {showPopup && userTier === 'free' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl transition-all">
          <div className={`${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'} rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in-up border overflow-hidden`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            <div className="flex justify-center mb-6 mt-4">
              <div className={`${theme==='dark'?'bg-slate-800':'bg-blue-50'} p-5 rounded-2xl border ${theme==='dark'?'border-slate-700':'border-blue-100'} relative transition-colors duration-500`}>
                <Sparkles className="absolute -top-2 -right-2 text-blue-400 w-6 h-6 animate-pulse" />
                <Activity className="w-10 h-10 text-blue-500" />
              </div>
            </div>
            
            <h2 className={`text-3xl font-extrabold text-center mb-3 tracking-tight ${textHeading}`}>AI Analyst <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Pro</span></h2>
            <p className={`text-center ${textMuted} mb-6 text-sm leading-relaxed font-medium`}>
              Welcome. This platform uses 7 advanced AI models for deep equity research. To proceed to your free trial, you must agree to our regulatory terms.
            </p>

            <label className={`flex items-start gap-3 p-4 border ${theme==='dark'?'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10':'border-blue-200 bg-blue-50 hover:bg-blue-100'} rounded-xl cursor-pointer transition-colors mb-6`}>
              <input type="checkbox" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} className="mt-1 w-4 h-4 rounded border-slate-400 text-blue-600 focus:ring-blue-500 cursor-pointer" />
              <span className={`text-xs ${textMuted} font-medium`}>
                I agree that this tool is for educational purposes ONLY. I understand that AI can hallucinate, and I waive all liability for any financial trades or losses.
              </span>
            </label>

            <div className="flex flex-col gap-3">
              <button 
                disabled={!termsAgreed} 
                onClick={() => { localStorage.setItem('ai_terms_agreed', 'true'); setShowPopup(false); }} 
                className="w-full bg-blue-600 disabled:bg-slate-600 hover:bg-blue-500 text-white font-bold py-4 px-4 rounded-xl shadow-lg disabled:shadow-none flex justify-center items-center transition-all"
              >
                Access Terminal
              </button>
              
              <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" className={`w-full ${textMuted} hover:${textHeading} font-semibold py-2 rounded-xl text-xs text-center transition-colors flex justify-center items-center gap-1`}>
                <Coffee className="w-3 h-3"/> Support Dev Server Costs
              </a>
            </div>
          </div>
        </div>
      )}

      {showAuth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className={`${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'} rounded-3xl shadow-2xl max-w-sm w-full p-8 relative animate-fade-in-up border`}>
            <button onClick={() => setShowAuth(false)} className={`absolute top-4 right-4 ${textMuted} hover:${textHeading} bg-slate-500/10 rounded-full p-1`}><X className="w-5 h-5" /></button>
            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 text-blue-500 rounded-xl flex items-center justify-center mb-6"><LogIn className="w-6 h-6" /></div>
            <h2 className={`text-2xl font-bold mb-2 ${textHeading}`}>Sign In / Register</h2>
            <p className={`${textMuted} text-sm mb-6`}>Sync your history and manage your active subscription securely.</p>
            
            <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200 mb-4">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            <p className={`text-center text-xs ${textMuted} flex items-center justify-center gap-1 mt-4`}><ShieldAlert className="w-3 h-3"/> Secured by Firebase Auth</p>
          </div>
        </div>
      )}

      {showPro && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto">
          <div className={`${theme==='dark'?'bg-slate-900 border-slate-800':'bg-slate-50 border-slate-200'} rounded-3xl shadow-2xl max-w-4xl w-full p-8 relative animate-fade-in-up border my-8`}>
            <button onClick={() => setShowPro(false)} className={`absolute top-4 right-4 ${textMuted} hover:${textHeading} bg-slate-500/10 rounded-full p-1`}><X className="w-5 h-5" /></button>
            
            <div className="text-center mb-10">
              <h2 className={`text-3xl font-extrabold mb-3 ${textHeading}`}>Choose Your Edge</h2>
              <p className={`${textMuted} text-sm max-w-lg mx-auto`}>Unlock the full power of 7-Agent Institutional Intelligence. Save unlimited history, export PDFs, and access the market without limits.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className={`${theme==='dark'?'bg-slate-800/50 border-slate-700':'bg-white border-slate-200'} p-6 rounded-2xl border flex flex-col`}>
                <h3 className={`text-lg font-bold ${textHeading} mb-2`}>Basic</h3>
                <div className="mb-4"><span className={`text-3xl font-extrabold ${textHeading}`}>₹99</span><span className={textMuted}>/mo</span></div>
                <ul className={`space-y-3 mb-8 text-sm font-medium ${textMuted} flex-1`}>
                  <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> 5 Memos per day</li>
                  <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Copy text enabled</li>
                  <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Unlimited History saves</li>
                </ul>
                <button disabled className={`w-full py-3 rounded-xl font-bold transition-colors cursor-not-allowed ${theme==='dark'?'bg-slate-700 text-slate-400':'bg-slate-200 text-slate-500'}`}>Coming Soon</button>
              </div>

              <div className={`${theme==='dark'?'bg-blue-900/20 border-blue-500':'bg-blue-50 border-blue-400'} p-6 rounded-2xl border-2 flex flex-col relative transform scale-105 shadow-2xl shadow-blue-500/20`}>
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-widest">Most Popular</div>
                <h3 className={`text-lg font-bold text-blue-500 mb-2 flex items-center gap-2`}><Crown className="w-4 h-4"/> Pro</h3>
                <div className="mb-4"><span className={`text-3xl font-extrabold ${textHeading}`}>₹149</span><span className={textMuted}>/mo</span></div>
                <ul className={`space-y-3 mb-8 text-sm font-medium ${theme==='dark'?'text-slate-300':'text-slate-700'} flex-1`}>
                  <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-blue-500"/> 10 Memos per day</li>
                  <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-blue-500"/> Export to PDF</li>
                  <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-blue-500"/> Ad-Free Terminal</li>
                </ul>
                <button disabled className={`w-full py-3 rounded-xl font-bold cursor-not-allowed ${theme==='dark'?'bg-slate-700 text-slate-400':'bg-slate-300 text-slate-500'}`}>Coming Soon</button>
              </div>

              <div className={`${theme==='dark'?'bg-slate-800/50 border-slate-700':'bg-white border-slate-200'} p-6 rounded-2xl border flex flex-col`}>
                <h3 className={`text-lg font-bold ${textHeading} mb-2`}>Ultra</h3>
                <div className="mb-4"><span className={`text-3xl font-extrabold ${textHeading}`}>₹499</span><span className={textMuted}>/mo</span></div>
                <ul className={`space-y-3 mb-8 text-sm font-medium ${textMuted} flex-1`}>
                  <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-purple-500"/> Unlimited Memos</li>
                  <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-purple-500"/> Priority Agent Speed</li>
                  <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-purple-500"/> Commercial License</li>
                </ul>
                <button disabled className={`w-full py-3 rounded-xl font-bold transition-colors cursor-not-allowed ${theme==='dark'?'bg-slate-700 text-slate-400':'bg-slate-200 text-slate-500'}`}>Coming Soon</button>
              </div>

            </div>
          </div>
        </div>
      )}

      {showLegal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className={`${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'} rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-fade-in-up border`}>
            <div className={`p-6 border-b ${theme==='dark'?'border-slate-800 bg-slate-900/50':'border-slate-200 bg-slate-50'} flex justify-between items-center rounded-t-3xl`}>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${textHeading}`}><Scale className="text-blue-500 w-5 h-5"/> Terms & Privacy Policy</h2>
              <button onClick={() => setShowLegal(false)} className={`p-1 ${textMuted} hover:${textHeading} hover:bg-slate-500/10 rounded-full`}><X className="w-6 h-6" /></button>
            </div>
            <div className={`p-6 overflow-y-auto custom-scrollbar prose ${theme==='dark'?'prose-invert':''} prose-sm ${theme==='dark'?'text-slate-300':'text-slate-600'} max-w-none`}>
              <h3 className={textHeading}>Terms of Service</h3>
              <p>By using AI Stock Analyst Pro, you agree that the information provided is for educational purposes only. We are not SEBI registered financial advisors. The AI-generated reports should not be considered financial advice. You are solely responsible for your own investment decisions.</p>
              <h3 className={textHeading}>Privacy Policy</h3>
              <p>We do not store your personal search history or financial data on our servers. The stock tickers you search are sent securely to our backend to generate the report and are immediately discarded. We use third-party services (like Google AdSense) which may use cookies to serve personalized ads based on your visit to this and other websites.</p>
              <h3 className={textHeading}>Google AdSense Disclaimer</h3>
              <p>Third party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites. Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet.</p>
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
            <div className="flex items-center gap-3">
              <History className="w-5 h-5" /> 
              History {userTier === 'free' && <Lock className="w-3 h-3 text-amber-500 ml-1"/>}
            </div>
            {visibleHistory.length > 0 && <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">{visibleHistory.length}</span>}
          </button>
        </nav>

        <div className={`p-4 border-t ${theme==='dark'?'border-slate-800/80 bg-slate-900/30':'border-slate-200 bg-slate-50'}`}>
          {userTier === 'free' ? (
            <div className={`bg-gradient-to-br ${theme==='dark'?'from-slate-800 to-slate-900':'from-indigo-50 to-white'} p-4 rounded-2xl border ${theme==='dark'?'border-slate-700':'border-indigo-100'} relative overflow-hidden group cursor-pointer`} onClick={() => setShowPro(true)}>
              <h4 className={`${textHeading} font-bold text-sm flex items-center gap-2 mb-1`}><Crown className="w-4 h-4 text-indigo-500"/> Upgrade Pro</h4>
              <p className={`text-xs ${textMuted} font-medium mb-3`}>({generationsToday}/1 Demo Used)</p>
              <button className={`text-xs font-bold ${theme==='dark'?'bg-white text-slate-900':'bg-indigo-600 text-white'} px-3 py-1.5 rounded-lg w-full transition-colors`}>View Plans</button>
            </div>
          ) : (
            <div className={`bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/30 text-emerald-600`}>
              <h4 className="font-bold text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Active: {userTier.toUpperCase()}</h4>
              <p className="text-xs font-medium opacity-80 mt-1">Daily Scans: {generationsToday}</p>
            </div>
          )}
          
          <div className={`flex items-center gap-3 px-2 py-2 mt-4 cursor-pointer hover:bg-slate-500/10 rounded-xl transition-colors`} onClick={() => !user && setShowAuth(true)}>
            <div className={`w-9 h-9 ${theme==='dark'?'bg-slate-800 border-slate-600 text-slate-300':'bg-white border-slate-300 text-slate-600'} rounded-full flex items-center justify-center font-bold shadow-inner`}>
              {user ? user.name[0] : 'G'}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold ${textHeading} leading-none mb-1`}>{user ? user.name : 'Guest User'}</p>
              {!user && <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Click to Sign In</p>}
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        
        <header className={`${cardBg} backdrop-blur-xl border-b sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm transition-colors duration-500`}>
          <div className="flex md:hidden items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm"><Activity className="text-white w-5 h-5" /></div>
            <h1 className={`font-extrabold ${textHeading} text-lg`}>Analyst<span className="text-blue-500">Pro</span></h1>
          </div>
          
          <div className={`hidden md:flex items-center gap-2 ${theme==='dark'?'bg-slate-800/50 border-slate-700':'bg-slate-100 border-slate-200'} border px-4 py-1.5 rounded-full`}>
            <Search className={`w-4 h-4 ${textMuted}`} />
            <span className={`text-xs font-semibold ${textMuted} uppercase tracking-widest`}>{activeTab === 'dashboard' ? 'Global Markets Terminal' : 'Encrypted History Vault'}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors ${theme==='dark'?'hover:bg-slate-800 text-amber-400':'hover:bg-slate-200 text-indigo-600'}`}>
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className={`hidden sm:flex items-center gap-2 text-[11px] font-bold text-emerald-500 ${theme==='dark'?'bg-emerald-500/10 border-emerald-500/20':'bg-emerald-50 border-emerald-200'} border px-3 py-1.5 rounded-full uppercase tracking-wider`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Core Online
            </div>
            
            {userTier === 'free' && (
              <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-bold text-xs transition-all shadow-md">
                <Coffee className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Boost Servers</span>
              </a>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
          
          {/* TAB: HISTORY */}
          {activeTab === 'history' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className={`text-3xl font-extrabold ${textHeading} tracking-tight mb-2 flex items-center gap-3`}>
                    Saved Memos {userTier === 'free' && <span className="text-xs bg-amber-500/20 text-amber-600 px-3 py-1 rounded-full border border-amber-500/30">7-Day Free Limit</span>}
                  </h2>
                  <p className={`${textMuted} font-medium`}>Access your previously generated institutional reports instantly.</p>
                </div>
              </div>

              {visibleHistory.length === 0 ? (
                <div className={`${cardBg} backdrop-blur-md p-16 rounded-3xl border text-center shadow-lg flex flex-col items-center`}>
                  <div className={`w-24 h-24 ${theme==='dark'?'bg-slate-800 border-slate-700':'bg-slate-100 border-slate-200'} rounded-full flex items-center justify-center mb-6 border shadow-inner`}>
                    <FileText className={`w-10 h-10 ${textMuted}`} />
                  </div>
                  <h3 className={`text-2xl font-bold ${textHeading} mb-2`}>Vault Empty</h3>
                  <p className={`${textMuted} font-medium max-w-sm mx-auto mb-8`}>
                    {userTier === 'free' ? 'No reports generated in the last 7 days.' : 'You haven\'t generated any AI analysis reports yet.'}
                  </p>
                  <button onClick={() => setActiveTab('dashboard')} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2">
                    <Activity className="w-5 h-5"/> Launch Terminal
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {visibleHistory.map((memo) => (
                    <div key={memo.id} onClick={() => loadHistoryItem(memo)} className={`${cardBg} backdrop-blur-md p-6 rounded-2xl border ${cardHover} transition-all cursor-pointer group shadow-sm relative overflow-hidden`}>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full filter blur-xl group-hover:bg-blue-500/10 transition-colors"></div>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <h3 className={`font-extrabold text-xl ${textHeading} group-hover:text-blue-500 transition-colors`}>{memo.ticker}</h3>
                        <div className={`${theme==='dark'?'bg-slate-800':'bg-slate-100'} p-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white ${textMuted} transition-colors`}><ChevronRight className="w-4 h-4"/></div>
                      </div>
                      <p className={`text-sm font-semibold ${textMuted} mb-6 truncate relative z-10`}>{memo.companyName}</p>
                      <div className={`flex items-center gap-2 text-[10px] ${textMuted} font-bold uppercase tracking-wider relative z-10 ${theme==='dark'?'bg-slate-950/50 border-slate-800':'bg-slate-100 border-slate-200'} py-1.5 px-3 rounded-lg inline-flex border`}>
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

                <div className={`lg:col-span-8 ${cardBg} backdrop-blur-xl p-6 rounded-3xl shadow-sm border transition-colors duration-500`}>
                  <h2 className={`font-bold text-lg mb-6 flex items-center gap-2 ${textHeading}`}>
                    <BarChart3 className="w-5 h-5 text-blue-500" /> Global Indices & Watchlist
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                    {POPULAR_STOCKS.map((stock) => (
                      <button key={stock.ticker} onClick={() => handleSelectPopular(stock)} className={`text-left p-4 rounded-2xl border transition-all duration-300 ${ticker === stock.ticker ? `border-blue-500 ${theme==='dark'?'bg-blue-900/40':'bg-blue-50'} shadow-sm` : `${theme==='dark'?'border-slate-800/80 bg-slate-950/50 hover:bg-slate-800 hover:border-slate-600':'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'}`}`}>
                        <div className={`font-extrabold ${textHeading} text-sm truncate mb-1`}>{stock.name}</div>
                        <div className="text-blue-500 text-[10px] font-bold uppercase tracking-wider">{stock.ticker}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
                
                {/* --- FIXED CHART CONTAINER --- */}
                <div className="lg:col-span-8 h-full">
                  <div className={`${cardBg} backdrop-blur-xl p-2 rounded-3xl shadow-sm border h-full overflow-hidden transition-colors duration-500`}>
                    <AdvancedRealTimeChart 
                      key={theme} 
                      theme={theme} 
                      symbol={getTradingViewSymbol(ticker)} 
                      autosize 
                      allow_symbol_change={false} 
                      hide_side_toolbar={false} 
                      interval="D" 
                      timezone="Asia/Kolkata"
                    />
                  </div>
                </div>

                {/* --- RATIOS GRID --- */}
                <div className={`lg:col-span-4 h-full ${cardBg} backdrop-blur-xl rounded-3xl shadow-sm border overflow-hidden flex flex-col transition-colors duration-500`}>
                  <div className={`p-5 border-b ${theme==='dark'?'border-slate-800/80 bg-slate-900/80':'border-slate-200 bg-slate-50/80'} flex items-center justify-between`}>
                    <h3 className={`font-bold ${textHeading} flex items-center gap-2`}><Activity className="w-4 h-4 text-blue-500"/> Live Ratios</h3>
                    <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full font-bold uppercase border border-blue-500/20">Auto-Sync</span>
                  </div>
                  
                  <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
                    {!ticker && !loading && !fetchingMetrics && !metrics && (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                        <Target className={`w-12 h-12 ${textMuted} mb-4`} />
                        <p className={`text-sm font-semibold ${textMuted}`}>Select an asset to view fundamental ratios.</p>
                      </div>
                    )}

                    {(loading || fetchingMetrics) && (!metrics || Object.keys(metrics).length === 0) && (
                      <div className="h-full grid grid-cols-2 gap-3 content-start">
                        {[...Array(12)].map((_, i) => (
                          <div key={i} className={`flex flex-col justify-center ${theme==='dark'?'bg-slate-800/30 border-slate-800':'bg-slate-100/50 border-slate-200'} p-4 rounded-xl border h-20`}>
                            <div className={`h-2 w-16 ${theme==='dark'?'bg-slate-700':'bg-slate-300'} rounded animate-pulse mb-2`}></div>
                            <div className={`h-4 w-20 ${theme==='dark'?'bg-slate-600':'bg-slate-400'} rounded animate-pulse delay-75`}></div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* FAILED FETCH FALLBACK */}
                    {!loading && !fetchingMetrics && ticker && metrics && metrics.Status && (
                       <div className="h-full flex flex-col items-center justify-center text-center">
                         <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
                         <p className={`text-sm font-bold ${textHeading}`}>{metrics.Status}</p>
                         <p className={`text-xs ${textMuted} mt-1`}>Market data is currently unavailable for this specific ticker. Please verify the symbol.</p>
                       </div>
                    )}

                    {/* SUCCESSFUL FETCH RENDER */}
                    {metrics && !metrics.Status && Object.keys(metrics).length > 0 && (!fetchingMetrics || Object.keys(metrics).length > 0) && (
                      <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                        {Object.entries(metrics).map(([key, val]) => (
                          <div key={key} className={`flex flex-col justify-center ${theme==='dark'?'bg-slate-800/40 border-slate-700/50':'bg-slate-50 border-slate-200'} p-3.5 rounded-xl border hover:border-blue-500/50 transition-colors`}>
                            <span className={`${textMuted} text-[10px] font-bold uppercase tracking-wider mb-1`}>{key}</span>
                            <span className={`${textHeading} font-extrabold text-sm ${val && (val.includes('Buy') || val.includes('Strong')) ? 'text-emerald-500' : ''}`}>{val}</span>
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
                    <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-6 rounded-3xl flex items-start gap-4 shadow-sm mb-6">
                      <AlertCircle className="w-8 h-8 shrink-0 mt-1" />
                      <div><h3 className="font-bold text-xl mb-1">Analysis Error</h3><p className="text-sm font-medium leading-relaxed">{error}</p></div>
                    </div>
                  )}

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
                            "Establishing secure socket to YFinance API...",
                            "Sector Analyst compiling macro-economic shifts...",
                            "Quant Agent running forensic fundamental equations...",
                            "Technical Agent mapping support/resistance vectors...",
                            "Sentiment Agent parsing social & institutional flows...",
                            "Chief Risk Officer identifying black-swan variables...",
                            "CIO synthesizing final Markdown Executive Memo..."
                          ].map((text, i) => (
                            <div key={i} className={`flex items-center gap-4 text-sm font-bold transition-all duration-700 ${loadingStep > i ? textMuted : (loadingStep === i ? 'text-blue-500 translate-x-2' : (theme==='dark'?'text-slate-700':'text-slate-300'))}`}>
                              {loadingStep > i ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : (loadingStep === i ? <Clock className="w-5 h-5 animate-spin shrink-0" /> : <div className={`w-5 h-5 border-2 ${theme==='dark'?'border-slate-700':'border-slate-300'} rounded-full shrink-0`}></div>)}
                              {text}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* ADSENSE SECTION */}
                      <div className={`w-full md:w-1/2 ${theme==='dark'?'bg-slate-950/50':'bg-slate-50'} p-10 flex flex-col items-center justify-center relative`}>
                        <span className={`absolute top-6 left-8 text-[10px] ${textMuted} uppercase tracking-widest font-extrabold flex items-center gap-2`}><Zap className="w-3 h-3"/> Sponsored Payload</span>
                        
                        {userTier === 'free' ? (
                          <div className={`w-full max-w-[400px] h-[300px] ${cardBg} border border-dashed rounded-3xl flex flex-col items-center justify-center relative shadow-sm`}>
                            <BarChart3 className={`w-10 h-10 ${theme==='dark'?'text-slate-700':'text-slate-300'} mb-3`} />
                            <p className={`${textMuted} text-sm font-bold tracking-wide`}>Google AdSense Space</p>
                          </div>
                        ) : (
                          <div className={`w-full max-w-[400px] h-[300px] ${cardBg} border-blue-500/20 rounded-3xl flex flex-col items-center justify-center relative shadow-sm`}>
                            <Crown className={`w-12 h-12 text-blue-500 mb-3`} />
                            <p className={`${textHeading} text-lg font-bold tracking-wide`}>Pro Tier Active</p>
                            <p className={`${textMuted} text-sm font-medium`}>Ads Disabled</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* REPORT RENDER (ANTI-THEFT FOR FREE TIER) */}
                  {report && !loading && (
                    <div 
                      className={`${cardBg} backdrop-blur-xl p-10 lg:p-14 rounded-3xl shadow-sm border flex flex-col relative transition-colors ${userTier === 'free' ? 'select-none' : 'select-auto'}`}
                      onCopy={handleCopy}
                    >
                      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-8 border-b ${theme==='dark'?'border-slate-800/80':'border-slate-200'} gap-4`}>
                        <div>
                          <h2 className={`text-3xl font-extrabold ${textHeading}`}>Executive Investment Memo</h2>
                          <p className={`${textMuted} font-medium mt-1`}>Generated by 7-Agent Institutional Ensemble</p>
                        </div>
                        
                        <div className="flex gap-3">
                          {/* ONLY SHOW COPY BUTTON FOR PAID USERS */}
                          {userTier !== 'free' && (
                            <button onClick={handleCopy} className={`flex items-center gap-2 text-xs font-bold ${theme==='dark'?'text-white bg-slate-800 hover:bg-slate-700':'text-slate-700 bg-slate-100 hover:bg-slate-200'} px-5 py-2.5 rounded-full transition-all`}>
                              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />} {copied ? "Copied!" : "Copy Memo"}
                            </button>
                          )}
                          <button onClick={() => setShowPro(true)} className="flex items-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-full transition-all shadow-md hover:-translate-y-0.5">
                            <Download className="w-4 h-4" /> Export PDF {userTier === 'free' && <Lock className="w-3 h-3 text-white/50 ml-1"/>}
                          </button>
                        </div>
                      </div>
                      
                      {userTier === 'free' && (
                        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 px-4 py-2 rounded-lg text-xs font-bold mb-6 flex items-center gap-2">
                          <Lock className="w-4 h-4"/> Text Selection and Copying is disabled in the Free Demo. Upgrade to Pro to copy and export.
                        </div>
                      )}

                      <div className={`prose ${theme==='dark'?'prose-invert':''} prose-lg max-w-none prose-headings:${textHeading} prose-headings:font-extrabold tracking-tight prose-h1:text-3xl prose-h1:border-b ${theme==='dark'?'prose-h1:border-slate-800/80':'prose-h1:border-slate-200'} prose-h1:pb-4 prose-h1:mb-8 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-6 prose-h2:text-blue-500 prose-h3:text-xl prose-h3:text-indigo-500 prose-p:${textHeading} prose-p:opacity-90 prose-p:leading-loose prose-p:font-medium prose-a:text-blue-500 hover:prose-a:text-blue-400 prose-strong:${textHeading} prose-strong:font-black prose-ul:list-none prose-ul:pl-0 prose-li:relative prose-li:pl-6 prose-li:my-3 prose-li:${textHeading} prose-li:opacity-90 prose-li:before:content-['▹'] prose-li:before:absolute prose-li:before:left-0 prose-li:before:text-blue-500 prose-li:before:font-bold prose-blockquote:border-l-4 prose-blockquote:border-blue-500 ${theme==='dark'?'prose-blockquote:bg-slate-800/50':'prose-blockquote:bg-blue-50'} prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic prose-blockquote:${textHeading} prose-blockquote:font-medium text-base`}>
                        <ReactMarkdown>{report}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <footer className={`mt-16 pt-10 border-t ${theme==='dark'?'border-slate-800':'border-slate-200'} pb-10`}>
            <div className="flex flex-col md:flex-row justify-between items-start gap-10">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-4"><ShieldAlert className="w-6 h-6 text-amber-500" /><h4 className={`${textHeading} font-extrabold text-sm uppercase tracking-widest`}>Regulatory Disclaimer</h4></div>
                <p className={`text-xs ${textMuted} font-medium leading-relaxed`}>
                  Not SEBI Registered. AI-generated reports are for educational purposes only. Do not trade solely based on this data. The algorithms may hallucinate or provide delayed data. AI Stock Analyst Pro and its developers assume no liability for financial losses incurred.
                </p>
              </div>
              <div className="flex flex-col gap-4 min-w-[200px]">
                <h4 className={`${textHeading} font-extrabold text-sm uppercase tracking-widest`}>Legal & Compliance</h4>
                <button onClick={() => setShowLegal(true)} className={`text-left text-xs font-bold ${textMuted} hover:text-blue-500 transition-colors flex items-center gap-2`}><FileText className="w-4 h-4"/> Privacy Policy</button>
                <button onClick={() => setShowLegal(true)} className={`text-left text-xs font-bold ${textMuted} hover:text-blue-500 transition-colors flex items-center gap-2`}><Scale className="w-4 h-4"/> Terms of Service</button>
              </div>
            </div>
            <div className={`mt-12 pt-6 border-t ${theme==='dark'?'border-slate-800/50':'border-slate-200'} flex flex-col md:flex-row justify-between items-center gap-4`}>
              <p className={`text-xs font-bold ${textMuted} uppercase tracking-widest`}>© {new Date().getFullYear()} Analyst Pro | By Jatin Kalra</p>
              
              {userTier === 'free' && (
                <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors ${theme==='dark'?'bg-blue-900/20 border-blue-500/20':'bg-blue-50 border-blue-200'} px-4 py-2 rounded-full border`}>
                  <Coffee className="w-4 h-4" /> Support Development
                </a>
              )}
            </div>
          </footer>
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
