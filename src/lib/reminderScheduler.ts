// src/lib/reminderScheduler.ts
"use client";

/**
 * Reminder scheduling utilities for MOT, insurance, and service reminders.
 * Schedules notifications at 30, 14, and 7 days before expiry.
 */

export type ReminderType = "mot" | "insurance" | "service";

export interface ScheduledReminder {
  id: string;
  userId: string;
  vehicleId: string;
  type: ReminderType;
  expiryDate: string; // ISO date
  scheduledFor: string; // ISO datetime
  sent: boolean;
  daysBeforeExpiry: number;
}

const REMINDER_INTERVALS = [30, 14, 7]; // Days before expiry to send reminders

/**
 * Calculate reminder dates for a given expiry date
 */
export function calculateReminderDates(expiryDateIso: string): Date[] {
  const expiry = new Date(expiryDateIso);
  if (isNaN(expiry.getTime())) return [];

  return REMINDER_INTERVALS.map((days) => {
    const reminderDate = new Date(expiry);
    reminderDate.setDate(reminderDate.getDate() - days);
    reminderDate.setHours(9, 0, 0, 0); // Set to 9 AM local time
    return reminderDate;
  }).filter((date) => date > new Date()); // Only future reminders
}

/**
 * Schedule reminders for a vehicle via API
 */
export async function scheduleVehicleReminders(
  userId: string,
  vehicleId: string,
  reminders: {
    mot?: { enabled: boolean; expiryDate?: string };
    insurance?: { enabled: boolean; expiryDate?: string };
    service?: { enabled: boolean; nextServiceDate?: string };
  }
): Promise<void> {
  const toSchedule: Array<{
    type: ReminderType;
    expiryDate: string;
    scheduledDates: Date[];
  }> = [];

  // MOT reminders
  if (reminders.mot?.enabled && reminders.mot.expiryDate) {
    const dates = calculateReminderDates(reminders.mot.expiryDate);
    if (dates.length > 0) {
      toSchedule.push({
        type: "mot",
        expiryDate: reminders.mot.expiryDate,
        scheduledDates: dates,
      });
    }
  }

  // Insurance reminders
  if (reminders.insurance?.enabled && reminders.insurance.expiryDate) {
    const dates = calculateReminderDates(reminders.insurance.expiryDate);
    if (dates.length > 0) {
      toSchedule.push({
        type: "insurance",
        expiryDate: reminders.insurance.expiryDate,
        scheduledDates: dates,
      });
    }
  }

  // Service reminders (if provided)
  if (reminders.service?.enabled && reminders.service.nextServiceDate) {
    const dates = calculateReminderDates(reminders.service.nextServiceDate);
    if (dates.length > 0) {
      toSchedule.push({
        type: "service",
        expiryDate: reminders.service.nextServiceDate,
        scheduledDates: dates,
      });
    }
  }

  // Schedule each reminder via API
  for (const reminder of toSchedule) {
    for (const scheduledDate of reminder.scheduledDates) {
      try {
        await fetch("/api/garage/reminders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
          },
          body: JSON.stringify({
            vehicleId,
            type: reminder.type,
            scheduledFor: scheduledDate.toISOString(),
            expiryDate: reminder.expiryDate,
          }),
        });
      } catch (err) {
        console.error(`Failed to schedule ${reminder.type} reminder:`, err);
      }
    }
  }
}

/**
 * Cancel all reminders for a specific vehicle
 */
export async function cancelVehicleReminders(
  userId: string,
  vehicleId: string
): Promise<void> {
  try {
    await fetch(`/api/garage/reminders?vehicleId=${vehicleId}`, {
      method: "DELETE",
      headers: {
        "x-user-id": userId,
      },
    });
  } catch (err) {
    console.error("Failed to cancel reminders:", err);
  }
}

/**
 * Get days until a date (positive = future, negative = past)
 */
export function daysUntil(dateIso: string): number {
  const target = new Date(dateIso);
  if (isNaN(target.getTime())) return 999;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format reminder status for display
 */
export function formatReminderStatus(
  expiryDateIso?: string,
  reminderEnabled?: boolean
): { text: string; color: string; urgent: boolean } {
  if (!expiryDateIso) {
    return { text: "Not set", color: "text-gray-500", urgent: false };
  }

  const days = daysUntil(expiryDateIso);

  if (days < 0) {
    return {
      text: `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`,
      color: "text-red-600",
      urgent: true,
    };
  }

  if (days === 0) {
    return { text: "Expires today!", color: "text-red-600", urgent: true };
  }

  if (days <= 7) {
    return {
      text: `Due in ${days} day${days !== 1 ? "s" : ""}`,
      color: "text-red-600",
      urgent: true,
    };
  }

  if (days <= 14) {
    return {
      text: `Due in ${days} days`,
      color: "text-yellow-600",
      urgent: false,
    };
  }

  if (days <= 30) {
    return {
      text: `Due in ${days} days`,
      color: "text-yellow-600",
      urgent: false,
    };
  }

  return {
    text: `Due in ${days} days`,
    color: "text-green-600",
    urgent: false,
  };
}
