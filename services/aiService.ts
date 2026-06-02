export interface ExtractedBillData {
  billNumber: string | null;
  date: string | null;
  vendorName: string | null;
  vendorPan: string | null;
  amount: number | null;
  vatAmount: number | null;
  category: string | null;
}

// ⚠️ CHANGES EVERY COLAB / CELL 8 RESTART — update this one line
const NGROK_BASE = "https://inefficient-lael-substructural.ngrok-free.dev";
const CUSTOM_MODEL_API_URL = `${NGROK_BASE}/extract`;
const CONVERT_DATE_URL = `${NGROK_BASE}/convert-date`;

// Helper: base64 → Blob (File)
const base64ToBlob = (base64: string, contentType = 'image/jpeg'): Blob => {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: contentType });
};

export const analyzeBillImage = async (base64Image: string): Promise<ExtractedBillData> => {
  try {
    console.log("Preparing image for Upload...");

    // 1. base64 → File/Blob
    const imageBlob = base64ToBlob(base64Image);

    // 2. FormData (matches FastAPI `file: UploadFile = File(...)`)
    const formData = new FormData();
    formData.append('file', imageBlob, 'receipt.jpg');

    console.log("Sending request to AI API...");
    const response = await fetch(CUSTOM_MODEL_API_URL, {
      method: 'POST',
      headers: {
        // DO NOT set Content-Type — browser sets multipart boundary automatically
        'ngrok-skip-browser-warning': 'true' // bypass ngrok warning page
      },
      body: formData
    });

    const textResponse = await response.text();
    console.log("RAW AI RESPONSE:", textResponse);

    if (!response.ok) {
      throw new Error(`API Error ${response.status}: ${textResponse}`);
    }

    // parse
    let result;
    try {
      result = JSON.parse(textResponse);
    } catch (e) {
      throw new Error("Failed to parse API response. The API might have returned an HTML error.");
    }

    // 3. API error status
    if (result.status === "error") {
      console.error("AI Model Raw Output:", result.raw_output);
      throw new Error("AI Model failed to structure the JSON correctly.");
    }

    // 4. unwrap success
    const data = result.data;

    if (!data.store_info || !data.payment_info || !data.total) {
      console.error("Missing expected keys. Found:", data);
      throw new Error("Incomplete data structure returned from AI.");
    }

    let extractedDate = data.payment_info.date || null;

    // --- Nepali (BS) → English (AD) date conversion ---
    if (extractedDate) {
      try {
        const yearMatch = extractedDate.match(/(\d{4})/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1], 10);
          // BS now ~2082. Use >= 2070 so European AD receipts (2020-2025) are NOT misconverted.
          if (year >= 2070) {
            console.log(`Detected BS Date: ${extractedDate}, attempting conversion...`);
            const convertRes = await fetch(CONVERT_DATE_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
              },
              body: JSON.stringify({ date_bs: extractedDate })
            });
            if (convertRes.ok) {
              const convertData = await convertRes.json();
              extractedDate = convertData.date_ad;
              console.log(`Converted BS date to AD: ${extractedDate}`);
            } else {
              console.warn("Failed to convert BS date, keeping original.");
            }
          }
        }
      } catch (err) {
        console.warn("Error during date conversion:", err);
      }
    }

    return {
      vendorName: data.store_info.name || null,
      vendorPan: data.store_info.tax_id || null,
      date: extractedDate,
      billNumber: data.payment_info.invoice_receipt_id || null,
      amount: parseFloat(data.total.total_price) || null,
      vatAmount: 0,
      category: data.category || "",   // ← was "", now DistilBERT result from API
    };

  } catch (error) {
    console.error("AI Analysis Execution Failed:", error);
    throw error; // BillUpload.tsx handles alert
  }
};