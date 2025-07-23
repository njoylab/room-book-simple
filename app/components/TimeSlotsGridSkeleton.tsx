export function TimeSlotsGridSkeleton() {
  // Generate 20 skeleton slots (typical for 8 AM - 6 PM with 30-min slots)
  const skeletonSlots = Array.from({ length: 20 }, (_, index) => index);

  return (
    <>
      {/* Main grid skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {skeletonSlots.map((_, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border-2 border-gray-100 bg-gray-50/50 animate-pulse"
            >
              {/* Time slot skeleton */}
              <div className="h-4 bg-gray-200 rounded-md mb-3 w-28"></div>
              {/* Status skeleton */}
              <div className="h-3 bg-gray-150 rounded-md w-20 mb-1"></div>
              {/* Optional note skeleton - only for some slots */}
              {index % 4 === 0 && (
                <div className="h-3 bg-gray-100 rounded-md w-16 mt-2"></div>
              )}
            </div>
          ))}
        </div>

        {/* Empty state skeleton for when no slots */}
        <div className="hidden">
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded-md w-48 mx-auto mb-2 animate-pulse"></div>
            <div className="h-3 bg-gray-150 rounded-md w-64 mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Legend skeleton */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-center space-x-8 text-sm flex-wrap gap-y-3">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-200 rounded mr-3 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded-md w-16 animate-pulse"></div>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-200 rounded mr-3 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded-md w-14 animate-pulse"></div>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-200 rounded mr-3 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded-md w-12 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="mt-4 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Loading available time slots...</span>
        </div>
      </div>
    </>
  );
}