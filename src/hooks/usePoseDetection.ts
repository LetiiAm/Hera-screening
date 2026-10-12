import { useCallback, useEffect, useRef, useState } from 'react';
import {
  detectPose,
  disposePoseDetector,
  initializePoseDetector,
  PoseLandmarks,
} from '@/lib/pose-detector';

export interface UsePoseDetectionOptions {
  onPoseDetected?: (pose: PoseLandmarks[]) => void;
  onError?: (error: Error) => void;
  frameSkip?: number;
}

export function usePoseDetection(options: UsePoseDetectionOptions = {}) {
  const { onPoseDetected, onError, frameSkip = 2 } = options;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frameCountRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize pose detector
  useEffect(() => {
    const init = async () => {
      try {
        await initializePoseDetector();
        setIsInitialized(true);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error.message);
        onError?.(error);
      }
    };

    init();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      disposePoseDetector();
    };
  }, [onError]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      if (!videoRef.current) {
        throw new Error('Video element not found');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Wait for video to load
      await new Promise<void>((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => resolve();
        }
      });

      setError(null);
      setIsDetecting(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      onError?.(error);
    }
  }, [onError]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsDetecting(false);
  }, []);

  // Main detection loop
  const detectFrame = useCallback(async () => {
    if (!videoRef.current || !isInitialized) return;

    frameCountRef.current++;

    // Skip frames for performance
    if (frameCountRef.current % frameSkip !== 0) {
      animationFrameRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    try {
      const poses = await detectPose(videoRef.current);

      if (poses) {
        onPoseDetected?.(poses);
      }
    } catch (err) {
      console.error('Detection error:', err);
    }

    animationFrameRef.current = requestAnimationFrame(detectFrame);
  }, [isInitialized, frameSkip, onPoseDetected]);

  // Start detection when isDetecting changes
  useEffect(() => {
    if (isDetecting && isInitialized) {
      animationFrameRef.current = requestAnimationFrame(detectFrame);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDetecting, isInitialized, detectFrame]);

  return {
    videoRef,
    canvasRef,
    isInitialized,
    isDetecting,
    error,
    startCamera,
    stopCamera,
  };
}
