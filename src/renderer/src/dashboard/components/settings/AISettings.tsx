import React, { useState } from 'react';
import { AIProviderStatus } from '@shared/types/ai';
import { SectionLabel } from '../ui/SectionLabel';
import { Divider } from '../ui/Divider';
import { Toggle } from '../ui/Toggle';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StatusPip } from '../ui/StatusPip';
import { SettingsRow } from './SettingsRow';
import { Eye, EyeOff } from 'lucide-react';

export interface AISettingsProps {
  isElectron: boolean;
  aiProvider: 'disabled' | 'gemini';
  aiMaskedKey: string;
  aiCredentialStatus: 'not_configured' | 'verified' | 'invalid';
  aiServiceStatus: 'available' | 'temporarily_unavailable' | 'rate_limited' | 'daily_quota_exceeded' | 'offline' | 'unknown';
  aiTesting: boolean;
  aiFeedback: string | null;
  onToggleAiProvider: () => void;
  onTestConnection: (testKey?: string) => void;
  onSaveCredential: (key: string) => void;
  onRemoveCredential: () => void;
}

export const AISettings: React.FC<AISettingsProps> = ({
  isElectron,
  aiProvider,
  aiMaskedKey,
  aiCredentialStatus,
  aiServiceStatus,
  aiTesting,
  aiFeedback,
  onToggleAiProvider,
  onTestConnection,
  onSaveCredential,
  onRemoveCredential,
}) => {
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    if (inputKey.trim()) {
      onSaveCredential(inputKey);
      setInputKey('');
      setIsEditingKey(false);
      setShowKey(false);
    }
  };

  const handleTest = () => {
    onTestConnection(inputKey || undefined);
  };

  const handleCancel = () => {
    setIsEditingKey(false);
    setInputKey('');
    setShowKey(false);
  };

  const getCredentialStatusColor = (): 'sage' | 'gray' | 'red' => {
    if (aiCredentialStatus === 'verified') return 'sage';
    if (aiCredentialStatus === 'invalid') return 'red';
    return 'gray';
  };

  const getServiceStatusColor = (): 'sage' | 'clay' | 'gray' | 'red' => {
    if (aiServiceStatus === 'available') return 'sage';
    if (aiServiceStatus === 'temporarily_unavailable' || aiServiceStatus === 'rate_limited' || aiServiceStatus === 'daily_quota_exceeded') return 'clay';
    if (aiServiceStatus === 'offline') return 'gray';
    return 'gray';
  };

  const getServiceStatusLabel = (): string => {
    switch (aiServiceStatus) {
      case 'available': return 'Available';
      case 'temporarily_unavailable': return 'Temporarily Unavailable';
      case 'daily_quota_exceeded': return 'Daily Limit Reached';
      case 'rate_limited': return 'Rate Limited';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <SectionLabel>AI ASSISTANT</SectionLabel>

      {/* AI Enable/Disable */}
      <div>
        <SettingsRow
          label="AI assistant"
          description="Powered by Gemini with your API key"
        >
          <Toggle
            checked={aiProvider === 'gemini'}
            onChange={onToggleAiProvider}
            disabled={!isElectron}
          />
        </SettingsRow>
      </div>

      <Divider />

      {/* API Key Configuration */}
      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium text-roa-text-primary mb-1">
            API key
          </div>
          <div className="text-xs text-roa-text-muted">
            {aiMaskedKey
              ? 'Your key is stored securely on this device'
              : 'Get your free API key from Google AI Studio'}
          </div>
        </div>

        {aiMaskedKey && !isEditingKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 text-xs font-mono bg-roa-raised border border-roa-border rounded-roa text-roa-text-muted">
                {aiMaskedKey}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingKey(true)}
              >
                Change
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onRemoveCredential}
                className="text-roa-text-muted hover:text-roa-clay"
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                disabled={!isElectron}
                className="w-full px-3 py-2 pr-10 text-sm font-mono bg-roa-raised border border-roa-border rounded-roa text-roa-text-primary placeholder:text-roa-text-muted focus:outline-none focus:border-roa-sage focus:ring-1 focus:ring-roa-sage disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-roa-text-muted hover:text-roa-text-secondary"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTest}
                disabled={aiTesting || !isElectron}
              >
                {aiTesting ? 'Testing...' : 'Test Connection'}
              </Button>
              {inputKey.trim() && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={aiTesting || !isElectron}
                >
                  Save Key
                </Button>
              )}
              {isEditingKey && (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={handleCancel}
                  className="text-roa-text-muted"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {aiFeedback && (
          <div
            className={`text-xs p-3 rounded-roa border ${
              aiFeedback.includes('successfully') || aiFeedback.includes('verified') || aiFeedback.includes('saved')
                ? 'bg-roa-raised border-roa-sage text-roa-sage'
                : aiFeedback.includes('limit') || aiFeedback.includes('unavailable') || aiFeedback.includes('rate')
                ? 'bg-roa-raised border-roa-clay text-roa-clay'
                : 'bg-roa-raised border-roa-border text-roa-text-secondary'
            }`}
          >
            {aiFeedback}
          </div>
        )}
      </div>

      <Divider />

      {/* Connection Status */}
      <div className="space-y-4">
        <div className="text-sm font-medium text-roa-text-primary">
          Connection status
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-roa-text-secondary">API key</span>
            <StatusPip
              color={getCredentialStatusColor()}
              label={
                aiCredentialStatus === 'verified'
                  ? 'Verified'
                  : aiCredentialStatus === 'invalid'
                  ? 'Invalid'
                  : 'Not Configured'
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-roa-text-secondary">Service</span>
            <StatusPip
              color={getServiceStatusColor()}
              label={getServiceStatusLabel()}
            />
          </div>
        </div>
        
        {aiMaskedKey && !isEditingKey && (
          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onTestConnection()}
              disabled={aiTesting || !isElectron}
            >
              {aiTesting ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
