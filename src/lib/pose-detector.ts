import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

let detector: poseDetection.PoseDetector | null = null;
let isInitializing = false;
let initializationPromise: Promise<poseDetection.PoseDetector> | null = null;

export interface PoseKeypoint {
  x: number;
  y: number;
  z?: number;
  score: number;
  name?: string;
}

export interface PoseLandmarks {
  keypoints: PoseKeypoint[];
  score?: number;
}

/**
 * Initialize the MediaPipe Pose detector with GPU acceleration
 */
export async function initializePoseDetector(): Promise<poseDetection.PoseDetector> {
  if (detector) {
    return detector;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  isInitializing = true;

  initializationPromise = (async () => {
    try {
      // Ensure TensorFlow is ready
      await tf.ready();

      detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.BlazePose,
        {
          runtime: 'tfjs',
          enableSmoothing: true,
          modelType: 'lite', // Use lite model for faster inference on web
        },
      );

      isInitializing = false;
      return detector as poseDetection.PoseDetector;
    } catch (error) {
      isInitializing = false;
      initializationPromise = null;
      throw new Error(`Failed to initialize pose detector: ${error}`);
    }
  })();

  return initializationPromise;
}

/**
 * Detect pose landmarks from a video element
 */
export async function detectPose(video: HTMLVideoElement): Promise<PoseLandmarks[] | null> {
  if (!detector) {
    detector = await initializePoseDetector();
  }

  try {
    const poses = await detector.estimatePoses(video, {
      maxPoses: 1,
      flipHorizontal: false,
    });

    if (!poses || poses.length === 0) {
      return null;
    }

    return poses.map((pose) => ({
      keypoints: pose.keypoints.map((kp) => ({
        x: kp.x,
        y: kp.y,
        z: kp.z,
        score: kp.score ?? 0,
        name: kp.name,
      })),
      score: pose.score,
    }));
  } catch (error) {
    console.error('Pose detection error:', error);
    return null;
  }
}

/**
 * Get a specific keypoint by name
 */
export function getKeypointByName(
  landmarks: PoseLandmarks,
  name: string,
): PoseKeypoint | undefined {
  return landmarks.keypoints.find((kp) => kp.name === name);
}

/**
 * Dispose of detector and clean up resources
 */
export function disposePoseDetector(): void {
  if (detector) {
    detector.dispose();
    detector = null;
  }
  initializationPromise = null;
  isInitializing = false;
}
