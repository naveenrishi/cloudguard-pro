import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Copy, Check, AlertCircle, Download } from 'lucide-react';

const SetupMFA: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isRequired = location.state?.firstLogin || false;
  const message = location.state?.message || '';

  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateMFA();
  }, []);

  const generateMFA = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth/setup-mfa/${user.id}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup MFA');
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth/verify-mfa-setup/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      setBackupCodes(data.backupCodes);
      setStep('backup');

      const updatedUser = { ...user, mfaEnabled: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    navigate('/dashboard');
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cloudguard-backup-codes.txt';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Two-Factor Authentication</h1>
          <p className="text-gray-600 mt-2">
            {step === 'setup' && 'Scan the QR code with your authenticator app'}
            {step === 'verify' && 'Enter the 6-digit code from your app'}
            {step === 'backup' && 'Save your backup codes'}
          </p>
        </div>

        <div className="card">
          {message && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">{message}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {step === 'setup' && (
            <div className="space-y-6">
              {qrCode && (
                <div className="flex justify-center">
                  <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                </div>
              )}

              <div>
                <label className="label">Manual Entry Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={secret}
                    readOnly
                    className="input flex-1 font-mono text-sm"
                  />
                  <button
                    onClick={copySecret}
                    className="btn btn-secondary"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Use this code if you can't scan the QR code
                </p>
              </div>

              <button
                onClick={() => setStep('verify')}
                className="btn btn-primary w-full"
              >
                Continue to Verification
              </button>
            </div>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label className="label">Verification Code</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="input text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </form>
          )}

          {step === 'backup' && (
            <div className="space-y-6">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  ⚠️ Important: Save these backup codes
                </p>
                <p className="text-xs text-yellow-700">
                  You can use these codes to access your account if you lose your authenticator device.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="p-2 bg-white rounded border border-gray-200">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={downloadBackupCodes}
                className="btn btn-secondary w-full"
              >
                <Download className="w-5 h-5" />
                Download Backup Codes
              </button>

              <button
                onClick={handleComplete}
                className="btn btn-primary w-full"
              >
                Complete Setup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupMFA;
