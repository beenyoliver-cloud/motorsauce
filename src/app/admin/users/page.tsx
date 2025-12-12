"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Search, Ban, AlertTriangle, Clock, CheckCircle, XCircle, Eye, ArrowLeft, Filter } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

interface User {
  id: string;
  email: string;
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
  admin_username: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "banned" | "suspended" | "reported">("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<"ban" | "suspend" | "warn" | "unban" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [suspendDays, setSuspendDays] = useState(7);
  const [processing, setProcessing] = useState(false);
  const [moderationHistory, setModerationHistory] = useState<ModerationLog[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => { checkAdminAndFetchUsers(); }, []);
  useEffect(() => { filterUsers(); }, [users, searchQuery, filterStatus]);

  async function checkAdminAndFetchUsers() {
    try {
      const supabase = supabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/signin"); return; }
      const { data: adminCheck } = await supabase.from("admins").select("id").eq("user_id", user.id).single();
      if (!adminCheck) { router.push("/"); return; }
      await fetchUsers();
    } catch (err) { console.error("Error:", err); } finally { setLoading(false); }
  }

  async function fetchUsers() {
    const supabase = supabaseBrowser();
    const { data: profiles, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) { console.error("Error fetching users:", error); return; }
    const usersWithStats = await Promise.all((profiles || []).map(async (profile) => {
      const { count: listingCount } = await supabase.from("listings").select("*", { count: "exact", head: true }).eq("seller_id", profile.id);
      const { count: reportCount } = await supabase.from("user_reports").select("*", { count: "exact", head: true }).eq("reported_user_id", profile.id).eq("status", "pending");
      return { ...profile, listing_count: listingCount || 0, report_count: reportCount || 0 };
    }));
    setUsers(usersWithStats);
  }

  function filterUsers() {
    let filtered = [...users];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((u) => u.username?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query) || u.full_name?.toLowerCase().includes(query));
    }
    switch (filterStatus) {
      case "active": filtered = filtered.filter((u) => !u.is_banned && !u.is_suspended); break;
      case "banned": filtered = filtered.filter((u) => u.is_banned); break;
      case "suspended": filtered = filtered.filter((u) => u.is_suspended); break;
      case "reported": filtered = filtered.filter((u) => u.report_count > 0); break;
    }
    setFilteredUsers(filtered);
  }

  async function handleModerationAction() {
    if (!selectedUser || !actionType) return;
    setProcessing(true);
    try {
      const response = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, action: actionType, reason: actionReason, suspendDays: actionType === "suspend" ? suspendDays : undefined }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Failed to perform action"); }
      await fetchUsers();
      closeActionModal();
    } catch (err) { console.error("Error:", err); alert(err instanceof Error ? err.message : "An error occurred"); } finally { setProcessing(false); }
  }

  async function fetchModerationHistory(userId: string) {
    try {
      const response = await fetch(`/api/admin/moderation?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      setModerationHistory(data.logs || []);
      setShowHistoryModal(true);
    } catch (err) { console.error("Error:", err); }
  }

  function openActionModal(user: User, action: "ban" | "suspend" | "warn" | "unban") { setSelectedUser(user); setActionType(action); setActionReason(""); setSuspendDays(7); setShowActionModal(true); }
  function closeActionModal() { setShowActionModal(false); setSelectedUser(null); setActionType(null); setActionReason(""); }

  if (loading) { return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>); }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/admin/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" />Back to Dashboard</Link>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">{users.length} total users</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="text" placeholder="Search by username, email, or name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)} className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Users</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
                <option value="suspended">Suspended</option>
                <option value="reported">With Reports</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Listings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reports</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warnings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {user.avatar_url ? (<img src={user.avatar_url} alt="" className="h-full w-full object-cover" />) : (<Users className="h-5 w-5 text-gray-500" />)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.username || "No username"}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_banned ? (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><Ban className="h-3 w-3 mr-1" />Banned</span>) : user.is_suspended ? (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Suspended</span>) : (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</span>)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.listing_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.report_count > 0 ? (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"><AlertTriangle className="h-3 w-3 mr-1" />{user.report_count}</span>) : (<span className="text-sm text-gray-500">0</span>)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.warning_count || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setSelectedUser(user); fetchModerationHistory(user.id); }} className="text-gray-600 hover:text-gray-900" title="View History"><Eye className="h-4 w-4" /></button>
                        {user.is_banned ? (<button onClick={() => openActionModal(user, "unban")} className="text-green-600 hover:text-green-900" title="Unban User"><CheckCircle className="h-4 w-4" /></button>) : (<><button onClick={() => openActionModal(user, "warn")} className="text-yellow-600 hover:text-yellow-900" title="Issue Warning"><AlertTriangle className="h-4 w-4" /></button><button onClick={() => openActionModal(user, "suspend")} className="text-orange-600 hover:text-orange-900" title="Suspend User"><Clock className="h-4 w-4" /></button><button onClick={() => openActionModal(user, "ban")} className="text-red-600 hover:text-red-900" title="Ban User"><Ban className="h-4 w-4" /></button></>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (<div className="text-center py-12"><Users className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3><p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter.</p></div>)}
        </div>
      </div>

      {showActionModal && selectedUser && actionType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{actionType === "ban" && "Ban User"}{actionType === "suspend" && "Suspend User"}{actionType === "warn" && "Issue Warning"}{actionType === "unban" && "Unban User"}</h2>
              <p className="text-gray-600 mb-4">{actionType === "ban" && `Are you sure you want to permanently ban ${selectedUser.username}?`}{actionType === "suspend" && `Suspend ${selectedUser.username} temporarily.`}{actionType === "warn" && `Issue a warning to ${selectedUser.username}.`}{actionType === "unban" && `Remove the ban from ${selectedUser.username}?`}</p>
              {actionType === "suspend" && (<div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Suspension Duration</label><select value={suspendDays} onChange={(e) => setSuspendDays(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"><option value={1}>1 day</option><option value={3}>3 days</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></div>)}
              {actionType !== "unban" && (<div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Reason</label><textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="Enter reason for this action..." className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 h-24 resize-none" /></div>)}
              <div className="flex justify-end gap-3">
                <button onClick={closeActionModal} className="px-4 py-2 text-gray-700 hover:text-gray-900" disabled={processing}>Cancel</button>
                <button onClick={handleModerationAction} disabled={processing || (actionType !== "unban" && !actionReason)} className={`px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 ${actionType === "ban" ? "bg-red-600 hover:bg-red-700" : actionType === "suspend" ? "bg-orange-600 hover:bg-orange-700" : actionType === "warn" ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}`}>{processing ? "Processing..." : "Confirm"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Moderation History: {selectedUser.username}</h2>
                <button onClick={() => { setShowHistoryModal(false); setSelectedUser(null); }} className="text-gray-400 hover:text-gray-600"><XCircle className="h-6 w-6" /></button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-96">
              {moderationHistory.length > 0 ? (
                <div className="space-y-4">
                  {moderationHistory.map((log) => (
                    <div key={log.id} className="border-l-4 border-gray-300 pl-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${log.action === "ban" ? "bg-red-100 text-red-800" : log.action === "suspend" ? "bg-orange-100 text-orange-800" : log.action === "warn" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>{log.action.toUpperCase()}</span>
                        <span className="text-sm text-gray-500">by {log.admin_username}</span>
                      </div>
                      <p className="text-gray-700 mt-1">{log.reason}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (<p className="text-gray-500 text-center py-8">No moderation history found.</p>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
