import React, { useState, useEffect } from "react";
import {
  History,
  Search,
  Filter,
  ShieldAlert,
  FileText,
  UserCheck,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { ActivityLog } from "../types";
import { api } from "../services/api";

export const ActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getActivityLogs({
        search,
        user: userFilter,
        action: actionFilter,
      });
      setLogs(data);
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [search, userFilter, actionFilter]);

  const userOptions = Array.from(new Set(logs.map((l) => l.user))).filter(Boolean);
  const actionOptions = Array.from(new Set(logs.map((l) => l.action))).filter(Boolean);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full uppercase">
              Compliance Audit Trail
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Immutable Records
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            System Activity & Audit Logs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Every quotation calculation, tax exemption review, administrative override, and reference synchronization is permanently logged with user, timestamp, and before/after states.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center space-x-1.5 self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, EWQ#, SO#, user, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">All Users</option>
            {userOptions.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">All Activity Types</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="py-3 px-4 w-44">Date & Time</th>
                <th className="py-3 px-3 w-40">User & Role</th>
                <th className="py-3 px-3 w-44">Action</th>
                <th className="py-3 px-3 w-28">Related EWQ</th>
                <th className="py-3 px-3 w-24">SO #</th>
                <th className="py-3 px-4">Description & Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading activity records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No activity logs match the selected filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{log.user}</div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {log.userRole?.replace("_", " ")}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-block bg-slate-100 text-slate-800 font-medium px-2 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-amber-700 whitespace-nowrap">
                      {log.relatedEWQ || "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {log.relatedSO || "—"}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 max-w-xl">
                      <div>{log.description}</div>
                      {log.oldValue && log.newValue && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          Old: <span className="text-red-500">{log.oldValue}</span> → New:{" "}
                          <span className="text-emerald-600">{log.newValue}</span>
                        </div>
                      )}
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
