import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Bell, 
  Shield, 
  CreditCard,
  Mail,
  Save,
  ArrowLeft,
  Key,
  Smartphone,
  Download
} from 'lucide-react';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    costThresholdAlerts: true,
    weeklyReports: true,
    securityAlerts: true,
    budgetAlerts: true,
    recommendationAlerts: false,
  });

  const [preferences, setPreferences] = useState({
    currency: 'USD',
    timezone: 'UTC',
    costThreshold: 1000,
    language: 'en',
  });

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        company: '',
        phone: '',
      });

      // Load settings from backend
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:3000/api/users/${user.id}/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const settings = await response.json();
        setNotificationSettings(settings.notifications || notificationSettings);
        setPreferences(settings.preferences || preferences);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setMessage('');

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`http://localhost:3000/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setMessage('Profile updated successfully!');
      } else {
        setMessage('Failed to update profile');
      }
    } catch (error) {
      setMessage('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    setMessage('');

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`http://localhost:3000/api/users/${user.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          notifications: notificationSettings,
          preferences: preferences,
        }),
      });

      if (response.ok) {
        setMessage('Settings saved successfully!');
      } else {
        setMessage('Failed to save settings');
      }
    } catch (error) {
      setMessage('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'billing', name: 'Billing', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container-custom py-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Manage your CloudGuard Pro account</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-4">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                message.includes('success') 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="label">Full Name</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="input"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="label">Email Address</label>
                      <input
                        type="email"
                        value={profileData.email}
                        disabled
                        className="input bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                      <label className="label">Company Name</label>
                      <input
                        type="text"
                        value={profileData.company}
                        onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                        className="input"
                        placeholder="Acme Inc."
                      />
                    </div>

                    <div>
                      <label className="label">Phone Number</label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="input"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="label">Currency</label>
                        <select
                          value={preferences.currency}
                          onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                          className="input"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="INR">INR (₹)</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Timezone</label>
                        <select
                          value={preferences.timezone}
                          onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                          className="input"
                        >
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                          <option value="Europe/London">London</option>
                          <option value="Asia/Kolkata">India</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Cost Alert Threshold</label>
                        <input
                          type="number"
                          value={preferences.costThreshold}
                          onChange={(e) => setPreferences({ ...preferences, costThreshold: parseInt(e.target.value) })}
                          className="input"
                          placeholder="1000"
                        />
                        <p className="text-xs text-gray-500 mt-1">Alert when monthly cost exceeds this amount</p>
                      </div>

                      <div>
                        <label className="label">Language</label>
                        <select
                          value={preferences.language}
                          onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                          className="input"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="btn btn-primary disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  <div className="space-y-4">
                    {[
                      { key: 'emailAlerts', label: 'Email Alerts', description: 'Receive email notifications for important events' },
                      { key: 'costThresholdAlerts', label: 'Cost Threshold Alerts', description: 'Alert when costs exceed your threshold' },
                      { key: 'budgetAlerts', label: 'Budget Alerts', description: 'Notify when approaching or exceeding budgets' },
                      { key: 'securityAlerts', label: 'Security Alerts', description: 'Critical security and compliance notifications' },
                      { key: 'recommendationAlerts', label: 'Recommendation Alerts', description: 'New cost optimization recommendations' },
                      { key: 'weeklyReports', label: 'Weekly Reports', description: 'Receive weekly cost summary reports' },
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{setting.label}</h4>
                          <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={notificationSettings[setting.key as keyof typeof notificationSettings]}
                            onChange={(e) => setNotificationSettings({
                              ...notificationSettings,
                              [setting.key]: e.target.checked,
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSaveNotifications}
                      disabled={loading}
                      className="btn btn-primary disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" />
                      {loading ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Security Settings</h2>
                
                <div className="space-y-6">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-green-600" />
                      <div>
                        <h4 className="font-medium text-green-900">Two-Factor Authentication Enabled</h4>
                        <p className="text-sm text-green-700 mt-1">Your account is protected with 2FA</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Key className="w-5 h-5 text-gray-600 mt-1" />
                          <div>
                            <h4 className="font-medium text-gray-900">Change Password</h4>
                            <p className="text-sm text-gray-600 mt-1">Update your password regularly for security</p>
                          </div>
                        </div>
                        <button className="btn btn-secondary">
                          Change
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Smartphone className="w-5 h-5 text-gray-600 mt-1" />
                          <div>
                            <h4 className="font-medium text-gray-900">Backup Codes</h4>
                            <p className="text-sm text-gray-600 mt-1">Download backup codes for account recovery</p>
                          </div>
                        </div>
                        <button className="btn btn-secondary">
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Mail className="w-5 h-5 text-gray-600 mt-1" />
                          <div>
                            <h4 className="font-medium text-gray-900">Active Sessions</h4>
                            <p className="text-sm text-gray-600 mt-1">Manage your active login sessions</p>
                          </div>
                        </div>
                        <button className="btn btn-secondary">
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Billing & Subscription</h2>
                
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Free Plan</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          1 AWS account • Basic monitoring • Email support
                        </p>
                        <p className="text-2xl font-bold text-primary-600 mt-4">$0/month</p>
                      </div>
                      <span className="badge bg-primary-600 text-white">Current Plan</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors cursor-pointer">
                      <h4 className="font-semibold text-gray-900">Professional</h4>
                      <p className="text-sm text-gray-600 mt-1">5 cloud accounts • Advanced analytics</p>
                      <p className="text-xl font-bold text-gray-900 mt-3">$49/month</p>
                      <button className="btn btn-primary w-full mt-4">Upgrade</button>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors cursor-pointer">
                      <h4 className="font-semibold text-gray-900">Enterprise</h4>
                      <p className="text-sm text-gray-600 mt-1">Unlimited accounts • Priority support</p>
                      <p className="text-xl font-bold text-gray-900 mt-3">$199/month</p>
                      <button className="btn btn-primary w-full mt-4">Upgrade</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
