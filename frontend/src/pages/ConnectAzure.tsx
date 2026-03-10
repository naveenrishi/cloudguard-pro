import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api.service';
import { Cloud, Key, Shield, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

const ConnectAzure: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    accountName: '',
    tenantId: '',
    clientId: '',
    clientSecret: '',
    subscriptionId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiService.connectAzureAccount(formData);
      console.log('✅ Azure account connected:', result);
      
      setSuccess(true);

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to connect Azure account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-2xl mb-4">
            <Cloud className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Connect Azure Account</h1>
          <p className="text-slate-400">
            Securely connect your Azure subscription to CloudGuard Pro
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-green-400 font-semibold">Azure Account Connected Successfully!</p>
              <p className="text-green-300 text-sm">Redirecting to dashboard...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Account Name *
              </label>
              <input
                type="text"
                required
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                placeholder="e.g., Production Azure"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tenant ID */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                <Shield className="w-4 h-4 inline mr-2" />
                Tenant ID *
              </label>
              <input
                type="text"
                required
                value={formData.tenantId}
                onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Client ID */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                <Key className="w-4 h-4 inline mr-2" />
                Client ID (Application ID) *
              </label>
              <input
                type="text"
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Client Secret */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                <Key className="w-4 h-4 inline mr-2" />
                Client Secret *
              </label>
              <input
                type="password"
                required
                value={formData.clientSecret}
                onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                placeholder="Enter your client secret"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Subscription ID */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                <Cloud className="w-4 h-4 inline mr-2" />
                Subscription ID *
              </label>
              <input
                type="text"
                required
                value={formData.subscriptionId}
                onChange={(e) => setFormData({ ...formData, subscriptionId: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <h4 className="text-blue-400 font-semibold mb-2 text-sm">Required Roles</h4>
              <ul className="text-blue-300 text-xs space-y-1">
                <li>• Reader role on subscription</li>
                <li>• Cost Management Reader role</li>
                <li>• Security Reader role</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Connecting...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Connected!
                </>
              ) : (
                <>
                  Connect Azure Account
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Setup Guide Link */}
        <div className="mt-6 text-center">
          
            <a href="https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            📖 How to create Azure Service Principal &rarr;
          </a>
        </div>
      </div>
    </div>
  );
};

export default ConnectAzure;