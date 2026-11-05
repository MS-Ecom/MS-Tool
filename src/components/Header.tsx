import React, { useState } from "react";
import {
  RefreshCw,
  UserCheck,
  Shield,
  FilePlus2,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { User, SyncStatus } from "../types";
import { NavTab } from "./Sidebar";

interface HeaderProps {
  currentTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  currentUser: User | null;
  allUsers: User[];
  onSwitchUser: (userId: string) => void;
  syncStatus: SyncStatus | null;
  onRefreshSync?: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  currentUser,
  allUsers,
  onSwitchUser,
  syncStatus,
  onRefreshSync,
  isSyncing,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: "Quotation Operations Dashboard",
      subtitle: "Overview of actual Extended Warranty quotations, conversions, and metrics",
    },
    "new-quote": {
      title: "New Extended Warranty Quotation",
      subtitle: "Create or extract quotation from Sales Order with 180-day eligibility rules",
    },
    quotes: {
      title: "EW Quotations Management",
      subtitle: "Search, filter, view version history, and manage saved quotations",
    },
    packages: {
      title: "Authoritative EW Packages",
      subtitle: "Synchronized pricing tiers and warranty packages from authoritative Google Sheet",
    },
    tax: {
      title: "Sales Tax Reference Database",
      subtitle: "Authoritative New York state, county, and city tax rates synchronized from Google Sheet",
    },
    settings: {
      title: "System & Rule Configuration",
      subtitle: "Manage 180-day eligibility period, credit card surcharge, and user permissions",
    },
    logs: {
      title: "System Activity & Audit Logs",
      subtitle: "Immutable audit trail of all quotation, tax exemption, and administrative actions",
    },
  };

  const currentMeta = titles[currentTab] || { title: "MS Appliances", subtitle: "" };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-10 shadow-xs">
      {/* Title & Breadcrumb */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
          <span>MS Appliances</span>
          <span>/</span>
          <span className="text-slate-500">{currentMeta.title}</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">
          {currentMeta.title}
        </h1>
        <p className="text-xs text-slate-500 hidden sm:block">
          {currentMeta.subtitle}
        </p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3 shrink-0">
        {/* Google Sheets Sync Pill */}
        <div className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs transition-colors">
          <div
            className={`w-2 h-2 rounded-full ${
              syncStatus?.status === "success"
                ? "bg-emerald-500 animate-pulse"
                : syncStatus?.status === "stale"
                ? "bg-amber-500"
                : "bg-red-500"
            }`}
          />
          <span className="text-slate-700 font-medium">
            Sheets: {syncStatus?.status === "success" ? "Live Synced" : "Stale"}
          </span>
          {onRefreshSync && currentUser?.role === "admin" && (
            <button
              onClick={onRefreshSync}
              disabled={isSyncing}
              className="text-slate-500 hover:text-slate-900 ml-1 p-0.5 rounded transition-transform"
              title="Sync reference data now"
            >
              <RefreshCw size={13} className={isSyncing ? "animate-spin text-amber-600" : ""} />
            </button>
          )}
        </div>

        {/* Quick Action: New Quote */}
        {currentTab !== "new-quote" && (
          <button
            onClick={() => onNavigate("new-quote")}
            className="hidden lg:flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xs transition-colors"
          >
            <FilePlus2 size={14} className="text-amber-400" />
            <span>Create Quote</span>
          </button>
        )}

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-800 transition-colors shadow-2xs"
          >
            <div className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-[10px]">
              {currentUser?.name?.[0] || "U"}
            </div>
            <div className="text-left hidden sm:block">
              <span className="block font-semibold leading-tight text-slate-900">
                {currentUser?.name || "Select User"}
              </span>
              <span className="block text-[10px] text-slate-500 capitalize leading-none">
                {currentUser?.role === "sales_rep"
                  ? "Sales Rep"
                  : currentUser?.role === "accounting_reviewer"
                  ? "Accounting / Reviewer"
                  : "Administrator"}
              </span>
            </div>
            <ChevronDown size={14} className="text-slate-500" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Active Role (RBAC)
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Test permissions across operational roles:
                </p>
              </div>

              <div className="py-1">
                {allUsers.map((user) => {
                  const isCurrent = user.id === currentUser?.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => {
                        onSwitchUser(user.id);
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        isCurrent ? "bg-amber-50/70 font-semibold" : ""
                      }`}
                    >
                      <div>
                        <p className="text-slate-900">{user.name}</p>
                        <p className="text-[10px] text-slate-500 capitalize">
                          {user.role === "sales_rep"
                            ? "Sales Representative"
                            : user.role === "accounting_reviewer"
                            ? "Accounting / Tax Reviewer"
                            : "Administrator"}
                        </p>
                      </div>
                      {isCurrent && (
                        <CheckCircle2 size={15} className="text-amber-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="px-3 pt-2 pb-1 border-t border-slate-100 text-[10px] text-slate-400">
                Backend enforces authorization on every request.
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
