import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Cloud } from 'lucide-react';

interface CloudProviderSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const CloudProviderSelector: React.FC<CloudProviderSelectorProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const providers = [
    {
      id: 'aws',
      name: 'Amazon Web Services',
      logo: '☁️',
      color: 'from-orange-500 to-yellow-500',
      description: 'Connect your AWS account via IAM Role',
      path: '/connect-aws',
    },
    {
      id: 'azure',
      name: 'Microsoft Azure',
      logo: '🔷',
      color: 'from-blue-500 to-cyan-500',
      description: 'Connect your Azure subscription',
      path: '/connect-azure',
    },
    {
      id: 'gcp',
      name: 'Google Cloud Platform',
      logo: '🌐',
      color: 'from-red-500 to-yellow-500',
      description: 'Connect your GCP project',
      path: '/connect-gcp',
      disabled: true,
    },
  ];

  const handleSelect = (path: string, disabled?: boolean) => {
    if (disabled) {
      alert('GCP integration coming soon!');
      return;
    }
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
            <Cloud className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Connect Cloud Account</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Choose your cloud provider to start monitoring costs
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleSelect(provider.path, provider.disabled)}
              disabled={provider.disabled}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                provider.disabled
                  ? 'border-gray-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                  : 'border-gray-200 dark:border-slate-700 hover:border-blue-500 hover:shadow-lg'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 bg-gradient-to-br ${provider.color} rounded-xl flex items-center justify-center text-3xl`}>
                  {provider.logo}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {provider.name}
                    {provider.disabled && (
                      <span className="ml-2 text-xs font-normal text-gray-500">Coming Soon</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{provider.description}</p>
                </div>
                <div className="text-blue-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CloudProviderSelector;
