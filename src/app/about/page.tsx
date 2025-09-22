export default function AboutPage() {
  return (
    <section className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">About Motorsauce</h1>
      <p className="text-gray-700">
        Motorsauce is a marketplace focused solely on automotive parts. Our goal is to make buying
        and selling exact-fit parts simple, safe, and fast.
      </p>
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-700">
        <ul className="list-disc pl-6 space-y-1">
          <li>Advanced compatibility filters (make, model, gen, engine, year, OEM).</li>
          <li>Seller profiles with ratings and reporting for trust & safety.</li>
          <li>Messaging to keep deals organized and secure.</li>
        </ul>
      </div>
    </section>
  );
}
