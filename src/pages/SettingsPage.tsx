import React, { useState, useEffect } from "react";
import {
  Settings,
  Shield,
  Save,
  RefreshCw,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lock,
  FileCheck,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { AppSettings, User } from "../types";
import { api } from "../services/api";

interface SettingsPageProps {
  currentUser: User | null;
  onRefreshData?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [eligibilityDays, setEligibilityDays] = useState(180);
  const [surchargeEnabled, setSurchargeEnabled] = useState(true);
  const [surchargeRate, setSurchargeRate] = useState(0.03);
  const [maxUploadMB, setMaxUploadMB] = useState(15);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [disclaimer, setDisclaimer] = useState("");

  const isAdmin = currentUser?.role === "admin";

  const loadSettingsAndUsers = async () => {
    try {
      setLoading(true);
      const [sData, uData] = await Promise.all([
        api.getSettings(),
        api.getUsers(),
      ]);
      setSettings(sData);
      setUsers(uData);

      setEligibilityDays(sData.eligibilityPeriodDays);
      setSurchargeEnabled(sData.surchargeEnabled);
      setSurchargeRate(sData.surchargeRate);
      setMaxUploadMB(sData.maxUploadSizeMB);
      setSheetsUrl(sData.googleSpreadsheetUrl);
      setDisclaimer(sData.legalSurchargeDisclaimer);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsAndUsers();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("Only Administrators can modify application settings.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await api.updateSettings({
        eligibilityPeriodDays: eligibilityDays,
        surchargeEnabled,
        surchargeRate,
        maxUploadSizeMB: maxUploadMB,
        googleSpreadsheetUrl: sheetsUrl,
        legalSurchargeDisclaimer: disclaimer,
      });
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!isAdmin) {
      alert("Only Administrators can modify user roles.");
      return;
    }
    try {
      await api.updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u))
      );
      alert("User role updated successfully.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to change role");
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 text-amber-900 flex items-start space-x-3">
          <Lock size={22} className="text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">Administrator Access Required</h3>
            <p className="text-xs text-amber-800 mt-1">
              The Settings module is restricted to authorized Administrators. Your current active role is:{" "}
              <span className="font-bold capitalize">{currentUser?.role || "Unknown"}</span>.
            </p>
            <p className="text-xs text-amber-700 mt-2">
              To test administrative controls, use the Role Switcher in the top right header to switch to Robert Vance (Administrator).
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>System configuration updated successfully and recorded in Activity Logs.</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: EW Eligibility Rules */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
              Rule 1
            </span>
            <h3 className="font-bold text-slate-900 text-sm mt-1">
              Extended Warranty 180-Day Eligibility Rule
            </h3>
            <p className="text-xs text-slate-500">
              Configures the authoritative shipment window within which customers may apply for EW coverage.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Eligibility Period (Calendar Days)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={eligibilityDays}
                onChange={(e) => setEligibilityDays(parseInt(e.target.value, 10) || 180)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-medium focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Standard company default: 180 days from actual Ship Date.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Date Calculation Base
              </label>
              <input
                type="text"
                disabled
                value="Ship Date (Strict Requirement)"
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Sales Order date cannot be used for warranty eligibility.
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Credit Card Surcharge */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
              Rule 2
            </span>
            <h3 className="font-bold text-slate-900 text-sm mt-1">
              Credit Card Surcharge & Compliance
            </h3>
            <p className="text-xs text-slate-500">
              Formula: (EW Base Price + Applicable Sales Tax) × Surcharge Rate.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="flex items-center space-x-2 font-semibold text-slate-800 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={surchargeEnabled}
                  onChange={(e) => setSurchargeEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Enable Credit Card Surcharge Feature</span>
              </label>

              <label className="block font-semibold text-slate-700 mb-1">
                Default Surcharge Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={5}
                value={(surchargeRate * 100).toFixed(1)}
                onChange={(e) => setSurchargeRate((parseFloat(e.target.value) || 0) / 100)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-medium focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Standard rate: 3.0% (network compliance max).
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Legal & Network Compliance Notice
              </label>
              <textarea
                rows={3}
                value={disclaimer}
                onChange={(e) => setDisclaimer(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Authoritative Reference Source */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
              Reference
            </span>
            <h3 className="font-bold text-slate-900 text-sm mt-1">
              Authoritative Google Spreadsheet Source
            </h3>
            <p className="text-xs text-slate-500">
              Source for 'Extended Warranty' (packages & tiers) and 'Tax Database' (1,789 NY rates).
            </p>
          </div>

          <div className="text-xs space-y-2">
            <label className="block font-semibold text-slate-700">
              Spreadsheet URL
            </label>
            <input
              type="text"
              value={sheetsUrl}
              onChange={(e) => setSheetsUrl(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-slate-500">
              Any changes to this source are recorded in the audit trail. Saved quotes preserve their calculation snapshots and are never silently altered.
            </p>
          </div>
        </div>

        {/* Section 4: User Management (RBAC) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
              Access Control
            </span>
            <h3 className="font-bold text-slate-900 text-sm mt-1">
              User Management & Role Permissions
            </h3>
            <p className="text-xs text-slate-500">
              Assign roles across Sales Representatives, Accounting / Tax Reviewers, and Administrators.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{u.name}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="px-2 py-1 border border-slate-300 rounded text-xs bg-white font-medium"
                      >
                        <option value="sales_rep">Sales Representative</option>
                        <option value="accounting_reviewer">Accounting / Tax Reviewer</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        Active
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleTimeString() : "Recent"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-6 py-3 rounded-xl shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            <Save size={15} />
            <span>{isSaving ? "Saving Settings..." : "Save System Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
