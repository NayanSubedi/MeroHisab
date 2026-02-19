
// API Service Configuration

// ---------------------------------------------------------------------------
// IMPORTANT FOR RENDER DEPLOYMENT:
// 
// 1. Go to your Render Dashboard (dashboard.render.com).
// 2. Select your Web Service.
// 3. Copy the URL found at the top left (it looks like https://something.onrender.com).
// 4. Paste it into the PROD_URL variable below.
// ---------------------------------------------------------------------------

const PROD_URL = 'https://merohisab-euxk.onrender.com/api'; // <--- REPLACE WITH YOUR RENDER URL

// Fallback for local development
const LOCAL_IP = '192.168.1.66'; // Your local computer IP
const PORT = '5000';

// Logic to select and sanitize the correct URL
const isRenderUrlConfigured = PROD_URL.includes('onrender.com') && !PROD_URL.includes('your-app-name');

let baseUrl = `http://${LOCAL_IP}:${PORT}/api`;

if (isRenderUrlConfigured) {
    baseUrl = PROD_URL;
}

// 1. Determine base URL (Env > Render Config > Local Fallback)
let determinedUrl = (import.meta as any).env?.VITE_API_URL || baseUrl;

// 2. Sanitize: Remove trailing slashes
determinedUrl = determinedUrl.replace(/\/+$/, '');

// 3. FORCE append /api if not present
// This fixes the "Route POST /auth/login not found" error by ensuring we hit /api/auth/login
if (!determinedUrl.endsWith('/api')) {
    determinedUrl = `${determinedUrl}/api`;
}

const API_URL = determinedUrl;

console.log("-----------------------------------");
console.log("FINAL API URL:", API_URL);
console.log("If you see 404 errors, check if this URL is correct.");
console.log("-----------------------------------");

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const err = await response.json();
            const error: any = new Error(err.message || 'API Error');
            error.code = err.code;
            throw error;
        } else {
            const text = await response.text();
            throw new Error(`Server Error (${response.status}): ${text.slice(0, 100)}`);
        }
    }
    return response.json();
};

export const api = {
  // Auth
  register: async (data: any) => {
    // Debug log
    console.log(`POST request to: ${API_URL}/auth/register`);
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  login: async (data: any) => {
    // Debug log
    console.log(`POST request to: ${API_URL}/auth/login`);
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  updateProfile: async (data: any, token: string) => {
    const response = await fetch(`${API_URL}/user/profile`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  // Admin
  getAllBusinesses: async (token: string) => {
    const response = await fetch(`${API_URL}/admin/businesses`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  getAllSystemUsers: async (token: string) => {
    const response = await fetch(`${API_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },
  
  createAdmin: async (data: any, token: string) => {
    const response = await fetch(`${API_URL}/admin/create-admin`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  getBusinessUsers: async (businessId: string, token: string) => {
      const response = await fetch(`${API_URL}/admin/business/${businessId}/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      return handleResponse(response);
  },

  verifyBusiness: async (id: string, isVerified: boolean, token: string) => {
    const response = await fetch(`${API_URL}/admin/verify/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ isVerified })
    });
    return handleResponse(response);
  },

  removeBusiness: async (id: string, token: string) => {
    const response = await fetch(`${API_URL}/admin/business/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  // Transactions
  getTransactions: async (token: string) => {
    const response = await fetch(`${API_URL}/transactions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  createTransaction: async (data: any, token: string) => {
    const response = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  deleteTransaction: async (id: string, token: string) => {
      const response = await fetch(`${API_URL}/transactions/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
      });
      return handleResponse(response);
  },

  // Staff Management
  getStaff: async (token: string) => {
    const response = await fetch(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  createStaff: async (data: any, token: string) => {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  deleteStaff: async (id: string, token: string) => {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  }
};
