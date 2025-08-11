import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import { Activity, Clock, User, Calendar, RefreshCw, PhilippinePeso } from 'lucide-react';

interface ActiveUser {
  id: number;
  username: string;
  department: string;
  clock_in: string;
}

const DEPARTMENTS = [
  'Human Resource',
  'Marketing', 
  'Finance',
  'Account Management',
  'System Automation',
  'Sales',
  'Training',
  'IT Department'
];

const DEPARTMENT_COLORS = {
  'Human Resource': 'text-orange-400',
  'Marketing': 'text-gray-400',
  'Finance': 'text-sky-400',
  'Account Management': 'text-yellow-400',
  'System Automation': 'text-green-400',
  'Sales': 'text-pink-400',
  'Training': 'text-cyan-400',
  'IT Department': 'text-purple-400'
};

export function LiveReports() {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const { token } = useAuth();

  useEffect(() => {
    fetchActiveUsers();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const refreshTimer = setInterval(() => {
      fetchActiveUsers();
    }, 60000); // Auto-refresh every 60 seconds

    return () => {
      clearInterval(timer);
      clearInterval(refreshTimer);
    };
  }, []);

  const fetchActiveUsers = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(API_ENDPOINTS.ACTIVE_USERS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setActiveUsers(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching active users:', error);
    }
    setIsRefreshing(false);
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const calculateCurrentTime = (clockIn: string) => {
    const clockInTime = new Date(clockIn);
    const currentTime = new Date();

    const sevenAM = new Date(clockInTime);
    sevenAM.setHours(7, 0, 0, 0);

    if (clockInTime.getTime() < sevenAM.getTime()) {
      clockInTime.setHours(7, 0, 0, 0);
    }

    const diff = currentTime.getTime() - clockInTime.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const isOvertimeHours = (clockIn: string) => {
    const clockInTime = new Date(clockIn);
    const shiftEnd = new Date(clockInTime);
    shiftEnd.setHours(15, 30, 0, 0); // 3:30 PM
    return currentTime > shiftEnd;
  };

  const formatTimeDisplay = (time: { hours: number; minutes: number; seconds: number }) => {
    return `${time.hours}h ${time.minutes}m ${time.seconds}s`;
  };

  const calculateEstimatedPay = (clockIn: string) => {
    const time = calculateCurrentTime(clockIn);
    const totalHours = time.hours + (time.minutes / 60) + (time.seconds / 3600);
    const regularHours = Math.min(totalHours, 8.5);
    const overtimeHours = Math.max(0, totalHours - 8.5);
    const regularPay = regularHours * 23.52941176470589; // ₱25/hour
    const overtimePay = isOvertimeHours(clockIn) ? overtimeHours * 35 : 0; // ₱35/hour for overtime
    
    
    return regularPay + overtimePay;
  };

  // Group users by department
  const groupedUsers = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = activeUsers.filter(user => user.department === dept);
    return acc;
  }, {} as Record<string, ActiveUser[]>);

  const totalActiveUsers = activeUsers.length;
  const usersInOvertime = activeUsers.filter(user => isOvertimeHours(user.clock_in)).length;
  const totalEstimatedPay = activeUsers.reduce((sum, user) => sum + calculateEstimatedPay(user.clock_in), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Live Reports</h2>
          <p className="text-slate-400">Real-time tracking of active employees by department</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchActiveUsers}
            disabled={isRefreshing}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 btn-enhanced flex items-center gap-2 shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 transition-transform duration-300 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="text-center">
            <p className="text-xs text-slate-400">Last Updated</p>
            <p className="text-sm font-medium text-white">{lastUpdate.toLocaleTimeString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Current Time</p>
            <p className="text-lg font-semibold text-white">{formatCurrentTime()}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Currently Active</p>
              <p className="text-2xl font-bold text-emerald-400">{totalActiveUsers}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">In Overtime</p>
              <p className="text-2xl font-bold text-orange-400">{usersInOvertime}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Estimated Pay</p>
              <p className="text-2xl font-bold text-blue-400">₱{totalEstimatedPay.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-3 rounded-lg">
              <PhilippinePeso className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Average Hours</p>
              <p className="text-2xl font-bold text-purple-400">
                {totalActiveUsers > 0 
                  ? (activeUsers.reduce((sum, user) => {
                      const time = calculateCurrentTime(user.clock_in);
                      return sum + time.hours + (time.minutes / 60);
                    }, 0) / totalActiveUsers).toFixed(1)
                  : '0.0'
                }h
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Department Columns */}
      {activeUsers.length > 0 ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {DEPARTMENTS.map((department) => {
            const deptUsers = groupedUsers[department];
            if (deptUsers.length === 0) return null;
            
            const deptOvertimeUsers = deptUsers.filter(user => isOvertimeHours(user.clock_in)).length;
            const deptTotalPay = deptUsers.reduce((sum, user) => sum + calculateEstimatedPay(user.clock_in), 0);
            const colorClass = DEPARTMENT_COLORS[department];

            return (
              <div key={department} className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                <div className="bg-gradient-to-r from-slate-700/50 to-slate-600/30 px-4 py-3 border-b border-slate-600/50 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-semibold ${colorClass}`}>{department}</h3>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full text-xs font-medium border border-blue-800/50 backdrop-blur-sm">
                        {deptUsers.length}
                      </span>
                      {deptOvertimeUsers > 0 && (
                        <span className="bg-orange-900/30 text-orange-400 px-2 py-1 rounded-full text-xs font-medium border border-orange-800/50 backdrop-blur-sm">
                          {deptOvertimeUsers} OT
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-right">
                    <p className="text-sm font-semibold text-emerald-400">₱{deptTotalPay.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">Department Total</p>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  <div className="space-y-1 p-2">
                    {deptUsers.map((user, index) => {
                      const currentTime = calculateCurrentTime(user.clock_in);
                      const inOvertime = isOvertimeHours(user.clock_in);
                      const estimatedPay = calculateEstimatedPay(user.clock_in);
                      
                      return (
                        <div key={user.id} className={`bg-slate-700/30 rounded-lg p-3 hover:bg-slate-600/40 transition-all duration-300 border border-slate-600/30 hover:border-slate-500/50 hover:shadow-md ${index < deptUsers.length - 1 ? 'mb-2' : ''}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`p-2 rounded-lg transition-all duration-300 ${inOvertime ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30' : 'bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-500/30'}`}>
                                <User className={`w-4 h-4 ${inOvertime ? 'text-orange-400' : 'text-emerald-400'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-white text-sm truncate">{user.username}</h4>
                                  {inOvertime && (
                                    <span className="bg-orange-900/30 text-orange-400 px-1.5 py-0.5 rounded-full text-xs font-medium border border-orange-800/50 animate-pulse">
                                      OT
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 mb-2">Clock In: {formatTime(user.clock_in)}</p>
                                
                                {/* Time and Pay Display */}
                                <div className="bg-slate-800/50 rounded-md p-2 border border-slate-600/30">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-slate-400">Time Worked:</span>
                                    <span className={`text-sm font-semibold ${inOvertime ? 'text-orange-400' : 'text-blue-400'}`}>
                                      {formatTimeDisplay(currentTime)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400">Estimated Pay:</span>
                                    <span className="text-sm font-bold text-emerald-400">
                                      ₱{estimatedPay.toFixed(2)}
                                    </span>
                                  </div>
                                  {inOvertime && (
                                    <div className="mt-1 pt-1 border-t border-slate-600/30">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-orange-400">Overtime:</span>
                                        <span className="text-xs font-medium text-orange-400">
                                          +₱{(Math.max(0, (currentTime.hours + currentTime.minutes/60) - 8) * 35).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Status Indicator */}
                            <div className="flex flex-col items-center gap-1">
                              <div className={`w-3 h-3 rounded-full ${inOvertime ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400'} shadow-lg`}></div>
                              <span className="text-xs text-slate-400">
                                {inOvertime ? 'OT' : 'REG'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="bg-slate-700/30 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center animate-pulse">
            <Activity className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Active Users</h3>
          <p className="text-slate-400">No employees are currently clocked in.</p>
        </div>
      )}
    </div>
  );
}
