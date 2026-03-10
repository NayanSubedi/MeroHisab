export interface ExtractedBillData {
  billNumber: string | null;
  date: string | null;
  vendorName: string | null;
  vendorPan: string | null;
  amount: number | null;
  vatAmount: number | null;
  category: string | null;
}

const CUSTOM_MODEL_API_URL = "https://inefficient-lael-substructural.ngrok-free.dev/api/extract";

// Helper function to convert base64 to a Blob (File)
const base64ToBlob = (base64: string, contentType = 'image/jpeg'): Blob => {
  const byteCharacters = atob(base64);
  const byteArrays =[];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
};

export const analyzeBillImage = async (base64Image: string): Promise<ExtractedBillData> => {
  try {
    console.log("Preparing image for Upload...");

    // 1. Convert Base64 back to a File/Blob
    const imageBlob = base64ToBlob(base64Image);
    
    // 2. Create FormData (This matches `file: UploadFile = File(...)` in Python)
    const formData = new FormData();
    formData.append('file', imageBlob, 'receipt.jpg');

    console.log("Sending request to AI API...");
    const response = await fetch(CUSTOM_MODEL_API_URL, {
      method: 'POST',
      headers: {
        // DO NOT set 'Content-Type': 'application/json' here!
        // The browser will automatically set it to multipart/form-data with the correct boundaries.
        'ngrok-skip-browser-warning': 'true' // Bypasses ngrok warning screen
      },
      body: formData // Sending as a File upload
    });

    const textResponse = await response.text();
    console.log("RAW AI RESPONSE:", textResponse); 

    if (!response.ok) {
      throw new Error(`API Error ${response.status}: ${textResponse}`);
    }

    // Parse the response
    let result;
    try {
      result = JSON.parse(textResponse);
    } catch (e) {
      throw new Error("Failed to parse API response. The API might have returned an HTML error.");
    }

    // 3. Handle Python API's error status
    if (result.status === "error") {
      console.error("AI Model Raw Output:", result.raw_output);
      throw new Error("AI Model failed to structure the JSON correctly.");
    }

    // 4. Extract data from the Python API's success wrapper
    const data = result.data;

    // Validate structure
    if (!data.store_info || !data.payment_info || !data.total) {
      console.error("Missing expected keys. Found:", data);
      throw new Error("Incomplete data structure returned from AI.");
    }

    return {
        vendorName: data.store_info.name || null,
        vendorPan: data.store_info.tax_id || null,
        date: data.payment_info.date || null,
        billNumber: data.payment_info.invoice_receipt_id || null,
        amount: parseFloat(data.total.total_price) || null,
        vatAmount: 0, 
        category: "PURCHASE" 
    };

  } catch (error) {
    console.error("AI Analysis Execution Failed:", error);
    throw error; // Let BillUpload.tsx handle the alert
  }
};