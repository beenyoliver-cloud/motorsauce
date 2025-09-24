// src/app/checkout/page.tsx
export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <main className="px-6 sm:px-8 md:px-12 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-3">Checkout</h1>
      <p className="text-gray-700">
        Checkout is being switched to the database-backed flow. We’ll re-enable it after wiring the
        Sell/Payments endpoints. For now, keep exploring parts on the{" "}
        <a href="/" className="text-yellow-600 underline">home page</a>.
      </p>
    </main>
  );
}
