import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Activity, Search, TrendingUp, AlertCircle, ShieldAlert, BarChart3, Clock, CheckCircle2, Coffee, X, FileText, Scale, Sparkles, Download, LayoutDashboard, History, Crown, LogIn, ChevronRight, Zap, Target, Sun, Moon, Share2, Check, Lock, Menu, Users, Award, Shield, Star, LogOut } from 'lucide-react';
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const POPULAR_STOCKS = [
  { name: "NIFTY 50", ticker: "^NSEI", tvSymbol: "NSE:NIFTY" },
  { name: "Reliance Ind.", ticker: "RELIANCE.NS", tvSymbol: "BSE:RELIANCE" },
  { name: "HDFC Bank", ticker: "HDFCBANK.NS", tvSymbol: "BSE:HDFCBANK" },
  { name: "TCS", ticker: "TCS.NS", tvSymbol: "BSE:TCS" },
  { name: "Infosys", ticker: "INFY.NS", tvSymbol: "BSE:INFY" },
  { name: "Zomato", ticker: "ZOMATO.NS", tvSymbol: "BSE:ZOMATO" },
  { name: "ICICI Bank", ticker: "ICICIBANK.NS", tvSymbol: "BSE:ICICIBANK" },
  { name: "Tata Motors", ticker: "TATAMOTORS.NS", tvSymbol: "BSE:TATAMOTORS" },
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  
  // USER ACCOUNT STATE
  const [user, setUser] = useState(null); 
  const [userTier, setUserTier] = useState('free'); 
  const [generationsToday, setGenerationsToday] = useState(0);

  const [loadingStep, setLoadingStep] = useState(0);
  const [theme, setTheme] = useState('dark'); 
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  // Instant Metrics Fetching
  const fetchLiveRatios = async (targetTicker) => {
    if (!targetTicker) return;
    setFetchingMetrics(true);
    
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
        setMetrics({});
      }
    } catch (err) {
      console.error("Failed to fetch preliminary metrics", err);
      setMetrics({});
    } finally {
      setFetchingMetrics(false);
    }
  };

  // Auto-fetch metrics
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
        setLoadingStep(prev => (prev < 6 ? prev + 1 : prev));
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
    if (!checkDailyLimit()) return; 

    setLoading(true);
    setError(null);
    setReport(null);
    setActiveTab('dashboard');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase(), company_name: companyName || ticker }),
      });

      if (!response.ok) throw new Error('Analysis failed. AI agents encountered a rate limit or timeout.');
      
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
      const updatedHistory = [newRecord, ...memoHistory].slice(0, 50);
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
        uid: loggedInUser.uid,
        photo: loggedInUser.photoURL
      });
      
      setShowAuth(false);
    } catch (error) {
      console.error("Login Failed:", error);
      alert("Authentication failed. Please check your Firebase configuration.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getFilteredHistory = () => {
    if (userTier !== 'free') return memoHistory;
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return memoHistory.filter(memo => memo.id > sevenDaysAgo);
  };

  const visibleHistory = getFilteredHistory();

  // Dynamic Theme Colors
  const baseBg = theme === 'dark' ? 'bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100';
  const cardBg = theme === 'dark' ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white/90 border-slate-200';
  const cardHover = theme === 'dark' ? 'hover:bg-slate-800/60 hover:border-blue-500/50' : 'hover:bg-slate-50 hover:border-blue-300';
  const inputBg = theme === 'dark' ? 'bg-slate-950/50 border-slate-700 text-white focus:ring-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';
  const textMuted = theme === 'dark' ? 'text-slate-400' : 'text-slate-600';
  const textHeading = theme === 'dark' ? 'text-white' : 'text-slate-900';

  return (
    <div className={`flex h-screen font-sans overflow-hidden relative selection:bg-blue-500/30 transition-all duration-700 ${baseBg}`}>
      
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full mix-blend-screen filter blur-[120px] animate-blob ${theme==='dark' ? 'bg-gradient-to-r from-blue-900/40 to-purple-900/30' : 'bg-gradient-to-r from-blue-300/50 to-purple-300/40'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000 ${theme==='dark' ? 'bg-gradient-to-r from-emerald-900/30 to-blue-900/40' : 'bg-gradient-to-r from-emerald-200/50 to-blue-200/50'}`}></div>
        <div className={`absolute top-[50%] left-[50%] w-[40%] h-[40%] rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000 ${theme==='dark' ? 'bg-amber-900/20' : 'bg-amber-200/40'}`}></div>
      </div>

      {/* Welcome Popup */}
      {showPopup && userTier === 'free' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl transition-all animate-fade-in">
          <div className={`${theme==='dark'?'bg-gradient-to-br from-slate-900 via-blue-900/50 to-slate-900 border-blue-500/30':'bg-white border-slate-200'} rounded-3xl shadow-2xl max-w-lg w-full p-10 relative animate-scale-in border-2 overflow-hidden`}>
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient-x"></div>
            
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow animation-delay-1000"></div>
            
            <div className="flex justify-center mb-8 mt-4 relative z-10">
              <div className={`${theme==='dark'?'bg-gradient-to-br from-blue-600 to-purple-600':'bg-gradient-to-br from-blue-500 to-purple-500'} p-6 rounded-3xl shadow-2xl shadow-blue-500/50 animate-float`}>
                <Activity className="w-14 h-14 text-white animate-pulse" />
              </div>
            </div>
            
            <h2 className={`text-4xl font-black text-center mb-4 tracking-tight ${textHeading} animate-slide-down`}>
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient-x">AnalystPro</span>
            </h2>
            <p className={`text-center ${textMuted} mb-8 text-base leading-relaxed font-medium animate-slide-up animation-delay-200`}>
              Powered by <span className="text-blue-500 font-bold">7 specialized AI agents</span> for institutional-grade stock analysis. 
              By continuing, you agree to our terms and understand this is for educational purposes only.
            </p>

            <label className={`flex items-start gap-4 p-5 border-2 ${theme==='dark'?'border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20':'border-blue-300 bg-blue-50 hover:bg-blue-100'} rounded-2xl cursor-pointer transition-all mb-8 animate-slide-up animation-delay-400 hover:scale-[1.02]`}>
              <input type="checkbox" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} className="mt-1.5 w-5 h-5 rounded border-slate-400 text-blue-600 focus:ring-blue-500 cursor-pointer" />
              <span className={`text-sm ${textMuted} font-semibold leading-relaxed`}>
                I agree this tool is for <span className="text-blue-500">educational purposes ONLY</span>. I understand AI can hallucinate and I waive all liability for financial decisions.
              </span>
            </label>

            <div className="flex flex-col gap-4 animate-slide-up animation-delay-600">
              <button 
                disabled={!termsAgreed} 
                onClick={() => { localStorage.setItem('ai_terms_agreed', 'true'); setShowPopup(false); }} 
                className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 disabled:from-slate-600 disabled:to-slate-700 hover:shadow-2xl hover:shadow-blue-500/50 text-white font-black py-5 px-6 rounded-2xl disabled:shadow-none flex justify-center items-center transition-all disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              >
                <Zap className="w-6 h-6 mr-2" />
                Launch Terminal
              </button>
              
              <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" className={`w-full ${textMuted} hover:${textHeading} font-bold py-3 rounded-xl text-sm text-center transition-all flex justify-center items-center gap-2 hover:scale-105`}>
                <Coffee className="w-4 h-4"/> Support Development ☕
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-fade-in">
          <div className={`${theme==='dark'?'bg-slate-900 border-slate-700':'bg-white border-slate-200'} rounded-3xl shadow-2xl max-w-md w-full p-10 relative animate-scale-in border-2`}>
            <button onClick={() => setShowAuth(false)} className={`absolute top-6 right-6 ${textMuted} hover:${textHeading} bg-slate-500/10 hover:bg-slate-500/20 rounded-full p-2 transition-all`}><X className="w-6 h-6" /></button>
            
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/50 animate-float">
                <LogIn className="w-10 h-10 text-white" />
              </div>
            </div>
            
            <h2 className={`text-3xl font-black text-center mb-3 ${textHeading}`}>Sign In</h2>
            <p className={`${textMuted} text-center mb-10 font-medium`}>Sync your analysis history and unlock premium features</p>
            
            <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-4 bg-white hover:bg-slate-50 text-slate-900 font-bold py-4 rounded-2xl transition-all border-2 border-slate-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]">
              <svg className="w-6 h-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            
            <p className={`text-center text-xs ${textMuted} flex items-center justify-center gap-2 mt-6`}>
              <Shield className="w-4 h-4 text-blue-500"/> Secured by Firebase Authentication
            </p>
          </div>
        </div>
      )}

      {/* Pro Plans Modal */}
      {showPro && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl overflow-y-auto animate-fade-in">
          <div className={`${theme==='dark'?'bg-slate-900 border-slate-700':'bg-slate-50 border-slate-200'} rounded-3xl shadow-2xl max-w-6xl w-full p-10 relative animate-scale-in border-2 my-8`}>
            <button onClick={() => setShowPro(false)} className={`absolute top-6 right-6 ${textMuted} hover:${textHeading} bg-slate-500/10 hover:bg-slate-500/20 rounded-full p-2 transition-all z-10`}><X className="w-6 h-6" /></button>
            
            <div className="text-center mb-12 animate-slide-down">
              <h2 className={`text-5xl font-black mb-4 ${textHeading}`}>
                Unlock Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">Trading Edge</span>
              </h2>
              <p className={`${textMuted} text-lg max-w-2xl mx-auto font-medium`}>
                Premium access to 7-Agent institutional intelligence. Unlimited analysis, exports, and ad-free experience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              
              {/* Basic Plan */}
              <div className={`${theme==='dark'?'bg-slate-800/60 border-slate-700':'bg-white border-slate-200'} p-8 rounded-3xl border-2 flex flex-col hover:scale-[1.02] transition-all duration-500 animate-slide-up`}>
                <div className="mb-6">
                  <h3 className={`text-2xl font-black ${textHeading} mb-2 flex items-center gap-2`}>
                    <Award className="w-6 h-6 text-blue-500" /> Basic
                  </h3>
                  <div className="mb-6">
                    <span className={`text-5xl font-black ${textHeading}`}>₹99</span>
                    <span className={`${textMuted} text-lg`}>/month</span>
                  </div>
                </div>
                <ul className={`space-y-4 mb-10 text-base font-semibold ${textMuted} flex-1`}>
                  <li className="flex gap-3 items-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0"/> 5 Reports per day</li>
                  <li className="flex gap-3 items-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0"/> Copy & export enabled</li>
                  <li className="flex gap-3 items-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0"/> Unlimited history</li>
                  <li className="flex gap-3 items-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0"/> Email support</li>
                </ul>
                <button disabled className={`w-full py-4 rounded-2xl font-black transition-all cursor-not-allowed text-lg ${theme==='dark'?'bg-slate-700 text-slate-400':'bg-slate-200 text-slate-500'}`}>
                  Coming Soon
                </button>
              </div>

              {/* Pro Plan - FEATURED */}
              <div className={`relative ${theme==='dark'?'bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-pink-900/40 border-blue-500':'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-400'} p-8 rounded-3xl border-4 flex flex-col transform scale-110 shadow-2xl shadow-blue-500/30 animate-slide-up animation-delay-200 hover:scale-[1.15] transition-all duration-500`}>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-xl">
                  <Star className="w-3 h-3 inline mr-1" /> Most Popular
                </div>
                
                <div className="mb-6">
                  <h3 className={`text-2xl font-black mb-2 flex items-center gap-2`} style={{color: theme==='dark' ? '#60a5fa' : '#2563eb'}}>
                    <Crown className="w-7 h-7" /> Pro
                  </h3>
                  <div className="mb-6">
                    <span className={`text-6xl font-black ${textHeading}`}>₹149</span>
                    <span className={`${textMuted} text-lg`}>/month</span>
                  </div>
                </div>
                <ul className={`space-y-4 mb-10 text-base font-bold ${theme==='dark'?'text-slate-200':'text-slate-800'} flex-1`}>
                  <li className="flex gap-3 items-center"><CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0"/> 10 Reports per day</li>
                  <li className="flex gap-3 items-center"><CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0"/> PDF & Markdown export</li>
                  <li className="flex gap-3 items-center"><CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0"/> Ad-free experience</li>
                  <li className="flex gap-3 items-center"><CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0"/> Priority support</li>
                  <li className="flex gap-3 items-center"><CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0"/> Advanced analytics</li>
                </ul>
                <button disabled className={`w-full py-5 rounded-2xl font-black cursor-not-allowed text-lg shadow-xl ${theme==='dark'?'bg-slate-700 text-slate-400':'bg-slate-300 text-slate-600'}`}>
                  Coming Soon
                </button>
              </div>

              {/* Ultra Plan */}
              <div className={`${theme==='dark'?'bg-slate-800/60 border-slate-700':'bg-white border-slate-200'} p-8 rounded-3xl border-2 flex flex-col hover:scale-[1.02] transition-all duration-500 animate-slide-up animation-delay-400`}>
                <div className="mb-6">
                  <h3 className={`text-2xl font-black ${textHeading} mb-2 flex items-center gap-2`}>
                    <Zap className="w-6 h-6 text-purple-500" /> Ultra
                  </h3>
                  <div className="mb-6">
                    <span className={`text-5xl font-black ${textHeading}`}>₹499</span>
                    <span className={`${textMuted} text-lg`}>/month</span>
                  </div>
                </div>
                <ul className={`space-y-4 mb-10 text-base font-semibold ${textMuted} flex-1`}>
                  <li className="flex gap-3 items-center"><CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0"/> Unlimited reports</li>
                  <li className="flex gap-3 items-center"><CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0"/> Priority AI processing</li>
                  <li className="flex gap-3 items-center"><CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0"/> API access</li>
                  <li className="flex gap-3 items-center"><CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0"/> Commercial license</li>
                  <li className="flex gap-3 items-center"><CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0"/> 24/7 support</li>
                </ul>
                <button disabled className={`w-full py-4 rounded-2xl font-black transition-all cursor-not-allowed text-lg ${theme==='dark'?'bg-slate-700 text-slate-400':'bg-slate-200 text-slate-500'}`}>
                  Coming Soon
                </button>
              </div>

            </div>

            <p className={`text-center ${textMuted} text-sm font-medium`}>
              Premium features launching soon. <a href="https://www.chai4.me/jatinkalra" target="_blank" className="text-blue-500 hover:text-blue-400 underline font-bold">Support development</a> to get early access!
            </p>
          </div>
        </div>
      )}

      {/* Legal Modal */}
      {showLegal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-fade-in">
          <div className={`${theme==='dark'?'bg-slate-900 border-slate-700':'bg-white border-slate-200'} rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col animate-scale-in border-2`}>
            <div className={`p-8 border-b ${theme==='dark'?'border-slate-700 bg-slate-800/50':'border-slate-200 bg-slate-50'} flex justify-between items-center rounded-t-3xl`}>
              <h2 className={`text-2xl font-black flex items-center gap-3 ${textHeading}`}>
                <Scale className="text-blue-500 w-7 h-7"/> Legal & Privacy
              </h2>
              <button onClick={() => setShowLegal(false)} className={`p-2 ${textMuted} hover:${textHeading} hover:bg-slate-500/10 rounded-full transition-all`}>
                <X className="w-7 h-7" />
              </button>
            </div>
            <div className={`p-8 overflow-y-auto custom-scrollbar prose ${theme==='dark'?'prose-invert':''} prose-base ${theme==='dark'?'text-slate-300':'text-slate-600'} max-w-none flex-1`}>
              <h3 className={`${textHeading} text-2xl font-black mb-4`}>Terms of Service</h3>
              <p className="leading-relaxed">By using AI Stock Analyst Pro, you agree that all information is for <strong>educational purposes only</strong>. We are <strong>NOT SEBI registered</strong> financial advisors. AI-generated reports should not be considered financial advice. You are solely responsible for your investment decisions.</p>
              
              <h3 className={`${textHeading} text-2xl font-black mb-4 mt-8`}>Privacy Policy</h3>
              <p className="leading-relaxed">We do not store your personal financial data on our servers. Stock tickers you search are processed securely and immediately discarded after report generation. We use Firebase Authentication for secure login and Google AdSense for advertising.</p>
              
              <h3 className={`${textHeading} text-2xl font-black mb-4 mt-8`}>AI Disclaimer</h3>
              <p className="leading-relaxed">Our AI agents use Google Gemini 2.0 Flash. AI models can hallucinate, produce errors, or outdated information. <strong>Always verify data independently</strong> before making investment decisions.</p>
              
              <h3 className={`${textHeading} text-2xl font-black mb-4 mt-8`}>Google AdSense</h3>
              <p className="leading-relaxed">Third-party vendors including Google use cookies to serve ads based on your browsing history. You can opt out at <a href="https://www.google.com/settings/ads" target="_blank" className="text-blue-500 hover:text-blue-400 underline font-bold">Google Ad Settings</a>.</p>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-80' : 'w-0'} ${cardBg} backdrop-blur-3xl hidden md:flex flex-col relative z-30 shadow-2xl transition-all duration-500 overflow-hidden border-r-2 ${theme==='dark'?'border-slate-800':'border-slate-200'}`}>
        <div className={`p-6 border-b-2 ${theme==='dark'?'border-slate-800':'border-slate-200'} animate-slide-down`}>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-3 rounded-2xl shadow-2xl shadow-blue-500/50 animate-float">
              <Activity className="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className={`font-black text-2xl tracking-tight ${textHeading}`}>
                Analyst<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">Pro</span>
              </h1>
              <p className={`text-xs ${textMuted} font-bold uppercase tracking-wider`}>7-Agent System</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-5 space-y-3 overflow-y-auto custom-scrollbar">
          <p className={`text-[10px] font-black ${textMuted} uppercase tracking-widest px-4 mb-4 mt-2`}>Navigation</p>
          
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all duration-300 group ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl shadow-blue-500/30' : `${textMuted} hover:${textHeading} border-2 border-transparent hover:border-blue-500/30 hover:bg-blue-500/10`}`}>
            <LayoutDashboard className={`w-6 h-6 ${activeTab === 'dashboard' ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} /> 
            Terminal
          </button>
          
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl font-bold transition-all duration-300 group ${activeTab === 'history' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl shadow-purple-500/30' : `${textMuted} hover:${textHeading} border-2 border-transparent hover:border-purple-500/30 hover:bg-purple-500/10`}`}>
            <div className="flex items-center gap-4">
              <History className={`w-6 h-6 ${activeTab === 'history' ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} /> 
              History {userTier === 'free' && <Lock className="w-4 h-4 text-amber-400 ml-1 animate-pulse"/>}
            </div>
            {visibleHistory.length > 0 && (
              <span className={`${activeTab === 'history' ? 'bg-white text-purple-600' : 'bg-blue-600 text-white'} text-xs px-3 py-1 rounded-full font-black shadow-lg`}>
                {visibleHistory.length}
              </span>
            )}
          </button>
        </nav>

        <div className={`p-5 border-t-2 ${theme==='dark'?'border-slate-800 bg-slate-900/50':'border-slate-200 bg-slate-50'} animate-slide-up`}>
          {userTier === 'free' ? (
            <div onClick={() => setShowPro(true)} className={`bg-gradient-to-br ${theme==='dark'?'from-blue-900/40 to-purple-900/40 border-blue-500/30':'from-blue-50 to-purple-50 border-blue-300'} p-6 rounded-3xl border-2 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all duration-500 shadow-xl`}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-bl-full blur-2xl group-hover:scale-150 transition-all duration-700"></div>
              <h4 className={`${textHeading} font-black text-lg flex items-center gap-2 mb-2 relative z-10`}>
                <Crown className="w-5 h-5 text-yellow-500 animate-pulse"/> Upgrade Pro
              </h4>
              <p className={`text-sm ${textMuted} font-bold mb-4 relative z-10`}>
                {generationsToday}/1 Demo Used Today
              </p>
              <button className={`text-sm font-black ${theme==='dark'?'bg-white text-slate-900 hover:bg-blue-100':'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'} px-6 py-3 rounded-xl w-full transition-all shadow-lg hover:shadow-2xl hover:scale-105 relative z-10`}>
                View Plans →
              </button>
            </div>
          ) : (
            <div className={`bg-gradient-to-br from-emerald-500/20 to-green-500/20 p-6 rounded-3xl border-2 border-emerald-500/40 text-emerald-400 shadow-xl`}>
              <h4 className="font-black text-lg flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 animate-pulse"/> {userTier.toUpperCase()} Active
              </h4>
              <p className="text-sm font-bold opacity-90">Scans Today: {generationsToday}</p>
            </div>
          )}
          
          <div onClick={() => !user && setShowAuth(true)} className={`flex items-center gap-4 px-3 py-4 mt-5 cursor-pointer hover:bg-slate-500/10 rounded-2xl transition-all duration-300 group ${user ? '' : 'hover:scale-[1.02]'}`}>
            {user && user.photo ? (
              <img src={user.photo} alt="User" className="w-12 h-12 rounded-full border-2 border-blue-500 shadow-lg" />
            ) : (
              <div className={`w-12 h-12 ${theme==='dark'?'bg-gradient-to-br from-blue-600 to-purple-600':'bg-gradient-to-br from-blue-500 to-purple-500'} rounded-full flex items-center justify-center font-black shadow-lg text-white text-lg`}>
                {user ? user.name[0] : '?'}
              </div>
            )}
            <div className="flex-1">
              <p className={`text-sm font-black ${textHeading} leading-none mb-1.5`}>
                {user ? user.name : 'Guest User'}
              </p>
              {!user ? (
                <p className="text-xs text-blue-500 font-black uppercase tracking-wider group-hover:text-blue-400 transition-colors">
                  Click to Sign In →
                </p>
              ) : (
                <p className={`text-xs ${textMuted} font-semibold truncate`}>{user.email}</p>
              )}
            </div>
            {user && (
              <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className={`p-2 ${textMuted} hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all`}>
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        
        {/* Header */}
        <header className={`${cardBg} backdrop-blur-3xl border-b-2 sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-xl transition-all duration-500 ${theme==='dark'?'border-slate-800':'border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`hidden md:block p-2 rounded-xl ${theme==='dark'?'hover:bg-slate-800':'hover:bg-slate-100'} transition-all`}>
              <Menu className={`w-6 h-6 ${textMuted}`} />
            </button>
            
            <div className="flex md:hidden items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-xl shadow-lg">
                <Activity className="text-white w-6 h-6" />
              </div>
              <h1 className={`font-black ${textHeading} text-xl`}>
                Analyst<span className="text-blue-500">Pro</span>
              </h1>
            </div>
            
            <div className={`hidden lg:flex items-center gap-3 ${theme==='dark'?'bg-slate-800/50 border-slate-700':'bg-slate-100 border-slate-200'} border-2 px-5 py-2.5 rounded-full`}>
              <Search className={`w-5 h-5 ${textMuted}`} />
              <span className={`text-sm font-black ${textMuted} uppercase tracking-wider`}>
                {activeTab === 'dashboard' ? '🌐 Global Markets' : '🔒 Encrypted Vault'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className={`p-3 rounded-full transition-all duration-500 ${theme==='dark'?'hover:bg-yellow-500/20 text-yellow-400':'hover:bg-blue-500/20 text-blue-600'} hover:scale-110 active:scale-95`}>
              {theme === 'dark' ? <Sun className="w-6 h-6 animate-pulse" /> : <Moon className="w-6 h-6 animate-pulse" />}
            </button>
            
            <div className={`hidden sm:flex items-center gap-2 text-xs font-black text-emerald-400 ${theme==='dark'?'bg-emerald-500/10 border-emerald-500/20':'bg-emerald-50 border-emerald-200'} border-2 px-4 py-2 rounded-full uppercase tracking-wider shadow-lg`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              System Online
            </div>
            
            {userTier === 'free' && (
              <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-full font-black text-sm transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95">
                <Coffee className="w-4 h-4 animate-bounce" /> 
                <span>Support</span>
              </a>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
          
          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                <div className="animate-slide-right">
                  <h2 className={`text-4xl md:text-5xl font-black ${textHeading} tracking-tight mb-3 flex items-center gap-4`}>
                    <History className="w-10 h-10 text-purple-500 animate-pulse" />
                    Analysis Vault
                    {userTier === 'free' && (
                      <span className="text-sm bg-amber-500/20 text-amber-500 px-4 py-2 rounded-full border-2 border-amber-500/30 animate-pulse">
                        7-Day Free Tier
                      </span>
                    )}
                  </h2>
                  <p className={`${textMuted} font-semibold text-lg`}>
                    Access your institutional-grade research library
                  </p>
                </div>
              </div>

              {visibleHistory.length === 0 ? (
                <div className={`${cardBg} backdrop-blur-3xl p-20 rounded-3xl border-2 ${theme==='dark'?'border-slate-700':'border-slate-200'} text-center shadow-2xl flex flex-col items-center animate-scale-in`}>
                  <div className={`w-32 h-32 ${theme==='dark'?'bg-slate-800 border-slate-700':'bg-slate-100 border-slate-200'} rounded-full flex items-center justify-center mb-8 border-4 shadow-2xl animate-float`}>
                    <FileText className={`w-16 h-16 ${textMuted}`} />
                  </div>
                  <h3 className={`text-3xl font-black ${textHeading} mb-4`}>Vault is Empty</h3>
                  <p className={`${textMuted} font-semibold max-w-md mx-auto mb-10 text-lg leading-relaxed`}>
                    {userTier === 'free' ? 'Generate your first AI-powered analysis to start building your research library.' : 'No analysis reports generated yet.'}
                  </p>
                  <button onClick={() => setActiveTab('dashboard')} className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white px-10 py-5 rounded-2xl font-black transition-all shadow-2xl flex items-center gap-3 text-lg hover:scale-105 active:scale-95">
                    <Zap className="w-6 h-6 animate-pulse"/> Launch Terminal
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {visibleHistory.map((memo, index) => (
                    <div key={memo.id} onClick={() => loadHistoryItem(memo)} style={{animationDelay: `${index * 100}ms`}} className={`${cardBg} backdrop-blur-2xl p-7 rounded-3xl border-2 ${theme==='dark'?'border-slate-700 hover:border-blue-500':'border-slate-200 hover:border-blue-400'} transition-all duration-500 cursor-pointer group shadow-xl hover:shadow-2xl relative overflow-hidden animate-slide-up hover:scale-[1.02] active:scale-[0.98]`}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-bl-full filter blur-3xl group-hover:scale-150 transition-all duration-700"></div>
                      
                      <div className="flex justify-between items-start mb-5 relative z-10">
                        <h3 className={`font-black text-2xl ${textHeading} group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-purple-500 transition-all duration-300`}>
                          {memo.ticker}
                        </h3>
                        <div className={`${theme==='dark'?'bg-slate-800 group-hover:bg-blue-600':'bg-slate-100 group-hover:bg-blue-500'} p-3 rounded-2xl group-hover:text-white ${textMuted} transition-all duration-300 group-hover:scale-110`}>
                          <ChevronRight className="w-5 h-5"/>
                        </div>
                      </div>
                      
                      <p className={`text-base font-bold ${textMuted} mb-6 truncate relative z-10`}>
                        {memo.companyName}
                      </p>
                      
                      <div className={`flex items-center gap-3 text-xs ${textMuted} font-black uppercase tracking-wider relative z-10 ${theme==='dark'?'bg-slate-950/50 border-slate-800':'bg-slate-50 border-slate-200'} py-2 px-4 rounded-xl inline-flex border-2`}>
                        <Clock className="w-4 h-4" /> 
                        {memo.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 max-w-[1800px] mx-auto animate-fade-in-up">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Input Panel */}
                <div className={`lg:col-span-5 ${cardBg} backdrop-blur-3xl p-8 rounded-3xl shadow-2xl border-2 ${theme==='dark'?'border-slate-700':'border-slate-200'} flex flex-col justify-between relative overflow-hidden group transition-all duration-500 animate-slide-left`}>
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl group-hover:scale-150 transition-all duration-700"></div>
                  
                  <div className="relative z-10">
                    <h2 className={`font-black text-2xl mb-8 flex items-center gap-3 ${textHeading}`}>
                      <Target className="w-7 h-7 text-blue-500 animate-pulse" /> 
                      Asset Parameters
                    </h2>
                    
                    <form onSubmit={handleAnalyze} className="space-y-6">
                      <div>
                        <label className={`block text-sm font-black ${textMuted} uppercase tracking-wider mb-3`}>
                          Stock Ticker
                        </label>
                        <input 
                          type="text" 
                          placeholder="RELIANCE.NS" 
                          value={ticker} 
                          onChange={(e) => setTicker(e.target.value.toUpperCase())} 
                          className={`w-full px-6 py-5 rounded-2xl outline-none font-black transition-all uppercase text-lg ${inputBg} border-2 focus:border-blue-500 focus:shadow-xl`} 
                          required 
                        />
                        <p className={`text-xs ${textMuted} mt-3 ml-2 font-bold uppercase tracking-wider`}>
                          📌 NSE stocks: .NS | BSE stocks: .BO
                        </p>
                      </div>
                      
                      <button 
                        type="submit" 
                        disabled={loading || !ticker} 
                        className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-black py-6 rounded-2xl shadow-2xl shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all text-lg uppercase tracking-wider group disabled:hover:scale-100"
                      >
                        {loading ? (
                          <>
                            <Activity className="w-7 h-7 animate-spin" /> 
                            AI Processing...
                          </>
                        ) : (
                          <>
                            <Zap className="w-7 h-7 group-hover:animate-pulse" /> 
                            Launch Analysis
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Popular Stocks Grid */}
                <div className={`lg:col-span-7 ${cardBg} backdrop-blur-3xl p-8 rounded-3xl shadow-2xl border-2 ${theme==='dark'?'border-slate-700':'border-slate-200'} transition-all duration-500 animate-slide-right`}>
                  <h2 className={`font-black text-2xl mb-8 flex items-center gap-3 ${textHeading}`}>
                    <BarChart3 className="w-7 h-7 text-purple-500 animate-pulse" /> 
                    Quick Access
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {POPULAR_STOCKS.map((stock, index) => (
                      <button
                        key={stock.ticker}
                        onClick={() => handleSelectPopular(stock)}
                        style={{animationDelay: `${index * 50}ms`}}
                        className={`text-left p-5 rounded-2xl border-2 transition-all duration-300 group animate-slide-up hover:scale-105 active:scale-95 ${
                          ticker === stock.ticker 
                            ? `border-blue-500 ${theme==='dark'?'bg-blue-900/50':'bg-blue-50'} shadow-xl shadow-blue-500/30` 
                            : `${theme==='dark'?'border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:border-blue-500/50':'border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400'}`
                        }`}
                      >
                        <div className={`font-black ${textHeading} text-sm truncate mb-2 ${ticker === stock.ticker ? 'text-blue-500' : 'group-hover:text-blue-500'} transition-colors`}>
                          {stock.name}
                        </div>
                        <div className="text-blue-500 text-xs font-black uppercase tracking-wider">
                          {stock.ticker}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart & Metrics Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[750px]">
                
                {/* TradingView Chart */}
                <div className="lg:col-span-8 h-full animate-slide-up">
                  <div className={`${cardBg} backdrop-blur-3xl p-3 rounded-3xl shadow-2xl border-2 ${theme==='dark'?'border-slate-700':'border-slate-200'} h-full overflow-hidden transition-all duration-500`}>
                    <AdvancedRealTimeChart 
                      key={`${theme}-${ticker}`}
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

                {/* Live Ratios Panel */}
                <div className={`lg:col-span-4 h-full ${cardBg} backdrop-blur-3xl rounded-3xl shadow-2xl border-2 ${theme==='dark'?'border-slate-700':'border-slate-200'} overflow-hidden flex flex-col transition-all duration-500 animate-slide-up animation-delay-200`}>
                  <div className={`p-6 border-b-2 ${theme==='dark'?'border-slate-700 bg-slate-900/80':'border-slate-200 bg-slate-50/80'} flex items-center justify-between`}>
                    <h3 className={`font-black ${textHeading} flex items-center gap-3 text-lg`}>
                      <Activity className="w-6 h-6 text-blue-500 animate-pulse"/> 
                      Live Metrics
                    </h3>
                    <span className="text-xs bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-full font-black uppercase border-2 border-blue-500/20 animate-pulse">
                      Real-Time
                    </span>
                  </div>
                  
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                    {!ticker && !loading && !fetchingMetrics && !metrics && (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-50 animate-pulse">
                        <Target className={`w-16 h-16 ${textMuted} mb-6`} />
                        <p className={`text-base font-bold ${textMuted}`}>
                          Select an asset to view fundamentals
                        </p>
                      </div>
                    )}

                    {(loading || fetchingMetrics) && (!metrics || Object.keys(metrics).length === 0) && (
                      <div className="h-full grid grid-cols-2 gap-4 content-start">
                        {[...Array(14)].map((_, i) => (
                          <div key={i} style={{animationDelay: `${i * 50}ms`}} className={`flex flex-col justify-center ${theme==='dark'?'bg-slate-800/40 border-slate-700':'bg-slate-100/60 border-slate-200'} p-5 rounded-2xl border-2 h-24 animate-pulse-slow`}>
                            <div className={`h-3 w-20 ${theme==='dark'?'bg-slate-700':'bg-slate-300'} rounded animate-pulse mb-3`}></div>
                            <div className={`h-5 w-24 ${theme==='dark'?'bg-slate-600':'bg-slate-400'} rounded animate-pulse animation-delay-150`}></div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!loading && !fetchingMetrics && ticker && metrics && metrics.Status && (
                       <div className="h-full flex flex-col items-center justify-center text-center animate-scale-in">
                         <AlertCircle className="w-14 h-14 text-amber-500 mb-5 animate-bounce" />
                         <p className={`text-lg font-black ${textHeading} mb-2`}>{metrics.Status}</p>
                         <p className={`text-sm ${textMuted} font-semibold`}>
                           Verify ticker symbol format
                         </p>
                       </div>
                    )}

                    {metrics && !metrics.Status && Object.keys(metrics).length > 0 && (!fetchingMetrics || Object.keys(metrics).length > 0) && (
                      <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
                        {Object.entries(metrics).map(([key, val], index) => (
                          <div key={key} style={{animationDelay: `${index * 50}ms`}} className={`flex flex-col justify-center ${theme==='dark'?'bg-slate-800/50 border-slate-700/60':'bg-slate-50 border-slate-200'} p-5 rounded-2xl border-2 hover:border-blue-500/60 transition-all duration-300 group hover:scale-105 animate-slide-up`}>
                            <span className={`${textMuted} text-xs font-black uppercase tracking-wider mb-2 group-hover:text-blue-500 transition-colors`}>
                              {key}
                            </span>
                            <span className={`${textHeading} font-black text-base truncate ${val && (val.includes('Buy') || val.includes('Strong')) ? 'text-emerald-500' : ''}`}>
                              {val}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Report or Loading Section */}
              {(loading || report || error) && (
                <div className="w-full min-h-[700px] animate-fade-in-up animation-delay-400">
                  {error && (
                    <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border-2 border-red-500/40 text-red-300 p-8 rounded-3xl flex items-start gap-5 shadow-2xl mb-8 animate-shake">
                      <AlertCircle className="w-10 h-10 shrink-0 mt-1 animate-pulse" />
                      <div>
                        <h3 className="font-black text-2xl mb-2 text-red-400">Analysis Error</h3>
                        <p className="text-base font-bold leading-relaxed">{error}</p>
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div className={`${cardBg} backdrop-blur-3xl rounded-3xl shadow-2xl border-2 ${theme==='dark'?'border-slate-700':'border-slate-200'} flex flex-col md:flex-row overflow-hidden min-h-[700px] transition-all duration-500`}>
                      
                      {/* AI Progress Section */}
                      <div className={`w-full md:w-1/2 p-12 border-b-2 md:border-b-0 md:border-r-2 ${theme==='dark'?'border-slate-700':'border-slate-200'} relative flex flex-col justify-center`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-gradient-slow"></div>
                        
                        <div className="relative z-10 mb-12 animate-slide-down">
                          <div className={`w-20 h-20 ${theme==='dark'?'bg-blue-900/40 border-blue-500/40':'bg-blue-100 border-blue-300'} border-4 rounded-3xl flex items-center justify-center mb-8 shadow-2xl animate-float`}>
                            <Activity className="text-blue-500 w-10 h-10 animate-spin-slow" />
                          </div>
                          <h3 className={`text-4xl font-black ${textHeading} mb-4`}>
                            AI Protocol <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">Active</span>
                          </h3>
                          <p className={`${textMuted} font-bold text-lg`}>
                            7 specialized agents analyzing market intelligence...
                          </p>
                        </div>
                        
                        <div className="space-y-6 relative z-10">
                          {[
                            { text: "Establishing secure API connection...", icon: Activity },
                            { text: "Sector specialist compiling macro trends...", icon: BarChart3 },
                            { text: "Quantitative analyst running equations...", icon: Target },
                            { text: "Technical analyst mapping chart patterns...", icon: TrendingUp },
                            { text: "Sentiment analyst parsing market flows...", icon: Users },
                            { text: "Risk officer identifying vulnerabilities...", icon: Shield },
                            { text: "CIO synthesizing executive memo...", icon: Award }
                          ].map((step, i) => {
                            const Icon = step.icon;
                            return (
                              <div key={i} style={{animationDelay: `${i * 100}ms`}} className={`flex items-center gap-5 text-base font-black transition-all duration-700 animate-slide-right ${loadingStep > i ? textMuted : (loadingStep === i ? 'text-blue-500 translate-x-3' : (theme==='dark'?'text-slate-700':'text-slate-300'))}`}>
                                {loadingStep > i ? (
                                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 animate-scale-in" />
                                ) : loadingStep === i ? (
                                  <Icon className="w-6 h-6 shrink-0 animate-pulse" />
                                ) : (
                                  <div className={`w-6 h-6 border-4 ${theme==='dark'?'border-slate-700':'border-slate-300'} rounded-full shrink-0`}></div>
                                )}
                                {step.text}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* AdSense / Pro Section */}
                      <div className={`w-full md:w-1/2 ${theme==='dark'?'bg-slate-950/60':'bg-slate-100/60'} p-12 flex flex-col items-center justify-center relative`}>
                        <span className={`absolute top-8 left-10 text-xs ${textMuted} uppercase tracking-widest font-black flex items-center gap-2 animate-pulse`}>
                          <Zap className="w-4 h-4"/> {userTier === 'free' ? 'Sponsored' : 'Premium'}
                        </span>
                        
                        {userTier === 'free' ? (
                          <div className={`w-full max-w-md h-[350px] ${cardBg} border-2 ${theme==='dark'?'border-slate-700':'border-slate-200'} border-dashed rounded-3xl flex flex-col items-center justify-center relative shadow-2xl animate-scale-in`}>
                            <BarChart3 className={`w-16 h-16 ${theme==='dark'?'text-slate-700':'text-slate-300'} mb-5 animate-pulse`} />
                            <p className={`${textMuted} text-lg font-black tracking-wide`}>
                              Google AdSense Placeholder
                            </p>
                            <p className={`${textMuted} text-sm font-semibold mt-2`}>
                              Ad block renders here
                            </p>
                          </div>
                        ) : (
                          <div className={`w-full max-w-md h-[350px] ${cardBg} border-4 border-emerald-500/40 rounded-3xl flex flex-col items-center justify-center relative shadow-2xl animate-scale-in`}>
                            <Crown className={`w-20 h-20 text-yellow-500 mb-6 animate-float`} />
                            <p className={`${textHeading} text-2xl font-black tracking-wide mb-2`}>
                              {userTier.toUpperCase()} Active
                            </p>
                            <p className={`${textMuted} text-base font-bold`}>Ad-Free Experience</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Report Display */}
                  {report && !loading && (
                    <div 
                      className={`${cardBg} backdrop-blur-3xl p-12 lg:p-16 rounded-3xl shadow-2xl border-2 ${theme==='dark'?'border-slate-700':'border-slate-200'} flex flex-col relative transition-all duration-500 animate-fade-in-up ${userTier === 'free' ? 'select-none' : 'select-auto'}`}
                      onCopy={handleCopy}
                    >
                      <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 pb-10 border-b-2 ${theme==='dark'?'border-slate-700':'border-slate-200'} gap-6`}>
                        <div className="animate-slide-right">
                          <h2 className={`text-4xl font-black ${textHeading} mb-2`}>
                            Executive Investment Memo
                          </h2>
                          <p className={`${textMuted} font-bold text-lg`}>
                            Generated by 7-Agent Institutional Ensemble
                          </p>
                        </div>
                        
                        <div className="flex gap-4 animate-slide-left">
                          {userTier !== 'free' && (
                            <button onClick={handleCopy} className={`flex items-center gap-3 text-sm font-black ${theme==='dark'?'text-white bg-slate-800 hover:bg-slate-700':'text-slate-700 bg-slate-100 hover:bg-slate-200'} px-6 py-3 rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95`}>
                              {copied ? (
                                <>
                                  <Check className="w-5 h-5 text-emerald-500" /> 
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Share2 className="w-5 h-5" /> 
                                  Copy Text
                                </>
                              )}
                            </button>
                          )}
                          <button onClick={() => setShowPro(true)} className="flex items-center gap-3 text-sm font-black text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-3 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95">
                            <Download className="w-5 h-5" /> 
                            Export PDF 
                            {userTier === 'free' && <Lock className="w-4 h-4 text-white/60 ml-1"/>}
                          </button>
                        </div>
                      </div>
                      
                      {userTier === 'free' && (
                        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/40 text-amber-300 px-6 py-4 rounded-2xl text-sm font-black mb-8 flex items-center gap-3 animate-slide-down">
                          <Lock className="w-5 h-5"/> 
                          Text selection and copying disabled in Free Demo. Upgrade to Pro for full access.
                        </div>
                      )}

                      <div className={`prose ${theme==='dark'?'prose-invert':''} prose-xl max-w-none 
                        prose-headings:${textHeading} prose-headings:font-black prose-headings:tracking-tight
                        prose-h1:text-4xl prose-h1:border-b-2 ${theme==='dark'?'prose-h1:border-blue-500/30':'prose-h1:border-blue-400/30'} prose-h1:pb-6 prose-h1:mb-10
                        prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-8 prose-h2:text-transparent prose-h2:bg-clip-text prose-h2:bg-gradient-to-r prose-h2:from-blue-500 prose-h2:to-purple-500
                        prose-h3:text-2xl prose-h3:text-blue-500 prose-h3:mt-10 prose-h3:mb-6
                        prose-p:${textHeading} prose-p:opacity-95 prose-p:leading-loose prose-p:font-medium prose-p:text-lg
                        prose-a:text-blue-500 hover:prose-a:text-blue-400 prose-a:font-bold prose-a:no-underline hover:prose-a:underline
                        prose-strong:${textHeading} prose-strong:font-black
                        prose-ul:list-none prose-ul:pl-0 
                        prose-li:relative prose-li:pl-8 prose-li:my-4 prose-li:${textHeading} prose-li:opacity-95 prose-li:text-lg prose-li:font-medium
                        prose-li:before:content-['▹'] prose-li:before:absolute prose-li:before:left-0 prose-li:before:text-blue-500 prose-li:before:font-black prose-li:before:text-xl
                        prose-blockquote:border-l-4 prose-blockquote:border-blue-500 ${theme==='dark'?'prose-blockquote:bg-blue-500/10':'prose-blockquote:bg-blue-50'} 
                        prose-blockquote:py-6 prose-blockquote:px-8 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic prose-blockquote:${textHeading} prose-blockquote:font-semibold
                        prose-code:${theme==='dark'?'bg-slate-800':'bg-slate-100'} prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-blue-500 prose-code:font-bold
                      `}>
                        <ReactMarkdown>{report}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <footer className={`mt-20 pt-12 border-t-2 ${theme==='dark'?'border-slate-800':'border-slate-200'} pb-12 animate-fade-in`}>
            <div className="flex flex-col lg:flex-row justify-between items-start gap-12">
              <div className="max-w-2xl animate-slide-right">
                <div className="flex items-center gap-4 mb-6">
                  <ShieldAlert className="w-8 h-8 text-amber-500 animate-pulse" />
                  <h4 className={`${textHeading} font-black text-lg uppercase tracking-widest`}>
                    Regulatory Disclaimer
                  </h4>
                </div>
                <p className={`text-sm ${textMuted} font-semibold leading-relaxed`}>
                  <strong className="text-amber-500">Not SEBI Registered.</strong> AI-generated reports are for <strong>educational purposes only</strong>. 
                  Do not trade solely based on this data. AI may hallucinate or provide delayed information. 
                  We assume <strong>no liability</strong> for financial losses incurred.
                </p>
              </div>
              
              <div className="flex flex-col gap-5 min-w-[250px] animate-slide-left">
                <h4 className={`${textHeading} font-black text-lg uppercase tracking-widest mb-2`}>
                  Legal & Compliance
                </h4>
                <button onClick={() => setShowLegal(true)} className={`text-left text-sm font-black ${textMuted} hover:text-blue-500 transition-all flex items-center gap-3 group`}>
                  <FileText className="w-5 h-5 group-hover:scale-110 transition-transform"/> 
                  Privacy Policy
                </button>
                <button onClick={() => setShowLegal(true)} className={`text-left text-sm font-black ${textMuted} hover:text-blue-500 transition-all flex items-center gap-3 group`}>
                  <Scale className="w-5 h-5 group-hover:scale-110 transition-transform"/> 
                  Terms of Service
                </button>
              </div>
            </div>
            
            <div className={`mt-14 pt-8 border-t-2 ${theme==='dark'?'border-slate-800/60':'border-slate-200'} flex flex-col md:flex-row justify-between items-center gap-6`}>
              <p className={`text-sm font-black ${textMuted} uppercase tracking-widest`}>
                © {new Date().getFullYear()} AnalystPro | Developed by Jatin Kalra
              </p>
              
              {userTier === 'free' && (
                <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 text-sm font-black text-blue-500 hover:text-blue-400 transition-all ${theme==='dark'?'bg-blue-900/20 border-blue-500/20 hover:bg-blue-900/30':'bg-blue-50 border-blue-200 hover:bg-blue-100'} px-6 py-3 rounded-full border-2 hover:scale-105 active:scale-95`}>
                  <Coffee className="w-5 h-5 animate-bounce" /> 
                  Support Development
                </a>
              )}
            </div>
          </footer>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${theme==='dark'?'linear-gradient(180deg, #3b82f6, #8b5cf6)':'linear-gradient(180deg, #60a5fa, #a78bfa)'}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${theme==='dark'?'linear-gradient(180deg, #2563eb, #7c3aed)':'linear-gradient(180deg, #3b82f6, #8b5cf6)'}; }
        
        @keyframes blob { 
          0%, 100% { transform: translate(0px, 0px) scale(1) rotate(0deg); } 
          33% { transform: translate(80px, -80px) scale(1.15) rotate(120deg); } 
          66% { transform: translate(-60px, 60px) scale(0.95) rotate(240deg); } 
        }
        
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes gradient-slow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes float { 
          0%, 100% { transform: translateY(0px) rotate(0deg); } 
          50% { transform: translateY(-25px) rotate(5deg); } 
        }
        
        @keyframes pulse-slow { 
          0%, 100% { opacity: 1; transform: scale(1); } 
          50% { opacity: 0.6; transform: scale(0.98); } 
        }
        
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-left {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes slide-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-blob { animation: blob 15s ease-in-out infinite; }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 3s ease infinite; }
        .animate-gradient-slow { background-size: 200% 200%; animation: gradient-slow 8s ease infinite; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .animate-scale-in { animation: scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
        .animate-slide-down { animation: slide-down 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-up { animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-left { animation: slide-left 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-right { animation: slide-right 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-shake { animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
        .animate-spin-slow { animation: spin-slow 5s linear infinite; }
        .animate-fade-in-up { animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .animation-delay-150 { animation-delay: 150ms; }
        .animation-delay-200 { animation-delay: 200ms; }
        .animation-delay-400 { animation-delay: 400ms; }
        .animation-delay-600 { animation-delay: 600ms; }
        .animation-delay-1000 { animation-delay: 1000ms; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}} />
    </div>
  );
}
