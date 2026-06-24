import { storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

export const Storage = {
  async uploadFile(path, file) {
    let fileToUpload = file;

    // Optimizar solo si es una imagen
    if (file.type.startsWith('image/')) {
      try {
        const options = {
          maxSizeMB: 0.8,           // Máximo 800KB
          maxWidthOrHeight: 1280,   // Redimensionar si es muy grande
          useWebWorker: true,
          initialQuality: 0.8,
          fileType: 'image/webp'    // Convertir a WebP para máxima eficiencia
        };
        
        fileToUpload = await imageCompression(file, options);
        
        // Ajustar el nombre si se convirtió a webp
        if (fileToUpload.type === 'image/webp' && !path.toLowerCase().endsWith('.webp')) {
          // Opcional: podrías cambiar la extensión en el path, 
          // pero Firebase Storage no requiere que la extensión coincida con el MIME type.
          // Sin embargo, es mejor para la claridad.
        }
      } catch (error) {
        console.error('[Storage] Error al optimizar imagen, subiendo original:', error);
        fileToUpload = file;
      }
    }

    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, fileToUpload);
    return await getDownloadURL(snapshot.ref);
  },

  /**
   * Deletes a file from Firebase Storage given its public download URL.
   * Silently ignores errors (e.g. file not found) so callers never crash on cleanup.
   */
  async deleteFile(url) {
    if (!url || typeof url !== 'string') return;
    try {
      // Extract the encoded path from the download URL and decode it
      const urlObj = new URL(url);
      const pathParam = urlObj.pathname;
      // Firebase Storage URLs look like: /v0/b/<bucket>/o/<encoded-path>
      const match = pathParam.match(/\/o\/(.+)$/);
      if (!match) return;
      const decodedPath = decodeURIComponent(match[1]);
      const fileRef = ref(storage, decodedPath);
      await deleteObject(fileRef);
    } catch (e) {
      // Silently ignore — file may have already been deleted or URL may be external
      console.warn('[Storage] deleteFile silenced error:', e?.code || e?.message);
    }
  }
};
