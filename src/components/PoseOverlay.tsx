'use client';

import { useEffect, useRef } from 'react';
import { PoseLandmarks, PoseKeypoint } from '@/lib/pose-detector';

const KEYPOINT_CONNECTIONS = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4],
  [5, 6],
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
  [5, 11],
  [6, 12],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
];

export interface PoseOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  pose: PoseLandmarks | null;
}

export default function PoseOverlay({ videoRef, pose }: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    const updateCanvasSize = () => {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    };

    updateCanvasSize();
    video.addEventListener('loadedmetadata', updateCanvasSize);

    const drawPose = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!pose || !pose.keypoints) {
        requestAnimationFrame(drawPose);
        return;
      }

      const keypoints = pose.keypoints;
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;

      // Draw connections (skeleton)
      ctx.strokeStyle = '#00CCEA';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const [start, end] of KEYPOINT_CONNECTIONS) {
        const startKp = keypoints[start];
        const endKp = keypoints[end];

        if (!startKp || !endKp || !startKp.score || !endKp.score) continue;
        if (startKp.score < 0.5 || endKp.score < 0.5) continue;

        ctx.beginPath();
        ctx.moveTo(startKp.x * scaleX, startKp.y * scaleY);
        ctx.lineTo(endKp.x * scaleX, endKp.y * scaleY);
        ctx.stroke();
      }

      // Draw keypoints
      for (const keypoint of keypoints) {
        if (!keypoint.score || keypoint.score < 0.5) continue;

        ctx.fillStyle = keypoint.score > 0.7 ? '#00FF00' : '#FFAA00';
        ctx.beginPath();
        ctx.arc(keypoint.x * scaleX, keypoint.y * scaleY, 5, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw head-to-heel line (measurement axis)
      const nose = keypoints[0];
      const leftAnkle = keypoints[15];
      const rightAnkle = keypoints[16];

      if (nose && (leftAnkle || rightAnkle)) {
        const ankle =
          leftAnkle && rightAnkle
            ? leftAnkle.score > rightAnkle.score
              ? leftAnkle
              : rightAnkle
            : leftAnkle || rightAnkle;

        if (ankle && nose.score && ankle.score) {
          ctx.strokeStyle = '#FF0000';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(nose.x * scaleX, nose.y * scaleY);
          ctx.lineTo(ankle.x * scaleX, ankle.y * scaleY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      requestAnimationFrame(drawPose);
    };

    const animationFrame = requestAnimationFrame(drawPose);

    return () => {
      cancelAnimationFrame(animationFrame);
      video.removeEventListener('loadedmetadata', updateCanvasSize);
    };
  }, [videoRef, pose]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{
        transform: 'scaleX(-1)',
      }}
    />
  );
}
