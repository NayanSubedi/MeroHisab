// This service is designed to connect to your custom AI model backend.

export interface ExtractedBillData {
  billNumber: string | null;
  date: string | null;
  vendorName: string | null;
  vendorPan: string | null;
  amount: number | null;
  vatAmount: number | null;
  category: string | null;
}

// Configuration for your Custom Model
const CUSTOM_MODEL_API_URL = "http://192.168.1.64:8000/api/predict"; // Replace with your actual backend URL
const USE_MOCK_DATA = true; // Set to FALSE when your backend is ready

export const analyzeBillImage = async (base64Image: string): Promise<ExtractedBillData> => {
  
  // 1. If using mock data (for UI testing before model is ready)
  if (USE_MOCK_DATA) {
    console.log("Using Mock Data (Switch USE_MOCK_DATA to false in services/aiService.ts to use your model)");
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate latency
    
    return {
      billNumber: "INV-" + Math.floor(Math.random() * 10000),
      date: new Date().toISOString().split('T')[0],
      vendorName: "Nepal Local Suppliers",
      vendorPan: "102030405",
      amount: 2500,
      vatAmount: 325,
      category: "Office Supplies"
    };
  }

  // 2. Integration with your Custom AI Model
  try {
    // Assuming your API expects a JSON body with a 'image' field containing base64 data
    const response = await fetch(CUSTOM_MODEL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer YOUR_TOKEN' // If your API requires auth
      },
      body: JSON.stringify({
        image: base64Image
      })
    });

    if (!response.ok) {
      throw new Error(`Model API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Ensure your API returns data matching the ExtractedBillData interface
    // or map it here:
    return {
        billNumber: data.bill_number || null,
        date: data.date || null,
        vendorName: data.vendor_name || null,
        vendorPan: data.vendor_pan || null,
        amount: parseFloat(data.total_amount) || 0,
        vatAmount: parseFloat(data.vat_amount) || 0,
        category: data.category || "Miscellaneous"
    };

  } catch (error) {
    console.error("Failed to connect to custom model:", error);
    throw error;
  }
};
