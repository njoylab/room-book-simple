import type { BookingHook } from '../lib/booking-hooks';

// No-op default hooks file to keep builds stable when no custom hooks are needed.
export const hooks: BookingHook[] = [];
const defaultHook: BookingHook | undefined = undefined;
export default defaultHook;
