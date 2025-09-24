// src/app/basket/page.tsx
export const dynamic = "force-dynamic";

export default function BasketPage() {
  return (
    <main className="px-6 sm:px-8 md:px-12 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-3">Basket</h1>
      <p className="text-gray-700">
        Basket/Cart UI is being rebuilt to use the database. For now, please continue browsing
        the latest listings on the <a href="/" className="text-yellow-600 underline">home page</a>.
      </p>
    </main>
  );
}
