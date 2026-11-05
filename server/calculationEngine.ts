import { getCachedPackages, getCachedTaxRecords, getSyncStatus } from "./sheetsSync";
import {
  QuoteItem,
  QuoteEligibility,
  PackageComparisonOption,
  QuoteTaxInfo,
  QuoteSurchargeInfo,
} from "./db";

export interface CalculationInput {
  soNumber: string;
  shipDate: string;
  items: QuoteItem[];
  shipping: {
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  taxExempt: boolean;
  taxExemptionStatus: "None" | "Pending Verification" | "Approved" | "Rejected";
  applySurcharge: boolean;
  surchargeRate?: number;
  eligibilityThresholdDays?: number;
}

export interface CalculationResult {
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

export function validateShipmentEligibility(
  shipDateStr: string,
  thresholdDays: number = 180
): QuoteEligibility {
  const currentDateStr = new Date().toISOString().slice(0, 10);

  if (!shipDateStr || !shipDateStr.trim()) {
    return {
      status: "Requires Review",
      shipDate: "",
      currentDate: currentDateStr,
      daysSinceShipment: 0,
      daysRemaining: 0,
    };
  }

  const shipDate = new Date(shipDateStr);
  const currentDate = new Date(currentDateStr);

  if (isNaN(shipDate.getTime())) {
    return {
      status: "Requires Review",
      shipDate: shipDateStr,
      currentDate: currentDateStr,
      daysSinceShipment: 0,
      daysRemaining: 0,
    };
  }

  const diffMs = currentDate.getTime() - shipDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Future date
    return {
      status: "Requires Review",
      shipDate: shipDateStr,
      currentDate: currentDateStr,
      daysSinceShipment: diffDays,
      daysRemaining: thresholdDays,
    };
  }

  const daysRemaining = thresholdDays - diffDays;

  if (diffDays <= thresholdDays) {
    return {
      status: "Eligible",
      shipDate: shipDateStr,
      currentDate: currentDateStr,
      daysSinceShipment: diffDays,
      daysRemaining: Math.max(0, daysRemaining),
    };
  } else {
    return {
      status: "Ineligible",
      shipDate: shipDateStr,
      currentDate: currentDateStr,
      daysSinceShipment: diffDays,
      daysRemaining: 0,
    };
  }
}

export function matchTaxJurisdiction(shipping: {
  address: string;
  city: string;
  state: string;
  zip: string;
}): {
  jurisdiction: string;
  rate: number;
  status: "Exact ZIP Match" | "City/State Match" | "Unmatched - Requires Review";
} {
  const taxRecords = getCachedTaxRecords();
  const cleanZip = (shipping.zip || "").trim().slice(0, 5).padStart(5, "0");
  const cleanCity = (shipping.city || "").trim().toLowerCase();
  const cleanState = (shipping.state || "").trim().toUpperCase();

  // 1. Exact ZIP match
  if (cleanZip && cleanZip.length === 5) {
    const zipMatch = taxRecords.find((r) => r.zip === cleanZip);
    if (zipMatch) {
      return {
        jurisdiction: `${zipMatch.county} (${zipMatch.city}, NY ${zipMatch.zip})`,
        rate: zipMatch.taxRate,
        status: "Exact ZIP Match",
      };
    }
  }

  // 2. City + State match
  if (cleanCity && (cleanState === "NY" || cleanState === "NEW YORK")) {
    const cityMatches = taxRecords.filter(
      (r) => r.city.toLowerCase() === cleanCity
    );
    if (cityMatches.length > 0) {
      return {
        jurisdiction: `${cityMatches[0].county} (${cityMatches[0].city}, NY)`,
        rate: cityMatches[0].taxRate,
        status: "City/State Match",
      };
    }
  }

  return {
    jurisdiction: "No Tax Record Match for Given Address",
    rate: 0,
    status: "Unmatched - Requires Review",
  };
}

export function calculateQuotation(input: CalculationInput): CalculationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const threshold = input.eligibilityThresholdDays ?? 180;
  const eligibility = validateShipmentEligibility(input.shipDate, threshold);

