import { useEffect, useState } from 'react';
import type { User, UserRole } from '../types';
import { usersApi } from '../api/users';
import { useAuth } from '../context/AuthContext';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'ADMIN',    label: 'Admin'    },
  { value: 'MANAGER',  label: 'Manager'  },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'MEMBER',   label: 'Member'   },
];

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN:    'bg-purple-100 text-purple-700',
  MANAGER:  'bg-blue-100 text-blue-700',
  EMPLOYEE: 'bg-green-100 text-green-700',
  MEMBER:   'bg-gray-100 text-gray-600',
};

interface RowState {
  // role editing
  role: UserRole;
  saving: boolean;
  saved: boolean;
  saveError: string | null;
  // deletion
  confirmDelete: boolean;
  deleting: boolean;
  deleteError: string | null;
}

function errMsg(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return msg ?? fallback;
}

export default function AdminUsersPage() {
  const { user: me } = useAuth();

  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rowState, setRowState]     = useState<Record<string, RowState>>({});

  useEffect(() => {
    usersApi.list()
      .then((data) => {
        setUsers(data);
        const initial: Record<string, RowState> = {};
        for (const u of data) {
          initial[u.id] = {
            role: u.role, saving: false, saved: false, saveError: null,
            confirmDelete: false, deleting: false, deleteError: null,
          };
        }
        setRowState(initial);
      })
      .catch(() => setFetchError('Failed to load users. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  const patchRow = (id: string, patch: Partial<RowState>) =>
    setRowState((s) => ({ ...s, [id]: { ...s[id], ...patch } }));

  // ── Role update ────────────────────────────────────────────────────────────
  const setRowRole = (id: string, role: UserRole) =>
    patchRow(id, { role, saved: false, saveError: null });

  const saveRole = async (user: User) => {
    const state = rowState[user.id];
    if (!state || state.role === user.role) return;
    patchRow(user.id, { saving: true, saveError: null, saved: false });
    try {
      const updated = await usersApi.updateRole(user.id, state.role);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      patchRow(user.id, { saving: false, saved: true });
      setTimeout(() => patchRow(user.id, { saved: false }), 2000);
    } catch (err) {
      patchRow(user.id, { saving: false, saveError: errMsg(err, 'Failed to update role.') });
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const requestDelete = (id: string) =>
    patchRow(id, { confirmDelete: true, deleteError: null });

  const cancelDelete = (id: string) =>
    patchRow(id, { confirmDelete: false, deleteError: null });

  const confirmDelete = async (id: string) => {
    patchRow(id, { deleting: true, deleteError: null });
    try {
      await usersApi.deleteUser(id);
      // Remove from list immediately
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setRowState((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
    } catch (err) {
      patchRow(id, {
        deleting: false,
        confirmDelete: false,
        deleteError: errMsg(err, 'Failed to delete user.'),
      });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          View, update roles, and delete users. Role changes take effect on next login.
        </p>
      </div>

      {loading && (
        <div className="text-sm text-gray-500 py-12 text-center">Loading users…</div>
      )}

      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {fetchError}
        </div>
      )}

      {!loading && !fetchError && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Change Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const state   = rowState[u.id];
                const isSelf  = u.id === me?.id;
                const isDirty = state && state.role !== u.role;

                return (
                  <tr key={u.id} className={isSelf ? 'bg-blue-50/40' : ''}>

                    {/* Name */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {u.firstName} {u.lastName}
                          {isSelf && <span className="ml-1.5 text-xs text-blue-500 font-normal">(you)</span>}
                        </p>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{u.email}</td>

                    {/* Current role badge */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role]}`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Role selector */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {isSelf ? (
                        <span className="text-xs text-gray-400 italic">Cannot change own role</span>
                      ) : (
                        <select
                          value={state?.role ?? u.role}
                          onChange={(e) => setRowRole(u.id, e.target.value as UserRole)}
                          disabled={state?.saving || state?.deleting}
                          className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {ROLE_OPTIONS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      )}
                    </td>

                    {/* Delete action */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {isSelf ? (
                        <span className="text-xs text-gray-400 italic">Cannot delete own account</span>
                      ) : state?.confirmDelete ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600 font-medium">Delete permanently?</span>
                          <button
                            onClick={() => confirmDelete(u.id)}
                            disabled={state.deleting}
                            className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {state.deleting ? 'Deleting…' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => cancelDelete(u.id)}
                            disabled={state.deleting}
                            className="px-2.5 py-1 text-xs font-medium rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {state?.deleteError && (
                            <span className="text-xs text-red-500 max-w-[160px] truncate" title={state.deleteError}>
                              {state.deleteError}
                            </span>
                          )}
                          <button
                            onClick={() => requestDelete(u.id)}
                            disabled={state?.saving}
                            className="px-2.5 py-1 text-xs font-medium rounded-md border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Save role button + feedback */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      {!isSelf && (
                        <div className="flex items-center justify-end gap-3">
                          {state?.saveError && (
                            <span className="text-xs text-red-500">{state.saveError}</span>
                          )}
                          {state?.saved && (
                            <span className="text-xs text-green-600 font-medium">✓ Saved</span>
                          )}
                          <button
                            onClick={() => saveRole(u)}
                            disabled={!isDirty || state?.saving || state?.deleting}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {state?.saving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
