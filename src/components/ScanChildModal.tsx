'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Video, X } from 'lucide-react';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { calculateHeight, HeightMeasurement } from '@/lib/height-calculator';
import { PoseLandmarks } from '@/lib/pose-detector';
import HeightMeasurementCard from './HeightMeasurementCard';
import PoseOverlay from './PoseOverlay';

export interface ScanChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHeightMeasured?: (measurement: HeightMeasurement) => void;
  childName?: string;
}

export default function ScanChildModal({
  isOpen,
  onClose,
  onHeightMeasured,
  childName = 'Child',
}: ScanChildModalProps) {
  const [measurement, setMeasurement] = useState<HeightMeasurement | null>(null);
  const [lastPose, setLastPose] = useState<PoseLandmarks | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<string>('Initializing...');

  const { videoRef, isInitialized, isDetecting, error, startCamera, stopCamera } =
    usePoseDetection({
      onPoseDetected: (poses) => {
        if (poses.length > 0) {
          setLastPose(poses[0]);
          setDetectionStatus('Pose detected. Ready to measure.');
        }
      },
      onError: (err) => {
        setDetectionStatus(`Error: ${err.message}`);
      },
      frameSkip: 3,
    });

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    if (isInitialized && !isDetecting) {
      startCamera();
    }
  }, [isOpen, isInitialized, isDetecting, startCamera, stopCamera]);

  useEffect(() => {
    if (!isInitialized) {
      setDetectionStatus('Initializing pose detector...');
    } else if (!isDetecting) {
      setDetectionStatus('Starting camera...');
    } else if (isDetecting && !lastPose) {
      setDetectionStatus('Camera ready. Please stand in front of the camera.');
    }
  }, [isInitialized, isDetecting, lastPose]);

  const handleCapture = () => {
    if (!lastPose) {
      setDetectionStatus('No pose detected. Please adjust your position.');
      return;
    }

    setIsCapturing(true);

    // Calculate height from current pose
    const calculatedMeasurement = calculateHeight(lastPose);

    if (calculatedMeasurement) {
      setMeasurement(calculatedMeasurement);
      setDetectionStatus('Height measurement captured successfully!');
      onHeightMeasured?.(calculatedMeasurement);
    } else {
      setDetectionStatus(
        'Could not calculate height. Please ensure full body is visible.',
      );
    }

    setIsCapturing(false);
  };

  const handleClose = () => {
    stopCamera();
    setMeasurement(null);
    setLastPose(null);
    setDetectionStatus('Initializing...');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan {childName}</DialogTitle>
          <DialogDescription>
            Capture a full-body pose to measure height using AI pose detection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Feed */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            {isDetecting && videoRef.current && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <PoseOverlay videoRef={videoRef} pose={lastPose} />
              </>
            )}
            {!isDetecting && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Status and Controls */}
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-slate-100 border border-slate-200">
              <p className="text-sm font-medium text-slate-900">
                {error ? `Error: ${error}` : detectionStatus}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCapture}
                disabled={!lastPose || isCapturing || !isDetecting}
                className="flex-1"
                variant="default"
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Capture Measurement
                  </>
                )}
              </Button>
              <Button onClick={handleClose} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </div>

          {/* Measurement Result */}
          {measurement && <HeightMeasurementCard measurement={measurement} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
