'use client';

import { formatSlotTime } from '@/utils/slots';

interface LocalTimeRangeProps {
  startTime: string;
  endTime: string;
}

export function LocalTimeRange({ startTime, endTime }: LocalTimeRangeProps) {
  return <span>{formatSlotTime(startTime)} - {formatSlotTime(endTime)}</span>;
}
