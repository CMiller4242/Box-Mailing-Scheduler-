import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { campaignsApi } from '../api/campaigns';
import { campaignTemplatesApi, type TemplatePayload } from '../api/campaignTemplates';
import { useRole } from '../hooks/useRole';
import type { Campaign, ChecklistTemplate } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';

// ── Template form modal ───────────────────────────────────────────────────────

interface TemplateFormModalProps {
  existing?: ChecklistTemplate;
  onClose: () => void;
  onSaved: () => void;
}

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'] as const;
const ROLE_OPTIONS = ['', 'ADMIN', 'MANAGER', 'EMPLOYEE'] as const;

function TemplateFormModal({ existing, onClose, onSaved }: TemplateFormModalProps) {
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [items, setItems] = useState(
    existing?.items.map((i) => ({
      title: i.title,
      description: i.description ?? '',
      sortOrder: i.sortOrder,
      defaultRole: i.defaultRole ?? '',
      defaultDaysOffset: i.defaultDaysOffset ?? 0,
      priority: i.priority,
    })) ?? [{ title: '', description: '', sortOrder: 0, defaultRole: '', defaultDaysOffset: 0, priority: 'MEDIUM' as const }],
  );
  const [saving, setSaving] = useState(false);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { title: '', description: '', sortOrder: prev.length, defaultRole: '', defaultDaysOffset: 0, priority: 'MEDIUM' as const },
    ]);

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, sortOrder: i })));

  const updateItem = (idx: number, patch: Partial<typeof items[0]>) =>
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload: TemplatePayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        isActive,
        items: items.map((item, i) => ({
          title: item.title.trim(),
          description: item.description.trim() || undefined,
          sortOrder: i,
          defaultRole: item.defaultRole || undefined,
          defaultDaysOffset: item.defaultDaysOffset || undefined,
          priority: item.priority,
        })).filter((item) => item.title),
      };
      if (existing) {
        await campaignTemplatesApi.update(existing.id, payload);
        toast.success('Template updated');
      } else {
        await campaignTemplatesApi.create(payload);
        toast.success('Template created');
      }
      onSaved();
    } catch {
      toast.error('Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-16 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mb-8">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{existing ? 'Edit' : 'New'} Checklist Template</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Template name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            Active (available for applying to campaigns)
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Checklist items</h3>
              <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add item</button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      placeholder="Task title *"
                      value={item.title}
                      onChange={(e) => updateItem(idx, { title: e.target.value })}
                      className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button type="button" onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 px-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Days offset</label>
                      <input
                        type="number"
                        value={item.defaultDaysOffset}
                        onChange={(e) => updateItem(idx, { defaultDaysOffset: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Priority</label>
                      <select
                        value={item.priority}
                        onChange={(e) => updateItem(idx, { priority: e.target.value as typeof item.priority })}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Default role</label>
                      <select
                        value={item.defaultRole}
                        onChange={(e) => updateItem(idx, { defaultRole: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r || '—'}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : 'Save template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Apply template modal ──────────────────────────────────────────────────────

interface ApplyModalProps {
  campaigns: Campaign[];
  templates: ChecklistTemplate[];
  onClose: () => void;
}

function ApplyTemplateModal({ campaigns, templates, onClose }: ApplyModalProps) {
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? '');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [clearExisting, setClearExisting] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    if (!campaignId || !templateId) return;
    setApplying(true);
    try {
      const result = await campaignsApi.applyTemplate(campaignId, templateId, clearExisting);
      toast.success(`Applied ${result.applied} tasks to campaign`);
      onClose();
    } catch {
      toast.error('Failed to apply template.');
    } finally {
      setApplying(false);
    }
  };

  const activeTemplates = templates.filter((t) => t.isActive);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Apply Template to Campaign</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Campaign</label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {activeTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.items.length} items)</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={clearExisting} onChange={(e) => setClearExisting(e.target.checked)} className="rounded" />
            Clear existing tasks first
          </label>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button
            onClick={handleApply}
            disabled={applying || !campaignId || !templateId}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {applying ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const { canManageTemplates } = useRole();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTemplate, setEditTemplate] = useState<ChecklistTemplate | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChecklistTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showApply, setShowApply] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, c] = await Promise.all([campaignTemplatesApi.list(), campaignsApi.list()]);
      setTemplates(t);
      setCampaigns(c);
    } catch {
      toast.error('Failed to load data.');
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await campaignTemplatesApi.remove(deleteTarget.id);
      toast.success('Template deleted');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Failed to delete template.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Manage reusable checklist templates and apply them to campaigns.</p>
        </div>
        {canManageTemplates && (
          <div className="flex items-center gap-2">
            {templates.some((t) => t.isActive) && campaigns.length > 0 && (
              <button
                onClick={() => setShowApply(true)}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Apply template
              </button>
            )}
            <button
              onClick={() => setEditTemplate('new')}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New template
            </button>
          </div>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {canManageTemplates ? 'No templates yet. Create one to get started.' : 'No templates available.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{t.name}</h3>
                  {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                </div>
                <span className={`flex-shrink-0 text-xs rounded-full px-2 py-0.5 font-medium ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {t.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p className="text-xs text-gray-400 mb-3">{t.items.length} items</p>

              <div className="space-y-1 mb-4 max-h-32 overflow-y-auto">
                {t.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="text-gray-300">•</span>
                    <span className="truncate">{item.title}</span>
                    {item.defaultDaysOffset !== undefined && item.defaultDaysOffset !== null && (
                      <span className="text-gray-400 flex-shrink-0">({item.defaultDaysOffset > 0 ? '+' : ''}{item.defaultDaysOffset}d)</span>
                    )}
                  </div>
                ))}
              </div>

              {canManageTemplates && (
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setEditTemplate(t)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(t)}
                    className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editTemplate && (
        <TemplateFormModal
          existing={editTemplate === 'new' ? undefined : editTemplate}
          onClose={() => setEditTemplate(null)}
          onSaved={() => { setEditTemplate(null); load(); }}
        />
      )}

      {showApply && (
        <ApplyTemplateModal
          campaigns={campaigns}
          templates={templates}
          onClose={() => { setShowApply(false); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This template and all its items will be permanently deleted. This cannot be undone."
        confirmLabel="Delete template"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { if (!deleting) setDeleteTarget(null); }}
      />
    </div>
  );
}
