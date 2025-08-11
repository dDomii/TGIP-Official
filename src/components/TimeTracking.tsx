import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { Clock, Play, Square, MessageSquare, AlertCircle, Home, BarChart3, X, Target, TrendingUp, Edit3, Check, Calendar, Timer, Award, Zap } from 'lucide-react';
import { PayrollHistory } from './PayrollHistory';
import { isToday } from 'date-fns/isToday';

interface TimeEntry {
  id: number;
  clock_in: string;
  clock_out: string | null;
  overtime_requested: boolean;
  overtime_note: string | null;
  overtime_approved?: boolean | null;
}

interface HoursProgress {
  requiredHours: number;
  workedHours: number;
  remainingHours: number;
  progressPercentage: number;
  isCompleted: boolean;
}

type TabType = 'time-tracking' | 'payroll-history' ;

export function TimeTracking() {
  const [activeTab, setActiveTab] = useState<TabType>('time-tracking');
  const [todayEntry, setTodayEntry] = useState<TimeEntry | null>(null);
  const [overtimeNote, setOvertimeNote] = useState('');
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hoursProgress, setHoursProgress] = useState<HoursProgress | null>(null);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [newRequiredHours, setNewRequiredHours] = useState('');
  const { token, user } = useAuth();

  useEffect(() => {
    fetchTodayEntry();
    fetchOvertimeNotifications();
    fetchHoursProgress();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    console.log("TODAY ENTRY::::", todayEntry);
  }, [todayEntry]);

  const [lastCheckDate, setLastCheckDate] = useState(
    localStorage.getItem('lastCheckDate') || ''
  );

  useEffect(() => {
    const checkNewDay = () => {
      const today = new Date().toISOString().split('T')[0];
      if (lastCheckDate !== today) {
        setLastCheckDate(today);
        localStorage.setItem('lastCheckDate', today);
        fetchTodayEntry();
      }
    };

    checkNewDay();
    const dayCheckInterval = setInterval(checkNewDay, 60000);
    return () => clearInterval(dayCheckInterval);
  }, [lastCheckDate]);


  const fetchTodayEntry = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.TODAY_ENTRY, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log("Inside Fetchtoday: ", data);
      setTodayEntry(data);
    } catch (error) {
      console.error('Error fetching today entry:', error);
    }
  };

  const fetchHoursProgress = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.USER_HOURS_PROGRESS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setHoursProgress(data);
    } catch (error) {
      console.error('Error fetching hours progress:', error);
    }
  };

  const updateRequiredHours = async () => {
    const hours = parseFloat(newRequiredHours);
    if (isNaN(hours) || hours < 0) {
      alert('Please enter a valid number of hours');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.USER_REQUIRED_HOURS, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requiredHours: hours }),
      });

      const data = await response.json();
      if (data.success) {
        setShowHoursModal(false);
        setNewRequiredHours('');
        fetchHoursProgress();
        alert('Required hours updated successfully!');
      } else {
        alert(data.message || 'Failed to update required hours');
      }
    } catch (error) {
      console.error('Error updating required hours:', error);
      alert('Failed to update required hours');
    }
  };

  const fetchOvertimeNotifications = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.OVERTIME_NOTIFICATIONS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.length > 0) {
        setNotifications(data);
        setShowNotifications(true);
      }
    } catch (error) {
      console.error('Error fetching overtime notifications:', error);
    }
  };

  const handleClockIn = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.CLOCK_IN, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("Clock-in response:", data);

      if (data.success) {
        // Successfully clocked in
        await fetchTodayEntry();
      } else {
        const message = data.message || 'Failed to clock in';

        if (message.includes('Already clocked in')) {
          if (data.hasEntry) {
            // Completed entry already exists today
            const shouldReset = window.confirm(
              'You already clocked in and out today. Do you want to start a new session? This will override today\'s entry.'
            );
            if (shouldReset) {
              await resetAndClockIn();
            }
          } else {
            // Still clocked in (no clock out yet)
            alert('You are already clocked in. Please clock out before starting a new session.');
          }
        } else {
          // Other error
          alert(message);
        }
      }
    } catch (error) {
      console.error('Clock-in error:', error);
      alert('Clock-in failed due to a network or server error.');
    }

    setIsLoading(false);
  };


  const resetAndClockIn = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.RESET_CLOCK_IN, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchTodayEntry();
      } else {
        alert(data.message || 'Failed to reset clock in');
      }
    } catch (error) {
      console.error('Reset clock in error:', error);
      alert('Failed to reset clock in');
    }
  };

  const handleClockOut = async () => {
    // Simple clock out without overtime logic
    await performClockOut();
  };

  const performClockOut = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.CLOCK_OUT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ overtimeNote }),
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchTodayEntry();
        setShowOvertimeModal(false);
        setOvertimeNote('');
        
        if (data.overtimeRequested) {
          alert('Overtime request submitted for admin approval!');
        }
      } else {
        alert(data.message || 'Failed to clock out');
      }
    } catch (error) {
      console.error('Clock out error:', error);
      alert('Failed to clock out');
    }
    setIsLoading(false);
  };

  const submitOvertimeRequest = async () => {
    if (!overtimeNote.trim()) {
      alert('Please provide a reason for overtime');
      return;
    }

    setIsLoading(true);
    try {
      // Submit standalone overtime request (separate from clock out)
      const response = await fetch(API_ENDPOINTS.OVERTIME_REQUEST, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          overtimeNote,
          date: new Date().toISOString().split('T')[0]
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowOvertimeModal(false);
        setOvertimeNote('');
        alert('Overtime request submitted for admin approval!');
        await fetchTodayEntry();
      } else {
        alert(data.message || 'Failed to submit overtime request');
      }
    } catch (error) {
      console.error('Overtime request error:', error);
      alert('Failed to submit overtime request');
    }
    setIsLoading(false);
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCurrentDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateWorkedTime = () => {
    if (!todayEntry?.clock_in || !todayEntry?.clock_out) return { hours: 0, minutes: 0, seconds: 0 };
    
    const clockIn = new Date(todayEntry.clock_in);
    const clockOut = new Date(todayEntry.clock_out);
    const diff = clockOut.getTime() - clockIn.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const calculateCurrentWorkedTime = () => {
    if (!todayEntry?.clock_in || todayEntry?.clock_out) return { hours: 0, minutes: 0, seconds: 0 };
    
    const clockIn = new Date(todayEntry.clock_in);
    const diff = currentTime.getTime() - clockIn.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const isAfterShiftHours = () => {
    const now = new Date();
    const overtimeThreshold = new Date();
    overtimeThreshold.setHours(16, 0, 0, 0); // 4:00 PM
    return now > overtimeThreshold;
  };

  const getOvertimeTime = () => {
    if (!isAfterShiftHours()) return { hours: 0, minutes: 0, seconds: 0 };
    const now = new Date();
    const overtimeThreshold = new Date();
    overtimeThreshold.setHours(16, 0, 0, 0); // 4:00 PM
    const diff = Math.max(0, now.getTime() - overtimeThreshold.getTime());
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const isLateClockIn = () => {
    if (!todayEntry?.clock_in) return false;
    const clockIn = new Date(todayEntry.clock_in);
    const shiftStart = new Date(clockIn);
    shiftStart.setHours(7, 0, 0, 0); // 7:00 AM
    return clockIn > shiftStart;
  };

  const getLateTime = () => {
    if (!todayEntry?.clock_in || !isLateClockIn()) return { hours: 0, minutes: 0, seconds: 0 };
    const clockIn = new Date(todayEntry.clock_in);
    const shiftStart = new Date(clockIn);
    shiftStart.setHours(7, 0, 0, 0);
    const diff = clockIn.getTime() - shiftStart.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const formatTimeDisplay = (time: { hours: number; minutes: number; seconds: number }) => {
    return `${time.hours}h ${time.minutes}m ${time.seconds}s`;
  };

  const workedTime = todayEntry?.clock_out ? calculateWorkedTime() : calculateCurrentWorkedTime();
  const overtimeTime = getOvertimeTime();
  const lateTime = getLateTime();

  const tabs = [
    { id: 'time-tracking', label: 'Time Tracking', icon: Clock },
    { id: 'payroll-history', label: 'Payroll History', icon: BarChart3 }
  ];
  // Has any session started today?
  const hasAnyClockInToday = Boolean(todayEntry?.clock_in && isToday(todayEntry.clock_in));

  // Is there an active session (not yet clocked out)?
  const isCurrentlyClockedIn = Boolean(todayEntry?.clock_in && !todayEntry.clock_out);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 min-h-screen bg-[#34256b]">
      {/* Header Section */}
      <div className="bg-black/55 rounded-2xl p-6 border border-black/100 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white/80">Welcome back, {user?.username}</h1>
              <p className="text-white/80 mt-1">{formatCurrentDate()}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-white/80 mb-1">Current Time</p>
            <div className="text-2xl font-mono font-bold bg-gradient-to-r from-indigo-900 from to-[#B1E6F3] inline-block text-transparent bg-clip-text">
  {formatCurrentTime()}</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-black/55 backdrop-blur-sm rounded-2xl border-black/100 overflow-hidden">
        <div className="border-b border-slate-200/60">
          <nav className="flex justify-center p-4 shadow-lg">
            <div className="bg-black/55 p-1 rounded-xl flex gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`btn-enhanced ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-[#B1E6F3] from to-indigo-900 text-white shadow-lg transform scale-100'
                        : 'text-white hover:text-black-800 hover:bg-slate-200/50'
                    } py-3 px-6 rounded-lg font-medium flex items-center gap-2 transition-all duration-300`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        <div className="p-6 shadow-lg">
          {activeTab === 'time-tracking' && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Progress Tracker */}
              {hoursProgress && (
                <div className="lg:col-span-1">
                  <div className="bg-black/55 backdrop-blur-sm rounded-2xl p-6 h-full shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                      <Target className="w-6 h-6 text-emerald-500" />
                      <h3 className="text-lg font-semibold text-white/80">Hours Progress</h3>
                    </div>
                    
                    {/* Circular Progress */}
                    <div className="flex justify-center mb-6">
                      <div className="relative w-32 h-32">
                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="8" fill="none" className="text-white/55" />
                          <circle
                            cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round"
                            className={hoursProgress.isCompleted ? 'text-emerald-500' : 'text-indigo-500'}
                            style={{
                              strokeDasharray: `${2 * Math.PI * 50}`,
                              strokeDashoffset: `${2 * Math.PI * 50 * (1 - hoursProgress.progressPercentage / 100)}`,
                              transition: 'stroke-dashoffset 1s ease-in-out'
                            }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${hoursProgress.isCompleted ? 'text-emerald-600' : 'text-indigo-600'}`}>
                              {Number(hoursProgress.progressPercentage).toFixed(0)}%
                            </div>
                            <div className="text-xs text-white/80 mt-1">Complete</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-2 flex justify-between items-center rounded-lg border border-slate-200/60">
                        <span className="text-white/80">Required Hours:</span>
                        <span className="text-emerald-400 font-semibold">{Number(hoursProgress.requiredHours).toFixed(1)}h</span>
                      </div>
                      <div className="p-2 flex justify-between items-center rounded-lg border border-slate-200/60">
                        <span className="text-white/80">Worked Hours:</span>
                        <span className="text-canary font-semibold">{Number(hoursProgress.workedHours).toFixed(1)}h</span>
                      </div>
                      <div className="p-2 flex justify-between items-center rounded-lg border border-slate-200/60">
                        <span className="text-white/80">Remaining:</span>
                        <span className={`font-semibold ${hoursProgress.isCompleted ? 'text-emerald-600' : 'text-orange-500'}`}>
                          {hoursProgress.isCompleted ? 'Completed!' : `${Number(hoursProgress.remainingHours).toFixed(1)}h`}
                        </span>
                      </div>
                      <div className="mt-4 p-4 bg-black/50 rounded-lg border border-slate-200/60">
                        <p className="text-sm text-white/80">
                          <strong>Motivational Note:</strong>
                        </p>
                        <p className="text-white/80">If you can dream it, you can do it.</p>
                      </div>
                    </div>
                    
                    {hoursProgress.isCompleted && (
                      <div className="bg-emerald-50/80 p-4 rounded-lg border border-emerald-200/60 mt-6">
                        <div className="flex items-center gap-3">
                          <Award className="w-5 h-5 text-emerald-600" />
                          <div>
                            <p className="text-emerald-500 font-semibold">Congratulations!</p>
                            <p className="text-emerald-400 text-sm">You've completed your required hours</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Main Activity Panel */}
              <div className={`${hoursProgress ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                <div className="grid lg:grid-cols-2 gap-6 h-full">
                  {/* Today's Activity */}
                  <div className="bg-black/55 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                      <Calendar className="w-6 h-6 text-indigo-500" />
                      <h3 className="text-lg font-semibold text-white/80">Today's Activity</h3>
                    </div>
                    
                    {todayEntry ? (
                      <div className="space-y-6">
                        {/* Clock Times */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-emerald-50/80 p-4 rounded-lg border border-emerald-200/60">
                            <div className="flex items-center gap-2 mb-2">
                              <Play className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm text-emerald-700 font-medium">Clock In</span>
                            </div>
                            <div className={`text-xl font-mono font-bold ${isLateClockIn() ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {formatTime(todayEntry.clock_in).slice(0, -3)}
                            </div>
                            {isLateClockIn() && (
                              <span className="bg-rose-100/80 text-rose-600 px-2 py-1 rounded text-xs mt-2 inline-block border border-rose-200/60">
                                Late by {formatTimeDisplay(lateTime)}
                              </span>
                            )}
                          </div>

                          <div className="bg-rose-50/80 p-4 rounded-lg border border-rose-200/60">
                            <div className="flex items-center gap-2 mb-2">
                              <Square className="w-4 h-4 text-rose-600" />
                              <span className="text-sm text-rose-700 font-medium">Clock Out</span>
                            </div>
                            <div className="text-xl font-mono font-bold text-rose-600">
                              {todayEntry.clock_out ? formatTime(todayEntry.clock_out).slice(0, -3) : 'Active'}
                            </div>
                            {!todayEntry.clock_out && (
                              <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                <span className="text-amber-600 text-xs">Currently working</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Worked Time Display */}
                        <div className="bg-slate-50/80 p-4 rounded-lg border border-slate-200/60">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Timer className="w-5 h-5 text-slate-700" />
                              <span className="text-slate-800 font-semibold">Time Worked Today</span>
                            </div>
                            {!todayEntry.clock_out && (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                <span className="text-amber-600 text-sm">Live</span>
                              </div>
                            )}
                          </div>
                          <div className="text-3xl font-mono font-bold text-slate-800">
                            {formatTimeDisplay(workedTime)}
                          </div>
                        </div>

                        {/* Status Alerts */}
                        {isAfterShiftHours() && !todayEntry.clock_out && (
                          <div className="bg-amber-50/80 p-4 rounded-lg border border-amber-200/60">
                            <div className="flex items-center gap-3">
                              <Zap className="w-5 h-5 text-amber-600" />
                              <div>
                                <p className="text-amber-700 font-semibold">Potential Overtime</p>
                                <p className="text-amber-600 text-sm">{formatTimeDisplay(overtimeTime)} past 4:00 PM</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {todayEntry.overtime_requested == true && (
                          <div className={`p-4 rounded-lg border ${
                            todayEntry.overtime_approved === null || todayEntry.overtime_approved === undefined
                              ? 'bg-amber-50/80 border-amber-200/60'
                              : todayEntry.overtime_approved 
                                ? 'bg-emerald-50/80 border-emerald-200/60'
                                : 'bg-rose-50/80 border-rose-200/60'
                          }`}>
                            <div className="flex items-center gap-3">
                              <AlertCircle className={`w-5 h-5 ${
                                todayEntry.overtime_approved === null || todayEntry.overtime_approved === undefined
                                  ? 'text-amber-600'
                                  : todayEntry.overtime_approved 
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                              }`} />
                              <div>
                                <p className={`font-semibold ${
                                  todayEntry.overtime_approved === null || todayEntry.overtime_approved === undefined
                                    ? 'text-amber-700'
                                    : todayEntry.overtime_approved 
                                      ? 'text-emerald-700'
                                      : 'text-rose-700'
                                }`}>
                                  {todayEntry.overtime_approved === null || todayEntry.overtime_approved === undefined
                                    ? 'Overtime Request Pending'
                                    : todayEntry.overtime_approved 
                                      ? 'Overtime Request Approved ✓'
                                      : 'Overtime Request Rejected ✗'
                                  }
                                </p>
                                <p className="text-sm text-slate-600">Waiting for admin review</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Clock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-white/50 mb-2">Ready to Start Your Day?</h4>
                        <p className="text-white/50">Click the Clock In button to begin tracking your time</p>
                      </div>
                    )}
                  </div>

                  {/* Actions & Info Panel */}
                  <div className="space-y-6">
                    {/* Action Buttons */}
                    <div className="bg-black/55 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                      <h4 className="text-lg font-semibold text-white/80 mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-indigo-500" />
                        Quick Actions
                      </h4>
                      
                      <div className="space-y-3">
                      {/* Clock In Button – disabled while clocked in or loading */}
                      <button
                        onClick={handleClockIn}
                        disabled={isLoading || hasAnyClockInToday || isCurrentlyClockedIn }

                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 btn-enhanced flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Play className="w-5 h-5" />
                        {isLoading ? 'Clocking In...' : 'Clock In'}
                      </button>

                      {/* Clock Out Button – visible only when clocked in but not yet clocked out */}
                      {todayEntry?.clock_in && !todayEntry?.clock_out && (
                        <button
                          onClick={handleClockOut}
                          disabled={isLoading}
                          className="w-full bg-gradient-to-r from-rose-500 to-rose-600 text-white py-3 px-4 rounded-lg font-medium hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 btn-enhanced flex items-center justify-center gap-2 shadow-lg"
                        >
                          <Square className="w-5 h-5" />
                          {isLoading ? 'Clocking Out...' : 'Clock Out'}
                        </button>
                      )}
                        <button
                          onClick={() => setShowOvertimeModal(true)}
                          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3 px-4 rounded-lg font-medium hover:from-amber-600 hover:to-amber-700 btn-enhanced flex items-center justify-center gap-2 shadow-lg"
                        >
                          <Clock className="w-5 h-5" />
                          Request Overtime
                        </button>
                      </div>
                    </div>

                    {/* Shift Information */}
                    <div className="bg-black/55 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-white" />
                        Shift Information
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-indigo-400 p-4 rounded-lg border border-blue-600 shadow-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-white" />
                            <span className="text-white font-medium">Regular Hours</span>
                          </div>
                          <p className="text-white font-semibold">7:00 AM - 3:30 PM</p>
                          <p className="text-white text-sm">₱200 daily cap</p>
                        </div>
                        
                        <div className="bg-orange-400 p-4 rounded-lg border border-orange-600 shadow-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-white" />
                            <span className="text-white font-medium">Overtime Rate</span>
                          </div>
                          <p className="text-white font-semibold">₱35/hour</p>
                          <p className="text-white text-sm">After 3:30 PM</p>
                        </div>
                        
                        <div className="bg-red-400 p-4 rounded-lg border border-red-800 shadow-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-white" />
                            <span className="text-white font-medium">Late Penalty</span>
                          </div>
                          <p className="text-white font-semibold">₱23.53/hour</p>
                          <p className="text-white text-sm">After 7:00 AM</p>
                        </div>
                        
                        <div className="bg-purple-400 p-4 rounded-lg border border-violet-800 shadow-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Home className="w-4 h-4 text-white" />
                            <span className="text-white font-medium">Staff House</span>
                          </div>
                          {user?.staff_house ? (
                            <>
                              <p className="text-white font-semibold">Enrolled</p>
                              <p className="text-white text-sm">₱250/week deduction</p>
                            </>
                          ) : (
                            <>
                              <p className="text-white font-semibold">Not Enrolled</p>
                              <p className="text-white text-sm">No deduction</p>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4 p-4 bg-indigo-900 rounded-lg border border-white">
                        <p className="text-sm text-white">
                          <strong>Note:</strong> Base pay is capped at ₱200 for 8.5 hours. Work hours are counted from 7:00 AM onwards only.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payroll-history' && <PayrollHistory />}
        </div>
      </div>

      {/* Notifications Modal */}
      {showNotifications && notifications.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-md border border-slate-200/60">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-indigo-500" />
              <h3 className="text-xl font-semibold text-slate-800">Overtime Updates</h3>
            </div>
            
            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
              {notifications.map((notification, index) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  notification.overtime_approved 
                    ? 'bg-emerald-50/80 border-emerald-200/60' 
                    : 'bg-rose-50/80 border-rose-200/60'
                }`}>
                  <span className={`font-semibold ${
                    notification.overtime_approved ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {notification.overtime_approved ? 'Overtime Approved ✓' : 'Overtime Rejected ✗'}
                  </span>
                  <p className="text-sm text-slate-600 mt-1">
                    {new Date(notification.clock_in).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => {
                setShowNotifications(false);
                setNotifications([]);
              }}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 btn-enhanced"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Overtime Request Modal */}
      {showOvertimeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-md border border-slate-200/60">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-6 h-6 text-amber-500" />
              <h3 className="text-xl font-semibold text-slate-800">Request Overtime</h3>
            </div>
            
            <div className="bg-amber-50/80 p-4 rounded-lg border border-amber-200/60 mb-4">
              <p className="text-sm text-slate-800">
                {isAfterShiftHours() 
                  ? `Current overtime: ${formatTimeDisplay(overtimeTime)} past 4:00 PM`
                  : 'Submit a request for overtime work after 4:00 PM'
                }
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-800 mb-2">
                Reason for Overtime <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={overtimeNote}
                onChange={(e) => setOvertimeNote(e.target.value)}
                className="w-full p-3 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-500 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={4}
                placeholder="Please explain the reason for overtime work..."
                required
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOvertimeModal(false);
                  setOvertimeNote('');
                }}
                className="flex-1 bg-slate-200/80 text-slate-700 py-3 px-4 rounded-lg font-medium hover:bg-slate-300/80 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={submitOvertimeRequest}
                disabled={!overtimeNote.trim() || isLoading}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 btn-enhanced"
              >
                {isLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}