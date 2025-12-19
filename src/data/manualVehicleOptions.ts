// Re-export from comprehensive vehicle database for manual fallback
import { getAllMakes, getModelsForMake, getYearsForModel, VEHICLE_DATABASE } from "./vehicles";

// Get all makes sorted alphabetically
export const manualVehicleMakes = getAllMakes();

// Build models lookup from the full database
export const manualVehicleModels: Record<string, string[]> = Object.fromEntries(
  Object.keys(VEHICLE_DATABASE).map((make) => [make, getModelsForMake(make)])
);

// Also export the helper for getting valid years for a model
export { getYearsForModel };
