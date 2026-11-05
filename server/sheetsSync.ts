import fs from "fs";
import path from "path";

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

const DATA_DIR = path.resolve(process.cwd(), "data");
const PACKAGES_FILE = path.join(DATA_DIR, "ew_packages.json");
const TAX_FILE = path.join(DATA_DIR, "tax_database.json");
const SYNC_STATUS_FILE = path.join(DATA_DIR, "sync_status.json");

const SPREADSHEET_ID = "1mTxeBlnXvfPWBxWFkB17OD4XLa5XsRKwsflWdMvLZ2c";
const DEFAULT_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`;

function parseCurrency(val: unknown): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  return parseFloat(String(val).replace(/[^0-9.-]+/g, "")) || 0;
}

export async function fetchLiveSpreadsheetData(): Promise<{
  packages: EWPackageRecord[];
  taxRecords: SalesTaxRecord[];
}> {
  // 1. Fetch Extended Warranty sheet
  const ewUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Extended%20Warranty`;
  const ewRes = await fetch(ewUrl);
  if (!ewRes.ok) {
    throw new Error(`Failed to fetch Extended Warranty sheet: HTTP ${ewRes.status}`);
  }
  const ewText = await ewRes.text();
  const ewJson = JSON.parse(
    ewText.substring(ewText.indexOf("{"), ewText.lastIndexOf("}") + 1)
  );

  const packages: EWPackageRecord[] = ewJson.table.rows.map(
    (r: { c: Array<{ v?: unknown; f?: unknown } | null> }, i: number) => {
      const c = r.c;
      const sku = c[0] ? String(c[0].v || "") : "";
      const itemCoverage = c[1] ? Number(c[1].v) : 1;
      const pkgName = c[2] ? String(c[2].v || "") : "";
      const minPrice = c[3] ? parseCurrency(c[3].v) : 0;
      const maxPrice = c[4] ? parseCurrency(c[4].v) : 0;
      const priceRange = c[5] ? String(c[5].v || "") : `$${minPrice} - $${maxPrice}`;
      const price = c[6] ? parseCurrency(c[6].v) : 0;
      return {
        id: `pkg_${i + 1}`,
        sku,
        itemCoverage,
        packageName: pkgName,
        minItemPrice: minPrice,
        maxItemPrice: maxPrice,
        itemPriceRange: priceRange,
        price,
        coveragePeriod: "5-Year Protection (from purchase)",
        eligibleCategories: ["Major Appliances", "Small Appliances", "Electronics"],
        effectiveDate: "2026-01-01",
        expirationDate: "2027-12-31",
      };
    }
  );

  // 2. Fetch Tax Database sheet
  const taxUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Tax%20Database`;
  const taxRes = await fetch(taxUrl);
  if (!taxRes.ok) {
    throw new Error(`Failed to fetch Tax Database sheet: HTTP ${taxRes.status}`);
  }
  const taxText = await taxRes.text();
  const taxJson = JSON.parse(
    taxText.substring(taxText.indexOf("{"), taxText.lastIndexOf("}") + 1)
  );

  const taxRecords: SalesTaxRecord[] = taxJson.table.rows.map(
    (r: { c: Array<{ v?: unknown; f?: unknown } | null> }, i: number) => {
      const c = r.c;
      const city = c[0] ? String(c[0].v || "") : "";
      let zipRaw = c[1] ? String(c[1].v ?? "") : "";
      if (c[1] && c[1].f) zipRaw = String(c[1].f);
      const zip = zipRaw.padStart(5, "0");
      const county = c[2] ? String(c[2].v || "") : "";
      let rate = 0;
      if (c[3]) {
        if (typeof c[3].v === "number") {
          rate = c[3].v;
        } else {
          rate = parseFloat(String(c[3].v).replace("%", "")) / 100;
        }
      }
      return {
        id: `tax_${i + 1}`,
        city,
        zip,
        county,
        state: "NY",
        taxRate: Number(rate.toFixed(5)),
        rateDisplay: `${(rate * 100).toFixed(3).replace(/\.?0+$/, "")}%`,
        effectiveDate: "2026-01-01",
      };
    }
  );

  return { packages, taxRecords };
}

export function getCachedPackages(): EWPackageRecord[] {
  if (fs.existsSync(PACKAGES_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PACKAGES_FILE, "utf-8"));
    } catch {
      return [];
    }
  }
  return [];
}

export function getCachedTaxRecords(): SalesTaxRecord[] {
  if (fs.existsSync(TAX_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(TAX_FILE, "utf-8"));
    } catch {
      return [];
    }
  }
  return [];
}

export function getSyncStatus(): SyncStatus {
  if (fs.existsSync(SYNC_STATUS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SYNC_STATUS_FILE, "utf-8"));
    } catch {
      // fallback
    }
  }
  const pkgs = getCachedPackages();
  const tax = getCachedTaxRecords();
  return {
    lastSyncTimestamp: new Date().toISOString(),
    status: pkgs.length > 0 ? "success" : "stale",
    packagesCount: pkgs.length,
    taxRecordsCount: tax.length,
    version: "v2026.11.05-1",
    sourceUrl: DEFAULT_URL,
  };
}

export async function runSpreadsheetSync(): Promise<SyncStatus> {
  try {
    const { packages, taxRecords } = await fetchLiveSpreadsheetData();
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PACKAGES_FILE, JSON.stringify(packages, null, 2));
    fs.writeFileSync(TAX_FILE, JSON.stringify(taxRecords, null, 2));

    const status: SyncStatus = {
      lastSyncTimestamp: new Date().toISOString(),
      status: "success",
      packagesCount: packages.length,
      taxRecordsCount: taxRecords.length,
      version: `v${new Date().toISOString().slice(0, 10).replace(/-/g, ".")}-${Math.floor(Date.now() / 1000)}`,
      sourceUrl: DEFAULT_URL,
    };
    fs.writeFileSync(SYNC_STATUS_FILE, JSON.stringify(status, null, 2));
    return status;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const existing = getSyncStatus();
    const status: SyncStatus = {
      ...existing,
      status: existing.packagesCount > 0 ? "stale" : "failed",
      errorDetails: errorMsg,
    };
    fs.writeFileSync(SYNC_STATUS_FILE, JSON.stringify(status, null, 2));
    throw new Error(`Sync failed: ${errorMsg}`);
  }
}
