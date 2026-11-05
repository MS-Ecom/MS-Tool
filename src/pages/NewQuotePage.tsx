import React, { useState, useEffect, useCallback } from "react";
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Plus,
  Trash2,
  Calculator,
  ShieldCheck,
  Percent,
  CreditCard,
  Save,
  RotateCcw,
  Printer,
  Sparkles,
  Info,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  User,
  QuoteItem,
  QuoteEligibility,
  PackageComparisonOption,
  QuoteTaxInfo,
  QuoteSurchargeInfo,
  EWQuote,
} from "../types";
import { api, CalculationResponse } from "../services/api";
import { QuotePrintModal } from "../components/QuotePrintModal";

interface NewQuotePageProps {
  currentUser: User | null;
  onViewQuote: (quoteId: string) => void;
  onQuoteSaved: () => void;
}

const CLASSIFICATION_OPTIONS = [
  "Major Appliances",
  "Small Appliances",
  "Electronics",
  "Accessories",
  "Parts",
  "Services",
  "Delivery / Freight",
  "Installation",
  "Removal",
  "Other Charges",
];

export const NewQuotePage: React.FC<NewQuotePageProps> = ({
  currentUser,
  onViewQuote,
  onQuoteSaved,
}) => {
  // Sales Order Form States
  const [soNumber, setSoNumber] = useState("");
  const [soDate, setSoDate] = useState("");
  const [shipDate, setShipDate] = useState("");
  const [shipVia, setShipVia] = useState("Standard Freight (White Glove)");
  const [salesRep, setSalesRep] = useState(currentUser?.name || "Sarah Jenkins");

  // Customer Information
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");

  // Shipping Information
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("NY");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingCountry, setShippingCountry] = useState("United States");

  // Items
  const [items, setItems] = useState<QuoteItem[]>([
    {
      id: "item_init_1",
      model: "",
      description: "",
      classification: "Major Appliances",
      quantity: 1,
      unitPrice: 0,
      lineTotal: 0,
      ewSelected: true,
      eligibilityStatus: "Eligible",
    },
  ]);

  // Tax & Exemption
  const [taxExempt, setTaxExempt] = useState(false);
  const [taxExemptionStatus, setTaxExemptionStatus] = useState<
    "None" | "Pending Verification" | "Approved" | "Rejected"
  >("None");
  const [taxExemptionFile, setTaxExemptionFile] = useState<File | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [matchedJurisdiction, setMatchedJurisdiction] = useState<string>("");
  const [matchedTaxRate, setMatchedTaxRate] = useState<number>(0);
  const [taxMatchStatus, setTaxMatchStatus] = useState<string>("");

  // Surcharge
  const [applySurcharge, setApplySurcharge] = useState(false);
  const [surchargeRate, setSurchargeRate] = useState(0.03);

  // Eligibility
  const [eligibility, setEligibility] = useState<QuoteEligibility>({
    status: "Requires Review",
    shipDate: "",
    currentDate: new Date().toISOString().slice(0, 10),
    daysSinceShipment: 0,
    daysRemaining: 180,
  });
  const [exceptionReason, setExceptionReason] = useState("");
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);

  // Calculation Results & Selected Package
  const [calcResult, setCalcResult] = useState<CalculationResponse | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageComparisonOption | null>(null);

  // Duplicate Check
  const [existingQuoteAlert, setExistingQuoteAlert] = useState<{
    exists: boolean;
    quote?: EWQuote;
    count: number;
  }>({ exists: false, count: 0 });

  // UI state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractSuccessMsg, setExtractSuccessMsg] = useState("");
  const [extractErrorMsg, setExtractErrorMsg] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessQuote, setSaveSuccessQuote] = useState<EWQuote | null>(null);
  const [printModalQuote, setPrintModalQuote] = useState<EWQuote | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Update sales rep if current user changes
  useEffect(() => {
    if (currentUser && !salesRep) {
      setSalesRep(currentUser.name);
    }
  }, [currentUser, salesRep]);

  // Compute EWQ Number
  const ewqNumber = soNumber.trim() ? `EWQ-${soNumber.trim()}` : "EWQ-_____";

  // Check existing SO when soNumber changes
  useEffect(() => {
    const clean = soNumber.trim();
    if (!clean) {
      setExistingQuoteAlert({ exists: false, count: 0 });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.checkSOExists(clean);
        if (res.exists) {
          setExistingQuoteAlert({
            exists: true,
            quote: res.latestQuote || undefined,
            count: res.count,
          });
        } else {
          setExistingQuoteAlert({ exists: false, count: 0 });
        }
      } catch (err) {
        console.error("Error checking SO existence:", err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [soNumber]);

  // Validate 180-day eligibility whenever shipDate changes
  useEffect(() => {
    if (!shipDate) {
      setEligibility({
        status: "Requires Review",
        shipDate: "",
        currentDate: new Date().toISOString().slice(0, 10),
        daysSinceShipment: 0,
        daysRemaining: 180,
      });
      return;
    }

    const ship = new Date(shipDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - ship.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      setEligibility({
        status: "Requires Review",
        shipDate,
        currentDate: today.toISOString().slice(0, 10),
        daysSinceShipment: diffDays,
        daysRemaining: 180,
      });
    } else if (diffDays <= 180) {
      setEligibility({
        status: "Eligible",
        shipDate,
        currentDate: today.toISOString().slice(0, 10),
        daysSinceShipment: diffDays,
        daysRemaining: 180 - diffDays,
      });
    } else {
      setEligibility({
        status: "Ineligible",
        shipDate,
        currentDate: today.toISOString().slice(0, 10),
        daysSinceShipment: diffDays,
        daysRemaining: 0,
      });
    }
  }, [shipDate]);

  // Lookup sales tax when ZIP or City/State change
  useEffect(() => {
    if (!shippingZip && !shippingCity) return;
    const timer = setTimeout(async () => {
      try {
        const res = await api.matchTax({
          address: shippingAddress,
          city: shippingCity,
          state: shippingState,
          zip: shippingZip,
        });
        setMatchedJurisdiction(res.jurisdiction);
        setMatchedTaxRate(res.rate);
        setTaxMatchStatus(res.status);
      } catch (err) {
        console.error("Tax match error:", err);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [shippingAddress, shippingCity, shippingState, shippingZip]);

  // Handle SO Document Upload with Gemini multimodal extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractSuccessMsg("");
    setExtractErrorMsg("");

    try {
      const res = await api.extractSalesOrder(file);
      const data = res.extracted;

      if (data.soNumber) setSoNumber(data.soNumber);
      if (data.soDate) setSoDate(data.soDate);
      if (data.shipDate) setShipDate(data.shipDate);
      if (data.shipVia) setShipVia(data.shipVia);
      if (data.salesRep) setSalesRep(data.salesRep);

      if (data.customer) {
        if (data.customer.name) setCustomerName(data.customer.name);
        if (data.customer.phone) setCustomerPhone(data.customer.phone);
        if (data.customer.email) setCustomerEmail(data.customer.email);
        if (data.customer.billingAddress) setBillingAddress(data.customer.billingAddress);
      }

      if (data.shipping) {
        if (data.shipping.name) setShippingName(data.shipping.name);
        if (data.shipping.phone) setShippingPhone(data.shipping.phone);
        if (data.shipping.address) setShippingAddress(data.shipping.address);
        if (data.shipping.city) setShippingCity(data.shipping.city);
        if (data.shipping.state) setShippingState(data.shipping.state);
        if (data.shipping.zip) setShippingZip(data.shipping.zip);
        if (data.shipping.country) setShippingCountry(data.shipping.country || "United States");
      }

      if (data.items && data.items.length > 0) {
        const mappedItems: QuoteItem[] = data.items.map((it: any, i: number) => {
          const isAppliance = [
            "Major Appliances",
            "Small Appliances",
            "Electronics",
          ].includes(it.classification);

          return {
            id: `extracted_${Date.now()}_${i}`,
            model: it.model || "",
            description: it.description || "",
            classification: it.classification || "Major Appliances",
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            lineTotal: Number(it.lineTotal) || (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
            ewSelected: isAppliance,
            eligibilityStatus: isAppliance ? "Eligible" : "Ineligible",
            uncertainFlag: it.uncertainFlag,
            uncertainReason: it.uncertainReason,
          };
        });
        setItems(mappedItems);
      }

      setExtractSuccessMsg(
        `Document extracted successfully. Found SO #${data.soNumber || "N/A"} with ${data.items?.length || 0} line items. File discarded per temporary processing policy.`
      );
    } catch (err: unknown) {
      console.error("Extraction error:", err);
      setExtractErrorMsg(
        err instanceof Error ? err.message : "Document extraction failed. You may enter details manually."
      );
    } finally {
      setIsExtracting(false);
      // Reset input value so same file can be re-uploaded if needed
      e.target.value = "";
    }
  };

  // Item handlers
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `manual_${Date.now()}_${items.length}`,
        model: "",
        description: "",
        classification: "Major Appliances",
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0,
        ewSelected: true,
        eligibilityStatus: "Eligible",
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setItems([
        {
          id: `manual_${Date.now()}`,
          model: "",
          description: "",
          classification: "Major Appliances",
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
          ewSelected: true,
          eligibilityStatus: "Eligible",
        },
      ]);
    } else {
      setItems(items.filter((it) => it.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof QuoteItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updated.lineTotal = Number((updated.quantity * updated.unitPrice).toFixed(2));
        }

        if (field === "classification") {
          const isAppliance = [
            "Major Appliances",
            "Small Appliances",
            "Electronics",
          ].includes(value);
          updated.eligibilityStatus = isAppliance ? "Eligible" : "Ineligible";
          if (!isAppliance) {
            updated.ewSelected = false;
            updated.reviewNotes = `Non-appliance (${value}) excluded from EW.`;
          } else {
            updated.ewSelected = true;
            updated.reviewNotes = undefined;
          }
        }

        return updated;
      })
    );
  };

  // Authorize Exception by Admin
  const handleAuthorizeException = () => {
    if (!exceptionReason.trim()) return;
    setEligibility((prev) => ({
      ...prev,
      status: "Exception Approved",
      exceptionReason: exceptionReason.trim(),
      exceptionAuthorizedBy: currentUser?.name || "Admin",
      exceptionAuthorizedAt: new Date().toISOString(),
    }));
    setExceptionModalOpen(false);
  };

  // Run Calculation
  const handleCalculate = async () => {
    setFormErrors([]);
    const errors: string[] = [];

    if (!soNumber.trim()) errors.push("Sales Order Number is required.");
    if (!customerName.trim()) errors.push("Customer Name is required.");
    if (!customerPhone.trim()) errors.push("Customer Phone Number is required.");
    if (!shippingAddress.trim()) errors.push("Shipping Street Address is required.");
    if (!shippingCity.trim()) errors.push("Shipping City is required.");
    if (!shippingZip.trim()) errors.push("Shipping ZIP Code is required.");
    if (!shipDate) errors.push("Ship Date is required to validate 180-day eligibility.");

    if (eligibility.status === "Ineligible") {
      errors.push(
        `Shipment date is ${eligibility.daysSinceShipment} days ago (exceeds 180 days). Administrator exception is required to proceed.`
      );
    }

    const selectedAppliances = items.filter((i) => i.ewSelected);
    if (selectedAppliances.length === 0) {
      errors.push("At least one eligible appliance must be selected for Extended Warranty.");
    }

    if (taxExempt && taxExemptionStatus === "None" && !taxExemptionFile) {
      errors.push("Tax Exemption Certificate document is required when Tax Exempt is checked.");
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsCalculating(true);
    try {
      const payload = {
        soNumber: soNumber.trim(),
        shipDate,
        items,
        shipping: {
          address: shippingAddress,
          city: shippingCity,
          state: shippingState,
          zip: shippingZip,
        },
        taxExempt,
        taxExemptionStatus: taxExempt
          ? taxExemptionStatus === "None"
            ? "Pending Verification"
            : taxExemptionStatus
          : "None",
        applySurcharge,
        surchargeRate,
      };

      const result = await api.calculateQuote(payload);
      setCalcResult(result);

      if (taxExempt && taxExemptionStatus === "None") {
        setTaxExemptionStatus("Pending Verification");
      }

      // Automatically select Best Value or Cheapest package
      if (result.packages.length > 0) {
        const best = result.packages.find((p) => p.recommendation === "BEST VALUE");
        const cheapest = result.packages.find((p) => p.recommendation === "CHEAPEST");
        setSelectedPackage(best || cheapest || result.packages[0]);
      }
    } catch (err: unknown) {
      setFormErrors([err instanceof Error ? err.message : "Failed to calculate quotation."]);
    } finally {
      setIsCalculating(false);
    }
  };

  // Save Quotation
  const handleSaveQuote = async () => {
    if (!selectedPackage || !calcResult) {
      setFormErrors(["Please calculate and select an EW package before saving."]);
      return;
    }

    setIsSaving(true);
    setFormErrors([]);

    try {
      const quotePayload: Omit<EWQuote, "id" | "createdAt" | "updatedAt"> = {
        ewqNumber,
        soNumber: soNumber.trim(),
        version: existingQuoteAlert.exists ? existingQuoteAlert.count + 1 : 1,
        soDate: soDate || shipDate,
        shipDate,
        shipVia,
        salesRep: salesRep || currentUser?.name || "Sales Rep",
        customer: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          billingAddress: billingAddress || shippingAddress,
        },
        shipping: {
          name: shippingName || customerName,
          phone: shippingPhone || customerPhone,
          address: shippingAddress,
          city: shippingCity,
          state: shippingState,
          zip: shippingZip,
          country: shippingCountry,
        },
        items,
        eligibility,
        selectedPackage,
        availablePackages: calcResult.packages,
        taxInfo: {
          ...calcResult.taxInfo,
          taxExempt,
          taxExemptionStatus: taxExempt ? taxExemptionStatus : "None",
          taxExemptionDocName: taxExemptionFile?.name,
        },
        surcharge: {
          enabled: applySurcharge,
          rate: surchargeRate,
          amount: selectedPackage.surchargeAmount,
        },
        totals: {
          ewPackagePrice: selectedPackage.ewBasePrice,
          salesTax: selectedPackage.salesTaxAmount,
          surcharge: selectedPackage.surchargeAmount,
          finalCustomerTotal: selectedPackage.finalCustomerTotal,
        },
        status: taxExempt && taxExemptionStatus === "Pending Verification" ? "Pending Verification" : "Saved",
        referenceDataSnapshot: {
          version: calcResult.referenceVersion,
          syncTimestamp: new Date().toISOString(),
          sourceSpreadsheet:
            "https://docs.google.com/spreadsheets/d/1mTxeBlnXvfPWBxWFkB17OD4XLa5XsRKwsflWdMvLZ2c",
        },
        createdBy: currentUser?.name || "Sarah Jenkins",
      };

      const saved = await api.saveQuote(quotePayload);

      // If there is an uploaded tax exemption file, attach it permanently to the saved quote
      if (taxExempt && taxExemptionFile) {
        await api.uploadTaxExemptionCertificate(saved.id, taxExemptionFile);
      }

      setSaveSuccessQuote(saved);
      onQuoteSaved();
    } catch (err: unknown) {
      setFormErrors([err instanceof Error ? err.message : "Failed to save quotation."]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearForm = () => {
    if (
      window.confirm(
        "Are you sure you want to clear this quotation form? Any unsaved inputs will be lost."
      )
    ) {
      setSoNumber("");
      setSoDate("");
      setShipDate("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setBillingAddress("");
      setShippingName("");
      setShippingPhone("");
      setShippingAddress("");
      setShippingCity("");
      setShippingState("NY");
      setShippingZip("");
      setItems([
        {
          id: `manual_${Date.now()}`,
          model: "",
          description: "",
          classification: "Major Appliances",
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
          ewSelected: true,
          eligibilityStatus: "Eligible",
        },
      ]);
      setTaxExempt(false);
      setTaxExemptionStatus("None");
      setTaxExemptionFile(null);
      setApplySurcharge(false);
      setCalcResult(null);
      setSelectedPackage(null);
      setSaveSuccessQuote(null);
      setFormErrors([]);
      setExtractSuccessMsg("");
      setExtractErrorMsg("");
      setExistingQuoteAlert({ exists: false, count: 0 });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / EWQ Identification */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
              Quotation Identifier
            </span>
            {soNumber && (
              <span className="text-xs text-slate-400 font-mono">
                Formula: EWQ-[SO NUMBER]
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1 font-mono">
            {ewqNumber}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-generated business reference for Sales Order #{soNumber || "—"}. Immutable record key will be assigned on save.
          </p>
        </div>

        {/* Existing Quote Warning Banner */}
        {existingQuoteAlert.exists && existingQuoteAlert.quote && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3.5 max-w-md text-xs">
            <div className="flex items-start space-x-2 text-amber-300">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Existing Quote Found ({existingQuoteAlert.quote.ewqNumber} v{existingQuoteAlert.quote.version})
                </p>
                <p className="text-amber-200/80 mt-0.5">
                  Customer: {existingQuoteAlert.quote.customer.name} • Total: ${existingQuoteAlert.quote.totals.finalCustomerTotal.toFixed(2)}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <button
                    onClick={() => onViewQuote(existingQuoteAlert.quote!.id)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1 rounded text-[11px] transition-colors"
                  >
                    Open Existing
                  </button>
                  <span className="text-slate-400 text-[10px]">
                    or saving will create Version {existingQuoteAlert.count + 1}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Success Save Banner */}
      {saveSuccessQuote && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 shadow-sm text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-bold text-sm">
                Quotation Saved Successfully: {saveSuccessQuote.ewqNumber} (v{saveSuccessQuote.version})
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Reference data snapshot preserved. Total: ${saveSuccessQuote.totals.finalCustomerTotal.toFixed(2)}. Status: {saveSuccessQuote.status}.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setPrintModalQuote(saveSuccessQuote)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Printer size={14} className="text-amber-400" />
              <span>Print / Export PDF</span>
            </button>
            <button
              onClick={() => onViewQuote(saveSuccessQuote.id)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors"
            >
              View in EW Quotes
            </button>
          </div>
        </div>
      )}

      {/* Error Notifications */}
      {formErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 space-y-1">
          <div className="flex items-center space-x-2 font-bold text-red-900">
            <XCircle size={16} />
            <span>Please resolve the following before proceeding:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-2 text-red-700">
            {formErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* SECTION 1: Sales Order Document Extraction (Optional) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
                Step 1 (Optional)
              </span>
              <h3 className="font-bold text-slate-900 text-base">
                Upload Sales Order (Gemini Multimodal Extraction)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload SO document (PDF/JPG/PNG) to extract details automatically. Per security policy, the document is discarded immediately after processing.
            </p>
          </div>

          <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full self-start md:self-auto">
            Temporary extraction only • No cloud document retention
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2">
            <label className="border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50/60 hover:bg-amber-50/30 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors group">
              <UploadCloud
                size={32}
                className="text-slate-400 group-hover:text-amber-600 transition-colors mb-2"
              />
              <span className="text-xs font-semibold text-slate-800 group-hover:text-amber-800">
                {isExtracting ? "Extracting Sales Order via Gemini..." : "Click to select or drag & drop Sales Order (PDF, JPG, PNG)"}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Maximum file size: 15MB • Model extracts SO#, dates, customer, and line items
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                disabled={isExtracting}
                className="hidden"
              />
            </label>
          </div>

          <div className="text-xs space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-600">
            <div className="flex items-center space-x-1.5 font-semibold text-slate-900">
              <Info size={14} className="text-amber-600" />
              <span>Extraction Rules</span>
            </div>
            <p>• Only visible fields are parsed; missing fields remain blank.</p>
            <p>• Appliances are distinguished from delivery, parts & labor.</p>
            <p>• All extracted fields remain 100% manually editable below.</p>
          </div>
        </div>

        {extractSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>{extractSuccessMsg}</span>
          </div>
        )}
        {extractErrorMsg && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center space-x-2">
            <AlertTriangle size={15} className="text-red-600 shrink-0" />
            <span>{extractErrorMsg}</span>
          </div>
        )}
      </div>

      {/* SECTION 2: Sales Order & Customer Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Order Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
                Section 1
              </span>
              <h3 className="font-bold text-slate-900 text-sm mt-1">
                Sales Order Information
              </h3>
            </div>
            <span className="text-[11px] text-amber-700 font-mono font-bold">
              {ewqNumber}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                SO Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 67803"
                value={soNumber}
                onChange={(e) => setSoNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                SO Date (Optional)
              </label>
              <input
                type="date"
                value={soDate}
                onChange={(e) => setSoDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Actual Ship Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={shipDate}
                onChange={(e) => setShipDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Crucial for 180-day warranty eligibility
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ship Via / Carrier
              </label>
              <input
                type="text"
                placeholder="e.g. White Glove Delivery"
                value={shipVia}
                onChange={(e) => setShipVia(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Sales Representative
              </label>
              <input
                type="text"
                value={salesRep}
                onChange={(e) => setSalesRep(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
              Section 2
            </span>
            <h3 className="font-bold text-slate-900 text-sm mt-1">
              Customer Information
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Eleanor Vance"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. (585) 442-8819"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="customer@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Billing Address (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 142 Elmwood Ave, Rochester, NY 14620"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Shipping Information & Real-time Tax Jurisdiction Match */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
              Section 3
            </span>
            <h3 className="font-bold text-slate-900 text-sm mt-1">
              Shipping & Tax Destination (Ship To Address)
            </h3>
            <p className="text-xs text-slate-500">
              Tax rate is authoritative and based strictly on destination Ship-To address.
            </p>
          </div>

          {matchedJurisdiction && (
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-500">Jurisdiction:</span>
              <span className="font-bold text-slate-900">{matchedJurisdiction}</span>
              <span className="bg-amber-100 text-amber-800 font-mono font-bold px-1.5 py-0.5 rounded text-[11px]">
                {(matchedTaxRate * 100).toFixed(3).replace(/\.?0+$/, "")}%
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          <div className="lg:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Street Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 142 Elmwood Ave"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Rochester"
              value={shippingCity}
              onChange={(e) => setShippingCity(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={shippingState}
              onChange={(e) => setShippingState(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ZIP Code (5 Digits) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 14620"
              maxLength={5}
              value={shippingZip}
              onChange={(e) => setShippingZip(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={shippingCountry}
              onChange={(e) => setShippingCountry(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ship To Recipient Name
            </label>
            <input
              type="text"
              placeholder="Leave blank if same as customer"
              value={shippingName}
              onChange={(e) => setShippingName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ship To Phone
            </label>
            <input
              type="text"
              placeholder="Optional contact"
              value={shippingPhone}
              onChange={(e) => setShippingPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: Product & Line Items Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
              Section 4
            </span>
            <h3 className="font-bold text-slate-900 text-sm mt-1">
              Sales Order Items & Extended Warranty Selection
            </h3>
            <p className="text-xs text-slate-500">
              Only qualifying appliances are eligible for EW. Accessories, freight, installation, and removal charges are excluded.
            </p>
          </div>

          <button
            onClick={handleAddItem}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
          >
            <Plus size={14} />
            <span>Add Item</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">Cover?</th>
                <th className="py-2.5 px-3 min-w-[130px]">Model #</th>
                <th className="py-2.5 px-3 min-w-[200px]">Description</th>
                <th className="py-2.5 px-3 min-w-[150px]">Classification</th>
                <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                <th className="py-2.5 px-3 w-28 text-right">Unit Price</th>
                <th className="py-2.5 px-3 w-28 text-right">Line Total</th>
                <th className="py-2.5 px-3 w-28 text-center">Status</th>
                <th className="py-2.5 px-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const isEligibleCategory = [
                  "Major Appliances",
                  "Small Appliances",
                  "Electronics",
                ].includes(item.classification);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Checkbox */}
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={item.ewSelected}
                        disabled={!isEligibleCategory}
                        onChange={(e) => handleItemChange(item.id, "ewSelected", e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer disabled:opacity-40"
                      />
                    </td>

                    {/* Model */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="Model code"
                        value={item.model}
                        onChange={(e) => handleItemChange(item.id, "model", e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* Description */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-amber-500"
                      />
                      {item.uncertainFlag && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded mt-1 inline-block">
                          Requires classification check
                        </span>
                      )}
                    </td>

                    {/* Classification */}
                    <td className="py-2 px-3">
                      <select
                        value={item.classification}
                        onChange={(e) => handleItemChange(item.id, "classification", e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-amber-500 bg-white"
                      >
                        {CLASSIFICATION_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Qty */}
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(item.id, "quantity", parseInt(e.target.value, 10) || 1)
                        }
                        className="w-14 px-1.5 py-1 text-center border border-slate-200 rounded text-xs focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                        }
                        className="w-24 px-1.5 py-1 text-right border border-slate-200 rounded text-xs focus:ring-1 focus:ring-amber-500 font-mono"
                      />
                    </td>

                    {/* Line Total */}
                    <td className="py-2 px-3 text-right font-mono font-medium text-slate-800">
                      ${item.lineTotal.toFixed(2)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2 px-3 text-center">
                      {isEligibleCategory ? (
                        <span className="inline-flex items-center text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                          Eligible
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          Excluded
                        </span>
                      )}
                    </td>

                    {/* Remove */}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: 180-Day EW Eligibility Validation & Exception Authorization */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
              Section 5
            </span>
            <h3 className="font-bold text-slate-900 text-sm mt-1">
              180-Day Extended Warranty Eligibility Validation
            </h3>
            <p className="text-xs text-slate-500">
              Customers qualify within 180 calendar days from the actual Ship Date.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full border ${
                eligibility.status === "Eligible"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : eligibility.status === "Ineligible"
                  ? "bg-red-50 border-red-300 text-red-800"
                  : eligibility.status === "Exception Approved"
                  ? "bg-purple-50 border-purple-300 text-purple-800"
                  : "bg-amber-50 border-amber-300 text-amber-800"
              }`}
            >
              {eligibility.status === "Eligible" && <CheckCircle2 size={14} className="mr-1" />}
              {eligibility.status === "Ineligible" && <XCircle size={14} className="mr-1" />}
              {eligibility.status === "Requires Review" && <AlertTriangle size={14} className="mr-1" />}
              {eligibility.status === "Exception Approved" && <ShieldCheck size={14} className="mr-1" />}
              <span>{eligibility.status}</span>
            </span>

            {/* Admin Exception Trigger */}
            {currentUser?.role === "admin" &&
              (eligibility.status === "Ineligible" || eligibility.status === "Requires Review") && (
                <button
                  onClick={() => setExceptionModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-3 py-1 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <ShieldAlert size={14} />
                  <span>Authorize Exception</span>
                </button>
              )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Ship Date</span>
            <span className="font-bold text-slate-900 text-sm font-mono mt-0.5 block">
              {eligibility.shipDate || "Not Provided"}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Today's Date</span>
            <span className="font-bold text-slate-900 text-sm font-mono mt-0.5 block">
              {eligibility.currentDate}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Days Since Shipment</span>
            <span className="font-bold text-slate-900 text-sm font-mono mt-0.5 block">
              {eligibility.daysSinceShipment} days
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Days Remaining</span>
            <span
              className={`font-bold text-sm font-mono mt-0.5 block ${
                eligibility.daysRemaining > 0 ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {eligibility.daysRemaining} days
            </span>
          </div>
        </div>

        {eligibility.status === "Exception Approved" && (
          <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg text-xs text-purple-900 flex items-start space-x-2">
            <ShieldCheck size={16} className="text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Administrative Exception Authorized by {eligibility.exceptionAuthorizedBy}
              </p>
              <p className="text-purple-800 mt-0.5">Reason: "{eligibility.exceptionReason}"</p>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 6 & 7: Sales Tax, Tax Exemption & Credit Card Surcharge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tax Exemption Workflow */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
                Section 6
              </span>
              <h3 className="font-bold text-slate-900 text-sm mt-1">
                Sales Tax & Tax Exemption
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={taxExempt}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setTaxExempt(checked);
                    if (!checked) {
                      setTaxExemptionStatus("None");
                      setTaxExemptionFile(null);
                    } else if (taxExemptionStatus === "None") {
                      setTaxExemptionStatus("Pending Verification");
                    }
                  }}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Tax Exempt</span>
              </label>
            </div>
          </div>

          <div className="text-xs space-y-3">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-slate-600">Standard Sales Tax Rate:</span>
              <span className="font-mono font-bold text-slate-900">
                {(matchedTaxRate * 100).toFixed(3).replace(/\.?0+$/, "")}% ({matchedJurisdiction || "Pending Address"})
              </span>
            </div>

            {taxExempt && (
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 text-xs">
                    Tax Exemption Certificate
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      taxExemptionStatus === "Approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : taxExemptionStatus === "Rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {taxExemptionStatus}
                  </span>
                </div>

                <p className="text-[11px] text-amber-900">
                  Upload an official state resale or tax-exempt certificate (PDF, JPG, PNG). Document is permanently stored for accounting audit.
                </p>

                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setTaxExemptionFile(e.target.files[0]);
                        setTaxExemptionStatus("Pending Verification");
                      }
                    }}
                    className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-600 cursor-pointer"
                  />
                  {taxExemptionFile && (
                    <span className="text-[11px] text-slate-700 font-mono truncate max-w-xs">
                      {taxExemptionFile.name}
                    </span>
                  )}
                </div>

                {/* Accounting / Admin Approval Controls */}
                {(currentUser?.role === "accounting_reviewer" || currentUser?.role === "admin") && (
                  <div className="pt-2 border-t border-amber-200 mt-2 space-y-2">
                    <p className="text-[10px] font-bold text-slate-700 uppercase">
                      Accounting Reviewer Actions
                    </p>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setTaxExemptionStatus("Approved")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-semibold"
                      >
                        Approve (0% Tax)
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt("Enter mandatory rejection reason:");
                          if (reason && reason.trim()) {
                            setTaxExemptionStatus("Rejected");
                            setRejectionReasonInput(reason.trim());
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-xs font-semibold"
                      >
                        Reject with Reason
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Credit Card Surcharge */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
                Section 7
              </span>
              <h3 className="font-bold text-slate-900 text-sm mt-1">
                Credit Card Surcharge Option
              </h3>
            </div>
            <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={applySurcharge}
                onChange={(e) => setApplySurcharge(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Apply Surcharge</span>
            </label>
          </div>

          <div className="text-xs space-y-3">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-slate-600">Configured Surcharge Rate:</span>
              <span className="font-mono font-bold text-slate-900">
                {(surchargeRate * 100).toFixed(1)}%
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-600 space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
                <CreditCard size={14} className="text-amber-600" />
                <span>Formula Specification</span>
              </div>
              <p className="font-mono text-[11px] text-slate-700">
                Surcharge = (EW Package Price + Applicable Sales Tax) × 3%
              </p>
              <p className="text-[10px] text-slate-400 pt-1">
                Surcharge is itemized separately and added to the final total only when enabled.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CALCULATE BUTTON */}
      <div className="flex justify-center pt-2">
        <button
          onClick={handleCalculate}
          disabled={isCalculating}
          className="flex items-center space-x-2 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold text-sm px-8 py-3.5 rounded-xl shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        >
          <Calculator size={18} className="text-amber-400" />
          <span>{isCalculating ? "Calculating Authoritative Tiers..." : "Calculate EW Packages & Comparisons"}</span>
        </button>
      </div>

      {/* SECTION 8: Package Comparison Results */}
      {calcResult && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded uppercase">
                Section 8
              </span>
              <h3 className="font-bold text-slate-900 text-base mt-1">
                Available Extended Warranty Packages & Comparisons
              </h3>
              <p className="text-xs text-slate-500">
                Calculated using authoritative Google Spreadsheet reference data ({calcResult.referenceVersion}). Select desired package below.
              </p>
            </div>
            <span className="text-xs text-slate-500">
              Found {calcResult.packages.length} qualifying option(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {calcResult.packages.map((pkg) => {
              const isSelected = selectedPackage?.id === pkg.id;

              return (
                <div
                  key={pkg.id}
                  className={`rounded-2xl border-2 p-5 flex flex-col justify-between transition-all relative ${
                    isSelected
                      ? "border-amber-500 bg-amber-50/20 shadow-md ring-2 ring-amber-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  {/* Recommendation Badge */}
                  {pkg.recommendation && (
                    <div className="absolute -top-3 left-4">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs ${
                          pkg.recommendation === "CHEAPEST"
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-500 text-slate-950"
                        }`}
                      >
                        {pkg.recommendation}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 block mt-1">
                      {pkg.sku}
                    </span>
                    <h4 className="font-bold text-slate-950 text-base mt-0.5">
                      {pkg.packageName}
                    </h4>
                    <span className="inline-block text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1">
                      {pkg.coveragePeriod}
                    </span>

                    <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                      {pkg.coverageDescription}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-500">
                        <span>EW Base Price:</span>
                        <span className="font-mono font-medium text-slate-800">
                          ${pkg.ewBasePrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Sales Tax:</span>
                        <span className="font-mono font-medium text-slate-800">
                          ${pkg.salesTaxAmount.toFixed(2)}
                        </span>
                      </div>
                      {applySurcharge && (
                        <div className="flex justify-between text-slate-500">
                          <span>CC Surcharge:</span>
                          <span className="font-mono font-medium text-slate-800">
                            ${pkg.surchargeAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-200">
                    <div className="flex justify-between items-baseline mb-3">
                      <span className="text-xs font-semibold text-slate-500">Customer Total:</span>
                      <span className="text-xl font-black font-mono text-slate-950">
                        ${pkg.finalCustomerTotal.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedPackage(pkg)}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition-colors shadow-2xs ${
                        isSelected
                          ? "bg-amber-500 text-slate-950 font-black"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      {isSelected ? "Selected Package" : "Select This Package"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 9: Quotation Summary & Save Action */}
      {selectedPackage && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <span className="text-[11px] font-bold text-amber-400 tracking-wider uppercase">
                Final Step
              </span>
              <h3 className="text-xl font-bold text-white mt-0.5">
                Quotation Summary & Confirmation
              </h3>
              <p className="text-xs text-slate-400">
                Review verified details for {ewqNumber} before permanent database commit.
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Final Customer Total</span>
              <span className="text-3xl font-black text-amber-400 font-mono">
                ${selectedPackage.finalCustomerTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
            {/* Customer & Shipping Summary */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-1.5">
              <span className="font-bold text-white block uppercase text-[11px] tracking-wider mb-2">
                Customer & Destination
              </span>
              <p className="font-semibold text-amber-300 text-sm">{customerName}</p>
              <p>{customerPhone}</p>
              {customerEmail && <p>{customerEmail}</p>}
              <p className="text-slate-400 pt-1">
                Ship To: {shippingAddress}, {shippingCity}, {shippingState} {shippingZip}
              </p>
            </div>

            {/* Selected Package Details */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-1.5">
              <span className="font-bold text-white block uppercase text-[11px] tracking-wider mb-2">
                Selected Protection Plan
              </span>
              <p className="font-semibold text-white text-sm">{selectedPackage.packageName}</p>
              <p className="text-amber-400 font-mono text-[11px]">{selectedPackage.sku}</p>
              <p className="text-slate-400">{selectedPackage.coveragePeriod}</p>
              <p className="text-slate-400 pt-1">
                {items.filter((i) => i.ewSelected).length} appliance(s) protected
              </p>
            </div>

            {/* Financial Breakdown */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2">
              <span className="font-bold text-white block uppercase text-[11px] tracking-wider mb-2">
                Financial Breakdown
              </span>
              <div className="flex justify-between">
                <span>EW Base Price:</span>
                <span className="font-mono text-white">${selectedPackage.ewBasePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  Sales Tax{" "}
                  {taxExempt && (
                    <span className="text-amber-400 text-[10px]">
                      ({taxExemptionStatus})
                    </span>
                  )}
                  :
                </span>
                <span className="font-mono text-white">${selectedPackage.salesTaxAmount.toFixed(2)}</span>
              </div>
              {applySurcharge && (
                <div className="flex justify-between">
                  <span>Credit Card Surcharge (3%):</span>
                  <span className="font-mono text-white">${selectedPackage.surchargeAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-slate-700 pt-1.5 flex justify-between font-bold text-amber-400 text-sm">
                <span>Customer Total:</span>
                <span className="font-mono text-base">${selectedPackage.finalCustomerTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={handleClearForm}
              className="flex items-center space-x-1.5 text-slate-400 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              <RotateCcw size={15} />
              <span>Clear Form</span>
            </button>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                onClick={handleSaveQuote}
                disabled={isSaving}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm px-7 py-3 rounded-xl shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <Save size={16} />
                <span>{isSaving ? "Saving to Database..." : "Save EW Quotation"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Exception Modal */}
      {exceptionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-xs text-slate-800 space-y-4">
            <div className="flex items-center space-x-2 text-purple-700 font-bold text-sm">
              <ShieldAlert size={18} />
              <span>Authorize 180-Day Eligibility Exception</span>
            </div>
            <p className="text-slate-600">
              As an Administrator, you may authorize a business exception for orders shipped past 180 days ({eligibility.daysSinceShipment} days ago). This action will be permanently recorded in the immutable audit trail.
            </p>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Authorization Reason / Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Approved by Regional VP due to delayed construction delivery..."
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setExceptionModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAuthorizeException}
                disabled={!exceptionReason.trim()}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors disabled:opacity-50"
              >
                Confirm Exception
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print / Export PDF Modal */}
      {printModalQuote && (
        <QuotePrintModal
          quote={printModalQuote}
          onClose={() => setPrintModalQuote(null)}
        />
      )}
    </div>
  );
};
