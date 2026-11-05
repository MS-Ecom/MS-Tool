import { GoogleGenAI, Type } from "@google/genai";

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export interface ExtractedSOData {
  soNumber: string;
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
  items: Array<{
    model: string;
    description: string;
    classification: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    uncertainFlag: boolean;
    uncertainReason?: string;
  }>;
}

export async function extractSalesOrderFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedSOData> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }

  const base64Data = buffer.toString("base64");

  const prompt = `You are an expert document data extractor for MS Appliances.
Analyze this Sales Order (SO) document carefully and extract visible details accurately.
Rules:
1. Extract ONLY information actually visible in the uploaded document. Never fabricate missing values.
2. If a field is missing, return an empty string or 0.
3. Distinguish appliances (Major Appliances, Small Appliances, Electronics) from accessories, installation services, delivery charges, removal charges, and parts.
Allowed classifications:
- "Major Appliances"
- "Small Appliances"
- "Electronics"
- "Accessories"
- "Parts"
- "Services"
- "Delivery / Freight"
- "Installation"
- "Removal"
- "Other Charges"
4. If an item's classification is ambiguous or uncertain, set uncertainFlag to true and provide an uncertainReason.
5. Extract standard dates in YYYY-MM-DD format whenever possible.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          soNumber: { type: Type.STRING, description: "Sales Order Number, e.g. 67803" },
          soDate: { type: Type.STRING, description: "Sales Order Date in YYYY-MM-DD" },
          shipDate: { type: Type.STRING, description: "Ship Date in YYYY-MM-DD" },
          shipVia: { type: Type.STRING, description: "Carrier or Shipping Method" },
          salesRep: { type: Type.STRING, description: "Sales Representative Name" },
          customer: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              phone: { type: Type.STRING },
              email: { type: Type.STRING },
              billingAddress: { type: Type.STRING },
            },
            required: ["name"],
          },
          shipping: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              phone: { type: Type.STRING },
              address: { type: Type.STRING },
              city: { type: Type.STRING },
              state: { type: Type.STRING },
              zip: { type: Type.STRING },
              country: { type: Type.STRING },
            },
            required: ["address", "city", "state", "zip"],
          },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                model: { type: Type.STRING },
                description: { type: Type.STRING },
                classification: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unitPrice: { type: Type.NUMBER },
                lineTotal: { type: Type.NUMBER },
                uncertainFlag: { type: Type.BOOLEAN },
                uncertainReason: { type: Type.STRING },
              },
              required: ["model", "description", "classification", "quantity", "unitPrice"],
            },
          },
        },
        required: ["soNumber", "customer", "shipping", "items"],
      },
    },
  });

  const text = response.text || "{}";
  const parsed = JSON.parse(text) as ExtractedSOData;
  return parsed;
}
