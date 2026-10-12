# MediaPipe Pose Detection Integration

This project integrates on-device, offline-first height measurement using MediaPipe's BlazePose landmarking model running directly in the browser.

## Architecture

### Components

1. **Pose Detector Service** (`src/lib/pose-detector.ts`)
   - Initializes MediaPipe BlazePose model
   - Runs inference on video frames using TensorFlow.js
   - Returns normalized keypoint coordinates
   - **No cloud dependency** — all processing happens locally

2. **Height Calculator** (`src/lib/height-calculator.ts`)
   - Implements pinhole camera model for 3D reconstruction
   - Computes Euclidean distance from head (nose) to heel (ankle) in pixels
   - Estimates camera distance using reference shoulder width (26cm for children)
   - Applies perspective correction and posture validation
   - Returns confidence score and diagnostic notes

3. **Pose Detection Hook** (`src/hooks/usePoseDetection.ts`)
   - React hook managing camera stream lifecycle
   - Handles WebRTC permissions and video element setup
   - Implements frame skipping for performance optimization
   - Provides event callbacks for pose detection

4. **UI Components**
   - `ScanChildModal.tsx` — Full-screen camera interface with capture button
   - `PoseOverlay.tsx` — Real-time skeleton visualization on canvas
   - `HeightMeasurementCard.tsx` — Result display with confidence metrics
   - `ScanChildButton.tsx` — Trigger button for the scanning workflow

5. **Local Storage** (`src/lib/storage.ts`)
   - Persists measurements locally without network
   - Associates measurements with child ID and name
   - Enables offline-first workflow

### Measurement Algorithm

#### Step 1: Pose Detection
```
Input: Video frame from camera
Model: MediaPipe BlazePose (Lite)
Output: 17 keypoints with (x, y, z, confidence)
```

#### Step 2: Validation
```
Required keypoints:
- NOSE (head proxy): score > 0.5
- LEFT_SHOULDER, RIGHT_SHOULDER: score > 0.5
- LEFT_ANKLE or RIGHT_ANKLE (heel): score > 0.5
```

#### Step 3: Camera Distance Estimation
```
Reference: Average child shoulder width = 26cm
Formula:  distance_cm = (ref_width_cm * focal_length_px) / shoulder_px
Clamped:  50cm to 200cm (realistic range)
```

#### Step 4: Height Calculation
```
Pixel distance: d_px = sqrt((x_nose - x_ankle)^2 + (y_nose - y_ankle)^2)
Pinhole model:  height_cm = (d_px * distance_cm) / focal_length_px
Focal length:   800px (typical smartphone camera)
```

#### Step 5: Refinement
```
Posture check:  Detect forward/backward tilt from hip-knee angle
Tilt correction: Apply 0.95 to 1.05x multiplier based on angle
```

#### Step 6: Confidence Scoring
```
Average confidence of 5 key joints:
- If ankle separation > 30px (wide stance): multiply by 0.8
- Final range: 0.0 to 1.0
- Reliable threshold: > 0.7
```

## Usage

### Basic Integration

```tsx
import ScanChildButton from '@/components/ScanChildButton';
import { saveMeasurementLocally } from '@/lib/storage';

export function ChildProfile({ childId, childName }) {
  return (
    <ScanChildButton
      childName={childName}
      onHeightMeasured={(measurement) => {
        // Save locally
        saveMeasurementLocally(measurement, childId, childName);
        // Or send to backend
        fetch('/api/measurements', {
          method: 'POST',
          body: JSON.stringify({ childId, measurement }),
        });
      }}
    />
  );
}
```

### Direct Hook Usage

```tsx
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { calculateHeight } from '@/lib/height-calculator';

export function CustomPoseComponent() {
  const { videoRef, isDetecting, startCamera, stopCamera } = usePoseDetection({
    onPoseDetected: (poses) => {
      const measurement = calculateHeight(poses[0]);
      console.log('Height:', measurement?.heightCm, 'cm');
    },
    frameSkip: 2,
  });

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline />
      <button onClick={startCamera}>Start</button>
      <button onClick={stopCamera}>Stop</button>
    </div>
  );
}
```

