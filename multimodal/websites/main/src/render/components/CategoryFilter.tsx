import React from 'react';
import { Button } from '@nextui-org/react';
import { Category } from '../../data/showcaseData';

interface CategoryFilterProps {
  categories: (Category & { count: number })[];
  activeCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
}) => {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap gap-2">
        <Button
          key="all"
          size="sm"
          radius="full"
          variant={activeCategory === 'all' ? 'solid' : 'flat'}
          className={`
            ${
              activeCategory === 'all'
                ? 'bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }
            transition-all duration-300
          `}
          onClick={() => onSelectCategory('all')}
        >
          All
          <span className="ml-1 text-xs">
            ({categories.reduce((acc, cat) => acc + cat.count, 0)})
          </span>
        </Button>

        {categories.map(category => (
          <Button
            key={category.id}
            size="sm"
            radius="full"
            variant={activeCategory === category.id ? 'solid' : 'flat'}
            className={`
              ${
                activeCategory === category.id
                  ? 'bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }
              transition-all duration-300
            `}
            onClick={() => onSelectCategory(category.id)}
          >
            {category.name}
            <span className="ml-1 text-xs">({category.count})</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
