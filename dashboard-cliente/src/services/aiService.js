import { db } from './firebase';
import { doc, updateDoc, collection, addDoc, getDoc, getDocs } from 'firebase/firestore';

const API_KEY = "sk-8b5863d731b7442b960e02d2140c1989";
const BASE_URL = "https://api.deepseek.com/chat/completions";

const SYSTEM_PROMPT = `
Eres "Karol", la GUÍA ESTRATÉGICA de **Carta y Mesa**. Tu única misión es INFORMAR, EXPLICAR y ORIENTAR al usuario sobre cómo usar la plataforma para que su restaurante sea exitoso.

REGLAS DE SEGURIDAD Y PRIVACIDAD (CRÍTICO):
1. **BLOQUEO TÉCNICO TOTAL**: Tienes terminantemente PROHIBIDO hablar sobre el código fuente, la arquitectura del software, nombres de archivos (ej: index.js, aiService.js), estructura de colecciones de Firebase, claves de API o cualquier detalle de implementación interna.
2. **DESVÍO DE CONSULTAS HACKER**: Si un usuario pregunta sobre la base de datos, el backend, o pide ver código, responde profesionalmente: "Mi especialidad es la gestión estratégica y operativa de tu restaurante en Carta y Mesa. Para temas de soporte técnico avanzado, por favor contacta al equipo de desarrollo."
3. **MODO SÓLO INFORMACIÓN**: No realices acciones directas en la cuenta del usuario. Tu labor es decirle al usuario CÓMO hacerlo él mismo. Guíalo paso a paso por la interfaz que tiene frente a él.

REGLAS DE ASISTENCIA:
1. **CONOCIMIENTO SITUACIONAL**: Usa la sección 'UBICACIÓN ACTUAL' y 'GUÍA DE NAVEGACIÓN' para saber exactamente dónde está el usuario y explicarle qué botones o pestañas tiene disponibles para llegar a su objetivo.
2. **ASISTENCIA POR CAMPO**: Si recibes un 'FOCO DE ASISTENCIA', prioriza esa explicación técnica y estratégica del campo específico solicitado por el botón de IA.
3. **CONSULTORÍA DE NEGOCIO**: Aconseja sobre estética, marketing y operación basándote en los datos del restaurante.

TONO: Directo, experto, estratégico y muy servicial. No uses lenguaje de programación, usa lenguaje de negocios gastronómicos.
`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_restaurant_state",
      description: "Lee el estado actual del restaurante (productos, categorías, diseño).",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "add_product",
      description: "Crea un nuevo producto en el menú.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          price: { type: "number" },
          description: { type: "string" },
          categoryId: { type: "string", description: "ID de la categoría. Si no se provee, se usará la primera disponible." },
          categoryName: { type: "string", description: "Nombre de la categoría en la que deseas crear el producto (ej: 'Bebidas', 'Entradas')." }
        },
        required: ["name", "price"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_category",
      description: "Crea una nueva categoría de productos.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_design_config",
      description: "Cambia configuraciones visuales como colores, fuentes o modos de vista.",
      parameters: {
        type: "object",
        properties: {
          primaryColor: { type: "string", description: "Color hexadecimal" },
          menuViewMode: { type: "string", enum: ["grid", "reels", "video-vertical", "feed-fotos"] },
          fontFamily: { type: "string" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_custom_css",
      description: "Inyecta código CSS personalizado en el menú.",
      parameters: {
        type: "object",
        properties: {
          cssCode: { type: "string", description: "Código CSS completo para añadir o reemplazar." }
        },
        required: ["cssCode"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_general_settings",
      description: "Modifica información básica del restaurante como nombre, teléfono, dirección, etc.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          address: { type: "string" },
          currency: { type: "string", enum: ["COP", "USD", "EUR"] },
          isOpen: { type: "boolean" }
        }
      }
    }
  }
];

export const cleanAiResponse = (text) => {
  return text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
};

export async function chatWithDeepSeek(messages, options = {}) {
  // Asegurarnos de que el primer mensaje sea el del sistema
  const finalMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages
  ];

  const body = {
    model: "deepseek-chat",
    messages: finalMessages,
  };

  // Solo incluir tools si no se deshabilitan explícitamente
  if (options.noTools !== true) {
    body.tools = TOOLS;
    body.tool_choice = "auto";
  }

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Error en DeepSeek");
  }

  return await response.json();
}

