import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { UserPlus, Trash2, Mail, Phone, Lock } from 'lucide-react';
import CustomSelect from './CustomSelect';
import CustomConfirm from './CustomConfirm';

interface UserManagementProps {
  staffList: User[];
  onAddStaff: (userData: any) => Promise<void>;
  onRemoveStaff: (id: string) => Promise<void>;
}

const UserManagement: React.FC<UserManagementProps> = ({ staffList, onAddStaff, onRemoveStaff }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STAFF);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitted(true);
    if (!e.currentTarget.checkValidity()) {
        setError("Please properly fill out the highlighted fields.");
        return;
    }
    
    setLoading(true);
    setError(null);

    try {
        await onAddStaff({ name, email, phone, password, role });
        setShowAddModal(false);
        // Reset
        setName(''); setEmail(''); setPhone(''); setPassword(''); setRole(UserRole.STAFF);
    } catch (err: any) {
        setError(err.message || "Failed to add user");
    } finally {
        setLoading(false);
    }
  };

  const handleRemove = (id: string) => {
      setConfirmDelete({ isOpen: true, id });
  };

  const confirmRemove = async () => {
    if (!confirmDelete.id) return;
    try {
        await onRemoveStaff(confirmDelete.id);
        setConfirmDelete({ isOpen: false, id: null });
    } catch (e) {
        setError("Failed to remove user");
        setConfirmDelete({ isOpen: false, id: null });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* HEADER: Stacked on mobile, row on tablet+ */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
           <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">User Management</h2>
           <p className="text-gray-500 dark:text-gray-400 text-sm">Manage access for your staff and accountants.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto flex justify-center items-center px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          <UserPlus size={18} className="mr-2" /> Add New User
        </button>
      </div>

      {/* CONTENT AREA */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
         
         {/* --- MOBILE VIEW: Cards --- */}
         <div className="block md:hidden">
            {staffList.length === 0 ? (
               <div className="p-6 text-center text-gray-500 dark:text-gray-400">No staff members found.</div>
            ) : (
               <div className="divide-y divide-gray-300 dark:divide-gray-700">
                 {staffList.map((user) => (
                   <div key={user.id} className="p-4 space-y-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                     
                     <div className="flex justify-between items-start">
                       <div className="flex items-center space-x-3">
                         <div className="h-10 w-10 flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-200 font-bold">
                           {user.name.charAt(0)}
                         </div>
                         <div>
                           <div className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</div>
                           <div className="text-xs text-gray-500 dark:text-gray-400">ID: {user.id.slice(-4)}</div>
                         </div>
                       </div>
                       {user.role !== UserRole.OWNER && (
                          <button 
                            onClick={() => handleRemove(user.id)} 
                            className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                       )}
                     </div>

                     <div className="grid grid-cols-2 gap-2 text-sm">
                       <div>
                         <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Role</span>
                         <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                           ${user.role === UserRole.OWNER ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 
                             user.role === UserRole.ACCOUNTANT ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                             'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                           {user.role}
                         </span>
                       </div>
                       <div>
                         <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</span>
                         <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                           {user.status}
                         </span>
                       </div>
                     </div>

                     <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2">
                       <div className="text-xs text-gray-700 dark:text-gray-300 flex items-center">
                         <Mail size={14} className="mr-2 text-gray-400 flex-shrink-0"/> 
                         <span className="truncate">{user.email}</span>
                       </div>
                       <div className="text-xs text-gray-700 dark:text-gray-300 flex items-center">
                         <Phone size={14} className="mr-2 text-gray-400 flex-shrink-0"/> 
                         {user.phone}
                       </div>
                     </div>

                   </div>
                 ))}
               </div>
            )}
         </div>

         {/* --- DESKTOP VIEW: Table --- */}
         <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
               <thead className="bg-gray-50 dark:bg-gray-700">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                   <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                 </tr>
               </thead>
               <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-300 dark:divide-gray-700">
                 {staffList.map((user) => (
                   <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                     <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center">
                         <div className="h-10 w-10 flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-200 font-bold">
                           {user.name.charAt(0)}
                         </div>
                         <div className="ml-4">
                           <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                           <div className="text-sm text-gray-500 dark:text-gray-400">ID: {user.id.slice(-4)}</div>
                         </div>
                       </div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                         ${user.role === UserRole.OWNER ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 
                           user.role === UserRole.ACCOUNTANT ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                           'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                         {user.role}
                       </span>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <div className="text-sm text-gray-900 dark:text-gray-200 flex items-center mb-1"><Mail size={12} className="mr-2 text-gray-400"/> {user.email}</div>
                       <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center"><Phone size={12} className="mr-2 text-gray-400"/> {user.phone}</div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                         {user.status}
                       </span>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {user.role !== UserRole.OWNER && (
                          <button onClick={() => handleRemove(user.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        )}
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
            {staffList.length === 0 && <div className="p-6 text-center text-gray-500 dark:text-gray-400">No staff members found.</div>}
         </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6">
          {/* Added max-h and overflow-y-auto to handle small screens/keyboards */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto transition-colors">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add New Staff Member</h3>
            {error && <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded">{error}</div>}
            
            <form onSubmit={handleAdd} noValidate className={`space-y-4 ${isSubmitted ? 'was-validated' : ''}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input 
                  required 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 sm:py-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <input 
                  required 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 sm:py-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input 
                  required 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 sm:py-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Initial Password</label>
                <div className="relative">
                    <input 
                      required 
                      type="text" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 sm:py-2 pr-10 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                      placeholder="e.g. staff123" 
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                        <Lock size={16} />
                    </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Staff will use this password to login.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Role</label>
                <div className="mt-1">
                  <CustomSelect
                      value={role}
                      onChange={(val) => setRole(val as UserRole)}
                      options={[
                          { value: UserRole.STAFF, label: 'Staff (Upload Bills, Invoice)' },
                          { value: UserRole.ACCOUNTANT, label: 'Accountant (Full Access)' }
                      ]}
                  />
                </div>
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row justify-end sm:space-x-3 mt-6 gap-3 sm:gap-0">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button 
                  disabled={loading} 
                  type="submit" 
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {loading ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog */}
      <CustomConfirm
        isOpen={confirmDelete.isOpen}
        title="Remove Staff Member"
        message="Are you sure you want to remove this user? They will lose access to the system immediately."
        onConfirm={confirmRemove}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
        type="danger"
        confirmText="Remove User"
      />
    </div>
  );
};

export default UserManagement;