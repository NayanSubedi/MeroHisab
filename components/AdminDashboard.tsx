import React, { useState, useEffect } from 'react';
import { BusinessProfile, UserRole, User } from '../types';
import { 
  Building2, Users, TrendingUp, AlertTriangle, Eye, ShieldCheck, 
  Plus, Trash2, CheckCircle, XCircle, RefreshCw, X, MapPin, 
  FileText, UserPlus, Mail, Phone, Lock, Calculator, Search, BadgeCheck, Loader2
} from 'lucide-react';
import { api } from '../services/api';

interface AdminDashboardProps {
  token: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ token }) => {
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessProfile | null>(null);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showBusinessUsers, setShowBusinessUsers] = useState<string | null>(null);
  const [businessUsers, setBusinessUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [verifyingBusiness, setVerifyingBusiness] = useState<BusinessProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isProcessingVerification, setIsProcessingVerification] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0 });

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const data = await api.getAllBusinesses(token);
      const mapped: BusinessProfile[] = data.map((b: any) => ({
        id: b.id, name: b.name, pan: b.pan, address: b.address,
        addressLine1: b.addressLine1, addressLine2: b.addressLine2,
        city: b.city, province: b.province, country: b.country, zipCode: b.zipCode,
        ownerName: b.ownerName, phone: b.phone, email: b.email,
        type: b.type === 'PVT_LTD' ? 'Pvt Ltd' : b.type === 'PARTNERSHIP' ? 'Partnership' : 'Sole Proprietor',
        role: UserRole.OWNER, isVerified: b.isVerified, panPhoto: b.panPhoto,
        taxSystem: b.taxSystem || 'PAN', annualTurnover: b.annualTurnover || 0,
      }));
      setBusinesses(mapped);
      const verified = mapped.filter(b => b.isVerified).length;
      setStats({ total: mapped.length, verified, pending: mapped.length - verified });
    } catch (error) {
      console.error("Failed to fetch businesses", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBusinesses(); }, []);

  const openVerificationModal = (business: BusinessProfile) => {
    setVerifyingBusiness(business);
    setRejectReason('');
    setShowRejectInput(false);
  };

  const handleApprove = async () => {
    if (!verifyingBusiness) return;
    setIsProcessingVerification(true);
    try {
      await api.verifyBusiness(verifyingBusiness.id!, true, token);
      setVerifyingBusiness(null);
      fetchBusinesses();
    } catch (e) { alert("Failed to verify business"); }
    finally { setIsProcessingVerification(false); }
  };

  const handleReject = async () => {
    if (!verifyingBusiness) return;
    if (!rejectReason.trim()) { alert("Please enter a reason for rejection."); return; }
    setIsProcessingVerification(true);
    try {
      await api.verifyBusiness(verifyingBusiness.id!, false, token, rejectReason);
      alert("Business rejected. The reason has been recorded.");
      setVerifyingBusiness(null);
      fetchBusinesses();
    } catch (e) { alert("Failed to reject business"); console.error(e); }
    finally { setIsProcessingVerification(false); }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm("Are you sure you want to revoke verification?")) return;
    try { await api.verifyBusiness(id, false, token); fetchBusinesses(); }
    catch (e) { alert("Failed to update status"); }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm("Are you sure? This deletes the business and all users.")) return;
    try { await api.removeBusiness(id, token); fetchBusinesses(); }
    catch (e) { alert("Failed to delete business"); }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAdmin(adminForm, token);
      alert("Admin created successfully!");
      setShowCreateAdmin(false);
      setAdminForm({ name: '', email: '', phone: '', password: '' });
    } catch (e: any) { console.error(e); alert(`Failed to create admin: ${e.message}`); }
  };

  const handleViewUsers = async (businessId: string) => {
    setShowBusinessUsers(businessId);
    setLoadingUsers(true);
    try { const users = await api.getBusinessUsers(businessId, token); setBusinessUsers(users); }
    catch (e) { alert("Failed to fetch business users"); setShowBusinessUsers(null); }
    finally { setLoadingUsers(false); }
  };

  const filteredBusinesses = businesses.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.pan.includes(searchQuery)
  );
  const pendingBusinesses = filteredBusinesses.filter(b => !b.isVerified);
  const verifiedBusinesses = filteredBusinesses.filter(b => b.isVerified);

  const inputClass = "w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all";

  return (
    <div className="space-y-5 text-gray-900 dark:text-gray-100 pb-6">

      {/* ═════════ MODALS ═════════ */}

      {/* Verification Modal */}
      {verifyingBusiness && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setVerifyingBusiness(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl md:rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="md:hidden flex justify-center pt-3"><div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" /></div>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck size={20} className="text-blue-500" /> Review Registration
                </h3>
                <button onClick={() => setVerifyingBusiness(null)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                <span className="font-semibold text-gray-600 dark:text-gray-300">{verifyingBusiness.name}</span> • PAN: {verifyingBusiness.pan}
              </p>
            </div>
            <div className="p-6">
              {!showRejectInput ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Review details and PAN certificate before verifying.</p>
                  <div className="flex gap-3">
                    <button onClick={handleApprove} disabled={isProcessingVerification}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center transition disabled:opacity-50 active:scale-[0.97]">
                      {isProcessingVerification ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={16} className="mr-2" /> Approve</>}
                    </button>
                    <button onClick={() => setShowRejectInput(true)} disabled={isProcessingVerification}
                      className="flex-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/15 dark:hover:bg-red-900/25 text-red-600 dark:text-red-400 py-3 rounded-xl font-semibold text-sm flex items-center justify-center border border-red-200 dark:border-red-900/30 transition disabled:opacity-50">
                      <XCircle size={16} className="mr-2" /> Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Reason for Rejection *</label>
                    <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g., Blur PAN photo, Mismatched details..."
                      className="w-full h-28 p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500/30 outline-none resize-none" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowRejectInput(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-2.5 rounded-xl font-medium text-sm transition">
                      Back
                    </button>
                    <button onClick={handleReject} disabled={!rejectReason.trim() || isProcessingVerification}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-50">
                      {isProcessingVerification ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAN Certificate Modal */}
      {selectedCertificate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedCertificate(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-500" /> PAN Certificate
              </h3>
              <button onClick={() => setSelectedCertificate(null)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-950 flex items-center justify-center">
              <img src={selectedCertificate} alt="PAN Certificate" className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreateAdmin && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowCreateAdmin(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl md:rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="md:hidden flex justify-center pt-3"><div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" /></div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <UserPlus size={18} className="text-blue-500" /> Create Admin
                </h3>
                <button onClick={() => setShowCreateAdmin(false)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleCreateAdmin} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Name</label>
                  <input required type="text" value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label>
                  <input required type="email" value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</label>
                  <input required type="tel" value={adminForm.phone} onChange={e => setAdminForm({...adminForm, phone: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Password</label>
                  <input required type="password" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} className={inputClass} />
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all active:scale-[0.97]">
                  Create Admin
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Business Users Modal */}
      {showBusinessUsers && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowBusinessUsers(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="md:hidden flex justify-center pt-3"><div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" /></div>
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2"><Users size={18} className="text-purple-500" /> Business Staff</h3>
              <button onClick={() => setShowBusinessUsers(null)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full"><X size={16} className="text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
              ) : businessUsers.length === 0 ? (
                <p className="text-center text-gray-400 py-12 text-sm">No users found for this business.</p>
              ) : (
                <div className="space-y-2">
                  {businessUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 font-bold text-sm">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">{u.name}</p>
                          <p className="text-[10px] text-gray-400">{u.email} • {u.phone}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        u.role === UserRole.OWNER
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Business Detail Modal */}
      {selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedBusiness(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl md:rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-indigo-900 text-white p-5 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  {selectedBusiness.name}
                  {selectedBusiness.isVerified && <BadgeCheck size={18} className="text-blue-400" />}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-slate-300 text-xs font-mono">PAN: {selectedBusiness.pan}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${
                    selectedBusiness.taxSystem === 'VAT' ? 'bg-blue-500/30 text-blue-200' : 'bg-white/10 text-slate-300'
                  }`}>{selectedBusiness.taxSystem}</span>
                </div>
              </div>
              <button onClick={() => setSelectedBusiness(null)} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Owner */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Owner Info</h4>
                  <div className="space-y-2">
                    {[
                      ['Name', selectedBusiness.ownerName],
                      ['Email', selectedBusiness.email],
                      ['Phone', selectedBusiness.phone],
                    ].map(([label, val]) => (
                      <div key={label as string}>
                        <span className="text-[10px] text-gray-400">{label}</span>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Business */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Business Details</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-gray-400">Type</span>
                      <p className="text-sm"><span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold">{selectedBusiness.type}</span></p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400">Status</span>
                      <p className="text-sm font-bold flex items-center gap-1">
                        {selectedBusiness.isVerified ? <><CheckCircle size={12} className="text-emerald-500" /><span className="text-emerald-600">Verified</span></> : <><AlertTriangle size={12} className="text-orange-500" /><span className="text-orange-500">Pending</span></>}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400">Est. Turnover</span>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">NPR {selectedBusiness.annualTurnover?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1"><MapPin size={12} /> Address</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {[
                    ['Line 1', selectedBusiness.addressLine1],
                    ['Line 2', selectedBusiness.addressLine2],
                    ['City', selectedBusiness.city],
                    ['Province', selectedBusiness.province],
                    ['Country', selectedBusiness.country || 'Nepal'],
                    ['Zip', selectedBusiness.zipCode],
                  ].map(([label, val]) => (
                    <div key={label as string}>
                      <span className="text-[10px] text-gray-400">{label}</span>
                      <p className="font-medium text-gray-700 dark:text-gray-200">{val || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex flex-wrap gap-2 justify-end">
              {selectedBusiness.panPhoto && (
                <button onClick={() => setSelectedCertificate(selectedBusiness.panPhoto!)}
                  className="px-4 py-2 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">
                  View PAN Certificate
                </button>
              )}
              <button onClick={() => setSelectedBusiness(null)}
                className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-xl text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-600 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════ HEADER ═════════ */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-12 -mt-12" />
        <div className="absolute bottom-0 left-1/3 w-20 h-20 bg-white/5 rounded-full" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/20 backdrop-blur-sm rounded-xl">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Super Admin</h2>
              <p className="text-xs text-white/50">System overview & verification queue</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreateAdmin(true)}
              className="flex items-center px-3.5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl text-xs font-semibold transition active:scale-95">
              <UserPlus size={14} className="mr-1.5" /> Create Admin
            </button>
            <button onClick={fetchBusinesses}
              className="flex items-center px-3.5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl text-xs font-semibold transition active:scale-95">
              <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ═════════ STATS ═════════ */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-4 -mt-4" />
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded-lg"><Building2 size={14} className="text-blue-500" /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total MSMEs</span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-4 -mt-4" />
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg"><CheckCircle size={14} className="text-emerald-500" /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Verified</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.verified}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full -mr-4 -mt-4" />
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 bg-orange-100 dark:bg-orange-900/20 rounded-lg"><AlertTriangle size={14} className="text-orange-500" /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-2xl font-extrabold text-orange-500">{stats.pending}</p>
        </div>
      </div>

      {/* ═════════ SEARCH ═════════ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center px-4 py-3">
        <Search size={16} className="text-gray-400 mr-3 flex-shrink-0" />
        <input type="text" placeholder="Search by name or PAN..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-none focus:outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400" />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={16} /></button>
        )}
      </div>

      {/* ═════════ PENDING QUEUE ═════════ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden border-l-4 border-l-orange-400">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-orange-50/50 dark:bg-orange-900/5">
          <h3 className="text-sm font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2">
            <AlertTriangle size={16} /> Registration Queue
          </h3>
          <span className="text-[10px] font-bold px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">{pendingBusinesses.length}</span>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-3 space-y-2">
          {pendingBusinesses.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm italic">No pending registrations</p>
          ) : pendingBusinesses.map((biz) => (
            <div key={biz.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3.5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm">{biz.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{biz.name}</p>
                  <p className="text-[10px] text-gray-400">PAN: {biz.pan} • {biz.ownerName}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${biz.taxSystem === 'VAT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-200 text-gray-500'}`}>{biz.taxSystem}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedBusiness(biz)} className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/15 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold">Details</button>
                <button onClick={() => openVerificationModal(biz)} className="flex-1 py-2 bg-emerald-50 dark:bg-emerald-900/15 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold">Verify</button>
                <button onClick={() => handleRemove(biz.id!)} className="py-2 px-3 bg-red-50 dark:bg-red-900/15 text-red-500 rounded-lg text-[10px] font-bold">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/30">
                <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Business / PAN</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Owner</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tax</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {pendingBusinesses.map((biz) => (
                <tr key={biz.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-sm">{biz.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{biz.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">PAN: {biz.pan}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-gray-800 dark:text-white font-medium">{biz.ownerName}</p>
                    <p className="text-[10px] text-gray-400">{biz.email}</p>
                  </td>
                  <td className="px-5 py-3.5"><span className="px-2 py-1 text-[10px] font-bold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{biz.type}</span></td>
                  <td className="px-5 py-3.5"><span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${biz.taxSystem === 'VAT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>{biz.taxSystem}</span></td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => setSelectedBusiness(biz)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition" title="Details"><FileText size={15} /></button>
                      <button onClick={() => openVerificationModal(biz)} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition" title="Verify"><ShieldCheck size={15} /></button>
                      <button onClick={() => handleRemove(biz.id!)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition" title="Remove"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingBusinesses.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm italic">No pending registrations</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═════════ VERIFIED BUSINESSES ═════════ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Building2 size={16} className="text-blue-500" /> Registered Businesses
          </h3>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-3 space-y-2">
          {verifiedBusinesses.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm italic">No verified businesses</p>
          ) : verifiedBusinesses.map((biz) => (
            <div key={biz.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3.5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold text-sm">{biz.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-white truncate flex items-center gap-1">{biz.name} <BadgeCheck size={14} className="text-blue-500 flex-shrink-0" /></p>
                  <p className="text-[10px] text-gray-400">{biz.ownerName} • {biz.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedBusiness(biz)} className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/15 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold">Details</button>
                <button onClick={() => handleViewUsers(biz.id!)} className="flex-1 py-2 bg-purple-50 dark:bg-purple-900/15 text-purple-600 dark:text-purple-400 rounded-lg text-[10px] font-bold">Staff</button>
                <button onClick={() => handleRevoke(biz.id!)} className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-lg text-[10px] font-bold"><ShieldCheck size={12} /></button>
                <button onClick={() => handleRemove(biz.id!)} className="py-2 px-3 bg-red-50 dark:bg-red-900/15 text-red-500 rounded-lg text-[10px] font-bold"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/30">
                <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Business / PAN</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Owner</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tax</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {verifiedBusinesses.map((biz) => (
                <tr key={biz.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold text-sm">{biz.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-1">{biz.name} <BadgeCheck size={14} className="text-blue-500" /></p>
                        <p className="text-[10px] text-gray-400 font-mono">PAN: {biz.pan}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-gray-800 dark:text-white font-medium">{biz.ownerName}</p>
                    <p className="text-[10px] text-gray-400">{biz.email}</p>
                  </td>
                  <td className="px-5 py-3.5"><span className={`px-2 py-1 text-[10px] font-bold rounded-lg border ${biz.taxSystem === 'VAT' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'}`}>{biz.taxSystem}</span></td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                      <CheckCircle size={10} /> Verified
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => setSelectedBusiness(biz)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition" title="Details"><FileText size={15} /></button>
                      <button onClick={() => handleViewUsers(biz.id!)} className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition" title="Staff"><Users size={15} /></button>
                      <button onClick={() => handleRevoke(biz.id!)} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition" title="Revoke"><ShieldCheck size={15} /></button>
                      <button onClick={() => handleRemove(biz.id!)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition" title="Remove"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {verifiedBusinesses.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm italic">No verified businesses</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;