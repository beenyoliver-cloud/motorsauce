"use client";

import { Calendar, AlertTriangle, CheckCircle2, Gauge, ShieldCheck } from "lucide-react";
import type { Car } from "@/lib/garage";

function daysUntil(dateIso?: string): number | null {
  if (!dateIso) return null;
  const target = new Date(dateIso).getTime();
  if (!Number.isFinite(target)) return null;
  const now = Date.now();
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function statusColor(days: number | null) {
  if (days === null) return "bg-gray-100 text-gray-800 border-gray-200";
  if (days < 0) return "bg-red-100 text-red-800 border-red-200";
  if (days <= 14) return "bg-yellow-100 text-yellow-900 border-yellow-300";
  return "bg-green-100 text-green-800 border-green-200";
}

export default function GarageStats({ car }: { car?: Car | null }) {
  const motDays = daysUntil(car?.motExpiry);
  const insDays = daysUntil(car?.insuranceExpiry);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* MOT */}
      <div className={`rounded-xl border p-4 ${statusColor(motDays)}`}>
        <div className="flex items-center gap-2 font-semibold">
          <Calendar className="h-4 w-4" /> MOT
        </div>
        <div className="mt-2 text-sm">
          {car?.motExpiry ? (
            motDays === null ? (
              <span>Set date: {car.motExpiry}</span>
            ) : motDays < 0 ? (
              <span>Expired {Math.abs(motDays)} day{Math.abs(motDays) === 1 ? "" : "s"} ago</span>
            ) : (
              <span>Due in {motDays} day{motDays === 1 ? "" : "s"} • {new Date(car.motExpiry).toLocaleDateString()}</span>
            )
          ) : (
            <span className="text-gray-700">No MOT date set</span>
          )}
        </div>
        {car?.motReminder ? (
          <div className="mt-2 text-xs inline-flex items-center gap-1 text-green-800">
            <CheckCircle2 className="h-3 w-3" /> Reminder enabled
          </div>
        ) : (
          <div className="mt-2 text-xs inline-flex items-center gap-1 text-gray-700">
            <AlertTriangle className="h-3 w-3" /> Reminder off
          </div>
        )}
      </div>

      {/* Insurance */}
      <div className={`rounded-xl border p-4 ${statusColor(insDays)}`}>
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-4 w-4" /> Insurance
        </div>
        <div className="mt-2 text-sm">
          {car?.insuranceExpiry ? (
            insDays === null ? (
              <span>Set date: {car.insuranceExpiry}</span>
            ) : insDays < 0 ? (
              <span>Expired {Math.abs(insDays)} day{Math.abs(insDays) === 1 ? "" : "s"} ago</span>
            ) : (
              <span>Due in {insDays} day{insDays === 1 ? "" : "s"} • {new Date(car.insuranceExpiry).toLocaleDateString()}</span>
            )
          ) : (
            <span className="text-gray-700">No insurance date set</span>
          )}
        </div>
        {car?.insuranceReminder ? (
          <div className="mt-2 text-xs inline-flex items-center gap-1 text-green-800">
            <CheckCircle2 className="h-3 w-3" /> Reminder enabled
          </div>
        ) : (
          <div className="mt-2 text-xs inline-flex items-center gap-1 text-gray-700">
            <AlertTriangle className="h-3 w-3" /> Reminder off
          </div>
        )}
      </div>

      {/* Mileage */}
      <div className="rounded-xl border p-4 bg-white">
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <Gauge className="h-4 w-4" /> Mileage
        </div>
        <div className="mt-2 text-sm text-gray-800">
          {typeof car?.mileage === "number" ? (
            <span>{car.mileage.toLocaleString()} miles</span>
          ) : (
            <span className="text-gray-700">Not set</span>
          )}
        </div>
      </div>

      {/* Service */}
      <div className="rounded-xl border p-4 bg-white">
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <Calendar className="h-4 w-4" /> Last Service
        </div>
        <div className="mt-2 text-sm text-gray-800">
          {car?.lastService ? (
            <span>
              {new Date(car.lastService).toLocaleDateString()} • {typeof car?.lastServiceMileage === "number" ? `${car.lastServiceMileage.toLocaleString()} miles` : "mileage unknown"}
            </span>
          ) : (
            <span className="text-gray-700">Not set</span>
          )}
        </div>
      </div>
    </div>
  );
}
