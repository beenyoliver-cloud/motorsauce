export default function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="animate-pulse border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-100 aspect-[4/3]" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}
