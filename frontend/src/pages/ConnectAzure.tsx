import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, ArrowLeft, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';

const ConnectAzure: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState('');

  const [formData, setFormData] = useState({
    accountName: '',
    subscriptionId: '',
    tenantId: '',
    clientId: '',
    clientSecret: '',
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('accessToken');

      const response = await fetch('http://localhost:3000/api/cloud/connect-azure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect Azure account');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const instructions = [
    {
      step: 1,
      title: 'Create Azure App Registration',
      details: [
        'Go to Azure Portal → Azure Active Directory → App Registrations',
        'Click "New registration"',
        'Name: "CloudGuard Pro Cost Reader"',
        'Supported account types: Single tenant',
        'Click "Register"',
      ],
    },
    {
      step: 2,
      title: 'Get Application (Client) ID & Tenant ID',
      details: [
        'After registration, copy the "Application (client) ID"',
        'Copy the "Directory (tenant) ID"',
        'Paste both values in the form below',
      ],
    },
    {
      step: 3,
      title: 'Create Client Secret',
      details: [
        'Go to "Certificates & secrets" → "Client secrets"',
        'Click "New client secret"',
        'Description: "CloudGuard Pro"',
        'Expires: Choose your preference (recommended: 24 months)',
        'Click "Add" and IMMEDIATELY copy the secret value (it won\'t be shown again!)',
      ],
    },
    {
      step: 4,
      title: 'Assign Cost Management Reader Role',
      details: [
        'Go to Azure Portal → Subscriptions',
        'Select your subscription',
        'Copy the Subscription ID',
        'Go to "Access control (IAM)" → "Add role assignment"',
        'Role: "Cost Management Reader"',
        'Assign access to: "User, group, or service principal"',
        'Select your "CloudGuard Pro Cost Reader" app',
        'Click "Review + assign"',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
        <div className="container-custom py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Connect Azure Account</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Connect your Microsoft Azure subscription to monitor costs
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Setup Instructions */}
          <div>
            <div className="card mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Setup Instructions
              </h2>
              <div className="space-y-6">
                {instructions.map((instruction) => (
                  <div key={instruction.step}>
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {instruction.step}
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white pt-1">
                        {instruction.title}
                      </h3>
                    </div>
                    <ul className="ml-11 space-y-1">
                      {instruction.details.map((detail, idx) => (
                        <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Required Permissions */}
            <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">
                Required Permissions
              </h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Cost Management Reader (read-only access to billing data)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  No write or modify permissions required
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Credentials stored securely with encryption
                </li>
              </ul>
            </div>
          </div>

          {/* Connection Form */}
          <div>
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Azure Credentials
              </h2>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Azure account connected successfully!
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Redirecting to dashboard...
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="label">Account Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    className="input"
                    placeholder="Production Azure"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Friendly name to identify this account
                  </p>
                </div>

                <div>
                  <label className="label">Subscription ID *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.subscriptionId}
                      onChange={(e) => setFormData({ ...formData, subscriptionId: e.target.value })}
                      className="input pr-10"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(formData.subscriptionId, 'subscription')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {copied === 'subscription' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Tenant ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.tenantId}
                    onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                    className="input"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </div>

                <div>
                  <label className="label">Application (Client) ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="input"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </div>

                <div>
                  <label className="label">Client Secret *</label>
                  <input
                    type="password"
                    required
                    value={formData.clientSecret}
                    onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                    className="input"
                    placeholder="Your client secret value"
                  />
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    ⚠️ Copy this immediately - it's only shown once in Azure Portal!
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || success}
                  className="btn btn-primary w-full disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="spinner w-5 h-5 mr-2"></div>
                      Connecting...
                    </>
                  ) : success ? (
                    'Connected!'
                  ) : (
                    'Connect Azure Account'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectAzure;
