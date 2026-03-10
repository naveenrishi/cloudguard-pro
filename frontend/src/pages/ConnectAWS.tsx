import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api.service';
import { Cloud, Key, Globe, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

const ConnectAWS: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    accountName: '',
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const regions = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'EU (Ireland)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiService.connectAWSAccount(formData);
      console.log('✅ AWS account connected:', result);
      
      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to connect AWS account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-2xl mb-4">
            <Cloud className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Connect AWS Account</h1>
          <p className="text-slate-400">
            Securely connect your AWS account to start monitoring costs and resources
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-green-400 font-semibold">AWS Account Connected Successfully!</p>
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
                placeholder="e.g., Production AWS"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Access Key ID */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                <Key className="w-4 h-4 inline mr-2" />
                AWS Access Key ID *
              </label>
              <input
                type="text"
                required
                value={formData.accessKeyId}
                onChange={(e) => setFormData({ ...formData, accessKeyId: e.target.value })}
                placeholder="AKIA..."
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Secret Access Key */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                <Key className="w-4 h-4 inline mr-2" />
                AWS Secret Access Key *
              </label>
              <input
                type="password"
                required
                value={formData.secretAccessKey}
                onChange={(e) => setFormData({ ...formData, secretAccessKey: e.target.value })}
                placeholder="Enter your secret access key"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                <Globe className="w-4 h-4 inline mr-2" />
                Primary Region *
              </label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {regions.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <h4 className="text-blue-400 font-semibold mb-2 text-sm">Required Permissions</h4>
              <ul className="text-blue-300 text-xs space-y-1">
                <li>• Cost Explorer read access</li>
                <li>• EC2, RDS, S3 describe permissions</li>
                <li>• IAM read-only access</li>
                <li>• CloudWatch metrics access</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  Connect AWS Account
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Setup Guide Link */}
        <div className="mt-6 text-center">
          
            <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300 text-sm"
          >
            📖 How to create AWS Access Keys &rarr;
          </a>
        </div>
      </div>
    </div>
  );
};

export default ConnectAWS;