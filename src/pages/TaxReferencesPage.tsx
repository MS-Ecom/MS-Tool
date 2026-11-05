import React, { useState, useEffect } from "react";
import {
  Receipt,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calculator,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { SalesTaxRecord, SyncStatus } from "../types";
import { api } from "../services/api";

export const TaxReferencesPage: React.FC = () => {
  const [records, setRecords] = useState<SalesTaxRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SyncStatus | null>(null);

  // Address Tester Tool
  const [testZip, setTestZip] = useState("10952");
  const [testCity, setTestCity] = useState("Monsey");
  const [testState, setTestState] = useState("NY");
  const [testResult, setTestResult] = useState<any>(null);

  const loadTaxData = async () => {
    try {
      setLoading(true);
      const res = await api.getTaxRecords({
        search,
        page,
        limit,
      });
      setRecords(res.records);
      setTotal(res.total);
      setStatus(res.status);
    } catch (err) {
      console.error("Failed to load tax database:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxData();
  }, [search, page]);

  const handleTestAddress = async () => {
    try {
      const res = await api.matchTax({
        address: "Test Destination Address",
        city: testCity,
        state: testState,
        zip: testZip,
      });
      setTestResult(res);
    } catch (err) {
      console.error("Test match error:", err);
    }
  };

  useEffect(() => {
    handleTestAddress();
  }, []);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Overview & Live Sync Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              Live Google Sheets Synchronization
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Total Records: {total.toLocaleString()}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Authoritative New York Sales Tax References
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Jurisdictions and tax rates synchronized directly from the 'Tax Database' worksheet. Tax is determined strictly by the Ship-To destination address.
          </p>
        </div>

        <a
          href="https://docs.google.com/spreadsheets/d/1mTxeBlnXvfPWBxWFkB17OD4XLa5XsRKwsflWdMvLZ2c"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors self-start md:self-auto"
        >
          <span>View Source Google Sheet</span>
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Interactive Address Tax Matcher Sandbox */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2">
          <Calculator size={18} className="text-amber-400" />
          <h3 className="font-bold text-sm text-white">
            Live Address Tax Jurisdiction Matcher (Verification Tool)
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Test and preview how customer delivery addresses resolve against the 1,789 synchronized New York tax records. Priority: 1. ZIP Code → 2. City & State → 3. County.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">ZIP Code</label>
            <input
              type="text"
              maxLength={5}
              value={testZip}
              onChange={(e) => setTestZip(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
              placeholder="e.g. 10001, 10952, 14201"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">City</label>
            <input
              type="text"
              value={testCity}
              onChange={(e) => setTestCity(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              placeholder="e.g. Manhattan, Monsey, Buffalo"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">State</label>
            <input
              type="text"
              value={testState}
              onChange={(e) => setTestState(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleTestAddress}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-lg transition-colors"
            >
              Test Match Resolution
            </button>
          </div>
        </div>

        {testResult && (
          <div className="bg-slate-800/80 border border-slate-700 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                Matched Jurisdiction & Method
              </span>
              <span className="font-bold text-amber-300 text-sm">
                {testResult.jurisdiction}
              </span>
              <span className="text-[11px] text-slate-400 ml-2">
                ({testResult.status})
              </span>
            </div>

            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                Authoritative Rate
              </span>
              <span className="text-xl font-black font-mono text-white">
                {(testResult.rate * 100).toFixed(3).replace(/\.?0+$/, "")}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tax Records Search & Pagination Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ZIP, City, or County..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-600">
          <span>
            Page <span className="font-bold text-slate-900">{page}</span> of{" "}
            <span className="font-bold text-slate-900">{totalPages}</span>
          </span>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tax Database Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="py-3 px-4 w-28">ZIP Code</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">County / Tax Jurisdiction</th>
                <th className="py-3 px-3 text-center w-20">State</th>
                <th className="py-3 px-4 text-right w-36">Sales Tax Rate</th>
                <th className="py-3 px-4 text-center w-32">Effective Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading tax records from database...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No tax records found matching "{search}".
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                      {r.zip}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {r.city}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{r.county}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-[10px] text-slate-700">
                        {r.state}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-amber-700 text-sm">
                      {r.rateDisplay}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                      {r.effectiveDate}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
