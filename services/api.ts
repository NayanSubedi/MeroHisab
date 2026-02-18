// API Service Configuration
import { Capacitor } from '@capacitor/core';

const getApiUrl = () => {
  // 1. Check if running on a native device (Android or iOS)
  if (Capacitor.isNativePlatform()) {
    // IF EMULATOR: Use 10.0.2.2
    // IF REAL DEVICE: Use your Computer's LAN IP (e.g., 192.168.1.64)
    
    // Suggestion: Just use your computer's LAN IP for everything native to be safe.
    // Replace '192.168.1.64' with your actual PC IP address.
    return "http://192.168.1.64:5000/api"; 
  }

  // 2. Running in Browser (localhost development)
  return "http://localhost:5000/api";
};

export const API_URL = getApiUrl();
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
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  login: async (data: any) => {
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