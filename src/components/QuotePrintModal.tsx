import React from "react";
import { Printer, Download, X, ShieldCheck, CheckCircle2, Clock } from "lucide-react";
import { EWQuote } from "../types";

interface QuotePrintModalProps {
  quote: EWQuote | null;
  onClose: () => void;
}

export const QuotePrintModal: React.FC<QuotePrintModalProps> = ({ quote, onClose }) => {
  if (!quote) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Controls Header (Hidden on print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <ShieldCheck size={22} className="text-amber-400" />
            <div>
              <h3 className="font-semibold text-sm">Customer Quotation Document</h3>
              <p className="text-xs text-slate-300">
                Official quotation for {quote.ewqNumber} (v{quote.version})
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs shadow-xs transition-colors"
            >
              <Printer size={15} />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto bg-white text-slate-900 font-sans print:p-0 print:m-0 print:overflow-visible">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
            <div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center font-bold text-amber-400 text-lg">
                  MS
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950">
                    MS APPLIANCES
                  </h1>
                  <p className="text-xs text-amber-700 font-semibold tracking-wider uppercase">
                    Extended Warranty Protection Division
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                100 Appliance Way • Rochester, NY 14620 • support@msappliances.com
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block bg-slate-900 text-amber-400 font-mono font-bold text-sm px-3 py-1 rounded">
                {quote.ewqNumber}
              </span>
              <p className="text-xs font-semibold text-slate-700 mt-1">
                Version: <span className="font-mono">{quote.version}</span>
              </p>
              <p className="text-xs text-slate-500">
                Date: {new Date(quote.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-slate-500">Sales Rep: {quote.salesRep}</p>
            </div>
          </div>

          {/* Reference Info Grid */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-xs">
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-1.5 text-[11px]">
                Customer & Billing Information
              </h4>
              <p className="font-semibold text-slate-800 text-sm">{quote.customer.name}</p>
              <p className="text-slate-600">Phone: {quote.customer.phone}</p>
              {quote.customer.email && <p className="text-slate-600">Email: {quote.customer.email}</p>}
              {quote.customer.billingAddress && (
                <p className="text-slate-600 mt-1">Billing: {quote.customer.billingAddress}</p>
              )}
            </div>

            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-1.5 text-[11px]">
                Delivery & Sales Order Reference
              </h4>
              <p className="text-slate-700 font-medium">Sales Order #: <span className="font-bold">{quote.soNumber}</span></p>
              <p className="text-slate-600">Ship Date: {quote.shipDate}</p>
              {quote.shipVia && <p className="text-slate-600">Ship Via: {quote.shipVia}</p>}
              <p className="text-slate-600 mt-1">
                Ship To: {quote.shipping.address}, {quote.shipping.city}, {quote.shipping.state}{" "}
                {quote.shipping.zip}
              </p>
            </div>
          </div>

          {/* Covered Appliances Table */}
          <div className="mb-6">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-2">
              Covered Appliances & Equipment
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Model</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Retail Value</th>
                    <th className="py-2.5 px-3 text-right">Coverage Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quote.items
                    .filter((item) => item.ewSelected)
                    .map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 font-mono font-medium text-slate-900">
                          {item.model}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{item.description}</td>
                        <td className="py-2 px-3 text-center">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-medium">
                          ${item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="inline-flex items-center text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                            <CheckCircle2 size={11} className="mr-1" />
                            Covered
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Protection Plan */}
          <div className="border border-amber-300 bg-amber-50/50 rounded-xl p-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
                  Selected Protection Plan
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-1">
                  {quote.selectedPackage?.packageName || "Comprehensive Appliance Protection"}
                </h3>
                <p className="text-xs text-amber-900 font-medium mt-0.5">
                  Coverage Period: {quote.selectedPackage?.coveragePeriod || "5-Year Date of Purchase Protection"}
                </p>
                <p className="text-xs text-slate-600 mt-1 max-w-xl">
                  {quote.selectedPackage?.coverageDescription}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Base Price</span>
                <span className="text-xl font-black text-slate-950 font-mono">
                  ${quote.totals.ewPackagePrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing & Financial Breakdown */}
          <div className="flex justify-end mb-8">
            <div className="w-80 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2.5">
              <div className="flex justify-between text-slate-600">
                <span>EW Base Package Price:</span>
                <span className="font-mono font-medium text-slate-900">
                  ${quote.totals.ewPackagePrice.toFixed(2)}
                </span>
              </div>

              {/* Tax Line */}
              <div className="flex justify-between items-center text-slate-600">
                <div>
                  <span>Sales Tax</span>
                  {quote.taxInfo.taxExempt ? (
                    <span
                      className={`ml-1 text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        quote.taxInfo.taxExemptionStatus === "Approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {quote.taxInfo.taxExemptionStatus === "Approved"
                        ? "Tax Exempt (Approved)"
                        : "Exempt Pending Verification"}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 ml-1">
                      ({(quote.taxInfo.standardTaxRate * 100).toFixed(2)}%)
                    </span>
                  )}
                </div>
                <span className="font-mono font-medium text-slate-900">
                  ${quote.totals.salesTax.toFixed(2)}
                </span>
              </div>

              {/* Surcharge Line */}
              {quote.surcharge.enabled && (
                <div className="flex justify-between text-slate-600">
                  <span>Credit Card Surcharge ({(quote.surcharge.rate * 100).toFixed(0)}%):</span>
                  <span className="font-mono font-medium text-slate-900">
                    ${quote.totals.surcharge.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="border-t border-slate-300 pt-2 flex justify-between items-baseline font-bold text-slate-950 text-sm">
                <span>Final Customer Total:</span>
                <span className="text-lg font-black font-mono text-amber-700">
                  ${quote.totals.finalCustomerTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-500 space-y-1">
            <p className="font-bold text-slate-700 uppercase">Protection Terms & Provisions</p>
            <p>
              1. Extended Warranty coverage commences upon the expiration of the original manufacturer
              warranty for mechanical and electrical failure, or from delivery date for power surge and
              refrigeration food loss.
            </p>
            <p>
              2. Quotation is valid for 30 calendar days from the date of quotation and within the
              authoritative 180-day delivery eligibility window.
            </p>
            <p>
              3. If tax exemption is requested, full exemption is contingent upon accounting verification
              of an official state certificate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
