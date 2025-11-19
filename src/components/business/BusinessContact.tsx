"use client";

import { BusinessProfile } from "./BusinessStorefront";
import { Phone, Mail, Globe, Clock, MapPin } from "lucide-react";

type Props = {
  business: BusinessProfile;
};

export default function BusinessContact({ business }: Props) {
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const openingHours = business.opening_hours || {};
  function track(event: string, payload: any) {
    try {
      window.dispatchEvent(new CustomEvent('ms:analytics', { detail: { event, payload } }));
    } catch {}
  }

  return (
    <div className="max-w-4xl">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
          <div className="space-y-4">
            {business.phone_number && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-600">Phone</div>
                  <a href={`tel:${business.phone_number}`} onClick={() => track('business_phone_click', { id: business.id })} className="text-blue-600 hover:underline">
                    {business.phone_number}
                  </a>
                </div>
              </div>
            )}

            {business.customer_support_email && (
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-600">Email</div>
                  <a
                    href={`mailto:${business.customer_support_email}`}
                    onClick={() => track('business_email_click', { id: business.id })}
                    className="text-blue-600 hover:underline break-all"
                  >
                    {business.customer_support_email}
                  </a>
                </div>
              </div>
            )}

            {business.website_url && (
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-600">Website</div>
                  <a
                    href={business.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track('business_website_click', { id: business.id })}
                    className="text-blue-600 hover:underline break-all"
                  >
                    {business.website_url.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Opening Hours */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Opening Hours</h2>
          <div className="space-y-2">
            {daysOfWeek.map((day) => {
              const hours = openingHours[day] || { closed: true };
              return (
                <div key={day} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <span className="font-medium text-gray-900 capitalize">{day}</span>
                  {hours.closed ? (
                    <span className="text-gray-500">Closed</span>
                  ) : (
                    <span className="text-gray-700">
                      {hours.open} - {hours.close}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Service Hours */}
        {business.customer_service_hours && (
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6 md:col-span-2">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Customer Service Hours</h3>
                <p className="text-gray-700 text-sm">
                  Different hours may apply for customer support inquiries.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Location Note (GDPR-safe) */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 md:col-span-2">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Location</h3>
              <p className="text-gray-700 text-sm">
                This business operates in the UK. Contact them directly for specific location details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
