import { db, auth, vertexAI } from './firebase';
import { getGenerativeModel } from "firebase/ai";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  query, 
  orderBy, 
  runTransaction,
  arrayUnion,
  serverTimestamp 
} from 'firebase/firestore';

const SYSTEM_PROMPT = `
Eres "Camila", la asistente virtual inteligente de la plataforma **MiProdu** — una plataforma SaaS colombiana para que restaurantes, cafés y negocios de comida gestionen su menú digital y pedidos online.

## TU MISIÓN
Ayudar a los dueños de restaurantes y administradores a:
1. Entender cómo funciona la plataforma MiProdu
2. Configurar y gestionar su menú (Categorías y Productos)
3. Personalizar el diseño y estilos del menú
4. Resolver dudas sobre pedidos y configuración

## RESTRICCIÓN CRÍTICA
- SOLO puedes responder sobre MiProdu. Si preguntan algo ajeno, di: "Solo puedo ayudarte con temas relacionados a MiProdu 🍽️. ¿Tienes alguna duda sobre tu menú, pedidos o configuración?"
- **NO tienes acceso** a credenciales de servicios, API keys, ni datos de facturación detallada del restaurante.
- **NO tienes acceso** a estadísticas de ventas ni reportes financieros. Si te preguntan cuánto vendieron, diles que pueden verlo en la sección de "Dashboard" o "Analytics".

---

## TUS HERRAMIENTAS (Function Calling)
Tienes acceso a herramientas para modificar el restaurante en tiempo real. **SIEMPRE pide confirmación** antes de realizar acciones destructivas (como borrar un producto o categoría).

### 📋 Gestión de Menú
- **getCategories / getProducts**: Úsalas para saber qué tiene el usuario antes de editar o borrar.
- **addCategory / updateCategory / deleteCategory**: Para gestionar grupos de productos.
- **addProduct / updateProduct / deleteProduct**: Para gestionar los items individuales. 
  - *Nota*: Al añadir productos, pide los datos básicos (nombre, precio, categoría).

### 🎨 Diseño y CSS
- **getDesignConfig / updateDesignConfig**: Para cambiar colores, fuentes, espaciados y el estilo visual general.
- **getCustomCSS / updateCustomCSS**: Para cambios de estilo avanzados mediante código CSS.

---

## ESTRUCTURA DE LA PLATAFORMA

### 🏠 Panel de Administración (Dashboard)
- **Dashboard**: Resumen, pedidos recientes.
- **Gestión del Menú**: Categorías y productos.
- **Pedidos / Comandas**: Gestión en tiempo real.
- **Diseño**: Personalización total.
- **Configuración**: Perfil, sedes, integraciones.

### 📋 GESTIÓN DEL MENÚ
- Productos tienen: nombre, descripción, precio, precio descuento, imagen, etiquetas (Nuevo, Popular).
- Modos de vista: Cuadrícula, Reels (horizontal full), TikTok (vertical full), Instagram (feed).

### 🎨 DISEÑO
- Variables CSS: --primary-color, --background-color, --card-background, --title-color, --font-family, etc.
- Configuración de tarjetas: columnas (1, 2, 3), bordes, sombras.

---

## CÓMO RESPONDER
1. **Sé proactiva**: Si el usuario dice "quiero crear un producto", no solo expliques, ofrece usar la herramienta.
2. **Confirma antes de borrar**: "Entiendo que quieres borrar la categoría 'Bebidas'. Esto borrará todos los productos dentro. ¿Estás seguro? ✅"
3. **Reporta éxito**: Al usar una herramienta, confirma al usuario: "¡Listo! He creado el producto 'Hamburguesa Especial' con éxito. 🍔"
4. **Emoji usage**: Usa 🍽️, ⚙️, 🎨, ✅, ❌, 🍔, 🍕 según el contexto.
5. **Idioma**: Español colombiano ("tu" o "usted").
`;

