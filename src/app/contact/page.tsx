export const metadata = {
  title: "Contact • Motorsauce",
  description: "Get in touch with the Motorsauce team",
};

import ContactForm from "@/components/ContactForm";

export default function ContactPage() {
  return (
    <section className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Contact</h1>
      <p className="text-gray-700">
        Questions, feedback, or partnership ideas? We’d love to hear from you.
      </p>

      <ContactForm />

      <p className="text-sm text-gray-600">
        Prefer email?{" "}
        <a href="mailto:support@motorsauce.example" className="text-yellow-600 hover:underline">
          support@motorsauce.example
        </a>
      </p>
    </section>
  );
}
