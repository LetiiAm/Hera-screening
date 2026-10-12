import { PoseLandmarks, PoseKeypoint } from './pose-detector';

export interface HeightMeasurement {
  heightCm: number;
  heightInches: number;
  confidence: number;
  headPosition: { x: number; y: number; z: number };
  heelPosition: { x: number; y: number; z: number };
  pixelDistance: number;
  calibrationFactor: number;
  timestamp: Date;
  notes: string;
  isReliable: boolean;
}

/**
 * Camera calibration defaults for typical mobile/web devices
 */
const CALIBRATION = {
  focalLengthPx: 800.0,
  sensorHeightMm: 4.0,
  defaultImageHeightPx: 1440.0,
  headToHeightRatio: 0.12,
  neckOffsetCm: 2.0,
  averageShoulderWidthCm: 26.0,
};

/**
 * Keypoint indices for MediaPipe BlazePose
 */
const KEYPOINT_INDICES = {
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,
  LEFT_EAR: 3,
  RIGHT_EAR: 4,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
};

/**
 * Validates that all required landmarks are present with sufficient confidence
 */
function validateLandmarks(landmarks: PoseLandmarks): boolean {
  const requiredKeypoints = [
    KEYPOINT_INDICES.NOSE,
    KEYPOINT_INDICES.LEFT_SHOULDER,
    KEYPOINT_INDICES.RIGHT_SHOULDER,
    KEYPOINT_INDICES.LEFT_ANKLE,
    KEYPOINT_INDICES.RIGHT_ANKLE,
  ];

  return requiredKeypoints.every((idx) => {
    const kp = landmarks.keypoints[idx];
    return kp && kp.score > 0.5;
  });
}

/**
 * Calculates Euclidean distance between two keypoints
 */
