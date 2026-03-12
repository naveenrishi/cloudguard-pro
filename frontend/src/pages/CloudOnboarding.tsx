import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, Download, Copy, ChevronRight, ChevronLeft,
  AlertCircle, Loader2, Shield, Zap, Eye, ArrowRight,
  Terminal, CloudLightning, Lock
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';
const token = () => localStorage.getItem('accessToken') || '';

// ── Cloud provider config ──────────────────────────────────────────────────────
const PROVIDERS = {
  aws: {
    id: 'aws',
    name: 'Amazon Web Services',
    short: 'AWS',
    color: '#FF9900',
    bg: 'rgba(255,153,0,0.08)',
    border: 'rgba(255,153,0,0.25)',
    icon: '🟠',
    description: 'Connect via IAM Role — no access keys stored',
    steps: ['Download Template', 'Deploy Stack', 'Paste Role ARN'],
  },
  azure: {
    id: 'azure',
    name: 'Microsoft Azure',
    short: 'Azure',
    color: '#0078D4',
    bg: 'rgba(0,120,212,0.08)',
    border: 'rgba(0,120,212,0.25)',
    icon: '🔵',
    description: 'Connect via Service Principal — Reader access only',
    steps: ['Download Script', 'Run in Cloud Shell', 'Paste Credentials'],
  },
  gcp: {
    id: 'gcp',
    name: 'Google Cloud Platform',
    short: 'GCP',
    color: '#34A853',
    bg: 'rgba(52,168,83,0.08)',
    border: 'rgba(52,168,83,0.25)',
    icon: '🟢',
    description: 'Connect via Service Account — Viewer roles only',
    steps: ['Download Script', 'Run in Cloud Shell', 'Upload Key File'],
  },
};

type Provider = 'aws' | 'azure' | 'gcp';

