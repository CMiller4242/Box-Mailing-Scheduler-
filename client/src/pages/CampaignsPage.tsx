import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { campaignsApi } from '../api/campaigns';
import { campaignTemplatesApi, type TemplatePayload } from '../api/campaignTemplates';
import { tasksApi } from '../api/tasks';
import { useRole } from '../hooks/useRole';
import type { Campaign, CampaignStatus, ChecklistTemplate } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'] as const;
type Priority = typeof PRIORITY_OPTIONS[number];

const STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: 'DRAFT',     label: 'Draft'     },
  { value: 'ACTIVE',    label: 'Active'    },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_BADGE: Record<CampaignStatus, string> = {
  DRAFT:     'bg-gray-100 text-gray-600',
  ACTIVE:    'bg-green-100 text-green-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

interface ChecklistItem {
  title: string;
  daysOffset: number;
  priority: Priority;
}

// ── Campaign form modal (create / edit) ────────────────────────────────────

interface CampaignFormModalProps {
  existing?: Campaign;
  templates: ChecklistTemplate[];
  onClose: () => void;
  onSaved: () => void;
}

function CampaignFormModal({ existing, templates, onClose, onSaved }: CampaignFormModalProps) {
  const isEdit = !!existing;

  const [name, setName]       = useState(existing?.name ?? '');
  const [mailDate, setMailDate] = useState(
    existing ? existing.mailDate.split('T')[0] : '',
  );
  const [status, setStatus]   = useState<CampaignStatus>(existing?.status ?? 'DRAFT');
  const [notes, setNotes]     = useState(existing?.notes ?? '');

  // Checklist (create mode only)
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [saveAsTemplate, setSaveAsTemplate]         = useState(false);
  const [templateName, setTemplateName]             = useState('');

  const [saving, setSaving] = useState(false);

  const activeTemplates = templates.filter((t) => t.isActive);

  // When a template is selected from the dropdown, pre-fill checklist items
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) return;
    setItems(
      tmpl.items.map((i) => ({
        title: i.title,
        daysOffset: i.defaultDaysOffset ?? 0,
        priority: (i.priority as Priority) ?? 'MEDIUM',
      })),
    );
  };

  const addItem = () =>
    setItems((prev) => [...prev, { title: '', daysOffset: 0, priority: 'MEDIUM' }]);

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, patch: Partial<ChecklistItem>) =>
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mailDate) return;
    setSaving(true);
    try {
      if (isEdit && existing) {
        // Edit mode: just update campaign metadata
        await campaignsApi.update(existing.id, {
          name: name.trim(),
          mailDate,
          status,
          notes: notes.trim() || undefined,
        });
        toast.success('Campaign updated');
        onSaved();
        return;
      }

      // Create mode
      const campaign = await campaignsApi.create({
        name: name.trim(),
        mailDate,
        status,
        notes: notes.trim() || undefined,
      });

      const validItems = items.filter((i) => i.title.trim());

      // Optionally save as a reusable template
      if (saveAsTemplate && templateName.trim() && validItems.length > 0) {
        const payload: TemplatePayload = {
          name: templateName.trim(),
          isActive: true,
          items: validItems.map((item, idx) => ({
            title: item.title.trim(),
            sortOrder: idx,
            defaultDaysOffset: item.daysOffset || undefined,
            priority: item.priority,
          })),
        };
        await campaignTemplatesApi.create(payload).catch(() => {
          toast.warning('Campaign created but template save failed.');
        });
      }

      // Create tasks from checklist items
      if (validItems.length > 0) {
        const base = new Date(mailDate);
        await Promise.all(
          validItems.map((item) => {
            const due = new Date(base);
            due.setDate(due.getDate() + item.daysOffset);
            return tasksApi.create({
              campaignId: campaign.id,
              title: item.title.trim(),
              dueDate: due.toISOString(),
              priority: item.priority,
            });
          }),
        );
      }

      toast.success('Campaign created');
      onSaved();
    } catch {
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} campaign.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-12 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mb-8">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Campaign' : 'Create Campaign'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Campaign details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Campaign name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Spring 2026 Promo Mailer"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mail date *</label>
              <input
                type="date"
                value={mailDate}
                onChange={(e) => setMailDate(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CampaignStatus)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes about this campaign"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Checklist section — create mode only */}
          {!isEdit && (
            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Checklist</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Tasks created relative to the mail date</p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Add item
                </button>
              </div>

              {/* Apply from template */}
              {activeTemplates.length > 0 && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start from a saved template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— No template —</option>
                    {activeTemplates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.items.length} items)</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Checklist items */}
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="text-center py-5 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
                    No checklist items yet.{' '}
                    {activeTemplates.length > 0
                      ? 'Select a template above or click "+ Add item".'
                      : 'Click "+ Add item" to add tasks.'}
                  </div>
                ) : (
                  items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <input
                        placeholder="Task title *"
                        value={item.title}
                        onChange={(e) => updateItem(idx, { title: e.target.value })}
                        className="flex-1 min-w-0 bg-transparent border-0 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
                      />
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">+</span>
                          <input
                            type="number"
                            value={item.daysOffset}
                            onChange={(e) => updateItem(idx, { daysOffset: Number(e.target.value) })}
                            title="Days before/after mail date"
                            className="w-14 border border-gray-200 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-400">d</span>
                        </div>
                        <select
                          value={item.priority}
                          onChange={(e) => updateItem(idx, { priority: e.target.value as Priority })}
                          className="border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Save as template */}
              {items.filter((i) => i.title.trim()).length > 0 && (
                <div className="mt-3 border border-dashed border-gray-200 rounded-lg px-4 py-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={saveAsTemplate}
                      onChange={(e) => setSaveAsTemplate(e.target.checked)}
                      className="rounded"
                    />
                    Save this checklist as a reusable template
                  </label>
                  {saveAsTemplate && (
                    <input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name"
                      className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !mailDate}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {saving
                ? (isEdit ? 'Saving…' : 'Creating…')
                : (isEdit ? 'Save changes' : 'Create campaign')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Template form modal (standalone edit/create) ───────────────────────────

interface TemplateFormModalProps {
  existing?: ChecklistTemplate;
  onClose: () => void;
  onSaved: () => void;
}

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
      priority: i.priority as Priority,
    })) ?? [{ title: '', description: '', sortOrder: 0, defaultRole: '', defaultDaysOffset: 0, priority: 'MEDIUM' as Priority }],
  );
  const [saving, setSaving] = useState(false);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { title: '', description: '', sortOrder: prev.length, defaultRole: '', defaultDaysOffset: 0, priority: 'MEDIUM' as Priority },
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
            Active (available when creating campaigns)
          </label>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Items</h3>
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
                        onChange={(e) => updateItem(idx, { priority: e.target.value as Priority })}
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
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const { canManageTemplates } = useRole();

  const [campaigns, setCampaigns]   = useState<Campaign[]>([]);
  const [templates, setTemplates]   = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);

  // Campaign modals
  const [campaignModal, setCampaignModal] = useState<Campaign | 'new' | null>(null);
  const [deleteCampaign, setDeleteCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState(false);

  // Template modals
  const [editTemplate, setEditTemplate]     = useState<ChecklistTemplate | 'new' | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<ChecklistTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([campaignsApi.list(), campaignTemplatesApi.list()]);
      setCampaigns(c);
      setTemplates(t);
    } catch {
      toast.error('Failed to load data.');
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleDeleteCampaignConfirm = async () => {
    if (!deleteCampaign) return;
    setDeletingCampaign(true);
    try {
      await campaignsApi.remove(deleteCampaign.id);
      toast.success('Campaign deleted');
      setDeleteCampaign(null);
      load();
    } catch {
      toast.error('Failed to delete campaign.');
    } finally {
      setDeletingCampaign(false);
    }
  };

  const handleDeleteTemplateConfirm = async () => {
    if (!deleteTemplate) return;
    setDeletingTemplate(true);
    try {
      await campaignTemplatesApi.remove(deleteTemplate.id);
      toast.success('Template deleted');
      setDeleteTemplate(null);
      load();
    } catch {
      toast.error('Failed to delete template.');
    } finally {
      setDeletingTemplate(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>;

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage your mailing campaigns.</p>
        </div>
        {canManageTemplates && (
          <button
            onClick={() => setCampaignModal('new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            + Create Campaign
          </button>
        )}
      </div>

      {/* ── Campaigns list ───────────────────────────────────────────── */}
      {campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
          {canManageTemplates
            ? 'No campaigns yet. Click "+ Create Campaign" to get started.'
            : 'No campaigns to display.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mail Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tasks</th>
                {canManageTemplates && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    {c.notes && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{c.notes}</p>}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(c.mailDate).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                    {c._count?.tasks ?? 0}
                  </td>
                  {canManageTemplates && (
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setCampaignModal(c)}
                          className="px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteCampaign(c)}
                          className="px-2.5 py-1 text-xs font-medium border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Checklist templates (secondary) ──────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => setShowTemplates((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors mb-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-gray-400 transition-transform ${showTemplates ? 'rotate-90' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          Checklist Templates
          <span className="text-xs text-gray-400 font-normal">({templates.length})</span>
        </button>

        {showTemplates && (
          <div>
            {canManageTemplates && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => setEditTemplate('new')}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  + New template
                </button>
              </div>
            )}
            {templates.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400 bg-white rounded-xl border border-gray-200">
                No templates yet.
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
                          {item.defaultDaysOffset != null && (
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
                          onClick={() => setDeleteTemplate(t)}
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
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {campaignModal && (
        <CampaignFormModal
          existing={campaignModal === 'new' ? undefined : campaignModal}
          templates={templates}
          onClose={() => setCampaignModal(null)}
          onSaved={() => { setCampaignModal(null); load(); }}
        />
      )}

      {editTemplate && (
        <TemplateFormModal
          existing={editTemplate === 'new' ? undefined : editTemplate}
          onClose={() => setEditTemplate(null)}
          onSaved={() => { setEditTemplate(null); load(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteCampaign}
        title={`Delete "${deleteCampaign?.name}"?`}
        description="This campaign and all its tasks will be permanently deleted. This cannot be undone."
        confirmLabel="Delete campaign"
        loading={deletingCampaign}
        onConfirm={handleDeleteCampaignConfirm}
        onCancel={() => { if (!deletingCampaign) setDeleteCampaign(null); }}
      />

      <ConfirmDialog
        open={!!deleteTemplate}
        title={`Delete "${deleteTemplate?.name}"?`}
        description="This template and all its items will be permanently deleted. This cannot be undone."
        confirmLabel="Delete template"
        loading={deletingTemplate}
        onConfirm={handleDeleteTemplateConfirm}
        onCancel={() => { if (!deletingTemplate) setDeleteTemplate(null); }}
      />
    </div>
  );
}
