import React from 'react';
import { useChannelStore } from '../../stores/useChannelStore';

export const CategoryPills: React.FC = () => {
  const groups = useChannelStore((s) => s.groups);
  const activeCategory = useChannelStore((s) => s.activeCategory);
  const setActiveCategory = useChannelStore((s) => s.setActiveCategory);

  if (groups.length <= 1) return null;

  return (
    <div className="category-pills-container">
      <div className="category-pills-scroll">
        {groups.map((group) => {
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
