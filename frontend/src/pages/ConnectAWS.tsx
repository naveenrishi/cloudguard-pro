import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, AlertCircle } from 'lucide-react';

const ConnectAWS: React.FC = () => {
  const navigate = useNavigate();
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [roleArn, setRoleArn] = useState('');
  const [externalId, setExternalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const randomId = Math.random().toString(36).substring(2, 15);
    setExternalId(`cloudguard-${user.id}-${randomId}`);
  }, []);

  const handleConnect = async () => {
    if (!accountName || !accountId || !roleArn) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('accessToken');

      const response = await fetch('http://localhost:3000/api/cloud/aws/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          accountName,
          accountId,
          roleArn,
          externalId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('AWS account connected successfully!');
        navigate('/dashboard');
      } else {
        setError(data.error || 'Failed to connect AWS account');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container-custom py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Connect AWS Account</h1>
              <p className="text-gray-600 mt-1">Securely connect your AWS account using IAM Role</p>
            </div>
            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Connect Your AWS Account</h2>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  ℹ️ Create an IAM Role in AWS with ViewOnlyAccess policy and use the details below.
                </p>
              </div>

              <div>
                <label className="label">Account Name (Friendly Name)</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="input"
                  placeholder="Production AWS Account"
                />
              </div>

              <div>
                <label className="label">AWS Account ID</label>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  className="input"
                  placeholder="123456789012"
                  maxLength={12}
                />
              </div>

              <div>
                <label className="label">IAM Role ARN</label>
                <input
                  type="text"
                  value={roleArn}
                  onChange={(e) => setRoleArn(e.target.value)}
                  className="input"
                  placeholder="arn:aws:iam::123456789012:role/CloudGuardProRole"
                />
              </div>

              <div>
                <label className="label">External ID</label>
                <input
                  type="text"
                  value={externalId}
                  readOnly
                  className="input bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use this External ID when creating your IAM Role in AWS
                </p>
              </div>

              <button
                onClick={handleConnect}
                disabled={loading || !accountName || !accountId || !roleArn}
                className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="spinner w-5 h-5"></div>
                    <span>Connecting...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Cloud className="w-5 h-5" />
                    <span>Connect AWS Account</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectAWS;
