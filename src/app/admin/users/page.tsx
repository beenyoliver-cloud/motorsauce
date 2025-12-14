"use client";"use client";



import { useEffect, useState } from "react";import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";import { useRouter } from "next/navigation";

import Link from "next/link";import Link from "next/link";

import { import { Users, Search, Ban, AlertTriangle, Clock, CheckCircle, XCircle, Eye, ArrowLeft, Filter } from "lucide-react";

  Users, Search, Ban, AlertTriangle, Clock, CheckCircle, XCircle, import { supabaseBrowser } from "@/lib/supabase";

  Eye, ArrowLeft, Filter, Shield, RefreshCw,

  Mail, Calendar, Package, Flaginterface User {

} from "lucide-react";  id: string;

import { supabaseBrowser } from "@/lib/supabase";  email: string;

  username: string;

interface User {  full_name: string;

  id: string;  avatar_url: string | null;

  email: string;  created_at: string;

  name: string;  is_banned: boolean;

  username: string;  is_suspended: boolean;

  full_name: string;  suspended_until: string | null;

  avatar_url: string | null;  ban_reason: string | null;

  created_at: string;  warning_count: number;

  is_banned: boolean;  listing_count: number;

  is_suspended: boolean;  report_count: number;

  suspended_until: string | null;}

  ban_reason: string | null;

  warning_count: number;interface ModerationLog {

  listing_count: number;  id: string;

  report_count: number;  action: string;

}  reason: string;

  created_at: string;

interface ModerationLog {  admin_username: string;

  id: string;}

  action: string;

  reason: string;export default function AdminUsersPage() {

  created_at: string;  const router = useRouter();

  admin_name: string;  const [loading, setLoading] = useState(true);

  details?: Record<string, unknown>;  const [accessToken, setAccessToken] = useState<string | null>(null);

}  const [users, setUsers] = useState<User[]>([]);

  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

type ActionType = "ban" | "suspend" | "warn" | "unban" | "unsuspend" | "clear_warnings";  const [searchQuery, setSearchQuery] = useState("");

  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "banned" | "suspended" | "reported">("all");

const ACTION_CONFIG: Record<ActionType, {   const [selectedUser, setSelectedUser] = useState<User | null>(null);

  title: string;   const [showActionModal, setShowActionModal] = useState(false);

  description: string;   const [actionType, setActionType] = useState<"ban" | "suspend" | "warn" | "unban" | null>(null);

  color: string;   const [actionReason, setActionReason] = useState("");

  bgColor: string;  const [suspendDays, setSuspendDays] = useState(7);

  icon: typeof Ban;  const [processing, setProcessing] = useState(false);

  confirmText: string;  const [moderationHistory, setModerationHistory] = useState<ModerationLog[]>([]);

}> = {  const [showHistoryModal, setShowHistoryModal] = useState(false);

  ban: { 

    title: "Ban User",   useEffect(() => { checkAdminAndFetchUsers(); }, []);

    description: "Permanently ban this user from the platform. They will not be able to access their account.",   useEffect(() => { filterUsers(); }, [users, searchQuery, filterStatus]);

    color: "text-red-600", 

    bgColor: "bg-red-600 hover:bg-red-700",  async function getAccessToken(): Promise<string | null> {

    icon: Ban,    if (accessToken) return accessToken;

    confirmText: "Ban User"    const supabase = supabaseBrowser();

  },    const { data: { session } } = await supabase.auth.getSession();

  suspend: {     const token = session?.access_token || null;

    title: "Suspend User",     if (token) setAccessToken(token);

    description: "Temporarily suspend this user for a specified period.",     return token;

    color: "text-orange-600",   }

    bgColor: "bg-orange-600 hover:bg-orange-700",

    icon: Clock,  async function checkAdminAndFetchUsers() {

    confirmText: "Suspend User"    try {

  },      const supabase = supabaseBrowser();

  warn: {       const [{ data: { user } }, { data: { session } }] = await Promise.all([

    title: "Issue Warning",         supabase.auth.getUser(),

    description: "Send an official warning to this user. Multiple warnings may lead to suspension or ban.",         supabase.auth.getSession(),

    color: "text-yellow-600",       ]);

    bgColor: "bg-yellow-600 hover:bg-yellow-700",

    icon: AlertTriangle,      if (!user || !session?.access_token) {

    confirmText: "Issue Warning"        router.push("/auth/login?next=/admin/users");

  },        return;

  unban: {       }

    title: "Unban User", 

    description: "Remove the ban from this user and restore their account access.",       const token = session.access_token;

    color: "text-green-600",       const adminRes = await fetch("/api/is-admin", {

    bgColor: "bg-green-600 hover:bg-green-700",        headers: { Authorization: `Bearer ${token}` },

    icon: CheckCircle,      });

    confirmText: "Unban User"

  },      if (!adminRes.ok) {

  unsuspend: {         router.push("/");

    title: "Remove Suspension",         return;

    description: "Remove the suspension and restore this user's account access.",       }

    color: "text-green-600", 

    bgColor: "bg-green-600 hover:bg-green-700",      const { isAdmin } = await adminRes.json();

    icon: CheckCircle,      if (!isAdmin) {

    confirmText: "Remove Suspension"        router.push("/");

  },        return;

  clear_warnings: {       }

    title: "Clear Warnings", 

    description: "Clear all warnings from this user's record.",       setAccessToken(token);

    color: "text-blue-600",       await fetchUsers();

    bgColor: "bg-blue-600 hover:bg-blue-700",    } catch (err) {

    icon: RefreshCw,      console.error("Error:", err);

    confirmText: "Clear Warnings"    } finally {

  },      setLoading(false);

};    }

  }

const COMMON_REASONS = [

  "Spam or fraudulent listings",  async function fetchUsers() {

  "Harassment or abusive behavior",    const supabase = supabaseBrowser();

  "Selling prohibited items",    const { data: profiles, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });

  "Scam attempts",    if (error) { console.error("Error fetching users:", error); return; }

  "Repeated policy violations",    const usersWithStats = await Promise.all((profiles || []).map(async (profile) => {

  "Fake reviews or ratings",      const { count: listingCount } = await supabase.from("listings").select("*", { count: "exact", head: true }).eq("seller_id", profile.id);

  "Account sharing or reselling",      const { count: reportCount } = await supabase.from("user_reports").select("*", { count: "exact", head: true }).eq("reported_user_id", profile.id).eq("status", "pending");

  "Other policy violation",      return { ...profile, listing_count: listingCount || 0, report_count: reportCount || 0 };

];    }));

    setUsers(usersWithStats);

export default function AdminUsersPage() {  }

  const router = useRouter();

  const [loading, setLoading] = useState(true);  function filterUsers() {

  const [accessToken, setAccessToken] = useState<string | null>(null);    let filtered = [...users];

  const [users, setUsers] = useState<User[]>([]);    if (searchQuery) {

  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);      const query = searchQuery.toLowerCase();

  const [searchQuery, setSearchQuery] = useState("");      filtered = filtered.filter((u) => u.username?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query) || u.full_name?.toLowerCase().includes(query));

  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "banned" | "suspended" | "warned" | "reported">("all");    }

  const [selectedUser, setSelectedUser] = useState<User | null>(null);    switch (filterStatus) {

  const [showActionModal, setShowActionModal] = useState(false);      case "active": filtered = filtered.filter((u) => !u.is_banned && !u.is_suspended); break;

  const [actionType, setActionType] = useState<ActionType | null>(null);      case "banned": filtered = filtered.filter((u) => u.is_banned); break;

  const [actionReason, setActionReason] = useState("");      case "suspended": filtered = filtered.filter((u) => u.is_suspended); break;

  const [suspendDays, setSuspendDays] = useState(7);      case "reported": filtered = filtered.filter((u) => u.report_count > 0); break;

  const [processing, setProcessing] = useState(false);    }

  const [moderationHistory, setModerationHistory] = useState<ModerationLog[]>([]);    setFilteredUsers(filtered);

  const [showUserDetailModal, setShowUserDetailModal] = useState(false);  }

  const [error, setError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);  async function handleModerationAction() {

  const [refreshing, setRefreshing] = useState(false);    if (!selectedUser || !actionType) return;

    const token = await getAccessToken();

  useEffect(() => { checkAdminAndFetchUsers(); }, []);    if (!token) return;

  useEffect(() => { filterUsers(); }, [users, searchQuery, filterStatus]);    setProcessing(true);

  useEffect(() => {     try {

    if (successMessage) {      const response = await fetch("/api/admin/moderation", {

      const timer = setTimeout(() => setSuccessMessage(null), 5000);        method: "POST",

      return () => clearTimeout(timer);        headers: {

    }          "Content-Type": "application/json",

  }, [successMessage]);          Authorization: `Bearer ${token}`,

        },

  async function getAccessToken(): Promise<string | null> {        body: JSON.stringify({

    if (accessToken) return accessToken;          userId: selectedUser.id,

    const supabase = supabaseBrowser();          action: actionType,

    const { data: { session } } = await supabase.auth.getSession();          reason: actionReason,

    const token = session?.access_token || null;          suspendDays: actionType === "suspend" ? suspendDays : undefined,

    if (token) setAccessToken(token);        }),

    return token;      });

  }      if (!response.ok) {

        const data = await response.json().catch(() => ({}));

  async function checkAdminAndFetchUsers() {        throw new Error(data.error || "Failed to perform action");

    try {      }

      const supabase = supabaseBrowser();      await fetchUsers();

      const [{ data: { user } }, { data: { session } }] = await Promise.all([      closeActionModal();

        supabase.auth.getUser(),    } catch (err) {

        supabase.auth.getSession(),      console.error("Error:", err);

      ]);      alert(err instanceof Error ? err.message : "An error occurred");

    } finally {

      if (!user || !session?.access_token) {      setProcessing(false);

        router.push("/auth/login?next=/admin/users");    }

        return;  }

      }

  async function fetchModerationHistory(userId: string) {

      const token = session.access_token;    try {

      const adminRes = await fetch("/api/is-admin", {      const token = await getAccessToken();

        headers: { Authorization: `Bearer ${token}` },      if (!token) return;

      });      const response = await fetch(`/api/admin/moderation?userId=${userId}`, {

        headers: { Authorization: `Bearer ${token}` },

      if (!adminRes.ok) {      });

        router.push("/");      if (!response.ok) throw new Error("Failed to fetch history");

        return;      const data = await response.json();

      }      setModerationHistory(data.logs || []);

      setShowHistoryModal(true);

      const { isAdmin } = await adminRes.json();    } catch (err) {

      if (!isAdmin) {      console.error("Error:", err);

        router.push("/");    }

        return;  }

      }

  function openActionModal(user: User, action: "ban" | "suspend" | "warn" | "unban") { setSelectedUser(user); setActionType(action); setActionReason(""); setSuspendDays(7); setShowActionModal(true); }

      setAccessToken(token);  function closeActionModal() { setShowActionModal(false); setSelectedUser(null); setActionType(null); setActionReason(""); }

      await fetchUsers();

    } catch (err) {  if (loading) { return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>); }

      console.error("Error:", err);

      setError("Failed to verify admin access");  return (

    } finally {    <div className="min-h-screen bg-gray-50">

      setLoading(false);      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

    }        <div className="flex justify-between items-center mb-8">

  }          <div>

            <Link href="/admin/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" />Back to Dashboard</Link>

  async function fetchUsers() {            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>

    setRefreshing(true);            <p className="text-gray-600 mt-1">{users.length} total users</p>

    try {          </div>

      const supabase = supabaseBrowser();        </div>

      const { data: profiles, error } = await supabase

        .from("profiles")        <div className="bg-white rounded-lg shadow mb-6">

        .select("*")          <div className="p-4 border-b flex flex-col md:flex-row gap-4">

        .order("created_at", { ascending: false });            <div className="flex-1 relative">

                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

      if (error) {               <input type="text" placeholder="Search by username, email, or name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />

        console.error("Error fetching users:", error);             </div>

        setError("Failed to fetch users");            <div className="flex items-center gap-2">

        return;               <Filter className="h-5 w-5 text-gray-400" />

      }              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)} className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">

                      <option value="all">All Users</option>

      // Fetch listing and report counts in parallel                <option value="active">Active</option>

      const usersWithStats = await Promise.all((profiles || []).map(async (profile) => {                <option value="banned">Banned</option>

        const [listingResult, reportResult] = await Promise.all([                <option value="suspended">Suspended</option>

          supabase.from("listings").select("*", { count: "exact", head: true }).eq("seller_id", profile.id),                <option value="reported">With Reports</option>

          supabase.from("user_reports").select("*", { count: "exact", head: true }).eq("reported_user_id", profile.id).eq("status", "pending").catch(() => ({ count: 0 })),              </select>

        ]);            </div>

                  </div>

        return { 

          ...profile,           <div className="overflow-x-auto">

          listing_count: listingResult.count || 0,             <table className="w-full">

          report_count: (reportResult as any).count || 0               <thead className="bg-gray-50">

        };                <tr>

      }));                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>

                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>

      setUsers(usersWithStats);                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Listings</th>

      setError(null);                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reports</th>

    } catch (err) {                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warnings</th>

      console.error("Error:", err);                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>

      setError("Failed to fetch users");                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>

    } finally {                </tr>

      setRefreshing(false);              </thead>

    }              <tbody className="bg-white divide-y divide-gray-200">

  }                {filteredUsers.map((user) => (

                  <tr key={user.id} className="hover:bg-gray-50">

  function filterUsers() {                    <td className="px-6 py-4 whitespace-nowrap">

    let filtered = [...users];                      <div className="flex items-center">

    if (searchQuery) {                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">

      const query = searchQuery.toLowerCase();                          {user.avatar_url ? (<img src={user.avatar_url} alt="" className="h-full w-full object-cover" />) : (<Users className="h-5 w-5 text-gray-500" />)}

      filtered = filtered.filter((u) =>                         </div>

        u.username?.toLowerCase().includes(query) ||                         <div className="ml-4">

        u.email?.toLowerCase().includes(query) ||                           <div className="text-sm font-medium text-gray-900">{user.username || "No username"}</div>

        u.full_name?.toLowerCase().includes(query) ||                          <div className="text-sm text-gray-500">{user.email}</div>

        u.name?.toLowerCase().includes(query)                        </div>

      );                      </div>

    }                    </td>

    switch (filterStatus) {                    <td className="px-6 py-4 whitespace-nowrap">

      case "active":                       {user.is_banned ? (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><Ban className="h-3 w-3 mr-1" />Banned</span>) : user.is_suspended ? (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Suspended</span>) : (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</span>)}

        filtered = filtered.filter((u) => !u.is_banned && !u.is_suspended);                     </td>

        break;                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.listing_count}</td>

      case "banned":                     <td className="px-6 py-4 whitespace-nowrap">{user.report_count > 0 ? (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"><AlertTriangle className="h-3 w-3 mr-1" />{user.report_count}</span>) : (<span className="text-sm text-gray-500">0</span>)}</td>

        filtered = filtered.filter((u) => u.is_banned);                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.warning_count || 0}</td>

        break;                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>

      case "suspended":                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">

        filtered = filtered.filter((u) => u.is_suspended && !u.is_banned);                       <div className="flex items-center justify-end gap-2">

        break;                        <button onClick={() => { setSelectedUser(user); fetchModerationHistory(user.id); }} className="text-gray-600 hover:text-gray-900" title="View History"><Eye className="h-4 w-4" /></button>

      case "warned":                         {user.is_banned ? (<button onClick={() => openActionModal(user, "unban")} className="text-green-600 hover:text-green-900" title="Unban User"><CheckCircle className="h-4 w-4" /></button>) : (<><button onClick={() => openActionModal(user, "warn")} className="text-yellow-600 hover:text-yellow-900" title="Issue Warning"><AlertTriangle className="h-4 w-4" /></button><button onClick={() => openActionModal(user, "suspend")} className="text-orange-600 hover:text-orange-900" title="Suspend User"><Clock className="h-4 w-4" /></button><button onClick={() => openActionModal(user, "ban")} className="text-red-600 hover:text-red-900" title="Ban User"><Ban className="h-4 w-4" /></button></>)}

        filtered = filtered.filter((u) => (u.warning_count || 0) > 0);                       </div>

        break;                    </td>

      case "reported":                   </tr>

        filtered = filtered.filter((u) => u.report_count > 0);                 ))}

        break;              </tbody>

    }            </table>

    setFilteredUsers(filtered);          </div>

  }

          {filteredUsers.length === 0 && (<div className="text-center py-12"><Users className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3><p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter.</p></div>)}

  async function handleModerationAction() {        </div>

    if (!selectedUser || !actionType) return;      </div>

    const token = await getAccessToken();

    if (!token) {      {showActionModal && selectedUser && actionType && (

      setError("Session expired. Please refresh the page.");        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

      return;          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">

    }            <div className="p-6">

                  <h2 className="text-xl font-bold text-gray-900 mb-4">{actionType === "ban" && "Ban User"}{actionType === "suspend" && "Suspend User"}{actionType === "warn" && "Issue Warning"}{actionType === "unban" && "Unban User"}</h2>

    setProcessing(true);              <p className="text-gray-600 mb-4">{actionType === "ban" && `Are you sure you want to permanently ban ${selectedUser.username}?`}{actionType === "suspend" && `Suspend ${selectedUser.username} temporarily.`}{actionType === "warn" && `Issue a warning to ${selectedUser.username}.`}{actionType === "unban" && `Remove the ban from ${selectedUser.username}?`}</p>

    setError(null);              {actionType === "suspend" && (<div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Suspension Duration</label><select value={suspendDays} onChange={(e) => setSuspendDays(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"><option value={1}>1 day</option><option value={3}>3 days</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></div>)}

                  {actionType !== "unban" && (<div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Reason</label><textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="Enter reason for this action..." className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 h-24 resize-none" /></div>)}

    try {              <div className="flex justify-end gap-3">

      const response = await fetch("/api/admin/moderation", {                <button onClick={closeActionModal} className="px-4 py-2 text-gray-700 hover:text-gray-900" disabled={processing}>Cancel</button>

        method: "POST",                <button onClick={handleModerationAction} disabled={processing || (actionType !== "unban" && !actionReason)} className={`px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 ${actionType === "ban" ? "bg-red-600 hover:bg-red-700" : actionType === "suspend" ? "bg-orange-600 hover:bg-orange-700" : actionType === "warn" ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}`}>{processing ? "Processing..." : "Confirm"}</button>

        headers: {              </div>

          "Content-Type": "application/json",            </div>

          Authorization: `Bearer ${token}`,          </div>

        },        </div>

        body: JSON.stringify({      )}

          userId: selectedUser.id,

          action: actionType,      {showHistoryModal && selectedUser && (

          reason: actionReason,        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          suspendDays: actionType === "suspend" ? suspendDays : undefined,          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">

        }),            <div className="p-6 border-b">

      });              <div className="flex justify-between items-center">

                      <h2 className="text-xl font-bold text-gray-900">Moderation History: {selectedUser.username}</h2>

      const data = await response.json();                <button onClick={() => { setShowHistoryModal(false); setSelectedUser(null); }} className="text-gray-400 hover:text-gray-600"><XCircle className="h-6 w-6" /></button>

                    </div>

      if (!response.ok) {            </div>

        throw new Error(data.error || data.details || "Failed to perform action");            <div className="p-6 overflow-y-auto max-h-96">

      }              {moderationHistory.length > 0 ? (

                      <div className="space-y-4">

      setSuccessMessage(`Successfully ${actionType === "warn" ? "issued warning to" : actionType + "ned"} ${selectedUser.name || selectedUser.username || selectedUser.email}`);                  {moderationHistory.map((log) => (

      await fetchUsers();                    <div key={log.id} className="border-l-4 border-gray-300 pl-4 py-2">

      closeActionModal();                      <div className="flex items-center gap-2">

    } catch (err) {                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${log.action === "ban" ? "bg-red-100 text-red-800" : log.action === "suspend" ? "bg-orange-100 text-orange-800" : log.action === "warn" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>{log.action.toUpperCase()}</span>

      console.error("Error:", err);                        <span className="text-sm text-gray-500">by {log.admin_username}</span>

      setError(err instanceof Error ? err.message : "An error occurred");                      </div>

    } finally {                      <p className="text-gray-700 mt-1">{log.reason}</p>

      setProcessing(false);                      <p className="text-xs text-gray-500 mt-1">{new Date(log.created_at).toLocaleString()}</p>

    }                    </div>

  }                  ))}

                </div>

  async function fetchModerationHistory(userId: string) {              ) : (<p className="text-gray-500 text-center py-8">No moderation history found.</p>)}

    try {            </div>

      const token = await getAccessToken();          </div>

      if (!token) return;        </div>

            )}

      const response = await fetch(`/api/admin/moderation?userId=${userId}`, {    </div>

        headers: { Authorization: `Bearer ${token}` },  );

      });}

      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch history");
      }
      
      const data = await response.json();
      setModerationHistory(data.logs || []);
    } catch (err) {
      console.error("Error:", err);
      // Don't show error for history fetch - just show empty
      setModerationHistory([]);
    }
  }

  function openActionModal(user: User, action: ActionType) { 
    setSelectedUser(user); 
    setActionType(action); 
    setActionReason(""); 
    setSuspendDays(7); 
    setShowActionModal(true);
    setError(null);
  }
  
  function closeActionModal() { 
    setShowActionModal(false); 
    setSelectedUser(null); 
    setActionType(null); 
    setActionReason(""); 
    setError(null);
  }

  function openUserDetail(user: User) {
    setSelectedUser(user);
    setShowUserDetailModal(true);
    fetchModerationHistory(user.id);
  }

  function getUserDisplayName(user: User) {
    return user.name || user.full_name || user.username || user.email?.split("@")[0] || "Unknown";
  }

  function getStatusBadge(user: User) {
    if (user.is_banned) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <Ban className="h-3 w-3" />
          Banned
        </span>
      );
    }
    if (user.is_suspended) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <Clock className="h-3 w-3" />
          Suspended
          {user.suspended_until && (
            <span className="text-[10px]">
              until {new Date(user.suspended_until).toLocaleDateString()}
            </span>
          )}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3" />
        Active
      </span>
    );
  }

  if (loading) { 
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    ); 
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <Link 
              href="/admin/dashboard" 
              className="text-yellow-600 hover:text-yellow-700 flex items-center gap-1 mb-2 text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="h-8 w-8 text-yellow-500" />
              User Management
            </h1>
            <p className="text-gray-600 mt-1">{users.length} total users • {filteredUsers.length} shown</p>
          </div>
          <button
            onClick={() => fetchUsers()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by name, email, or username..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500" 
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)} 
                className="border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white"
              >
                <option value="all">All Users ({users.length})</option>
                <option value="active">Active ({users.filter(u => !u.is_banned && !u.is_suspended).length})</option>
                <option value="banned">Banned ({users.filter(u => u.is_banned).length})</option>
                <option value="suspended">Suspended ({users.filter(u => u.is_suspended && !u.is_banned).length})</option>
                <option value="warned">With Warnings ({users.filter(u => (u.warning_count || 0) > 0).length})</option>
                <option value="reported">With Reports ({users.filter(u => u.report_count > 0).length})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Listings</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Reports</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Warnings</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-white font-semibold text-sm">
                              {getUserDisplayName(user).charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <button 
                            onClick={() => openUserDetail(user)}
                            className="text-sm font-medium text-gray-900 hover:text-yellow-600 truncate block text-left"
                          >
                            {getUserDisplayName(user)}
                          </button>
                          <div className="text-sm text-gray-500 truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(user)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                        <Package className="h-4 w-4" />
                        {user.listing_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.report_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <Flag className="h-3 w-3" />
                          {user.report_count}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(user.warning_count || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          <AlertTriangle className="h-3 w-3" />
                          {user.warning_count}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => openUserDetail(user)} 
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" 
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {user.is_banned ? (
                          <button 
                            onClick={() => openActionModal(user, "unban")} 
                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors" 
                            title="Unban User"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        ) : user.is_suspended ? (
                          <button 
                            onClick={() => openActionModal(user, "unsuspend")} 
                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors" 
                            title="Remove Suspension"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={() => openActionModal(user, "warn")} 
                              className="p-2 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 rounded-lg transition-colors" 
                              title="Issue Warning"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => openActionModal(user, "suspend")} 
                              className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors" 
                              title="Suspend User"
                            >
                              <Clock className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => openActionModal(user, "ban")} 
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" 
                              title="Ban User"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        
                        {(user.warning_count || 0) > 0 && !user.is_banned && (
                          <button 
                            onClick={() => openActionModal(user, "clear_warnings")} 
                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors" 
                            title="Clear Warnings"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-16">
              <Users className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No users found</h3>
              <p className="mt-2 text-gray-500">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {showActionModal && selectedUser && actionType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className={`p-6 ${actionType === "ban" ? "bg-red-50" : actionType === "suspend" ? "bg-orange-50" : actionType === "warn" ? "bg-yellow-50" : "bg-green-50"}`}>
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = ACTION_CONFIG[actionType].icon;
                  return <Icon className={`h-6 w-6 ${ACTION_CONFIG[actionType].color}`} />;
                })()}
                <h2 className="text-xl font-bold text-gray-900">{ACTION_CONFIG[actionType].title}</h2>
              </div>
              <p className="mt-2 text-sm text-gray-600">{ACTION_CONFIG[actionType].description}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="h-full w-full object-cover rounded-full" />
                  ) : (
                    <span className="text-white font-semibold">
                      {getUserDisplayName(selectedUser).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{getUserDisplayName(selectedUser)}</p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>

              {actionType === "suspend" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Suspension Duration</label>
                  <select 
                    value={suspendDays} 
                    onChange={(e) => setSuspendDays(Number(e.target.value))} 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value={1}>1 day</option>
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              )}
              
              {!["unban", "unsuspend", "clear_warnings"].includes(actionType) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                  <div className="space-y-2">
                    <select
                      onChange={(e) => e.target.value && setActionReason(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-600"
                      defaultValue=""
                    >
                      <option value="" disabled>Select a common reason...</option>
                      {COMMON_REASONS.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                    <textarea 
                      value={actionReason} 
                      onChange={(e) => setActionReason(e.target.value)} 
                      placeholder="Or enter a custom reason..." 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 h-24 resize-none" 
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={closeActionModal} 
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors" 
                  disabled={processing}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleModerationAction} 
                  disabled={processing || (!["unban", "unsuspend", "clear_warnings"].includes(actionType) && !actionReason)} 
                  className={`flex-1 px-4 py-2.5 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${ACTION_CONFIG[actionType].bgColor}`}
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    ACTION_CONFIG[actionType].confirmText
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="h-full w-full object-cover rounded-full" />
                  ) : (
                    <span className="text-white font-bold text-xl">
                      {getUserDisplayName(selectedUser).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{getUserDisplayName(selectedUser)}</h2>
                  <p className="text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowUserDetailModal(false); setSelectedUser(null); }} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedUser.listing_count}</p>
                  <p className="text-sm text-gray-500">Listings</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedUser.warning_count || 0}</p>
                  <p className="text-sm text-gray-500">Warnings</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedUser.report_count}</p>
                  <p className="text-sm text-gray-500">Reports</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  {getStatusBadge(selectedUser)}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Joined {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                </div>
                {selectedUser.ban_reason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800">Ban Reason:</p>
                    <p className="text-sm text-red-700">{selectedUser.ban_reason}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Moderation History</h3>
                {moderationHistory.length > 0 ? (
                  <div className="space-y-3">
                    {moderationHistory.map((log) => (
                      <div key={log.id} className="border-l-4 border-gray-300 pl-4 py-2 bg-gray-50 rounded-r-lg">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            log.action === "ban" ? "bg-red-100 text-red-800" : 
                            log.action === "suspend" ? "bg-orange-100 text-orange-800" : 
                            log.action === "warn" ? "bg-yellow-100 text-yellow-800" : 
                            "bg-green-100 text-green-800"
                          }`}>
                            {log.action.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">by {log.admin_name}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        {log.reason && <p className="text-sm text-gray-700 mt-1">{log.reason}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No moderation history</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-2 justify-end">
              {!selectedUser.is_banned && !selectedUser.is_suspended && (
                <>
                  <button
                    onClick={() => { setShowUserDetailModal(false); openActionModal(selectedUser, "warn"); }}
                    className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-medium hover:bg-yellow-200 transition-colors"
                  >
                    Issue Warning
                  </button>
                  <button
                    onClick={() => { setShowUserDetailModal(false); openActionModal(selectedUser, "suspend"); }}
                    className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200 transition-colors"
                  >
                    Suspend
                  </button>
                  <button
                    onClick={() => { setShowUserDetailModal(false); openActionModal(selectedUser, "ban"); }}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
                  >
                    Ban
                  </button>
                </>
              )}
              {selectedUser.is_banned && (
                <button
                  onClick={() => { setShowUserDetailModal(false); openActionModal(selectedUser, "unban"); }}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors"
                >
                  Unban User
                </button>
              )}
              {selectedUser.is_suspended && !selectedUser.is_banned && (
                <button
                  onClick={() => { setShowUserDetailModal(false); openActionModal(selectedUser, "unsuspend"); }}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors"
                >
                  Remove Suspension
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
