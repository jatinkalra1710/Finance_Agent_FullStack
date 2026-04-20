import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Activity, Search, TrendingUp, AlertCircle, ShieldAlert, BarChart3, Clock, CheckCircle2, Coffee, X, FileText, Scale, Sparkles, Download } from 'lucide-react';
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
  
  const [showPopup, setShowPopup] = useState(true);
  const [showLegal, setShowLegal] = useState(false);
  
  // Simulated Loading Steps for better UX
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < 5 ? prev + 1 : prev));
      }, 12000); // Progress steps every 12 seconds
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col relative overflow-x-hidden">
      
      {/* Background Animated Blobs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-40 -left-40 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
      </div>

      {/* --- Unignorable "Buy Me a Tea" Popup --- */}
      {showPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in-up border border-slate-100 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
            <button onClick={() => setShowPopup(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-4 rounded-2xl border border-amber-200 shadow-inner relative">
                <Sparkles className="absolute -top-2 -right-2 text-amber-500 w-5 h-5 animate-pulse" />
                <Coffee className="w-10 h-10 text-amber-600" />
              </div>
            </div>
            
            <h2 className="text-2xl font-extrabold text-center text-slate-800 mb-3 tracking-tight">Welcome to AI Analyst Pro</h2>
            <p className="text-center text-slate-600 mb-8 leading-relaxed text-sm">
              This platform uses 7 advanced AI agents to give you institutional-grade stock analysis for free. Running these servers costs real money. If this tool helps you make better trades, consider fueling the dev! ☕
            </p>
            
            <div className="flex flex-col gap-3">
              <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" onClick={() => setShowPopup(false)}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-amber-500/30 flex justify-center items-center gap-2 hover:-translate-y-0.5"
              >
                <Coffee className="w-5 h-5" /> Buy me a Tea
              </a>
              <button onClick={() => setShowPopup(false)} className="w-full text-slate-500 hover:text-slate-800 font-semibold py-3 px-4 rounded-xl transition-colors text-sm">
                Continue to platform
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Legal Modal (Required for AdSense) --- */}
      {showLegal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h2 className="text-xl font-bold flex items-center gap-2"><Scale className="text-blue-600 w-5 h-5"/> Terms & Privacy Policy</h2>
              <button onClick={() => setShowLegal(false)} className="p-1 hover:bg-slate-200 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar prose prose-sm text-slate-600">
              <h3>Terms of Service</h3>
              <p>By using AI Stock Analyst Pro, you agree that the information provided is for educational purposes only. We are not SEBI registered financial advisors. The AI-generated reports should not be considered financial advice. You are solely responsible for your own investment decisions.</p>
              <h3>Privacy Policy</h3>
              <p>We do not store your personal search history or financial data on our servers. The stock tickers you search are sent securely to our backend to generate the report and are immediately discarded. We use third-party services (like Google AdSense) which may use cookies to serve personalized ads based on your visit to this and other websites.</p>
              <h3>Google AdSense Disclaimer</h3>
              <p>Third party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites. Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet.</p>
            </div>
          </div>
        </div>
      )}

      {/* --- Premium Header --- */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
              <Activity className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                AI Stock Analyst <span className="text-blue-600">Pro</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">7-Agent Intelligence Engine</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              API Online
            </div>
            <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-amber-900 px-5 py-2 rounded-full font-bold text-sm transition-all shadow-sm hover:shadow border border-amber-300">
              <Coffee className="w-4 h-4" /> <span className="hidden sm:inline">Support Project</span>
            </a>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative z-10">
        
        {/* Controls Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <h2 className="font-bold text-lg mb-5 flex items-center gap-2 text-slate-800">
                <Search className="w-5 h-5 text-blue-600" /> Target Asset
              </h2>
              <form onSubmit={handleAnalyze} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Enter Ticker (e.g., RELIANCE.NS)"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all font-semibold text-slate-700"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-2 ml-1 font-medium">Requires .NS (NSE) or .BO (BSE) suffix.</p>
                </div>
                
                <button type="submit" disabled={loading || !ticker} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 hover:-translate-y-0.5">
                  {loading ? <><Activity className="w-5 h-5 animate-spin" /> Orchestrating AI...</> : <><TrendingUp className="w-5 h-5" /> Generate Memo</>}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <h2 className="font-bold text-lg mb-5 flex items-center gap-2 text-slate-800">
              <BarChart3 className="w-5 h-5 text-blue-600" /> Quick Select Indices
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {POPULAR_STOCKS.map((stock) => (
                <button key={stock.ticker} onClick={() => handleSelectPopular(stock)} className={`text-left px-5 py-4 rounded-2xl border transition-all duration-200 ${ticker === stock.ticker ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 shadow-inner' : 'border-slate-200 hover:border-blue-300 hover:bg-white hover:shadow-sm'}`}>
                  <div className="font-bold text-slate-800 text-sm truncate">{stock.name}</div>
                  <div className="text-slate-500 text-xs font-medium mt-1">{stock.ticker}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Display Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className={`${report || loading ? 'lg:col-span-5' : 'lg:col-span-12'} transition-all duration-500 ease-in-out`}>
            <div className="bg-white p-2 rounded-3xl shadow-sm border border-slate-200 h-[800px] overflow-hidden group hover:shadow-md transition-shadow">
              <AdvancedRealTimeChart theme="light" symbol={getTradingViewSymbol(ticker)} autosize allow_symbol_change={false} hide_side_toolbar={false} />
            </div>
          </div>

          {(loading || report || error) && (
            <div className="lg:col-span-7 flex flex-col h-[800px] animate-fade-in-up">
              
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-5 rounded-2xl flex items-start gap-3 shadow-sm mb-6">
                  <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-lg">Analysis Interrupted</h3>
                    <p className="text-sm mt-1 font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* --- ADVANCED AD-READY LOADING STATE --- */}
              {loading && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex-grow flex flex-col relative overflow-hidden h-full">
                  
                  {/* Top: AI Orchestration UI */}
                  <div className="h-1/2 flex flex-col justify-center p-10 border-b border-slate-100 relative bg-slate-900 overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="absolute top-0 right-0 p-4"><div className="animate-pulse flex space-x-1"><div className="h-2 w-2 bg-blue-500 rounded-full"></div><div className="h-2 w-2 bg-blue-500 rounded-full delay-75"></div><div className="h-2 w-2 bg-blue-500 rounded-full delay-150"></div></div></div>
                    
                    <h3 className="text-2xl font-bold text-white mb-6 relative z-10 flex items-center gap-3">
                      <Activity className="text-blue-400 animate-spin-slow" /> Agent Protocol Initiated
                    </h3>
                    
                    <div className="space-y-4 relative z-10">
                      <div className={`flex items-center gap-3 text-sm font-medium transition-all duration-500 ${loadingStep >= 0 ? 'text-blue-400' : 'text-slate-600'}`}>
                        {loadingStep > 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Clock className="w-5 h-5 animate-spin" />}
                        1. Establishing secure YFinance connection...
                      </div>
                      <div className={`flex items-center gap-3 text-sm font-medium transition-all duration-500 ${loadingStep >= 1 ? 'text-blue-400' : 'text-slate-600'}`}>
                        {loadingStep > 1 ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : (loadingStep === 1 ? <Clock className="w-5 h-5 animate-spin" /> : <div className="w-5 h-5 border-2 border-slate-600 rounded-full"></div>)}
                        2. Sector Analyst scanning global news events...
                      </div>
                      <div className={`flex items-center gap-3 text-sm font-medium transition-all duration-500 ${loadingStep >= 2 ? 'text-blue-400' : 'text-slate-600'}`}>
                        {loadingStep > 2 ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : (loadingStep === 2 ? <Clock className="w-5 h-5 animate-spin" /> : <div className="w-5 h-5 border-2 border-slate-600 rounded-full"></div>)}
                        3. Quant Agent calculating fundamental ratios...
                      </div>
                      <div className={`flex items-center gap-3 text-sm font-medium transition-all duration-500 ${loadingStep >= 3 ? 'text-blue-400' : 'text-slate-600'}`}>
                        {loadingStep > 3 ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : (loadingStep === 3 ? <Clock className="w-5 h-5 animate-spin" /> : <div className="w-5 h-5 border-2 border-slate-600 rounded-full"></div>)}
                        4. Strategist generating institutional memo...
                      </div>
                    </div>
                  </div>

                  {/* Bottom: AdSense Block */}
                  <div className="h-1/2 bg-slate-50 p-6 flex flex-col items-center justify-center relative">
                    <span className="absolute top-4 left-6 text-[10px] text-slate-400 uppercase tracking-widest font-bold">Advertisement</span>
                    
                    {/* >>> GOOGLE ADSENSE SCRIPT GOES HERE <<< */}
                    <div className="w-full max-w-[336px] h-[280px] bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center relative hover:border-slate-300 transition-colors">
                      <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-slate-400 text-sm font-medium">Google AdSense Space</p>
                      
                      {/* PASTE YOUR ADSENSE <ins> TAG HERE IN THE FUTURE */}
                    </div>
                  </div>

                </div>
              )}

              {/* --- REPORT STATE --- */}
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
                    <button className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-full transition-colors border border-slate-200 hover:border-blue-200">
                      <Download className="w-3 h-3" /> Save PDF (Beta)
                    </button>
                  </div>

                  <div className="prose prose-slate prose-lg max-w-none 
                    prose-headings:text-slate-900 prose-headings:font-extrabold tracking-tight
                    prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-4 prose-h2:mt-10 prose-h2:text-2xl
                    prose-h3:text-xl prose-h3:text-blue-700 prose-h3:mt-8
                    prose-p:text-slate-600 prose-p:leading-loose prose-p:font-medium
                    prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-slate-900 prose-strong:font-bold
                    prose-ul:list-disc prose-li:my-2 prose-li:text-slate-600
                    prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-gradient-to-r prose-blockquote:from-blue-50/50 prose-blockquote:to-transparent prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:text-slate-700 prose-blockquote:font-medium">
                    <ReactMarkdown>{report}</ReactMarkdown>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>

      {/* --- Legal & Compliance Footer --- */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0" />
                <h4 className="text-slate-200 font-bold uppercase tracking-widest text-sm">Regulatory Disclaimer</h4>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 font-medium">
                Not SEBI Registered. This system is NOT registered with the Securities and Exchange Board of India (SEBI) as an Investment Advisor. 
                Reports are generated by Artificial Intelligence (CrewAI & Google Gemini). Data may be delayed or hallucinated. 
                This platform is for educational purposes only. Always consult a certified financial advisor before trading.
              </p>
            </div>
            <div className="flex flex-col gap-3 min-w-[200px]">
              <h4 className="text-slate-200 font-bold uppercase tracking-widest text-sm mb-1">Legal</h4>
              <button onClick={() => setShowLegal(true)} className="text-left text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                <FileText className="w-3 h-3" /> Privacy Policy
              </button>
              <button onClick={() => setShowLegal(true)} className="text-left text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                <Scale className="w-3 h-3" /> Terms of Service
              </button>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs font-medium">© {new Date().getFullYear()} AI Stock Analyst Pro | Developed by Jatin Kalra</p>
            <a href="https://www.chai4.me/jatinkalra" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-2 font-bold text-xs bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20">
              <Coffee className="w-4 h-4" /> Support Developer
            </a>
          </div>
        </div>
      </footer>
      
      {/* Launch Animations CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
        
        .animate-spin-slow { animation: spin 3s linear infinite; }
      `}} />
    </div>
  );
}
