import React, { useState, useEffect } from "react";
import {
  FileText,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertOctagon,
  TrendingUp,
  FilePlus2,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  Layers,
} from "lucide-react";
import { api } from "../services/api";
import { User, ActivityLog } from "../types";

interface DashboardPageProps {
  onNavigateToNewQuote: () => void;
  onNavigateToQuotes: () => void;
  onViewQuote: (quoteId: string) => void;
  currentUser: User | null;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToNewQuote,
  onNavigateToQuotes,
  onViewQuote,
  currentUser,
}) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load dashboard statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading operational metrics...</p>
        </div>
      </div>
    );
  }

  const monthlyEntries = Object.entries(stats?.monthlyData || {}) as [
    string,
    { count: number; value: number }
  ][];

  const packageEntries = Object.entries(stats?.packageDist || {}) as [string, number][];
  const statusEntries = Object.entries(stats?.statusDist || {}) as [string, number][];

  // Helper for max values in charts
  const maxMonthCount = Math.max(...monthlyEntries.map(([_, v]) => v.count), 1);
  const maxMonthValue = Math.max(...monthlyEntries.map(([_, v]) => v.value), 100);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
            Operational Overview
          </span>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">
            Welcome back, {currentUser?.name || "Representative"}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
            Live metrics aggregated directly from actual database records. Authoritative 180-day delivery rules and New York sales tax references are active.
          </p>
        </div>

        <button
          onClick={onNavigateToNewQuote}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <FilePlus2 size={16} />
          <span>New EW Quote</span>
        </button>
      </div>

      {/* Summary KPI Cards (Requirement 4) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Quotes */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Quotes
            </span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {stats?.totalQuotes ?? 0}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">All database versions</p>
        </div>

        {/* This Month */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              This Month
            </span>
            <Calendar size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {stats?.quotesThisMonth ?? 0}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Created in current month</p>
        </div>

        {/* Total Sales Value */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              EW Sales Value
            </span>
            <DollarSign size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            ${(stats?.totalSalesValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Cumulative quotations</p>
        </div>

        {/* Saved Quotes */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Saved Quotes
            </span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700 font-mono">
            {stats?.savedQuotes ?? 0}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Confirmed & ready</p>
        </div>

        {/* Pending Verification */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pending Quotes
            </span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700 font-mono">
            {stats?.pendingQuotes ?? 0}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Tax review or drafts</p>
        </div>

        {/* Ineligible / Expired */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Ineligible Orders
            </span>
            <AlertOctagon size={16} className="text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-700 font-mono">
            {stats?.ineligibleOrders ?? 0}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">&gt; 180 days from ship</p>
        </div>
      </div>

      {/* Charts Grid (Requirement 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: EW Quotes Generated by Month */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                EW Quotes Generated by Month
              </h3>
              <p className="text-xs text-slate-500">Volume trend over the last 6 months</p>
            </div>
            <TrendingUp size={16} className="text-slate-400" />
          </div>

          <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
            {monthlyEntries.map(([monthKey, val]) => {
              const heightPercent = Math.max(8, (val.count / maxMonthCount) * 100);
              return (
                <div key={monthKey} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-bold font-mono text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    {val.count}
                  </span>
                  <div className="w-full bg-slate-100 rounded-t-lg h-36 flex items-end overflow-hidden">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-gradient-to-t from-slate-900 to-amber-500 rounded-t-md transition-all duration-500"
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 truncate w-full text-center">
                    {monthKey.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: EW Quote Value by Month */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                EW Quotation Value by Month ($)
              </h3>
              <p className="text-xs text-slate-500">Total dollar value of extended warranty quotes</p>
            </div>
            <DollarSign size={16} className="text-slate-400" />
          </div>

          <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
            {monthlyEntries.map(([monthKey, val]) => {
              const heightPercent = Math.max(8, (val.value / maxMonthValue) * 100);
              return (
                <div key={monthKey} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-bold font-mono text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${Math.round(val.value)}
                  </span>
                  <div className="w-full bg-slate-100 rounded-t-lg h-36 flex items-end overflow-hidden">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-gradient-to-t from-emerald-700 to-emerald-500 rounded-t-md transition-all duration-500"
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 truncate w-full text-center">
                    {monthKey.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 3: EW Package Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                EW Package Distribution
              </h3>
              <p className="text-xs text-slate-500">Breakdown of plans selected across quotes</p>
            </div>
            <ShieldCheck size={16} className="text-slate-400" />
          </div>

          <div className="space-y-3 pt-2">
            {packageEntries.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No package distribution data yet.</p>
            ) : (
              packageEntries.map(([pkgName, count]) => {
                const total = stats?.totalQuotes || 1;
                const percent = Math.round((count / total) * 100);
                return (
                  <div key={pkgName} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate max-w-xs">{pkgName}</span>
                      <span className="font-mono text-slate-500">
                        {count} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full bg-amber-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chart 4: Quote Status / Conversion Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Quote Status & Conversion Distribution
              </h3>
              <p className="text-xs text-slate-500">Current workflow states of quotations</p>
            </div>
            <Activity size={16} className="text-slate-400" />
          </div>

          <div className="space-y-3 pt-2">
            {statusEntries.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No quotes recorded yet.</p>
            ) : (
              statusEntries.map(([statusName, count]) => {
                const total = stats?.totalQuotes || 1;
                const percent = Math.round((count / total) * 100);
                const color =
                  statusName === "Saved" || statusName === "Accepted"
                    ? "bg-emerald-500"
                    : statusName === "Pending Verification"
                    ? "bg-amber-500"
                    : statusName === "Draft"
                    ? "bg-slate-400"
                    : "bg-red-500";

                return (
                  <div key={statusName} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{statusName}</span>
                      <span className="font-mono text-slate-500">
                        {count} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className={`h-full ${color} rounded-full`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Table (Requirement 4) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Recent Activity Stream</h3>
            <p className="text-xs text-slate-500">
              Latest operational, quotation, and administrative events
            </p>
          </div>
          <button
            onClick={onNavigateToQuotes}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center space-x-1"
          >
            <span>View All Quotes</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">EWQ Number</th>
                <th className="py-2.5 px-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(stats?.recentActivity || []).map((act: ActivityLog) => (
                <tr key={act.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 text-slate-500 font-mono whitespace-nowrap">
                    {new Date(act.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                    {act.user}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-block bg-slate-100 text-slate-800 font-medium px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                      {act.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-medium text-amber-700 whitespace-nowrap">
                    {act.relatedEWQ ? (
                      <span className="font-bold">{act.relatedEWQ}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-md truncate">
                    {act.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
