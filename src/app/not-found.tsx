import Link from "next/link";

export default function NotFound() {
  return (
    <section className="max-w-3xl mx-auto text-center space-y-3">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-gray-700">That page might have moved or never existed.</p>
      <Link href="/" className="inline-block mt-2 px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600">
        Go home
      </Link>
    </section>
  );
}
