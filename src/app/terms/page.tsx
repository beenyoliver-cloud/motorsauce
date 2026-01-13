export const metadata = {
  title: "Terms of Service • Motorsource",
  description: "The rules for using Motorsource",
};

export default function TermsPage() {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-600">
          Updated February 2025
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-black">Terms of Service</h1>
        <p className="mt-3 text-gray-700">
          Motorsource is a marketplace for automotive parts. By accessing or using any portion of
          the product (website, APIs, mobile experiences, messaging), you agree to these terms. If
          you are using Motorsource on behalf of a garage, business, or client, you confirm that you
          have authority to bind that entity.
        </p>
      </header>

      <section className="space-y-3 text-gray-700">
        <h2 className="text-2xl font-bold text-black">1. Eligibility & Accounts</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>You must be at least 18 and able to enter into contracts in your jurisdiction.</li>
          <li>
            Provide accurate registration details and keep login credentials secure. You are
            responsible for activity that happens under your account.
          </li>
          <li>
            We may suspend or terminate an account if we suspect misuse, fraud, or violations of
            these terms or applicable laws.
          </li>
        </ul>
      </section>

      <section className="space-y-3 text-gray-700">
        <h2 className="text-2xl font-bold text-black">2. Listing & Selling</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>List only parts you own or are authorised to resell, and that are legal to sell.</li>
          <li>
            Provide accurate titles, photos, compatibility data (make, model, generation, engine,
            OEM numbers), condition, and pricing information. Misrepresentation is prohibited.
          </li>
          <li>No counterfeit, recalled, stolen, or hazardous items. We may remove listings at any time.</li>
          <li>
            Sellers are responsible for fulfilling accepted orders, handling logistics, and honouring
            warranties or return policies they advertise.
          </li>
        </ul>
      </section>

      <section className="space-y-3 text-gray-700">
        <h2 className="text-2xl font-bold text-black">3. Buying & Transactions</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Buyers must review compatibility data, photos, and seller policies before paying.</li>
          <li>
            Payments, deliveries, and any taxes or duties are arranged between buyer and seller. We
            may offer tooling (checkout, messaging) but are not a party to the transaction.
          </li>
          <li>Report suspicious activity or disputes to us promptly so we can assist.</li>
        </ul>
      </section>

      <section className="space-y-3 text-gray-700">
        <h2 className="text-2xl font-bold text-black">4. Fees & Payouts</h2>
        <p>
          Motorsource may charge listing, subscription, or transaction fees. We will always disclose
          fees before you opt in. Third-party payment processors are responsible for settlement time
          frames, identity verification, and compliance with anti-money-laundering requirements.
        </p>
      </section>

      <section className="space-y-3 text-gray-700">
        <h2 className="text-2xl font-bold text-black">5. Prohibited Conduct</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Posting harmful code, scraping, or reverse engineering the service.</li>
          <li>Harassment, hate speech, or sharing private information without consent.</li>
          <li>Using Motorsource for money laundering, price fixing, or other unlawful schemes.</li>
        </ul>
      </section>

      <section className="space-y-3 text-gray-700">
        <h2 className="text-2xl font-bold text-black">6. Intellectual Property</h2>
        <p>
          You retain ownership of content you submit but grant us a licence to host, display, and use
          it for marketplace operations, promotion, and product improvement. Motorsource trademarks,
          UI, data models, and code are owned by us or our licensors.
        </p>
      </section>

      <section className="space-y-3 text-gray-700">
        <h2 className="text-2xl font-bold text-black">7. Disclaimers</h2>
        <p>
          The service is provided “as is”. We do not guarantee uninterrupted access, exact vehicle
          compatibility, or that listings will meet your expectations. Compatibility tools are
          offered as guidance only—you are responsible for verifying fitment before completing a
          transaction.
        </p>
      </section>

      <section className="space-y-3 text-gray-700">
        <h2 className="text-2xl font-bold text-black">8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Motorsource and its team will not be liable for
          indirect, incidental, special, or consequential damages, or lost profits, arising from your
          use of the service. Our aggregate liability is limited to the greater of (a) the fees you
          paid us in the past six months, or (b) £100.
        </p>
      </section>

      <section className="space-y-3 text-gray-700">
        <h2 className="text-2xl font-bold text-black">9. Indemnity</h2>
        <p>
          You agree to indemnify and hold Motorsource harmless from claims arising out of your
          listings, transactions, conduct, or violation of these terms or third-party rights.
        </p>
      </section>

      <section className="space-y-3 text-gray-700">
        <h2 className="text-2xl font-bold text-black">10. Termination</h2>
        <p>
          You may close your account at any time. We may suspend or terminate access immediately if
          you breach these terms or we believe your actions risk other users or our platform. Sections
          relating to fees owed, IP, indemnity, limitation of liability, and dispute resolution survive
          termination.
        </p>
      </section>

      <section className="space-y-3 text-gray-700">
        <h2 className="text-2xl font-bold text-black">11. Governing Law & Disputes</h2>
        <p>
          These terms are governed by the laws of England and Wales. Parties agree to the exclusive
          jurisdiction of courts located in London, except where local consumer law requires
          otherwise.
        </p>
      </section>

      <section className="space-y-3 text-gray-700">
        <h2 className="text-2xl font-bold text-black">12. Changes to these Terms</h2>
        <p>
          We will post updates on this page and indicate the effective date above. Continued use of
          the service after changes become effective constitutes acceptance of the new terms.
        </p>
      </section>

      <section className="space-y-3 text-gray-700">
        <h2 className="text-2xl font-bold text-black">Contact</h2>
        <p>
          Questions or legal notices can be sent to{" "}
          <a href="mailto:legal@motorsource.example" className="text-yellow-600 hover:underline">
            legal@motorsource.example
          </a>{" "}
          or through the <a href="/contact" className="text-yellow-600 hover:underline">contact page</a>.
        </p>
      </section>
    </section>
  );
}