export async function handleFunctionCall(restaurantId, toolCall, localContext = null, updateLocalState = null) {
  const { name, arguments: argsString } = toolCall.function;
  const args = JSON.parse(argsString || '{}');
  
  try {
    if (name === "get_restaurant_state") {
      if (localContext) {
        return { success: true, data: formatRestaurantContext(localContext) };
      }
      const context = await fetchRestaurantContext(restaurantId);
      return { success: true, data: context };
    }

    if (name === "update_general_settings") {
      const { updateGeneralSettings } = await import('./settingsService');
      await updateGeneralSettings(restaurantId, args);
      
      if (updateLocalState) {
        updateLocalState('UPDATE_RESTAURANT', args);
      }
      return { success: true, message: "Configuración general actualizada correctamente." };
    }

    if (name === "add_product") {
      const { addProduct } = await import('./menuService');
      
      // Limpieza y validación de datos
      const price = Number(args.price);
      if (isNaN(price)) throw new Error("El precio debe ser un número válido.");

      let finalCatId = args.categoryId;
      
      // Resolver coincidencia de categoría por nombre o ID en el contexto
      if (localContext?.categories?.length > 0) {
        const targetSearch = args.categoryName || finalCatId;
        if (targetSearch) {
          const matchedCat = localContext.categories.find(c => 
            c.id === targetSearch || 
            c.name?.toLowerCase() === targetSearch?.toLowerCase()
          );
          if (matchedCat) {
            finalCatId = matchedCat.id;
          }
        }
        
        // Si no se resolvió a un ID válido, tomar la primera categoría por defecto
        if (!finalCatId || !localContext.categories.some(c => c.id === finalCatId)) {
          finalCatId = localContext.categories[0].id;
        }
      }

      if (!finalCatId) throw new Error("No se encontró una categoría válida para asignar el producto.");

      const productData = {
        name: args.name,
        price: price,
        description: args.description || "",
        categoryId: finalCatId,
        branchIds: localContext?.branches?.map(b => b.id) || [],
        available: true,
        imageUrl: "",
        promotionType: "none",
        recommended: false
      };

      const pId = await addProduct(restaurantId, productData);
      
      if (updateLocalState) {
        updateLocalState('ADD_PRODUCT', { ...productData, id: pId });
      }

      return { success: true, message: `¡Listo! Ya agregué '${args.name}' a tu menú.`, productId: pId };
    }

    if (name === "add_category") {
      const { addCategory } = await import('./menuService');
      
      // Obtener IDs de todas las sedes disponibles en el contexto
      const allBranchIds = localContext?.branches?.map(b => b.id) || [];
      
      const categoryData = {
        name: args.name,
        order: (localContext?.categories?.length || 0),
        branchIds: allBranchIds // 🚀 Asignar TODAS las sedes por defecto si no se especifican
      };

      const cId = await addCategory(restaurantId, categoryData);
      
      if (updateLocalState) {
        updateLocalState('ADD_CATEGORY', { ...categoryData, id: cId });
      }

      return { success: true, message: `Categoría '${args.name}' creada y activada en tus sedes.`, categoryId: cId };
    }

    if (name === "update_design_config") {
      const { updateDesignConfig } = await import('./designService');
      await updateDesignConfig(restaurantId, args);
      
      if (updateLocalState) {
        updateLocalState('UPDATE_DESIGN', args);
      }

      return { success: true, message: "Configuración de diseño actualizada correctamente." };
    }

    if (name === "update_custom_css") {
      const { updateDesignConfig } = await import('./designService');
      await updateDesignConfig(restaurantId, { customCss: args.cssCode });
      
      if (updateLocalState) {
        updateLocalState('UPDATE_DESIGN', { customCss: args.cssCode });
      }

      return { success: true, message: "Código CSS inyectado correctamente." };
    }

    return { error: "Función no reconocida." };
  } catch (error) {
    return { error: error.message };
  }
}

