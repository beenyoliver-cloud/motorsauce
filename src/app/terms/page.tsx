export const metadata = {
  title: "Terms of Service • Motorsauce",
  description: "The rules for using Motorsauce",
};

export default function TermsPage() {
  return (
    <section className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="text-gray-700">
        Welcome to Motorsauce. By using the site you agree to these MVP terms.
        We’ll refine these as we launch more features.
      </p>

      <div className="space-y-3 text-gray-700">
        <h2 className="text-xl font-semibold">Use of the Service</h2>
        <ul className="list-disc pl-6">
          <li>List only parts you have the right to sell.</li>
          <li>Provide accurate descriptions and compatibility information.</li>
          <li>No prohibited or counterfeit items.</li>
        </ul>

        <h2 className="text-xl font-semibold">Liability</h2>
        <p>
          The marketplace is provided “as is” during the MVP phase. We’re not liable
          for losses arising from transactions between users.
        </p>

        <h2 className="text-xl font-semibold">Contact</h2>
        <p>
          Questions about these terms?{" "}
          <a href="mailto:legal@motorsauce.example" className="text-yellow-600 hover:underline">
            legal@motorsauce.example
          </a>
        </p>
      </div>
    </section>
  );
}
