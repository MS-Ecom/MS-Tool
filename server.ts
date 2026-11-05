import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

import { db, User } from "./server/db";
import {
  getCachedPackages,
  getCachedTaxRecords,
  getSyncStatus,
  runSpreadsheetSync,
} from "./server/sheetsSync";
import { extractSalesOrderFromBuffer } from "./server/gemini";
import {
  calculateQuotation,
  matchTaxJurisdiction,
  validateShipmentEligibility,
} from "./server/calculationEngine";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Upload directory for permanent tax exemption certificates
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads", "tax_exemptions");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer memory storage for temporary Sales Order document extraction (never saved permanently)
const soUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// Multer disk storage for permanent Tax Exemption certificates
const taxStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, unique);
  },
});
const taxUpload = multer({
  storage: taxStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

// Middleware to extract authenticated user
function getAuthUser(req: Request): User {
  const customUserId = req.headers["x-user-id"] as string | undefined;
  if (customUserId) {
    const found = db.getUsers().find((u) => u.id === customUserId);
    if (found) return found;
  }
  return db.getActiveUser();
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. Auth & Users
app.get("/api/auth/current-user", (req: Request, res: Response) => {
  const user = getAuthUser(req);
  res.json({ success: true, user });
});

app.get("/api/auth/users", (_req: Request, res: Response) => {
  const users = db.getUsers();
  res.json({ success: true, users });
});

app.post("/api/auth/switch-user", (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const switched = db.setActiveUser(userId);
    res.json({ success: true, user: switched });
  } catch (err: unknown) {
    res.status(400).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

app.patch("/api/auth/users/:id/role", (req: Request, res: Response) => {
  try {
    const adminUser = getAuthUser(req);
    if (adminUser.role !== "admin") {
      res.status(403).json({ success: false, error: "Only Administrators can modify user roles." });
      return;
    }
    const { role } = req.body;
    const updated = db.updateUserRole(req.params.id, role, adminUser);
    res.json({ success: true, user: updated });
  } catch (err: unknown) {
    res.status(400).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// 2. Multimodal Gemini Sales Order Extraction (Temporary buffer only!)
app.post(
  "/api/extract/so-document",
  soUpload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      if (!req.file) {
        res.status(400).json({ success: false, error: "No document uploaded." });
        return;
      }

      // Extract using Gemini
      const extracted = await extractSalesOrderFromBuffer(
        req.file.buffer,
        req.file.mimetype
      );

      db.logActivity({
        action: "SO Uploaded & Extracted",
        relatedSO: extracted.soNumber || "Unknown",
        relatedEWQ: extracted.soNumber ? `EWQ-${extracted.soNumber}` : undefined,
        description: `Uploaded SO extracted via Gemini. Found SO #${extracted.soNumber || "N/A"}, Customer: ${extracted.customer?.name || "N/A"}, Items: ${extracted.items?.length || 0}.`,
        user: user.name,
        userEmail: user.email,
        userRole: user.role,
      });

      res.json({
        success: true,
        extracted,
        message: "Sales Order document processed successfully. Original document discarded per retention policy.",
      });
    } catch (err: unknown) {
      console.error("Extraction error:", err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : "Failed to extract data from document.",
      });
    }
  }
);

// 3. Google Sheets Synchronization & Reference Data
app.get("/api/reference/sync-status", (_req: Request, res: Response) => {
  const status = getSyncStatus();
  res.json({ success: true, status });
});

app.post("/api/reference/sync", async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (user.role !== "admin") {
      res.status(403).json({ success: false, error: "Only Administrators can trigger reference data sync." });
      return;
    }
    const status = await runSpreadsheetSync();

    db.logActivity({
      action: "Reference Data Synchronized",
      description: `Manual sync completed. Synchronized ${status.packagesCount} packages and ${status.taxRecordsCount} tax records. Version: ${status.version}`,
      user: user.name,
      userEmail: user.email,
      userRole: user.role,
    });

    res.json({ success: true, status });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const user = getAuthUser(req);
    db.logActivity({
      action: "Reference Data Sync Failed",
      description: `Sync attempt failed: ${errorMsg}`,
      user: user.name,
      userEmail: user.email,
      userRole: user.role,
    });
    res.status(500).json({ success: false, error: errorMsg });
  }
});

app.get("/api/reference/packages", (_req: Request, res: Response) => {
  const packages = getCachedPackages();
  const status = getSyncStatus();
  res.json({ success: true, packages, status });
});

app.get("/api/reference/tax", (req: Request, res: Response) => {
  const taxRecords = getCachedTaxRecords();
  const status = getSyncStatus();
  const search = ((req.query.search as string) || "").toLowerCase();

  let filtered = taxRecords;
  if (search) {
    filtered = taxRecords.filter(
      (t) =>
        t.zip.includes(search) ||
        t.city.toLowerCase().includes(search) ||
        t.county.toLowerCase().includes(search)
    );
  }

  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = parseInt((req.query.limit as string) || "50", 10);
  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  res.json({
    success: true,
    records: paginated,
    total,
    page,
    limit,
    status,
  });
});

app.post("/api/reference/tax/match", (req: Request, res: Response) => {
  const result = matchTaxJurisdiction(req.body);
  res.json({ success: true, ...result });
});

// 4. Quotation Calculation Engine (Backend-authoritative)
app.post("/api/quotes/calculate", (req: Request, res: Response) => {
  try {
    const settings = db.getSettings();
    const result = calculateQuotation({
      ...req.body,
      eligibilityThresholdDays: settings.eligibilityPeriodDays,
      surchargeRate: settings.surchargeRate,
    });
    res.json({ success: true, result });
  } catch (err: unknown) {
    res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// Check if SO already has quotations
app.get("/api/quotes/check-so/:soNumber", (req: Request, res: Response) => {
  const soNumber = req.params.soNumber;
  const quotes = db.getQuotesBySONumber(soNumber);
  res.json({
    success: true,
    exists: quotes.length > 0,
    count: quotes.length,
    latestQuote: quotes.length > 0 ? quotes[0] : null,
    quotes,
  });
});

// 5. Quotation CRUD
app.get("/api/quotes", (req: Request, res: Response) => {
  let quotes = db.getQuotes();
  const search = ((req.query.search as string) || "").toLowerCase();
  const status = req.query.status as string | undefined;
  const taxExempt = req.query.taxExempt as string | undefined;
  const salesRep = req.query.salesRep as string | undefined;

  if (search) {
    quotes = quotes.filter(
      (q) =>
        q.ewqNumber.toLowerCase().includes(search) ||
        q.soNumber.toLowerCase().includes(search) ||
        q.customer.name.toLowerCase().includes(search) ||
        q.customer.phone.includes(search) ||
        (q.selectedPackage?.packageName || "").toLowerCase().includes(search)
    );
  }
  if (status && status !== "ALL") {
    quotes = quotes.filter((q) => q.status === status);
  }
  if (taxExempt && taxExempt !== "ALL") {
    if (taxExempt === "true") {
      quotes = quotes.filter((q) => q.taxInfo.taxExempt);
    } else {
      quotes = quotes.filter((q) => !q.taxInfo.taxExempt);
    }
  }
  if (salesRep && salesRep !== "ALL") {
    quotes = quotes.filter((q) => q.salesRep.toLowerCase() === salesRep.toLowerCase());
  }

  res.json({ success: true, quotes, total: quotes.length });
});

app.get("/api/quotes/:id", (req: Request, res: Response) => {
  const quote = db.getQuoteById(req.params.id);
  if (!quote) {
    res.status(404).json({ success: false, error: "Quote not found" });
    return;
  }
  res.json({ success: true, quote });
});

app.post("/api/quotes", (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const quoteData = req.body;
    const saved = db.saveQuote(quoteData, user);
    res.json({ success: true, quote: saved });
  } catch (err: unknown) {
    res.status(400).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

app.put("/api/quotes/:id", (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const saved = db.saveQuote(req.body, user, req.params.id);
    res.json({ success: true, quote: saved });
  } catch (err: unknown) {
    res.status(400).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/quotes/:id/new-version", (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const newVersion = db.createNewVersion(req.params.id, user);
    res.json({ success: true, quote: newVersion });
  } catch (err: unknown) {
    res.status(400).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

app.patch("/api/quotes/:id/status", (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const updated = db.updateQuoteStatus(req.params.id, req.body.status, user);
    res.json({ success: true, quote: updated });
  } catch (err: unknown) {
    res.status(400).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/quotes/:id/history", (req: Request, res: Response) => {
  const history = db.getCalculationHistory(req.params.id);
  res.json({ success: true, history });
});

// 6. Admin Eligibility Exception
app.post("/api/quotes/:id/eligibility-exception", (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      res.status(400).json({ success: false, error: "Reason is required to authorize an exception." });
      return;
    }
    const updated = db.authorizeEligibilityException(req.params.id, reason.trim(), user);
    res.json({ success: true, quote: updated });
  } catch (err: unknown) {
    res.status(400).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// 7. Tax Exemption Documents & Review Workflow
app.post(
  "/api/quotes/:id/tax-exemption",
  taxUpload.single("certificate"),
  (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      const quote = db.getQuoteById(req.params.id);
      if (!quote) {
        res.status(404).json({ success: false, error: "Quote not found" });
        return;
      }
      if (!req.file) {
        res.status(400).json({ success: false, error: "No tax exemption file attached." });
        return;
      }

      const doc = db.addTaxExemptionDoc({
        quoteId: quote.id,
        soNumber: quote.soNumber,
        filename: req.file.originalname,
        storedFilename: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        uploadedBy: user.name,
        uploadedAt: new Date().toISOString(),
        status: "Pending Verification",
      });

      quote.taxInfo.taxExempt = true;
      quote.taxInfo.taxExemptionStatus = "Pending Verification";
      quote.taxInfo.taxExemptionDocId = doc.id;
      quote.taxInfo.taxExemptionDocName = doc.filename;
      db.saveQuote(quote, user, quote.id);

      db.logActivity({
        action: "Tax Exemption Certificate Uploaded",
        relatedEWQ: quote.ewqNumber,
        relatedSO: quote.soNumber,
        description: `Uploaded Tax Exemption document "${doc.filename}". Status set to Pending Verification.`,
        user: user.name,
        userEmail: user.email,
        userRole: user.role,
      });

      res.json({ success: true, document: doc, quote });
    } catch (err: unknown) {
      res.status(400).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
);

// Preview/Download tax exemption certificate file
app.get("/api/tax-exemptions/:docId/file", (req: Request, res: Response) => {
  const doc = db.getTaxExemptionDocById(req.params.docId);
  if (!doc) {
    res.status(404).send("Document not found");
    return;
  }
  const filePath = path.join(UPLOADS_DIR, doc.storedFilename);
  if (!fs.existsSync(filePath)) {
    res.status(404).send("File missing from storage");
    return;
  }
  res.setHeader("Content-Type", doc.mimeType);
  res.sendFile(filePath);
});

// Accounting / Admin Review of Tax Exemption
app.post("/api/tax-exemptions/:docId/review", (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (user.role !== "accounting_reviewer" && user.role !== "admin") {
      res.status(403).json({
        success: false,
        error: "Only Accounting/Tax Reviewers or Administrators can approve or reject tax exemptions.",
      });
      return;
    }

    const { decision, rejectionReason } = req.body;
    if (decision !== "Approved" && decision !== "Rejected") {
      res.status(400).json({ success: false, error: "Decision must be Approved or Rejected." });
      return;
    }

    const updatedDoc = db.reviewTaxExemption(
      req.params.docId,
      decision,
      rejectionReason,
      user
    );
    const quote = db.getQuoteById(updatedDoc.quoteId);

    res.json({ success: true, document: updatedDoc, quote });
  } catch (err: unknown) {
    res.status(400).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// 8. Dashboard Live Metrics (Actual database records only)
app.get("/api/dashboard/stats", (_req: Request, res: Response) => {
  const quotes = db.getQuotes();
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // "YYYY-MM"

  const totalQuotes = quotes.length;
  const quotesThisMonth = quotes.filter((q) => q.createdAt.startsWith(currentMonth)).length;
  const totalSalesValue = quotes.reduce((acc, q) => acc + (q.totals.finalCustomerTotal || 0), 0);
  const savedQuotes = quotes.filter((q) => q.status === "Saved" || q.status === "Accepted").length;
  const pendingQuotes = quotes.filter((q) => q.status === "Pending Verification" || q.status === "Draft").length;
  const ineligibleOrders = quotes.filter((q) => q.eligibility.status === "Ineligible").length;

  // Monthly breakdown (last 6 months)
  const monthlyData: Record<string, { count: number; value: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    monthlyData[key] = { count: 0, value: 0 };
  }

  for (const q of quotes) {
    const key = q.createdAt.slice(0, 7);
    if (monthlyData[key]) {
      monthlyData[key].count += 1;
      monthlyData[key].value += q.totals.finalCustomerTotal || 0;
    }
  }

  // Package distribution
  const packageDist: Record<string, number> = {};
  for (const q of quotes) {
    const pkgName = q.selectedPackage?.packageName || "Unselected";
    packageDist[pkgName] = (packageDist[pkgName] || 0) + 1;
  }

  // Status distribution
  const statusDist: Record<string, number> = {};
  for (const q of quotes) {
    statusDist[q.status] = (statusDist[q.status] || 0) + 1;
  }

  res.json({
    success: true,
    stats: {
      totalQuotes,
      quotesThisMonth,
      totalSalesValue,
      savedQuotes,
      pendingQuotes,
      ineligibleOrders,
      monthlyData,
      packageDist,
      statusDist,
      recentActivity: db.getActivityLogs().slice(0, 8),
    },
  });
});

// 9. Activity Logs
app.get("/api/activity-logs", (req: Request, res: Response) => {
  let logs = db.getActivityLogs();
  const search = ((req.query.search as string) || "").toLowerCase();
  const user = req.query.user as string | undefined;
  const action = req.query.action as string | undefined;

  if (search) {
    logs = logs.filter(
      (l) =>
        l.description.toLowerCase().includes(search) ||
        (l.relatedEWQ || "").toLowerCase().includes(search) ||
        (l.relatedSO || "").toLowerCase().includes(search) ||
        l.user.toLowerCase().includes(search)
    );
  }
  if (user && user !== "ALL") {
    logs = logs.filter((l) => l.user === user);
  }
  if (action && action !== "ALL") {
    logs = logs.filter((l) => l.action === action);
  }

  res.json({ success: true, logs, total: logs.length });
});

// 10. Settings
app.get("/api/settings", (_req: Request, res: Response) => {
  const settings = db.getSettings();
  res.json({ success: true, settings });
});

app.patch("/api/settings", (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const updated = db.updateSettings(req.body, user);
    res.json({ success: true, settings: updated });
  } catch (err: unknown) {
    res.status(400).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// -------------------------------------------------------------
// VITE INTEGRATION
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MS Appliances EW Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