export function formatRestaurantContext(data) {
  if (!data) return "Cargando datos...";
  
  const { restaurant = {}, design = {}, categories = [], products = [], branches = [] } = data;
  
  const categoriesList = Array.isArray(categories) 
    ? categories.map(c => typeof c === 'string' ? c : (c.name || 'Sin nombre')).join(', ')
    : 'No disponibles';
    
  const productsList = Array.isArray(products)
    ? products.map(p => typeof p === 'string' ? p : `${p.name || 'Sin nombre'} ($${p.price || 0})`).join(', ')
    : 'No disponibles';

  const branchesList = Array.isArray(branches)
    ? branches.map(b => `${b.name || 'Sede sin nombre'} (Caja permanente: ${b.alwaysOpenShift ? 'SÍ' : 'NO'})`).join(', ')
    : 'No disponibles';
    
  const ingredientsList = data.ingredients 
    ? data.ingredients.map(i => `${i.name} (Stock: ${i.currentStock || 0} ${i.unit})`).join(', ')
    : 'No solicitados o no disponibles';

  return `
=== INFORMACIÓN REAL DEL RESTAURANTE (ESTADO DE LA APP) ===
NOMBRE: ${restaurant.name || 'No configurado'}
TELÉFONO: ${restaurant.phone || 'No configurado'}
DIRECCIÓN: ${restaurant.address || 'No configurada'}
SEDES ACTUALES: ${branchesList}
CONFIGURACIÓN: Plan ${restaurant.subscription?.planLevel || 0}, Estado ${restaurant.subscription?.status || 'Inactivo'}, Caja Global Permanente: ${restaurant.alwaysOpenShift ? 'SÍ' : 'NO'}

=== DISEÑO ACTUAL ===
MODO: ${design.menuViewMode || 'Grid'}
COLOR: ${design.primaryColor || '#000'}

=== INVENTARIO Y MENÚ ===
CATEGORÍAS: ${categoriesList}
PRODUCTOS: ${productsList}
INSUMOS (Materia Prima): ${ingredientsList}

=== CAPACIDADES ACTUALES DE LA PLATAFORMA (CARTA Y MESA SaaS) ===
La app soporta: Menú Digital multi-sede, Códigos QR por Mesa, Pedidos a Domicilio, CRM de clientes, Suscripciones a planes (Free, Plus, Pro, Business), Personalización avanzada con CSS, Gestión de Roles/Meseros, Control de Inventario Inteligente (Recetas, Mermas, Descuento automático al despachar órdenes) y Analíticas de Rentabilidad Financiera. Úsalo como referencia si el usuario te pregunta qué se puede hacer en la plataforma.
==========================================================
`.trim();
}

