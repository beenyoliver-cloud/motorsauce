"use client";

export default function AdminTestPage() {
  return (
    <div className="max-w-7xl mx-auto mt-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">✅ Admin Test Page Loaded</h1>
      <p className="mt-4">If you can see this, the admin route is accessible.</p>
      <p className="mt-2">No auth checks, no redirects - just testing basic access.</p>
    </div>
  );
}
