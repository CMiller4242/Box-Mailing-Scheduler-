import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Task, TaskAttachment, TaskStatus, Priority } from '../types';
import { tasksApi } from '../api/tasks';
import { useUsers } from '../hooks/useUsers';
import { useRole } from '../hooks/useRole';
import { useAuth } from '../context/AuthContext';
import SalesEnablementModal from './SalesEnablementModal';

const SALES_ENABLEMENT_URL =
  'https://sheets.positivepromotions.com/#/nc/form/c488db93-da1d-4584-9b93-37e4e2772ab2';

interface Props {
  task?: Task;
  campaignId?: string;
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

function toDateInput(iso: string) {
  return iso.split('T')[0];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function TaskFormModal({ task, campaignId, defaultDate, onClose, onSaved }: Props) {
  const isEdit = !!task;
  const users = useUsers();
  const firstRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const { canEditFullTask, isEmployee } = useRole();
  const { user: authUser } = useAuth();

  const [title, setTitle] = useState(task?.title ?? '');
  const [dueDate, setDueDate] = useState(task ? toDateInput(task.dueDate) : (defaultDate ?? ''));
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'NOT_STARTED');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'MEDIUM');
  const [ownerId, setOwnerId] = useState(task?.ownerId ?? '');
  const [instructions, setInstructions] = useState(task?.instructions ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attachments
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Complete Task action
  const [completing, setCompleting] = useState(false);

  // Sales Enablement
  const [salesEnablementTarget, setSalesEnablementTarget] = useState<TaskAttachment | null>(null);
  const [sendingSE, setSendingSE] = useState<string | null>(null);

  const isCurrentOwner = !!task && task.ownerId === authUser?.id;
  const canComplete = isEdit && task.status !== 'COMPLETED' && (isCurrentOwner || !isEmployee);
  const employeeCanChangeOwner = isEmployee && isEdit && status === 'COMPLETED';

  useEffect(() => { (firstRef.current as HTMLElement | null)?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (!isEdit || !task?.id) return;
    tasksApi.getAttachments(task.id).then(setAttachments).catch(() => {});
  }, [isEdit, task?.id]);

  const validate = () => {
    if (!title.trim()) return 'Title is required.';
    if (!dueDate) return 'Due date is required.';
    if (!isEdit && !campaignId) return 'Campaign is required.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }

    setSaving(true);
    setError(null);
    try {
      if (isEmployee && isEdit) {
        const payload: Record<string, unknown> = { status, instructions: instructions.trim() || undefined };
        if (employeeCanChangeOwner) payload.ownerId = ownerId || undefined;
        await tasksApi.update(task!.id, payload);
      } else if (isEdit) {
        await tasksApi.update(task!.id, {
          title: title.trim(),
          dueDate: new Date(dueDate).toISOString(),
          status,
          priority,
          ownerId: ownerId || undefined,
          instructions: instructions.trim() || undefined,
        });
      } else {
        await tasksApi.create({
          campaignId: campaignId!,
          title: title.trim(),
          dueDate: new Date(dueDate).toISOString(),
          status,
          priority,
          ownerId: ownerId || undefined,
          instructions: instructions.trim() || undefined,
        });
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!task?.id) return;
    setCompleting(true);
    try {
      const result = await tasksApi.complete(task.id);
      toast.success(result.next ? 'Task completed — next task assigned.' : 'Task marked complete.');
      onSaved();
    } catch {
      toast.error('Failed to complete task.');
    } finally {
      setCompleting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task?.id) return;
    setUploading(true);
    try {
      const attachment = await tasksApi.uploadAttachment(task.id, file);
      setAttachments((prev) => [...prev, attachment]);
      toast.success('File uploaded.');
    } catch {
      toast.error('Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSalesEnablementConfirm = async () => {
    if (!salesEnablementTarget) return;
    const { id, filename } = salesEnablementTarget;
    setSalesEnablementTarget(null);
    setSendingSE(id);
    try {
      const updated = await tasksApi.markSentToSalesEnablement(id);
      setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
      window.open(SALES_ENABLEMENT_URL, '_blank', 'noopener,noreferrer');
      toast.success(`"${filename}" sent to Sales Enablement.`);
    } catch {
      toast.error('Failed to record Sales Enablement submission.');
    } finally {
      setSendingSE(null);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await tasksApi.deleteAttachment(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch {
      toast.error('Failed to delete attachment.');
    }
  };

  const readonlyInput = 'w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-500 cursor-not-allowed';
  const editableInput = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {salesEnablementTarget && (
          <SalesEnablementModal
            filename={salesEnablementTarget.filename}
            onConfirm={handleSalesEnablementConfirm}
            onCancel={() => setSalesEnablementTarget(null)}
          />
        )}

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title {canEditFullTask && <span className="text-red-400">*</span>}
              </label>
              <input
                ref={canEditFullTask ? firstRef as React.RefObject<HTMLInputElement> : undefined}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to happen?"
                className={canEditFullTask ? editableInput : readonlyInput}
                readOnly={!canEditFullTask}
              />
            </div>

            {/* Due date + Priority row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date {canEditFullTask && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={canEditFullTask ? editableInput : readonlyInput}
                  readOnly={!canEditFullTask}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className={canEditFullTask ? editableInput : readonlyInput}
                  disabled={!canEditFullTask}
                >
                  {PRIORITY_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status + Assignee row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  ref={isEmployee ? firstRef as React.RefObject<HTMLSelectElement> : undefined}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className={editableInput}
                >
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className={(canEditFullTask || employeeCanChangeOwner) ? editableInput : readonlyInput}
                  disabled={!(canEditFullTask || employeeCanChangeOwner)}
                >
                  <option value="">— Unassigned —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                {isEmployee && isEdit && status !== 'COMPLETED' && (
                  <p className="mt-1 text-xs text-gray-400">Assignee editable when marking complete.</p>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructions / Notes</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder="Optional context, steps, or requirements…"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Attachments (edit mode only) */}
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                {attachments.length > 0 && (
                  <ul className="space-y-1.5 mb-2">
                    {attachments.map((a) => (
                      <li key={a.id} className="flex flex-col gap-1 text-xs text-gray-600 bg-gray-50 rounded-md px-3 py-2">
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                          </svg>
                          <a
                            href={tasksApi.downloadAttachmentUrl(a.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 truncate text-blue-600 hover:underline"
                          >
                            {a.filename}
                          </a>
                          <span className="text-gray-400 flex-shrink-0">{formatBytes(a.size)}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(a.id)}
                            className="text-gray-300 hover:text-red-500 flex-shrink-0"
                            aria-label="Delete attachment"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex items-center gap-2 pl-5">
                          {a.sentToSalesEnablementAt ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-200">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Sent to Sales Enablement &middot; {new Date(a.sentToSalesEnablementAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={sendingSE === a.id}
                              onClick={() => setSalesEnablementTarget(a)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-blue-300 text-blue-600 text-[10px] font-medium hover:bg-blue-50 disabled:opacity-50 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                              </svg>
                              {sendingSE === a.id ? 'Sending…' : 'Send to Sales Enablement'}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  {uploading ? 'Uploading…' : 'Upload file'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 pt-2 flex items-center justify-between gap-3 border-t border-gray-100">
            <div>
              {canComplete && (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={completing}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {completing ? 'Completing…' : '✓ Complete Task'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
