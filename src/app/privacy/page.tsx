export const metadata = {
  title: "Privacy Policy • Motorsource",
  description: "How Motorsource handles your data",
};

export default function PrivacyPage() {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="text-gray-700">
        This MVP collects minimal information needed to operate the site. We will
        update this page as features expand.
      </p>

      <div className="space-y-3 text-gray-700">
        <h2 className="text-xl font-semibold">What we collect</h2>
        <ul className="list-disc pl-6">
          <li>Account details you provide (e.g., email, display name).</li>
          <li>Listings and profile information you choose to publish.</li>
          <li>Basic analytics to improve the product (aggregate only).</li>
        </ul>

        <h2 className="text-xl font-semibold">How we use it</h2>
        <ul className="list-disc pl-6">
          <li>To operate the marketplace and show your listings.</li>
          <li>To improve site reliability and user experience.</li>
          <li>To contact you about important account or safety updates.</li>
        </ul>

        <p>
          For questions, email{" "}
          <a href="mailto:privacy@motorsource.example" className="text-yellow-600 hover:underline">
            privacy@motorsource.example
          </a>.
        </p>
      </div>
    </section>
  );
}
