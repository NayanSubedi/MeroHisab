import { Transaction } from "../types";

// Note: Google GenAI dependency removed for current version.
// Using mock data for demonstration purposes.

export interface ExtractedBillData {
  billNumber: string | null;
  date: string | null;
  vendorName: string | null;
  vendorPan: string | null;
  amount: number | null;
  vatAmount: number | null;
  category: string | null;
}

export const analyzeBillImage = async (base64Image: string): Promise<ExtractedBillData> => {
  console.log("Mocking AI analysis for image...");
  
  // Simulate network processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Return mock data suitable for Nepal context
  return {
      billNumber: "BILL-" + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString().split('T')[0],
      vendorName: "Nepal Suppliers Pvt Ltd",
      vendorPan: "102938475", // Example 9-digit PAN
      amount: 15000 + Math.floor(Math.random() * 5000),
      vatAmount: 1950,
      category: "Purchase"
  };
};