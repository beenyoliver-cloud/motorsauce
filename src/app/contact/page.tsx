export const metadata = {
  title: "Contact • Motorsource",
  description: "Get in touch with the Motorsource team",
};

import ContactForm from "@/components/ContactForm";

export default function ContactPage() {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <h1 className="text-3xl font-bold">Contact</h1>
      <p className="text-gray-700">
        Questions, feedback, or partnership ideas? We’d love to hear from you.
      </p>

      <ContactForm />

      <p className="text-sm text-gray-600">
        Prefer email?{" "}
        <a href="mailto:support@motorsource.example" className="text-yellow-600 hover:underline">
          support@motorsource.example
        </a>
      </p>
    </section>
  );
}
