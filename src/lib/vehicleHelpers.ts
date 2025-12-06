export type SelectedVehicle = {
  id: string;
  make: string;
  model: string;
  year?: number;
};

/**
 * Helper to add a new vehicle to the selected vehicles array
 */
export function addVehicle(
  vehicles: SelectedVehicle[],
  make: string,
  model: string,
  year?: number
): SelectedVehicle[] {
  const id = crypto.randomUUID();
  return [
    ...vehicles,
    {
      id,
      make: make.trim(),
      model: model.trim(),
      year,
    },
  ];
}

/**
 * Helper to remove a vehicle by its ID
 */
export function removeVehicle(
  vehicles: SelectedVehicle[],
  vehicleId: string
): SelectedVehicle[] {
  return vehicles.filter((v) => v.id !== vehicleId);
}

/**
 * Convert selected vehicles to the format for database storage
 */
export function vehiclesToArray(vehicles: SelectedVehicle[], universal: boolean) {
  if (universal) {
    return [
      {
        make: "",
        model: "",
        year: null,
        universal: true,
      },
    ];
  }

  return vehicles.map((v) => ({
    make: v.make,
    model: v.model,
    year: v.year || null,
    universal: false,
  }));
}