  if (eligibility.status === "Ineligible") {
    errors.push(
      `Shipment was ${eligibility.daysSinceShipment} days ago, which exceeds the ${threshold}-day eligibility window.`
    );
  } else if (eligibility.status === "Requires Review") {
    if (!input.shipDate) {
      errors.push("Ship Date is missing. Please provide a valid Ship Date to determine eligibility.");
    } else {
      errors.push(`Ship Date (${input.shipDate}) is in the future or invalid. Requires administrative review.`);
    }
  }

  // Identify eligible products
  const eligibleClassifications = ["Major Appliances", "Small Appliances", "Electronics"];
  const qualifyingItems: QuoteItem[] = [];
  const excludedItems: QuoteItem[] = [];

  for (const item of input.items) {
    const isAppliance = eligibleClassifications.includes(item.classification);
    if (isAppliance) {
      item.eligibilityStatus = "Eligible";
      if (item.ewSelected) {
        qualifyingItems.push(item);
      }
    } else {
      item.eligibilityStatus = "Ineligible";
      item.ewSelected = false;
      item.reviewNotes = `Non-appliance category (${item.classification}) is excluded from EW coverage.`;
      excludedItems.push(item);
    }
  }

  if (qualifyingItems.length === 0) {
    errors.push("No eligible appliances selected for Extended Warranty coverage.");
  }

  // Tax lookup
  const taxMatch = matchTaxJurisdiction(input.shipping);
  if (taxMatch.status === "Unmatched - Requires Review") {
    warnings.push(
      "Shipping address could not be matched automatically to a sales tax jurisdiction. Requires tax review."
    );
  }

  const standardTaxRate = taxMatch.rate;
  let appliedTaxRate = standardTaxRate;
  if (input.taxExempt && input.taxExemptionStatus === "Approved") {
    appliedTaxRate = 0;
  }

  const surchargeRate = input.surchargeRate ?? 0.03;

  // Retrieve cached packages
  const packagesList = getCachedPackages();
  const syncStatus = getSyncStatus();

  if (packagesList.length === 0) {
    errors.push("No synchronized EW package reference data available. Please sync with Google Sheets.");
  }

  const packagesOptions: PackageComparisonOption[] = [];

  // Generate package options based on eligible selected appliances
  // We expand items by quantity for coverage count
  const applianceList: Array<{ model: string; price: number; desc: string }> = [];
  for (const item of qualifyingItems) {
    const qty = Math.max(1, item.quantity);
    for (let q = 0; q < qty; q++) {
      applianceList.push({
        model: item.model,
        price: item.unitPrice,
        desc: item.description,
      });
    }
  }

  const totalApplianceCount = applianceList.length;
  const totalApplianceValue = applianceList.reduce((sum, a) => sum + a.price, 0);

  // Helper to find individual package price for an item
  const findIndividualPrice = (itemPrice: number): { sku: string; price: number } | null => {
    const individualTiers = packagesList.filter((p) => p.itemCoverage === 1);
    for (const tier of individualTiers) {
      if (itemPrice >= tier.minItemPrice && itemPrice <= tier.maxItemPrice) {
        return { sku: tier.sku, price: tier.price };
      }
    }
    // If above top tier
    const topTier = individualTiers[individualTiers.length - 1];
    if (topTier && itemPrice > topTier.maxItemPrice) {
      return { sku: topTier.sku, price: topTier.price };
    }
    return null;
  };

  // Helper to find bundle package price
  const findBundlePrice = (
    coverageCount: number,
    totalVal: number
  ): { sku: string; price: number; name: string } | null => {
    const bundleTiers = packagesList.filter((p) => p.itemCoverage === coverageCount);
    for (const tier of bundleTiers) {
      if (totalVal >= tier.minItemPrice && totalVal <= tier.maxItemPrice) {
        return { sku: tier.sku, price: tier.price, name: tier.packageName };
      }
    }
    const topTier = bundleTiers[bundleTiers.length - 1];
    if (topTier && totalVal > topTier.maxItemPrice) {
      return { sku: topTier.sku, price: topTier.price, name: topTier.packageName };
    }
    return null;
  };

