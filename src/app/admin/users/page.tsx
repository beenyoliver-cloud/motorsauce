"use client";"use client";"use client";



import { useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import {import { useEffect, useState } from "react";import { useEffect, useState } from "react";

  Search, User, Mail, ShoppingBag, Flag, Eye, Ban, CheckCircle,

  Clock, AlertTriangle, Shield, XCircle, Loader2, History, MessageSquare, AlertCircleimport { useRouter, useSearchParams } from "next/navigation";import { useRouter } from "next/navigation";

} from "lucide-react";

import { supabaseBrowser } from "@/lib/supabase";import { import { Search, User, Mail, Calendar, AlertCircle, MessageSquare, ShoppingBag, Flag, Eye, Ban, CheckCircle } from "lucide-react";

import { AdminNav, AdminBreadcrumb } from "@/components/AdminNav";

  Search, User, Mail, Calendar, AlertCircle, MessageSquare, ShoppingBag, import { supabaseBrowser } from "@/lib/supabase";

interface UserRecord {

  id: string;  Flag, Eye, Ban, CheckCircle, Clock, AlertTriangle, Shield, XCircle,import { AdminNav, AdminBreadcrumb } from "@/components/AdminNav";

  email: string;

  name: string;  Loader2, History

  created_at: string;

  avatar_url?: string;} from "lucide-react";interface UserRecord {

  total_listings: number;

  total_reports: number;import { supabaseBrowser } from "@/lib/supabase";  id: string;

  messages_24h: number;

  is_banned?: boolean;import { AdminNav, AdminBreadcrumb } from "@/components/AdminNav";  email: string;

  is_suspended?: boolean;

  suspended_until?: string;  name: string;

  ban_reason?: string;

  warning_count?: number;interface UserRecord {  created_at: string;

}

  id: string;  avatar_url?: string;

export default function AdminUsersPage() {

  const [users, setUsers] = useState<UserRecord[]>([]);  email: string;  bio?: string;

  const [filteredUsers, setFilteredUsers] = useState<UserRecord[]>([]);

  const [loading, setLoading] = useState(true);  name: string;  location?: string;

  const [searchQuery, setSearchQuery] = useState("");

  const [statusFilter, setStatusFilter] = useState<string>("all");  created_at: string;  total_listings: number;

  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  const [moderating, setModerating] = useState(false);  avatar_url?: string;  total_sales: number;

  const [showModerationModal, setShowModerationModal] = useState(false);

  const [moderationAction, setModerationAction] = useState("");  bio?: string;  total_reports: number;

  const [moderationReason, setModerationReason] = useState("");

  const [suspensionDays, setSuspensionDays] = useState(7);  location?: string;  pending_reports: number;

  const router = useRouter();

  const searchParams = useSearchParams();  total_listings: number;  messages_24h: number;

  const supabase = supabaseBrowser();

  total_sales: number;  last_active?: string;

  useEffect(() => {

    const filter = searchParams.get("filter");  total_reports: number;}

    if (filter) setStatusFilter(filter);

    const search = searchParams.get("search");  pending_reports: number;

    if (search) setSearchQuery(search);

    checkAdminAndFetchUsers();  messages_24h: number;export default function AdminUsersPage() {

  }, []);

  last_active?: string;  const [users, setUsers] = useState<UserRecord[]>([]);

  useEffect(() => {

    let filtered = users;  is_banned?: boolean;  const [filteredUsers, setFilteredUsers] = useState<UserRecord[]>([]);

    if (statusFilter === "banned") filtered = filtered.filter(u => u.is_banned);

    else if (statusFilter === "suspended") filtered = filtered.filter(u => u.is_suspended && !u.is_banned);  is_suspended?: boolean;  const [loading, setLoading] = useState(true);

    else if (statusFilter === "reported") filtered = filtered.filter(u => u.total_reports > 0);

    else if (statusFilter === "active") filtered = filtered.filter(u => !u.is_banned && !u.is_suspended);  suspended_until?: string;  const [searchQuery, setSearchQuery] = useState("");



    if (searchQuery.trim()) {  ban_reason?: string;  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

      const query = searchQuery.toLowerCase();

      filtered = filtered.filter(u =>  warning_count?: number;  const [userMessages, setUserMessages] = useState<any[]>([]);

        u.name?.toLowerCase().includes(query) ||

        u.email?.toLowerCase().includes(query) ||}  const [userReports, setUserReports] = useState<any[]>([]);

        u.id?.toLowerCase().includes(query)

      );  const [loadingDetails, setLoadingDetails] = useState(false);

    }

    setFilteredUsers(filtered);export default function AdminUsersPage() {  const router = useRouter();

  }, [searchQuery, statusFilter, users]);

  const [users, setUsers] = useState<UserRecord[]>([]);  const supabase = supabaseBrowser();

  const checkAdminAndFetchUsers = async () => {

    try {  const [filteredUsers, setFilteredUsers] = useState<UserRecord[]>([]);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) { router.push("/auth/login"); return; }  const [loading, setLoading] = useState(true);  useEffect(() => {



      const adminRes = await fetch("/api/is-admin", {  const [searchQuery, setSearchQuery] = useState("");    checkAdminAndFetchUsers();

        headers: { Authorization: `Bearer ${session.access_token}` },

      });  const [statusFilter, setStatusFilter] = useState<string>("all");  }, []);

      const { isAdmin } = await adminRes.json();

      if (!isAdmin) { router.push("/"); return; }  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);



      await fetchUsers();  const [userMessages, setUserMessages] = useState<any[]>([]);  useEffect(() => {

    } catch (error) {

      console.error("Error:", error);  const [userReports, setUserReports] = useState<any[]>([]);    if (searchQuery.trim() === "") {

      setLoading(false);

    }  const [moderationLogs, setModerationLogs] = useState<any[]>([]);      setFilteredUsers(users);

  };

  const [loadingDetails, setLoadingDetails] = useState(false);    } else {

  const fetchUsers = async () => {

    setLoading(true);  const [moderating, setModerating] = useState(false);      const query = searchQuery.toLowerCase();

    const { data: profiles } = await supabase

      .from("profiles")  const [showModerationModal, setShowModerationModal] = useState(false);      setFilteredUsers(

      .select("*")

      .order("created_at", { ascending: false });  const [moderationAction, setModerationAction] = useState<string>("");        users.filter(



    if (profiles) {  const [moderationReason, setModerationReason] = useState("");          (user) =>

      const usersWithStats = await Promise.all(

        profiles.map(async (profile) => {  const [suspensionDays, setSuspensionDays] = useState(7);            user.name?.toLowerCase().includes(query) ||

          const [listingsCount, reportsCount] = await Promise.all([

            supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", profile.id),  const router = useRouter();            user.email?.toLowerCase().includes(query) ||

            supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("reported_user_id", profile.id),

          ]);  const searchParams = useSearchParams();            user.id?.toLowerCase().includes(query)

          return {

            id: profile.id,  const supabase = supabaseBrowser();        )

            email: profile.email,

            name: profile.name,      );

            created_at: profile.created_at,

            avatar_url: profile.avatar_url,  useEffect(() => {    }

            total_listings: listingsCount.count || 0,

            total_reports: reportsCount.count || 0,    // Check for filter in URL  }, [searchQuery, users]);

            messages_24h: 0,

            is_banned: profile.is_banned || false,    const filter = searchParams.get("filter");

            is_suspended: profile.is_suspended || false,

            suspended_until: profile.suspended_until,    if (filter) {  const checkAdminAndFetchUsers = async () => {

            ban_reason: profile.ban_reason,

            warning_count: profile.warning_count || 0,      setStatusFilter(filter);    try {

          };

        })    }      const {

      );

      setUsers(usersWithStats);    const search = searchParams.get("search");        data: { user },

      setFilteredUsers(usersWithStats);

    }    if (search) {      } = await supabase.auth.getUser();

    setLoading(false);

  };      setSearchQuery(search);      if (!user) {



  const handleModeration = async () => {    }        router.push("/auth/login?next=/admin/users");

    if (!selectedUser || !moderationAction) return;

    setModerating(true);    checkAdminAndFetchUsers();        return;

    try {

      const { data: { session } } = await supabase.auth.getSession();  }, []);      }

      if (!session?.access_token) return;



      const body: any = { action: moderationAction, userId: selectedUser.id, reason: moderationReason };

      if (moderationAction === "suspend") body.duration = suspensionDays;  useEffect(() => {      // Check admin status using API endpoint (bypasses RLS)



      const res = await fetch("/api/admin/moderation", {    let filtered = users;      const { data: { session } } = await supabase.auth.getSession();

        method: "POST",

        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },          if (!session?.access_token) {

        body: JSON.stringify(body),

      });    // Apply status filter        router.push("/auth/login");



      if (res.ok) {    if (statusFilter === "banned") {        return;

        await fetchUsers();

        setShowModerationModal(false);      filtered = filtered.filter(u => u.is_banned);      }

        setSelectedUser(null);

      } else {    } else if (statusFilter === "suspended") {

        const error = await res.json();

        alert(error.error || "Failed");      filtered = filtered.filter(u => u.is_suspended && !u.is_banned);      const adminRes = await fetch("/api/is-admin", {

      }

    } catch (error) {    } else if (statusFilter === "reported") {        headers: {

      alert("Error occurred");

    } finally {      filtered = filtered.filter(u => u.total_reports > 0);          Authorization: `Bearer ${session.access_token}`,

      setModerating(false);

    }    } else if (statusFilter === "active") {        },

  };

      filtered = filtered.filter(u => !u.is_banned && !u.is_suspended);      });

  const openModerationModal = (action: string) => {

    setModerationAction(action);    }

    setModerationReason("");

    setSuspensionDays(7);          if (!adminRes.ok) {

    setShowModerationModal(true);

  };    // Apply search        router.push("/");



  const getRiskLevel = (user: UserRecord) => {    if (searchQuery.trim()) {        return;

    if (user.is_banned) return { level: "banned", color: "text-red-800 bg-red-100 border-red-300" };

    if (user.is_suspended) return { level: "suspended", color: "text-orange-800 bg-orange-100 border-orange-300" };      const query = searchQuery.toLowerCase();      }

    if (user.total_reports > 0) return { level: "reported", color: "text-yellow-800 bg-yellow-100 border-yellow-300" };

    return { level: "good", color: "text-green-600 bg-green-50 border-green-300" };      filtered = filtered.filter(

  };

        (user) =>      const { isAdmin } = await adminRes.json();

  if (loading) {

    return (          user.name?.toLowerCase().includes(query) ||      if (!isAdmin) {

      <div className="max-w-7xl mx-auto p-8">

        <AdminBreadcrumb current="Users" />          user.email?.toLowerCase().includes(query) ||        router.push("/");

        <AdminNav />

        <div className="text-center py-8 text-gray-600">Loading users...</div>          user.id?.toLowerCase().includes(query)        return;

      </div>

    );      );      }

  }

    }

  return (

    <div className="max-w-7xl mx-auto p-8">          await fetchUsers();

      <AdminBreadcrumb current="Users" />

      <AdminNav />    setFilteredUsers(filtered);    } catch (error) {



      <div className="mb-6">  }, [searchQuery, statusFilter, users]);      console.error("Error checking admin status:", error);

        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>

        <p className="text-gray-600">Search, manage, and moderate users</p>      setLoading(false);

      </div>

  const checkAdminAndFetchUsers = async () => {    }

      <div className="flex flex-col md:flex-row gap-4 mb-6">

        <div className="flex-1 relative">    try {  };

          <Search className="absolute left-3 top-3 text-gray-400" size={20} />

          <input      const { data: { user } } = await supabase.auth.getUser();

            type="text"

            placeholder="Search by name, email, or ID..."      if (!user) {  const fetchUsers = async () => {

            value={searchQuery}

            onChange={(e) => setSearchQuery(e.target.value)}        router.push("/auth/login?next=/admin/users");    try {

            className="w-full pl-10 pr-4 py-3 border rounded-lg text-gray-900"

          />        return;      setLoading(true);

        </div>

        <select      }

          value={statusFilter}

          onChange={(e) => setStatusFilter(e.target.value)}      // Get all profiles with aggregated data

          className="px-4 py-3 border rounded-lg text-gray-900"

        >      const { data: { session } } = await supabase.auth.getSession();      const { data, error } = await supabase.rpc("get_users_admin_view");

          <option value="all">All Users</option>

          <option value="active">Active</option>      if (!session?.access_token) {

          <option value="banned">Banned</option>

          <option value="suspended">Suspended</option>        router.push("/auth/login");      if (error) {

          <option value="reported">With Reports</option>

        </select>        return;        console.error("Error fetching users:", error);

      </div>

      }        // Fallback to basic query if RPC doesn't exist

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

        <div className="bg-white p-4 rounded-lg border"><div className="text-sm text-gray-600">Total</div><div className="text-2xl font-bold">{users.length}</div></div>        const { data: profiles } = await supabase

        <div className="bg-white p-4 rounded-lg border"><div className="text-sm text-gray-600">Banned</div><div className="text-2xl font-bold text-red-600">{users.filter(u => u.is_banned).length}</div></div>

        <div className="bg-white p-4 rounded-lg border"><div className="text-sm text-gray-600">Suspended</div><div className="text-2xl font-bold text-orange-600">{users.filter(u => u.is_suspended).length}</div></div>      const adminRes = await fetch("/api/is-admin", {          .from("profiles")

        <div className="bg-white p-4 rounded-lg border"><div className="text-sm text-gray-600">Reported</div><div className="text-2xl font-bold text-yellow-600">{users.filter(u => u.total_reports > 0).length}</div></div>

      </div>        headers: { Authorization: `Bearer ${session.access_token}` },          .select("*")



      <div className="bg-white rounded-lg border overflow-hidden">      });          .order("created_at", { ascending: false });

        <table className="w-full">

          <thead className="bg-gray-50 border-b">

            <tr>

              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>      if (!adminRes.ok) {        if (profiles) {

              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>

              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Listings</th>        router.push("/");          const usersWithStats = await Promise.all(

              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reports</th>

              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>        return;            profiles.map(async (profile) => {

              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>

            </tr>      }              // Get counts individually

          </thead>

          <tbody className="divide-y">              const [listingsCount, reportsCount, messagesCount] = await Promise.all([

            {filteredUsers.map((user) => {

              const risk = getRiskLevel(user);      const { isAdmin } = await adminRes.json();                supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", profile.id),

              return (

                <tr key={user.id} className={user.is_banned ? "bg-red-50" : user.is_suspended ? "bg-orange-50" : "hover:bg-gray-50"}>      if (!isAdmin) {                supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("reported_user_id", profile.id),

                  <td className="px-4 py-3">

                    <div className="flex items-center gap-3">        router.push("/");                supabase

                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">

                        <User size={20} className="text-gray-500" />        return;                  .from("messages")

                      </div>

                      <div>      }                  .select("id", { count: "exact", head: true })

                        <div className="font-medium text-gray-900">{user.name || "Unnamed"}</div>

                        <div className="text-xs text-gray-500">{new Date(user.created_at).toLocaleDateString()}</div>                  .eq("from_user_id", profile.id)

                      </div>

                    </div>      await fetchUsers();                  .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

                  </td>

                  <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>    } catch (error) {              ]);

                  <td className="px-4 py-3 text-center"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">{user.total_listings}</span></td>

                  <td className="px-4 py-3 text-center">{user.total_reports > 0 ? <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-sm">{user.total_reports}</span> : <span className="text-gray-400">0</span>}</td>      console.error("Error checking admin status:", error);

                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium border ${risk.color}`}>{risk.level.toUpperCase()}</span></td>

                  <td className="px-4 py-3 text-center">      setLoading(false);              return {

                    <button onClick={() => setSelectedUser(user)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Manage</button>

                  </td>    }                id: profile.id,

                </tr>

              );  };                email: profile.email,

            })}

          </tbody>                name: profile.name,

        </table>

      </div>  const fetchUsers = async () => {                created_at: profile.created_at,



      {selectedUser && (    try {                avatar_url: profile.avatar_url,

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">      setLoading(true);                bio: profile.bio,

            <div className="flex justify-between items-start mb-4">

              <div>                location: profile.location,

                <h2 className="text-xl font-bold text-gray-900">{selectedUser.name || "Unnamed User"}</h2>

                <p className="text-gray-600">{selectedUser.email}</p>      // Fallback to basic query                total_listings: listingsCount.count || 0,

                <div className="flex gap-2 mt-2">

                  {selectedUser.is_banned && <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">BANNED</span>}      const { data: profiles } = await supabase                total_sales: 0,

                  {selectedUser.is_suspended && <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">SUSPENDED</span>}

                </div>        .from("profiles")                total_reports: reportsCount.count || 0,

              </div>

              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>        .select("*")                pending_reports: 0,

            </div>

        .order("created_at", { ascending: false });                messages_24h: messagesCount.count || 0,

            <div className="bg-gray-50 rounded-lg p-4 mb-4">

              <h3 className="font-bold text-gray-900 mb-3">Moderation Actions</h3>              };

              <div className="flex flex-wrap gap-2">

                {!selectedUser.is_banned && (      if (profiles) {            })

                  <>

                    <button onClick={() => openModerationModal("warn")} className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">Warn</button>        const usersWithStats = await Promise.all(          );

                    {!selectedUser.is_suspended && <button onClick={() => openModerationModal("suspend")} className="px-3 py-2 bg-orange-100 text-orange-800 rounded-lg text-sm">Suspend</button>}

                    {selectedUser.is_suspended && <button onClick={() => openModerationModal("unsuspend")} className="px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm">Unsuspend</button>}          profiles.map(async (profile) => {          setUsers(usersWithStats);

                    <button onClick={() => openModerationModal("ban")} className="px-3 py-2 bg-red-100 text-red-800 rounded-lg text-sm">Ban</button>

                  </>            const [listingsCount, reportsCount, messagesCount] = await Promise.all([          setFilteredUsers(usersWithStats);

                )}

                {selectedUser.is_banned && <button onClick={() => openModerationModal("unban")} className="px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm">Unban</button>}              supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", profile.id),        }

              </div>

            </div>              supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("reported_user_id", profile.id),      } else {



            <div className="grid grid-cols-3 gap-4">              supabase        setUsers(data || []);

              <div className="p-3 bg-blue-50 rounded-lg text-center"><div className="text-sm text-gray-600">Listings</div><div className="text-xl font-bold text-blue-600">{selectedUser.total_listings}</div></div>

              <div className="p-3 bg-red-50 rounded-lg text-center"><div className="text-sm text-gray-600">Reports</div><div className="text-xl font-bold text-red-600">{selectedUser.total_reports}</div></div>                .from("messages")        setFilteredUsers(data || []);

              <div className="p-3 bg-yellow-50 rounded-lg text-center"><div className="text-sm text-gray-600">Warnings</div><div className="text-xl font-bold text-yellow-600">{selectedUser.warning_count || 0}</div></div>

            </div>                .select("id", { count: "exact", head: true })      }

          </div>

        </div>                .eq("from_user_id", profile.id)    } catch (error) {

      )}

                .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),      console.error("Error in fetchUsers:", error);

      {showModerationModal && selectedUser && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">            ]);    } finally {

          <div className="bg-white rounded-lg max-w-md w-full p-6">

            <h3 className="text-xl font-bold text-gray-900 mb-4">{moderationAction.charAt(0).toUpperCase() + moderationAction.slice(1)} User</h3>      setLoading(false);

            <p className="text-gray-600 mb-4">Confirm action on {selectedUser.name || selectedUser.email}?</p>

            return {    }

            {moderationAction === "suspend" && (

              <div className="mb-4">              id: profile.id,  };

                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>

                <select value={suspensionDays} onChange={(e) => setSuspensionDays(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg">              email: profile.email,

                  <option value={1}>1 day</option>

                  <option value={7}>7 days</option>              name: profile.name,  const viewUserDetails = async (user: UserRecord) => {

                  <option value={30}>30 days</option>

                  <option value={90}>90 days</option>              created_at: profile.created_at,    setSelectedUser(user);

                </select>

              </div>              avatar_url: profile.avatar_url,    setLoadingDetails(true);

            )}

              bio: profile.bio,

            {["ban", "suspend", "warn"].includes(moderationAction) && (

              <div className="mb-4">              location: profile.location,    try {

                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>

                <textarea value={moderationReason} onChange={(e) => setModerationReason(e.target.value)} placeholder="Enter reason..." className="w-full px-3 py-2 border rounded-lg h-20" />              total_listings: listingsCount.count || 0,      // Fetch recent messages (last 24 hours)

              </div>

            )}              total_sales: 0,      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();



            <div className="flex gap-3">              total_reports: reportsCount.count || 0,      const { data: messages } = await supabase

              <button onClick={() => setShowModerationModal(false)} className="flex-1 px-4 py-2 border text-gray-700 rounded-lg">Cancel</button>

              <button onClick={handleModeration} disabled={moderating} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg flex items-center justify-center gap-2">              pending_reports: 0,        .from("messages")

                {moderating ? <Loader2 size={16} className="animate-spin" /> : null}

                Confirm              messages_24h: messagesCount.count || 0,        .select(

              </button>

            </div>              is_banned: profile.is_banned || false,          `

          </div>

        </div>              is_suspended: profile.is_suspended || false,          id,

      )}

    </div>              suspended_until: profile.suspended_until,          message_text,

  );

}              ban_reason: profile.ban_reason,          created_at,


              warning_count: profile.warning_count || 0,          thread_id,

            };          threads!inner(

          })            listing_ref,

        );            participant_1_id,

        setUsers(usersWithStats);            participant_2_id

        setFilteredUsers(usersWithStats);          )

      }        `

    } catch (error) {        )

      console.error("Error in fetchUsers:", error);        .eq("from_user_id", user.id)

    } finally {        .gte("created_at", twentyFourHoursAgo)

      setLoading(false);        .order("created_at", { ascending: false })

    }        .limit(50);

  };

      setUserMessages(messages || []);

  const viewUserDetails = async (user: UserRecord) => {

    setSelectedUser(user);      // Fetch reports about this user

    setLoadingDetails(true);      const { data: reports } = await supabase

        .from("user_reports")

    try {        .select(

      // Fetch recent messages          `

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();          id,

      const { data: messages } = await supabase          reason,

        .from("messages")          details,

        .select("id, message_text, created_at, thread_id")          status,

        .eq("from_user_id", user.id)          created_at,

        .gte("created_at", twentyFourHoursAgo)          reporter_id,

        .order("created_at", { ascending: false })          profiles!user_reports_reporter_id_fkey(name, email)

        .limit(50);        `

        )

      setUserMessages(messages || []);        .eq("reported_user_id", user.id)

        .order("created_at", { ascending: false });

      // Fetch reports

      const { data: reports } = await supabase      setUserReports(reports || []);

        .from("user_reports")    } catch (error) {

        .select("id, reason, details, status, created_at, reporter_id")      console.error("Error fetching user details:", error);

        .eq("reported_user_id", user.id)    } finally {

        .order("created_at", { ascending: false });      setLoadingDetails(false);

    }

      setUserReports(reports || []);  };



      // Fetch moderation logs  const getRiskLevel = (user: UserRecord) => {

      const { data: { session } } = await supabase.auth.getSession();    if (user.pending_reports > 2) return { level: "high", color: "text-red-600 bg-red-50 border-red-300" };

      if (session?.access_token) {    if (user.total_reports > 0) return { level: "medium", color: "text-orange-600 bg-orange-50 border-orange-300" };

        const logsRes = await fetch(`/api/admin/moderation?userId=${user.id}`, {    return { level: "low", color: "text-green-600 bg-green-50 border-green-300" };

          headers: { Authorization: `Bearer ${session.access_token}` },  };

        });

        if (logsRes.ok) {  if (loading) {

          const logsData = await logsRes.json();    return (

          setModerationLogs(logsData.logs || []);      <div className="max-w-7xl mx-auto p-8">

        }        <AdminBreadcrumb current="Users" />

      }        <AdminNav />

    } catch (error) {        <div className="text-center py-8 text-gray-600">Loading users...</div>

      console.error("Error fetching user details:", error);      </div>

    } finally {    );

      setLoadingDetails(false);  }

    }

  };  return (

    <div className="max-w-7xl mx-auto p-8">

  const handleModeration = async () => {      <AdminBreadcrumb current="Users" />

    if (!selectedUser || !moderationAction) return;      <AdminNav />

          

    setModerating(true);      <div className="mb-8">

    try {        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>

      const { data: { session } } = await supabase.auth.getSession();        <p className="text-gray-600">Search and manage all platform users</p>

      if (!session?.access_token) {      </div>

        alert("Session expired. Please log in again.");

        return;      {/* Search Bar */}

      }      <div className="mb-6 relative">

        <Search className="absolute left-3 top-3 text-gray-400" size={20} />

      const body: any = {        <input

        action: moderationAction,          type="text"

        userId: selectedUser.id,          placeholder="Search by name, email, or user ID..."

        reason: moderationReason,          value={searchQuery}

      };          onChange={(e) => setSearchQuery(e.target.value)}

          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900"

      if (moderationAction === "suspend") {        />

        body.duration = suspensionDays;      </div>

      }

      {/* Stats Cards */}

      const res = await fetch("/api/admin/moderation", {      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

        method: "POST",        <div className="bg-white p-4 rounded-lg border shadow-sm">

        headers: {          <div className="text-sm text-gray-600 mb-1">Total Users</div>

          "Content-Type": "application/json",          <div className="text-2xl font-bold">{users.length}</div>

          Authorization: `Bearer ${session.access_token}`,        </div>

        },        <div className="bg-white p-4 rounded-lg border shadow-sm">

        body: JSON.stringify(body),          <div className="text-sm text-gray-600 mb-1">With Reports</div>

      });          <div className="text-2xl font-bold text-orange-600">

            {users.filter((u) => u.total_reports > 0).length}

      if (!res.ok) {          </div>

        const error = await res.json();        </div>

        alert(error.error || "Failed to perform action");        <div className="bg-white p-4 rounded-lg border shadow-sm">

        return;          <div className="text-sm text-gray-600 mb-1">Active Sellers</div>

      }          <div className="text-2xl font-bold text-green-600">

            {users.filter((u) => u.total_listings > 0).length}

      // Refresh user data          </div>

      await fetchUsers();        </div>

              <div className="bg-white p-4 rounded-lg border shadow-sm">

      // Update selected user          <div className="text-sm text-gray-600 mb-1">Active (24h)</div>

      const updatedUser = users.find(u => u.id === selectedUser.id);          <div className="text-2xl font-bold text-blue-600">

      if (updatedUser) {            {users.filter((u) => u.messages_24h > 0).length}

        setSelectedUser({ ...updatedUser });          </div>

      }        </div>

            </div>

      // Refresh moderation logs

      await viewUserDetails(selectedUser);      {/* Users Table */}

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">

      setShowModerationModal(false);        <div className="overflow-x-auto">

      setModerationReason("");          <table className="w-full">

    } catch (error) {            <thead className="bg-gray-50 border-b">

      console.error("Moderation error:", error);              <tr>

      alert("An error occurred");                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>

    } finally {                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>

      setModerating(false);                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>

    }                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Listings</th>

  };                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reports</th>

                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Messages (24h)</th>

  const openModerationModal = (action: string) => {                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>

    setModerationAction(action);                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>

    setModerationReason("");              </tr>

    setSuspensionDays(7);            </thead>

    setShowModerationModal(true);            <tbody className="divide-y divide-gray-200">

  };              {filteredUsers.map((user) => {

                const risk = getRiskLevel(user);

  const getRiskLevel = (user: UserRecord) => {                return (

    if (user.is_banned) return { level: "banned", color: "text-red-800 bg-red-100 border-red-300" };                  <tr key={user.id} className="hover:bg-gray-50">

    if (user.is_suspended) return { level: "suspended", color: "text-orange-800 bg-orange-100 border-orange-300" };                    <td className="px-6 py-4">

    if (user.pending_reports > 2) return { level: "high", color: "text-red-600 bg-red-50 border-red-300" };                      <div className="flex items-center gap-3">

    if (user.total_reports > 0) return { level: "medium", color: "text-orange-600 bg-orange-50 border-orange-300" };                        {user.avatar_url ? (

    return { level: "good", color: "text-green-600 bg-green-50 border-green-300" };                          <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full" />

  };                        ) : (

                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">

  if (loading) {                            <User size={20} className="text-gray-500" />

    return (                          </div>

      <div className="max-w-7xl mx-auto p-8">                        )}

        <AdminBreadcrumb current="Users" />                        <div>

        <AdminNav />                          <div className="font-medium text-gray-900">{user.name || "Unnamed User"}</div>

        <div className="text-center py-8 text-gray-600">Loading users...</div>                          <div className="text-xs text-gray-500 font-mono">{user.id.slice(0, 8)}...</div>

      </div>                        </div>

    );                      </div>

  }                    </td>

                    <td className="px-6 py-4">

  return (                      <div className="flex items-center gap-2 text-sm text-gray-600">

    <div className="max-w-7xl mx-auto p-8">                        <Mail size={14} />

      <AdminBreadcrumb current="Users" />                        {user.email}

      <AdminNav />                      </div>

                          </td>

      <div className="mb-8">                    <td className="px-6 py-4 text-sm text-gray-600">

        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>                      {new Date(user.created_at).toLocaleDateString()}

        <p className="text-gray-600">Search, manage, and moderate platform users</p>                    </td>

      </div>                    <td className="px-6 py-4 text-center">

                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">

      {/* Search and Filters */}                        <ShoppingBag size={14} />

      <div className="flex flex-col md:flex-row gap-4 mb-6">                        {user.total_listings}

        <div className="flex-1 relative">                      </span>

          <Search className="absolute left-3 top-3 text-gray-400" size={20} />                    </td>

          <input                    <td className="px-6 py-4 text-center">

            type="text"                      {user.total_reports > 0 ? (

            placeholder="Search by name, email, or user ID..."                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-sm">

            value={searchQuery}                          <Flag size={14} />

            onChange={(e) => setSearchQuery(e.target.value)}                          {user.total_reports}

            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900"                          {user.pending_reports > 0 && (

          />                            <span className="ml-1 text-xs">({user.pending_reports} pending)</span>

        </div>                          )}

        <select                        </span>

          value={statusFilter}                      ) : (

          onChange={(e) => setStatusFilter(e.target.value)}                        <span className="text-gray-400">0</span>

          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-gray-900"                      )}

        >                    </td>

          <option value="all">All Users</option>                    <td className="px-6 py-4 text-center">

          <option value="active">Active</option>                      {user.messages_24h > 0 ? (

          <option value="banned">Banned</option>                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-sm">

          <option value="suspended">Suspended</option>                          <MessageSquare size={14} />

          <option value="reported">With Reports</option>                          {user.messages_24h}

        </select>                        </span>

      </div>                      ) : (

                        <span className="text-gray-400">0</span>

      {/* Stats Cards */}                      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">                    </td>

        <div className="bg-white p-4 rounded-lg border shadow-sm">                    <td className="px-6 py-4">

          <div className="text-sm text-gray-600 mb-1">Total Users</div>                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${risk.color}`}>

          <div className="text-2xl font-bold">{users.length}</div>                        {risk.level === "high" && <AlertCircle size={12} />}

        </div>                        {risk.level === "medium" && <Flag size={12} />}

        <div className="bg-white p-4 rounded-lg border shadow-sm">                        {risk.level === "low" && <CheckCircle size={12} />}

          <div className="text-sm text-gray-600 mb-1">Banned</div>                        {risk.level.toUpperCase()}

          <div className="text-2xl font-bold text-red-600">                      </span>

            {users.filter(u => u.is_banned).length}                    </td>

          </div>                    <td className="px-6 py-4 text-center">

        </div>                      <button

        <div className="bg-white p-4 rounded-lg border shadow-sm">                        onClick={() => viewUserDetails(user)}

          <div className="text-sm text-gray-600 mb-1">Suspended</div>                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"

          <div className="text-2xl font-bold text-orange-600">                      >

            {users.filter(u => u.is_suspended && !u.is_banned).length}                        <Eye size={14} />

          </div>                        View

        </div>                      </button>

        <div className="bg-white p-4 rounded-lg border shadow-sm">                    </td>

          <div className="text-sm text-gray-600 mb-1">With Reports</div>                  </tr>

          <div className="text-2xl font-bold text-yellow-600">                );

            {users.filter(u => u.total_reports > 0).length}              })}

          </div>            </tbody>

        </div>          </table>

        <div className="bg-white p-4 rounded-lg border shadow-sm">        </div>

          <div className="text-sm text-gray-600 mb-1">Active Sellers</div>      </div>

          <div className="text-2xl font-bold text-green-600">

            {users.filter(u => u.total_listings > 0 && !u.is_banned).length}      {/* User Details Modal */}

          </div>      {selectedUser && (

        </div>        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">

      </div>          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">

            <div className="p-6 border-b sticky top-0 bg-white z-10">

      {/* Users Table */}              <div className="flex justify-between items-start">

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">                <div className="flex items-center gap-4">

        <div className="overflow-x-auto">                  {selectedUser.avatar_url ? (

          <table className="w-full">                    <img src={selectedUser.avatar_url} alt="" className="w-16 h-16 rounded-full" />

            <thead className="bg-gray-50 border-b">                  ) : (

              <tr>                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">

                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>                      <User size={32} className="text-gray-500" />

                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>                    </div>

                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Listings</th>                  )}

                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reports</th>                  <div>

                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>                    <h2 className="text-2xl font-bold">{selectedUser.name || "Unnamed User"}</h2>

                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>                    <p className="text-gray-600">{selectedUser.email}</p>

              </tr>                    <p className="text-xs text-gray-500 font-mono mt-1">ID: {selectedUser.id}</p>

            </thead>                  </div>

            <tbody className="divide-y divide-gray-200">                </div>

              {filteredUsers.map((user) => {                <button

                const risk = getRiskLevel(user);                  onClick={() => setSelectedUser(null)}

                return (                  className="text-gray-400 hover:text-gray-600 text-2xl"

                  <tr key={user.id} className={`hover:bg-gray-50 ${user.is_banned ? 'bg-red-50' : user.is_suspended ? 'bg-orange-50' : ''}`}>                >

                    <td className="px-4 py-3">                  ×

                      <div className="flex items-center gap-3">                </button>

                        {user.avatar_url ? (              </div>

                          <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full" />            </div>

                        ) : (

                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">            <div className="p-6">

                            <User size={20} className="text-gray-500" />              {/* User Stats */}

                          </div>              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

                        )}                <div className="p-4 bg-blue-50 rounded-lg">

                        <div>                  <div className="text-sm text-gray-600 mb-1">Total Listings</div>

                          <div className="font-medium text-gray-900">{user.name || "Unnamed"}</div>                  <div className="text-2xl font-bold text-blue-600">{selectedUser.total_listings}</div>

                          <div className="text-xs text-gray-500">Joined {new Date(user.created_at).toLocaleDateString()}</div>                </div>

                        </div>                <div className="p-4 bg-green-50 rounded-lg">

                      </div>                  <div className="text-sm text-gray-600 mb-1">Total Sales</div>

                    </td>                  <div className="text-2xl font-bold text-green-600">{selectedUser.total_sales}</div>

                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>                </div>

                    <td className="px-4 py-3 text-center">                <div className="p-4 bg-red-50 rounded-lg">

                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">                  <div className="text-sm text-gray-600 mb-1">Total Reports</div>

                        <ShoppingBag size={14} />                  <div className="text-2xl font-bold text-red-600">{selectedUser.total_reports}</div>

                        {user.total_listings}                </div>

                      </span>                <div className="p-4 bg-purple-50 rounded-lg">

                    </td>                  <div className="text-sm text-gray-600 mb-1">Messages (24h)</div>

                    <td className="px-4 py-3 text-center">                  <div className="text-2xl font-bold text-purple-600">{selectedUser.messages_24h}</div>

                      {user.total_reports > 0 ? (                </div>

                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-sm">              </div>

                          <Flag size={14} />

                          {user.total_reports}              {/* Bio and Location */}

                        </span>              {(selectedUser.bio || selectedUser.location) && (

                      ) : (                <div className="mb-6 p-4 bg-gray-50 rounded-lg">

                        <span className="text-gray-400">0</span>                  {selectedUser.bio && (

                      )}                    <div className="mb-2">

                    </td>                      <div className="text-sm font-medium text-gray-600 mb-1">Bio</div>

                    <td className="px-4 py-3">                      <p className="text-gray-800">{selectedUser.bio}</p>

                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${risk.color}`}>                    </div>

                        {risk.level === "banned" && <Ban size={12} />}                  )}

                        {risk.level === "suspended" && <Clock size={12} />}                  {selectedUser.location && (

                        {risk.level === "high" && <AlertCircle size={12} />}                    <div>

                        {risk.level === "medium" && <AlertTriangle size={12} />}                      <div className="text-sm font-medium text-gray-600 mb-1">Location</div>

                        {risk.level === "good" && <CheckCircle size={12} />}                      <p className="text-gray-800">{selectedUser.location}</p>

                        {risk.level.toUpperCase()}                    </div>

                      </span>                  )}

                    </td>                </div>

                    <td className="px-4 py-3 text-center">              )}

                      <button

                        onClick={() => viewUserDetails(user)}              {/* Reports Section */}

                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"              <div className="mb-6">

                      >                <div className="flex justify-between items-center mb-4">

                        <Eye size={14} />                  <h3 className="text-lg font-semibold flex items-center gap-2">

                        Manage                    <Flag className="text-red-600" />

                      </button>                    Reports Against User ({userReports.length})

                    </td>                  </h3>

                  </tr>                  {userReports.length > 0 && (

                );                    <button

              })}                      onClick={() => router.push(`/admin/reports?user=${selectedUser.id}`)}

            </tbody>                      className="text-sm text-blue-600 hover:underline"

          </table>                    >

        </div>                      View All in Reports Page →

        {filteredUsers.length === 0 && (                    </button>

          <div className="text-center py-8 text-gray-500">                  )}

            No users found matching your criteria                </div>

          </div>                {loadingDetails ? (

        )}                  <div className="text-center py-4 text-gray-500">Loading reports...</div>

      </div>                ) : userReports.length === 0 ? (

                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">

      {/* User Details Modal */}                    No reports against this user

      {selectedUser && (                  </div>

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">                ) : (

          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">                  <div className="space-y-3">

            <div className="p-6 border-b sticky top-0 bg-white z-10">                    {userReports.slice(0, 5).map((report: any) => (

              <div className="flex justify-between items-start">                      <div key={report.id} className="p-4 border rounded-lg bg-white">

                <div className="flex items-center gap-4">                        <div className="flex justify-between items-start mb-2">

                  {selectedUser.avatar_url ? (                          <div className="flex items-center gap-2">

                    <img src={selectedUser.avatar_url} alt="" className="w-16 h-16 rounded-full" />                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">

                  ) : (                              {report.reason}

                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">                            </span>

                      <User size={32} className="text-gray-500" />                            <span

                    </div>                              className={`px-2 py-1 text-xs font-medium rounded ${

                  )}                                report.status === "pending"

                  <div>                                  ? "bg-yellow-100 text-yellow-800"

                    <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name || "Unnamed User"}</h2>                                  : report.status === "investigating"

                    <p className="text-gray-600">{selectedUser.email}</p>                                  ? "bg-blue-100 text-blue-800"

                    <div className="flex items-center gap-2 mt-1">                                  : report.status === "resolved"

                      {selectedUser.is_banned && (                                  ? "bg-green-100 text-green-800"

                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded flex items-center gap-1">                                  : "bg-gray-100 text-gray-800"

                          <Ban size={12} /> BANNED                              }`}

                        </span>                            >

                      )}                              {report.status}

                      {selectedUser.is_suspended && !selectedUser.is_banned && (                            </span>

                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded flex items-center gap-1">                          </div>

                          <Clock size={12} /> SUSPENDED                          <span className="text-xs text-gray-500">

                          {selectedUser.suspended_until && (                            {new Date(report.created_at).toLocaleDateString()}

                            <span className="ml-1">until {new Date(selectedUser.suspended_until).toLocaleDateString()}</span>                          </span>

                          )}                        </div>

                        </span>                        <p className="text-sm text-gray-700 mb-2">{report.details}</p>

                      )}                        <p className="text-xs text-gray-500">

                      {selectedUser.warning_count && selectedUser.warning_count > 0 && (                          Reported by: {report.profiles?.name || report.profiles?.email || "Unknown"}

                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">                        </p>

                          {selectedUser.warning_count} warning{selectedUser.warning_count > 1 ? 's' : ''}                      </div>

                        </span>                    ))}

                      )}                  </div>

                    </div>                )}

                  </div>              </div>

                </div>

                <button              {/* Recent Messages Section */}

                  onClick={() => setSelectedUser(null)}              <div className="mb-6">

                  className="text-gray-400 hover:text-gray-600 text-2xl"                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">

                >                  <MessageSquare className="text-blue-600" />

                  ×                  Recent Messages (Last 24 Hours) ({userMessages.length})

                </button>                </h3>

              </div>                {loadingDetails ? (

            </div>                  <div className="text-center py-4 text-gray-500">Loading messages...</div>

                ) : userMessages.length === 0 ? (

            <div className="p-6">                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">

              {/* Moderation Actions */}                    No messages in the last 24 hours

              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">                  </div>

                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">                ) : (

                  <Shield size={18} />                  <div className="space-y-2 max-h-96 overflow-y-auto">

                  Moderation Actions                    {userMessages.map((message: any) => (

                </h3>                      <div key={message.id} className="p-3 border rounded bg-gray-50">

                <div className="flex flex-wrap gap-2">                        <p className="text-sm text-gray-800">{message.message_text}</p>

                  {!selectedUser.is_banned && (                        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">

                    <>                          <span>Thread: {message.thread_id.slice(0, 8)}...</span>

                      <button                          <span>{new Date(message.created_at).toLocaleString()}</span>

                        onClick={() => openModerationModal("warn")}                        </div>

                        className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 font-medium text-sm flex items-center gap-2"                      </div>

                      >                    ))}

                        <AlertTriangle size={16} />                  </div>

                        Issue Warning                )}

                      </button>              </div>

                      {!selectedUser.is_suspended && (

                        <button              {/* Action Buttons */}

                          onClick={() => openModerationModal("suspend")}              <div className="flex gap-3 pt-4 border-t">

                          className="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 font-medium text-sm flex items-center gap-2"                <button

                        >                  onClick={() => router.push(`/profile/${selectedUser.name || selectedUser.id}`)}

                          <Clock size={16} />                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"

                          Suspend                >

                        </button>                  View Public Profile

                      )}                </button>

                      {selectedUser.is_suspended && (                <button

                        <button                  onClick={() => router.push(`/admin/reports?user=${selectedUser.id}`)}

                          onClick={() => openModerationModal("unsuspend")}                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"

                          className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 font-medium text-sm flex items-center gap-2"                >

                        >                  View All Reports

                          <CheckCircle size={16} />                </button>

                          Unsuspend              </div>

                        </button>            </div>

                      )}          </div>

                      <button        </div>

                        onClick={() => openModerationModal("ban")}      )}

                        className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 font-medium text-sm flex items-center gap-2"    </div>

                      >  );

                        <Ban size={16} />}

                        Ban User
                      </button>
                    </>
                  )}
                  {selectedUser.is_banned && (
                    <button
                      onClick={() => openModerationModal("unban")}
                      className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 font-medium text-sm flex items-center gap-2"
                    >
                      <CheckCircle size={16} />
                      Unban User
                    </button>
                  )}
                  {selectedUser.warning_count && selectedUser.warning_count > 0 && (
                    <button
                      onClick={() => openModerationModal("clear_warnings")}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm flex items-center gap-2"
                    >
                      <XCircle size={16} />
                      Clear Warnings
                    </button>
                  )}
                </div>
                {selectedUser.ban_reason && (
                  <div className="mt-3 p-3 bg-red-50 rounded border border-red-200 text-sm">
                    <span className="font-medium text-red-800">Ban Reason:</span>
                    <span className="text-red-700 ml-2">{selectedUser.ban_reason}</span>
                  </div>
                )}
              </div>

              {/* User Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Total Listings</div>
                  <div className="text-2xl font-bold text-blue-600">{selectedUser.total_listings}</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Total Sales</div>
                  <div className="text-2xl font-bold text-green-600">{selectedUser.total_sales}</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Total Reports</div>
                  <div className="text-2xl font-bold text-red-600">{selectedUser.total_reports}</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Messages (24h)</div>
                  <div className="text-2xl font-bold text-purple-600">{selectedUser.messages_24h}</div>
                </div>
              </div>

              {/* Moderation History */}
              {moderationLogs.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <History className="text-gray-600" />
                    Moderation History
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {moderationLogs.map((log: any) => (
                      <div key={log.id} className="p-3 border rounded bg-gray-50 text-sm">
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            log.action === 'ban' ? 'bg-red-100 text-red-800' :
                            log.action === 'unban' ? 'bg-green-100 text-green-800' :
                            log.action === 'suspend' ? 'bg-orange-100 text-orange-800' :
                            log.action === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.action.toUpperCase()}
                          </span>
                          <span className="text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        {log.reason && <p className="mt-1 text-gray-700">{log.reason}</p>}
                        <p className="text-xs text-gray-500 mt-1">By: {log.admin_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reports Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Flag className="text-red-600" />
                  Reports ({userReports.length})
                </h3>
                {loadingDetails ? (
                  <div className="text-center py-4 text-gray-500">Loading...</div>
                ) : userReports.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">No reports</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {userReports.map((report: any) => (
                      <div key={report.id} className="p-3 border rounded bg-white">
                        <div className="flex justify-between items-center mb-1">
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                            {report.reason}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{report.details}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Messages */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="text-blue-600" />
                  Recent Messages (24h) ({userMessages.length})
                </h3>
                {loadingDetails ? (
                  <div className="text-center py-4 text-gray-500">Loading...</div>
                ) : userMessages.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">No recent messages</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {userMessages.slice(0, 10).map((message: any) => (
                      <div key={message.id} className="p-3 border rounded bg-gray-50 text-sm">
                        <p className="text-gray-800">{message.message_text}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => router.push(`/profile/${selectedUser.name || selectedUser.id}`)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View Public Profile
                </button>
                <button
                  onClick={() => router.push(`/admin/reports?user=${selectedUser.id}`)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  View All Reports
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Moderation Action Modal */}
      {showModerationModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {moderationAction === "ban" && "Ban User"}
              {moderationAction === "unban" && "Unban User"}
              {moderationAction === "suspend" && "Suspend User"}
              {moderationAction === "unsuspend" && "Unsuspend User"}
              {moderationAction === "warn" && "Issue Warning"}
              {moderationAction === "clear_warnings" && "Clear Warnings"}
            </h3>
            
            <p className="text-gray-600 mb-4">
              {moderationAction === "ban" && `Are you sure you want to permanently ban ${selectedUser.name || selectedUser.email}? Their listings will be hidden.`}
              {moderationAction === "unban" && `Are you sure you want to unban ${selectedUser.name || selectedUser.email}?`}
              {moderationAction === "suspend" && `Temporarily suspend ${selectedUser.name || selectedUser.email}. Their listings will be hidden during suspension.`}
              {moderationAction === "unsuspend" && `Remove suspension from ${selectedUser.name || selectedUser.email}?`}
              {moderationAction === "warn" && `Issue a formal warning to ${selectedUser.name || selectedUser.email}.`}
              {moderationAction === "clear_warnings" && `Clear all warnings for ${selectedUser.name || selectedUser.email}?`}
            </p>

            {moderationAction === "suspend" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suspension Duration
                </label>
                <select
                  value={suspensionDays}
                  onChange={(e) => setSuspensionDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            )}

            {(moderationAction === "ban" || moderationAction === "suspend" || moderationAction === "warn") && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason {moderationAction === "ban" && "(will be shown to user)"}
                </label>
                <textarea
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  placeholder="Enter reason for this action..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24 resize-none"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowModerationModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={moderating}
              >
                Cancel
              </button>
              <button
                onClick={handleModeration}
                disabled={moderating}
                className={`flex-1 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${
                  moderationAction === "ban" ? "bg-red-600 text-white hover:bg-red-700" :
                  moderationAction === "unban" || moderationAction === "unsuspend" ? "bg-green-600 text-white hover:bg-green-700" :
                  moderationAction === "suspend" ? "bg-orange-600 text-white hover:bg-orange-700" :
                  "bg-yellow-600 text-white hover:bg-yellow-700"
                }`}
              >
                {moderating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
