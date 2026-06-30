import React, { useState, useEffect } from 'react';

const VideoFilePreview = ({ file, onRemove }) => {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;
  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <video src={url} style={{ width: '100px', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-light)' }} muted controls />
      <button 
        type="button" 
        onClick={onRemove} 
        style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#ef4444',
          color: '#ffffff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          lineHeight: '1',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          padding: 0
        }}
      >
        ×
      </button>
      <span style={{ fontSize: '0.75rem', color: 'green', marginTop: '4px' }}>Nuevo video</span>
    </div>
  );
};

import { useSubscription } from '../../../context/SubscriptionContext';
import { Lock, Sparkles, Tag, Settings, ClipboardList, ChefHat, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const formatNumberWithDots = (value) => {
  if (value === undefined || value === null || value === '') return '';
  const stringValue = String(value).replace(/\D/g, '');
  if (!stringValue) return '';
  return new Intl.NumberFormat('de-DE').format(parseInt(stringValue, 10));
};

export default function ProductModal({
  showProdModal,
  setShowProdModal,
  editingProduct,
  isUploading,
  isGeneratingAI,
  prodForm,
  setProdForm,
  recipeItemForm,
  setRecipeItemForm,
  handleGenerateAiDescription,
  handleSaveProduct,
  availableIngredients,
  branches,
  currentCategoryObj
}) {
  const [activeTab, setActiveTab] = useState('basic');
  const { planLevel } = useSubscription();
  const isLocked = planLevel < 2;

  if (!showProdModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: 0, display: 'flex', flexDirection: 'column', maxWidth: '700px' }}>
        <div className="modal-header" style={{ padding: '1.5rem 1.5rem 0 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button type="button" onClick={() => setShowProdModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', padding: '0 1.5rem', gap: '1.5rem', marginTop: '1rem' }}>
          <button 
             type="button"
             onClick={() => setActiveTab('basic')}
             style={{ padding: '0.75rem 0', borderBottom: activeTab === 'basic' ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontWeight: activeTab === 'basic' ? 700 : 500, color: activeTab === 'basic' ? 'var(--primary)' : 'var(--text-muted)' }}>
             Básico
          </button>
          <button 
             type="button"
             onClick={() => setActiveTab('advanced')}
             style={{ padding: '0.75rem 0', borderBottom: activeTab === 'advanced' ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontWeight: activeTab === 'advanced' ? 700 : 500, color: activeTab === 'advanced' ? 'var(--primary)' : 'var(--text-muted)' }}>
             Avanzado (Opcional)
          </button>
        </div>

        <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'auto' }}>
            
            <div style={{ display: activeTab === 'basic' ? 'block' : 'none' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 2, minWidth: '200px' }}>
                  <label className="form-label">Nombre del Plato / Artículo</label>
                  <input required type="text" className="form-input" value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} placeholder="Ej: Hamburguesa Especial, Mojito..." />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
                  <label className="form-label">SKU / Referencia</label>
                  <input type="text" className="form-input" value={prodForm.sku || ''} onChange={e => setProdForm({...prodForm, sku: e.target.value})} placeholder="Ej: SKU-001" />
                </div>
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Descripción</label>
                  <button 
                    type="button" 
                    className="btn-ai-magic"
                    onClick={handleGenerateAiDescription}
                    disabled={isGeneratingAI || !prodForm.name}
                  >
                    {isGeneratingAI ? 'Generando...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Sparkles size={13} /> Generar con IA</span>}
                  </button>
                </div>
                <textarea className="form-input" rows="3" value={prodForm.description} onChange={e => setProdForm({...prodForm, description: e.target.value})} placeholder="Describe los ingredientes, preparación..." />
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
                  <label className="form-label">Precio Regular (COP)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formatNumberWithDots(prodForm.price)} 
                    onChange={e => setProdForm({...prodForm, price: e.target.value.replace(/\D/g, '')})} 
                    disabled={prodForm.variants && prodForm.variants.length > 0} 
                    placeholder={prodForm.variants && prodForm.variants.length > 0 ? "Usando variantes" : "0"} 
                    required={!prodForm.variants || prodForm.variants.length === 0} 
                  />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
                  <label className="form-label">Tipo de Promoción</label>
                  <select 
                    className="form-input" 
                    value={prodForm.promotionType} 
                    onChange={e => setProdForm({...prodForm, promotionType: e.target.value, discountPrice: e.target.value !== 'discount' ? '' : prodForm.discountPrice})}
                  >
                    <option value="none">Sin Promoción</option>
                    <option value="discount">Precio con Descuento</option>
                    <option value="2x1">Promoción 2x1</option>
                    <option value="custom_condition">Promoción Personalizada Condicionada</option>
                  </select>
                </div>
              </div>

              {/* Campo de precio con descuento — solo cuando type=discount */}
              {prodForm.promotionType === 'discount' && (
                <div className="form-group" style={{ background: '#fff8f0', border: '1px solid #fed7aa', borderRadius: '8px', padding: '0.75rem' }}>
                  <label className="form-label" style={{ color: '#ea580c', display: 'flex', alignItems: 'center', gap: '6px' }}><Tag size={14} /> Precio de Oferta (COP)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formatNumberWithDots(prodForm.discountPrice)} 
                    onChange={e => setProdForm({...prodForm, discountPrice: e.target.value.replace(/\D/g, '')})} 
                    disabled={prodForm.variants && prodForm.variants.length > 0} 
                    placeholder="Ej: 15.000" 
                  />
                  {prodForm.price && prodForm.discountPrice && Number(prodForm.discountPrice) < Number(prodForm.price) && (
                    <p style={{ fontSize: '0.75rem', color: '#ea580c', margin: '0.25rem 0 0', fontWeight: 600 }}>
                      Descuento: {Math.round((1 - Number(prodForm.discountPrice) / Number(prodForm.price)) * 100)}% OFF
                    </p>
                  )}
                </div>
              )}

              {/* Info 2x1 */}
              {prodForm.promotionType === '2x1' && (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#92400e' }}>Promoción 2x1 activada</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#78350f' }}>Al agregar 2 unidades, el cliente solo paga el precio de 1.</p>
                  </div>
                </div>
              )}

              {/* Promoción Personalizada Condicionada */}
              {prodForm.promotionType === 'custom_condition' && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: '#166534' }}>
                    <Settings size={18} />
                    <strong style={{ fontSize: '0.9rem' }}>Configuración de Promoción Personalizada</strong>
                  </div>
                  
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ color: '#166534' }}>Etiqueta Personalizada (Visible al cliente)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={prodForm.promoLabel || ''} 
                      onChange={e => setProdForm({...prodForm, promoLabel: e.target.value})} 
                      placeholder="Ej: Lleve 3 pagando 2, 3x2, Combo Especial, etc." 
                      required
                    />
                    <p style={{ fontSize: '0.7rem', color: '#15803d', margin: '0.25rem 0 0' }}>Esta etiqueta reemplazará al indicador de porcentaje de descuento en la tienda y en el carrito.</p>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '140px', margin: 0 }}>
                      <label className="form-label" style={{ color: '#166534' }}>Cantidad Mínima</label>
                      <input 
                        type="number" 
                        min="1" 
                        step="1"
                        className="form-input" 
                        value={prodForm.promoMinQty || ''} 
                        onChange={e => setProdForm({...prodForm, promoMinQty: e.target.value})} 
                        placeholder="Ej: 3" 
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: '140px', margin: 0 }}>
                      <label className="form-label" style={{ color: '#166534' }}>% de Descuento sobre el total</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        step="0.01"
                        className="form-input" 
                        value={prodForm.promoDiscountPct || ''} 
                        onChange={e => setProdForm({...prodForm, promoDiscountPct: e.target.value})} 
                        placeholder="Ej: 33.3" 
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              
              <div className="form-group">
                <label className="form-label">Etiqueta de Precio (Opcional)</label>
                <input type="text" className="form-input" placeholder="Ej: Botella, Porción, Jarra..." value={prodForm.priceLabel} onChange={e => setProdForm({...prodForm, priceLabel: e.target.value})} />
              </div>
              
              <div className="variants-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label className="form-label" style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><ClipboardList size={18} /> Variantes del Producto</label>
                  <button 
                    type="button" 
                    className="btn-add-variant" 
                    onClick={() => setProdForm({
                      ...prodForm, 
                      variants: [
                        ...(prodForm.variants || []), 
                        { 
                          id: Date.now().toString() + Math.random().toString(), 
                          name: '', 
                          price: '', 
                          sku: '', 
                          inventoryEnabled: false, 
                          ingredientId: '', 
                          quantity: '1', 
                          available: true 
                        }
                      ]
                    })}
                  >
                    + Añadir Variante
                  </button>
                </div>
                
                {(!prodForm.variants || prodForm.variants.length === 0) ? (
                  <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', padding: '0.5rem' }}>No hay variantes. El precio principal será el que se use.</p>
                ) : (
                  <>
                    {prodForm.variants.map((variant, idx) => (
                      <div key={variant.id || idx} style={{
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}>
                        {/* Cabecera / Fila Principal */}
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Nombre (Ej: Don Julio)" 
                            value={variant.name} 
                            onChange={(e) => {
                              const newVariants = [...prodForm.variants];
                              newVariants[idx].name = e.target.value;
                              setProdForm({...prodForm, variants: newVariants});
                            }} 
                            style={{ flex: 2, margin: 0 }} 
                            required
                          />
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Precio" 
                            value={formatNumberWithDots(variant.price)} 
                            onChange={(e) => {
                              const newVariants = [...prodForm.variants];
                              newVariants[idx].price = e.target.value.replace(/\D/g, '');
                              setProdForm({...prodForm, variants: newVariants});
                            }} 
                            style={{ flex: 1, margin: 0 }} 
                            required
                          />
                          <button 
                            type="button" 
                            className="btn-remove-variant"
                            onClick={() => {
                              const newVariants = prodForm.variants.filter((_, i) => i !== idx);
                              setProdForm({...prodForm, variants: newVariants});
                            }} 
                            style={{ 
                              padding: '0.5rem', 
                              background: '#fee2e2', 
                              color: '#ef4444', 
                              border: '1px solid #fca5a5', 
                              borderRadius: '8px', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              flexShrink: 0
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Fila secundaria: SKU & Checkbox de control de stock */}
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '150px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>SKU / Ref de Variante</span>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="Ej: SKU-VAR1"
                              value={variant.sku || ''}
                              onChange={(e) => {
                                const newVariants = [...prodForm.variants];
                                newVariants[idx].sku = e.target.value;
                                setProdForm({...prodForm, variants: newVariants});
                              }}
                              style={{ fontSize: '0.8rem', padding: '6px 10px', margin: 0 }}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '14px' }}>
                            <input 
                              type="checkbox" 
                              id={`variant-inv-${variant.id || idx}`}
                              checked={variant.inventoryEnabled || false} 
                              onChange={(e) => {
                                const newVariants = [...prodForm.variants];
                                newVariants[idx].inventoryEnabled = e.target.checked;
                                if (e.target.checked && !newVariants[idx].quantity) {
                                  newVariants[idx].quantity = '1';
                                }
                                setProdForm({...prodForm, variants: newVariants});
                              }}
                              style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                            />
                            <label htmlFor={`variant-inv-${variant.id || idx}`} style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e3a8a', cursor: 'pointer', margin: 0 }}>
                              Controlar Stock
                            </label>
                          </div>
                        </div>

                        {/* Panel de control de stock si está activo */}
                        {variant.inventoryEnabled && (
                          <div style={{ 
                            background: '#eff6ff', 
                            border: '1px solid #bfdbfe', 
                            borderRadius: '8px', 
                            padding: '0.75rem',
                            marginTop: '0.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                              <div style={{ flex: 1, minWidth: '150px' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1e3a8a', display: 'block', marginBottom: '2px' }}>
                                  Tipo de Relación
                                </label>
                                <select 
                                  className="form-input" 
                                  value={variant.linkType || 'product'}
                                  onChange={(e) => {
                                    const newVariants = [...prodForm.variants];
                                    newVariants[idx].linkType = e.target.value;
                                    if (e.target.value === 'product') newVariants[idx].quantity = '1';
                                    setProdForm({...prodForm, variants: newVariants});
                                  }}
                                  style={{ fontSize: '0.8rem', padding: '6px', margin: 0 }}
                                >
                                  <option value="product">Producto (Venta Directa 1:1)</option>
                                  <option value="ingredient">Insumo / Receta (Descuento Proporcional)</option>
                                </select>
                              </div>

                              {/* Selector de Artículo Padre */}
                              <div style={{ flex: 2, minWidth: '160px' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1e3a8a', display: 'block', marginBottom: '2px' }}>
                                  {(variant.linkType || 'product') === 'product' ? 'Artículo de Inventario (Producto)' : 'Artículo de Inventario (Insumo)'}
                                </label>
                                <select 
                                  className="form-input" 
                                  value={variant.ingredientId || ''}
                                  onChange={(e) => {
                                    const newVariants = [...prodForm.variants];
                                    newVariants[idx].ingredientId = e.target.value;
                                    newVariants[idx].inventoryVariantId = ''; // reset sub-variante
                                    setProdForm({...prodForm, variants: newVariants});
                                  }}
                                  style={{ fontSize: '0.8rem', padding: '6px', margin: 0 }}
                                  required={variant.inventoryEnabled}
                                >
                                  <option value="">Selecciona un artículo...</option>
                                  {availableIngredients
                                    .filter(ing => ing.hasVariants)
                                    .map(ing => (
                                      <option key={ing.id} value={ing.id}>
                                        {ing.name} ({ing.unit})
                                      </option>
                                    ))
                                  }
                                </select>
                              </div>

                              {/* Selector de Sub-variante (solo si el artículo padre tiene variantes) */}
                              {(() => {
                                const selectedIng = availableIngredients.find(i => i.id === variant.ingredientId);
                                if (!selectedIng?.hasVariants || !selectedIng?.variants?.length) return null;
                                return (
                                  <div style={{ flex: 2, minWidth: '150px' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1e3a8a', display: 'block', marginBottom: '2px' }}>
                                      Variante de Inventario (Talla / Color…)
                                    </label>
                                    <select
                                      className="form-input"
                                      value={variant.inventoryVariantId || ''}
                                      onChange={(e) => {
                                        const newVariants = [...prodForm.variants];
                                        newVariants[idx].inventoryVariantId = e.target.value;
                                        setProdForm({...prodForm, variants: newVariants});
                                      }}
                                      style={{ fontSize: '0.8rem', padding: '6px', margin: 0 }}
                                      required={variant.inventoryEnabled}
                                    >
                                      <option value="">Selecciona variante...</option>
                                      {selectedIng.variants.map(sv => (
                                        <option key={sv.id} value={sv.id}>
                                          {sv.name}{sv.sku ? ` (${sv.sku})` : ''} — Stock: {parseFloat(sv.currentStock || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })} {selectedIng.unit}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })()}

                              {/* Campo cantidad de consumo (solo para insumos/recetas) */}
                              {(variant.linkType || 'product') === 'ingredient' ? (
                                <div style={{ flex: 1, minWidth: '80px' }}>
                                  <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1e3a8a', display: 'block', marginBottom: '2px' }}>
                                    Cant. Consumo
                                  </label>
                                  <input 
                                    type="number" step="0.01" min="0.01"
                                    className="form-input" 
                                    placeholder="Ej: 1"
                                    value={variant.quantity || '1'}
                                    onChange={(e) => {
                                      const newVariants = [...prodForm.variants];
                                      newVariants[idx].quantity = e.target.value;
                                      setProdForm({...prodForm, variants: newVariants});
                                    }}
                                    style={{ fontSize: '0.8rem', padding: '6px', margin: 0 }}
                                    required={variant.inventoryEnabled}
                                  />
                                </div>
                              ) : (
                                <div style={{ flex: 1, minWidth: '100px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1e3a8a' }}>Descuento</span>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', border: '1px solid #bae6fd', padding: '6px 8px', borderRadius: '6px', textAlign: 'center', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                                    1 Unidad
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Mostrar Stock Actual y Estado de Manera Visual y Organizada */}
                            {(() => {
                              const ing = (availableIngredients || []).find(i => i.id === variant.ingredientId);
                              if (!ing) return null;
                              const stock = Number(ing.currentStock) || 0;
                              const isOutOfStock = stock <= 0;
                              const isLowStock = ing.minAlertThreshold !== undefined && stock <= Number(ing.minAlertThreshold);
                              
                              let badgeColor = '#10b981';
                              let badgeBg = '#ecfdf5';
                              let badgeIcon = <CheckCircle2 size={14} />;
                              let badgeText = `En Stock: ${stock} ${ing.unit}`;
                              
                              if (isOutOfStock) {
                                badgeColor = '#ef4444';
                                badgeBg = '#fff1f2';
                                badgeIcon = <XCircle size={14} />;
                                badgeText = `Agotado (Stock: 0 ${ing.unit})`;
                              } else if (isLowStock) {
                                badgeColor = '#f59e0b';
                                badgeBg = '#fffbeb';
                                badgeIcon = <AlertTriangle size={14} />;
                                badgeText = `Stock Bajo: ${stock} ${ing.unit} (Mín: ${ing.minAlertThreshold})`;
                              }

                              return (
                                <div style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: badgeColor,
                                  background: badgeBg,
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  marginTop: '4px',
                                  alignSelf: 'flex-start',
                                  border: `1px solid ${isOutOfStock ? '#fecaca' : isLowStock ? '#fde68a' : '#a7f3d0'}`
                                }}>
                                  {badgeIcon}
                                  {badgeText}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                    <p className="form-help" style={{ marginTop: '0.5rem' }}>Las variantes anulan el precio regular del producto.</p>
                  </>
                )}
              </div>

              {(!prodForm.variants || prodForm.variants.length === 0) && !isLocked && (
                <div style={{ marginTop: '1.5rem', background: '#eff6ff', padding: '1rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="checkbox" 
                      id="autoInventory" 
                      checked={prodForm.autoInventory || false} 
                      onChange={e => setProdForm({ 
                        ...prodForm, 
                        autoInventory: e.target.checked,
                        autoInventoryUnit: prodForm.autoInventoryUnit || 'Unidad',
                        autoInventoryStock: prodForm.autoInventoryStock || '',
                        autoInventoryMin: prodForm.autoInventoryMin || '',
                        autoInventoryCost: prodForm.autoInventoryCost || ''
                      })} 
                      style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    <label htmlFor="autoInventory" style={{ fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', margin: 0, color: '#1e3a8a' }}>
                      📦 Controlar Inventario de este Producto (Crear/enlazar artículo de inventario y stock)
                    </label>
                  </div>
                  
                  {prodForm.autoInventory && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>Unidad de Medida</label>
                        <select 
                          className="form-input" 
                          value={prodForm.autoInventoryUnit || 'Unidad'}
                          onChange={e => setProdForm({ ...prodForm, autoInventoryUnit: e.target.value })}
                          style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                        >
                          <option value="Unidad">Unidad (Unid)</option>
                          <option value="Porción">Porción (Porc)</option>
                          <option value="g">Gramos (g)</option>
                          <option value="kg">Kilogramos (kg)</option>
                          <option value="ml">Mililitros (ml)</option>
                          <option value="L">Litros (L)</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>
                          {editingProduct ? 'Stock Actual' : 'Stock Inicial'}
                        </label>
                        <input 
                          type="number" 
                          step="0.01"
                          min="0"
                          required={prodForm.autoInventory}
                          className="form-input" 
                          placeholder="Ej: 50" 
                          value={prodForm.autoInventoryStock || ''}
                          onChange={e => setProdForm({ ...prodForm, autoInventoryStock: e.target.value })}
                          style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>Alerta Mín. Stock</label>
                        <input 
                          type="number" 
                          step="0.01"
                          min="0"
                          required={prodForm.autoInventory}
                          className="form-input" 
                          placeholder="Ej: 5" 
                          value={prodForm.autoInventoryMin || ''}
                          onChange={e => setProdForm({ ...prodForm, autoInventoryMin: e.target.value })}
                          style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>Costo de Compra (COP)</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="Ej: 4.500" 
                          value={formatNumberWithDots(prodForm.autoInventoryCost)}
                          onChange={e => setProdForm({ ...prodForm, autoInventoryCost: e.target.value.replace(/\D/g, '') })}
                          style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(!prodForm.variants || prodForm.variants.length === 0) && (
                <div className="variants-container" style={{ position: 'relative', marginTop: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                  {isLocked && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(255, 255, 255, 0.65)',
                      backdropFilter: 'blur(1.5px)',
                      WebkitBackdropFilter: 'blur(1.5px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1.5rem',
                      textAlign: 'center',
                      zIndex: 10,
                      borderRadius: '8px',
                      userSelect: 'none',
                      pointerEvents: 'auto'
                    }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        backgroundColor: '#fdf2f4', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: '#8b1a2e', marginBottom: '0.4rem',
                        border: '1px solid #f9d5db',
                        boxShadow: '0 4px 12px rgba(139, 26, 46, 0.15)'
                      }}>
                        <Lock size={18} strokeWidth={2} />
                      </div>
                      <h4 style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', margin: '0 0 0.15rem 0' }}>
                        Insumos Bloqueados
                      </h4>
                      <p style={{ fontSize: '0.68rem', color: '#475569', maxWidth: '280px', margin: '0 0 0.65rem 0', lineHeight: '1.4', fontWeight: 500 }}>
                        Controla tus ingredientes, calcula el costo total de preparación de cada plato automáticamente y descuenta stock al vender. Requiere el <strong>Plan Pro</strong>.
                      </p>
                      <a 
                        href="/subscription" 
                        onClick={(e) => { e.stopPropagation(); }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          textDecoration: 'none',
                          color: '#8b1a2e',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '4px 12px',
                          background: '#fdf2f4',
                          border: '1px solid #f9d5db',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Mejorar Plan <Sparkles size={12} /></span>
                      </a>
                    </div>
                  )}
                  <div style={{ opacity: isLocked ? 0.35 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <label className="form-label" style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}><ChefHat size={18} /> Ingredientes (Receta)</label>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Agrega los insumos para calcular el costo de este plato y (opcionalmente) descontarlos del inventario al vender.</p>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <select 
                        className="form-input" 
                        value={recipeItemForm.ingredientId}
                        onChange={e => setRecipeItemForm({...recipeItemForm, ingredientId: e.target.value})}
                        style={{ flex: 2 }}
                      >
                        <option value="">Selecciona un insumo...</option>
                        {availableIngredients
                          .filter(ing => !ing.hasVariants)
                          .map(ing => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit})
                            </option>
                          ))
                        }
                      </select>
                      <input 
                        type="number" 
                        step="0.01"
                        className="form-input" 
                        placeholder="Cant." 
                        value={recipeItemForm.quantity}
                        onChange={e => setRecipeItemForm({...recipeItemForm, quantity: e.target.value})}
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          if(!recipeItemForm.ingredientId || !recipeItemForm.quantity) return;
                          const ing = availableIngredients.find(i => i.id === recipeItemForm.ingredientId);
                          if(ing) {
                            const isProductWithoutVariants = !prodForm.variants || prodForm.variants.length === 0;
                            if (ing.hasVariants && isProductWithoutVariants) {
                              alert("No puedes asignar este artículo de inventario porque contiene variantes y este producto no tiene variantes configuradas.");
                              return;
                            }
                            const newItem = { 
                              ingredientId: ing.id, 
                              name: ing.name, 
                              unit: ing.unit, 
                              quantity: parseFloat(recipeItemForm.quantity),
                              costPerUnit: ing.costPerUnit || 0
                            };
                            setProdForm({
                              ...prodForm, 
                              recipe: [...(prodForm.recipe || []), newItem]
                            });
                            setRecipeItemForm({ ingredientId: '', quantity: '' });
                          }
                        }}
                        style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        +
                      </button>
                    </div>

                    {(!prodForm.recipe || prodForm.recipe.length === 0) ? (
                      <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>No hay ingredientes en la receta.</p>
                    ) : (
                      <>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {prodForm.recipe.map((item, idx) => {
                            const ing = (availableIngredients || []).find(i => i.id === item.ingredientId) || {};
                            const name = item.name || ing.name || 'Insumo';
                            const unit = item.unit || ing.unit || '';
                            const costPerUnit = item.costPerUnit !== undefined && item.costPerUnit !== null ? item.costPerUnit : (ing.costPerUnit || 0);
                            return (
                              <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
                                <span style={{ fontSize: '0.85rem' }}>{name} ({item.quantity} {unit})</span>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>${(item.quantity * (costPerUnit || 0)).toFixed(2)}</span>
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      const newRecipe = prodForm.recipe.filter((_, i) => i !== idx);
                                      setProdForm({...prodForm, recipe: newRecipe});
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}
                                  >
                                    ×
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.5rem', borderTop: '2px solid #cbd5e1' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Costo Teórico:</span>
                          <span style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '0.9rem' }}>
                            ${prodForm.recipe.reduce((sum, item) => {
                              const ing = (availableIngredients || []).find(i => i.id === item.ingredientId) || {};
                              const costPerUnit = item.costPerUnit !== undefined && item.costPerUnit !== null ? item.costPerUnit : (ing.costPerUnit || 0);
                              return sum + (item.quantity * (costPerUnit || 0));
                            }, 0).toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Subcategoría (Opcional)</label>
                <select className="form-input" value={prodForm.subcategory} onChange={e => setProdForm({...prodForm, subcategory: e.target.value})}>
                  <option value="">Ninguna</option>
                  {currentCategoryObj && currentCategoryObj.subcategories && currentCategoryObj.subcategories.map(sub => (
                    <option key={sub.id} value={sub.name}>{sub.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 'bold' }}>Fotos del Producto (Permite varias imágenes)</label>
                
                {/* Contenedor de Galería */}
                {((prodForm.imageUrls && prodForm.imageUrls.length > 0) || (prodForm.imageFiles && prodForm.imageFiles.length > 0)) && (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', marginTop: '0.5rem' }}>
                    {/* Imágenes de base de datos */}
                    {prodForm.imageUrls && prodForm.imageUrls.map((url, idx) => (
                      <div key={`url-${idx}`} style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                        <img src={url} alt={`Saved ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button 
                          type="button" 
                          onClick={() => {
                            const newUrls = prodForm.imageUrls.filter((_, i) => i !== idx);
                            setProdForm({ ...prodForm, imageUrls: newUrls });
                          }}
                          style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                        >
                          ✕
                        </button>
                        {idx === 0 && (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'var(--primary)', color: 'white', fontSize: '9px', textAlign: 'center', padding: '2px 0', fontWeight: 'bold' }}>Portada</div>
                        )}
                      </div>
                    ))}

                    {/* Nuevas imágenes seleccionadas localmente */}
                    {prodForm.imageFiles && prodForm.imageFiles.map((file, idx) => {
                      const localUrl = URL.createObjectURL(file);
                      return (
                        <div key={`file-${idx}`} style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                          <img src={localUrl} alt={`Local ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button 
                            type="button" 
                            onClick={() => {
                              const newFiles = prodForm.imageFiles.filter((_, i) => i !== idx);
                              setProdForm({ ...prodForm, imageFiles: newFiles });
                            }}
                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                          >
                            ✕
                          </button>
                          {(!prodForm.imageUrls || prodForm.imageUrls.length === 0) && idx === 0 && (
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'var(--primary)', color: 'white', fontSize: '9px', textAlign: 'center', padding: '2px 0', fontWeight: 'bold' }}>Portada</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Input para agregar fotos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="form-input" 
                    onChange={e => {
                      const selectedFiles = Array.from(e.target.files);
                      setProdForm({
                        ...prodForm,
                        imageFiles: [...(prodForm.imageFiles || []), ...selectedFiles]
                      });
                    }} 
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Puedes seleccionar varias imágenes al mismo tiempo. La primera será la foto de portada.</span>
                </div>
              </div>

              {branches.length > 0 && (
                <div className="form-group modal-section-divider">
                  <label className="form-label">Disponibilidad en Sedes</label>
                  <div className="branch-grid">
                    {branches.map(b => (
                      <label key={b.id} className="branch-checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={prodForm.branchIds.includes(b.id)}
                          onChange={(e) => {
                            const newIds = e.target.checked 
                              ? [...prodForm.branchIds, b.id] 
                              : prodForm.branchIds.filter(id => id !== b.id);
                            setProdForm({...prodForm, branchIds: newIds});
                          }}
                        />
                        {b.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: activeTab === 'advanced' ? 'block' : 'none' }}>
              <div className="modal-section-divider">
                <h3 className="modal-section-title">🚀 Promociones y Visibilidad</h3>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
                  <label className="form-label">Tamaño en Rejilla</label>
                  <select 
                    className="form-input" 
                    value={prodForm.gridSpan} 
                    onChange={e => setProdForm({...prodForm, gridSpan: Number(e.target.value)})}
                  >
                    <option value={1}>Normal (1 col)</option>
                    <option value={2}>Destacado (2 cols)</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f0f9ff', padding: '0.75rem', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                <input 
                  type="checkbox" 
                  id="recommended"
                  checked={prodForm.recommended} 
                  onChange={e => setProdForm({...prodForm, recommended: e.target.checked})} 
                  style={{ width: '20px', height: '20px', accentColor: '#0ea5e9', cursor: 'pointer' }}
                />
                <div>
                  <label htmlFor="recommended" className="form-label" style={{ margin: 0, cursor: 'pointer', color: '#0369a1' }}>✨ Marcar como Recomendado</label>
                  <p style={{ fontSize: '0.7rem', color: '#0ea5e9', margin: 0 }}>Aparecerá con un distintivo especial en la carta.</p>
                </div>
              </div>

              <div className="modal-section-divider">
                <h3 className="modal-section-title">🎨 Estilo y Categorización</h3>
              </div>
              
              <details style={{ marginTop: '1rem', border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden' }} open>
                <summary style={{ padding: '0.75rem 1rem', background: '#f1f5f9', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
                  ⚙️ Configuración Avanzada de Tarjeta
                </summary>
                <div style={{ padding: '1rem', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Estilo de Tarjeta</label>
                    <select 
                      className="form-input" 
                      value={prodForm.cardLayout} 
                      onChange={e => setProdForm({...prodForm, cardLayout: e.target.value})}
                    >
                      <option value="global">Heredar de Subcategoría / Global</option>
                      <option value="col-standard">Foto Arriba</option>
                      <option value="col-title-first">Título Arriba</option>
                      <option value="col-img-bottom">Foto Abajo</option>
                      <option value="col-img-row-btn">Botón al lado</option>
                      <option value="row-img-left">Fila (Foto Izq)</option>
                      <option value="row-img-right">Fila (Foto Der)</option>
                      <option value="row-traditional">Tradicional</option>
                      <option value="row-offset-border">Offset con Borde · Foto Izquierda (Fauget)</option>
                      <option value="row-offset-border-r">Offset con Borde · Foto Derecha (Fauget Inverso)</option>
                      <option value="row-offset-border-alt">Offset con Borde · Escalonado (Fauget Zigzag)</option>
                      <option value="row-offset-border-alt-r">Offset con Borde · Escalonado Inverso (Fauget Zigzag Inverso)</option>
                    </select>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <label className="form-label" style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'block', fontSize: '0.85rem' }}>👁️ Personalizar Bordes de esta Tarjeta</label>
                    
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Combinación Rápida (Preset)</label>
                      <select 
                        className="form-input" 
                        style={{ fontSize: '0.8rem', padding: '4px' }}
                        value={(() => {
                          const t = prodForm.borderTopShow || 'global';
                          const r = prodForm.borderRightShow || 'global';
                          const b = prodForm.borderBottomShow || 'global';
                          const l = prodForm.borderLeftShow || 'global';
                          const presets = {
                            'global': ['global', 'global', 'global', 'global'],
                            'all': ['show', 'show', 'show', 'show'],
                            'top-bottom': ['show', 'hide', 'show', 'hide'],
                            'left-right': ['hide', 'show', 'hide', 'show'],
                            'fauget-classic': ['show', 'show', 'show', 'hide'],
                            'fauget-inverse': ['show', 'hide', 'show', 'show'],
                            'none': ['hide', 'hide', 'hide', 'hide']
                          };
                          const matched = Object.keys(presets).find(key => {
                            const p = presets[key];
                            return t === p[0] && r === p[1] && b === p[2] && l === p[3];
                          });
                          return matched || 'custom';
                        })()}
                        onChange={(e) => {
                          const val = e.target.value;
                          const presets = {
                            'global': { borderTopShow: 'global', borderRightShow: 'global', borderBottomShow: 'global', borderLeftShow: 'global' },
                            'all': { borderTopShow: 'show', borderRightShow: 'show', borderBottomShow: 'show', borderLeftShow: 'show' },
                            'top-bottom': { borderTopShow: 'show', borderRightShow: 'hide', borderBottomShow: 'show', borderLeftShow: 'hide' },
                            'left-right': { borderTopShow: 'hide', borderRightShow: 'show', borderBottomShow: 'hide', borderLeftShow: 'show' },
                            'fauget-classic': { borderTopShow: 'show', borderRightShow: 'show', borderBottomShow: 'show', borderLeftShow: 'hide' },
                            'fauget-inverse': { borderTopShow: 'show', borderRightShow: 'hide', borderBottomShow: 'show', borderLeftShow: 'show' },
                            'none': { borderTopShow: 'hide', borderRightShow: 'hide', borderBottomShow: 'hide', borderLeftShow: 'hide' }
                          };
                          if (presets[val]) {
                            setProdForm({ ...prodForm, ...presets[val] });
                          }
                        }}
                      >
                        <option value="custom">Personalizado (Manual)</option>
                        <option value="global">Heredar de Configuración General</option>
                        <option value="all">Mostrar todos los bordes (4 lados)</option>
                        <option value="top-bottom">Solo Arriba y Abajo</option>
                        <option value="left-right">Solo Izquierda y Derecha</option>
                        <option value="fauget-classic">Estilo Fauget Clásico (Sin Izquierda)</option>
                        <option value="fauget-inverse">Estilo Fauget Inverso (Sin Derecha)</option>
                        <option value="none">Sin Bordes</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 80px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Superior</label>
                        <select className="form-input" style={{ fontSize: '0.75rem', padding: '4px' }} value={prodForm.borderTopShow || 'global'} onChange={e => setProdForm({ ...prodForm, borderTopShow: e.target.value })}>
                          <option value="global">Heredar</option>
                          <option value="show">Mostrar</option>
                          <option value="hide">Ocultar</option>
                        </select>
                      </div>
                      <div style={{ flex: '1 1 80px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Derecho</label>
                        <select className="form-input" style={{ fontSize: '0.75rem', padding: '4px' }} value={prodForm.borderRightShow || 'global'} onChange={e => setProdForm({ ...prodForm, borderRightShow: e.target.value })}>
                          <option value="global">Heredar</option>
                          <option value="show">Mostrar</option>
                          <option value="hide">Ocultar</option>
                        </select>
                      </div>
                      <div style={{ flex: '1 1 80px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Inferior</label>
                        <select className="form-input" style={{ fontSize: '0.75rem', padding: '4px' }} value={prodForm.borderBottomShow || 'global'} onChange={e => setProdForm({ ...prodForm, borderBottomShow: e.target.value })}>
                          <option value="global">Heredar</option>
                          <option value="show">Mostrar</option>
                          <option value="hide">Ocultar</option>
                        </select>
                      </div>
                      <div style={{ flex: '1 1 80px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Izquierdo</label>
                        <select className="form-input" style={{ fontSize: '0.75rem', padding: '4px' }} value={prodForm.borderLeftShow || 'global'} onChange={e => setProdForm({ ...prodForm, borderLeftShow: e.target.value })}>
                          <option value="global">Heredar</option>
                          <option value="show">Mostrar</option>
                          <option value="hide">Ocultar</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>🏷️ Clase CSS Personalizada</label>
                    <input type="text" className="form-input" style={{ fontSize: '0.8rem', padding: '6px' }} placeholder="ej. prod-destacado" value={prodForm.customClass} onChange={e => setProdForm({...prodForm, customClass: e.target.value})} />
                    <p className="form-help" style={{ fontSize: '0.65rem' }}>Aplica clases CSS para personalizaciones de estilo adicionales.</p>
                  </div>
                </div>
              </details>

              <div className="form-group">
                <label className="form-label">Video (Solo para Modo TikTok/Reels)</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: '4px', marginBottom: '8px' }}>
                  {/* Video Guardado */}
                  {prodForm.videoUrl && !prodForm.videoFile && (
                    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                      <video src={prodForm.videoUrl} style={{ width: '100px', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-light)' }} muted controls />
                      <button 
                        type="button" 
                        onClick={() => setProdForm({ ...prodForm, videoUrl: '' })} 
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          lineHeight: '1',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          padding: 0
                        }}
                      >
                        ×
                      </button>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Video actual</span>
                    </div>
                  )}

                  {/* Video Nuevo */}
                  {prodForm.videoFile && (
                    <VideoFilePreview 
                      file={prodForm.videoFile} 
                      onRemove={() => setProdForm({ ...prodForm, videoFile: null })} 
                    />
                  )}
                </div>
                <input type="file" accept="video/mp4,video/quicktime" className="form-input" onChange={e => setProdForm({...prodForm, videoFile: e.target.files[0]})} />
              </div>

              <div className="form-group">
                <label className="form-label">🏷️ Clase CSS Personalizada</label>
                <input type="text" className="form-input" placeholder="ej. prod-destacado" value={prodForm.customClass} onChange={e => setProdForm({...prodForm, customClass: e.target.value})} />
                <p className="form-help">Para estilos especiales en la carta (borde dorado, sombras, etc.).</p>
              </div>
            </div>

          </div>
          <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowProdModal(false)} disabled={isUploading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isUploading}>
              {isUploading ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
