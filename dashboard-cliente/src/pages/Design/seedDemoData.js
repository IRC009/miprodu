/**
 * Demo data seeder for menu themes.
 * Creates sample categories with subcategories, and products with real food images.
 */
import { addCategory, addProduct } from '../../services/menuService';
import { getBranches, addBranch } from '../../services/branchService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

// Unsplash images mimicking the reference styles
const FOOD = {
  bowl1: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
  bowl2: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  bowl3: 'https://images.unsplash.com/photo-1555126634-ae230aa70146?w=600&q=80',
  bowl4: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=600&q=80',

  pizza: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  steak: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&q=80',

  indian1: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80',
  indian2: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=600&q=80',
  indian3: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80',

  plate1: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&q=80',
  plate2: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80',
  plate3: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80',
  plate4: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80',
  plate5: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80',
  plate6: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=600&q=80',

  cocktail1: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80',
  cocktail2: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&q=80',

  fauget1: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  fauget2: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80',
  fauget3: 'https://images.unsplash.com/photo-1559058789-672da06263d8?w=600&q=80',
  fauget4: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80',
  
  neon1: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  neon2: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600&q=80',
  neon3: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80',
  
  sushi1: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80',
  sushi2: 'https://images.unsplash.com/photo-1583623025817-d180a2221dce?w=600&q=80',
  
  coffee1: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600&q=80',
  coffee2: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=600&q=80',
  
  bakery1: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=600&q=80',
  bakery2: 'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=600&q=80',
};

/**
 * Demo data per theme matching the exact 6 reference images.
 * Now heavily utilizing subcategories.
 */