// ── AWS Step 3: Verify Role ARN ────────────────────────────────────────────────
function AWSVerifyStep({ onSuccess }: { onSuccess: (account: any) => void }) {
  const [roleArn, setRoleArn] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const verify = async () => {
    if (!roleArn.startsWith('arn:aws:iam::')) {
      setError('Role ARN must start with arn:aws:iam::');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/onboarding/verify/aws`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ roleArn, accountName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      onSuccess(data.account);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">After deploying the CloudFormation stack:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Go to CloudFormation → your stack → <strong>Outputs</strong> tab</li>
            <li>Copy the <strong>RoleArn</strong> value</li>
            <li>Paste it below</li>
          </ol>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Account Name (optional)</label>
        <input
          type="text"
          value={accountName}
          onChange={e => setAccountName(e.target.value)}
          placeholder="e.g. Production AWS, Dev Sandbox"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role ARN <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={roleArn}
          onChange={e => setRoleArn(e.target.value)}
          placeholder="arn:aws:iam::123456789012:role/CloudGuardProReadOnly"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        onClick={verify}
        disabled={loading || !roleArn}
        className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all"
        style={{ background: loading || !roleArn ? '#d1d5db' : '#FF9900' }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
        {loading ? 'Verifying connection...' : 'Verify & Connect Account'}
      </button>
    </div>
  );
}

// ── Azure Step 3: Paste credentials ───────────────────────────────────────────
function AzureVerifyStep({ onSuccess }: { onSuccess: (account: any) => void }) {
  const [form, setForm] = useState({ tenantId: '', subscriptionId: '', clientId: '', clientSecret: '', accountName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const verify = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/onboarding/verify/azure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      onSuccess(data.account);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'accountName', label: 'Account Name', placeholder: 'e.g. Production Azure', required: false },
    { key: 'tenantId', label: 'Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
    { key: 'subscriptionId', label: 'Subscription ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
    { key: 'clientId', label: 'Client ID (App ID)', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
    { key: 'clientSecret', label: 'Client Secret', placeholder: 'Your client secret value', required: true, secret: true },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Copy the values printed at the end of the Azure setup script and paste them below.
        </p>
      </div>

      {fields.map(f => (
        <div key={f.key}>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {f.label} {f.required && <span className="text-red-500">*</span>}
          </label>
          <input
            type={f.secret ? 'password' : 'text'}
            value={(form as any)[f.key]}
            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
        </div>
      ))}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        onClick={verify}
        disabled={loading || !form.tenantId || !form.subscriptionId || !form.clientId || !form.clientSecret}
        className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all"
        style={{ background: loading ? '#d1d5db' : '#0078D4' }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
        {loading ? 'Verifying connection...' : 'Verify & Connect Account'}
      </button>
    </div>
  );
}

// ── GCP Step 3: Upload key file ────────────────────────────────────────────────
function GCPVerifyStep({ onSuccess }: { onSuccess: (account: any) => void }) {
  const [keyContent, setKeyContent] = useState('');
  const [projectId, setProjectId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      try {
        const json = JSON.parse(text);
        setKeyContent(text);
        if (json.project_id) setProjectId(json.project_id);
      } catch {
        setError('Invalid JSON key file');
      }
    };
    reader.readAsText(file);
  };

  const verify = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/onboarding/verify/gcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ projectId, serviceAccountKey: keyContent, accountName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      onSuccess(data.account);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        <p className="text-sm text-green-800">
          The GCP script downloads a <strong>.json</strong> key file. Upload it below to complete setup.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Account Name (optional)</label>
        <input
          type="text"
          value={accountName}
          onChange={e => setAccountName(e.target.value)}
          placeholder="e.g. Production GCP"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Service Account Key File <span className="text-red-500">*</span></label>
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
          <input type="file" accept=".json" onChange={handleFile} className="hidden" />
          {fileName ? (
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
              <p className="text-sm font-medium text-green-700">{fileName}</p>
              <p className="text-xs text-gray-500">Click to change</p>
            </div>
          ) : (
            <div className="text-center">
              <CloudLightning className="w-8 h-8 text-gray-400 mx-auto mb-1" />
              <p className="text-sm text-gray-500">Click to upload <strong>.json</strong> key file</p>
              <p className="text-xs text-gray-400">From the GCP setup script output</p>
            </div>
          )}
        </label>
      </div>

      {projectId && (
        <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
          <span className="text-gray-500">Detected Project ID: </span>
          <span className="font-mono font-semibold text-gray-800">{projectId}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        onClick={verify}
        disabled={loading || !keyContent}
        className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all"
        style={{ background: loading || !keyContent ? '#d1d5db' : '#34A853' }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
        {loading ? 'Verifying connection...' : 'Verify & Connect Account'}
      </button>
    </div>
  );
}

// ── Step content per provider ──────────────────────────────────────────────────
function StepContent({
  provider, step, onSuccess
}: {
  provider: Provider;
  step: number;
  onSuccess: (account: any) => void;
}) {
  const p = PROVIDERS[provider];
  const [copied, setCopied] = useState(false);

  const copyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTemplate = async () => {
    const res = await fetch(`${API}/api/onboarding/template/${provider}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const blob = await res.blob();
    const ext = provider === 'aws' ? 'yaml' : 'sh';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloudguard-pro-${provider}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (step === 0) {
    // Step 1: Download
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4" style={{ background: p.bg }}>
            {provider === 'aws' ? '📄' : '📜'}
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {provider === 'aws' ? 'Download CloudFormation Template' : `Download ${provider === 'azure' ? 'Azure' : 'GCP'} Setup Script`}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {provider === 'aws'
              ? 'A CloudFormation template that creates a read-only IAM role. No access keys — uses secure cross-account role assumption.'
              : provider === 'azure'
              ? 'A bash script that creates a Service Principal with Reader access to your Azure subscription.'
              : 'A bash script that creates a Service Account with Viewer roles on your GCP project.'}
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">What gets created</p>
          {provider === 'aws' && (
            <ul className="space-y-2 text-sm text-gray-700">
              {['IAM Role: CloudGuardProReadOnly', 'Policy: ReadOnlyAccess (AWS managed)', 'Policy: SecurityAudit (AWS managed)', 'Secure ExternalId for cross-account access'].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}
          {provider === 'azure' && (
            <ul className="space-y-2 text-sm text-gray-700">
              {['Service Principal: CloudGuardPro-ReadOnly', 'Role: Reader (subscription scope)', 'Role: Security Reader', 'No permanent secrets stored'].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}
          {provider === 'gcp' && (
            <ul className="space-y-2 text-sm text-gray-700">
              {['Service Account: cloudguard-pro-readonly', 'Role: roles/viewer', 'Role: roles/cloudasset.viewer', 'Role: roles/securitycenter.adminViewer', 'Enables required GCP APIs'].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={downloadTemplate}
          className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-3 text-base transition-all hover:opacity-90 active:scale-95"
          style={{ background: p.color }}
        >
          <Download className="w-5 h-5" />
          Download {provider === 'aws' ? 'CloudFormation Template' : 'Setup Script'}
        </button>

        <div className="flex items-center gap-2 justify-center text-xs text-gray-400">
          <Lock className="w-3.5 h-3.5" />
          Read-only access · No write permissions · Revocable anytime
        </div>
      </div>
    );
  }

  if (step === 1) {
    // ── AWS Deploy Instructions ──────────────────────────────────────────────
    if (provider === 'aws') return (
      <div className="space-y-5">
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Deploy the CloudFormation Stack</h3>
          <p className="text-sm text-gray-500">Follow these steps in your AWS Console. Takes about 1 minute.</p>
        </div>

        {/* Step 1 — Navigate to CloudFormation */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#FF9900' }}>1</div>
            <p className="text-sm font-semibold text-gray-800">Go to AWS CloudFormation</p>
          </div>
          {/* AWS Console mock-up */}
          <div className="p-3">
            <svg viewBox="0 0 480 120" className="w-full rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
              {/* Top nav bar */}
              <rect width="480" height="32" fill="#232f3e"/>
              <rect x="8" y="8" width="60" height="16" rx="2" fill="#FF9900"/>
              <text x="38" y="20" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">aws</text>
              {/* Search bar */}
              <rect x="80" y="7" width="200" height="18" rx="9" fill="#3a4a5a"/>
              <text x="180" y="19" fill="#8a9ab0" fontSize="8" textAnchor="middle">Search for services, features...</text>
              {/* Services menu */}
              <rect x="0" y="32" width="480" height="28" fill="#1a2535"/>
              <text x="10" y="50" fill="#e0e0e0" fontSize="8">Services ▾</text>
              <text x="55" y="50" fill="#e0e0e0" fontSize="8">Recently visited ▾</text>
              {/* Sidebar */}
              <rect x="0" y="60" width="140" height="60" fill="#f8f9fa"/>
              <rect x="8" y="68" width="124" height="20" rx="4" fill="#FF9900" opacity="0.15"/>
              <text x="16" y="81" fill="#FF9900" fontSize="8" fontWeight="bold">◼ CloudFormation</text>
              <text x="16" y="96" fill="#6b7280" fontSize="7">Stacks</text>
              <text x="16" y="107" fill="#6b7280" fontSize="7">StackSets</text>
              {/* Main area */}
              <rect x="140" y="60" width="340" height="60" fill="white"/>
              <text x="155" y="78" fill="#111827" fontSize="9" fontWeight="bold">CloudFormation</text>
              <rect x="155" y="85" width="80" height="20" rx="4" fill="#FF9900"/>
              <text x="195" y="98" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">Create stack</text>
              {/* Arrow annotation */}
              <path d="M240 98 L250 98" stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arr)"/>
              <circle cx="232" cy="98" r="8" fill="none" stroke="#ef4444" strokeWidth="2"/>
            </svg>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">→</span>
              In the AWS Console top search bar, type <strong className="text-gray-700 mx-1">CloudFormation</strong> and click it. Then click <strong className="text-gray-700 mx-1">Create stack</strong>.
            </p>
          </div>
        </div>

        {/* Step 2 — Upload template */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#FF9900' }}>2</div>
            <p className="text-sm font-semibold text-gray-800">Upload the template file</p>
          </div>
          <div className="p-3">
            <svg viewBox="0 0 480 130" className="w-full rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
              <rect width="480" height="130" fill="white"/>
              <rect width="480" height="24" fill="#232f3e"/>
              <text x="10" y="16" fill="#e0e0e0" fontSize="8">Create stack &gt; Step 1: Specify template</text>
              {/* Form area */}
              <text x="16" y="45" fill="#111827" fontSize="9" fontWeight="bold">Prerequisite - Prepare template</text>
              {/* Radio options */}
              <circle cx="24" cy="62" r="5" fill="none" stroke="#6b7280" strokeWidth="1"/>
              <text x="33" y="66" fill="#374151" fontSize="8">Use a sample template</text>
              <circle cx="24" cy="78" r="5" fill="#FF9900" stroke="#FF9900" strokeWidth="1"/>
              <circle cx="24" cy="78" r="2.5" fill="white"/>
              <text x="33" y="82" fill="#111827" fontSize="8" fontWeight="bold">Upload a template file</text>
              <circle cx="24" cy="94" r="5" fill="none" stroke="#6b7280" strokeWidth="1"/>
              <text x="33" y="98" fill="#374151" fontSize="8">Amazon S3 URL</text>
              {/* Upload box */}
              <rect x="16" y="105" width="340" height="20" rx="3" fill="#f9fafb" stroke="#d1d5db" strokeWidth="1" strokeDasharray="4,2"/>
              <text x="100" y="118" fill="#6b7280" fontSize="8">cloudguard-pro-aws.yaml</text>
              <rect x="360" y="105" width="90" height="20" rx="3" fill="#f3f4f6" stroke="#d1d5db"/>
              <text x="405" y="118" fill="#374151" fontSize="8" textAnchor="middle">Choose file</text>
              {/* Red circle highlight */}
              <rect x="354" y="102" width="102" height="26" rx="4" fill="none" stroke="#ef4444" strokeWidth="2"/>
            </svg>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">→</span>
              Select <strong className="text-gray-700 mx-1">Upload a template file</strong>, click <strong className="text-gray-700 mx-1">Choose file</strong>, and select <code className="bg-gray-100 px-1 rounded text-xs">cloudguard-pro-aws.yaml</code>.
            </p>
          </div>
        </div>

        {/* Step 3 — IAM acknowledge */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#FF9900' }}>3</div>
            <p className="text-sm font-semibold text-gray-800">Acknowledge IAM and create stack</p>
          </div>
          <div className="p-3">
            <svg viewBox="0 0 480 110" className="w-full rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
              <rect width="480" height="110" fill="white"/>
              <rect width="480" height="24" fill="#232f3e"/>
              <text x="10" y="16" fill="#e0e0e0" fontSize="8">Create stack &gt; Step 4: Review</text>
              <text x="16" y="42" fill="#111827" fontSize="9" fontWeight="bold">Capabilities</text>
              <rect x="16" y="50" width="440" height="32" rx="4" fill="#fff8e1" stroke="#fbbf24" strokeWidth="1"/>
              <text x="26" y="62" fill="#92400e" fontSize="7.5">⚠ This template may create IAM resources. Acknowledge this to proceed.</text>
              {/* Checkbox */}
              <rect x="22" y="69" width="10" height="10" rx="2" fill="#FF9900" stroke="#FF9900"/>
              <text x="27" y="77" fill="white" fontSize="8" textAnchor="middle">✓</text>
              <text x="36" y="77" fill="#374151" fontSize="7.5">I acknowledge that AWS CloudFormation might create IAM resources</text>
              {/* Submit button */}
              <rect x="346" y="88" width="120" height="18" rx="4" fill="#FF9900"/>
              <text x="406" y="100" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">Create stack</text>
              <rect x="340" y="85" width="132" height="24" rx="5" fill="none" stroke="#ef4444" strokeWidth="2"/>
            </svg>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">→</span>
              Click <strong className="text-gray-700 mx-1">Next</strong> through Steps 2 & 3. On the Review page, check the IAM acknowledgement box, then click <strong className="text-gray-700 mx-1">Create stack</strong>.
            </p>
          </div>
        </div>

        {/* Step 4 — Get Role ARN from Outputs */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#FF9900' }}>4</div>
            <p className="text-sm font-semibold text-gray-800">Copy the Role ARN from Outputs</p>
          </div>
          <div className="p-3">
            <svg viewBox="0 0 480 120" className="w-full rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
              <rect width="480" height="120" fill="white"/>
              <rect width="480" height="24" fill="#232f3e"/>
              <text x="10" y="16" fill="#e0e0e0" fontSize="8">CloudFormation &gt; Stacks &gt; cloudguard-pro-aws</text>
              {/* Status bar */}
              <rect x="0" y="24" width="480" height="26" fill="#f0fdf4"/>
              <circle cx="16" cy="37" r="6" fill="#22c55e"/>
              <text x="26" y="40" fill="#15803d" fontSize="9" fontWeight="bold">● CREATE_COMPLETE</text>
              {/* Tabs */}
              <rect x="0" y="50" width="480" height="20" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="0.5"/>
              <text x="12" y="63" fill="#6b7280" fontSize="8">Overview</text>
              <text x="65" y="63" fill="#6b7280" fontSize="8">Parameters</text>
              <text x="125" y="63" fill="#6b7280" fontSize="8">Events</text>
              <text x="165" y="63" fill="#6b7280" fontSize="8">Resources</text>
              <rect x="204" y="50" width="52" height="20" fill="white" stroke="#FF9900" strokeWidth="1.5"/>
              <text x="230" y="63" fill="#FF9900" fontSize="8" fontWeight="bold" textAnchor="middle">Outputs</text>
              {/* Table */}
              <rect x="0" y="70" width="480" height="16" fill="#f3f4f6"/>
              <text x="12" y="81" fill="#374151" fontSize="7.5" fontWeight="bold">Key</text>
              <text x="120" y="81" fill="#374151" fontSize="7.5" fontWeight="bold">Value</text>
              <rect x="0" y="86" width="480" height="18" fill="white" stroke="#f3f4f6" strokeWidth="0.5"/>
              <text x="12" y="98" fill="#374151" fontSize="7.5">RoleArn</text>
              <text x="120" y="98" fill="#2563eb" fontSize="7">arn:aws:iam::123456789012:role/CloudGuardProReadOnly</text>
              <text x="430" y="98" fill="#6b7280" fontSize="7">📋 Copy</text>
              {/* Highlight box */}
              <rect x="115" y="84" width="370" height="22" rx="3" fill="none" stroke="#ef4444" strokeWidth="2"/>
            </svg>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">→</span>
              Wait for <strong className="text-gray-700 mx-1">CREATE_COMPLETE</strong> status (~1 min). Click the <strong className="text-gray-700 mx-1">Outputs</strong> tab and copy the <strong className="text-gray-700 mx-1">RoleArn</strong> value. Paste it in the next step.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2 text-sm text-blue-700">
          <Zap className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
          Takes about 1 minute. Click "I've done this" when you have the Role ARN copied.
        </div>
      </div>
    );

    // ── Azure Deploy Instructions ────────────────────────────────────────────
    if (provider === 'azure') return (
      <div className="space-y-5">
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Run the Setup Script in Azure Cloud Shell</h3>
          <p className="text-sm text-gray-500">No local tools needed — runs entirely in your browser.</p>
        </div>

        {/* Step 1 — Open Cloud Shell */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#0078D4' }}>1</div>
            <p className="text-sm font-semibold text-gray-800">Open Azure Portal and launch Cloud Shell</p>
          </div>
          <div className="p-3">
            <svg viewBox="0 0 480 90" className="w-full rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
              <rect width="480" height="90" fill="#f3f2f1"/>
              {/* Azure top nav */}
              <rect width="480" height="40" fill="#0078D4"/>
              <rect x="8" y="10" width="60" height="20" rx="2" fill="white" opacity="0.15"/>
              <text x="38" y="24" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">Microsoft Azure</text>
              {/* Search */}
              <rect x="80" y="10" width="200" height="20" rx="10" fill="white" opacity="0.2"/>
              <text x="180" y="23" fill="white" fontSize="7.5" opacity="0.8" textAnchor="middle">🔍 Search resources, services...</text>
              {/* Icons on right */}
              <text x="300" y="25" fill="white" fontSize="11">🔔</text>
              <text x="325" y="25" fill="white" fontSize="11">⚙</text>
              {/* Cloud Shell icon highlighted */}
              <rect x="348" y="8" width="28" height="24" rx="4" fill="white" opacity="0.25"/>
              <text x="362" y="24" fill="white" fontSize="13" textAnchor="middle">&gt;_</text>
              <rect x="346" y="6" width="32" height="28" rx="5" fill="none" stroke="#ef4444" strokeWidth="2"/>
              <text x="395" y="25" fill="white" fontSize="11">👤</text>
              {/* Arrow label */}
              <line x1="362" y1="38" x2="362" y2="52" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,2"/>
              <text x="375" y="60" fill="#ef4444" fontSize="8" fontWeight="bold">Click here</text>
              {/* Shell panel preview */}
              <rect x="0" y="55" width="480" height="35" fill="#1e1e1e"/>
              <text x="12" y="70" fill="#4ade80" fontSize="8" fontFamily="monospace">Azure Cloud Shell - Bash</text>
              <text x="12" y="82" fill="#4ade80" fontSize="8" fontFamily="monospace">Requesting a Cloud Shell...</text>
            </svg>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">→</span>
              Go to <strong className="text-gray-700 mx-1">portal.azure.com</strong>. Click the <strong className="text-gray-700 mx-1">&gt;_</strong> Cloud Shell icon in the top navigation bar. Select <strong className="text-gray-700 mx-1">Bash</strong> if prompted.
            </p>
          </div>
        </div>

        {/* Step 2 — Upload the script */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#0078D4' }}>2</div>
            <p className="text-sm font-semibold text-gray-800">Upload the script file</p>
          </div>
          <div className="p-3">
            <svg viewBox="0 0 480 100" className="w-full rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
              <rect width="480" height="100" fill="#1e1e1e"/>
              {/* Shell toolbar */}
              <rect width="480" height="28" fill="#252526"/>
              <text x="12" y="18" fill="#cccccc" fontSize="8">Bash ▾</text>
              <text x="60" y="18" fill="#cccccc" fontSize="8">|</text>
              {/* Upload button highlighted */}
              <rect x="68" y="6" width="55" height="16" rx="3" fill="#3c3c3c"/>
              <text x="95" y="17" fill="#cccccc" fontSize="7.5" textAnchor="middle">⬆ Upload</text>
              <rect x="65" y="4" width="61" height="20" rx="4" fill="none" stroke="#ef4444" strokeWidth="1.5"/>
              <text x="135" y="18" fill="#cccccc" fontSize="8">|</text>
              <text x="145" y="18" fill="#cccccc" fontSize="8">🔲 Maximize</text>
              {/* Terminal content */}
              <text x="12" y="48" fill="#4ade80" fontSize="8" fontFamily="monospace">naveenkumar@Azure:~$</text>
              <text x="12" y="62" fill="#cccccc" fontSize="8" fontFamily="monospace">ls</text>
              <text x="12" y="76" fill="#9cdcfe" fontSize="8" fontFamily="monospace">cloudguard-pro-azure.sh</text>
              <text x="12" y="90" fill="#4ade80" fontSize="8" fontFamily="monospace">naveenkumar@Azure:~$ <text fill="#f8f8f2">_</text></text>
            </svg>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">→</span>
              In the Cloud Shell toolbar, click <strong className="text-gray-700 mx-1">⬆ Upload</strong> and select <code className="bg-gray-100 px-1 rounded text-xs">cloudguard-pro-azure.sh</code> from your Downloads folder.
            </p>
          </div>
        </div>

        {/* Step 3 — Run the script */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#0078D4' }}>3</div>
            <p className="text-sm font-semibold text-gray-800">Run the script and copy the output</p>
          </div>
          <div className="p-3">
            <div className="bg-gray-900 rounded-xl p-3 font-mono text-xs text-green-400 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500"># Paste these two commands:</span>
                <button onClick={() => copyCmd('chmod +x cloudguard-pro-azure.sh && ./cloudguard-pro-azure.sh')} className="text-gray-500 hover:text-white transition-colors">
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="text-yellow-300">chmod +x cloudguard-pro-azure.sh</div>
              <div className="text-yellow-300">./cloudguard-pro-azure.sh</div>
            </div>
            <svg viewBox="0 0 480 95" className="w-full rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
              <rect width="480" height="95" fill="#1e1e1e"/>
              <text x="12" y="18" fill="#4ade80" fontSize="8" fontFamily="monospace">✅ Setup complete! Copy these values into CloudGuard Pro:</text>
              <rect x="8" y="24" width="464" height="62" rx="4" fill="#252526"/>
              <text x="16" y="38" fill="#cccccc" fontSize="7.5" fontFamily="monospace">========================================</text>
              <text x="16" y="50" fill="#9cdcfe" fontSize="7.5" fontFamily="monospace">Tenant ID:       <text fill="#ce9178">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</text></text>
              <text x="16" y="62" fill="#9cdcfe" fontSize="7.5" fontFamily="monospace">Subscription ID: <text fill="#ce9178">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</text></text>
              <text x="16" y="74" fill="#9cdcfe" fontSize="7.5" fontFamily="monospace">Client ID:       <text fill="#ce9178">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</text></text>
              <text x="16" y="86" fill="#9cdcfe" fontSize="7.5" fontFamily="monospace">Client Secret:   <text fill="#ce9178">your-client-secret-value</text></text>
              {/* Highlight box */}
              <rect x="6" y="22" width="468" height="66" rx="5" fill="none" stroke="#ef4444" strokeWidth="1.5"/>
            </svg>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">→</span>
              The script prints all 4 values. <strong className="text-red-600 mx-1">⚠ Copy the Client Secret now</strong> — it won't be shown again!
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2 text-sm text-blue-700">
          <Zap className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
          Once you have all 4 values copied, click "I've done this" to proceed.
        </div>
      </div>
    );

    // ── GCP Deploy Instructions ──────────────────────────────────────────────
    return (
      <div className="space-y-5">
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Run the Setup Script in Google Cloud Shell</h3>
          <p className="text-sm text-gray-500">No local tools needed — runs entirely in your browser.</p>
        </div>

        {/* Step 1 — Open Cloud Shell */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#34A853' }}>1</div>
            <p className="text-sm font-semibold text-gray-800">Open Google Cloud Console and launch Cloud Shell</p>
          </div>
          <div className="p-3">
            <svg viewBox="0 0 480 90" className="w-full rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
              <rect width="480" height="90" fill="#f8f9fa"/>
              {/* GCP top nav */}
              <rect width="480" height="48" fill="white" stroke="#e0e0e0" strokeWidth="0.5"/>
              {/* Google logo colors */}
              <text x="12" y="30" fill="#4285F4" fontSize="12" fontWeight="bold">G</text>
              <text x="22" y="30" fill="#EA4335" fontSize="12" fontWeight="bold">o</text>
              <text x="31" y="30" fill="#FBBC04" fontSize="12" fontWeight="bold">o</text>
              <text x="40" y="30" fill="#4285F4" fontSize="12" fontWeight="bold">g</text>
              <text x="49" y="30" fill="#34A853" fontSize="12" fontWeight="bold">l</text>
              <text x="55" y="30" fill="#EA4335" fontSize="12" fontWeight="bold">e</text>
              <text x="66" y="30" fill="#5f6368" fontSize="9">Cloud</text>
              {/* Project selector */}
              <rect x="100" y="14" width="120" height="20" rx="4" fill="#f1f3f4"/>
              <text x="115" y="27" fill="#3c4043" fontSize="7.5">My Project ▾</text>
              {/* Search */}
              <rect x="230" y="14" width="140" height="20" rx="10" fill="#f1f3f4"/>
              <text x="300" y="27" fill="#9aa0a6" fontSize="7.5" textAnchor="middle">🔍  Search</text>
              {/* Cloud Shell button */}
              <rect x="390" y="12" width="26" height="24" rx="4" fill="#f1f3f4"/>
              <text x="403" y="28" fill="#5f6368" fontSize="11" textAnchor="middle">&gt;_</text>
              <rect x="387" y="10" width="32" height="28" rx="5" fill="none" stroke="#ef4444" strokeWidth="2"/>
              {/* Arrow */}
              <line x1="403" y1="40" x2="403" y2="55" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,2"/>
              <text x="415" y="60" fill="#ef4444" fontSize="8" fontWeight="bold">Click here</text>
              {/* Shell preview */}
              <rect x="0" y="55" width="480" height="35" fill="#202124"/>
              <text x="12" y="70" fill="#34A853" fontSize="8" fontFamily="monospace">Welcome to Cloud Shell! Type "help" to get started.</text>
              <text x="12" y="83" fill="#34A853" fontSize="8" fontFamily="monospace">yourname@cloudshell:~ (your-project)$</text>
            </svg>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold shrink-0">→</span>
              Go to <strong className="text-gray-700 mx-1">console.cloud.google.com</strong>. Click the <strong className="text-gray-700 mx-1">&gt;_</strong> Cloud Shell icon in the top right corner of the navigation bar.
            </p>
          </div>
        </div>

        {/* Step 2 — Upload and run */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#34A853' }}>2</div>
            <p className="text-sm font-semibold text-gray-800">Upload the script and run it</p>
          </div>
          <div className="p-3">
            <svg viewBox="0 0 480 80" className="w-full rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
              <rect width="480" height="80" fill="#202124"/>
              {/* Cloud Shell toolbar */}
              <rect width="480" height="24" fill="#292b2f"/>
              <text x="12" y="16" fill="#9aa0a6" fontSize="7.5">Cloud Shell ×</text>
              {/* Upload button */}
              <rect x="220" y="4" width="55" height="16" rx="3" fill="#3c4043"/>
              <text x="247" y="15" fill="#e8eaed" fontSize="7" textAnchor="middle">⬆ Upload file</text>
              <rect x="217" y="2" width="61" height="20" rx="4" fill="none" stroke="#ef4444" strokeWidth="1.5"/>
              {/* Terminal */}
              <text x="12" y="42" fill="#34A853" fontSize="8" fontFamily="monospace">yourname@cloudshell:~$  <text fill="#8ab4f8">ls</text></text>
              <text x="12" y="54" fill="#e8eaed" fontSize="8" fontFamily="monospace">cloudguard-pro-gcp.sh</text>
              <text x="12" y="68" fill="#34A853" fontSize="8" fontFamily="monospace">yourname@cloudshell:~$  <text fill="#8ab4f8">chmod +x cloudguard-pro-gcp.sh && ./cloudguard-pro-gcp.sh</text></text>
            </svg>
            <div className="bg-gray-900 rounded-xl p-3 font-mono text-xs text-green-400 mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500"># Upload then run these commands:</span>
                <button onClick={() => copyCmd('chmod +x cloudguard-pro-gcp.sh && ./cloudguard-pro-gcp.sh')} className="text-gray-500 hover:text-white transition-colors">
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="text-yellow-300">chmod +x cloudguard-pro-gcp.sh</div>
              <div className="text-yellow-300">./cloudguard-pro-gcp.sh</div>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold shrink-0">→</span>
              Click the 3-dot menu or <strong className="text-gray-700 mx-1">⬆ Upload file</strong> in the Cloud Shell toolbar. Select <code className="bg-gray-100 px-1 rounded text-xs">cloudguard-pro-gcp.sh</code>, then run the commands above.
            </p>
          </div>
        </div>

        {/* Step 3 — Download the key */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: '#34A853' }}>3</div>
            <p className="text-sm font-semibold text-gray-800">Download the generated key file</p>
          </div>
          <div className="p-3">
            <svg viewBox="0 0 480 95" className="w-full rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
              <rect width="480" height="95" fill="#202124"/>
              <text x="12" y="18" fill="#34A853" fontSize="8" fontFamily="monospace">✅ Setup complete!</text>
              <text x="12" y="30" fill="#e8eaed" fontSize="7.5" fontFamily="monospace">Project ID:      my-project-123</text>
              <text x="12" y="42" fill="#e8eaed" fontSize="7.5" fontFamily="monospace">Service Account: cloudguard-pro-readonly@my-project-123.iam.gserviceaccount.com</text>
              <text x="12" y="54" fill="#ffd700" fontSize="7.5" fontFamily="monospace">Key File:        cloudguard-pro-my-project-123-key.json ← Download this!</text>
              <text x="12" y="70" fill="#34A853" fontSize="8" fontFamily="monospace">yourname@cloudshell:~$  <text fill="#8ab4f8">cloudshell download cloudguard-pro-my-project-123-key.json</text></text>
              <text x="12" y="84" fill="#e8eaed" fontSize="7.5" fontFamily="monospace">Preparing download...</text>
              <rect x="6" y="48" width="468" height="12" rx="2" fill="none" stroke="#ffd700" strokeWidth="1.5"/>
            </svg>
            <div className="bg-gray-900 rounded-xl p-3 font-mono text-xs text-green-400 mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500"># Download the key file to your computer:</span>
                <button onClick={() => copyCmd('cloudshell download cloudguard-pro-*.json')} className="text-gray-500 hover:text-white transition-colors">
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="text-yellow-300">cloudshell download cloudguard-pro-*.json</div>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold shrink-0">→</span>
              Run the download command above. The <code className="bg-gray-100 px-1 rounded text-xs">.json</code> key file will download to your computer. You'll upload it in the next step.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2 text-sm text-blue-700">
          <Zap className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
          Once the .json key file is downloaded, click "I've done this" to proceed.
        </div>
      </div>
    );
  }

  // Step 3: Verify
  if (provider === 'aws') return <AWSVerifyStep onSuccess={onSuccess} />;
  if (provider === 'azure') return <AzureVerifyStep onSuccess={onSuccess} />;
  return <GCPVerifyStep onSuccess={onSuccess} />;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CloudOnboarding() {
  const navigate = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [connectedAccount, setConnectedAccount] = useState<any>(null);

  const provider = selectedProvider ? PROVIDERS[selectedProvider] : null;
  const totalSteps = provider ? provider.steps.length : 0;

  // Detect if this is first-time onboarding (user.onboardingComplete is false/missing)
  const isFirstTime = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return !user.onboardingComplete;
    } catch { return false; }
  })();

  const markOnboardingComplete = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const updated = { ...user, onboardingComplete: true };
      localStorage.setItem('user', JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const handleSuccess = useCallback((account: any) => {
    setConnectedAccount(account);
    // If first-time onboarding, mark complete immediately so guard doesn't redirect back
    if (isFirstTime) markOnboardingComplete();
  }, [isFirstTime]);

  // Success screen
  if (connectedAccount) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isFirstTime ? 'You\'re all set! 🎉' : 'Account Connected!'}
          </h2>
          <p className="text-gray-500 mb-6">
            <strong>{connectedAccount.accountName}</strong> is now connected to CloudGuard Pro.
            Data sync will begin shortly.
          </p>
          <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Provider</span>
              <span className="font-semibold">{connectedAccount.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Account ID</span>
              <span className="font-mono text-xs">{connectedAccount.accountId || connectedAccount.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Access Type</span>
              <span className="font-semibold text-green-600">Read-Only ✓</span>
            </div>
          </div>
          <div className="flex gap-3">
            {/* First-time: only show Go to Dashboard. Add-account: show both buttons */}
            {!isFirstTime && (
              <button
                onClick={() => { setConnectedAccount(null); setSelectedProvider(null); setCurrentStep(0); }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Add Another
              </button>
            )}
            <button
              onClick={() => navigate(`/account/${connectedAccount.id}/overview`)}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors"
              style={{ background: '#6366f1' }}
            >
              {isFirstTime ? 'Go to Dashboard' : 'View Account'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Provider selection
  if (!selectedProvider) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-4 py-1.5 text-sm font-semibold text-indigo-700 mb-4">
              <Shield className="w-4 h-4" />
              Secure Template-Based Onboarding
            </div>
            <h1 className="text-4xl font-black text-gray-900 mb-3">Connect Your Cloud Account</h1>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">
              No access keys stored. We use read-only roles and service principals — revocable anytime from your cloud console.
            </p>
          </div>

          {/* Benefits bar */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { icon: <Lock className="w-5 h-5" />, title: 'No Secrets Stored', desc: 'Role-based access only' },
              { icon: <Eye className="w-5 h-5" />, title: 'Read-Only Access', desc: 'View costs & security' },
              { icon: <Zap className="w-5 h-5" />, title: '2-Minute Setup', desc: 'Automated templates' },
            ].map(b => (
              <div key={b.title} className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mx-auto mb-2">
                  {b.icon}
                </div>
                <p className="font-bold text-gray-900 text-sm">{b.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{b.desc}</p>
              </div>
            ))}
          </div>

          {/* Provider cards */}
          <div className="grid grid-cols-1 gap-4">
            {(Object.values(PROVIDERS) as typeof PROVIDERS[Provider][]).map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProvider(p.id as Provider)}
                className="bg-white rounded-2xl p-6 border-2 text-left flex items-center gap-5 hover:shadow-md transition-all group"
                style={{ borderColor: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = p.color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0" style={{ background: p.bg }}>
                  {p.icon}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-lg">{p.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>
                  <div className="flex gap-2 mt-2">
                    {p.steps.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: p.bg, color: p.color }}>
                        {i + 1}. {s}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-600 transition-colors shrink-0" />
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Need help? Check our{' '}
            <a href="#" className="underline text-indigo-500">setup documentation</a>
          </p>
        </div>
      </div>
    );
  }

  // Step-by-step flow
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Back button */}
        <button
          onClick={() => { setSelectedProvider(null); setCurrentStep(0); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to providers
        </button>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Provider header */}
          <div className="px-8 py-6 border-b border-gray-100" style={{ background: provider!.bg }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{provider!.icon}</span>
              <div>
                <p className="font-black text-gray-900 text-lg">{provider!.name}</p>
                <p className="text-sm text-gray-500">{provider!.description}</p>
              </div>
            </div>

            {/* Progress steps */}
            <div className="flex items-center gap-2 mt-5">
              {provider!.steps.map((stepName, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                      style={{
                        background: i < currentStep ? provider!.color : i === currentStep ? provider!.color : '#e5e7eb',
                        color: i <= currentStep ? 'white' : '#9ca3af',
                      }}
                    >
                      {i < currentStep ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className="text-xs font-semibold hidden sm:block" style={{ color: i <= currentStep ? provider!.color : '#9ca3af' }}>
                      {stepName}
                    </span>
                  </div>
                  {i < totalSteps - 1 && (
                    <div className="flex-1 h-0.5 rounded-full mx-1" style={{ background: i < currentStep ? provider!.color : '#e5e7eb' }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step content */}
          <div className="p-8">
            <StepContent
              provider={selectedProvider}
              step={currentStep}
              onSuccess={handleSuccess}
            />

            {/* Navigation */}
            {currentStep < totalSteps - 1 && (
              <div className="flex gap-3 mt-6">
                {currentStep > 0 && (
                  <button
                    onClick={() => setCurrentStep(s => s - 1)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                )}
                <button
                  onClick={() => setCurrentStep(s => s + 1)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                  style={{ background: provider!.color }}
                >
                  {currentStep === 0 ? "I've downloaded it" : "I've done this"} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
