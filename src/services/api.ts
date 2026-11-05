import {
  User,
  EWQuote,
  EWPackageRecord,
  SalesTaxRecord,
  SyncStatus,
  ActivityLog,
  AppSettings,
  PackageComparisonOption,
  QuoteEligibility,
  QuoteTaxInfo,
  QuoteSurchargeInfo,
  QuoteItem,
} from "../types";

export interface CalculationResponse {
  eligibility: QuoteEligibility;
  qualifyingItems: QuoteItem[];
  excludedItems: QuoteItem[];
  taxInfo: QuoteTaxInfo;
  surcharge: QuoteSurchargeInfo;
  packages: PackageComparisonOption[];
  recommendedCheapestId?: string;
  recommendedBestValueId?: string;
  referenceVersion: string;
  errors: string[];
  warnings: string[];
}

export const api = {
  // Auth
  async getCurrentUser(): Promise<User> {
    const res = await fetch("/api/auth/current-user");
    const json = await res.json();
    return json.user;
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch("/api/auth/users");
    const json = await res.json();
    return json.users;
  },

  async switchUser(userId: string): Promise<User> {
    const res = await fetch("/api/auth/switch-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.user;
  },

  async updateUserRole(userId: string, role: string): Promise<User> {
    const res = await fetch(`/api/auth/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.user;
  },

  // Extraction
  async extractSalesOrder(file: File): Promise<{
    extracted: any;
    message: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/extract/so-document", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to extract sales order");
    return json;
  },

  // Reference Data & Sync
  async getSyncStatus(): Promise<SyncStatus> {
    const res = await fetch("/api/reference/sync-status");
    const json = await res.json();
    return json.status;
  },

  async syncSpreadsheet(): Promise<SyncStatus> {
    const res = await fetch("/api/reference/sync", {
      method: "POST",
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Sync failed");
    return json.status;
  },

  async getPackages(): Promise<{ packages: EWPackageRecord[]; status: SyncStatus }> {
    const res = await fetch("/api/reference/packages");
    const json = await res.json();
    return json;
  },

  async getTaxRecords(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    records: SalesTaxRecord[];
    total: number;
    page: number;
    limit: number;
    status: SyncStatus;
  }> {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    const res = await fetch(`/api/reference/tax?${query.toString()}`);
    return res.json();
  },

  async matchTax(shipping: {
    address: string;
    city: string;
    state: string;
    zip: string;
  }): Promise<{
    jurisdiction: string;
    rate: number;
    status: "Exact ZIP Match" | "City/State Match" | "Unmatched - Requires Review";
  }> {
    const res = await fetch("/api/reference/tax/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shipping),
    });
    return res.json();
  },

  // Calculation Engine
  async calculateQuote(payload: any): Promise<CalculationResponse> {
    const res = await fetch("/api/quotes/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Calculation error");
    return json.result;
  },

  // Quotation Management
  async checkSOExists(soNumber: string): Promise<{
    exists: boolean;
    count: number;
    latestQuote: EWQuote | null;
    quotes: EWQuote[];
  }> {
    const res = await fetch(`/api/quotes/check-so/${encodeURIComponent(soNumber)}`);
    return res.json();
  },

  async getQuotes(params?: {
    search?: string;
    status?: string;
    taxExempt?: string;
    salesRep?: string;
  }): Promise<EWQuote[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    if (params?.taxExempt) query.set("taxExempt", params.taxExempt);
    if (params?.salesRep) query.set("salesRep", params.salesRep);

    const res = await fetch(`/api/quotes?${query.toString()}`);
    const json = await res.json();
    return json.quotes || [];
  },

  async getQuote(id: string): Promise<EWQuote> {
    const res = await fetch(`/api/quotes/${id}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Quote not found");
    return json.quote;
  },

  async saveQuote(quoteData: Partial<EWQuote>): Promise<EWQuote> {
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quoteData),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to save quote");
    return json.quote;
  },

  async updateQuote(id: string, quoteData: Partial<EWQuote>): Promise<EWQuote> {
    const res = await fetch(`/api/quotes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quoteData),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to update quote");
    return json.quote;
  },

  async createNewQuoteVersion(quoteId: string): Promise<EWQuote> {
    const res = await fetch(`/api/quotes/${quoteId}/new-version`, {
      method: "POST",
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to create new version");
    return json.quote;
  },

  async updateQuoteStatus(id: string, status: string): Promise<EWQuote> {
    const res = await fetch(`/api/quotes/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.quote;
  },

  async getQuoteHistory(id: string): Promise<any[]> {
    const res = await fetch(`/api/quotes/${id}/history`);
    const json = await res.json();
    return json.history || [];
  },

  async authorizeException(quoteId: string, reason: string): Promise<EWQuote> {
    const res = await fetch(`/api/quotes/${quoteId}/eligibility-exception`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.quote;
  },

  // Tax Exemption Workflow
  async uploadTaxExemptionCertificate(quoteId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append("certificate", file);
    const res = await fetch(`/api/quotes/${quoteId}/tax-exemption`, {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json;
  },

  async reviewTaxExemption(
    docId: string,
    decision: "Approved" | "Rejected",
    rejectionReason?: string
  ): Promise<any> {
    const res = await fetch(`/api/tax-exemptions/${docId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, rejectionReason }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json;
  },

  // Dashboard & Activity Logs
  async getDashboardStats(): Promise<any> {
    const res = await fetch("/api/dashboard/stats");
    const json = await res.json();
    return json.stats;
  },

  async getActivityLogs(params?: {
    search?: string;
    user?: string;
    action?: string;
  }): Promise<ActivityLog[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.user) query.set("user", params.user);
    if (params?.action) query.set("action", params.action);

    const res = await fetch(`/api/activity-logs?${query.toString()}`);
    const json = await res.json();
    return json.logs || [];
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    const res = await fetch("/api/settings");
    const json = await res.json();
    return json.settings;
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.settings;
  },
};
