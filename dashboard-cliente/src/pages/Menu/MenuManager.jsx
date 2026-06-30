import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useRestaurantData } from '../../context/RestaurantDataContext';
import { useAlert } from '../../context/AlertContext';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Palette, Edit2, Trash2, Settings, Plus, FolderOpen, Tag, Store } from 'lucide-react';
import './MenuManager.css';

import { uploadCategoryBanner } from '../../services/menuService';

import { useMenuData } from './hooks/useMenuData';
import { useMenuCategories } from './hooks/useMenuCategories';
import { useMenuSubcategories } from './hooks/useMenuSubcategories';
import { useMenuProducts } from './hooks/useMenuProducts';
import { useMenuDragAndDrop } from './hooks/useMenuDragAndDrop';

import CategoryModal from './components/CategoryModal';
import SubcategoryModal from './components/SubcategoryModal';
import ProductModal from './components/ProductModal';

export default function MenuManager() {
  const { restaurantId, isBranchAllowed, planLevel } = useSubscription();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const { categories: globalCategories, products: globalProducts, loading: globalLoading, refreshData } = useRestaurantData();

  // 1. Data Hook
  const {
    branches, availableIngredients, selectedAdminBranch, setSelectedAdminBranch,
    activeCategory, setActiveCategory, categories: rawCategories, products: rawProducts, isLoading, loadData
  } = useMenuData(restaurantId, isBranchAllowed, globalCategories, globalProducts, globalLoading, refreshData);

  const categories = React.useMemo(() => {
    return rawCategories || [];
  }, [rawCategories]);

  const products = React.useMemo(() => {
    return rawProducts || [];
  }, [rawProducts]);

  // 2. Drag and Drop Hook
  const {
    localProducts, draggedItemIndex,
    handleDragStart, handleDragOver, handleDragEnd
  } = useMenuDragAndDrop(restaurantId, products, activeCategory, selectedAdminBranch, showAlert);

  // 3. Categories Hook
  const {
    showCatModal, setShowCatModal, editingCategory, isUploading: isCatUploading,
    catForm, setCatForm, openCatModal, handleSaveCategory, handleDeleteCategory
  } = useMenuCategories(restaurantId, categories, branches, selectedAdminBranch, loadData, showAlert);

  // 4. Subcategories Hook
  const {
    showSubcatModal, setShowSubcatModal, editingSubcategory, setEditingSubcategory,
    subcatName, setSubcatName, subcatGridColumns, setSubcatGridColumns,
    subcatCardLayout, setSubcatCardLayout, subcatImgWidth, setSubcatImgWidth,
    subcatImgMargin, setSubcatImgMargin, subcatSepStyle, setSubcatSepStyle,
    subcatSepColor, setSubcatSepColor, subcatSepHeight, setSubcatSepHeight,
    subcatSepWidth, setSubcatSepWidth, subcatSepImage, setSubcatSepImage,
    subcatTitleSize, setSubcatTitleSize, subcatTitleColor, setSubcatTitleColor,
    subcatTitleMargin, setSubcatTitleMargin, subcatDescSize, setSubcatDescSize,
    subcatDescColor, setSubcatDescColor, subcatDescMargin, setSubcatDescMargin,
    subcatPriceSize, setSubcatPriceSize, subcatPriceColor, setSubcatPriceColor,
    subcatPriceMargin, setSubcatPriceMargin, subcatBannerFiles, setSubcatBannerFiles,
    subcatFooterFiles, setSubcatFooterFiles, subcatHideInNavBar, setSubcatHideInNavBar,
    subcatCardBackgroundColor, setSubcatCardBackgroundColor,
    subcatCardBackgroundOpacity, setSubcatCardBackgroundOpacity,
    subcatCardBlur, setSubcatCardBlur,
    subcatCardBorderRadius, setSubcatCardBorderRadius,
    isUploading: isSubcatUploading,
    resetSubcatForm, openEditSubcat, handleAddSubcategory, handleDeleteSubcategory
  } = useMenuSubcategories(restaurantId, categories, activeCategory, loadData, showAlert);

  // 5. Products Hook
  const {
    showProdModal, setShowProdModal, editingProduct, isUploading: isProdUploading,
    isGeneratingAI, prodForm, setProdForm, recipeItemForm, setRecipeItemForm,
    handleGenerateAiDescription, openProdModal, handleSaveProduct, handleDeleteProduct
  } = useMenuProducts(restaurantId, activeCategory, selectedAdminBranch, loadData, showAlert, availableIngredients);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);
  };

  const currentCategoryObj = categories ? categories.find(c => c.id === activeCategory) : null;
  const displayedCategories = categories ? categories.filter(c => selectedAdminBranch === 'ALL' ? true : (c.branchIds && c.branchIds.includes(selectedAdminBranch))) : [];

  return (
    <div>
      <div className="dashboard-header-modern">
        <div className="flex flex-col">
          <h1 className="page-title">Gestión del Menú</h1>
          <p className="page-subtitle">Organiza tus platos, categorías y disponibilidades</p>
        </div>
        {branches.length > 0 && (
          <div className="branch-selector-wrapper">
            <span className="branch-selector-label">Sede:</span>
            <select 
              className="branch-selector-input" 
              value={selectedAdminBranch}
              onChange={(e) => setSelectedAdminBranch(e.target.value)}
            >
              {branches.filter(b => isBranchAllowed(b.id)).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!isLoading && branches.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#ef4444', marginBottom: '1rem' }}>¡Atención! No tienes sedes configuradas.</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Para mantener tu menú organizado de forma profesional, primero debes crear al menos una sede.
            Esto te permitirá asignar platos a ubicaciones específicas en el futuro.
          </p>
          <Link to="/branches" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Ir al Gestor de Sedes
          </Link>
        </div>
      ) : !isLoading && (!rawCategories || rawCategories.length === 0) ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '600px', margin: '2rem auto', borderRadius: '16px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', color: 'var(--primary)' }}><Sparkles size={48} /></div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>Crea tu Menú Digital</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem', maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto' }}>
            ¡Parece que aún no tienes categorías ni platos creados! Comienza eligiendo una de nuestras plantillas profesionales diseñadas para restaurantes, cafés y bares para configurar tu diseño en segundos.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/design" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 700 }}>
              <Palette size={16} /> Elegir Plantilla
            </Link>
            <button onClick={() => openCatModal()} className="btn-secondary" style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>
              + Crear Categoría Manual
            </button>
          </div>
        </div>
      ) : (
        <div className="menu-layout">
          {/* Categories Sidebar */}
          <div className="categories-sidebar">
            <div className="categories-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Categorías</h3>
              <button 
                className="btn-primary" 
                style={{ 
                  padding: '0.4rem 0.8rem', 
                  fontSize: '0.875rem'
                }} 
                onClick={() => openCatModal()}
              >
                + Añadir
              </button>
            </div>
            <div className="categories-list">
              {isLoading ? <p style={{ padding: '1rem' }}>Cargando...</p> : 
                displayedCategories.map(cat => {
                  const isGlobal = !cat.branchIds || cat.branchIds.length === 0;
                  return (
                      <div 
                        key={cat.id} 
                        className={`category-item ${activeCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.id)}
                      >
                        <div className="category-item-content">
                          <span className="category-item-name">{cat.name}</span>
                          <div className="category-item-meta">
                            {isGlobal ? '0 sedes' : `${cat.branchIds.length} sedes`}
                            {cat.startTime && cat.endTime && ` • ${cat.startTime}-${cat.endTime}`}
                          </div>
                        </div>
                        <div className="category-item-actions desktop-only" style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={(e) => { e.stopPropagation(); openCatModal(cat); }} className="cat-action-btn" title="Editar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={12} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} className="cat-action-btn delete" title="Eliminar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                  );
                })
              }
              {!isLoading && displayedCategories.length === 0 && (
                <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>No hay categorías. Crea una para empezar.</p>
              )}
            </div>
          </div>

          {/* Products Area */}
          <div className="products-area">
            <div className="products-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {activeCategory ? currentCategoryObj?.name : 'Productos'}
                {activeCategory && (
                  <button 
                    onClick={() => openCatModal(currentCategoryObj)} 
                    className="mobile-only-inline cat-edit-inline-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Edit2 size={12} />
                  </button>
                )}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn-primary" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#475569' }}
                  disabled={!activeCategory} 
                  onClick={() => setShowSubcatModal(true)}
                >
                  <Settings size={14} /> Nueva Subcategoría
                </button>
                <button 
                  className="btn-primary" 
                  disabled={!activeCategory}
                  onClick={() => openProdModal()}
                >
                  + Añadir Producto
                </button>
              </div>
            </div>

            {activeCategory && currentCategoryObj?.subcategories && currentCategoryObj.subcategories.length > 0 && (
              <div 
                className="subcategory-tags-container" 
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  borderBottom: '1px solid var(--border-light)', 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '0.5rem', 
                  alignItems: 'center', 
                  backgroundColor: '#f8fafc' 
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginRight: '0.25rem' }}>
                  Subcategorías:
                </span>
                {currentCategoryObj.subcategories.map(sub => (
                  <span 
                    key={sub.id} 
                    className="subcategory-tag"
                    style={{
                      fontSize: '0.78rem',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      padding: '3px 10px',
                      borderRadius: '50px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FolderOpen size={12} /> {sub.name}
                  </span>
                ))}
              </div>
            )}
            
            <div className="products-grid">
              {isLoading ? <p>Cargando productos...</p> : 
                localProducts.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No hay productos en esta categoría.
                  </div>
                ) : (
                  localProducts.map((prod, index) => {
                    const isDragging = draggedItemIndex === index;
                    const isGlobal = !prod.branchIds || prod.branchIds.length === 0;
                    
                    return (
                      <div 
                        key={prod.id} 
                        className={`product-card ${isDragging ? 'dragging' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        style={{ 
                          opacity: isDragging ? 0.5 : 1,
                          cursor: 'move',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                      >
                        {prod.imageUrl ? (
                          <img src={prod.imageUrl} alt={prod.name} className="product-image" />
                        ) : (
                          <div className="product-image flex items-center" style={{ justifyContent: 'center', color: '#cbd5e1' }}>
                            Sin imagen
                          </div>
                        )}
                        <div className="product-info">
                          <div className="product-name-row">
                            <div className="product-name">{prod.name}</div>
                            <div className="product-actions" style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => openProdModal(prod)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'inline-flex', alignItems: 'center' }} title="Editar"><Edit2 size={14} /></button>
                              <button onClick={() => handleDeleteProduct(prod)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'inline-flex', alignItems: 'center' }} title="Eliminar"><Trash2 size={14} /></button>
                            </div>
                          </div>
                          <div className="product-desc">{prod.description}</div>
                          <div className="product-price">{formatPrice(prod.price)}</div>
                          <div className="product-badges" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            {prod.sku && (
                              <span style={{ fontSize: '0.72rem', backgroundColor: '#fef3c7', padding: '2px 7px', borderRadius: '4px', color: '#d97706', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Tag size={10} /> SKU: {prod.sku}
                              </span>
                            )}
                            {prod.subcategory && (
                              <span style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <FolderOpen size={10} /> {prod.subcategory}
                              </span>
                            )}
                            <span style={{ fontSize: '0.72rem', backgroundColor: '#e0e7ff', padding: '2px 7px', borderRadius: '4px', color: '#4338ca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Store size={10} /> {isGlobal ? '0 sedes' : `${prod.branchIds.length} sedes`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              }
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CategoryModal
        showCatModal={showCatModal} setShowCatModal={setShowCatModal}
        editingCategory={editingCategory} isUploading={isCatUploading}
        catForm={catForm} setCatForm={setCatForm}
        handleSaveCategory={handleSaveCategory}
        branches={branches} restaurantId={restaurantId}
        uploadCategoryBanner={uploadCategoryBanner}
      />

      <SubcategoryModal
        showSubcatModal={showSubcatModal} setShowSubcatModal={setShowSubcatModal}
        currentCategoryObj={currentCategoryObj} editingSubcategory={editingSubcategory}
        isUploading={isSubcatUploading} subcatName={subcatName} setSubcatName={setSubcatName}
        subcatGridColumns={subcatGridColumns} setSubcatGridColumns={setSubcatGridColumns}
        subcatCardLayout={subcatCardLayout} setSubcatCardLayout={setSubcatCardLayout}
        subcatImgWidth={subcatImgWidth} setSubcatImgWidth={setSubcatImgWidth}
        subcatImgMargin={subcatImgMargin} setSubcatImgMargin={setSubcatImgMargin}
        subcatSepStyle={subcatSepStyle} setSubcatSepStyle={setSubcatSepStyle}
        subcatSepColor={subcatSepColor} setSubcatSepColor={setSubcatSepColor}
        subcatSepHeight={subcatSepHeight} setSubcatSepHeight={setSubcatSepHeight}
        subcatSepWidth={subcatSepWidth} setSubcatSepWidth={setSubcatSepWidth}
        subcatSepImage={subcatSepImage} setSubcatSepImage={setSubcatSepImage}
        subcatTitleSize={subcatTitleSize} setSubcatTitleSize={setSubcatTitleSize}
        subcatTitleColor={subcatTitleColor} setSubcatTitleColor={setSubcatTitleColor}
        subcatTitleMargin={subcatTitleMargin} setSubcatTitleMargin={setSubcatTitleMargin}
        subcatDescSize={subcatDescSize} setSubcatDescSize={setSubcatDescSize}
        subcatDescColor={subcatDescColor} setSubcatDescColor={setSubcatDescColor}
        subcatDescMargin={subcatDescMargin} setSubcatDescMargin={setSubcatDescMargin}
        subcatPriceSize={subcatPriceSize} setSubcatPriceSize={setSubcatPriceSize}
        subcatPriceColor={subcatPriceColor} setSubcatPriceColor={setSubcatPriceColor}
        subcatPriceMargin={subcatPriceMargin} setSubcatPriceMargin={setSubcatPriceMargin}
        subcatBannerFiles={subcatBannerFiles} setSubcatBannerFiles={setSubcatBannerFiles}
        subcatFooterFiles={subcatFooterFiles} setSubcatFooterFiles={setSubcatFooterFiles}
        subcatHideInNavBar={subcatHideInNavBar} setSubcatHideInNavBar={setSubcatHideInNavBar}
        subcatCardBackgroundColor={subcatCardBackgroundColor} setSubcatCardBackgroundColor={setSubcatCardBackgroundColor}
        subcatCardBackgroundOpacity={subcatCardBackgroundOpacity} setSubcatCardBackgroundOpacity={setSubcatCardBackgroundOpacity}
        subcatCardBlur={subcatCardBlur} setSubcatCardBlur={setSubcatCardBlur}
        subcatCardBorderRadius={subcatCardBorderRadius} setSubcatCardBorderRadius={setSubcatCardBorderRadius}
        resetSubcatForm={resetSubcatForm} openEditSubcat={openEditSubcat}
        setEditingSubcategory={setEditingSubcategory}
        handleAddSubcategory={handleAddSubcategory} handleDeleteSubcategory={handleDeleteSubcategory}
        restaurantId={restaurantId} uploadCategoryBanner={uploadCategoryBanner}
      />

      <ProductModal
        showProdModal={showProdModal} setShowProdModal={setShowProdModal}
        editingProduct={editingProduct} isUploading={isProdUploading}
        isGeneratingAI={isGeneratingAI} prodForm={prodForm} setProdForm={setProdForm}
        recipeItemForm={recipeItemForm} setRecipeItemForm={setRecipeItemForm}
        handleGenerateAiDescription={handleGenerateAiDescription}
        handleSaveProduct={handleSaveProduct} availableIngredients={availableIngredients}
        branches={branches} currentCategoryObj={currentCategoryObj}
      />
    </div>
  );
}