## Dependencies

```json
{
  "@tensorflow/tfjs": "^4.x",
  "@tensorflow-models/pose-detection": "^2.x"
}
```

Install with:
```bash
npm install @tensorflow/tfjs @tensorflow-models/pose-detection
```

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14.1+
- ⚠️ Requires HTTPS or localhost (for camera access)
- ⚠️ WebGL support required for TensorFlow.js GPU acceleration

## Performance Considerations

- **Model Size**: ~3-5 MB (downloaded once, cached)
- **Inference Time**: ~30-50ms per frame (GPU) / 100-200ms (CPU)
- **Memory**: ~100-150 MB peak (video decoder + model)
- **Frame Skip**: Default 3 frames (process every 4th frame for responsiveness)
- **No Network**: All computation happens on-device

## Accuracy & Validation

### Expected Accuracy
- Height accuracy within ±5-10% under good conditions
- Confidence > 0.7 indicates reliable measurement
- Best results with:
  - Good lighting (natural or bright indoor)
  - Child standing upright and still
  - Full body visible in frame
  - Camera ~1-2 meters away

### Quality Checks
- Validation of keypoint confidence scores
- Posture angle detection (tilt correction)
- Shoulder width sanity checks
- Height range validation (50-200cm)
- Stance width analysis (wide = lower confidence)

## Offline Sync Pattern

For integration with SMS-based or offline sync:

```tsx
import { OfflineSyncService } from '@/lib/sync';
import { saveMeasurementLocally } from '@/lib/storage';

const measurement = calculateHeight(pose);
const stored = saveMeasurementLocally(measurement, childId, childName);

// Queue for SMS transmission
await syncService.enqueue(stored.id, 'height_measurement', {
  height_cm: measurement.heightCm,
  confidence: measurement.confidence,
  timestamp: measurement.timestamp.toISOString(),
});
```

## Troubleshooting

### "Camera permission denied"
- Ensure site is HTTPS (or localhost)
- Check browser camera permissions settings
- Reload page and grant permission

### "Pose detection failed"
- Ensure good lighting
- Position full body in frame
- Move closer to camera
- Check browser console for TensorFlow.js errors

### "Low confidence measurement"
- Improve lighting conditions
- Ensure child is standing upright
- Move further from camera (optimal ~1-2m distance)
- Check that feet are clearly visible

### "Slow inference"
- Device may not have GPU acceleration
- Check Chrome DevTools Performance tab
- Increase frameSkip value to reduce processing frequency
- Consider using lite model (already set)

## API Reference

### `initializePoseDetector()`
Initializes and caches the MediaPipe BlazePose detector.
```typescript
const detector = await initializePoseDetector();
```

### `detectPose(video)`
Detects poses in a video element.
```typescript
const poses = await detectPose(videoElement);
// poses[0].keypoints[0] = { x, y, z, score, name }
```

### `calculateHeight(landmarks, imageWidth, imageHeight)`
Calculates height from pose landmarks.
```typescript
const measurement = calculateHeight(pose);
// Returns HeightMeasurement | null
```

### `usePoseDetection(options)`
React hook for camera + pose detection workflow.
```typescript
const {
  videoRef,
  canvasRef,
  isInitialized,
  isDetecting,
  error,
  startCamera,
  stopCamera,
} = usePoseDetection({
  onPoseDetected: (poses) => {},
  onError: (error) => {},
  frameSkip: 2,
});
```

## Future Enhancements

- [ ] Multi-pose support (measure multiple children simultaneously)
- [ ] Calibration screen (capture reference object)
- [ ] Age-based height prediction and growth percentile
- [ ] Video recording and export
- [ ] Batch processing from image files
- [ ] 3D model reconstruction
- [ ] WebAssembly optimization for faster inference
