"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Mail, Calendar, AlertCircle, MessageSquare, ShoppingBag, Flag, Eye, Ban, CheckCircle } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  created_at: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  total_listings: number;
  total_sales: number;
  total_reports: number;
  pending_reports: number;
  messages_24h: number;
  last_active?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [userMessages, setUserMessages] = useState<any[]>([]);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const router = useRouter();
  const supabase = supabaseBrowser();

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.id?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const checkAdminAndFetchUsers = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login?next=/admin/users");
        return;
      }

      // Check admin status using API endpoint (bypasses RLS)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push("/auth/login");
        return;
      }

      const adminRes = await fetch("/api/is-admin", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!adminRes.ok) {
        router.push("/");
        return;
      }

      const { isAdmin } = await adminRes.json();
      if (!isAdmin) {
        router.push("/");
        return;
      }

      await fetchUsers();
    } catch (error) {
      console.error("Error checking admin status:", error);
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Get all profiles with aggregated data
      const { data, error } = await supabase.rpc("get_users_admin_view");

      if (error) {
        console.error("Error fetching users:", error);
        // Fallback to basic query if RPC doesn't exist
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (profiles) {
          const usersWithStats = await Promise.all(
            profiles.map(async (profile) => {
              // Get counts individually
              const [listingsCount, reportsCount, messagesCount] = await Promise.all([
                supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", profile.id),
                supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("reported_user_id", profile.id),
                supabase
                  .from("messages")
                  .select("id", { count: "exact", head: true })
                  .eq("from_user_id", profile.id)
                  .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
              ]);

              return {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                created_at: profile.created_at,
                avatar_url: profile.avatar_url,
                bio: profile.bio,
                location: profile.location,
                total_listings: listingsCount.count || 0,
                total_sales: 0,
                total_reports: reportsCount.count || 0,
                pending_reports: 0,
                messages_24h: messagesCount.count || 0,
              };
            })
          );
          setUsers(usersWithStats);
          setFilteredUsers(usersWithStats);
        }
      } else {
        setUsers(data || []);
        setFilteredUsers(data || []);
      }
    } catch (error) {
      console.error("Error in fetchUsers:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewUserDetails = async (user: UserRecord) => {
    setSelectedUser(user);
    setLoadingDetails(true);

    try {
      // Fetch recent messages (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: messages } = await supabase
        .from("messages")
        .select(
          `
          id,
          message_text,
          created_at,
          thread_id,
          threads!inner(
            listing_ref,
            participant_1_id,
            participant_2_id
          )
        `
        )
        .eq("from_user_id", user.id)
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false })
        .limit(50);

      setUserMessages(messages || []);

      // Fetch reports about this user
      const { data: reports } = await supabase
        .from("user_reports")
        .select(
          `
          id,
          reason,
          details,
          status,
          created_at,
          reporter_id,
          profiles!user_reports_reporter_id_fkey(name, email)
        `
        )
        .eq("reported_user_id", user.id)
        .order("created_at", { ascending: false });

      setUserReports(reports || []);
    } catch (error) {
      console.error("Error fetching user details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getRiskLevel = (user: UserRecord) => {
    if (user.pending_reports > 2) return { level: "high", color: "text-red-600 bg-red-50 border-red-300" };
    if (user.total_reports > 0) return { level: "medium", color: "text-orange-600 bg-orange-50 border-orange-300" };
    return { level: "low", color: "text-green-600 bg-green-50 border-green-300" };
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="text-center">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">User Management</h1>
        <p className="text-gray-600">Search and manage all platform users</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by name, email, or user ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Users</div>
          <div className="text-2xl font-bold">{users.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm text-gray-600 mb-1">With Reports</div>
          <div className="text-2xl font-bold text-orange-600">
            {users.filter((u) => u.total_reports > 0).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Active Sellers</div>
          <div className="text-2xl font-bold text-green-600">
            {users.filter((u) => u.total_listings > 0).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Active (24h)</div>
          <div className="text-2xl font-bold text-blue-600">
            {users.filter((u) => u.messages_24h > 0).length}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Listings</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reports</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Messages (24h)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const risk = getRiskLevel(user);
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User size={20} className="text-gray-500" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{user.name || "Unnamed User"}</div>
                          <div className="text-xs text-gray-500 font-mono">{user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={14} />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                        <ShoppingBag size={14} />
                        {user.total_listings}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.total_reports > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-sm">
                          <Flag size={14} />
                          {user.total_reports}
                          {user.pending_reports > 0 && (
                            <span className="ml-1 text-xs">({user.pending_reports} pending)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.messages_24h > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-sm">
                          <MessageSquare size={14} />
                          {user.messages_24h}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${risk.color}`}>
                        {risk.level === "high" && <AlertCircle size={12} />}
                        {risk.level === "medium" && <Flag size={12} />}
                        {risk.level === "low" && <CheckCircle size={12} />}
                        {risk.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => viewUserDetails(user)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-16 h-16 rounded-full" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <User size={32} className="text-gray-500" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold">{selectedUser.name || "Unnamed User"}</h2>
                    <p className="text-gray-600">{selectedUser.email}</p>
                    <p className="text-xs text-gray-500 font-mono mt-1">ID: {selectedUser.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
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

              {/* Bio and Location */}
              {(selectedUser.bio || selectedUser.location) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  {selectedUser.bio && (
                    <div className="mb-2">
                      <div className="text-sm font-medium text-gray-600 mb-1">Bio</div>
                      <p className="text-gray-800">{selectedUser.bio}</p>
                    </div>
                  )}
                  {selectedUser.location && (
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Location</div>
                      <p className="text-gray-800">{selectedUser.location}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Reports Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Flag className="text-red-600" />
                    Reports Against User ({userReports.length})
                  </h3>
                  {userReports.length > 0 && (
                    <button
                      onClick={() => router.push(`/admin/reports?user=${selectedUser.id}`)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View All in Reports Page →
                    </button>
                  )}
                </div>
                {loadingDetails ? (
                  <div className="text-center py-4 text-gray-500">Loading reports...</div>
                ) : userReports.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    No reports against this user
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userReports.slice(0, 5).map((report: any) => (
                      <div key={report.id} className="p-4 border rounded-lg bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                              {report.reason}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                report.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : report.status === "investigating"
                                  ? "bg-blue-100 text-blue-800"
                                  : report.status === "resolved"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {report.status}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{report.details}</p>
                        <p className="text-xs text-gray-500">
                          Reported by: {report.profiles?.name || report.profiles?.email || "Unknown"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Messages Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="text-blue-600" />
                  Recent Messages (Last 24 Hours) ({userMessages.length})
                </h3>
                {loadingDetails ? (
                  <div className="text-center py-4 text-gray-500">Loading messages...</div>
                ) : userMessages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    No messages in the last 24 hours
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {userMessages.map((message: any) => (
                      <div key={message.id} className="p-3 border rounded bg-gray-50">
                        <p className="text-sm text-gray-800">{message.message_text}</p>
                        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                          <span>Thread: {message.thread_id.slice(0, 8)}...</span>
                          <span>{new Date(message.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
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
    </div>
  );
}
