import React from 'react';

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
  return <div className={`bg-gray-200 dark:bg-gray-700 animate-pulse rounded ${className}`} />;
}
