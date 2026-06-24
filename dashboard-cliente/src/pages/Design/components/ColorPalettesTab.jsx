import React, { useState, useEffect } from 'react';
import { PALETTES } from './palettesRegistry';

const CATEGORIES = [
  { id: 'all', name: 'Todos' },
  { id: 'classic', name: 'Originales' },
  { id: 'bakery', name: 'Bakery' },
  { id: 'fastfood', name: 'Rápida' },
  { id: 'bars', name: 'Tragos' },
  { id: 'asian', name: 'Asiático' },
  { id: 'healthy', name: 'Green' },
  { id: 'retro', name: 'Cozy' },
  { id: 'luxury', name: 'Lujo' },
  { id: 'thematic', name: 'Temáticos' }
];

const getPaletteCategory = (id) => {
  const bakery = ['sweet-caramel', 'strawberry-cream', 'blue-berry', 'lemon-pie', 'mint-choco', 'pistachio-dream', 'red-velvet', 'dark-truffle', 'cinnamon-roll', 'passion-fruit'];
  const fastfood = ['retro-diner', 'classic-burger', 'spicy-taco', 'crispy-chicken', 'neon-arcade', 'bbq-smokehouse', 'street-vendor', 'pizza-party', 'hot-dog', 'fry-box'];
  const bars = ['margarita-lime', 'blue-lagoon', 'cosmopolitan', 'irish-pub', 'whisky-neat', 'mojito-fresh', 'aperol-spritz', 'neon-bar', 'wine-cellar', 'gin-tonic'];
  const asian = ['sushi-salmon', 'wasabi-ginger', 'zen-garden', 'tokyo-noir', 'matcha-tea', 'golden-dragon', 'sakura-night', 'teriyaki-glaze', 'bamboo-forest', 'kyoto-temple'];
  const healthy = ['super-green', 'sweet-beet', 'coconut-water', 'chia-seed', 'acai-bowl', 'turmeric-latte', 'avocado-toast', 'orange-ginger', 'garden-salad', 'earthy-root'];
  const retro = ['retro-70s', 'vintage-postcard', 'cozy-fireplace', 'warm-blanket', 'autumn-leaves', 'grandmas-kitchen', 'record-store', 'rustic-cabin', 'book-nook', 'boho-chic'];
  const luxury = ['luxury-black-gold', 'silver-platinum', 'rose-gold-marble', 'velvet-blue', 'monaco-white', 'champagne-toast', 'charcoal-copper', 'emerald-gold', 'nordic-wood', 'minimal-dark-mode'];
  const thematic = ['sweet-cotton-candy', 'sea-breeze', 'spicy-curry', 'tutti-frutti', 'ice-cream-parlor', 'summer-camp', 'glacier-ice', 'desert-sand', 'space-odyssey', 'lavender-field'];

  if (bakery.includes(id)) return 'bakery';
  if (fastfood.includes(id)) return 'fastfood';
  if (bars.includes(id)) return 'bars';
  if (asian.includes(id)) return 'asian';
  if (healthy.includes(id)) return 'healthy';
  if (retro.includes(id)) return 'retro';
  if (luxury.includes(id)) return 'luxury';
  if (thematic.includes(id)) return 'thematic';
  return 'classic';
};

const ITEMS_PER_PAGE = 12;

