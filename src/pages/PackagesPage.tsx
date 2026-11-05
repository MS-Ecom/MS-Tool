import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Filter,
} from "lucide-react";
import { EWPackageRecord, SyncStatus, User } from "../types";
import { api } from "../services/api";

interface PackagesPageProps {
  currentUser: User | null;
}

export const PackagesPage: React.FC<PackagesPageProps> = ({ currentUser }) => {
  const [packages, setPackages] = useState<EWPackageRecord[]>([]);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [coverageFilter, setCoverageFilter] = useState<number | "ALL">("ALL");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getPackages();
      setPackages(res.packages);
      setStatus(res.status);
    } catch (err) {
      console.error("Failed to load packages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      const newStatus = await api.syncSpreadsheet();
      setStatus(newStatus);
      await loadData();
      alert(`Synchronized successfully! Reference version: ${newStatus.version}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const filtered = packages.filter((pkg) => {
    const matchesSearch =
      pkg.sku.toLowerCase().includes(search.toLowerCase()) ||
      pkg.packageName.toLowerCase().includes(search.toLowerCase()) ||
      pkg.itemPriceRange.includes(search);
    const matchesCoverage =
      coverageFilter === "ALL" ? true : pkg.itemCoverage === coverageFilter;
    return matchesSearch && matchesCoverage;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Synchronization Status Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full ${
                status?.status === "success"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              <CheckCircle2 size={13} className="mr-1" />
              {status?.status === "success" ? "Synchronized with Google Sheets" : "Stale Cache"}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Version: {status?.version}
            </span>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Authoritative Extended Warranty Packages
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Last successful sync: {status?.lastSyncTimestamp ? new Date(status.lastSyncTimestamp).toLocaleString() : "N/A"}. Total {packages.length} package tiers loaded.
          </p>

          <a
            href={status?.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 mt-2"
          >
            <span>Inspect Authoritative Google Spreadsheet</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {currentUser?.role === "admin" && (
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center space-x-2 self-start md:self-auto disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin text-amber-400" : "text-amber-400"} />
            <span>{isSyncing ? "Fetching from Sheets..." : "Sync From Google Sheets"}</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, Package Name, Price Range..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          {[
            { label: "All Packages", val: "ALL" },
            { label: "1 Appliance", val: 1 },
            { label: "2 Appliances", val: 2 },
            { label: "3 Appliances", val: 3 },
            { label: "4 Appliances", val: 4 },
          ].map((tab) => (
            <button
              key={String(tab.val)}
              onClick={() => setCoverageFilter(tab.val as any)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                coverageFilter === tab.val
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Packages Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-3 text-center">Appliance Count</th>
                <th className="py-3 px-4">Package Name</th>
                <th className="py-3 px-4">Item Price Range</th>
                <th className="py-3 px-3 text-right">Min Price</th>
                <th className="py-3 px-3 text-right">Max Price</th>
                <th className="py-3 px-4 text-right">Warranty Price</th>
                <th className="py-3 px-4">Coverage Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading package reference tiers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    No packages match your search filter.
                  </td>
                </tr>
              ) : (
                filtered.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {pkg.sku}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block bg-slate-100 font-bold px-2 py-0.5 rounded text-[11px] text-slate-800">
                        {pkg.itemCoverage} Unit{pkg.itemCoverage > 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {pkg.packageName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono whitespace-nowrap">
                      {pkg.itemPriceRange}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      ${pkg.minItemPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      ${pkg.maxItemPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-amber-700 text-sm whitespace-nowrap">
                      ${pkg.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {pkg.coveragePeriod} • {pkg.eligibleCategories.join(", ")}
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
