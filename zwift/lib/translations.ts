// Define types for our translations
export type TranslationKey =
  | "cart"
  | "items"
  | "emptyCart"
  | "subtotal"
  | "tax"
  | "total"
  | "cash"
  | "card"
  | "completeSale"
  | "processing"
  | "searchProducts"
  | "barcodeModeLabel"
  | "outOfStock"
  | "recentlySold"
  | "searchResults"
  | "stock"
  | "barcode"
  | "lowStockAlert"
  | "adjustStockLevels"
  | "saving"
  | "currentStock"
  | "minStock"
  | "warning"

// Define translations for each supported language
export const translations: Record<string, Record<TranslationKey, string>> = {
  en: {
    cart: "Shopping Cart",
    items: "items",
    emptyCart: "Your cart is empty",
    subtotal: "Subtotal",
    tax: "Tax",
    total: "Total",
    cash: "Cash",
    card: "Card",
    completeSale: "Complete Sale",
    processing: "Processing...",
    searchProducts: "Search products by name or barcode...",
    barcodeModeLabel: "Auto-add on exact barcode match",
    outOfStock: "Out of Stock",
    recentlySold: "Recently Sold Products",
    searchResults: "Search Results",
    stock: "Stock",
    barcode: "Barcode",
    lowStockAlert: "Low Stock Alert",
    adjustStockLevels: "Save Stock Levels",
    saving: "Saving...",
    currentStock: "Current Stock",
    minStock: "Min Stock",
    warning: "Warning: New stock level is below minimum stock threshold.",
  },
  es: {
    cart: "Carrito de Compras",
    items: "artículos",
    emptyCart: "Tu carrito está vacío",
    subtotal: "Subtotal",
    tax: "Impuesto",
    total: "Total",
    cash: "Efectivo",
    card: "Tarjeta",
    completeSale: "Completar Venta",
    processing: "Procesando...",
    searchProducts: "Buscar productos por nombre o código de barras...",
    barcodeModeLabel: "Añadir automáticamente con código de barras exacto",
    outOfStock: "Agotado",
    recentlySold: "Productos Vendidos Recientemente",
    searchResults: "Resultados de Búsqueda",
    stock: "Existencias",
    barcode: "Código de Barras",
    lowStockAlert: "Alerta de Bajo Stock",
    adjustStockLevels: "Guardar Niveles de Stock",
    saving: "Guardando...",
    currentStock: "Stock Actual",
    minStock: "Stock Mínimo",
    warning: "Advertencia: El nuevo nivel de stock está por debajo del umbral mínimo.",
  },
  fr: {
    cart: "Panier d'Achat",
    items: "articles",
    emptyCart: "Votre panier est vide",
    subtotal: "Sous-total",
    tax: "Taxe",
    total: "Total",
    cash: "Espèces",
    card: "Carte",
    completeSale: "Finaliser la Vente",
    processing: "Traitement en cours...",
    searchProducts: "Rechercher des produits par nom ou code-barres...",
    barcodeModeLabel: "Ajout automatique sur correspondance exacte du code-barres",
    outOfStock: "Rupture de Stock",
    recentlySold: "Produits Récemment Vendus",
    searchResults: "Résultats de Recherche",
    stock: "Stock",
    barcode: "Code-barres",
    lowStockAlert: "Alerte de Stock Faible",
    adjustStockLevels: "Enregistrer les Niveaux de Stock",
    saving: "Enregistrement...",
    currentStock: "Stock Actuel",
    minStock: "Stock Minimum",
    warning: "Attention: Le nouveau niveau de stock est inférieur au seuil minimum.",
  },
  ar: {
    cart: "عربة التسوق",
    items: "عناصر",
    emptyCart: "عربة التسوق فارغة",
    subtotal: "المجموع الفرعي",
    tax: "الضريبة",
    total: "المجموع",
    cash: "نقداً",
    card: "بطاقة",
    completeSale: "إتمام البيع",
    processing: "جاري المعالجة...",
    searchProducts: "البحث عن المنتجات بالاسم أو الباركود...",
    barcodeModeLabel: "إضافة تلقائية عند تطابق الباركود",
    outOfStock: "نفذ من المخزون",
    recentlySold: "المنتجات المباعة مؤخراً",
    searchResults: "نتائج البحث",
    stock: "المخزون",
    barcode: "الباركود",
    lowStockAlert: "تنبيه انخفاض المخزون",
    adjustStockLevels: "حفظ مستويات المخزون",
    saving: "جاري الحفظ...",
    currentStock: "المخزون الحالي",
    minStock: "الحد الأدنى للمخزون",
    warning: "تحذير: مستوى المخزون الجديد أقل من الحد الأدنى.",
  },
}

// Add more languages as needed

// Function to get a translation
export function getTranslation(key: TranslationKey, language = "en"): string {
  // If the language is not supported, fall back to English
  if (!translations[language]) {
    return translations.en[key]
  }

  // If the key doesn't exist in the language, fall back to English
  return translations[language][key] || translations.en[key]
}