const assistantTools = [
  {
    functionDeclarations: [
      {
        name: "getCategories",
        description: "Obtiene todas las categorías del menú del restaurante.",
        parameters: { type: "object", properties: {} }
      },
      {
        name: "addCategory",
        description: "Crea una nueva categoría en el menú.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Nombre de la categoría" },
            order: { type: "number", description: "Orden de visualización (opcional)" },
            viewMode: { type: "string", enum: ["grid", "reels", "tiktok", "instagram"], description: "Modo de visualización" }
          },
          required: ["name"]
        }
      },
      {
        name: "updateCategory",
        description: "Actualiza una categoría existente.",
        parameters: {
          type: "object",
          properties: {
            categoryId: { type: "string" },
            data: { 
              type: "object",
              properties: {
                name: { type: "string" },
                order: { type: "number" },
                viewMode: { type: "string" }
              }
            }
          },
          required: ["categoryId", "data"]
        }
      },
      {
        name: "deleteCategory",
        description: "Elimina una categoría del menú.",
        parameters: {
          type: "object",
          properties: {
            categoryId: { type: "string" }
          },
          required: ["categoryId"]
        }
      },
      {
        name: "getProducts",
        description: "Obtiene todos los productos del menú.",
        parameters: { type: "object", properties: {} }
      },
      {
        name: "addProduct",
        description: "Crea un nuevo producto en el menú.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            price: { type: "number" },
            categoryId: { type: "string" },
            tags: { type: "array", items: { type: "string" } }
          },
          required: ["name", "price", "categoryId"]
        }
      },
      {
        name: "updateProduct",
        description: "Actualiza un producto existente.",
        parameters: {
          type: "object",
          properties: {
            productId: { type: "string" },
            bucketId: { type: "string", description: "ID del bucket donde está el producto (obligatorio)" },
            data: { type: "object" }
          },
          required: ["productId", "bucketId", "data"]
        }
      },
      {
        name: "deleteProduct",
        description: "Elimina un producto del menú.",
        parameters: {
          type: "object",
          properties: {
            productId: { type: "string" },
            bucketId: { type: "string" }
          },
          required: ["productId", "bucketId"]
        }
      },
      {
        name: "getDesignConfig",
        description: "Obtiene la configuración de diseño actual (colores, fuentes, etc).",
        parameters: { type: "object", properties: {} }
      },
      {
        name: "updateDesignConfig",
        description: "Actualiza la configuración de diseño del menú.",
        parameters: {
          type: "object",
          properties: {
            config: { type: "object", description: "Objeto con las variables de diseño a cambiar" }
          },
          required: ["config"]
        }
      },
      {
        name: "getCustomCSS",
        description: "Obtiene el código CSS personalizado actual.",
        parameters: { type: "object", properties: {} }
      },
      {
        name: "updateCustomCSS",
        description: "Actualiza el código CSS personalizado del restaurante.",
        parameters: {
          type: "object",
          properties: {
            css: { type: "string" }
          },
          required: ["css"]
        }
      }
    ]
  }
];

const MAX_PRODUCTS_PER_BUCKET = 50;

