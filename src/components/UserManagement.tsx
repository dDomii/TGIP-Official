import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { Plus, Edit2, User, Shield, Clock, Trash2, ChevronDown, ChevronUp, Download, Search, Filter, X } from 'lucide-react';

interface User {
  id: number;
  username: string;
  role: string;
  department: string;
  gcash_number: string;
  staff_house: boolean;
  required_hours: number;
  active: boolean;
  created_at: string;
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
  'Human Resource': {
    bg: 'bg-orange-100/10',
    border: 'border-orange-300/30',
    text: 'text-orange-300',
    accent: 'from-orange-400/20 to-orange-500/20',
    icon: 'text-orange-400'
  },
  'Marketing': {
    bg: 'bg-gray-100/10',
    border: 'border-gray-300/30',
    text: 'text-gray-300',
    accent: 'from-gray-400/20 to-gray-500/20',
    icon: 'text-gray-400'
  },
  'Finance': {
    bg: 'bg-sky-100/10',
    border: 'border-sky-300/30',
    text: 'text-sky-300',
    accent: 'from-sky-400/20 to-sky-500/20',
    icon: 'text-sky-400'
  },
  'Account Management': {
    bg: 'bg-yellow-100/10',
    border: 'border-yellow-300/30',
    text: 'text-yellow-300',
    accent: 'from-yellow-400/20 to-yellow-500/20',
    icon: 'text-yellow-400'
  },
  'System Automation': {
    bg: 'bg-green-100/10',
    border: 'border-green-300/30',
    text: 'text-green-300',
    accent: 'from-green-400/20 to-green-500/20',
    icon: 'text-green-400'
  },
  'Sales': {
    bg: 'bg-pink-100/10',
    border: 'border-pink-300/30',
    text: 'text-pink-300',
    accent: 'from-pink-400/20 to-pink-500/20',
    icon: 'text-pink-400'
  },
  'Training': {
    bg: 'bg-cyan-100/10',
    border: 'border-cyan-300/30',
    text: 'text-cyan-300',
    accent: 'from-cyan-400/20 to-cyan-500/20',
    icon: 'text-cyan-400'
  },
  'IT Department': {
    bg: 'bg-purple-100/10',
    border: 'border-purple-300/30',
    text: 'text-purple-300',
    accent: 'from-purple-400/20 to-purple-500/20',
    icon: 'text-purple-400'
  }
};

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set(DEPARTMENTS));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'ojt',
    department: DEPARTMENTS[0],
    gcash_number: '',
    required_hours: 0,
    staff_house: false,
    active: true
  });
  const [timeAdjustment, setTimeAdjustment] = useState({
    clockIn: '',
    clockOut: '',
    date: new Date().toISOString().split('T')[0]
  });
  const { token } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm.length > 0) {
      const suggestions = users.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5); // Limit to 5 suggestions
      setSearchSuggestions(suggestions);
      setShowSearchDropdown(true);
    } else {
      setSearchSuggestions([]);
      setShowSearchDropdown(false);
    }
  }, [searchTerm, users]);

  const handleSearchSelect = (user: User) => {
    setSearchTerm(user.username);
    setSelectedDepartmentFilter(''); // Don't auto-filter by department
    setShowSearchDropdown(false);
    
    // Expand the user's department and scroll to it
    const newExpanded = new Set(expandedDepartments);
    newExpanded.add(user.department);
    setExpandedDepartments(newExpanded);
    
    // Scroll to the department after a short delay
    setTimeout(() => {
      const element = document.getElementById(`dept-${user.department.replace(/\s+/g, '-')}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Highlight the user temporarily
        const userElement = document.getElementById(`user-${user.id}`);
        if (userElement) {
          userElement.classList.add('ring-2', 'ring-emerald-500', 'ring-opacity-75');
          setTimeout(() => {
            userElement.classList.remove('ring-2', 'ring-emerald-500', 'ring-opacity-75');
          }, 2000);
        }
      }
    }, 100);
  };
  const fetchUsers = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.USERS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingUser 
        ? `${API_ENDPOINTS.USERS}/${editingUser.id}`
        : API_ENDPOINTS.USERS;
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        fetchUsers();
        setShowModal(false);
        resetForm();
      } else {
        alert(data.message || 'Failed to save user');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user');
    }
  };

  const handleTimeAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) return;

    try {
      const response = await fetch(`${API_ENDPOINTS.USERS}/${selectedUserId}/adjust-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(timeAdjustment),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Time adjustment saved successfully');
        setShowTimeModal(false);
        setTimeAdjustment({
          clockIn: '',
          clockOut: '',
          date: new Date().toISOString().split('T')[0]
        });
      } else {
        alert(data.message || 'Failed to adjust time');
      }
    } catch (error) {
      console.error('Error adjusting time:', error);
      alert('Failed to adjust time');
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      const response = await fetch(`${API_ENDPOINTS.USERS}/${deletingUser.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        alert(data.message || 'User deleted successfully');
        fetchUsers();
        setShowDeleteModal(false);
        setDeletingUser(null);
      } else {
        alert(data.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'ojt',
      department: DEPARTMENTS[0],
      gcash_number: '',
      required_hours: 0,
      staff_house: false,
      active: true
    });
    setEditingUser(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      department: user.department,
      gcash_number: user.gcash_number || '',
      required_hours: user.required_hours || 0,
      staff_house: user.staff_house,
      active: user.active
    });
    setShowModal(true);
  };

  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleTimeEdit = (userId: number) => {
    setSelectedUserId(userId);
    setShowTimeModal(true);
  };

  const handleDeleteClick = (user: User) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  const toggleDepartment = (department: string) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(department)) {
      newExpanded.delete(department);
    } else {
      newExpanded.add(department);
    }
    setExpandedDepartments(newExpanded);
  };

  const exportToCSV = () => {
    if (users.length === 0) return;

    const headers = [
      'Username',
      'Role',
      'Department',
      'GCash Number',
      'Staff House',
      'Status',
      'Created Date'
    ];

    const rows = users.map(user => [
      user.username,
      user.role,
      user.department,
      user.gcash_number || 'N/A',
      user.staff_house ? 'Yes' : 'No',
      user.active ? 'Active' : 'Inactive',
      new Date(user.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Group users by department
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartmentFilter === '' || user.department === selectedDepartmentFilter;
    return matchesSearch && matchesDepartment;
  });

  const groupedUsers = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = filteredUsers.filter(user => user.department === dept);
    return acc;
  }, {} as Record<string, User[]>);

  const totalUsers = users.length;
  const activeUsers = filteredUsers.filter(user => user.active).length;
  const totalFiltered = filteredUsers.length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-slate-400">
            Manage users organized by department • {totalFiltered} of {totalUsers} users shown
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={exportToCSV}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2 shadow-lg"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleAdd}
            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-200 flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-lg border border-slate-700/50">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Search Users
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              onFocus={() => {
                if (searchTerm.length > 0) setShowSearchDropdown(true);
              }}
              onBlur={() => {
                // Delay hiding to allow click on suggestions
                setTimeout(() => setShowSearchDropdown(false), 200);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Search by username or department..."
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDepartmentFilter('');
                  setShowSearchDropdown(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            {/* Search Dropdown */}
            {showSearchDropdown && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                {searchSuggestions.map((user) => {
                  const colors = DEPARTMENT_COLORS[user.department];
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSearchSelect(user)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors border-b border-slate-700/30 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`bg-gradient-to-br ${colors.accent} p-1.5 rounded-lg border ${colors.border}`}>
                          {user.role === 'admin' ? (
                            <Shield className={`w-3 h-3 ${colors.icon}`} />
                          ) : (
                            <User className={`w-3 h-3 ${colors.icon}`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white text-sm">{user.username}</p>
                          <p className={`text-xs ${colors.text}`}>{user.department}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {user.role === 'admin' && (
                            <span className="bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded text-xs">Admin</span>
                          )}
                          {user.staff_house && (
                            <span className="bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded text-xs">SH</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Filter by Department
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <select
              value={selectedDepartmentFilter}
              onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            </div>
          </div>
        </div>
        
        {/* Statistics Row */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{totalFiltered}</p>
              <p className="text-sm text-slate-400">Total Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{activeUsers}</p>
              <p className="text-sm text-slate-400">Active Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{totalFiltered - activeUsers}</p>
              <p className="text-sm text-slate-400">Inactive Users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Department-wise User Lists */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DEPARTMENTS.map((department) => {
          const deptUsers = groupedUsers[department];
          const colors = DEPARTMENT_COLORS[department];
          const isExpanded = expandedDepartments.has(department);
          const activeCount = deptUsers.filter(user => user.active).length;

          return (
            <div 
              key={department} 
              id={`dept-${department.replace(/\s+/g, '-')}`}
              className={`${colors.bg} backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border ${colors.border} h-fit`}
            >
              <button
                onClick={() => toggleDepartment(department)}
                className={`w-full px-3 py-2.5 bg-gradient-to-r ${colors.accent} border-b ${colors.border} flex items-center justify-between hover:opacity-80 transition-all duration-200`}
              >
                <div className="flex items-center gap-3">
                  <div className={`bg-gradient-to-br ${colors.accent} p-1 rounded-lg border ${colors.border}`}>
                    <User className={`w-4 h-4 ${colors.icon}`} />
                  </div>
                  <div className="text-left">
                    <h3 className={`text-sm font-semibold ${colors.text}`}>{department}</h3>
                    <p className="text-xs text-slate-400">
                      {deptUsers.length} total • {activeCount} active
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium border ${colors.border} ${colors.text}`}>
                    {deptUsers.length} users
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className={`divide-y max-h-96 overflow-y-auto`} style={{ borderColor: DEPARTMENT_COLORS[department].border.split(' ')[1] }}>
                  {deptUsers.length > 0 ? (
                    deptUsers.map((user) => (
                      <div 
                        key={user.id} 
                        id={`user-${user.id}`}
                        className={`p-4 hover:bg-slate-700/20 transition-all duration-200 border-l-2 border-transparent hover:border-l-emerald-500/50 last:border-b-0`}
                        style={{ 
                          borderBottomColor: colors.border ? colors.border.split(' ')[1]?.replace('border-', '')?.replace('/30', '/20') || 'rgba(71, 85, 105, 0.2)' : 'rgba(71, 85, 105, 0.2)'
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`bg-gradient-to-br ${colors.accent} p-1.5 rounded-lg border ${colors.border} flex-shrink-0`}>
                              {user.role === 'admin' ? (
                                <Shield className={`w-3.5 h-3.5 ${colors.icon}`} />
                              ) : (
                                <User className={`w-3.5 h-3.5 ${colors.icon}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-white text-base break-words">{user.username}</h4>
                                {user.role === 'admin' && (
                                  <span className="bg-gradient-to-r from-emerald-500/20 to-green-600/20 text-emerald-400 px-2 py-0.5 rounded-full text-xs font-medium border border-emerald-800/50">
                                    ADMIN
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  user.active 
                                    ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/50' 
                                    : 'bg-red-900/30 text-red-300 border border-red-700/50'
                                }`}>
                                  {user.active ? 'Active' : 'Inactive'}
                                </span>
                                {user.staff_house == true && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-700/50">
                                    Staff House
                                  </span>
                                )}
                              </div>
                              <div className="mt-3 space-y-1.5 bg-slate-800/30 p-2 rounded-lg border border-slate-600/30">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500">Created:</span>
                                  <span className="text-slate-300">{new Date(user.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500">GCash:</span>
                                  <span className="text-green-400 font-mono break-all">{user.gcash_number || 'Not provided'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500">Required Hours:</span>
                                  <span className="text-blue-400 font-medium">{user.required_hours || 0}h</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-blue-900/30 transition-all duration-200 border border-transparent hover:border-blue-700/50"
                              title="Edit User"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleTimeEdit(user.id)}
                              className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded-lg hover:bg-emerald-900/30 transition-all duration-200 border border-transparent hover:border-emerald-700/50"
                              title="Adjust Time"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(user)}
                              className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-900/30 transition-all duration-200 border border-transparent hover:border-red-700/50"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center">
                      <div className={`bg-gradient-to-br ${colors.accent} p-2 rounded-full w-8 h-8 mx-auto mb-2 flex items-center justify-center border ${colors.border}`}>
                        <User className={`w-4 h-4 ${colors.icon}`} />
                      </div>
                      <h3 className="text-sm font-medium text-white mb-1">No Users Found</h3>
                      <p className="text-xs text-slate-400">
                        {searchTerm || selectedDepartmentFilter 
                          ? 'No users match your search criteria.' 
                          : 'No users in this department.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-md border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  required
                  disabled={!!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                >
                  <option value="ojt">OJT</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  required
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  GCash Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.gcash_number}
                  onChange={(e) => setFormData({ ...formData, gcash_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  placeholder="09XXXXXXXXX"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Required Hours
                </label>
                <input
                  type="number"
                  value={formData.required_hours}
                  onChange={(e) => setFormData({ ...formData, required_hours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  placeholder="Total hours required (e.g., 240)"
                  min="0"
                  step="0.5"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Total hours the user needs to complete for their program/internship
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.staff_house}
                    onChange={(e) => setFormData({ ...formData, staff_house: e.target.checked })}
                    className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-700/50"
                  />
                  <span className="ml-2 text-sm text-slate-300">Staff House</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-700/50"
                  />
                  <span className="ml-2 text-sm text-slate-300">Active</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-700/50 text-slate-300 py-2 px-4 rounded-lg font-medium hover:bg-slate-600/50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2 px-4 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-200"
                >
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Time Adjustment Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-md border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">
              Adjust Time Entry
            </h3>
            
            <form onSubmit={handleTimeAdjustment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={timeAdjustment.date}
                  onChange={(e) => setTimeAdjustment({ ...timeAdjustment, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Clock In Time
                </label>
                <input
                  type="time"
                  value={timeAdjustment.clockIn}
                  onChange={(e) => setTimeAdjustment({ ...timeAdjustment, clockIn: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Clock Out Time (optional)
                </label>
                <input
                  type="time"
                  value={timeAdjustment.clockOut}
                  onChange={(e) => setTimeAdjustment({ ...timeAdjustment, clockOut: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                />
              </div>

              <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-800/50">
                <p className="text-sm text-yellow-400">
                  <strong>Note:</strong> This will override existing time entries for the selected date. Use with caution.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTimeModal(false)}
                  className="flex-1 bg-slate-700/50 text-slate-300 py-2 px-4 rounded-lg font-medium hover:bg-slate-600/50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2 px-4 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-200"
                >
                  Adjust Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-md border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">
              Delete User
            </h3>
            
            <div className="mb-6">
              <p className="text-slate-300 mb-2">
                Are you sure you want to delete <strong className="text-white">{deletingUser.username}</strong>?
              </p>
              <div className="bg-red-900/20 p-3 rounded-lg border border-red-800/50">
                <p className="text-sm text-red-400">
                  <strong>Warning:</strong> If this user has existing time entries or payroll records, 
                  they will be deactivated instead of deleted to preserve data integrity.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingUser(null);
                }}
                className="flex-1 bg-slate-700/50 text-slate-300 py-2 px-4 rounded-lg font-medium hover:bg-slate-600/50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2 px-4 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}