/**
 * @fileoverview Tag filter component for filtering meeting rooms by tags
 * @description Provides interactive tag chips for filtering rooms on the home page,
 * with state persisted in URL for shareability.
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Props for the TagFilter component
 * @interface TagFilterProps
 */
interface TagFilterProps {
  /** Available tags to display as filter options */
  availableTags: string[];
}

/**
 * Tag filter component that displays clickable tag chips for filtering rooms
 * @param {TagFilterProps} props - Component props
 * @returns {JSX.Element | null} Rendered tag filter component or null if no tags
 * @description Displays:
 * - "All" button to clear filter (default state)
 * - Tag chips for each available tag
 * - Selected tag has filled style, others have outline style
 * - Updates URL with ?tag=TagName on click
 * @example
 * ```tsx
 * <TagFilter availableTags={['Video Conference', 'Whiteboard', 'Large Screen']} />
 * ```
 */
export function TagFilter({ availableTags }: TagFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /** Get currently selected tag from URL */
  const selectedTag = searchParams.get('tag');

  /**
   * Handle tag selection
   * @param tag - The tag to select, or null to clear selection
   */
  const handleTagClick = useCallback((tag: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (tag === null) {
      params.delete('tag');
    } else {
      params.set('tag', tag);
    }

    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : '/', { scroll: false });
  }, [router, searchParams]);

  // Don't render if no tags available
  if (availableTags.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        {/* All button */}
        <button
          onClick={() => handleTagClick(null)}
          className={`
            px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
            ${!selectedTag
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
        >
          All
        </button>

        {/* Tag chips */}
        {availableTags.map((tag) => (
          <button
            key={tag}
            onClick={() => handleTagClick(tag)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${selectedTag === tag
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }
            `}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