  // Option 1: Multi-Appliance Bundle Package (if coverage count 2, 3, or 4 exists)
  if (totalApplianceCount >= 2 && totalApplianceCount <= 4) {
    const bundle = findBundlePrice(totalApplianceCount, totalApplianceValue);
    if (bundle) {
      const basePrice = bundle.price;
      const salesTax = Number((basePrice * appliedTaxRate).toFixed(2));
      const surcharge = input.applySurcharge
        ? Number(((basePrice + salesTax) * surchargeRate).toFixed(2))
        : 0;
      const total = Number((basePrice + salesTax + surcharge).toFixed(2));

      packagesOptions.push({
        id: `opt_bundle_${totalApplianceCount}`,
        sku: bundle.sku,
        packageName: `${bundle.name} (Bundled Protection)`,
        coveragePeriod: "5-Year Date of Purchase Protection",
        coverageDescription: `Comprehensive bundled coverage protecting all ${totalApplianceCount} selected appliances up to $${totalApplianceValue.toFixed(2)} combined value. Includes 100% parts & labor, power surge protection, and food spoilage reimbursement.`,
        eligibleItemCount: totalApplianceCount,
        eligibleTotalValue: totalApplianceValue,
        ewBasePrice: basePrice,
        salesTaxAmount: salesTax,
        surchargeAmount: surcharge,
        finalCustomerTotal: total,
        recommendation: null,
        pricingRule: `Authoritative Bundle Tier: ${bundle.sku} ($${totalApplianceValue.toFixed(2)} total retail value)`,
      });
    }
  }

  // Option 2: Individual Package(s) (Each appliance covered separately under individual tier)
  let individualSumPrice = 0;
  const individualSkus: string[] = [];
  let allFound = true;

  for (const app of applianceList) {
    const ind = findIndividualPrice(app.price);
    if (ind) {
      individualSumPrice += ind.price;
      individualSkus.push(ind.sku);
    } else {
      allFound = false;
    }
  }

  if (allFound && individualSumPrice > 0) {
    const basePrice = individualSumPrice;
    const salesTax = Number((basePrice * appliedTaxRate).toFixed(2));
    const surcharge = input.applySurcharge
      ? Number(((basePrice + salesTax) * surchargeRate).toFixed(2))
      : 0;
    const total = Number((basePrice + salesTax + surcharge).toFixed(2));

    const isSingle = totalApplianceCount === 1;
    packagesOptions.push({
      id: isSingle ? "opt_individual_single" : "opt_individual_itemized",
      sku: individualSkus[0] || "IND-MA-TIER",
      packageName: isSingle
        ? "Individual Appliance Extended Warranty"
        : `Individual Coverage (${totalApplianceCount} Separate Policies)`,
      coveragePeriod: "5-Year Date of Purchase Protection",
      coverageDescription: isSingle
        ? `Dedicated 5-year extended warranty for ${applianceList[0].model} ($${applianceList[0].price.toFixed(2)}). 100% parts & labor, power surge, and mechanical breakdown.`
        : `Separate dedicated warranty policies for each of the ${totalApplianceCount} appliances. Each unit retains its own independent claim limit and full replacement policy.`,
      eligibleItemCount: totalApplianceCount,
      eligibleTotalValue: totalApplianceValue,
      ewBasePrice: basePrice,
      salesTaxAmount: salesTax,
      surchargeAmount: surcharge,
      finalCustomerTotal: total,
      recommendation: null,
      pricingRule: isSingle
        ? `Individual Tier: ${individualSkus[0]}`
        : `Sum of ${totalApplianceCount} Individual Tiers (${individualSkus.join(", ")})`,
    });
  }

