import React, { useRef } from 'react';

/**
 * Reutilizable: campo de carga de imagen con preview, botón de eliminar la actual
 * y botón para quitar el archivo seleccionado antes de guardar.
 *
 * Props:
 *  - label         (string)   Etiqueta del campo
 *  - currentUrl    (string)   URL de la imagen ya guardada en Storage (puede ser null/undefined)
 *  - selectedFile  (File)     Archivo nuevo seleccionado por el usuario (no guardado aún)
 *  - onFileChange  (fn)       (file: File | null) => void — se llama al seleccionar un nuevo archivo
 *  - onClearFile   (fn)       () => void — descarta el archivo seleccionado (sin borrar el guardado)
 *  - onDeleteSaved (fn)       () => void — borra la imagen ya guardada en BD + Storage
 *  - accept        (string)   Accept MIME types (default: "image/*")
 *  - hint          (string)   Texto de ayuda opcional debajo del campo
 *  - previewStyle  (object)   Estilos extra para el <img> de preview
 */
export default function ImageUploadField({
  label,
  currentUrl,
  selectedFile,
  onFileChange,
  onClearFile,
  onDeleteSaved,
  accept = 'image/*',
  hint,
  previewStyle = {}
}) {
  const inputRef = useRef(null);

  const previewSrc = selectedFile
    ? URL.createObjectURL(selectedFile)
    : currentUrl || null;

  const hasAnything = !!previewSrc;

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}

      {/* ── Preview ── */}
      {hasAnything && (
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.5rem' }}>
          <img
            src={previewSrc}
            alt="Preview"
            style={{
              height: '72px',
              borderRadius: '8px',
              objectFit: 'cover',
              display: 'block',
              border: '1px solid var(--border-light)',
              ...previewStyle
            }}
          />
          {/* Botón X sobre la imagen */}
          <button
            type="button"
            title={selectedFile ? 'Quitar archivo seleccionado' : 'Eliminar imagen guardada'}
            onClick={() => {
              if (selectedFile) {
                // Solo descarta el archivo nuevo; no toca la BD
                onClearFile?.();
                if (inputRef.current) inputRef.current.value = '';
              } else {
                // Borra la imagen guardada de BD + Storage
                onDeleteSaved?.();
              }
            }}
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              lineHeight: 1,
              fontWeight: 700,
              boxShadow: '0 1px 4px rgba(0,0,0,0.25)'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── File input ── */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="form-input"
        onChange={e => {
          const file = e.target.files?.[0] || null;
          onFileChange?.(file);
        }}
      />

      {hint && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
          {hint}
        </p>
      )}
    </div>
  );
}
