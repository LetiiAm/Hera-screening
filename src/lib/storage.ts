import { HeightMeasurement } from './height-calculator';

const STORAGE_KEY = 'health_worker_measurements';

export interface StoredMeasurement extends HeightMeasurement {
  childId: string;
  childName: string;
  id: string;
}

/**
 * Saves a height measurement to local storage
 */
export function saveMeasurementLocally(
  measurement: HeightMeasurement,
  childId: string,
  childName: string,
): StoredMeasurement {
  const id = `${childId}_${Date.now()}`;
  const stored: StoredMeasurement = {
    ...measurement,
    childId,
    childName,
    id,
  };

  const measurements = getMeasurementsLocally();
  measurements.push(stored);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(measurements));

  return stored;
}

/**
 * Retrieves all stored measurements from local storage
 */
export function getMeasurementsLocally(): StoredMeasurement[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Retrieves measurements for a specific child
 */
export function getMeasurementsForChild(childId: string): StoredMeasurement[] {
  return getMeasurementsLocally().filter((m) => m.childId === childId);
}

/**
 * Deletes a measurement from local storage
 */
export function deleteMeasurementLocally(id: string): void {
  const measurements = getMeasurementsLocally().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(measurements));
}

/**
 * Clears all measurements from local storage
 */
export function clearMeasurementsLocally(): void {
  localStorage.removeItem(STORAGE_KEY);
}
