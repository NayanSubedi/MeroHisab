import React, { useState, useEffect } from 'react';
import { BusinessProfile, UserRole, User } from '../types';
import { Building2, Users, TrendingUp, AlertTriangle, Eye, ShieldCheck, Plus, Trash2, CheckCircle, XCircle, RefreshCw, X, MapPin, FileText, UserPlus, Mail, Phone, Lock, Calculator } from 'lucide-react';
import { api } from '../services/api';

interface AdminDashboardProps {
  token: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ token }) => {
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessProfile | null>(null);
  
  // New States
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', phone: '', password: '' });
  
  const [showBusinessUsers, setShowBusinessUsers] = useState<string | null>(null);
  const [businessUsers, setBusinessUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0 });

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
        const data = await api.getAllBusinesses(token);
        // Map DB structure to Frontend Type
        const mapped: BusinessProfile[] = data.map((b: any) => ({
            id: b.id,
            name: b.name,
            pan: b.pan,
            address: b.address,
            // Granular Address Mapping
            addressLine1: b.addressLine1,
            addressLine2: b.addressLine2,
            city: b.city,
            province: b.province,
            country: b.country,
            zipCode: b.zipCode,

            ownerName: b.ownerName,
            phone: b.phone,
            email: b.email,
            type: b.type === 'PVT_LTD' ? 'Pvt Ltd' : b.type === 'PARTNERSHIP' ? 'Partnership' : 'Sole Proprietor',
            role: UserRole.OWNER,
            isVerified: b.isVerified,
            panPhoto: b.panPhoto,
            // Tax Logic
            taxSystem: b.taxSystem || 'PAN',
            annualTurnover: b.annualTurnover || 0,
        }));
        setBusinesses(mapped);
        
        // Calc Stats
        const verified = mapped.filter(b => b.isVerified).length;
        setStats({
            total: mapped.length,
            verified,
            pending: mapped.length - verified
        });

    } catch (error) {
        console.error("Failed to fetch businesses", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleVerify = async (id: string, currentStatus: boolean | undefined) => {
    try {
        await api.verifyBusiness(id, !currentStatus, token);
        fetchBusinesses(); // Refresh list
    } catch (e) {
        alert("Failed to update verification status");
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm("Are you sure? This deletes the business and all users.")) return;
    try {
        await api.removeBusiness(id, token);
        fetchBusinesses();
    } catch (e) {
        alert("Failed to delete business");
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await api.createAdmin(adminForm, token);
          alert("Admin created successfully!");
          setShowCreateAdmin(false);
          setAdminForm({ name: '', email: '', phone: '', password: '' });
      } catch (e: any) {
          console.error(e);
          alert(`Failed to create admin: ${e.message}`);
      }
  };

  const handleViewUsers = async (businessId: string) => {
      setShowBusinessUsers(businessId);
      setLoadingUsers(true);
      try {
          const users = await api.getBusinessUsers(businessId, token);
          setBusinessUsers(users);
      } catch (e) {
          alert("Failed to fetch business users");
          setShowBusinessUsers(null);
      } finally {
          setLoadingUsers(false);
      }
  };

  const pendingBusinesses = businesses.filter(b => !b.isVerified);
  const verifiedBusinesses = businesses.filter(b => b.isVerified);

  return (
    <div className="space-y-6">
       {/* Modals */}
       {selectedCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4" onClick={() => setSelectedCertificate(null)}>
            <div className="bg-white rounded-xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <ShieldCheck className="mr-2 text-blue-600" size={20}/> 
                        PAN Registration Certificate
                    </h3>
                    <button onClick={() => setSelectedCertificate(null)} className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-gray-900 flex items-center justify-center">
                    <img src={selectedCertificate} alt="PAN Certificate" className="max-w-full max-h-full object-contain rounded shadow-lg" />
                </div>
            </div>
        </div>
       )}

       {showCreateAdmin && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm" onClick={() => setShowCreateAdmin(false)}>
               <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="text-lg font-bold text-gray-800 dark:text-white">Create New Admin</h3>
                       <button onClick={() => setShowCreateAdmin(false)} className="text-gray-500 hover:text-gray-700">
                           <X size={20} />
                       </button>
                   </div>
                   <form onSubmit={handleCreateAdmin} className="space-y-4">
                       <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                           <input required type="text" value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 border" />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                           <input required type="email" value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 border" />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                           <input required type="tel" value={adminForm.phone} onChange={e => setAdminForm({...adminForm, phone: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 border" />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                           <input required type="password" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 border" />
                       </div>
                       <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">Create Admin</button>
                   </form>
               </div>
           </div>
       )}

       {showBusinessUsers && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm" onClick={() => setShowBusinessUsers(null)}>
               <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="text-lg font-bold text-gray-800 dark:text-white">Business Staff</h3>
                       <button onClick={() => setShowBusinessUsers(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
                   </div>
                   <div className="flex-1 overflow-auto">
                       {loadingUsers ? (
                           <p className="text-center text-gray-500">Loading users...</p>
                       ) : businessUsers.length === 0 ? (
                           <p className="text-center text-gray-500 py-10">No users found for this business.</p>
                       ) : (
                           <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                               <thead className="bg-gray-50 dark:bg-gray-700/50">
                                   <tr>
                                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Role</th>
                                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email/Phone</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                   {businessUsers.map(u => (
                                       <tr key={u.id}>
                                           <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{u.name}</td>
                                           <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                               <span className={`px-2 py-0.5 rounded text-xs ${u.role === UserRole.OWNER ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                                   {u.role}
                                               </span>
                                           </td>
                                           <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                               <div>{u.email}</div>
                                               <div className="text-xs">{u.phone}</div>
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       )}
                   </div>
               </div>
           </div>
       )}

       {selectedBusiness && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4" onClick={() => setSelectedBusiness(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold">{selectedBusiness.name}</h2>
                        <div className="flex items-center space-x-3 mt-1">
                            <span className="text-slate-300 text-sm">PAN: {selectedBusiness.pan}</span>
                            <span className={`text-xs px-2 py-0.5 rounded font-bold ${selectedBusiness.taxSystem === 'VAT' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-200'}`}>
                                {selectedBusiness.taxSystem}
                            </span>
                        </div>
                    </div>
                    <button onClick={() => setSelectedBusiness(null)} className="text-white hover:text-gray-300">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6 grid grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Owner Information</h4>
                        <div className="space-y-2">
                             <div>
                                <span className="text-sm text-gray-500 block">Name</span>
                                <span className="font-medium">{selectedBusiness.ownerName}</span>
                             </div>
                             <div>
                                <span className="text-sm text-gray-500 block">Email</span>
                                <span className="font-medium">{selectedBusiness.email}</span>
                             </div>
                             <div>
                                <span className="text-sm text-gray-500 block">Phone</span>
                                <span className="font-medium">{selectedBusiness.phone}</span>
                             </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Business Details</h4>
                        <div className="space-y-2">
                             <div>
                                <span className="text-sm text-gray-500 block">Type</span>
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">{selectedBusiness.type}</span>
                             </div>
                             <div>
                                <span className="text-sm text-gray-500 block">Status</span>
                                {selectedBusiness.isVerified ? (
                                    <span className="text-green-600 font-bold flex items-center"><CheckCircle size={14} className="mr-1"/> Verified</span>
                                ) : (
                                    <span className="text-orange-600 font-bold flex items-center"><AlertTriangle size={14} className="mr-1"/> Pending</span>
                                )}
                             </div>
                             <div>
                                <span className="text-sm text-gray-500 block">Turnover (Est.)</span>
                                <span className="font-medium">NPR {selectedBusiness.annualTurnover?.toLocaleString() || '0'}</span>
                             </div>
                        </div>
                    </div>
                    <div className="col-span-2 border-t pt-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center">
                            <MapPin size={14} className="mr-1"/> Full Address
                        </h4>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm space-y-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-gray-500 block text-xs">Address Line 1</span>
                                    <span className="font-medium text-gray-800">{selectedBusiness.addressLine1 || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-xs">Address Line 2</span>
                                    <span className="font-medium text-gray-800">{selectedBusiness.addressLine2 || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-xs">City</span>
                                    <span className="font-medium text-gray-800">{selectedBusiness.city || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-xs">Province</span>
                                    <span className="font-medium text-gray-800">{selectedBusiness.province || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-xs">Country</span>
                                    <span className="font-medium text-gray-800">{selectedBusiness.country || 'Nepal'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-xs">Zip Code</span>
                                    <span className="font-medium text-gray-800">{selectedBusiness.zipCode || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 flex justify-end">
                     {selectedBusiness.panPhoto && (
                         <button 
                            onClick={() => setSelectedCertificate(selectedBusiness.panPhoto!)}
                            className="mr-3 px-4 py-2 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50"
                         >
                            View PAN Certificate
                         </button>
                     )}
                     <button 
                        onClick={() => setSelectedBusiness(null)}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
                     >
                        Close Details
                     </button>
                </div>
            </div>
         </div>
       )}

       <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
               <ShieldCheck className="mr-3" size={32} />
               Super Admin Dashboard
            </h2>
            <p className="text-slate-300 mt-1">System-wide overview and verification queue.</p>
          </div>
          <div className="flex space-x-3">
              <button 
                onClick={() => setShowCreateAdmin(true)}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <UserPlus size={20} className="mr-2" /> Create Admin
              </button>
              <button 
                onClick={fetchBusinesses}
                className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                <RefreshCw size={20} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
          </div>
       </div>

       {/* System Stats */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-sm font-medium text-gray-500">Registered MSMEs</p>
                   <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</h3>
                </div>
                <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                   <Building2 size={24} />
                </div>
             </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-sm font-medium text-gray-500">Verified Businesses</p>
                   <h3 className="text-2xl font-bold text-green-600 mt-1">{stats.verified}</h3>
                </div>
                <div className="p-3 bg-green-100 rounded-full text-green-600">
                   <CheckCircle size={24} />
                </div>
             </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-sm font-medium text-gray-500">Pending Verification</p>
                   <h3 className="text-2xl font-bold text-orange-500 mt-1">{stats.pending}</h3>
                </div>
                <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                   <AlertTriangle size={24} />
                </div>
             </div>
          </div>
       </div>

       {/* Pending Registrations Table */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 border-l-4 border-l-orange-500">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-orange-50">
             <h3 className="text-lg font-bold text-orange-800 flex items-center">
                 <AlertTriangle size={20} className="mr-2"/> Registration Queue (New)
             </h3>
             <span className="text-xs font-semibold px-2 py-1 bg-orange-200 text-orange-800 rounded-full">{pendingBusinesses.length} Pending</span>
          </div>
          <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business / PAN</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner / Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Mode</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingBusinesses.map((biz) => (
                    <tr key={biz.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mr-3">
                                {biz.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{biz.name}</div>
                                <div className="text-xs text-gray-500">PAN: {biz.pan}</div>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm text-gray-900">{biz.ownerName}</div>
                         <div className="text-xs text-gray-500">{biz.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            {biz.type}
                         </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`px-2 py-1 text-xs font-bold rounded ${
                            biz.taxSystem === 'VAT' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-600'
                         }`}>
                            {biz.taxSystem}
                         </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                         <div className="flex items-center justify-center space-x-3">
                            <button onClick={() => setSelectedBusiness(biz)} className="p-1 rounded text-blue-600 hover:bg-blue-50" title="View Full Details"><FileText size={18} /></button>
                            <button onClick={() => handleVerify(biz.id!, biz.isVerified)} className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50" title="Verify Business"><ShieldCheck size={18} /></button>
                             <button onClick={() => handleRemove(biz.id!)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Remove Business"><Trash2 size={18} /></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {pendingBusinesses.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">No pending registrations.</td></tr>
                  )}
                </tbody>
             </table>
          </div>
       </div>

       {/* All Businesses Table */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
             <h3 className="text-lg font-bold text-gray-800 flex items-center">
                 <Building2 size={20} className="mr-2"/> Registered Businesses
             </h3>
          </div>
          <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business / PAN</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner / Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Mode</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {verifiedBusinesses.map((biz) => (
                    <tr key={biz.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mr-3">
                                {biz.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{biz.name}</div>
                                <div className="text-xs text-gray-500">PAN: {biz.pan}</div>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm text-gray-900">{biz.ownerName}</div>
                         <div className="text-xs text-gray-500">{biz.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                            biz.taxSystem === 'VAT' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                            {biz.taxSystem}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                             <CheckCircle size={12} className="mr-1" /> Verified
                         </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                         <div className="flex items-center justify-center space-x-3">
                            <button onClick={() => setSelectedBusiness(biz)} className="p-1 rounded text-blue-600 hover:bg-blue-50" title="View Full Details"><FileText size={18} /></button>
                            <button onClick={() => handleViewUsers(biz.id!)} className="p-1 rounded text-purple-600 hover:bg-purple-50" title="View Staff"><Users size={18} /></button>
                            <button onClick={() => handleVerify(biz.id!, biz.isVerified)} className="p-1 rounded text-green-600 hover:bg-green-50" title="Revoke Verification"><ShieldCheck size={18} /></button>
                            <button onClick={() => handleRemove(biz.id!)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Remove Business"><Trash2 size={18} /></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {verifiedBusinesses.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">No verified businesses found.</td></tr>
                  )}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
};

export default AdminDashboard;