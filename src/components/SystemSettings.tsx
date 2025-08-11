import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Settings, Clock, Save, AlertCircle, CheckCircle, Users, Edit3, Calculator } from 'lucide-react';

interface SystemSettings {
  breaktime_enabled: boolean;
}

interface User {
  id: number;
  username: string;
  department: string;
  required_hours: number;
  worked_hours: number;
}

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({ breaktime_enabled: false });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [hoursAdjustment, setHoursAdjustment] = useState({
    requiredHours: '',
    workedHours: ''
  });
  const { token } = useAuth();

  useEffect(() => {
    fetchSettings();
    fetchUsersWithHours();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('http://192.168.100.60:3001/api/system-settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    }
    setLoading(false);
  };

  const fetchUsersWithHours = async () => {
    try {
      // Fetch users
      const usersResponse = await fetch('http://192.168.100.60:3001/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersResponse.json();

      // Fetch worked hours for each user
      const usersWithHours = await Promise.all(
        usersData.map(async (user: any) => {
          try {
            const hoursResponse = await fetch(`http://192.168.100.60:3001/api/user-hours-progress`, {
              headers: { 
                Authorization: `Bearer ${token}`,
                'X-User-ID': user.id.toString() // We'll need to modify the backend to accept this
              },
            });
            const hoursData = await hoursResponse.json();
            return {
              id: user.id,
              username: user.username,
              department: user.department,
              required_hours: user.required_hours || 0,
              worked_hours: hoursData.workedHours || 0
            };
          } catch (error) {
            return {
              id: user.id,
              username: user.username,
              department: user.department,
              required_hours: user.required_hours || 0,
              worked_hours: 0
            };
          }
        })
      );

      setUsers(usersWithHours);
    } catch (error) {
      console.error('Error fetching users with hours:', error);
    }
  };

  const handleSettingsUpdate = async () => {
    setSaving(true);
    try {
      const response = await fetch('http://192.168.100.60:3001/api/system-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings updated successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update settings' });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setMessage({ type: 'error', text: 'Failed to update settings' });
    }
    setSaving(false);
  };

  const handleHoursAdjustment = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const response = await fetch(`http://192.168.100.60:3001/api/users/${selectedUser.id}/hours-adjustment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requiredHours: hoursAdjustment.requiredHours ? parseFloat(hoursAdjustment.requiredHours) : undefined,
          workedHours: hoursAdjustment.workedHours ? parseFloat(hoursAdjustment.workedHours) : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Hours adjusted successfully!' });
        setShowHoursModal(false);
        setSelectedUser(null);
        setHoursAdjustment({ requiredHours: '', workedHours: '' });
        fetchUsersWithHours();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to adjust hours' });
      }
    } catch (error) {
      console.error('Error adjusting hours:', error);
      setMessage({ type: 'error', text: 'Failed to adjust hours' });
    }
    setSaving(false);
  };

  const openHoursModal = (user: User) => {
    setSelectedUser(user);
    setHoursAdjustment({
      requiredHours: user.required_hours.toString(),
      workedHours: user.worked_hours.toString()
    });
    setShowHoursModal(true);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
        <p className="text-slate-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">System Settings</h2>
          <p className="text-slate-400">Configure system-wide settings and manage user hours</p>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-emerald-900/20 border-emerald-800/50 text-emerald-400' 
            : 'bg-red-900/20 border-red-800/50 text-red-400'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Breaktime Settings */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg mb-6 border border-slate-700/50">
        <div className="bg-slate-700/50 px-6 py-4 border-b border-slate-600/50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-3 rounded-lg border border-blue-700/50">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Breaktime Configuration</h3>
              <p className="text-sm text-slate-400">Configure whether breaktime is included in standard working hours</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-2">Include Breaktime in Working Hours</h4>
                <p className="text-sm text-slate-400 mb-3">
                  When enabled, standard working hours per day will be 8.5 hours (including 30-minute break).
                  When disabled, standard working hours will be 8 hours.
                </p>
                
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-600/30">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Current Setting:</span>
                      <p className="font-semibold text-white">
                        {settings.breaktime_enabled ? '8.5 hours/day (with break)' : '8 hours/day (no break)'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Hourly Rate:</span>
                      <p className="font-semibold text-emerald-400">
                        ₱{settings.breaktime_enabled ? (200 / 8.5).toFixed(2) : '25.00'}/hour
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="ml-6">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.breaktime_enabled}
                    onChange={(e) => setSettings({ ...settings, breaktime_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-800/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-400 mb-1">Important Note</p>
                  <p className="text-sm text-yellow-300">
                    This setting affects payroll calculations for future time entries. 
                    Existing payroll records will not be automatically recalculated.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSettingsUpdate}
                disabled={saving}
                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 btn-enhanced flex items-center gap-2 shadow-lg"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Hours Management */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700/50">
        <div className="bg-slate-700/50 px-6 py-4 border-b border-slate-600/50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-3 rounded-lg border border-purple-700/50">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">User Hours Management</h3>
              <p className="text-sm text-slate-400">Adjust required and worked hours for individual users</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-700/30">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-300">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-300">Department</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-300">Required Hours</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-300">Worked Hours</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-300">Progress</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {users.map((user) => {
                  const progressPercentage = user.required_hours > 0 
                    ? Math.min(100, (user.worked_hours / user.required_hours) * 100) 
                    : 0;
                  const isCompleted = user.worked_hours >= user.required_hours && user.required_hours > 0;

                  return (
                    <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-2 rounded-lg border border-blue-700/50">
                            <Users className="w-4 h-4 text-blue-400" />
                          </div>
                          <span className="font-medium text-white">{user.username}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{user.department}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-medium text-blue-400">{user.required_hours.toFixed(1)}h</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-medium text-emerald-400">{user.worked_hours.toFixed(1)}h</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-slate-700/50 rounded-full h-2">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isCompleted 
                                  ? 'bg-gradient-to-r from-emerald-500 to-green-600' 
                                  : 'bg-gradient-to-r from-blue-500 to-purple-600'
                              }`}
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${isCompleted ? 'text-emerald-400' : 'text-blue-400'}`}>
                            {progressPercentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => openHoursModal(user)}
                          className="text-emerald-400 hover:text-emerald-300 p-2 rounded-lg hover:bg-emerald-900/30 transition-all duration-200 border border-transparent hover:border-emerald-700/50"
                          title="Adjust Hours"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Hours Adjustment Modal */}
      {showHoursModal && selectedUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-md border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-3 rounded-lg border border-purple-700/50">
                <Calculator className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Adjust Hours</h3>
                <p className="text-sm text-slate-400">{selectedUser.username}</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Required Hours
                </label>
                <input
                  type="number"
                  value={hoursAdjustment.requiredHours}
                  onChange={(e) => setHoursAdjustment({ ...hoursAdjustment, requiredHours: e.target.value })}
                  className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
                  placeholder="Enter required hours"
                  min="0"
                  step="0.5"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Worked Hours
                </label>
                <input
                  type="number"
                  value={hoursAdjustment.workedHours}
                  onChange={(e) => setHoursAdjustment({ ...hoursAdjustment, workedHours: e.target.value })}
                  className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
                  placeholder="Enter worked hours"
                  min="0"
                  step="0.1"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Current: {selectedUser.worked_hours.toFixed(1)} hours
                </p>
              </div>
            </div>
            
            <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-800/50 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-400 mb-1">Important</p>
                  <p className="text-xs text-yellow-300">
                    Adjusting worked hours will create a time entry adjustment record. 
                    This action cannot be undone automatically.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowHoursModal(false);
                  setSelectedUser(null);
                  setHoursAdjustment({ requiredHours: '', workedHours: '' });
                }}
                className="flex-1 bg-slate-700/50 text-slate-300 py-2 px-4 rounded-lg font-medium hover:bg-slate-600/50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleHoursAdjustment}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 btn-enhanced flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}