function distancePixels(p1: PoseKeypoint, p2: PoseKeypoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Estimates camera distance from subject using shoulder width
 */
function estimateCameraDistance(
  leftShoulder: PoseKeypoint,
  rightShoulder: PoseKeypoint,
): number {
  const shoulderPixelDistance = distancePixels(leftShoulder, rightShoulder);

  if (shoulderPixelDistance <= 0) {
    return 100.0; // Fallback distance
  }

  // f = (ref_width * focal_length) / shoulder_px
  const estimatedDistance =
    (CALIBRATION.averageShoulderWidthCm * CALIBRATION.focalLengthPx) / shoulderPixelDistance;

  return Math.max(50, Math.min(200, estimatedDistance)); // Clamp to realistic range
}

/**
 * Computes body length from head to heel using pinhole camera model
 */
function computeBodyLength(
  headPos: PoseKeypoint,
  heelPos: PoseKeypoint,
  cameraDistanceCm: number,
): number {
  const pixelDistance = distancePixels(headPos, heelPos);
  // height_cm = (pixel_distance * camera_distance_cm) / focal_length_px
  const bodyLengthCm = (pixelDistance * cameraDistanceCm) / CALIBRATION.focalLengthPx;
  return bodyLengthCm;
}

/**
 * Refines height estimate based on body posture and joint angles
 */
function refineHeightEstimate(
  bodyLengthCm: number,
  landmarks: PoseLandmarks,
): number {
  const leftHip = landmarks.keypoints[KEYPOINT_INDICES.LEFT_HIP];
  const rightHip = landmarks.keypoints[KEYPOINT_INDICES.RIGHT_HIP];
  const leftKnee = landmarks.keypoints[KEYPOINT_INDICES.LEFT_KNEE];
  const rightKnee = landmarks.keypoints[KEYPOINT_INDICES.RIGHT_KNEE];

  if (!leftHip || !rightHip || !leftKnee || !rightKnee) {
    return bodyLengthCm;
  }

  // Calculate body angle relative to vertical
  const hipY = (leftHip.y + rightHip.y) / 2;
  const kneeY = (leftKnee.y + rightKnee.y) / 2;
  const legTilt = Math.atan2(kneeY - hipY, 10.0);

  // Apply tilt correction (small angle approximation)
  const tiltCorrectionFactor = 1.0 + legTilt * Math.abs(legTilt) * 0.1;

  return bodyLengthCm * Math.max(0.95, Math.min(1.05, tiltCorrectionFactor));
}

/**
 * Calculates measurement confidence score
 */
function calculateConfidence(landmarks: PoseLandmarks): number {
  const keyLandmarkIndices = [
    KEYPOINT_INDICES.NOSE,
    KEYPOINT_INDICES.LEFT_SHOULDER,
    KEYPOINT_INDICES.RIGHT_SHOULDER,
    KEYPOINT_INDICES.LEFT_ANKLE,
    KEYPOINT_INDICES.RIGHT_ANKLE,
  ];

  const confidences = keyLandmarkIndices
    .map((idx) => landmarks.keypoints[idx]?.score ?? 0)
    .filter((score) => score > 0);

  if (confidences.length === 0) return 0;

  const avgConfidence =
    confidences.reduce((sum, score) => sum + score, 0) / confidences.length;

  // Check for wide stance
  const leftAnkle = landmarks.keypoints[KEYPOINT_INDICES.LEFT_ANKLE];
  const rightAnkle = landmarks.keypoints[KEYPOINT_INDICES.RIGHT_ANKLE];

  if (leftAnkle && rightAnkle) {
    const ankleSeparation = Math.abs(leftAnkle.x - rightAnkle.x);
    if (ankleSeparation > 30) {
      return avgConfidence * 0.8;
    }
  }

  return Math.max(0, Math.min(1, avgConfidence));
}

/**
 * Generates diagnostic notes about measurement quality
 */
function generateNotes(
  confidence: number,
  cameraDistance: number,
  heightCm: number,
  landmarks: PoseLandmarks,
): string {
  const notes: string[] = [];

  if (confidence < 0.6) {
    notes.push('Low confidence: improve lighting and pose clarity');
  }

  if (cameraDistance < 50 || cameraDistance > 200) {
    notes.push(`Camera distance estimate unusual: ${cameraDistance.toFixed(0)}cm`);
  }

  if (heightCm < 80 || heightCm > 180) {
    notes.push('Height estimate outside typical range for children');
  }

  const leftShoulder = landmarks.keypoints[KEYPOINT_INDICES.LEFT_SHOULDER];
  const rightShoulder = landmarks.keypoints[KEYPOINT_INDICES.RIGHT_SHOULDER];

  if (leftShoulder && rightShoulder) {
    if (Math.abs(leftShoulder.y - rightShoulder.y) > 20) {
      notes.push('Shoulders are tilted significantly');
    }
  }

  return notes.length > 0 ? notes.join('; ') : 'Measurement successful';
}

/**
 * Main function: calculates child height from pose landmarks
 * Returns null if measurement cannot be made
 */
export function calculateHeight(
  landmarks: PoseLandmarks,
  imageWidth: number = 1080,
  imageHeight: number = 1440,
): HeightMeasurement | null {
  if (!validateLandmarks(landmarks)) {
    return null;
  }

  // Extract head (nose) and heel positions
  const nose = landmarks.keypoints[KEYPOINT_INDICES.NOSE];
  const leftAnkle = landmarks.keypoints[KEYPOINT_INDICES.LEFT_ANKLE];
  const rightAnkle = landmarks.keypoints[KEYPOINT_INDICES.RIGHT_ANKLE];
  const leftShoulder = landmarks.keypoints[KEYPOINT_INDICES.LEFT_SHOULDER];
  const rightShoulder = landmarks.keypoints[KEYPOINT_INDICES.RIGHT_SHOULDER];

  if (
    !nose ||
    !leftShoulder ||
    !rightShoulder ||
    (!leftAnkle && !rightAnkle)
  ) {
    return null;
  }

  // Select heel with better confidence
  const heelPos =
    leftAnkle && rightAnkle
      ? leftAnkle.score > rightAnkle.score
        ? leftAnkle
        : rightAnkle
      : leftAnkle || rightAnkle;

  if (!heelPos) return null;

  // Step 1: Estimate camera distance
  const cameraDistanceCm = estimateCameraDistance(leftShoulder, rightShoulder);

  // Step 2: Compute body length
  let bodyLengthCm = computeBodyLength(nose, heelPos, cameraDistanceCm);

  // Step 3: Refine estimate
  const refinedHeightCm = refineHeightEstimate(bodyLengthCm, landmarks);

  // Step 4: Calculate confidence
  const confidence = calculateConfidence(landmarks);

  // Step 5: Generate diagnostic notes
  const notes = generateNotes(confidence, cameraDistanceCm, refinedHeightCm, landmarks);

  // Clamp to realistic height range
  const heightCm = Math.max(50, Math.min(200, refinedHeightCm));

  return {
    heightCm,
    heightInches: heightCm / 2.54,
    confidence,
    headPosition: {
      x: nose.x,
      y: nose.y,
      z: nose.z ?? 0,
    },
    heelPosition: {
      x: heelPos.x,
      y: heelPos.y,
      z: heelPos.z ?? 0,
    },
    pixelDistance: distancePixels(nose, heelPos),
    calibrationFactor: CALIBRATION.focalLengthPx,
    timestamp: new Date(),
    notes,
    isReliable: confidence > 0.7,
  };
}
