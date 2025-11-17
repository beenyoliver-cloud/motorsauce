export function CardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg sm:rounded-xl overflow-hidden bg-white animate-pulse">
      <div className="relative aspect-square sm:aspect-[4/3] bg-gray-100" />
      <div className="p-2 sm:p-3 space-y-2">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="min-w-[160px] max-w-[200px] sm:min-w-[200px] sm:max-w-[240px] border border-gray-200 rounded-lg overflow-hidden bg-white animate-pulse">
      <div className="relative aspect-[4/3] bg-gray-100" />
      <div className="p-2 space-y-2">
        <div className="h-3 bg-gray-100 rounded" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  );
}

export function ListingDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Gallery skeleton */}
      <div className="w-full">
        <div className="relative aspect-[4/3] bg-gray-100 border border-gray-200 rounded-xl" />
        <div className="mt-3 hidden xs:grid grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg border border-gray-200" />
          ))}
        </div>
      </div>

      {/* Title and price skeleton */}
      <div className="space-y-4">
        <div className="h-8 bg-gray-100 rounded w-3/4" />
        <div className="h-10 bg-gray-100 rounded w-1/3" />
      </div>

      {/* Description skeleton */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>

      {/* Buttons skeleton */}
      <div className="flex gap-3">
        <div className="h-12 bg-gray-100 rounded-lg flex-1" />
        <div className="h-12 bg-gray-100 rounded-lg flex-1" />
      </div>

      {/* Seller card skeleton */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gray-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 rounded w-1/3" />
            <div className="h-3 bg-gray-100 rounded w-1/4" />
          </div>
        </div>
        <div className="h-10 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-24 w-24 rounded-full bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-gray-100 rounded w-1/4" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="h-8 bg-gray-100 rounded w-1/2 mx-auto" />
            <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto" />
          </div>
        ))}
      </div>

      {/* Bio skeleton */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
      </div>
    </div>
  );
}

export function SearchResultSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {[...Array(8)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SellerCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-14 w-14 rounded-full bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-3/4" />
      </div>
      <div className="mt-3 h-9 bg-gray-100 rounded-lg" />
    </div>
  );
}
