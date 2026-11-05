export type UserRole = "sales_rep" | "accounting_reviewer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
  uncertainFlag?: boolean;
  uncertainReason?: string;
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
  ewqNumber: string;
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

export interface EWPackageRecord {
  id: string;
  sku: string;
  itemCoverage: number;
  packageName: string;
  minItemPrice: number;
  maxItemPrice: number;
  itemPriceRange: string;
  price: number;
  coveragePeriod: string;
  eligibleCategories: string[];
  effectiveDate: string;
  expirationDate: string;
}

export interface SalesTaxRecord {
  id: string;
  city: string;
  zip: string;
  county: string;
  state: string;
  taxRate: number;
  rateDisplay: string;
  effectiveDate: string;
}

export interface SyncStatus {
  lastSyncTimestamp: string;
  status: "success" | "stale" | "failed";
  packagesCount: number;
  taxRecordsCount: number;
  version: string;
  errorDetails?: string;
  sourceUrl: string;
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