const assistantHandlers = {
  getCategories: async (restaurantId) => {
    const q = query(collection(db, `restaurants/${restaurantId}/categories`), orderBy("order", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  addCategory: async (restaurantId, { name, order = 0, viewMode = "grid" }) => {
    const docRef = await addDoc(collection(db, `restaurants/${restaurantId}/categories`), { name, order, viewMode });
    return { id: docRef.id, message: "Categoría creada con éxito" };
  },
  updateCategory: async (restaurantId, { categoryId, data }) => {
    await updateDoc(doc(db, `restaurants/${restaurantId}/categories/${categoryId}`), data);
    return { message: "Categoría actualizada con éxito" };
  },
  deleteCategory: async (restaurantId, { categoryId }) => {
    await deleteDoc(doc(db, `restaurants/${restaurantId}/categories/${categoryId}`));
    return { message: "Categoría eliminada con éxito" };
  },
  getProducts: async (restaurantId) => {
    const snap = await getDocs(collection(db, `restaurants/${restaurantId}/productBuckets`));
    let all = [];
    snap.forEach(doc => { all = [...all, ...(doc.data().products || [])]; });
    return all;
  },
  addProduct: async (restaurantId, productData) => {
    const productId = `prod_${Date.now()}`;
    await runTransaction(db, async (transaction) => {
      const metaRef = doc(db, `restaurants/${restaurantId}/productMetadata/info`);
      const metaDoc = await transaction.get(metaRef);
      let activeBucketId = metaDoc.exists() ? metaDoc.data().activeBucketId : "bucket_1";
      
      const newProduct = { ...productData, id: productId, bucketId: activeBucketId, createdAt: new Date().toISOString() };
      const bucketRef = doc(db, `restaurants/${restaurantId}/productBuckets/${activeBucketId}`);
      const bucketDoc = await transaction.get(bucketRef);

      if (!bucketDoc.exists()) {
        transaction.set(bucketRef, { id: activeBucketId, count: 1, products: [newProduct] });
        transaction.set(metaRef, { activeBucketId, totalProducts: 1 });
      } else if (bucketDoc.data().count >= MAX_PRODUCTS_PER_BUCKET) {
        const nextId = `bucket_${parseInt(activeBucketId.split("_")[1]) + 1}`;
        newProduct.bucketId = nextId;
        transaction.set(doc(db, `restaurants/${restaurantId}/productBuckets/${nextId}`), { id: nextId, count: 1, products: [newProduct] });
        transaction.update(metaRef, { activeBucketId: nextId, totalProducts: (metaDoc.data().totalProducts || 0) + 1 });
      } else {
        transaction.update(bucketRef, { 
          products: arrayUnion(newProduct),
          count: (bucketDoc.data().count || 0) + 1 
        });
        transaction.update(metaRef, { totalProducts: (metaDoc.data().totalProducts || 0) + 1 });
      }
    });
    return { id: productId, message: "Producto añadido con éxito" };
  },
  updateProduct: async (restaurantId, { productId, bucketId, data }) => {
    const bucketRef = doc(db, `restaurants/${restaurantId}/productBuckets/${bucketId}`);
    const bucketDoc = await getDoc(bucketRef);
    if (!bucketDoc.exists()) throw new Error("Bucket no encontrado");
    const products = bucketDoc.data().products || [];
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) throw new Error("Producto no encontrado");
    products[idx] = { ...products[idx], ...data };
    await updateDoc(bucketRef, { products });
    return { message: "Producto actualizado con éxito" };
  },
  deleteProduct: async (restaurantId, { productId, bucketId }) => {
    const bucketRef = doc(db, `restaurants/${restaurantId}/productBuckets/${bucketId}`);
    const bucketDoc = await getDoc(bucketRef);
    if (!bucketDoc.exists()) throw new Error("Bucket no encontrado");
    const products = (bucketDoc.data().products || []).filter(p => p.id !== productId);
    await updateDoc(bucketRef, { products, count: products.length });
    return { message: "Producto eliminado con éxito" };
  },
  getDesignConfig: async (restaurantId) => {
    const snap = await getDoc(doc(db, `restaurants/${restaurantId}/config/design`));
    return snap.exists() ? snap.data() : { message: "Sin configuración personalizada" };
  },
  updateDesignConfig: async (restaurantId, { config }) => {
    await setDoc(doc(db, `restaurants/${restaurantId}/config/design`), config, { merge: true });
    return { message: "Configuración de diseño actualizada" };
  },
  getCustomCSS: async (restaurantId) => {
    const snap = await getDoc(doc(db, `restaurants/${restaurantId}/config/css`));
    return snap.exists() ? snap.data() : { css: "" };
  },
  updateCustomCSS: async (restaurantId, { css }) => {
    await setDoc(doc(db, `restaurants/${restaurantId}/config/css`), { css, updatedAt: new Date().toISOString() });
    return { message: "CSS personalizado actualizado con éxito" };
  }
};

export const chatWithCamila = async (message, history = []) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const restaurantId = user.uid;

  const model = getGenerativeModel(vertexAI, { 
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
    tools: assistantTools,
  });

  const chat = model.startChat({
    history: history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }))
  });

  let result = await chat.sendMessage(message);
  let response = result.response;
  let calls = response.functionCalls();

  let loopCount = 0;
  while (calls && calls.length > 0 && loopCount < 5) {
    const functionResponses = [];
    for (const call of calls) {
      const handler = assistantHandlers[call.name];
      if (handler) {
        const toolResult = await handler(restaurantId, call.args);
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: toolResult
          }
        });
      }
    }

    if (functionResponses.length > 0) {
      result = await chat.sendMessage(functionResponses);
      response = result.response;
      calls = response.functionCalls();
    } else {
      break;
    }
    loopCount++;
  }

  return response.text();
};
