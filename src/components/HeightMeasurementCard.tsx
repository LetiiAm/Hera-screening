'use client';

import { HeightMeasurement } from '@/lib/height-calculator';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface HeightMeasurementCardProps {
  measurement: HeightMeasurement;
}

export default function HeightMeasurementCard({ measurement }: HeightMeasurementCardProps) {
  const confidenceColor = measurement.isReliable ? 'text-green-600' : 'text-orange-600';
  const confidencePercentage = (measurement.confidence * 100).toFixed(0);

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Height Measurement</CardTitle>
            <CardDescription>
              Measured at {measurement.timestamp.toLocaleTimeString()}
            </CardDescription>
          </div>
          {measurement.isReliable ? (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-orange-600" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Height Display */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-600">Height (cm)</p>
              <p className="text-3xl font-bold text-slate-900">
                {measurement.heightCm.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Height (inches)</p>
              <p className="text-3xl font-bold text-slate-900">
                {measurement.heightInches.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        {/* Confidence Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Measurement Confidence</p>
            <p className={`text-sm font-bold ${confidenceColor}`}>
              {confidencePercentage}%
            </p>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                measurement.isReliable ? 'bg-green-600' : 'bg-orange-600'
              }`}
              style={{
                width: `${measurement.confidence * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Reliability Status */}
        {!measurement.isReliable && (
          <Alert variant="default" className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Low confidence measurement. Consider retaking with better lighting and full body
              visibility.
            </AlertDescription>
          </Alert>
        )}

        {/* Diagnostic Information */}
        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-slate-700">Diagnostic Info</p>
              <p className="text-slate-600">{measurement.notes}</p>
            </div>
          </div>
        </div>

        {/* Measurement Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-100 p-2 rounded">
            <p className="text-slate-600">Pixel Distance</p>
            <p className="font-mono font-semibold">{measurement.pixelDistance.toFixed(0)} px</p>
          </div>
          <div className="bg-slate-100 p-2 rounded">
            <p className="text-slate-600">Calibration</p>
            <p className="font-mono font-semibold">{measurement.calibrationFactor.toFixed(0)}</p>
          </div>
          <div className="bg-slate-100 p-2 rounded">
            <p className="text-slate-600">Head Position</p>
            <p className="font-mono text-xs">
              ({measurement.headPosition.x.toFixed(0)}, {measurement.headPosition.y.toFixed(0)})
            </p>
          </div>
          <div className="bg-slate-100 p-2 rounded">
            <p className="text-slate-600">Heel Position</p>
            <p className="font-mono text-xs">
              ({measurement.heelPosition.x.toFixed(0)}, {measurement.heelPosition.y.toFixed(0)})
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
