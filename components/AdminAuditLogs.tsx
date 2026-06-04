import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Trash2, KeyRound, UserMinus, UserPlus, FileWarning, Search, Calendar, RefreshCcw } from 'lucide-react';
import { api } from '../services/api';

interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  details: string;
  targetId?: string;
  createdAt: string;
}

interface AdminAuditLogsProps {
  token: string;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'VERIFY_BUSINESS': return <ShieldCheck size={18} className="text-emerald-500" />;
    case 'REJECT_BUSINESS': return <FileWarning size={18} className="text-orange-500" />;
    case 'DELETE_BUSINESS': return <Trash2 size={18} className="text-red-500" />;
    case 'CREATE_ADMIN': return <UserPlus size={18} className="text-blue-500" />;
    case 'DELETE_USER': return <UserMinus size={18} className="text-rose-500" />;
    case 'CHANGE_PASSWORD': return <KeyRound size={18} className="text-purple-500" />;
    default: return <Activity size={18} className="text-gray-500" />;
  }
};

const getActionLabel = (action: string) => {
  return action.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
};

const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({ token }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(token);
      setLogs(data);
    } catch (e) {
      console.error("Failed to fetch audit logs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchQuery.toLowerCase()) || log.adminName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Activity size={160} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black mb-2 flex items-center gap-3">
              <Activity className="text-blue-400" size={32} />
              Audit Logs
            </h1>
            <p className="text-slate-300 text-sm font-medium">Track administrative actions and system security events.</p>
          </div>
          <button onClick={fetchLogs} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition text-sm font-bold backdrop-blur-md">
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by details or admin name..."
            className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="w-full md:w-48 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
        >
          <option value="ALL">All Actions</option>
          <option value="VERIFY_BUSINESS">Verify Business</option>
          <option value="REJECT_BUSINESS">Reject Business</option>
          <option value="DELETE_BUSINESS">Delete Business</option>
          <option value="CREATE_ADMIN">Create Admin</option>
          <option value="DELETE_USER">Delete User</option>
          <option value="CHANGE_PASSWORD">Change Password</option>
        </select>
      </div>

      {/* Timeline view */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8">
        
        {loading ? (
          <div className="flex justify-center items-center py-20 text-gray-400">
            <RefreshCcw size={24} className="animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-700">
              <Activity size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">No standard entries match your search criteria.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-gray-50 dark:border-gray-700/50 ml-4 md:ml-8 space-y-8 pl-6 md:pl-10 py-2">
            {filteredLogs.map(log => {
              const date = new Date(log.createdAt);
              
              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Badge */}
                  <div className="absolute -left-10 md:-left-14 top-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    {getActionIcon(log.action)}
                  </div>
                  
                  {/* Content Box */}
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-5 border border-transparent group-hover:border-blue-100 dark:group-hover:border-blue-900/30 transition-colors">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                           <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gray-200/50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                             {getActionLabel(log.action)}
                           </span>
                           <span className="text-xs text-gray-400 font-bold flex items-center gap-1"><Calendar size={12}/> {date.toLocaleDateString()} {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">By</span>
                          <span className="text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-md">
                            {log.adminName}
                          </span>
                        </div>
                     </div>
                     <p className="text-gray-700 dark:text-gray-200 text-sm font-medium leading-relaxed">{log.details}</p>
                     
                     {log.targetId && (
                       <p className="mt-2 text-[10px] text-gray-400 font-mono">Target ID: {log.targetId}</p>
                     )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminAuditLogs;
