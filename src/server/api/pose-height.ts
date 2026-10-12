import { calculateHeight, HeightMeasurement } from '@/lib/height-calculator';
import { PoseLandmarks } from '@/lib/pose-detector';

export interface PoseHeightRequest {
  landmarks: PoseLandmarks;
  imageWidth?: number;
  imageHeight?: number;
}

export interface PoseHeightResponse {
  success: boolean;
  measurement?: HeightMeasurement;
  error?: string;
}

/**
 * Server-side API handler for pose height calculation
 * This runs on the backend to provide additional processing if needed
 */
export async function calculateHeightOnServer(
  request: PoseHeightRequest,
): Promise<PoseHeightResponse> {
  try {
    const { landmarks, imageWidth = 1080, imageHeight = 1440 } = request;

    // Validate landmarks structure
    if (!landmarks || !Array.isArray(landmarks.keypoints)) {
      return {
        success: false,
        error: 'Invalid landmarks structure',
      };
    }

    // Calculate height
    const measurement = calculateHeight(landmarks, imageWidth, imageHeight);

    if (!measurement) {
      return {
        success: false,
        error: 'Unable to calculate height from landmarks',
      };
    }

    return {
      success: true,
      measurement,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
