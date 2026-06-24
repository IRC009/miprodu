import React from 'react';
import './Skeleton.css';

export const Skeleton = ({ width, height, borderRadius, margin }) => (
  <div 
    className="skeleton-base" 
    style={{ 
      width: width || '100%', 
      height: height || '20px', 
      borderRadius: borderRadius || '4px',
      margin: margin || '0'
    }} 
  />
);

export const MenuSkeleton = () => (
  <div className="menu-skeleton-container" style={{ padding: '1rem' }}>
    <Skeleton height="40px" width="60%" margin="0 auto 2rem auto" borderRadius="8px" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Skeleton height="150px" borderRadius="12px" />
          <Skeleton width="80%" height="18px" />
          <Skeleton width="40%" height="14px" />
        </div>
      ))}
    </div>
  </div>
);