  // Option 3: If 3 or 4 appliances, also offer partial hybrid or alternative tier if available
  if (totalApplianceCount === 3) {
    // 2-appliance bundle for top 2 + 1 individual for third
    const sorted = [...applianceList].sort((a, b) => b.price - a.price);
    const bundle2Val = sorted[0].price + sorted[1].price;
    const bundle2 = findBundlePrice(2, bundle2Val);
    const indThird = findIndividualPrice(sorted[2].price);

    if (bundle2 && indThird) {
      const basePrice = bundle2.price + indThird.price;
      const salesTax = Number((basePrice * appliedTaxRate).toFixed(2));
      const surcharge = input.applySurcharge
        ? Number(((basePrice + salesTax) * surchargeRate).toFixed(2))
        : 0;
      const total = Number((basePrice + salesTax + surcharge).toFixed(2));

      packagesOptions.push({
        id: "opt_hybrid_2plus1",
        sku: `${bundle2.sku}+${indThird.sku}`,
        packageName: "2-Appliance Bundle + 1 Individual Policy",
        coveragePeriod: "5-Year Date of Purchase Protection",
        coverageDescription: `Bundles highest value units (${sorted[0].model} & ${sorted[1].model}) under 2-Appliance package with dedicated policy for ${sorted[2].model}.`,
        eligibleItemCount: totalApplianceCount,
        eligibleTotalValue: totalApplianceValue,
        ewBasePrice: basePrice,
        salesTaxAmount: salesTax,
        surchargeAmount: surcharge,
        finalCustomerTotal: total,
        recommendation: null,
        pricingRule: `Hybrid: ${bundle2.sku} ($${bundle2.price}) + ${indThird.sku} ($${indThird.price})`,
      });
    }
  }

  // Determine CHEAPEST and BEST VALUE recommendations
  if (packagesOptions.length === 1) {
    packagesOptions[0].recommendation = "CHEAPEST";
  } else if (packagesOptions.length > 1) {
    // Sort by price
    const sortedByPrice = [...packagesOptions].sort(
      (a, b) => a.finalCustomerTotal - b.finalCustomerTotal
    );
    const cheapest = sortedByPrice[0];
    cheapest.recommendation = "CHEAPEST";

    // Best Value:
    // If bundle is cheapest, it's both cheapest & best value; if individual coverage offers separate claims with small differential, or bundle offers significant savings, flag bundle as Best Value!
    const bundleOption = packagesOptions.find((p) => p.id.includes("bundle"));
    if (bundleOption && bundleOption.id !== cheapest.id) {
      bundleOption.recommendation = "BEST VALUE";
    } else if (sortedByPrice.length > 1 && sortedByPrice[1]) {
      // Find one with highest coverage features
      const itemized = packagesOptions.find((p) => p.id.includes("itemized"));
      if (itemized && itemized.id !== cheapest.id) {
        itemized.recommendation = "BEST VALUE";
      } else {
        sortedByPrice[1].recommendation = "BEST VALUE";
      }
    }
  }

  const taxAmount = Number(
    ((packagesOptions[0]?.ewBasePrice || 0) * appliedTaxRate).toFixed(2)
  );
  const fullAddress = `${input.shipping.address}, ${input.shipping.city}, ${input.shipping.state} ${input.shipping.zip}`;

  const taxInfo: QuoteTaxInfo = {
    shipToAddress: fullAddress,
    matchedJurisdiction: taxMatch.jurisdiction,
    standardTaxRate,
    appliedTaxRate,
    taxAmount,
    taxExempt: input.taxExempt,
    taxExemptionStatus: input.taxExempt ? input.taxExemptionStatus : "None",
  };

  const surchargeAmount = input.applySurcharge
    ? Number(
        (
          ((packagesOptions[0]?.ewBasePrice || 0) + taxAmount) *
          surchargeRate
        ).toFixed(2)
      )
    : 0;

  const surcharge: QuoteSurchargeInfo = {
    enabled: input.applySurcharge,
    rate: surchargeRate,
    amount: surchargeAmount,
  };

  return {
    eligibility,
    qualifyingItems,
    excludedItems,
    taxInfo,
    surcharge,
    packages: packagesOptions,
    recommendedCheapestId: packagesOptions.find((p) => p.recommendation === "CHEAPEST")?.id,
    recommendedBestValueId: packagesOptions.find((p) => p.recommendation === "BEST VALUE")?.id,
    referenceVersion: syncStatus.version,
    errors,
    warnings,
  };
}
