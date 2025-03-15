// Define types for our translations
export type POSTranslationKey =
  | "shoppingCart"
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
  | "productAdded"
  | "productRemoved"
  | "productUpdated"
  | "quantityUpdated"
  | "stockLimitReached"
  | "noProductsFound"
  | "saleCompleted"
  | "paymentMethodRequired"
  | "emptyCartError"
  | "each"
  | "addToCart"
  | "stockLevelsUpdated"
  | "stockLevelsUpdatedSuccessfully"
  | "errorUpdatingStockLevels"
  | "unknownError"
  | "errorFetchingProducts"
  | "loading"
  | "pointOfSale"
  | "price"
  | "id"
  | "adjustStockLevelsDescription"
  | "expiry_date"
  | "notify_before_days"
  | "select_date"
  | "expiring_products_alert"
  | "expiring_products"
  | "expiring_products_description"
  | "edit"

// Define translations for each supported language
export const posTranslations: Record<string, Record<POSTranslationKey, string>> = {
  en: {
    shoppingCart: "Shopping Cart",
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
    productAdded: "Product added",
    productRemoved: "Product removed",
    productUpdated: "Product updated",
    quantityUpdated: "Quantity updated",
    stockLimitReached: "Stock limit reached",
    noProductsFound: "No products found matching",
    saleCompleted: "Sale completed",
    paymentMethodRequired: "Payment method required",
    emptyCartError: "Please add items to the cart before checkout.",
    each: "each",
    addToCart: "Add to Cart",
    stockLevelsUpdated: "Stock levels updated",
    stockLevelsUpdatedSuccessfully: "Stock levels have been updated successfully.",
    errorUpdatingStockLevels: "Error updating stock levels",
    unknownError: "Unknown error occurred",
    errorFetchingProducts: "Error fetching products",
    loading: "Loading",
    pointOfSale: "Point of Sale",
    price: "Price",
    id: "ID",
    adjustStockLevelsDescription: "Adjust stock levels directly or add products to cart.",
    // New translations for expiry date feature
    expiry_date: "Expiry Date",
    notify_before_days: "Notify Days Before",
    select_date: "Select date",
    expiring_products_alert: "Products Expiring Soon",
    expiring_products: "Expiring Products",
    expiring_products_description: "The following products are nearing their expiration date.",
    edit: "Edit",
  },
  es: {
    shoppingCart: "Carrito de Compras",
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
    productAdded: "Producto añadido",
    productRemoved: "Producto eliminado",
    productUpdated: "Producto actualizado",
    quantityUpdated: "Cantidad actualizada",
    stockLimitReached: "Límite de stock alcanzado",
    noProductsFound: "No se encontraron productos que coincidan con",
    saleCompleted: "Venta completada",
    paymentMethodRequired: "Se requiere método de pago",
    emptyCartError: "Por favor, añade artículos al carrito antes de finalizar.",
    each: "cada uno",
    addToCart: "Añadir al Carrito",
    stockLevelsUpdated: "Niveles de stock actualizados",
    stockLevelsUpdatedSuccessfully: "Los niveles de stock se han actualizado correctamente.",
    errorUpdatingStockLevels: "Error al actualizar los niveles de stock",
    unknownError: "Se produjo un error desconocido",
    errorFetchingProducts: "Error al obtener productos",
    loading: "Cargando",
    pointOfSale: "Punto de Venta",
    price: "Precio",
    id: "ID",
    adjustStockLevelsDescription: "Ajuste los niveles de stock directamente o añada productos al carrito.",
    // New translations for expiry date feature
    expiry_date: "Fecha de Caducidad",
    notify_before_days: "Notificar Días Antes",
    select_date: "Seleccionar fecha",
    expiring_products_alert: "Productos a Punto de Caducar",
    expiring_products: "Productos Caducando",
    expiring_products_description: "Los siguientes productos están cerca de su fecha de caducidad.",
    edit: "Editar",
  },
  fr: {
    shoppingCart: "Panier d'Achat",
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
    productAdded: "Produit ajouté",
    productRemoved: "Produit retiré",
    productUpdated: "Produit mis à jour",
    quantityUpdated: "Quantité mise à jour",
    stockLimitReached: "Limite de stock atteinte",
    noProductsFound: "Aucun produit trouvé correspondant à",
    saleCompleted: "Vente terminée",
    paymentMethodRequired: "Méthode de paiement requise",
    emptyCartError: "Veuillez ajouter des articles au panier avant de finaliser.",
    each: "chacun",
    addToCart: "Ajouter au Panier",
    stockLevelsUpdated: "Niveaux de stock mis à jour",
    stockLevelsUpdatedSuccessfully: "Les niveaux de stock ont été mis à jour avec succès.",
    errorUpdatingStockLevels: "Erreur lors de la mise à jour des niveaux de stock",
    unknownError: "Une erreur inconnue s'est produite",
    errorFetchingProducts: "Erreur lors de la récupération des produits",
    loading: "Chargement",
    pointOfSale: "Point de Vente",
    price: "Prix",
    id: "ID",
    adjustStockLevelsDescription: "Ajustez les niveaux de stock directement ou ajoutez des produits au panier.",
    // New translations for expiry date feature
    expiry_date: "Date d'Expiration",
    notify_before_days: "Notifier Jours Avant",
    select_date: "Sélectionner une date",
    expiring_products_alert: "Produits Bientôt Expirés",
    expiring_products: "Produits en Expiration",
    expiring_products_description: "Les produits suivants approchent de leur date d'expiration.",
    edit: "Modifier",
  },
  ar: {
    shoppingCart: "عربة التسوق",
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
    productAdded: "تمت إضافة المنتج",
    productRemoved: "تمت إزالة المنتج",
    productUpdated: "تم تحديث المنتج",
    quantityUpdated: "تم تحديث الكمية",
    stockLimitReached: "تم الوصول إلى حد المخزون",
    noProductsFound: "لم يتم العثور على منتجات تطابق",
    saleCompleted: "تم إكمال البيع",
    paymentMethodRequired: "طريقة الدفع مطلوبة",
    emptyCartError: "الرجاء إضافة عناصر إلى سلة التسوق قبل الدفع.",
    each: "لكل وحدة",
    addToCart: "أضف إلى السلة",
    stockLevelsUpdated: "تم تحديث مستويات المخزون",
    stockLevelsUpdatedSuccessfully: "تم تحديث مستويات المخزون بنجاح.",
    errorUpdatingStockLevels: "خطأ في تحديث مستويات المخزون",
    unknownError: "حدث خطأ غير معروف",
    errorFetchingProducts: "خطأ في جلب المنتجات",
    loading: "جاري التحميل",
    pointOfSale: "نقطة البيع",
    price: "السعر",
    id: "المعرف",
    adjustStockLevelsDescription: "ضبط مستويات المخزون مباشرة أو إضافة المنتجات إلى السلة.",
    // New translations for expiry date feature
    expiry_date: "تاريخ انتهاء الصلاحية",
    notify_before_days: "التنبيه قبل أيام",
    select_date: "اختر تاريخ",
    expiring_products_alert: "منتجات على وشك انتهاء الصلاحية",
    expiring_products: "المنتجات منتهية الصلاحية",
    expiring_products_description: "المنتجات التالية تقترب من تاريخ انتهاء صلاحيتها.",
    edit: "تعديل",
  },
}

// Function to get a translation
export function getPOSTranslation(key: POSTranslationKey, language = "en"): string {
  // If the language is not supported, fall back to English
  if (!posTranslations[language]) {
    return posTranslations.en[key]
  }

  // If the key doesn't exist in the language, fall back to English
  return posTranslations[language][key] || posTranslations.en[key]
}

