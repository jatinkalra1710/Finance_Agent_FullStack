import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Activity, Search, TrendingUp, AlertCircle, Building } from 'lucide-react';

const POPULAR_STOCKS = [
  { name: "Reliance Industries", ticker: "RELIANCE.NS" },
  { name: "HDFC Bank", ticker: "HDFCBANK.NS" },
  { name: "Tata Consultancy Services", ticker: "TCS.NS" },
  { name: "Zomato", ticker: "ZOMATO.NS" },
];

export default function App() {
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!ticker) return;

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      // Pulls the backend URL from Netlify's environment variables, defaults to localhost
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      
      const response = await fetch(`${backendUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticker: ticker.toUpperCase(), 
          company_name: companyName || ticker 
        }),
      });

      if (!response.ok) throw new Error('Analysis failed. Check backend logs.');
      
      const data = await response.json();
      setReport(data.report);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Activity className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Stock Analyst Pro</h1>
            <p className="text-slate-500 text-sm">Institutional-Grade Analysis via Multi-Agent AI</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Analyze Stock
            </h2>
            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="e.g., RELIANCE.NS"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !ticker}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex justify-center items-center gap-2"
              >
                {loading ? <span className="animate-pulse">Agents Thinking...</span> : <>Generate Memo <TrendingUp className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        </div>

        <div className="md:col-span-2">
          {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl flex gap-3 mb-6"><AlertCircle />{error}</div>}
          {loading && (
            <div className="bg-white p-12 rounded-xl text-center shadow-sm border">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
              <h3 className="text-lg font-medium">Orchestrating AI Analysis...</h3>
            </div>
          )}
          {report && !loading && (
            <div className="bg-white p-8 rounded-xl shadow-sm border prose prose-slate max-w-none prose-a:text-blue-600">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}