import React from "react";
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  ShieldCheck,
  Receipt,
  Settings,
  History,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { User } from "../types";

export type NavTab =
  | "dashboard"
  | "new-quote"
  | "quotes"
  | "packages"
  | "tax"
  | "settings"
  | "logs";

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentUser: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  currentUser,
}) => {
  const navItems = [
    { id: "dashboard" as NavTab, label: "Dashboard", icon: LayoutDashboard },
    { id: "new-quote" as NavTab, label: "New EW Quote", icon: FilePlus2 },
    { id: "quotes" as NavTab, label: "EW Quotes", icon: FileText },
    { id: "packages" as NavTab, label: "EW Packages", icon: ShieldCheck },
    { id: "tax" as NavTab, label: "Sales Tax References", icon: Receipt },
    {
      id: "settings" as NavTab,
      label: "Settings",
      icon: Settings,
      adminOnly: true,
    },
    { id: "logs" as NavTab, label: "Activity Logs", icon: History },
  ];

  return (
    <aside
      className={`bg-slate-900 text-slate-100 flex flex-col transition-all duration-300 border-r border-slate-800 select-none z-20 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-18 flex items-center justify-between px-4 border-b border-slate-800">
        {!collapsed ? (
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center font-bold text-slate-950 shadow-md shrink-0">
              MS
            </div>
            <div className="leading-tight">
              <span className="font-bold text-base tracking-wide text-white block">
                MS APPLIANCES
              </span>
              <span className="text-[11px] text-amber-400 font-medium tracking-wider uppercase block">
                Warranty System
              </span>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center font-bold text-slate-950 shadow-md mx-auto">
            MS
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-800 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isAdminRestricted = item.adminOnly && currentUser?.role !== "admin";

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all group ${
                isActive
                  ? "bg-amber-500 text-slate-950 font-semibold shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                size={20}
                className={`shrink-0 ${
                  isActive ? "text-slate-950" : "text-slate-400 group-hover:text-amber-400"
                } ${collapsed ? "mx-auto" : "mr-3"}`}
              />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span className="truncate">{item.label}</span>
                  {isAdminRestricted && (
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded ml-2">
                      Admin
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info / Role Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        {!collapsed ? (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs uppercase">
              {currentUser?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("") || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {currentUser?.name || "Guest User"}
              </p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    currentUser?.role === "admin"
                      ? "bg-purple-400"
                      : currentUser?.role === "accounting_reviewer"
                      ? "bg-blue-400"
                      : "bg-emerald-400"
                  }`}
                />
                <span className="text-[10px] text-slate-400 capitalize truncate">
                  {currentUser?.role === "sales_rep"
                    ? "Sales Representative"
                    : currentUser?.role === "accounting_reviewer"
                    ? "Accounting / Reviewer"
                    : "Administrator"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="w-8 h-8 rounded-full bg-slate-800 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs uppercase mx-auto"
            title={`${currentUser?.name} (${currentUser?.role})`}
          >
            {currentUser?.name
              ?.split(" ")
              .map((n) => n[0])
              .join("") || "U"}
          </div>
        )}
      </div>
    </aside>
  );
};
