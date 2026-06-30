import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { getPublicMenu, getBranches } from '../../../services/menuService';

export default function HamburgerDrawer({ 
  isOpen, 
  onClose, 
  designConfig,
  restaurantId,
  restaurantName,
  isCustomDomain = false,
  slug = ''
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const branchParam = searchParams.get('branch');
  
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (isOpen && restaurantId) {
      getBranches(restaurantId).then(setBranches);
      getPublicMenu(restaurantId, branchParam).then(({ categories }) => {
        setCategories(categories);
      });
    }
  }, [isOpen, restaurantId, branchParam]);

  const onSelectCategoryAndSub = (catId, subId) => {
    const cat = categories.find(c => c.id === catId);
    if (cat) {
      const subParamVal = subId.toLowerCase();
      setSearchParams(
        branchParam 
          ? { branch: branchParam, category: cat.name.toLowerCase(), subcat: subParamVal } 
          : { category: cat.name.toLowerCase(), subcat: subParamVal }
      );
      if (!location.pathname.endsWith('/menu')) {
        const targetPath = isCustomDomain 
          ? `/menu?${branchParam ? `branch=${branchParam}&` : ''}category=${cat.name.toLowerCase()}&subcat=${encodeURIComponent(subParamVal)}` 
          : `/r/${slug}/menu?${branchParam ? `branch=${branchParam}&` : ''}category=${cat.name.toLowerCase()}&subcat=${encodeURIComponent(subParamVal)}`;
        navigate(targetPath);
      }
    }
  };

  const toggleCategory = (catId, e) => {
    e.stopPropagation();
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  if (!isOpen) return null;

  const selectedBranch = branches.find(b => b.id === branchParam) || branches[0];

  const onSelectBranch = (branchId) => {
    setSearchParams({ branch: branchId });
    // If not on menu page, navigate there
    if (!location.pathname.endsWith('/menu')) {
      const targetPath = isCustomDomain ? `/menu?branch=${branchId}` : `/r/${slug}/menu?branch=${branchId}`;
      navigate(targetPath);
    }
  };

  const onSelectCategory = (catId) => {
    const cat = categories.find(c => c.id === catId);
    if (cat) {
      setSearchParams(branchParam ? { branch: branchParam, category: cat.name.toLowerCase() } : { category: cat.name.toLowerCase() });
      if (!location.pathname.endsWith('/menu')) {
        const targetPath = isCustomDomain 
          ? `/menu?${branchParam ? `branch=${branchParam}&` : ''}category=${cat.name.toLowerCase()}` 
          : `/r/${slug}/menu?${branchParam ? `branch=${branchParam}&` : ''}category=${cat.name.toLowerCase()}`;
        navigate(targetPath);
      }
    }
  };

  const primaryColor = designConfig?.primaryColor || '#a07855'; // Default to a brown color like the photo
  const textColor = '#5a5a5a'; // Dark gray for text

  const toggleDropdown = (id, e) => {
    e.stopPropagation();
    setOpenDropdowns(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleLinkClick = (link, e) => {
    if (link.type === 'dropdown' || link.type === 'branches') {
      toggleDropdown(link.id, e);
    } else if (link.url) {
      if (link.url.startsWith('http')) {
        window.open(link.url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = link.url;
      }
    }
  };

  const renderRecursiveLinks = (links, level = 0) => {
    return links.map(link => (
      <div key={link.id} style={{ borderBottom: `1px solid ${primaryColor}` }}>
        <div 
          onClick={(e) => handleLinkClick(link, e)}
          style={{
            padding: `1rem 1rem 1rem ${1 + (level * 1.5)}rem`,
            color: level === 0 ? textColor : '#7a7a7a',
            fontFamily: 'var(--font-main)',
            fontSize: level === 0 ? '1.1rem' : '1rem',
            textTransform: level === 0 ? 'uppercase' : 'none',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{link.title}</span>
          {(link.type === 'dropdown' || link.type === 'branches') && (
            <span style={{ fontSize: '1.2rem', transform: openDropdowns[link.id] ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
              ▼
            </span>
          )}
        </div>

        {/* Dropdown Content */}
        {openDropdowns[link.id] && (
          <div style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
            {link.type === 'dropdown' && link.children && link.children.length > 0 && (
              renderRecursiveLinks(link.children, level + 1)
            )}

            {link.type === 'branches' && branches.map(branch => (
              <div 
                key={branch.id}
                onClick={() => {
                  onSelectBranch(branch.id);
                  onClose();
                }}
                style={{
                  padding: `1rem 1rem 1rem ${1 + ((level + 1) * 1.5)}rem`,
                  color: textColor,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${primaryColor}40` // semi-transparent
                }}
              >
                <span>{branch.name}</span>
                {selectedBranch?.id === branch.id && <span style={{ color: primaryColor }}>✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    ));
  };

  const infoLinks = designConfig?.infoLinks || [];
  const feedbackLink = designConfig?.feedbackLink || '';

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'flex-start', // Slide from LEFT
        animation: 'fadeIn 0.3s ease'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '450px',
          height: '100vh',
          maxHeight: '100vh',
          backgroundColor: '#ffffff', // Explicitly white body
          boxShadow: '2px 0 10px rgba(0,0,0,0.3)', // shadow on the right side
          display: 'flex',
          flexDirection: 'column',
          transform: 'translateX(0)',
          animation: 'slideInLeft 0.3s ease',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed at the top */}
        <div style={{
          padding: '2rem 1.5rem',
          backgroundColor: 'var(--drawer-header-bg, #2a2a2a)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          flexShrink: 0
        }}>
          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'none',
              border: 'none',
              color: 'var(--drawer-header-text, #ffffff)',
              fontSize: '2rem',
              cursor: 'pointer',
              fontWeight: '300',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              lineHeight: 1
            }}
          >
            ×
          </button>
          
          {designConfig?.logoUrl ? (
            <img 
              src={designConfig.logoUrl} 
              alt="Logo" 
              className="notranslate"
              style={{ width: '150px', objectFit: 'contain', margin: '1rem 0', cursor: 'pointer' }} 
              onClick={() => {
                const targetPath = isCustomDomain ? `/` : `/r/${slug}`;
                navigate(targetPath);
                onClose();
              }}
            />
          ) : (
            <h2 
              className="notranslate"
              style={{ color: 'var(--drawer-header-text, #ffffff)', margin: '2rem 0', fontFamily: 'var(--font-main)', fontSize: '1.5rem', letterSpacing: '2px', cursor: 'pointer', textAlign: 'center' }}
              onClick={() => {
                const targetPath = isCustomDomain ? `/` : `/r/${slug}`;
                navigate(targetPath);
                onClose();
              }}
            >
              {restaurantName ? restaurantName.toUpperCase() : 'TIENDA'}
            </h2>
          )}
        </div>

        {/* Body Content - Scrollable */}
        <div style={{ 
          padding: '1.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '2rem', 
          flex: 1, 
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          
          {/* Main Content Group */}
          <div>
            {/* Inicio Button */}
            <div 
              onClick={() => {
                const targetPath = isCustomDomain ? `/?home=true` : `/r/${slug}?home=true`;
                navigate(targetPath);
                onClose();
              }}
              style={{
                backgroundColor: 'transparent',
                color: textColor,
                padding: '1rem',
                fontSize: '1.2rem',
                fontFamily: 'var(--font-main)',
                borderBottom: `1px solid ${primaryColor}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              Inicio
            </div>

            {/* Branch Button */}
            {selectedBranch && (
              <div 
                style={{
                  backgroundColor: primaryColor,
                  color: '#ffffff',
                  padding: '1rem',
                  textAlign: 'center',
                  fontSize: '1.2rem',
                  fontFamily: 'var(--font-main)',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  marginBottom: '1rem',
                  cursor: 'pointer'
                }}
              >
                {selectedBranch.name}
              </div>
            )}

            {/* Categories List */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {categories.map(cat => {
                const subcats = cat.subcategories?.filter(s => s.name || s.label) || [];
                const hasSubcats = subcats.length > 0;
                const isExpanded = !!expandedCategories[cat.id];

                return (
                  <div key={cat.id} style={{ borderBottom: `1px solid ${primaryColor}40` }}>
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <span 
                        onClick={() => {
                          onSelectCategory(cat.id);
                          onClose();
                        }}
                        style={{
                          padding: '1rem 0.5rem',
                          color: primaryColor,
                          fontFamily: 'var(--font-main)',
                          fontSize: '1.2rem',
                          fontWeight: 400,
                          flex: 1
                        }}
                      >
                        {cat.name}
                      </span>
                      {hasSubcats && (
                        <button
                          onClick={(e) => toggleCategory(cat.id, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: primaryColor,
                            padding: '1rem 1.25rem',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                          }}
                        >
                          ▼
                        </button>
                      )}
                    </div>

                    {/* Collapsible Subcategories */}
                    {hasSubcats && isExpanded && (
                      <div style={{ 
                        backgroundColor: 'rgba(0,0,0,0.02)',
                        paddingLeft: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        borderLeft: `2px solid ${primaryColor}40`
                      }}>
                        {subcats.map(sub => {
                          const subId = sub.id || sub.name;
                          return (
                            <div
                              key={subId}
                              onClick={() => {
                                onSelectCategoryAndSub(cat.id, subId);
                                onClose();
                              }}
                              style={{
                                padding: '0.75rem 1rem',
                                color: '#555555',
                                fontFamily: 'var(--font-main)',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                borderBottom: '1px dashed rgba(0,0,0,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <span style={{ opacity: 0.5 }}>└</span> {sub.name || sub.label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info Links Group */}
          {infoLinks.length > 0 && (
            <div>
              {/* Más Información Button */}
              <div 
                style={{
                  backgroundColor: primaryColor,
                  color: '#ffffff',
                  padding: '1rem',
                  textAlign: 'center',
                  fontSize: '1.2rem',
                  fontFamily: 'var(--font-main)',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  marginBottom: '0.5rem'
                }}
              >
                Más información
              </div>

              {/* Recursive Links List */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {renderRecursiveLinks(infoLinks)}
              </div>
            </div>
          )}

          {/* Feedback Button */}
          {feedbackLink && (
            <div style={{ textAlign: 'center', margin: '2rem 0' }}>
              <a 
                href={feedbackLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  backgroundColor: primaryColor,
                  color: '#ffffff',
                  padding: '0.8rem 2rem',
                  borderRadius: '25px',
                  textDecoration: 'none',
                  fontSize: '1.1rem',
                  fontFamily: 'var(--font-main)',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                }}
              >
                Danos tu opinión
              </a>
            </div>
          )}

        </div>
      </div>

      <style>
        {`
          @keyframes slideInLeft {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}
