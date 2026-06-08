// API Service Configuration

// ---------------------------------------------------------------------------
// IMPORTANT FOR RENDER DEPLOYMENT:
// ---------------------------------------------------------------------------

const baseUrl = 'http://localhost:5000/api';
let determinedUrl = (import.meta as any).env?.VITE_API_URL || baseUrl;

// Sanitize: Remove trailing slashes
determinedUrl = determinedUrl.replace(/\/+$/, '');

// FORCE append /api if not present
if (!determinedUrl.endsWith('/api')) {
    determinedUrl = `${determinedUrl}/api`;
}

const API_URL = determinedUrl;
console.log("FINAL API URL:", API_URL);

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        if (response.status === 401) {
            window.dispatchEvent(new Event('auth-expired'));
        }
        
        // Create an error object
        const error: any = new Error();
        // Attach the status code (Critical for detecting 401)
        error.status = response.status;
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const err = await response.json();
            error.message = err.message || 'API Error';
            error.code = err.code;
        } else {
            const text = await response.text();
            error.message = `Server Error (${response.status}): ${text.slice(0, 100)}`;
        }
        throw error;
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

  getProfile: async (token: string) => {
    const response = await fetch(`${API_URL}/user/profile`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
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

  // ==========================================
  // Admin Endpoints
  // ==========================================
  getAllBusinesses: async (token: string) => {
    const response = await fetch(`${API_URL}/admin/businesses`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  getAuditLogs: async (token: string) => {
    const response = await fetch(`${API_URL}/admin/audit-logs`, {
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

  // NEW: Delete a System Admin
  deleteSystemUser: async (id: string, token: string) => {
    const response = await fetch(`${API_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  // NEW: Update a System Admin Password
  updateSystemUserPassword: async (id: string, password: string, token: string) => {
    const response = await fetch(`${API_URL}/admin/users/${id}/password`, {
      method: 'PATCH', // Using PATCH since we are only updating a specific field
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ password })
    });
    return handleResponse(response);
  },

  getBusinessUsers: async (businessId: string, token: string) => {
      const response = await fetch(`${API_URL}/admin/business/${businessId}/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      return handleResponse(response);
  },

verifyBusiness: async (id: string, isVerified: boolean, token: string, reason?: string) => {
    const response = await fetch(`${API_URL}/admin/verify/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ 
          isVerified, 
          rejectionReason: reason // Send the reason to backend
      })
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

  // ==========================================
  // Transactions
  // ==========================================
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
updateTransaction: async (id: string, data: any, token: string) => {
    const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: 'PUT',
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

  // ==========================================
  // Staff Management
  // ==========================================
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