import { useState, useEffect } from 'react';
import Button from './Button';
import Input from './Input';

const API_KEY_STORAGE_KEY = 'openai-api-key';

export const getStoredApiKey = () => {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
};

export const setStoredApiKey = (key) => {
  if (key) {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  } else {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  }
};

export default function ApiKeyModal({ isOpen, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey());
    }
  }, [isOpen]);

  const handleSave = () => {
    setStoredApiKey(apiKey.trim());
    onClose();
  };

  const handleClear = () => {
    setApiKey('');
    setStoredApiKey('');
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* Backdrop */}
      <div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={onClose} />

      {/* Modal */}
      <div className='relative bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4 p-6'>
        <h2 className='text-lg font-semibold text-foreground mb-4'>OpenAI API Key</h2>

        <p className='text-sm text-muted-foreground mb-4'>
          Your API key is stored locally in your browser and sent directly to OpenAI. It is never stored on our servers.
        </p>

        <div className='space-y-4'>
          <div className='relative'>
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder='sk-...'
              className='pr-20'
            />
            <button
              type='button'
              onClick={() => setShowKey(!showKey)}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground'
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>

          <p className='text-xs text-muted-foreground'>
            Get your API key from{' '}
            <a href='https://platform.openai.com/api-keys' target='_blank' rel='noopener noreferrer' className='text-primary hover:underline'>
              platform.openai.com/api-keys
            </a>
          </p>
        </div>

        <div className='flex justify-between mt-6'>
          <Button variant='ghost' onClick={handleClear}>
            Clear
          </Button>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
