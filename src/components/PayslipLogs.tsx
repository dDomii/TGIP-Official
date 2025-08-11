import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import { Calendar, User, FileText, Clock, Download, Filter, Search, Eye, Trash2, AlertTriangle } from 'lucide-react';

interface PayslipLog {
  id: number;
  admin_id: number;
  admin_username: string;
  action: 'generated' | 'released';
  period_start: string;
  period_end: string;
  payslip_count: number;
  user_ids: string | null;
  created_at: string;
}

export function PayslipLogs() {
  const [logs, setLogs] = useState<PayslipLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<PayslipLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingLog, setDeletingLog] = useState<PayslipLog | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { token } = useAuth();

  useEffect(() => {
    fetchLogs();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.PAYSLIP_LOGS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching payslip logs:', error);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const formatFullDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      'Date & Time',
      'Admin',
      'Action',
      'Period Start',
      'Period End',
      'Payslip Count',
      'User IDs'
    ];

    const rows = filteredLogs.map(log => [
      formatDateTime(log.created_at),
      log.admin_username,
      log.action.charAt(0).toUpperCase() + log.action.slice(1),
      log.period_start,
      log.period_end,
      log.payslip_count.toString(),
      log.user_ids || 'All Users'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payslip_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getUserIdsArray = (userIds: string | null) => {
    if (!userIds) return [];
    try {
      return JSON.parse(userIds);
    } catch {
      return [];
    }
  };

  const showLogDetails = (log: PayslipLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const handleDeleteLog = async () => {
    if (!deletingLog) return;

    try {
      const response = await fetch(`${API_ENDPOINTS.PAYSLIP_LOGS}/${deletingLog.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setLogs(logs.filter(log => log.id !== deletingLog.id));
        setShowDeleteModal(false);
        setDeletingLog(null);
      } else {
        alert(data.message || 'Failed to delete log');
      }
    } catch (error) {
      console.error('Error deleting log:', error);
      alert('Failed to delete log');
    }
  };

  // Filter logs based on search and action
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.admin_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.period_start.includes(searchTerm) ||
                         log.period_end.includes(searchTerm);
    const matchesAction = selectedAction === '' || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  // Group logs by date
  const groupedLogs = filteredLogs.reduce((acc, log) => {
    const date = new Date(log.created_at).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, PayslipLog[]>);

  const totalGenerated = logs.filter(log => log.action === 'generated').length;
  const totalReleased = logs.filter(log => log.action === 'released').length;
  const totalPayslips = logs.reduce((sum, log) => sum + log.payslip_count, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Payslip Generation Logs</h2>
          <p className="text-slate-400">Track all payslip generation and release activities</p>
        </div>
        <div className="flex items-center gap-4">
          {filteredLogs.length > 0 && (
            <button
              onClick={exportToCSV}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2 shadow-lg"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Logs</p>
              <p className="text-2xl font-bold text-white">{filteredLogs.length}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Generated</p>
              <p className="text-2xl font-bold text-emerald-400">{totalGenerated}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Released</p>
              <p className="text-2xl font-bold text-orange-400">{totalReleased}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Payslips</p>
              <p className="text-2xl font-bold text-purple-400">{totalPayslips}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-lg border border-slate-700/50">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Search Logs
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-400"
                placeholder="Search by admin, date, or period..."
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Filter by Action
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
              >
                <option value="">All Actions</option>
                <option value="generated">Generated</option>
                <option value="released">Released</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Display */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading payslip logs...</p>
        </div>
      ) : Object.keys(groupedLogs).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedLogs)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, dayLogs]) => (
              <div key={date} className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-slate-700/50">
                <div className="bg-slate-700/50 px-6 py-4 border-b border-slate-600/50">
                  <h3 className="text-lg font-semibold text-white">{formatDate(date)}</h3>
                  <p className="text-sm text-slate-400">{dayLogs.length} activities</p>
                </div>
                
                <div className="divide-y divide-slate-700/50">
                  {dayLogs
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((log) => (
                      <div key={log.id} className="p-6 hover:bg-slate-700/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={`p-3 rounded-lg ${
                              log.action === 'generated' 
                                ? 'bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-700/50'
                                : 'bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-700/50'
                            }`}>
                              {log.action === 'generated' ? (
                                <FileText className={`w-6 h-6 ${log.action === 'generated' ? 'text-emerald-400' : 'text-orange-400'}`} />
                              ) : (
                                <Clock className={`w-6 h-6 ${log.action === 'generated' ? 'text-emerald-400' : 'text-orange-400'}`} />
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-white text-lg">
                                  Payslips {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                                </h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  log.action === 'generated'
                                    ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50'
                                    : 'bg-orange-900/30 text-orange-400 border border-orange-800/50'
                                }`}>
                                  {log.action.toUpperCase()}
                                </span>
                              </div>
                              
                              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                                <div className="bg-slate-700/30 p-3 rounded-lg">
                                  <p className="text-sm text-slate-400 mb-1">Admin</p>
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-blue-400" />
                                    <span className="font-medium text-blue-400">{log.admin_username}</span>
                                  </div>
                                </div>
                                
                                <div className="bg-slate-700/30 p-3 rounded-lg">
                                  <p className="text-sm text-slate-400 mb-1">Period</p>
                                  <p className="font-medium text-white text-sm">
                                    {formatDate(log.period_start)} - {formatDate(log.period_end)}
                                  </p>
                                </div>
                                
                                <div className="bg-slate-700/30 p-3 rounded-lg">
                                  <p className="text-sm text-slate-400 mb-1">Count</p>
                                  <p className="font-medium text-emerald-400">{log.payslip_count} payslips</p>
                                </div>
                                
                                <div className="bg-slate-700/30 p-3 rounded-lg">
                                  <p className="text-sm text-slate-400 mb-1">Time</p>
                                  <p className="font-medium text-white text-sm">
                                    {new Date(log.created_at).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>
                              
                              {log.user_ids && (
                                <div className="bg-slate-700/30 p-3 rounded-lg">
                                  <p className="text-sm text-slate-400 mb-1">Specific Users</p>
                                  <p className="text-sm text-slate-300">
                                    {getUserIdsArray(log.user_ids).length} selected users
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => showLogDetails(log)}
                            className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-900/30 transition-all duration-200"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setDeletingLog(log);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-900/30 transition-all duration-200"
                            title="Delete Log"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="bg-slate-700/30 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Logs Found</h3>
          <p className="text-slate-400">
            {searchTerm || selectedAction 
              ? 'No logs match your search criteria.' 
              : 'No payslip generation logs available.'}
          </p>
        </div>
      )}

      {/* Log Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-2xl border border-slate-700/50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-lg ${
                selectedLog.action === 'generated' 
                  ? 'bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-700/50'
                  : 'bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-700/50'
              }`}>
                {selectedLog.action === 'generated' ? (
                  <FileText className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Clock className="w-6 h-6 text-orange-400" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Payslip {selectedLog.action.charAt(0).toUpperCase() + selectedLog.action.slice(1)} Details
                </h3>
                <p className="text-slate-400">{formatFullDateTime(selectedLog.created_at)}</p>
              </div>
            </div>
            
            <div className="grid gap-4 mb-6">
              <div className="bg-slate-700/30 p-4 rounded-lg">
                <h4 className="font-medium text-white mb-3">Basic Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Admin</p>
                    <p className="font-medium text-white">{selectedLog.admin_username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Action</p>
                    <p className="font-medium text-white">{selectedLog.action.charAt(0).toUpperCase() + selectedLog.action.slice(1)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Period Start</p>
                    <p className="font-medium text-white">{formatDate(selectedLog.period_start)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Period End</p>
                    <p className="font-medium text-white">{formatDate(selectedLog.period_end)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-700/30 p-4 rounded-lg">
                <h4 className="font-medium text-white mb-3">Payslip Details</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Total Payslips</p>
                    <p className="font-medium text-emerald-400">{selectedLog.payslip_count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Scope</p>
                    <p className="font-medium text-white">
                      {selectedLog.user_ids ? 'Selected Users' : 'All Users'}
                    </p>
                  </div>
                </div>
              </div>
              
              {selectedLog.user_ids && (
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <h4 className="font-medium text-white mb-3">Selected User IDs</h4>
                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-sm text-slate-300 font-mono break-all">
                      {getUserIdsArray(selectedLog.user_ids).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowDetailsModal(false)}
              className="w-full bg-gradient-to-r from-slate-600 to-slate-700 text-white py-3 px-4 rounded-lg font-medium hover:from-slate-700 hover:to-slate-800 transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingLog && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-md border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 p-3 rounded-lg border border-red-700/50">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Payslip Log</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-slate-300 mb-3">
                Are you sure you want to delete this payslip log entry?
              </p>
              
              <div className="bg-slate-700/30 p-3 rounded-lg border border-slate-600/30">
                <div className="text-sm">
                  <p className="text-white font-medium">{deletingLog.action.charAt(0).toUpperCase() + deletingLog.action.slice(1)} Action</p>
                  <p className="text-slate-400">By: {deletingLog.admin_username}</p>
                  <p className="text-slate-400">Date: {formatFullDateTime(deletingLog.created_at)}</p>
                  <p className="text-slate-400">Period: {formatDate(deletingLog.period_start)} - {formatDate(deletingLog.period_end)}</p>
                </div>
              </div>
              
              <div className="bg-red-900/20 p-3 rounded-lg border border-red-800/50 mt-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-400">Warning</p>
                    <p className="text-xs text-red-300">
                      Deleting this log will permanently remove the audit trail for this payslip action. 
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingLog(null);
                }}
                className="flex-1 bg-slate-700/50 text-slate-300 py-2 px-4 rounded-lg font-medium hover:bg-slate-600/50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLog}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2 px-4 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200"
              >
                Delete Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}