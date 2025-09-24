export default function MakeOfferButton(_: { listingId?: string; sellerName?: string }) {
  return (
    <button
      type="button"
      disabled
      className="w-full rounded-md bg-gray-200 text-gray-600 px-4 py-2 cursor-not-allowed"
      title="Offers coming soon"
    >
      Offers coming soon
    </button>
  );
}
