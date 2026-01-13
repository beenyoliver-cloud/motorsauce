"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Search, Ban, AlertTriangle, Clock, CheckCircle, XCircle, Eye, ArrowLeft, Filter, Shield, RefreshCw, Calendar, Package, Flag } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  is_banned: boolean;
  is_suspended: boolean;
  suspended_until: string | null;
  ban_reason: string | null;
  warning_count: number;
  listing_count: number;
  report_count: number;
}

interface ModerationLog {
  id: string;
  action: string;
  reason: string;
  created_at: string;
  admin_name: string;
}

type ActionType = "ban" | "suspend" | "warn" | "unban" | "unsuspend" | "clear_warnings";

const ACTION_CONFIG: Record<ActionType, { title: string; description: string; color: string; bgColor: string; confirmText: string }> = {
  ban: { title: "Ban User", description: "Permanently ban this user.", color: "text-red-600", bgColor: "bg-red-600 hover:bg-red-700", confirmText: "Ban User" },
  suspend: { title: "Suspend User", description: "Temporarily suspend this user.", color: "text-orange-600", bgColor: "bg-orange-600 hover:bg-orange-700", confirmText: "Suspend" },
  warn: { title: "Issue Warning", description: "Send an official warning.", color: "text-yellow-600", bgColor: "bg-yellow-600 hover:bg-yellow-700", confirmText: "Issue Warning" },
  unban: { title: "Unban User", description: "Remove the ban.", color: "text-green-600", bgColor: "bg-green-600 hover:bg-green-700", confirmText: "Unban" },
  unsuspend: { title: "Remove Suspension", description: "Remove the suspension.", color: "text-green-600", bgColor: "bg-green-600 hover:bg-green-700", confirmText: "Remove Suspension" },
  clear_warnings: { title: "Clear Warnings", description: "Clear all warnings.", color: "text-blue-600", bgColor: "bg-blue-600 hover:bg-blue-700", confirmText: "Clear Warnings" },
};

