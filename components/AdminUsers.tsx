import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Mail, Phone, BadgeCheck, 
  RefreshCw, AlertCircle, Trash2, Key, X 
} from 'lucide-react';
import { api } from '../services/api';
import { UserRole } from '../types';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: string;
  businessId: string | null;
  business?: {
    name: string;
    pan: string;
  } | null;
  createdAt: string;
}

interface AdminUsersProps {
  token: string;
}

const AdminUsers: React.FC<AdminUsersProps> = ({ token }) => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Password Edit State
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    // Define Super Admin (Hardcoded representation)
    const superAdmin: SystemUser = {
        id: 'super-admin-sys',
        name: 'Super Admin',
        email: 'admin@merohisab.com',
        phone: 'N/A',
        role: UserRole.ADMIN,
        status: 'Active',
        businessId: null,
        business: null,
        createdAt: new Date().toISOString()
    };

    try {
      const data = await api.getAllSystemUsers(token);
      setUsers([superAdmin, ...data]);
    } catch (error) {
      console.error("Failed to fetch users", error);
      setError("Failed to load user list. Please check your connection.");
      setUsers([superAdmin]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle User Deletion
  const handleDelete = async (user: SystemUser) => {
    if (user.id === 'super-admin-sys') return;
    
    if (!window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setError(null);
      setSuccessMsg(null);
      // NOTE: You need to implement deleteSystemUser in your api.ts
      await api.deleteSystemUser(user.id, token);
      
      setSuccessMsg(`User ${user.name} deleted successfully.`);
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error("Failed to delete user", err);
      setError("Failed to delete user. They might be tied to existing records.");
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !newPassword) return;

    try {
      setActionLoading(true);
      setError(null);
      setSuccessMsg(null);
      
      // NOTE: You need to implement updateSystemUserPassword in your api.ts
      await api.updateSystemUserPassword(editingUser.id, newPassword, token);
      
      setSuccessMsg(`Password for ${editingUser.name} updated successfully.`);
      setEditingUser(null);
      setNewPassword('');
    } catch (err) {
      console.error("Failed to update password", err);
      setError("Failed to update password. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-lg text-white">
                <Users size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">System Admins</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage system administrators with access to the dashboard.</p>
            </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search admins..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
            </div>
            <button 
                onClick={fetchUsers} 
                className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                title="Refresh"
            >
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
        </div>
      </div>

      {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-center text-red-700 dark:text-red-300">
              <AlertCircle size={20} className="mr-2" />
              {error}
          </div>
      )}

      {successMsg && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-4 rounded-lg flex items-center text-green-700 dark:text-green-300">
              <BadgeCheck size={20} className="mr-2" />
              {successMsg}
          </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Admin Details</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                                                {user.name}
                                                {user.role === UserRole.ADMIN && <BadgeCheck size={14} className="ml-1 text-blue-500" />}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-0.5">
                                                <Mail size={12} className="mr-1" /> {user.email}
                                            </div>
                                            {user.phone && user.phone !== 'N/A' && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-0.5">
                                                    <Phone size={12} className="mr-1" /> {user.phone}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full border bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    {user.status === 'Active' ? (
                                        <span className="text-green-600 dark:text-green-400 text-xs font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">Active</span>
                                    ) : (
                                        <span className="text-gray-500 text-xs font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{user.status || 'Inactive'}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {user.id !== 'super-admin-sys' ? (
                                      <div className="flex items-center justify-end space-x-3">
                                        <button
                                          onClick={() => setEditingUser(user)}
                                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                                          title="Edit Password"
                                        >
                                          <Key size={18} />
                                        </button>
                                        <button
                                          onClick={() => handleDelete(user)}
                                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                          title="Delete Admin"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">System Protected</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                {loading ? 'Loading admins...' : 'No system admins found.'}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
            <span>Showing {filteredUsers.length} admins</span>
            <span>Sorted by newest</span>
        </div>
      </div>

      {/* Password Reset Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                <Key className="mr-2" size={20} />
                Reset Password
              </h3>
              <button 
                onClick={() => { setEditingUser(null); setNewPassword(''); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdatePassword} className="p-5 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-sm text-gray-600 dark:text-gray-300 mb-4">
                You are changing the password for <span className="font-bold">{editingUser.name}</span> ({editingUser.email}).
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter new password"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setEditingUser(null); setNewPassword(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !newPassword}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center"
                >
                  {actionLoading ? (
                    <><RefreshCw size={16} className="animate-spin mr-2" /> Saving...</>
                  ) : (
                    'Save Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;