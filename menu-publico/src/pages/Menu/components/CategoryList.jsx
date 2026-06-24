import React from 'react';
import './CategoryList.css';

export default function CategoryList({ categories, activeCategory, onSelect }) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="category-scroll-container">
      <div className="category-list">
        {categories.map(cat => (
          <button 
            key={cat.id} 
            className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => onSelect(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
