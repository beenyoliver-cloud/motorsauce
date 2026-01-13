"use client";

import { BusinessProfile } from "./BusinessStorefront";

type Props = {
  business: BusinessProfile;
};

export default function BusinessAbout({ business }: Props) {
  return (
    <div className="max-w-6xl">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">About {business.business_name}</h2>
        
        {business.about_business ? (
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {business.about_business}
          </div>
        ) : (
          <p className="text-gray-500 italic">No business description provided yet.</p>
        )}

        {/* Business Details */}
        <div className="mt-6 pt-6 border-t grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Business Type</h3>
            <p className="text-gray-700 capitalize">
              {business.business_type.replace(/_/g, ' ')}
            </p>
          </div>

          {business.years_established && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Established</h3>
              <p className="text-gray-700">{business.years_established}</p>
            </div>
          )}

          {business.specialties && business.specialties.length > 0 && (
            <div className="md:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-2">Specialties</h3>
              <div className="flex flex-wrap gap-2">
                {business.specialties.map((specialty, idx) => (
                  <span
                    key={idx}
                    className="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-md text-sm font-medium border border-yellow-200"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
          )}

          {business.website_url && (
            <div className="md:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-2">Website</h3>
              <a
                href={business.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {business.website_url}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
