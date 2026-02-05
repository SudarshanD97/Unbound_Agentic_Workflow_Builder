import React, { useState, useEffect } from 'react';
import { Mail, Save } from 'lucide-react';
import { storage } from '../lib/storage';
import { toast } from 'react-hot-toast';

interface NotificationsViewProps {
  onClose: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    let cancelled = false;
    storage
      .getSettings()
      .then((s) => {
        if (cancelled) return;
        setEmail(s.notificationEmail || '');
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const current = await storage.getSettings();
      await storage.saveSettings({
        ...current,
        notificationEmail: email.trim(),
      });
      toast.success('Notification email saved');
      onClose();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div className="bg-white rounded-xl shadow-2xl p-8">Loading…</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Notifications
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
          >
            ×
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Enter your email to receive a notification when a workflow completes or fails.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="you@example.com"
            />
            <p className="text-xs text-slate-500 mt-1">
              Server must have SMTP configured (SMTP_HOST, SMTP_USER, SMTP_PASS, FROM_EMAIL).
            </p>
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
