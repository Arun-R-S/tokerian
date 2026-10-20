import React, { useMemo } from 'react';
import { useChannelStore } from '../../stores/useChannelStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { isContentRestricted } from '../../utils/parentalLock';

export const CategoryPills: React.FC = () => {
  const groups = useChannelStore((s) => s.groups);
  const activeCategory = useChannelStore((s) => s.activeCategory);
  const setActiveCategory = useChannelStore((s) => s.setActiveCategory);

  const parentalLockEnabled = useSettingsStore((s) => s.parentalLockEnabled);
  const isSessionUnlocked = useSettingsStore((s) => s.isSessionUnlocked);
  const lockedKeywords = useSettingsStore((s) => s.lockedKeywords);

  const visibleGroups = useMemo(() => {
    if (!parentalLockEnabled || isSessionUnlocked) return groups;
    return groups.filter((g) => !isContentRestricted(g, undefined, lockedKeywords));
  }, [groups, parentalLockEnabled, isSessionUnlocked, lockedKeywords]);

  if (visibleGroups.length <= 1) return null;

  return (
    <div className="category-pills-container">
      <div className="category-pills-scroll">
        {visibleGroups.map((group) => {
          const isActive = activeCategory === group;
          return (
            <button
              key={group}
              type="button"
              tabIndex={0}
              onClick={() => setActiveCategory(group)}
              className={`category-pill ${isActive ? 'category-pill-active' : ''}`}
            >
              {group}
            </button>
          );
        })}
      </div>
    </div>
  );
};
