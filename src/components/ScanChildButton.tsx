'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import ScanChildModal from './ScanChildModal';
import { HeightMeasurement } from '@/lib/height-calculator';

export interface ScanChildButtonProps {
  childName?: string;
  onHeightMeasured?: (measurement: HeightMeasurement) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export default function ScanChildButton({
  childName = 'Child',
  onHeightMeasured,
  variant = 'default',
  size = 'default',
  className,
}: ScanChildButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleHeightMeasured = (measurement: HeightMeasurement) => {
    onHeightMeasured?.(measurement);
    // Optionally close modal after a delay to show the result
    setTimeout(() => {
      setIsModalOpen(false);
    }, 3000);
  };

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant={variant}
        size={size}
        className={className}
      >
        <Camera className="w-4 h-4 mr-2" />
        Scan {childName}
      </Button>

      <ScanChildModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onHeightMeasured={handleHeightMeasured}
        childName={childName}
      />
    </>
  );
}
