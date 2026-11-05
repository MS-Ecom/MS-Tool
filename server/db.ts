import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "sales_rep" | "accounting_reviewer" | "admin";
  status: "active" | "inactive";
  createdAt: string;
  lastLogin?: string;
}

export interface QuoteItem {
  id: string;
  model: string;
  description: string;
  classification: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  ewSelected: boolean;
  eligibilityStatus: "Eligible" | "Ineligible" | "Requires Review";
  reviewNotes?: string;
}

export interface QuoteEligibility {
  status: "Eligible" | "Ineligible" | "Requires Review" | "Exception Approved";
  shipDate: string;
  currentDate: string;
  daysSinceShipment: number;
  daysRemaining: number;
  exceptionReason?: string;
  exceptionAuthorizedBy?: string;
  exceptionAuthorizedAt?: string;
}

export interface PackageComparisonOption {
  id: string;
  sku: string;
  packageName: string;
  coveragePeriod: string;
  coverageDescription: string;
  eligibleItemCount: number;
  eligibleTotalValue: number;
  ewBasePrice: number;
  salesTaxAmount: number;
  surchargeAmount: number;
  finalCustomerTotal: number;
  recommendation?: "CHEAPEST" | "BEST VALUE" | null;
  pricingRule: string;
}

export interface QuoteTaxInfo {
  shipToAddress: string;
  matchedJurisdiction: string;
  standardTaxRate: number;
  appliedTaxRate: number;
  taxAmount: number;
  taxExempt: boolean;
  taxExemptionStatus: "None" | "Pending Verification" | "Approved" | "Rejected";
  taxExemptionDocId?: string;
  taxExemptionDocName?: string;
  reviewer?: string;
  reviewDate?: string;
  rejectionReason?: string;
}

export interface QuoteSurchargeInfo {
  enabled: boolean;
  rate: number;
  amount: number;
}

export interface EWQuote {
  id: string;
  ewqNumber: string; // e.g. "EWQ-67803"
  soNumber: string;
  version: number;
  soDate: string;
  shipDate: string;
  shipVia: string;
  salesRep: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    billingAddress: string;
  };
  shipping: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  items: QuoteItem[];
  eligibility: QuoteEligibility;
  selectedPackage?: PackageComparisonOption;
  availablePackages: PackageComparisonOption[];
  taxInfo: QuoteTaxInfo;
  surcharge: QuoteSurchargeInfo;
  totals: {
    ewPackagePrice: number;
    salesTax: number;
    surcharge: number;
    finalCustomerTotal: number;
  };
  status: "Draft" | "Saved" | "Pending Verification" | "Accepted" | "Declined" | "Expired";
  referenceDataSnapshot: {
    version: string;
    syncTimestamp: string;
    sourceSpreadsheet: string;
  };
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxExemptionDocument {
  id: string;
  quoteId: string;
  soNumber: string;
  filename: string;
  storedFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  status: "Pending Verification" | "Approved" | "Rejected";
  reviewer?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  userEmail: string;
  userRole: string;
  action: string;
  relatedEWQ?: string;
  relatedSO?: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
}

export interface AppSettings {
  eligibilityPeriodDays: number;
  surchargeEnabled: boolean;
  surchargeRate: number;
  ewqFormat: string;
  currency: string;
  defaultQuoteStatus: string;
  acceptedFileFormats: string[];
  maxUploadSizeMB: number;
  googleSpreadsheetUrl: string;
  autoSyncHours: number;
  legalSurchargeDisclaimer: string;
}

