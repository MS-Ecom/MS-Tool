import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  FileText,
  Printer,
  Copy,
  Clock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  History,
  X,
} from "lucide-react";
import { EWQuote, User } from "../types";
import { api } from "../services/api";
import { QuotePrintModal } from "../components/QuotePrintModal";

interface QuotesListPageProps {
  currentUser: User | null;
  onNavigateToNewQuote: () => void;
  selectedQuoteId?: string | null;
}

export const QuotesListPage: React.FC<QuotesListPageProps> = ({
  currentUser,
  onNavigateToNewQuote,
  selectedQuoteId,
}) => {
  const [quotes, setQuotes] = useState<EWQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [taxExemptFilter, setTaxExemptFilter] = useState("ALL");
  const [salesRepFilter, setSalesRepFilter] = useState("ALL");

  // Modals & Detail
  const [activeQuote, setActiveQuote] = useState<EWQuote | null>(null);
  const [printQuote, setPrintQuote] = useState<EWQuote | null>(null);
  const [historyQuote, setHistoryQuote] = useState<EWQuote | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const data = await api.getQuotes({
        search,
        status: statusFilter,
        taxExempt: taxExemptFilter,
        salesRep: salesRepFilter,
      });
      setQuotes(data);

      if (selectedQuoteId) {
        const found = data.find((q) => q.id === selectedQuoteId);
        if (found) setActiveQuote(found);
      }
    } catch (err) {
      console.error("Failed to load quotes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, [search, statusFilter, taxExemptFilter, salesRepFilter, selectedQuoteId]);

  const handleDuplicateVersion = async (quote: EWQuote) => {
    if (
      window.confirm(
        `Create a new version of quotation ${quote.ewqNumber}? This will preserve version ${quote.version} and create version ${quote.version + 1}.`
      )
    ) {
      try {
        const newVersion = await api.createNewQuoteVersion(quote.id);
        alert(`Created version ${newVersion.version} of ${newVersion.ewqNumber}`);
        loadQuotes();
        setActiveQuote(newVersion);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to duplicate quote");
      }
    }
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      const updated = await api.updateQuoteStatus(quoteId, newStatus);
      setQuotes((prev) => prev.map((q) => (q.id === quoteId ? updated : q)));
      if (activeQuote?.id === quoteId) setActiveQuote(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleViewHistory = async (quote: EWQuote) => {
    setHistoryQuote(quote);
    try {
      const history = await api.getQuoteHistory(quote.id);
      setHistoryLogs(history);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const salesRepOptions = Array.from(new Set(quotes.map((q) => q.salesRep))).filter(Boolean);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Search / Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Extended Warranty Quotations
            </h2>
            <p className="text-xs text-slate-500">
              Browse, filter, print, and manage all saved operational quotes
            </p>
          </div>

          <button
            onClick={onNavigateToNewQuote}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            + Create New Quote
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search EWQ#, SO#, Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Saved">Saved</option>
              <option value="Draft">Draft</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Accepted">Accepted</option>
              <option value="Declined">Declined</option>
            </select>
          </div>

          {/* Tax Exempt Filter */}
          <div>
            <select
              value={taxExemptFilter}
              onChange={(e) => setTaxExemptFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Tax Treatments</option>
              <option value="false">Standard Tax Applied</option>
              <option value="true">Tax Exempt Requests</option>
            </select>
          </div>

          {/* Sales Rep Filter */}
          <div>
            <select
              value={salesRepFilter}
              onChange={(e) => setSalesRepFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Sales Reps</option>
              {salesRepOptions.map((rep) => (
                <option key={rep} value={rep}>
                  {rep}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quotations Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="py-3 px-4">EWQ Number</th>
                <th className="py-3 px-3 text-center">Version</th>
                <th className="py-3 px-3">SO #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3">Ship Date</th>
                <th className="py-3 px-4">Selected Package</th>
                <th className="py-3 px-3 text-right">EW Price</th>
                <th className="py-3 px-3 text-right">Customer Total</th>
                <th className="py-3 px-3 text-center">Tax Status</th>
                <th className="py-3 px-3 text-center">Quote Status</th>
                <th className="py-3 px-3">Sales Rep</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500">
                    Loading quotation records...
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No quotation records match criteria.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Create a new quotation using the button above.
                    </p>
                  </td>
                </tr>
              ) : (
                quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {q.ewqNumber}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-600">
                      v{q.version}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">{q.soNumber}</td>
                    <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                      <div>{q.customer.name}</div>
                      <div className="text-[10px] text-slate-400">{q.customer.phone}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{q.shipDate}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                      {q.selectedPackage?.packageName || "—"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                      ${q.totals.ewPackagePrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-700">
                      ${q.totals.finalCustomerTotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {q.taxInfo.taxExempt ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            q.taxInfo.taxExemptionStatus === "Approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : q.taxInfo.taxExemptionStatus === "Rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {q.taxInfo.taxExemptionStatus}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Standard</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          q.status === "Saved" || q.status === "Accepted"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : q.status === "Pending Verification"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : q.status === "Draft"
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{q.salesRep}</td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => setActiveQuote(q)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          onClick={() => setPrintQuote(q)}
                          className="p-1.5 text-slate-500 hover:text-amber-700 rounded hover:bg-slate-100 transition-colors"
                          title="Print / PDF Export"
                        >
                          <Printer size={15} />
                        </button>

                        <button
                          onClick={() => handleDuplicateVersion(q)}
                          className="p-1.5 text-slate-500 hover:text-blue-700 rounded hover:bg-slate-100 transition-colors"
                          title="Create New Version"
                        >
                          <Copy size={15} />
                        </button>

                        <button
                          onClick={() => handleViewHistory(q)}
                          className="p-1.5 text-slate-500 hover:text-purple-700 rounded hover:bg-slate-100 transition-colors"
                          title="Calculation History"
                        >
                          <History size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quote Detail Drawer / Modal */}
      {activeQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-400 font-mono font-bold uppercase">
                  {activeQuote.ewqNumber} • Version {activeQuote.version}
                </span>
                <h3 className="font-bold text-base text-white">Quotation Details</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPrintQuote(activeQuote)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1"
                >
                  <Printer size={14} />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setActiveQuote(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Status & Change Status */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px]">Current Status:</span>
                  <span className="font-bold text-slate-900">{activeQuote.status}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">Update to:</span>
                  {["Saved", "Accepted", "Declined"].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(activeQuote.id, st)}
                      disabled={activeQuote.status === st}
                      className="px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer & Shipping */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block uppercase text-[10px] text-slate-500">
                    Customer Information
                  </span>
                  <p className="font-semibold text-slate-900">{activeQuote.customer.name}</p>
                  <p className="text-slate-600">{activeQuote.customer.phone}</p>
                  {activeQuote.customer.email && <p className="text-slate-600">{activeQuote.customer.email}</p>}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block uppercase text-[10px] text-slate-500">
                    Shipping & Delivery
                  </span>
                  <p className="font-semibold text-slate-900">SO #{activeQuote.soNumber}</p>
                  <p className="text-slate-600">Ship Date: {activeQuote.shipDate}</p>
                  <p className="text-slate-600">{activeQuote.shipping.address}, {activeQuote.shipping.city}, {activeQuote.shipping.state} {activeQuote.shipping.zip}</p>
                </div>
              </div>

              {/* Items Covered */}
              <div>
                <span className="font-bold text-slate-900 block uppercase text-[10px] text-slate-500 mb-2">
                  Covered Items ({activeQuote.items.filter((i) => i.ewSelected).length})
                </span>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Model</th>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeQuote.items
                        .filter((i) => i.ewSelected)
                        .map((it) => (
                          <tr key={it.id}>
                            <td className="py-1.5 px-3 font-mono font-medium">{it.model}</td>
                            <td className="py-1.5 px-3 text-slate-600">{it.description}</td>
                            <td className="py-1.5 px-3 text-right font-mono">${it.unitPrice.toFixed(2)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 block uppercase text-[10px] text-slate-500 mb-1">
                  Calculation Breakdown
                </span>
                <div className="flex justify-between">
                  <span>Selected Package:</span>
                  <span className="font-semibold text-slate-900">{activeQuote.selectedPackage?.packageName}</span>
                </div>
                <div className="flex justify-between">
                  <span>EW Base Price:</span>
                  <span className="font-mono text-slate-900">${activeQuote.totals.ewPackagePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sales Tax:</span>
                  <span className="font-mono text-slate-900">${activeQuote.totals.salesTax.toFixed(2)}</span>
                </div>
                {activeQuote.surcharge.enabled && (
                  <div className="flex justify-between">
                    <span>Credit Card Surcharge:</span>
                    <span className="font-mono text-slate-900">${activeQuote.totals.surcharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-300 pt-1.5 flex justify-between font-bold text-sm text-slate-950">
                  <span>Final Customer Total:</span>
                  <span className="font-mono text-amber-700">${activeQuote.totals.finalCustomerTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calculation History Modal */}
      {historyQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col text-xs">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-400 font-mono font-bold uppercase">
                  Audit History
                </span>
                <h3 className="font-bold text-sm text-white">
                  Calculation History for {historyQuote.ewqNumber}
                </h3>
              </div>
              <button
                onClick={() => setHistoryQuote(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {historyLogs.length === 0 ? (
                <p className="text-slate-400 italic">No historical calculation snapshots recorded.</p>
              ) : (
                historyLogs.map((h) => (
                  <div key={h.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-slate-500 font-mono text-[10px]">
                      <span>{new Date(h.timestamp).toLocaleString()}</span>
                      <span className="font-bold text-slate-700">v{h.version}</span>
                    </div>
                    <p className="font-medium text-slate-900">
                      Calculated by {h.calculatedBy}
                    </p>
                    <div className="pt-1 flex justify-between font-mono text-slate-700">
                      <span>Total: ${h.resultSummary.finalCustomerTotal?.toFixed(2)}</span>
                      <span>Ref: {h.referenceVersion}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print / PDF Modal */}
      {printQuote && (
        <QuotePrintModal quote={printQuote} onClose={() => setPrintQuote(null)} />
      )}
    </div>
  );
};