export async function fetchRestaurantContext(restaurantId) {
  try {
    if (!restaurantId || restaurantId === 'default') return "No hay ID de restaurante válido.";

    const restSnap = await getDoc(doc(db, 'restaurants', restaurantId));
    const restData = restSnap.exists() ? restSnap.data() : {};

    const designSnap = await getDoc(doc(db, 'restaurants', restaurantId, 'config', 'design'));
    const designData = designSnap.exists() ? designSnap.data() : {};

    const catsSnap = await getDocs(collection(db, 'restaurants', restaurantId, 'categories'));
    const categories = catsSnap.docs.map(doc => doc.data().name);

    const prodsSnap = await getDocs(collection(db, 'restaurants', restaurantId, 'productBuckets'));
    let products = [];
    prodsSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.products) {
        data.products.forEach(p => products.push(`${p.name} ($${p.price})`));
      }
    });

    const branchesSnap = await getDocs(collection(db, 'restaurants', restaurantId, 'branches'));
    const branches = branchesSnap.docs.map(doc => doc.data().name);

    const ingSnap = await getDocs(collection(db, 'restaurants', restaurantId, 'ingredients'));
    const ingredients = ingSnap.docs.map(doc => {
      const data = doc.data();
      return `${data.name} (Stock: ${data.currentStock || 0} ${data.unit})`;
    });

    return `
=== INFORME DE SITUACIÓN REAL ===
RESTAURANTE: ${restData.name || 'Sin nombre'}
UBICACIÓN: ${restData.address || 'Sin dirección'}
CONFIGURACIÓN: Plan ${restData.subscription?.planLevel || 0}, Estado ${restData.subscription?.status || 'Inactivo'}

=== SEDES REGISTRADAS ===
SEDES (${branches.length}): ${branches.join(', ') || 'Ninguna'}

=== DISEÑO ACTUAL ===
MODO: ${designData.menuViewMode || 'Grid'}
COLOR: ${designData.primaryColor || '#000'}

=== INVENTARIO Y MENÚ ===
CATEGORÍAS: ${categories.join(', ') || 'Ninguna'}
PRODUCTOS: ${products.join(', ') || 'Ninguno'}
INSUMOS (Materia Prima): ${ingredients.join(', ') || 'Ninguno'}

=== CAPACIDADES ACTUALES DE LA PLATAFORMA (CARTA Y MESA SaaS) ===
La app soporta: Menú Digital multi-sede, Códigos QR por Mesa, Pedidos a Domicilio, CRM de clientes, Suscripciones a planes (Free, Plus, Pro, Business), Personalización avanzada con CSS, Gestión de Roles/Meseros, Control de Inventario Inteligente (Recetas, Mermas, Descuento automático al despachar órdenes) y Analíticas de Rentabilidad Financiera. Úsalo como referencia si el usuario te pregunta qué se puede hacer en la plataforma.
========================================
`.trim();
  } catch (error) {
    console.error("Error fetching context:", error);
    return "Error al obtener datos reales.";
  }
}

export async function generateAiCss(prompt, contextDoc) {
  // Usamos un system prompt propio (sin SYSTEM_PROMPT general) y deshabilitamos
  // las tools para que el modelo devuelva CSS puro, no llamadas a funciones.
  const messages = [
    {
      role: "system",
      content: `Eres Karol, experta en CSS para el editor de diseño de Carta y Mesa.

TU ÚNICA TAREA: generar código CSS puro basado en la petición del usuario.

REGLAS OBLIGATORIAS:
1. Devuelve SOLO el código CSS, sin ningún texto adicional.
2. NO uses bloques de markdown (\`\`\`css ... \`\`\`).
3. NO escribas frases como "Aquí tienes" o "Este es el código".
4. Si la petición incluye animaciones, incluye los @keyframes necesarios.
5. Usa las clases reales del sistema (contexto abajo). Prioriza especificidad CSS sobre !important.
6. El CSS se inyecta directamente en el menú, así que escribe CSS válido y completo.`
    },
    {
      role: "user",
      content: `CLASES Y SELECTORES DISPONIBLES:\n${JSON.stringify(contextDoc, null, 2)}\n\nPETICIÓN DEL USUARIO: ${prompt}\n\nGenera el CSS ahora:`
    }
  ];

  // noTools: true => no enviar tools al API, el modelo devuelve texto directo
  const res = await chatWithDeepSeek(messages, { noTools: true });
  const content = res.choices[0].message.content || '';
  return cleanAiResponse(content);
}


export async function generateDishDescription(dishName) {
  const res = await chatWithDeepSeek([
    { role: "system", content: "Eres un experto gastron\u00f3mico. Genera descripciones de platos irresistibles. Devuelve \u00daNICAMENTE la descripci\u00f3n del plato, sin introducciones, sin saludos, sin bloques de c\u00f3digo y sin comentarios adicionales. M\u00e1ximo 20 palabras." },
    { role: "user", content: `Genera una descripci\u00f3n para: ${dishName}` }
  ]);
  return cleanAiResponse(res.choices[0].message.content).replace(/["']/g, '');
}