const COMMON_REASONS = ["Spam or fraudulent listings", "Harassment or abusive behavior", "Selling prohibited items", "Scam attempts", "Repeated policy violations", "Other"];

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "banned" | "suspended" | "warned" | "reported">("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [suspendDays, setSuspendDays] = useState(7);
  const [processing, setProcessing] = useState(false);
  const [moderationHistory, setModerationHistory] = useState<ModerationLog[]>([]);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { checkAdminAndFetchUsers(); }, []);
  useEffect(() => { filterUsers(); }, [users, searchQuery, filterStatus]);
  useEffect(() => { if (successMessage) { const t = setTimeout(() => setSuccessMessage(null), 5000); return () => clearTimeout(t); } }, [successMessage]);

  async function getAccessToken(): Promise<string | null> {
    if (accessToken) return accessToken;
    const sb = supabaseBrowser();
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token || null;
    if (token) setAccessToken(token);
    return token;
  }

  async function checkAdminAndFetchUsers() {
    try {
      const sb = supabaseBrowser();
      const [{ data: { user } }, { data: { session } }] = await Promise.all([sb.auth.getUser(), sb.auth.getSession()]);
      if (!user || !session?.access_token) { router.push("/auth/login?next=/admin/users"); return; }
      const token = session.access_token;
      const adminRes = await fetch("/api/is-admin", { headers: { Authorization: "Bearer " + token } });
      if (!adminRes.ok) { router.push("/"); return; }
      const { isAdmin } = await adminRes.json();
      if (!isAdmin) { router.push("/"); return; }
      setAccessToken(token);
      await fetchUsers();
    } catch (err) { console.error(err); setError("Failed to verify admin access"); } finally { setLoading(false); }
  }

  async function fetchUsers() {
    setRefreshing(true);
    try {
      const sb = supabaseBrowser();
      const { data: profiles, error: fetchError } = await sb.from("profiles").select("*").order("created_at", { ascending: false });
      if (fetchError) { setError("Failed to fetch users"); return; }
      const usersWithStats = await Promise.all((profiles || []).map(async (p) => {
        const lr = await sb.from("listings").select("*", { count: "exact", head: true }).eq("seller_id", p.id);
        let reportCount = 0;
        try {
          const rr = await sb.from("user_reports").select("*", { count: "exact", head: true }).eq("reported_user_id", p.id).eq("status", "pending");
          reportCount = rr.count || 0;
        } catch { /* user_reports table may not exist */ }
        return { ...p, listing_count: lr.count || 0, report_count: reportCount };
      }));
      setUsers(usersWithStats);
      setError(null);
    } catch (err) { console.error(err); setError("Failed to fetch users"); } finally { setRefreshing(false); }
  }

  function filterUsers() {
    let f = [...users];
    if (searchQuery) { const q = searchQuery.toLowerCase(); f = f.filter((u) => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q)); }
    if (filterStatus === "active") f = f.filter((u) => !u.is_banned && !u.is_suspended);
    else if (filterStatus === "banned") f = f.filter((u) => u.is_banned);
    else if (filterStatus === "suspended") f = f.filter((u) => u.is_suspended && !u.is_banned);
    else if (filterStatus === "warned") f = f.filter((u) => (u.warning_count || 0) > 0);
    else if (filterStatus === "reported") f = f.filter((u) => u.report_count > 0);
    setFilteredUsers(f);
  }

  async function handleModerationAction() {
    if (!selectedUser || !actionType) return;
    const token = await getAccessToken();
    if (!token) { setError("Session expired."); return; }
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ userId: selectedUser.id, action: actionType, reason: actionReason, suspendDays: actionType === "suspend" ? suspendDays : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSuccessMessage("Action completed successfully");
      await fetchUsers();
      closeActionModal();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); } finally { setProcessing(false); }
  }

  async function fetchModerationHistory(userId: string) {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch("/api/admin/moderation?userId=" + userId, { headers: { Authorization: "Bearer " + token } });
      if (res.ok) { const data = await res.json(); setModerationHistory(data.logs || []); } else { setModerationHistory([]); }
    } catch { setModerationHistory([]); }
  }

  function openActionModal(user: User, action: ActionType) { setSelectedUser(user); setActionType(action); setActionReason(""); setSuspendDays(7); setShowActionModal(true); setError(null); }
  function closeActionModal() { setShowActionModal(false); setSelectedUser(null); setActionType(null); setActionReason(""); setError(null); }
  function openUserDetail(user: User) { setSelectedUser(user); setShowUserDetailModal(true); fetchModerationHistory(user.id); }
  function getUserDisplayName(user: User) { return user.name || user.full_name || user.username || user.email?.split("@")[0] || "Unknown"; }

  function getStatusBadge(user: User) {
    if (user.is_banned) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><Ban className="h-3 w-3" />Banned</span>;
    if (user.is_suspended) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"><Clock className="h-3 w-3" />Suspended</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" />Active</span>;
  }

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div></div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <Link href="/admin/dashboard" className="text-yellow-600 hover:text-yellow-700 flex items-center gap-1 mb-2 text-sm font-medium"><ArrowLeft className="h-4 w-4" />Back to Dashboard</Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3"><Shield className="h-8 w-8 text-yellow-500" />User Management</h1>
            <p className="text-gray-600 mt-1">{users.length} total users</p>
          </div>
          <button onClick={() => fetchUsers()} disabled={refreshing} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"><RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Refresh</button>
        </div>

        {successMessage && <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3"><CheckCircle className="h-5 w-5 text-green-600" /><p className="text-green-800">{successMessage}</p></div>}
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"><XCircle className="h-5 w-5 text-red-600" /><p className="text-red-800">{error}</p><button onClick={() => setError(null)} className="ml-auto"><XCircle className="h-5 w-5 text-red-600" /></button></div>}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)} className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white">
                <option value="all">All Users</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
                <option value="suspended">Suspended</option>
                <option value="warned">With Warnings</option>
                <option value="reported">With Reports</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Listings</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Reports</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Warnings</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Joined</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-yellow-500 flex items-center justify-center text-white font-semibold">{getUserDisplayName(user).charAt(0).toUpperCase()}</div>
                        <div>
                          <button onClick={() => openUserDetail(user)} className="text-sm font-medium text-gray-900 hover:text-yellow-600">{getUserDisplayName(user)}</button>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(user)}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">{user.listing_count}</td>
                    <td className="px-6 py-4 text-center">{user.report_count > 0 ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{user.report_count}</span> : <span className="text-gray-400">0</span>}</td>
                    <td className="px-6 py-4 text-center">{(user.warning_count || 0) > 0 ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">{user.warning_count}</span> : <span className="text-gray-400">0</span>}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openUserDetail(user)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="View"><Eye className="h-4 w-4" /></button>
                        {user.is_banned ? (
                          <button onClick={() => openActionModal(user, "unban")} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Unban"><CheckCircle className="h-4 w-4" /></button>
                        ) : user.is_suspended ? (
                          <button onClick={() => openActionModal(user, "unsuspend")} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Unsuspend"><CheckCircle className="h-4 w-4" /></button>
                        ) : (
                          <>
                            <button onClick={() => openActionModal(user, "warn")} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg" title="Warn"><AlertTriangle className="h-4 w-4" /></button>
                            <button onClick={() => openActionModal(user, "suspend")} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg" title="Suspend"><Clock className="h-4 w-4" /></button>
                            <button onClick={() => openActionModal(user, "ban")} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Ban"><Ban className="h-4 w-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && <div className="text-center py-16"><Users className="mx-auto h-12 w-12 text-gray-300" /><p className="mt-4 text-gray-500">No users found</p></div>}
        </div>
      </div>

      {showActionModal && selectedUser && actionType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className={`p-6 ${actionType === "ban" ? "bg-red-50" : actionType === "suspend" ? "bg-orange-50" : actionType === "warn" ? "bg-yellow-50" : "bg-green-50"}`}>
              <h2 className="text-xl font-bold text-gray-900">{ACTION_CONFIG[actionType].title}</h2>
              <p className="mt-1 text-sm text-gray-600">{ACTION_CONFIG[actionType].description}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-yellow-500 flex items-center justify-center text-white font-semibold">{getUserDisplayName(selectedUser).charAt(0).toUpperCase()}</div>
                <div><p className="font-medium">{getUserDisplayName(selectedUser)}</p><p className="text-sm text-gray-500">{selectedUser.email}</p></div>
              </div>
              {actionType === "suspend" && (
                <div><label className="block text-sm font-medium mb-2">Duration</label><select value={suspendDays} onChange={(e) => setSuspendDays(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2.5"><option value={1}>1 day</option><option value={3}>3 days</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select></div>
              )}
              {!["unban", "unsuspend", "clear_warnings"].includes(actionType) && (
                <div><label className="block text-sm font-medium mb-2">Reason</label><select onChange={(e) => e.target.value && setActionReason(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 mb-2" defaultValue=""><option value="" disabled>Select reason...</option>{COMMON_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}</select><textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="Or enter custom reason..." className="w-full border rounded-lg px-3 py-2.5 h-20 resize-none" /></div>
              )}
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
              <div className="flex gap-3">
                <button onClick={closeActionModal} className="flex-1 px-4 py-2.5 border rounded-lg font-medium hover:bg-gray-50" disabled={processing}>Cancel</button>
                <button onClick={handleModerationAction} disabled={processing || (!["unban", "unsuspend", "clear_warnings"].includes(actionType) && !actionReason)} className={`flex-1 px-4 py-2.5 rounded-lg text-white font-medium disabled:opacity-50 ${ACTION_CONFIG[actionType].bgColor}`}>{processing ? "Processing..." : ACTION_CONFIG[actionType].confirmText}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUserDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold text-xl">{getUserDisplayName(selectedUser).charAt(0).toUpperCase()}</div>
                <div><h2 className="text-xl font-bold">{getUserDisplayName(selectedUser)}</h2><p className="text-gray-500">{selectedUser.email}</p></div>
              </div>
              <button onClick={() => { setShowUserDetailModal(false); setSelectedUser(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><XCircle className="h-6 w-6 text-gray-400" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold">{selectedUser.listing_count}</p><p className="text-sm text-gray-500">Listings</p></div>
                <div className="bg-gray-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold">{selectedUser.warning_count || 0}</p><p className="text-sm text-gray-500">Warnings</p></div>
                <div className="bg-gray-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold">{selectedUser.report_count}</p><p className="text-sm text-gray-500">Reports</p></div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">{getStatusBadge(selectedUser)}</div>
              </div>
              <div className="mb-4 text-sm text-gray-600"><Calendar className="inline h-4 w-4 mr-1" />Joined {new Date(selectedUser.created_at).toLocaleDateString()}</div>
              {selectedUser.ban_reason && <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4"><p className="text-sm font-medium text-red-800">Ban Reason: {selectedUser.ban_reason}</p></div>}
              <h3 className="font-semibold mb-3">Moderation History</h3>
              {moderationHistory.length > 0 ? (
                <div className="space-y-3">{moderationHistory.map((log) => (<div key={log.id} className="border-l-4 border-gray-300 pl-4 py-2 bg-gray-50 rounded-r-lg"><div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${log.action === "ban" ? "bg-red-100 text-red-800" : log.action === "suspend" ? "bg-orange-100 text-orange-800" : log.action === "warn" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>{log.action.toUpperCase()}</span><span className="text-sm text-gray-500">by {log.admin_name}</span><span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</span></div>{log.reason && <p className="text-sm text-gray-700 mt-1">{log.reason}</p>}</div>))}</div>
              ) : <p className="text-gray-500 text-center py-8">No moderation history</p>}
            </div>
            <div className="p-4 border-t bg-gray-50 flex flex-wrap gap-2 justify-end">
              {!selectedUser.is_banned && !selectedUser.is_suspended && (<><button onClick={() => { setShowUserDetailModal(false); openActionModal(selectedUser, "warn"); }} className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-medium hover:bg-yellow-200">Warn</button><button onClick={() => { setShowUserDetailModal(false); openActionModal(selectedUser, "suspend"); }} className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200">Suspend</button><button onClick={() => { setShowUserDetailModal(false); openActionModal(selectedUser, "ban"); }} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200">Ban</button></>)}
              {selectedUser.is_banned && <button onClick={() => { setShowUserDetailModal(false); openActionModal(selectedUser, "unban"); }} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">Unban</button>}
              {selectedUser.is_suspended && !selectedUser.is_banned && <button onClick={() => { setShowUserDetailModal(false); openActionModal(selectedUser, "unsuspend"); }} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">Unsuspend</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
