"use client";

import { SyntheticEvent } from "react";

const projects = [
  {
    id: "maya",
    name: "Maya R.",
    vehicle: "MK7 Golf GTI",
    quote: "Swapped in fresh coilovers, aligned at home, and knocked 1.2s off my Silverstone lap.",
    image: "/images/shock6.webp",
    tags: ["Suspension", "Track day"],
    size: "tall",
  },
  {
    id: "liam",
    name: "Liam T.",
    vehicle: "E46 Touring",
    quote: "Retrofit CarPlay, new door cards, and a deep clean. Feels like a new cockpit.",
    image: "/images/race-car.jpg",
    tags: ["Interior", "Comfort"],
    size: "short",
  },
  {
    id: "alina",
    name: "Alina K.",
    vehicle: "GR Yaris",
    quote: "Titanium exhaust + tune = pops, bangs, and still road-trip ready.",
    image: "/images/exhaust5.avif",
    tags: ["Performance", "Exhaust"],
    size: "short",
  },
  {
    id: "marcus",
    name: "Marcus D.",
    vehicle: "Defender 110",
    quote: "Roof rack, LED floods, and recovery gear before a Wales green lane weekend.",
    image: "/images/race-car1.jpg",
    tags: ["Adventure", "Lighting"],
    size: "tall",
  },
  {
    id: "sana",
    name: "Sana P.",
    vehicle: "NA MX-5",
    quote: "New body kit, quick respray, and classic wheels. Sunday cars & coffee ready.",
    image: "/images/race-car3.jpg",
    tags: ["Exterior", "Bodywork"],
    size: "short",
  },
];

export default function WrenchingWall() {
  const FALLBACK_IMAGE = "/images/motorsource_header_white_2000x600.png";

  function handleImageError(e: SyntheticEvent<HTMLImageElement, Event>) {
    const img = e.currentTarget;
    if (img.dataset.fallback === "true") return;
    img.dataset.fallback = "true";
    img.src = FALLBACK_IMAGE;
    img.classList.add("object-contain", "bg-slate-900");
  }

  return (
    <section className="rounded-3xl border border-gray-200 bg-white/90 p-4 sm:p-6 md:p-8 shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Community Feed</p>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 mt-1">What owners are wrenching on</h2>
          <p className="text-sm text-gray-600 mt-1">Real builds, before-and-afters, and parts credited back to Motorsauce sellers.</p>
        </div>
        <button className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-black transition">
          Share your project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-[1fr]">
        {projects.map((project) => (
          <article
            key={project.id}
            className={`relative overflow-hidden rounded-2xl border border-gray-100 shadow-md ${
              project.size === "tall" ? "md:row-span-2" : ""
            }`}
          >
            <div className="relative h-48 sm:h-56 md:h-64">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.image}
                alt={project.vehicle}
                className="absolute inset-0 w-full h-full object-cover"
                onError={handleImageError}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/60" />
              <div className="absolute top-3 left-3 flex gap-2">
                {project.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/20 text-white backdrop-blur">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="absolute bottom-3 left-3 text-white">
                <div className="text-xs uppercase tracking-[0.3em] text-white/70">{project.vehicle}</div>
                <div className="text-lg font-semibold">{project.name}</div>
              </div>
            </div>
            <div className="p-4 text-sm text-gray-700 bg-white">
              “{project.quote}”
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