const DEMO_DATA = {
  'luxury-noir': {
    categories: [
      {
        name: 'EXPERIENCIA GOURMET', order: 0,
        subcategories: [{ id: 'sub_entradas', name: 'Entradas de Autor' }, { id: 'sub_fuertes', name: 'Platos Fuertes' }, { id: 'sub_postres', name: 'Postres y Dulces' }, { id: 'sub_cocteles', name: 'Cocteles de Autor' }],
        products: [
          { name: 'Truffle Ribeye Steak', description: 'Corte premium de Ribeye (450g) a la parrilla con mantequilla de trufa negra, papas rústicas y espárragos glaseados.', price: 92000, imageUrl: FOOD.steak, subcategory: 'sub_fuertes', recommended: true },
          { name: 'Salmon Tartare', description: 'Dados de salmón fresco del Atlántico marinado en ponzu cítrica, aguacate cremoso, pepino y láminas de trufa.', price: 48000, imageUrl: FOOD.plate2, subcategory: 'sub_entradas' },
          { name: 'Risotto de Setas Silvestres', description: 'Arroz arborio cocido a fuego lento con caldo de hongos porcini, mix de setas frescas y queso parmesano Reggiano de 24 meses.', price: 59000, imageUrl: FOOD.plate1, subcategory: 'sub_fuertes' },
          { name: 'Lobster Thermidor', description: 'Langosta entera gratinada con una rica salsa cremosa a base de coñac, mostaza Dijon, estragón y parmesano.', price: 110000, imageUrl: FOOD.plate5, subcategory: 'sub_fuertes' },
          { name: 'Caviar Osetra Imperial', description: 'Lata de caviar seleccionada (30g) servida sobre blinis tibios de trigo sarraceno, crema agria y cebollino fino.', price: 150000, imageUrl: FOOD.plate3, subcategory: 'sub_entradas' },
          { name: 'Volcán de Chocolate Belga', description: 'Bizcocho tibio con corazón líquido de chocolate belga de 70%, helado de vainilla de Madagascar y polvo de oro comestible.', price: 26000, imageUrl: FOOD.bakery1, subcategory: 'sub_postres' },
          { name: 'Golden Sunset Cocktail', description: 'Ron añejo premium infusionado con vainilla, miel de azafrán, zumo de toronja fresca y terminado con hojuelas de oro comestibles de 24k.', price: 42000, imageUrl: FOOD.cocktail1, subcategory: 'sub_cocteles' },
          { name: 'Margarita Imperial', description: 'Tequila Patrón Reposado, licor de naranja Cointreau, zumo fresco de lima y un toque suave de sirope de agave.', price: 38000, imageUrl: FOOD.cocktail2, subcategory: 'sub_cocteles', variants: [
            { name: 'Tradicional (Patrón)', price: 38000 },
            { name: 'Don Julio 70 (Añejo)', price: 49000 }
          ]}
        ]
      }
    ]
  },
  'emerald-garden': {
    categories: [
      {
        name: 'CARTA SALUDABLE', order: 0,
        subcategories: [{ id: 'sub_bowls', name: 'Eco Bowls' }, { id: 'sub_entradas_eco', name: 'Entradas Verdes' }, { id: 'sub_postres_eco', name: 'Dulces Sin Culpa' }, { id: 'sub_zumos', name: 'Zumos & Tonics' }],
        products: [
          { name: 'Superfood Quinoa Bowl', description: 'Quinoa orgánica, aguacate hass, col rizada (kale), edamames, arándanos deshidratados y aderezo cremoso de limón y tahini.', price: 29900, imageUrl: FOOD.bowl1, subcategory: 'sub_bowls', recommended: true },
          { name: 'Spiced Chickpea Bowl', description: 'Garbanzos crujientes horneados con pimentón ahumado, tomates cherry, pepino, hojas de espinaca y aderezo de yogur griego con menta.', price: 27500, imageUrl: FOOD.bowl2, subcategory: 'sub_bowls' },
          { name: 'Avocado Sourdough Toast', description: 'Tostada de pan de masa madre integral, aguacate hass triturado, huevo pochado, germinados de alfalfa y hojuelas de chile.', price: 22000, imageUrl: FOOD.bowl4, subcategory: 'sub_entradas_eco' },
          { name: 'Organic Tofu Salad', description: 'Tofu orgánico horneado crujiente, espinaca baby, camote asado, semillas de cáñamo (hemp) y aderezo de jengibre y sésamo.', price: 26500, imageUrl: FOOD.bowl1, subcategory: 'sub_entradas_eco' },
          { name: 'Vegan Acai Cup', description: 'Açaí orgánico puro licuado con plátano y leche de almendras, cubierto con fresas frescas, granola artesanal y mantequilla de almendras.', price: 24000, imageUrl: FOOD.bowl3, subcategory: 'sub_bowls' },
          { name: 'Matcha Chia Pudding', description: 'Semillas de chía hidratadas en leche de coco con matcha ceremonial orgánico, rodajas de kiwi fresco y coco tostado.', price: 18000, imageUrl: FOOD.bowl3, subcategory: 'sub_postres_eco' },
          { name: 'Green Detox Tonic', description: 'Prensado en frío de espinaca, apio, manzana verde, pepino y un toque refrescante de jengibre y limón.', price: 14500, imageUrl: FOOD.fauget1, subcategory: 'sub_zumos' }
        ]
      }
    ]
  },
  'sunset-bistro': {
    categories: [
      {
        name: 'IL FORNO & BISTRO', order: 0,
        subcategories: [{ id: 'sub_pizza', name: 'Pizzas Artesanales' }, { id: 'sub_pasta', name: 'Pastas del Huerto' }, { id: 'sub_postres_bistro', name: 'Dolci Clasici' }],
        products: [
          { name: 'Prosciutto & Arugula Pizza', description: 'Masa madre madurada 48 horas, salsa de tomates San Marzano, mozzarella fior di latte, prosciutto di Parma y rúcula fresca.', price: 49900, imageUrl: FOOD.pizza, subcategory: 'sub_pizza', recommended: true },
          { name: 'Classic Smash Burger', description: 'Doble carne angus (180g), queso cheddar derretido, cebolla caramelizada, salsa especial de la casa en pan brioche artesanal.', price: 34900, imageUrl: FOOD.burger, subcategory: 'sub_pizza' },
          { name: 'Gnocchi al Pesto Piacentino', description: 'Gnocchi de papa hechos en casa con salsa pesto cremosa a base de albahaca fresca, piñones tostados, ajo y queso pecorino.', price: 39500, imageUrl: FOOD.plate4, subcategory: 'sub_pasta' },
          { name: 'Fettuccine Alfredo con Pollo', description: 'Pasta fettuccine en una rica crema de mantequilla, queso parmesano fresco y pechuga de pollo marinada a la parrilla.', price: 36900, imageUrl: FOOD.plate1, subcategory: 'sub_pasta' },
          { name: 'Focaccia Romana', description: 'Pan plano recién horneado con aceite de oliva virgen extra, sal marina gruesa, romero fresco y tomates cherry confitados.', price: 18500, imageUrl: FOOD.bakery2, subcategory: 'sub_pizza' },
          { name: 'Tiramisú de la Casa', description: 'Bizcocho savoiardi humedecido en café espresso y licor de Amaretto, capas de crema de mascarpone y espolvoreado con cacao.', price: 16000, imageUrl: FOOD.bakery1, subcategory: 'sub_postres_bistro' }
        ]
      }
    ]
  },
  'ocean-breeze': {
    categories: [
      {
        name: 'DEL MAR AL PLATO', order: 0,
        subcategories: [{ id: 'sub_frescos', name: 'Ceviches & Entradas' }, { id: 'sub_calientes', name: 'Platos Fuertes' }, { id: 'sub_bebidas_mar', name: 'Bebidas del Puerto' }],
        products: [
          { name: 'Ceviche Clásico Peruano', description: 'Pesca del día marinada en leche de tigre al ají limo, cebolla roja, maíz choclo, camote dulce y un toque de cilantro.', price: 36000, imageUrl: FOOD.plate5, subcategory: 'sub_frescos', recommended: true },
          { name: 'Tacos de Pescado Ensenada', description: 'Filetes de pescado crujientes rebozados en cerveza, servidos en tortillas de maíz con ensalada de col y mayonesa chipotle.', price: 28000, imageUrl: FOOD.plate6, subcategory: 'sub_frescos' },
          { name: 'Salmon Glaseado al Limón', description: 'Filete de salmón a la plancha con glaseado cítrico de limón y finas hierbas, servido con espárragos y puré rústico.', price: 54000, imageUrl: FOOD.plate2, subcategory: 'sub_calientes' },
          { name: 'Pulpo a la Parrilla', description: 'Tentáculos de pulpo asados a la brasa con adobo de chimichurri, acompañados de papas baby doradas y espárragos.', price: 59000, imageUrl: FOOD.steak, subcategory: 'sub_calientes' },
          { name: 'Risotto del Puerto', description: 'Arroz cremoso con mixtura seleccionada de mariscos (camarones, calamares, mejillones y pulpo) al vino blanco y azafrán.', price: 62000, imageUrl: FOOD.plate1, subcategory: 'sub_calientes' },
          { name: 'Coctel de Camarón Caribeño', description: 'Camarones frescos en salsa cóctel especial (kétchup, lima, cebolla, cilantro y aguacate), servido con galletas saladas.', price: 26000, imageUrl: FOOD.cocktail2, subcategory: 'sub_bebidas_mar' }
        ]
      }
    ]
  },
  'cyber-neon': {
    categories: [
      {
        name: 'STREET & NEON FOOD', order: 0,
        subcategories: [{ id: 'sub_monsters', name: 'Monster Burgers' }, { id: 'sub_loaded', name: 'Papas Cargadas' }, { id: 'sub_bebidas_neon', name: 'Batidos Espaciales' }],
        products: [
          { name: 'Cyber Neon Smash Burger', description: 'Triple carne smash, tocino crujiente de maple, queso cheddar fundido y aderezo especial cyber en pan negro con sésamo.', price: 39000, imageUrl: FOOD.neon1, subcategory: 'sub_monsters', recommended: true },
          { name: 'Cyan Slaw Crispy Chicken', description: 'Pechuga de pollo súper crujiente marinada en buttermilk, lechuga romana y nuestra famosa ensalada de col morada y cian agridulce.', price: 29500, imageUrl: FOOD.neon1, subcategory: 'sub_monsters' },
          { name: 'Vaporwave Pulled Pork', description: 'Bondiola de cerdo desmechada cocida a fuego lento con salsa BBQ ahumada, queso cheddar y aros de cebolla crocantes.', price: 31000, imageUrl: FOOD.neon1, subcategory: 'sub_monsters' },
          { name: 'Vivid Cheddar Fries', description: 'Papas corte rústico crujientes bañadas en nuestra salsa de queso cheddar fundido con trocitos de tocino ahumado y cebollino fresco.', price: 19900, imageUrl: FOOD.neon2, subcategory: 'sub_loaded' },
          { name: 'Hyperdrive Mozzarella Sticks', description: 'Bastones de queso mozzarella premium rebozados y fritos, servidos con salsa marinara picante de tono rojo brillante.', price: 16900, imageUrl: FOOD.neon2, subcategory: 'sub_loaded' },
          { name: 'Cyberpunk Waffle Fries', description: 'Papas en corte rejilla sazonadas con una mezcla especial de especias cajún, servidas con una buena dosis de alioli casero.', price: 18500, imageUrl: FOOD.neon2, subcategory: 'sub_loaded' },
          { name: 'Cyberpunk Shake', description: 'Increíble batido cremoso de fresa y frambuesa azul coronado con crema batida y toppings de colores fluorescentes.', price: 22000, imageUrl: FOOD.neon3, subcategory: 'sub_bebidas_neon' }
        ]
      }
    ]
  },
  'zen-minimalist': {
    categories: [
      {
        name: 'AUTÉNTICO SUSHIBAR', order: 0,
        subcategories: [{ id: 'sub_sushi_nigiri', name: 'Nigiri & Sashimi' }, { id: 'sub_rolls', name: 'Maki Rolls Especiales' }, { id: 'sub_zen_entradas', name: 'Bocados Zen' }],
        products: [
          { name: 'Sake Nigiri Box', description: 'Cortes premium de salmón fresco sobre arroz de sushi aderezado al estilo tradicional de Tokio (5 piezas).', price: 28000, imageUrl: FOOD.sushi1, subcategory: 'sub_sushi_nigiri', recommended: true },
          { name: 'Dragon Roll Imperial', description: 'Langostinos crocantes en tempura y pepino por dentro, cubierto con láminas de aguacate maduro, anguila tostada y salsa teriyaki.', price: 42500, imageUrl: FOOD.sushi2, subcategory: 'sub_rolls' },
          { name: 'Spicy Tuna Tartare Roll', description: 'Atún fresco de aleta azul picado con salsa spicy mayo, cebollino y sésamo tostado, cubierto con alga nori premium.', price: 39000, imageUrl: FOOD.sushi2, subcategory: 'sub_rolls' },
          { name: 'Ebi Tempura', description: 'Langostinos seleccionados fritos en un rebozado tempura ultra ligero y crujiente, acompañados de salsa tentsuyu (5 piezas).', price: 29000, imageUrl: FOOD.sushi1, subcategory: 'sub_zen_entradas' },
          { name: 'Gyoza de Cerdo al Vapor', description: 'Empanadillas japonesas artesanales rellenas de cerdo y vegetales, cocinadas al vapor con base crujiente, salsa ponzu.', price: 19500, imageUrl: FOOD.sushi1, subcategory: 'sub_zen_entradas' },
          { name: 'Matcha Ice Cream', description: 'Helado cremoso elaborado con polvo de té verde matcha importado de Uji, Kioto. Sabor intenso, floral y equilibrado.', price: 14000, imageUrl: FOOD.bakery1, subcategory: 'sub_zen_entradas' }
        ]
      }
    ]
  },
  'pink-patisserie': {
    categories: [
      {
        name: 'PASTELERÍA & DULCES', order: 0,
        subcategories: [{ id: 'sub_macarons', name: 'Macarons de París' }, { id: 'sub_pasteles', name: 'Pastelería de Autor' }, { id: 'sub_bebidas', name: 'Tés & Bebidas' }],
        products: [
          { name: 'Macarons de Rose & Frambuesa', description: 'Caja de 6 macarons franceses artesanales rellenos de ganache de chocolate blanco, rosas frescas y jalea de frambuesas.', price: 32000, imageUrl: FOOD.bakery1, subcategory: 'sub_macarons', recommended: true },
          { name: 'Eclair de Pistacho y Vainilla', description: 'Masa choux alargada rellena de crema pastelera de vainilla de Madagascar y glaseado crujiente de pistachos tostados.', price: 18000, imageUrl: FOOD.bakery1, subcategory: 'sub_pasteles' },
          { name: 'Tarta de Fresas & Crema', description: 'Tarta individual con masa quebrada sablée, crema muselina ligera y fresas orgánicas frescas.', price: 22000, imageUrl: FOOD.bakery2, subcategory: 'sub_pasteles' },
          { name: 'Pink Rose Latte', description: 'Café latte aterciopelado con infusión de pétalos de rosa orgánicos, leche de almendras y polvo de remolacha natural.', price: 14500, imageUrl: FOOD.coffee2, subcategory: 'sub_bebidas' }
        ]
      }
    ]
  },
  'minimalist-boutique': {
    categories: [
      {
        name: 'COLECCIÓN OTOÑO / INVIERNO', order: 0,
        subcategories: [{ id: 'sub_abrigos', name: 'Chaquetas y Abrigos' }, { id: 'sub_camisetas', name: 'Camisetas y Tops' }, { id: 'sub_pantalones', name: 'Pantalones' }],
        products: [
          { name: 'Abrigo de Lana Classic Camel', description: 'Abrigo sastre estructurado confeccionado con mezcla de lana premium. Fit relajado con solapa clásica y cinturón extraíble.', price: 289000, imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80', subcategory: 'sub_abrigos', recommended: true },
          { name: 'Camiseta de Algodón Orgánico', description: 'Camiseta clásica de cuello redondo elaborada con algodón 100% orgánico certificado. Suave al tacto y de silueta recta.', price: 79000, imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80', subcategory: 'sub_camisetas' },
          { name: 'Chaqueta Denim Oversized', description: 'Chaqueta de denim rígido de corte relajado, lavado medio stonewash. Botones metálicos frontales y bolsillos de parche.', price: 189000, imageUrl: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&q=80', subcategory: 'sub_abrigos' },
          { name: 'Jeans Rectos Tiro Alto', description: 'Jeans de silueta clásica y tiro alto, bota recta en mezclilla rígida. Ajuste perfecto en cintura y cadera.', price: 149000, imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80', subcategory: 'sub_pantalones' }
        ]
      }
    ]
  },
  'luxury-jewels': {
    categories: [
      {
        name: 'JOYERÍA & ACCESORIOS DE AUTOR', order: 0,
        subcategories: [{ id: 'sub_collares', name: 'Collares y Gargantillas' }, { id: 'sub_anillos', name: 'Anillos y Pulseras' }, { id: 'sub_bolsos', name: 'Bolsos de Cuero' }],
        products: [
          { name: 'Collar Eslabones Oro 18k', description: 'Collar de cadena con eslabones martillados hechos a mano en plata esterlina con baño de oro amarillo de 18k.', price: 345000, imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80', subcategory: 'sub_collares', recommended: true },
          { name: 'Anillo Eternity con Diamantes', description: 'Anillo Eternity con engaste de circonias cúbicas facetadas montadas en plata de ley 925. Un brillo eterno.', price: 165000, imageUrl: 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cf4?w=600&q=80', subcategory: 'sub_anillos' },
          { name: 'Bolso Satchel de Cuero Saffiano', description: 'Elegante bolso de mano de cuero genuino texturizado. Compartimentos organizadores interiores y correa de hombro ajustable.', price: 420000, imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80', subcategory: 'sub_bolsos', recommended: true },
          { name: 'Pulsera Minimalista de Plata', description: 'Pulsera de cadena rígida ultra delgada de plata esterlina con cierre de broche seguro.', price: 95000, imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80', subcategory: 'sub_anillos' }
        ]
      }
    ]
  },
  'streetwear-sneakers': {
    categories: [
      {
        name: 'CATÁLOGO DE CALZADO', order: 0,
        subcategories: [{ id: 'sub_sneakers', name: 'Sneakers & Tenis' }, { id: 'sub_botas', name: 'Botas' }, { id: 'sub_sandalias', name: 'Casual' }],
        products: [
          { name: 'Sneakers Retro White & Orange', description: 'Tenis de corte bajo de inspiración ochentera. Capellada de cuero natural con detalles en contraste y suela tipo cupsole.', price: 389000, imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80', subcategory: 'sub_sneakers', recommended: true },
          { name: 'Botas de Cuero Combat', description: 'Botas militares de cuero negro premium resistentes al agua. Suela dentada track de alta tracción y cordones encerados.', price: 450000, imageUrl: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600&q=80', subcategory: 'sub_botas' },
          { name: 'Sneakers Urban Joggers', description: 'Tenis ultra livianos con tejido transpirable, inserciones de ante sintético y suela amortiguada para máxima comodidad.', price: 299000, imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80', subcategory: 'sub_sneakers' }
        ]
      }
    ]
  }
};

/**
 * Seeds demo categories and products for a given theme.
 */
export async function seedDemoData(restaurantId, themeId) {
  let data = DEMO_DATA[themeId];
  if (!data) {
    const mapping = {
      'noir-luxe': 'luxury-jewels',
      'urban-street': 'streetwear-sneakers',
      'bloom-boutique': 'minimalist-boutique',
      'classic-store': 'minimalist-boutique',
      'luxury-noir-gold': 'luxury-noir',
      'minimalist-japanese': 'zen-minimalist',
      'rustic-italian-trattoria': 'sunset-bistro',
      'eco-healthy-bistro': 'emerald-garden',
      'pink-paris-patisserie': 'pink-patisserie',
      'cyberpunk-street-food': 'cyber-neon',
      'highend-steakhouse': 'luxury-noir',
      'cozy-bakery-cafe': 'sunset-bistro',
      'art-deco-cocktail-bar': 'luxury-noir',
      'beach-club-lounge': 'ocean-breeze',
      'modern-pizzeria': 'sunset-bistro',
      'nordic-coffee-roasters': 'zen-minimalist',
      'sweet-pastel-gelateria': 'pink-patisserie',
      'vintage-mexican-cantina': 'sunset-bistro',
      'royal-tea-room': 'luxury-noir',
      'futuristic-gastropub': 'cyber-neon',
      'fauget-classic': 'ocean-breeze',
      'fauget-zigzag': 'sunset-bistro',
      'minimalist-boutique': 'minimalist-boutique',
      'luxury-jewels': 'luxury-jewels',
      'streetwear-sneakers': 'streetwear-sneakers'
    };
    const mappedId = mapping[themeId];
    data = DEMO_DATA[mappedId] || Object.values(DEMO_DATA)[0];
  }

  // Get allowed branches based on subscription plan
  let allowedBranches = 1;
  try {
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    const restSnap = await getDoc(restaurantRef);
    if (restSnap.exists()) {
      const restData = restSnap.data();
      const subscription = restData.subscription || { status: 'inactive', planLevel: 2 };
      const isStatusActive = subscription.status === 'authorized' || subscription.status === 'active';
      const rawSubscribedBranches = parseInt(subscription.branches) || 1;
      
      allowedBranches = isStatusActive ? Math.max(1, rawSubscribedBranches) : 1;
    }
  } catch (err) {
    console.error("Error determining allowed branches during seeding:", err);
  }

  // 1. Check and create branches if they don't exist
  let branches = await getBranches(restaurantId);
  if (branches.length === 0) {
    const branch1Id = await addBranch(restaurantId, { name: 'Sede Principal', address: 'Calle 1 #2-3', phone: '1234567' });
    branches = [{ id: branch1Id }];
    
    if (allowedBranches > 1) {
      const branch2Id = await addBranch(restaurantId, { name: 'Sede Norte', address: 'Avenida 4 #5-6', phone: '7654321' });
      branches.push({ id: branch2Id });
    }
  }
  const branchIds = branches.map(b => b.id);
  const allowedBranchIds = branchIds.slice(0, allowedBranches);

  for (const cat of data.categories) {
    const categoryData = {
      name: cat.name,
      order: cat.order,
      subcategories: cat.subcategories || [],
      showPhotos: true,
      branchIds: allowedBranchIds,
    };

    const categoryId = await addCategory(restaurantId, categoryData);

    if (cat.products) {
      for (const prod of cat.products) {
        await addProduct(restaurantId, {
          name: prod.name,
          description: prod.description || '',
          price: prod.price,
          discountPrice: prod.discountPrice || null,
          imageUrl: prod.imageUrl || '',
          categoryId: categoryId,
          subcategory: prod.subcategory || '',
          branchIds: allowedBranchIds,
          available: true,
          recommended: prod.recommended || false,
          gridSpan: prod.gridSpan || 1,
          cardLayout: prod.cardLayout || 'global',
          promotionType: 'none',
          variants: prod.variants || [],
        });
      }
    }
  }
}
