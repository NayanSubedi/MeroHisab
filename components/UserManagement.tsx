import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { UserPlus, Trash2, Mail, Phone, Lock, Search } from 'lucide-react';

interface UserManagementProps {
  staffList: User[];
  onAddStaff: (userData: any) => Promise<void>;
  onRemoveStaff: (id: string) => Promise<void>;
}

const UserManagement: React.FC<UserManagementProps> = ({ staffList, onAddStaff, onRemoveStaff }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STAFF);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        await onAddStaff({
            name,
            email,
            phone,
            password,
            role
        });
        
        setShowAddModal(false);
        // Reset
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setRole(UserRole.STAFF);
    } catch (err: any) {
        setError(err.message || "Failed to add user");
    } finally {
        setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
      if(window.confirm("Are you sure you want to remove this user?")) {
          try {
              await onRemoveStaff(id);
          } catch (e) {
              alert("Failed to remove user");
          }
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
           <p className="text-gray-500 text-sm">Manage access for your staff and accountants.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="mt-4 md:mt-0 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          <UserPlus size={18} className="mr-2" /> Add New User
        </button>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
         <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-50">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                   <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                 {staffList.map((user) => (
                   <tr key={user.id} className="hover:bg-gray-50">
                     <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center">
                         <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                           {user.name.charAt(0)}
                         </div>
                         <div className="ml-4">
                           <div className="text-sm font-medium text-gray-900">{user.name}</div>
                           <div className="text-sm text-gray-500">ID: {user.id.slice(-4)}</div>
                         </div>
                       </div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                         ${user.role === UserRole.OWNER ? 'bg-purple-100 text-purple-800' : 
                           user.role === UserRole.ACCOUNTANT ? 'bg-green-100 text-green-800' : 
                           'bg-gray-100 text-gray-800'}`}>
                         {user.role}
                       </span>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <div className="text-sm text-gray-900 flex items-center"><Mail size={12} className="mr-1 text-gray-400"/> {user.email}</div>
                       <div className="text-sm text-gray-500 flex items-center"><Phone size={12} className="mr-1 text-gray-400"/> {user.phone}</div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                         {user.status}
                       </span>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {user.role !== UserRole.OWNER && (
                          <button onClick={() => handleRemove(user.id)} className="text-red-600 hover:text-red-900">
                            <Trash2 size={18} />
                          </button>
                        )}
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
            {staffList.length === 0 && <div className="p-4 text-center text-gray-500">No staff members found.</div>}
         </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Staff Member</h3>
            {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
            
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Initial Password (Login Credential)</label>
                <div className="relative">
                    <input required type="text" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" placeholder="e.g. staff123" />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                        <Lock size={14} />
                    </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Staff will use this password to login.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assign Role</label>
                <select 
                  value={role} 
                  onChange={e => setRole(e.target.value as UserRole)} 
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value={UserRole.STAFF}>Staff (Upload Bills, Invoice)</option>
                  <option value={UserRole.ACCOUNTANT}>Accountant (Full Financial Access)</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                  Cancel
                </button>
                <button disabled={loading} type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;