interface DatabaseSchema {
  users: User[];
  activeUserId: string;
  quotes: EWQuote[];
  taxExemptions: TaxExemptionDocument[];
  activityLogs: ActivityLog[];
  settings: AppSettings;
  calculationHistory: Array<{
    id: string;
    quoteId: string;
    version: number;
    soNumber: string;
    timestamp: string;
    calculatedBy: string;
    inputSummary: {
      soNumber: string;
      itemsCount: number;
      eligibleItemsCount: number;
      taxRate: number;
      surchargeEnabled: boolean;
    };
    resultSummary: {
      selectedPackage?: string;
      ewBasePrice: number;
      salesTax: number;
      surcharge: number;
      finalCustomerTotal: number;
    };
    referenceVersion: string;
  }>;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "app_database.json");

const INITIAL_USERS: User[] = [
  {
    id: "usr_sales_1",
    name: "Sarah Jenkins",
    email: "ecommerce@msappliances.com",
    role: "sales_rep",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr_accounting_1",
    name: "David Miller",
    email: "accounting@msappliances.com",
    role: "accounting_reviewer",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr_admin_1",
    name: "Robert Vance",
    email: "admin@msappliances.com",
    role: "admin",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

const INITIAL_SETTINGS: AppSettings = {
  eligibilityPeriodDays: 180,
  surchargeEnabled: true,
  surchargeRate: 0.03,
  ewqFormat: "EWQ-[SO]",
  currency: "USD",
  defaultQuoteStatus: "Saved",
  acceptedFileFormats: ["pdf", "jpg", "jpeg", "png"],
  maxUploadSizeMB: 15,
  googleSpreadsheetUrl: "https://docs.google.com/spreadsheets/d/1mTxeBlnXvfPWBxWFkB17OD4XLa5XsRKwsflWdMvLZ2c",
  autoSyncHours: 24,
  legalSurchargeDisclaimer:
    "Credit card surcharges are subject to applicable card network rules and state/jurisdiction regulations.",
};

class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        return JSON.parse(raw);
      } catch (err) {
        console.error("Error reading db file, re-initializing:", err);
      }
    }
    const initial: DatabaseSchema = {
      users: INITIAL_USERS,
      activeUserId: INITIAL_USERS[0].id,
      quotes: [],
      taxExemptions: [],
      activityLogs: [
        {
          id: `log_${Date.now()}_init`,
          timestamp: new Date().toISOString(),
          user: INITIAL_USERS[2].name,
          userEmail: INITIAL_USERS[2].email,
          userRole: INITIAL_USERS[2].role,
          action: "System Initialized",
          description: "Database initialized with core rules, default users, and audit logs.",
        },
      ],
      settings: INITIAL_SETTINGS,
      calculationHistory: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }

  private persist() {
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2));
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error("Failed to persist database:", err);
    }
  }

  // --- Users & Auth ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getActiveUser(): User {
    const user = this.data.users.find((u) => u.id === this.data.activeUserId);
    return user || this.data.users[0];
  }

  public setActiveUser(userId: string): User {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error("User not found");
    }
    this.data.activeUserId = userId;
    user.lastLogin = new Date().toISOString();
    this.persist();
    this.logActivity({
      action: "Role Switch / Login",
      description: `Active session switched to ${user.name} (${user.role}).`,
      user: user.name,
      userEmail: user.email,
      userRole: user.role,
    });
    return user;
  }

  public updateUserRole(userId: string, newRole: User["role"], adminUser: User): User {
    const target = this.data.users.find((u) => u.id === userId);
    if (!target) throw new Error("Target user not found");
    const oldRole = target.role;
    target.role = newRole;
    this.persist();
    this.logActivity({
      action: "Role Changed",
      description: `Changed role of ${target.name} from ${oldRole} to ${newRole}`,
      oldValue: oldRole,
      newValue: newRole,
      user: adminUser.name,
      userEmail: adminUser.email,
      userRole: adminUser.role,
    });
    return target;
  }

  // --- Quotes ---
  public getQuotes(): EWQuote[] {
    return this.data.quotes;
  }

  public getQuoteById(id: string): EWQuote | undefined {
    return this.data.quotes.find((q) => q.id === id);
  }

  public getQuotesBySONumber(soNumber: string): EWQuote[] {
    const cleanSO = soNumber.trim();
    return this.data.quotes.filter((q) => q.soNumber.toLowerCase() === cleanSO.toLowerCase());
  }

  public getLatestQuoteBySONumber(soNumber: string): EWQuote | undefined {
    const quotes = this.getQuotesBySONumber(soNumber);
    if (quotes.length === 0) return undefined;
    return quotes.reduce((prev, curr) => (curr.version > prev.version ? curr : prev));
  }

  public saveQuote(
    quoteData: Omit<EWQuote, "id" | "createdAt" | "updatedAt">,
    user: User,
    existingQuoteId?: string
  ): EWQuote {
    const now = new Date().toISOString();
    const cleanSO = quoteData.soNumber.trim();

    // Check duplicate check on (SO Number, Version)
    const existingSameVersion = this.data.quotes.find(
      (q) =>
        q.soNumber.toLowerCase() === cleanSO.toLowerCase() &&
        q.version === quoteData.version &&
        q.id !== existingQuoteId
    );
    if (existingSameVersion) {
      throw new Error(
        `A quotation already exists for SO #${cleanSO} version ${quoteData.version} (EWQ: ${existingSameVersion.ewqNumber}). Use duplicate/new version instead.`
      );
    }

    let saved: EWQuote;
    if (existingQuoteId) {
      const idx = this.data.quotes.findIndex((q) => q.id === existingQuoteId);
      if (idx === -1) throw new Error("Quotation to update was not found");
      const oldQuote = this.data.quotes[idx];
      saved = {
        ...quoteData,
        id: oldQuote.id,
        createdAt: oldQuote.createdAt,
        updatedAt: now,
      };
      this.data.quotes[idx] = saved;

      this.logActivity({
        action: "Quote Updated",
        relatedEWQ: saved.ewqNumber,
        relatedSO: saved.soNumber,
        description: `Updated EW Quote ${saved.ewqNumber} v${saved.version}. Final Total: $${saved.totals.finalCustomerTotal.toFixed(2)}`,
        user: user.name,
        userEmail: user.email,
        userRole: user.role,
      });
    } else {
      const newId = `quote_${crypto.randomUUID()}`;
      saved = {
        ...quoteData,
        id: newId,
        createdAt: now,
        updatedAt: now,
      };
      this.data.quotes.unshift(saved);

      this.logActivity({
        action: "Quote Created & Saved",
        relatedEWQ: saved.ewqNumber,
        relatedSO: saved.soNumber,
        description: `Created EW Quote ${saved.ewqNumber} v${saved.version} for customer ${saved.customer.name}. Final Total: $${saved.totals.finalCustomerTotal.toFixed(2)}`,
        user: user.name,
        userEmail: user.email,
        userRole: user.role,
      });
    }

    // Save calculation snapshot to history
    this.data.calculationHistory.unshift({
      id: `calc_${crypto.randomUUID()}`,
      quoteId: saved.id,
      version: saved.version,
      soNumber: saved.soNumber,
      timestamp: now,
      calculatedBy: user.name,
      inputSummary: {
        soNumber: saved.soNumber,
        itemsCount: saved.items.length,
        eligibleItemsCount: saved.items.filter((i) => i.ewSelected && i.eligibilityStatus === "Eligible").length,
        taxRate: saved.taxInfo.appliedTaxRate,
        surchargeEnabled: saved.surcharge.enabled,
      },
      resultSummary: {
        selectedPackage: saved.selectedPackage?.packageName,
        ewBasePrice: saved.totals.ewPackagePrice,
        salesTax: saved.totals.salesTax,
        surcharge: saved.totals.surcharge,
        finalCustomerTotal: saved.totals.finalCustomerTotal,
      },
      referenceVersion: saved.referenceDataSnapshot.version,
    });

    this.persist();
    return saved;
  }

  public createNewVersion(quoteId: string, user: User): EWQuote {
    const original = this.getQuoteById(quoteId);
    if (!original) throw new Error("Original quote not found");

    const existingVersions = this.getQuotesBySONumber(original.soNumber);
    const maxVersion = Math.max(...existingVersions.map((q) => q.version), 0);
    const nextVersion = maxVersion + 1;
    const now = new Date().toISOString();

    const newQuote: EWQuote = {
      ...JSON.parse(JSON.stringify(original)),
      id: `quote_${crypto.randomUUID()}`,
      version: nextVersion,
      status: "Draft",
      createdBy: user.name,
      createdAt: now,
      updatedAt: now,
    };

    this.data.quotes.unshift(newQuote);
    this.persist();

    this.logActivity({
      action: "New Version Created",
      relatedEWQ: newQuote.ewqNumber,
      relatedSO: newQuote.soNumber,
      description: `Created version ${nextVersion} of EW Quote ${newQuote.ewqNumber} derived from v${original.version}.`,
      user: user.name,
      userEmail: user.email,
      userRole: user.role,
    });

    return newQuote;
  }

  public updateQuoteStatus(quoteId: string, newStatus: EWQuote["status"], user: User): EWQuote {
    const quote = this.getQuoteById(quoteId);
    if (!quote) throw new Error("Quote not found");
    const oldStatus = quote.status;
    quote.status = newStatus;
    quote.updatedAt = new Date().toISOString();
    this.persist();

    this.logActivity({
      action: "Quote Status Changed",
      relatedEWQ: quote.ewqNumber,
      relatedSO: quote.soNumber,
      description: `Status changed from ${oldStatus} to ${newStatus}`,
      oldValue: oldStatus,
      newValue: newStatus,
      user: user.name,
      userEmail: user.email,
      userRole: user.role,
    });

    return quote;
  }

  public authorizeEligibilityException(
    quoteId: string,
    reason: string,
    adminUser: User
  ): EWQuote {
    if (adminUser.role !== "admin") {
      throw new Error("Only an Administrator can authorize an eligibility exception.");
    }
    const quote = this.getQuoteById(quoteId);
    if (!quote) throw new Error("Quote not found");

    const originalStatus = quote.eligibility.status;
    quote.eligibility.status = "Exception Approved";
    quote.eligibility.exceptionReason = reason;
    quote.eligibility.exceptionAuthorizedBy = adminUser.name;
    quote.eligibility.exceptionAuthorizedAt = new Date().toISOString();
    quote.updatedAt = new Date().toISOString();

    this.persist();

    this.logActivity({
      action: "Eligibility Exception Authorized",
      relatedEWQ: quote.ewqNumber,
      relatedSO: quote.soNumber,
      description: `Admin ${adminUser.name} authorized eligibility exception: "${reason}". Original status was: ${originalStatus}.`,
      oldValue: originalStatus,
      newValue: "Exception Approved",
      user: adminUser.name,
      userEmail: adminUser.email,
      userRole: adminUser.role,
    });

    return quote;
  }

  // --- Tax Exemption Documents ---
  public addTaxExemptionDoc(doc: Omit<TaxExemptionDocument, "id">): TaxExemptionDocument {
    const newDoc: TaxExemptionDocument = {
      ...doc,
      id: `tex_${crypto.randomUUID()}`,
    };
    this.data.taxExemptions.unshift(newDoc);
    this.persist();
    return newDoc;
  }

  public getTaxExemptionDocsByQuoteId(quoteId: string): TaxExemptionDocument[] {
    return this.data.taxExemptions.filter((d) => d.quoteId === quoteId);
  }

  public getTaxExemptionDocById(docId: string): TaxExemptionDocument | undefined {
    return this.data.taxExemptions.find((d) => d.id === docId);
  }

  public reviewTaxExemption(
    docId: string,
    decision: "Approved" | "Rejected",
    rejectionReason: string | undefined,
    reviewer: User
  ): TaxExemptionDocument {
    const doc = this.getTaxExemptionDocById(docId);
    if (!doc) throw new Error("Tax exemption document not found");
    if (decision === "Rejected" && (!rejectionReason || !rejectionReason.trim())) {
      throw new Error("A rejection reason is mandatory when rejecting tax exemption.");
    }

    doc.status = decision;
    doc.reviewer = reviewer.name;
    doc.reviewedAt = new Date().toISOString();
    if (decision === "Rejected") {
      doc.rejectionReason = rejectionReason;
    }

    // Update corresponding quote if present
    const quote = this.getQuoteById(doc.quoteId);
    if (quote) {
      quote.taxInfo.taxExemptionStatus = decision;
      quote.taxInfo.reviewer = reviewer.name;
      quote.taxInfo.reviewDate = doc.reviewedAt;
      if (decision === "Approved") {
        quote.taxInfo.appliedTaxRate = 0;
        quote.totals.salesTax = 0;
      } else {
        quote.taxInfo.appliedTaxRate = quote.taxInfo.standardTaxRate;
        quote.totals.salesTax = Number(
          (quote.totals.ewPackagePrice * quote.taxInfo.standardTaxRate).toFixed(2)
        );
        quote.taxInfo.rejectionReason = rejectionReason;
      }
      // recalculate surcharge if enabled
      if (quote.surcharge.enabled) {
        quote.totals.surcharge = Number(
          ((quote.totals.ewPackagePrice + quote.totals.salesTax) * quote.surcharge.rate).toFixed(2)
        );
      } else {
        quote.totals.surcharge = 0;
      }
      quote.totals.finalCustomerTotal = Number(
        (quote.totals.ewPackagePrice + quote.totals.salesTax + quote.totals.surcharge).toFixed(2)
      );
      quote.updatedAt = new Date().toISOString();
    }

    this.persist();

    this.logActivity({
      action: decision === "Approved" ? "Tax Exemption Approved" : "Tax Exemption Rejected",
      relatedEWQ: quote?.ewqNumber,
      relatedSO: doc.soNumber,
      description:
        decision === "Approved"
          ? `Tax Exemption approved by ${reviewer.name}. Sales tax set to 0.00%.`
          : `Tax Exemption rejected by ${reviewer.name}. Reason: "${rejectionReason}". Standard tax restored.`,
      user: reviewer.name,
      userEmail: reviewer.email,
      userRole: reviewer.role,
    });

    return doc;
  }

  // --- Calculation History ---
  public getCalculationHistory(quoteId: string) {
    return this.data.calculationHistory.filter((c) => c.quoteId === quoteId);
  }

  // --- Activity Logs ---
  public logActivity(log: Omit<ActivityLog, "id" | "timestamp">): ActivityLog {
    const newLog: ActivityLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.activityLogs.unshift(newLog);
    // keep maximum 2000 logs in storage
    if (this.data.activityLogs.length > 2000) {
      this.data.activityLogs = this.data.activityLogs.slice(0, 2000);
    }
    this.persist();
    return newLog;
  }

  public getActivityLogs(): ActivityLog[] {
    return this.data.activityLogs;
  }

  // --- Settings ---
  public getSettings(): AppSettings {
    return this.data.settings;
  }

  public updateSettings(newSettings: Partial<AppSettings>, adminUser: User): AppSettings {
    if (adminUser.role !== "admin") {
      throw new Error("Only Administrators can modify application settings.");
    }
    const oldSettings = { ...this.data.settings };
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.persist();

    this.logActivity({
      action: "Settings Changed",
      description: `Settings updated by Admin ${adminUser.name}`,
      oldValue: JSON.stringify(oldSettings),
      newValue: JSON.stringify(this.data.settings),
      user: adminUser.name,
      userEmail: adminUser.email,
      userRole: adminUser.role,
    });

    return this.data.settings;
  }
}

export const db = new DatabaseManager();