export default function ColorPalettesTab({ config, setConfig }) {
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when query or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCat, searchQuery]);

  const activePaletteId = (() => {
    return PALETTES.find(p => {
      return Object.keys(p.config).every(key => config[key] === p.config[key]);
    })?.id || 'custom';
  })();

  const applyThemeColors = (targetConfig) => {
    const finalConfig = { ...targetConfig };
    const primary = targetConfig.primaryColor;

    if (primary) {
      // Sync Add Button if not specifically overridden in palette
      if (!targetConfig.addButtonColor) {
        finalConfig.addButtonColor = primary;
        
        // Helper to determine contrast for text
        const hex = primary.replace('#', '');
        let r = 0, g = 0, b = 0;
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16) || 0;
          g = parseInt(hex[1] + hex[1], 16) || 0;
          b = parseInt(hex[2] + hex[2], 16) || 0;
        } else {
          r = parseInt(hex.substring(0, 2), 16) || 0;
          g = parseInt(hex.substring(2, 4), 16) || 0;
          b = parseInt(hex.substring(4, 6), 16) || 0;
        }
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        finalConfig.addButtonTextColor = brightness < 140 ? '#ffffff' : '#000000';
      }

      // Sync Subcategory Text Color
      if (!targetConfig.subcatTextColor) {
        finalConfig.subcatTextColor = primary;
      }

      // Sync Separator Color
      if (!targetConfig.cardSeparatorColor) {
        finalConfig.cardSeparatorColor = primary;
      }
    }
    return finalConfig;
  };

  const handleApplyPalette = (palette) => {
    // Las paletas de colores SOLO deben afectar a los colores.
    // No reiniciamos anchos de imagen, márgenes ni otras características.
    setConfig(prev => ({
      ...prev,
      ...applyThemeColors(palette.config)
    }));
  };

  const filteredPalettes = PALETTES.filter(palette => {
    const matchesCat = selectedCat === 'all' || getPaletteCategory(palette.id) === selectedCat;
    const matchesSearch = palette.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          palette.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalPages = Math.ceil(filteredPalettes.length / ITEMS_PER_PAGE) || 1;
  const paginatedPalettes = filteredPalettes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="color-palettes-tab" style={{ padding: '0.85rem', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.15rem' }}>
            Paletas de Colores Curadas (100 Opciones)
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: '1.3' }}>
            Selecciona una paleta prediseñada para cambiar instantáneamente la combinación cromática de tu carta.
          </p>
        </div>

        {/* Search input - more compact */}
        <div style={{ width: '100%' }}>
          <input 
            type="text" 
            placeholder="🔍 Buscar paleta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '0.8rem',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Categories tag bar - tighter spacing */}
        <div style={{
          display: 'flex',
          gap: '0.35rem',
          overflowX: 'auto',
          paddingBottom: '4px',
          WebkitOverflowScrolling: 'touch',
          maxWidth: '100%'
        }} className="categories-pill-container">
          {CATEGORIES.map(cat => {
            const isCatActive = selectedCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '14px',
                  border: isCatActive ? '1px solid var(--primary)' : '1px solid #e2e8f0',
                  backgroundColor: isCatActive ? 'var(--primary)' : '#ffffff',
                  color: isCatActive ? '#ffffff' : '#475569',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s'
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid containing cards - columns changed to minmax 210px instead of 280px */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: '0.85rem',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {paginatedPalettes.map((palette) => {
          const isActive = activePaletteId === palette.id;
          return (
            <div 
              key={palette.id}
              onClick={() => handleApplyPalette(palette)}
              style={{
                background: '#ffffff',
                border: isActive ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                borderRadius: '10px',
                padding: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 6px 14px rgba(37, 99, 235, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                position: 'relative',
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}
              className="palette-card"
            >
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  fontSize: '0.55rem',
                  fontWeight: 'bold',
                  padding: '1px 6px',
                  borderRadius: '8px',
                  textTransform: 'uppercase'
                }}>
                  Activa
                </div>
              )}
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.2rem', paddingRight: isActive ? '45px' : '0' }}>
                {palette.name}
              </h4>
              <p style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '0.65rem', lineHeight: '1.2', minHeight: '28px' }}>
                {palette.description}
              </p>

              {/* Color Stripes - smaller height */}
              <div style={{
                display: 'flex',
                height: '24px',
                borderRadius: '6px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0'
              }}>
                {palette.colors.map((color, idx) => (
                  <div 
                    key={idx}
                    style={{
                      flex: 1,
                      backgroundColor: color,
                      position: 'relative'
                    }}
                    title={`Color ${idx + 1}: ${color}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filteredPalettes.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '2rem 1rem',
          color: '#64748b'
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔍</div>
          <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>No se encontraron paletas.</p>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '1.25rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid #e2e8f0',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{
              padding: '5px 12px',
              fontSize: '0.72rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: currentPage === 1 ? '#cbd5e1' : '#475569',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
          >
            ◀ Anterior
          </button>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
            Pág. {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{
              padding: '5px 12px',
              fontSize: '0.72rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: currentPage === totalPages ? '#cbd5e1' : '#475569',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Siguiente ▶
          </button>
        </div>
      )}
    </div>
  );
}
