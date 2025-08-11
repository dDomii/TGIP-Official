import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import { Users, Clock, Target, TrendingUp, Edit3, Save, X, Building2, User, BarChart3 } from 'lucide-react';

interface User {
  id: number;
  username: string;
  department: string;
  required_hours: number;
  worked_hours: number;
  active: boolean;
  remaining_hours: number;
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
  'Human Resource': 'from-orange-500/20 to-orange-600/20 border-orange-700/50 text-orange-400',
  'Marketing': 'from-gray-500/20 to-gray-600/20 border-gray-700/50 text-gray-400',
  'Finance': 'from-sky-500/20 to-sky-600/20 border-sky-700/50 text-sky-400',
  'Account Management': 'from-yellow-500/20 to-yellow-600/20 border-yellow-700/50 text-yellow-400',
  'System Automation': 'from-green-500/20 to-green-600/20 border-green-700/50 text-green-400',
  'Sales': 'from-pink-500/20 to-pink-600/20 border-pink-700/50 text-pink-400',
  'Training': 'from-cyan-500/20 to-cyan-600/20 border-cyan-700/50 text-cyan-400',
  'IT Department': 'from-purple-500/20 to-purple-600/20 border-purple-700/50 text-purple-400'
};

export function DepartmentOverview() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    fetchUsersWithHours();
  }, []);

  const fetchUsersWithHours = async () => {
    setLoading(true);
    try {
      // Fetch users
      const usersResponse = await fetch(API_ENDPOINTS.USERS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersResponse.json();

      // For now, we'll use the required_hours from the user data
      // In a real implementation, you might want to fetch actual worked hours
      const usersWithHours = await Promise.all(
        usersData.map(async (user: any) => {
          const hoursResponse = await fetch ( `${API_ENDPOINTS.USER_HOURS_PROGRESS}`,
            {
              headers:{ Authorization: `Bearer ${token}` ,
              'X-User-ID': user.id, // Pass user ID to fetch their specific hours
            },
          }
        );
        const hoursData = await hoursResponse.json();
        
        return {
        id: user.id,
        username: user.username,
        department: user.department,
        required_hours: parseFloat(user.required_hours)|| 0,
        worked_hours: hoursData.workedHours || 0,
            remaining_hours: hoursData.remainingHours || 0,
            active: user.active,
          };
        })
      );

      setUsers(usersWithHours);
    } catch (error) {
      console.error('Error fetching users with hours:', error);
    }
    setLoading(false);
  };

  const handleEditStart = (userId: number, currentHours: number) => {
    setEditingUser(userId);
    setEditValue(currentHours.toString());
  };

  const handleEditSave = async (userId: number) => {
    const newHours = parseFloat(editValue);
    if (isNaN(newHours) || newHours < 0) {
      alert('Please enter a valid number of hours');
      return;
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.USERS}/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ required_hours: newHours }),
      });

      const data = await response.json();
      if (data.success) {
        setUsers(users.map(user => 
          user.id === userId 
            ? { ...user, required_hours: newHours }
            : user
        ));
        setEditingUser(null);
        setEditValue('');
      } else {
        alert(data.message || 'Failed to update required hours');
      }
    } catch (error) {
      console.error('Error updating required hours:', error);
      alert('Failed to update required hours');
    }
  };

  const handleEditCancel = () => {
    setEditingUser(null);
    setEditValue('');
  };

  // Group users by department
  const groupedUsers = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = users.filter(user => user.department === dept && user.active);
    return acc;
  }, {} as Record<string, User[]>);

  // Calculate department statistics
  const departmentStats = DEPARTMENTS.map(dept => {
    const deptUsers = groupedUsers[dept];
    const totalUsers = deptUsers.length;
    const totalRequiredHours = deptUsers.reduce((sum, user) => sum + user.required_hours, 0);
    const totalWorkedHours = deptUsers.reduce((sum, user) => sum + user.worked_hours, 0);
    const totalRemainingHours = deptUsers.reduce((sum, user) => sum + user.remaining_hours, 0);
    const avgRequiredHours = totalUsers > 0 ? totalRequiredHours / totalUsers : 0;
    const completionRate = totalRequiredHours > 0 ? (totalWorkedHours / totalRequiredHours) * 100 : 0;

    return {
      department: dept,
      totalUsers,
      totalRequiredHours,
      totalRemainingHours,
      totalWorkedHours,
      avgRequiredHours,
      completionRate,
      users: deptUsers
    };
  }).filter(stat => stat.totalUsers > 0);

  const activeUsers = users.filter(user => user.active);
  const overallStats = {
    totalUsers: activeUsers.length,
    totalRequiredHours: activeUsers.reduce((sum, user) => sum + user.required_hours, 0),
    totalWorkedHours: activeUsers.reduce((sum, user) => sum + user.worked_hours, 0),
    avgRequiredHours: activeUsers.length > 0 ? users.reduce((sum, user) => sum + user.required_hours, 0) / activeUsers.length : 0
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
        <p className="text-slate-400">Loading department overview...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Department Overview</h2>
          <p className="text-slate-400">Monitor required hours and progress across all departments</p>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Active Users</p>
              <p className="text-2xl font-bold text-white">{overallStats.totalUsers}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-3 rounded-lg border border-blue-700/50">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Required Hours</p>
              <p className="text-2xl font-bold text-emerald-400">{Number(overallStats.totalRequiredHours).toFixed(0)}h</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 p-3 rounded-lg border border-emerald-700/50">
              <Target className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Average Required</p>
              <p className="text-2xl font-bold text-purple-400">{Number(overallStats.avgRequiredHours).toFixed(1)}h</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-3 rounded-lg border border-purple-700/50">
              <BarChart3 className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Departments</p>
              <p className="text-2xl font-bold text-orange-400">{departmentStats.length}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-3 rounded-lg border border-orange-700/50">
              <Building2 className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Department Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        {departmentStats.map((stat) => {
          const colorClass = DEPARTMENT_COLORS[stat.department];
        
          return (
            <div key={stat.department} className={`bg-gradient-to-br ${colorClass} backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border`}>
              <div className="bg-slate-700/50 px-6 py-4 border-b border-slate-600/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`bg-gradient-to-br ${colorClass} p-2 rounded-lg border`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{stat.department}</h3>
                      <p className="text-sm text-slate-400">{stat.totalUsers} active users</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Total Required</p>
                    <p className="text-lg font-bold text-emerald-400">{Number(stat.totalRequiredHours).toFixed(0)}h</p>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-800/30 p-3 rounded-lg">
                    <p className="text-slate-400 mb-1">Average Required</p>
                    <p className="font-semibold text-white">{stat.avgRequiredHours.toFixed(1)}h per user</p>
                  </div>
                  <div className="bg-slate-800/30 p-3 rounded-lg">
                    <p className="text-slate-400 mb-1">Range</p>
                    <p className="font-semibold text-white">
                      {Math.min(...stat.users.map(u => u.required_hours))}h - {Math.max(...stat.users.map(u => u.required_hours))}h
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <div className="divide-y divide-slate-700/50">
                  {stat.users.map((user) => (
                    <div key={user.id} className="p-4 hover:bg-slate-700/20 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`bg-gradient-to-br ${colorClass} p-2 rounded-lg border`}>
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-white">{user.username}</h4>
                            <div className="flex items-center gap-4 mt-1">
                              <div className="flex items-center gap-2">
                                <Target className="w-3 h-3 text-slate-400" />
                                <span className="text-sm text-slate-400">Required:</span>
                                {editingUser === user.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="w-20 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-white text-sm"
                                      min="0"
                                      step="0.5"
                                      autoFocus
                                    />
                                    <span className="text-sm text-slate-400">hours</span>
                                  </div>
                                ) : (
                                  <span className="text-sm font-medium text-emerald-400">
                                    {Number(user.required_hours).toFixed(1)}h
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span className="text-sm text-slate-400">Remaining:</span>
                                <span className="font-semibold text-white" >
                                  {Number(user.remaining_hours).toFixed(1)}h
                                  </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {editingUser === user.id ? (
                            <>
                              <button
                                onClick={() => handleEditSave(user.id)}
                                className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded-lg hover:bg-emerald-900/30 transition-all duration-200"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleEditCancel}
                                className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-900/30 transition-all duration-200"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleEditStart(user.id, user.required_hours)}
                              className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-blue-900/30 transition-all duration-200"
                              title="Edit Required Hours"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {departmentStats.length === 0 && (
        <div className="text-center py-12">
          <div className="bg-slate-700/30 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Building2 className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Active Departments</h3>
          <p className="text-slate-400">No departments with active users found.</p>
        </div>
      )}
    </div>
  );
}