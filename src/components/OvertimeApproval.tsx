import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import { Clock, Check, X, MessageSquare } from 'lucide-react';

interface OvertimeRequest {
  id: number;
  username: string;
  department: string;
  clock_in: string;
  clock_out: string;
  overtime_note: string;
  created_at: string;
}

export function OvertimeApproval() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    fetchOvertimeRequests();
  }, []);

  const fetchOvertimeRequests = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.OVERTIME_REQUESTS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching overtime requests:', error);
    }
  };

  const handleApproval = async (requestId: number, approved: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.OVERTIME_REQUESTS}/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved }),
      });

      if (response.ok) {
        fetchOvertimeRequests();
      }
    } catch (error) {
      console.error('Error approving overtime:', error);
    }
    setLoading(false);
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateOvertimeHours = (clockIn: string, clockOut: string) => {
    const clockInTime = new Date(clockIn);
    const clockOutTime = new Date(clockOut);
    const overtimeThreshold = new Date(clockInTime);
    overtimeThreshold.setHours(16, 0, 0, 0); // 4:00 PM (30 minutes after 3:30 PM shift end)

    if (clockOutTime > overtimeThreshold) {
      const overtime = (clockOutTime.getTime() - overtimeThreshold.getTime()) / (1000 * 60 * 60);
      return Math.max(0, overtime).toFixed(2);
    }
    return '0.00';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Overtime Approval</h2>
          <p className="text-slate-400">Review and approve overtime requests</p>
        </div>
        <div className="bg-orange-900/20 text-orange-400 px-3 py-1 rounded-full text-sm font-medium border border-orange-800/50">
          {requests.length} Pending Requests
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-slate-700/30 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <img src="./src/assets/logo-removebg-preview.png" alt="The Backroom Logo" className="w-13 h-13 object-contain" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Pending Requests</h3>
          <p className="text-slate-400">All overtime requests have been processed.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:bg-slate-700/50 transition-all duration-200 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">{request.username}</h3>
                    <p className="text-sm text-slate-400">{request.department}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Submitted</p>
                  <p className="text-sm font-medium text-white">{formatDate(request.created_at)}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-700/30 p-3 rounded-lg">
                  <p className="text-sm text-slate-400 mb-1">Clock In</p>
                  <p className="font-medium text-emerald-400">{formatTime(request.clock_in)}</p>
                </div>
                <div className="bg-slate-700/30 p-3 rounded-lg">
                  <p className="text-sm text-slate-400 mb-1">Clock Out</p>
                  <p className="font-medium text-red-400">{formatTime(request.clock_out)}</p>
                </div>
                <div className="bg-slate-700/30 p-3 rounded-lg">
                  <p className="text-sm text-slate-400 mb-1">Overtime Hours</p>
                  <p className="font-medium text-orange-400">
                    {calculateOvertimeHours(request.clock_in, request.clock_out)}h
                  </p>
                </div>
              </div>

              {request.overtime_note && (
                <div className="bg-slate-700/30 p-4 rounded-lg mb-4 border border-slate-600/50">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-white">Reason for Overtime</span>
                  </div>
                  <p className="text-sm text-slate-300">{request.overtime_note}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => handleApproval(request.id, false)}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 py-3 px-4 rounded-lg font-medium hover:from-red-500/30 hover:to-red-600/30 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 border border-red-800/50"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => handleApproval(request.id, true)}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-emerald-500/20 to-green-600/20 text-emerald-400 py-3 px-4 rounded-lg font-medium hover:from-emerald-500/30 hover:to-green-600/30 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 border border-emerald-800/50"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}