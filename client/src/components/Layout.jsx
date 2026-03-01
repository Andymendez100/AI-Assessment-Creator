import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import useUIStore from '../stores/useUIStore';
import { Toast, ApiKeyModal, getStoredApiKey } from './common';

export default function Layout() {
  const { toasts, removeToast } = useUIStore();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const hasApiKey = !!getStoredApiKey();

  return (
    <div className='min-h-screen bg-background'>
      {/* Header */}
      <header className='sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='container mx-auto flex h-14 items-center justify-between px-4'>
          <Link to='/' className='flex items-center space-x-2'>
            <svg className='h-6 w-6 text-primary' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
              />
            </svg>
            <span className='font-semibold text-foreground'>Assessment Builder</span>
          </Link>

          {/* Settings Button */}
          <button
            onClick={() => setShowApiKeyModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              hasApiKey ? 'text-muted-foreground hover:text-foreground hover:bg-muted' : 'text-destructive bg-destructive/10 hover:bg-destructive/20'
            }`}
          >
            <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
              />
            </svg>
            {hasApiKey ? 'API Key' : 'Add API Key'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className='container mx-auto px-4 py-8'>
        <Outlet />
      </main>

      {/* Toast Container */}
      <div className='fixed bottom-4 right-4 z-50 flex flex-col gap-2'>
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>

      {/* API Key Modal */}
      <ApiKeyModal isOpen={showApiKeyModal} onClose={() => setShowApiKeyModal(false)} />
    </div>
  );
}
