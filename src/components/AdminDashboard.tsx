import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserManagement } from './UserManagement';
import { PayrollReports } from './PayrollReports';
import { LiveReports } from './LiveReports';
import { PayslipLogs } from './PayslipLogs';
import { DepartmentOverview } from './DepartmentOverview';
import { 
  Users, 
  PhilippinePeso, 
  Activity,
  Settings,
  Clock,
  Calendar,
  FileText,
  Building2
} from 'lucide-react';
import { OvertimeApproval } from './OvertimeApproval';

type TabType = 'users' | 'overtime' | 'payroll' | 'live-reports' | 'time-logs' | 'payslip-logs' | 'department-overview';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingOvertime: 0,
    thisWeekPayroll: 0
  });
  const { token } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch users
      const usersResponse = await fetch('http://192.168.100.60:3001/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const users = await usersResponse.json();
      
      // Fetch overtime requests
      const overtimeResponse = await fetch('http://192.168.100.60:3001/api/overtime-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const overtimeRequests = await overtimeResponse.json();

      setStats({
        totalUsers: users.length,
        activeUsers: users.filter((u: any) => u.active).length,
        pendingOvertime: overtimeRequests.length,
        thisWeekPayroll: 0 // This would be calculated based on current week
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const tabs = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'payroll', label: 'Payroll', icon: PhilippinePeso },
    { id: 'overtime', label: 'Overtime', icon: Clock },
    { id: 'department-overview', label: 'Department Overview', icon: Building2 },
    { id: 'live-reports', label: 'Live Reports', icon: Activity },
    { id: 'payslip-logs', label: 'Payslip Logs', icon: FileText }
  ];

  return (
    <div className="bg-[#34256b] max-w-7xl mx-auto p-6">
      <div className="mb-8 bg-black/55 rounded-2xl p-6 shadow-lg">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-slate-400">Manage users, approve overtime, and generate payroll reports</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 stagger-container">
        <div className="bg-black/55 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50 card-hover stagger-item">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Users</p>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-black/55 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50 card-hover stagger-item">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Active Users</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.activeUsers}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 p-3 rounded-lg">
              <Settings className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-black/55 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50 card-hover stagger-item">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Pending Overtime</p>
              <p className="text-2xl font-bold text-orange-400">{stats.pendingOvertime}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-black/55 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50 card-hover stagger-item">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">This Week</p>
              <p className="text-2xl font-bold text-purple-400">₱{stats.thisWeekPayroll.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-black/55 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700/50">
        <div className="border-b border-slate-700/50">
          <nav className="flex justify-center p-6" aria-label="Tabs">
            <div className="bg-slate-700/30 p-1 rounded-xl flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`btn-enhanced ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-[#B1E6F3] from to-indigo-900 text-white shadow-lg transform scale-105'
                      : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
                  } whitespace-nowrap py-3 px-6 rounded-lg font-medium text-sm flex items-center gap-2`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
            </div>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'payroll' && <PayrollReports />}
          {activeTab === 'overtime' && <OvertimeApproval />}
          {activeTab === 'department-overview' && <DepartmentOverview />}
          {activeTab === 'live-reports' && <LiveReports />}
          {activeTab === 'payslip-logs' && <PayslipLogs />}
        </div>
      </div>
    </div>
  );
}