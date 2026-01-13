"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Package, Search, Trash2, Eye, EyeOff, ExternalLink, AlertTriangle, ArrowLeft, Filter, CheckSquare, Square, ChevronDown, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

interface Listing {
  id: string;
  title: string;
  price: number;
  status: string;
  created_at: string;
  images: string[];
  seller_id: string;
  seller_name: string;
  seller_username: string;
  seller_avatar: string | null;
  view_count: number;
  save_count: number;
  offer_count: number;
  report_count: number;
  category: string;
}

export default function AdminListingsPage() {
  const router = useRouter();
  const PAGE_SIZE = 20;
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "sold" | "reported">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "price_high" | "price_low" | "views" | "reports">("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>("");

  useEffect(() => { 
    checkAdminAndFetch(); 
  }, []);

  useEffect(() => {
    if (accessToken) {
      fetchListings();
    }
  }, [accessToken, searchQuery, statusFilter, page]);

  async function checkAdminAndFetch() {
    try {
      setLoading(true);
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { router.push("/auth/login"); return; }

      const res = await fetch("/api/is-admin", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) { router.push("/"); return; }
      const { isAdmin } = await res.json();
      if (!isAdmin) { router.push("/"); return; }

      setAccessToken(session.access_token);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  async function fetchListings() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: PAGE_SIZE.toString(),
      });

      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/admin/listings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        const errorMsg = errorData.error || `HTTP ${res.status}`;
        throw new Error(errorMsg);
      }

      const data = await res.json();
      const totalCount = typeof data.total === "number" ? data.total : 0;
      const maxPage = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);

      if (page > maxPage) {
        setTotal(totalCount);
        setListings([]);
        setPage(maxPage);
        return;
      }

      setListings(Array.isArray(data.listings) ? data.listings : []);
      setTotal(totalCount);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }

  const filteredListings = statusFilter === "reported" ? listings.filter((l) => l.report_count > 0) : listings;

  const visibleListings = [...filteredListings].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "price_high":
        return b.price - a.price;
      case "price_low":
        return a.price - b.price;
      case "views":
        return b.view_count - a.view_count;
      case "reports":
        return b.report_count - a.report_count;
      default:
        return 0;
    }
  });

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  function toggleSelect(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  }

  function toggleSelectAll() {
    if (selectedIds.size === visibleListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleListings.map(l => l.id)));
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !accessToken) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/listings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ listingId: deleteTarget.id, reason: deleteReason }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchListings();
      setShowDeleteModal(false);
      setDeleteTarget(null);
      setDeleteReason("");
    } catch (err) { console.error(err); alert("Failed to delete listing"); }
    finally { setProcessing(false); }
  }

  async function handleStatusChange(listing: Listing, newStatus: string) {
    if (!accessToken) return;
    try {
      const res = await fetch("/api/admin/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ listingId: listing.id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await fetchListings();
    } catch (err) { console.error(err); alert("Failed to update listing"); }
  }

  async function handleBulkAction() {
    if (!bulkAction || selectedIds.size === 0 || !accessToken) return;
    setProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      if (bulkAction === "delete") {
        for (const id of ids) {
          await fetch("/api/admin/listings", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ listingId: id, reason: "Bulk admin action" }),
          });
        }
      } else {
        for (const id of ids) {
          await fetch("/api/admin/listings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ listingId: id, status: bulkAction }),
          });
        }
      }
      await fetchListings();
      setSelectedIds(new Set());
      setBulkAction("");
    } catch (err) { console.error(err); }
    finally { setProcessing(false); }
  }

  function openDeleteModal(listing: Listing) {
    setDeleteTarget(listing);
    setDeleteReason("");
    setShowDeleteModal(true);
  }

  if (loading) {
    return (<div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>);
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-lg w-full rounded-lg border border-red-200 bg-white p-6 shadow-sm space-y-3">
          <p className="text-lg font-semibold text-red-700">Failed to load listings</p>
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => fetchListings()}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/admin/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2">
            <ArrowLeft className="h-4 w-4" />Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Listing Management</h1>
          <p className="text-gray-600 mt-1">{total} total listings</p>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title, seller, or category..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
                  className="border rounded-lg px-3 py-2"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="sold">Sold</option>
                  <option value="reported">Reported</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="border rounded-lg px-3 py-2">
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="price_high">Price High</option>
                  <option value="price_low">Price Low</option>
                  <option value="views">Most Views</option>
                  <option value="reports">Most Reports</option>
                </select>
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-800 font-medium">{selectedIds.size} selected</span>
                <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="border rounded px-2 py-1">
                  <option value="">Bulk Action...</option>
                  <option value="active">Publish</option>
                  <option value="draft">Unpublish</option>
                  <option value="delete">Delete</option>
                </select>
                <button onClick={handleBulkAction} disabled={!bulkAction || processing} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
                  Apply
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="text-gray-600 hover:text-gray-800">
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="divide-y">
            <div className="p-3 bg-gray-50 flex items-center gap-4 text-sm font-medium text-gray-600">
              <button onClick={toggleSelectAll} className="p-1">
                {selectedIds.size === visibleListings.length && visibleListings.length > 0 ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5" />}
              </button>
              <span className="w-16">Image</span>
              <span className="flex-1">Title</span>
              <span className="w-24">Price</span>
              <span className="w-24">Status</span>
              <span className="w-32">Seller</span>
              <span className="w-24 text-center">Stats</span>
              <span className="w-32 text-right">Actions</span>
            </div>

            {visibleListings.map((listing) => (
              <div key={listing.id} className={`p-3 flex items-center gap-4 hover:bg-gray-50 ${listing.report_count > 0 ? "bg-orange-50" : ""}`}>
                <button onClick={() => toggleSelect(listing.id)} className="p-1">
                  {selectedIds.has(listing.id) ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5 text-gray-400" />}
                </button>
                
                <div className="w-16 h-12 relative rounded overflow-hidden bg-gray-200 flex-shrink-0">
                  {listing.images[0] ? (
                    <Image src={listing.images[0]} alt="" fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full"><Package className="h-5 w-5 text-gray-400" /></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{listing.title}</p>
                    {listing.report_count > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        <AlertTriangle className="h-3 w-3" />{listing.report_count} reports
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{listing.category}</p>
                </div>

                <div className="w-24">
                  <p className="font-semibold text-gray-900">£{listing.price.toLocaleString()}</p>
                </div>

                <div className="w-24">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    listing.status === "active" ? "bg-green-100 text-green-800" :
                    listing.status === "sold" ? "bg-blue-100 text-blue-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {listing.status}
                  </span>
                </div>

                <div className="w-32 flex items-center gap-2">
                  {listing.seller_avatar ? (
                    <Image src={listing.seller_avatar} alt="" width={24} height={24} className="rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-300" />
                  )}
                  <span className="text-sm text-gray-700 truncate">@{listing.seller_username || "user"}</span>
                </div>

                <div className="w-24 text-center text-xs text-gray-500">
                  <div>{listing.view_count} views</div>
                  <div>{listing.save_count} saves • {listing.offer_count} offers</div>
                </div>

                <div className="w-32 flex items-center justify-end gap-1">
                  <Link href={`/listing/${listing.id}`} target="_blank" className="p-2 text-gray-600 hover:text-blue-600" title="View">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  {listing.status === "active" ? (
                    <button onClick={() => handleStatusChange(listing, "draft")} className="p-2 text-gray-600 hover:text-orange-600" title="Unpublish">
                      <EyeOff className="h-4 w-4" />
                    </button>
                  ) : listing.status === "draft" ? (
                    <button onClick={() => handleStatusChange(listing, "active")} className="p-2 text-gray-600 hover:text-green-600" title="Publish">
                      <Eye className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button onClick={() => openDeleteModal(listing)} className="p-2 text-gray-600 hover:text-red-600" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {visibleListings.length === 0 && (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No listings found</h3>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600">
            <span>Showing {startItem}-{endItem} of {total}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(page - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(page + 1, totalPages))}
                disabled={page === totalPages || total === 0}
                className="px-3 py-1 border rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">Delete Listing</h2>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete <strong>{deleteTarget.title}</strong>? 
              The seller will be notified with the reason you provide.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for deletion *</label>
              <textarea 
                value={deleteReason} 
                onChange={(e) => setDeleteReason(e.target.value)} 
                placeholder="e.g., Violates marketplace policies, Inappropriate content..."
                className="w-full border rounded-lg px-3 py-2 h-24 resize-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-gray-700 hover:text-gray-900">Cancel</button>
              <button 
                onClick={handleDelete} 
                disabled={!deleteReason.trim() || processing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processing ? "Deleting..." : "Delete & Notify Seller"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
