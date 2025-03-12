// Define types for our application-wide translations
export type AppTranslationKey =
  | "alerts" // Add this line
  | "dashboard"
  | "products"
  | "categories"
  | "customers"
  | "sales"
  | "reports"
  | "settings"
  | "logout"
  | "profile"
  | "inventory"
  | "pointOfSale"
  | "addNew"
  | "edit"
  | "delete"
  | "save"
  | "cancel"
  | "search"
  | "filter"
  | "sort"
  | "actions"
  | "confirm"
  | "back"
  | "next"
  | "previous"
  | "loading"
  | "noResults"
  | "error"
  | "success"
  | "warning"
  | "info"
  | "required"
  | "optional"
  | "name"
  | "description"
  | "price"
  | "stock"
  | "category"
  | "image"
  | "barcode"
  | "date"
  | "time"
  | "status"
  | "active"
  | "inactive"
  | "enabled"
  | "disabled"
  | "yes"
  | "no"
  | "all"
  | "none"
  | "select"
  | "clear"
  | "apply"
  | "reset"
  | "total"
  | "subtotal"
  | "tax"
  | "discount"
  | "quantity"
  | "welcome"
  | "signIn"
  | "signOut"
  | "register"
  | "email"
  | "password"
  | "confirmPassword"
  | "forgotPassword"
  | "resetPassword"
  | "rememberMe"
  | "or"
  | "and"
  | "with"
  | "by"
  | "for"
  | "to"
  | "from"
  | "at"
  | "on"
  | "in"
  | "of"
  // Settings page keys
  | "settings_saved_successfully"
  | "error_saving_settings"
  | "manage_store_settings"
  | "tax_rate"
  | "currency"
  | "change_currency"
  | "select_currency"
  | "language"
  | "select_language"
  | "preview"
  | "my_store"
  | "amount"
  | "saving"
  | "save_settings"
  | "settings_saved"
  | "changes_take_effect"
  | "error_saving_settings_try_again"
  | "close"
  // Inventory page keys
  | "add_product"
  | "add_new_product"
  | "add_product_description"
  | "edit_product"
  | "edit_product_description"
  | "delete_product"
  | "product_added"
  | "product_added_successfully"
  | "product_updated"
  | "product_updated_successfully"
  | "product_deleted"
  | "product_deleted_successfully"
  | "failed_to_add_product"
  | "failed_to_update_product"
  | "failed_to_delete_product"
  | "failed_to_load_products"
  | "failed_to_load_categories"
  | "barcode_generated"
  | "new_barcode"
  | "purchase_price"
  | "min_stock"
  | "image_url"
  | "add_category"
  | "add_new_category"
  | "add_category_description"
  | "category_added"
  | "category_added_successfully"
  | "failed_to_add_category"
  | "validation_error"
  | "please_enter_category_name"
  | "select_category_optional"
  | "enter_category_name"
  | "save_changes"
  | "are_you_sure"
  | "delete_product_confirmation"
  | "action_cannot_be_undone"
  | "barcode_preview"
  | "barcode_preview_description"
  | "print_barcode"
  | "printing_barcode"
  | "barcode_for"
  | "sent_to_printer"
  | "generate"
  | "search_by_name_or_barcode"
  | "no_products_found"
  | "showing"
  | "entries"
  | "page"
  | "created_at"
  | "filters_applied"
  | "clear_filters"
  | "expense_records"
  | "showing_filtered_expenses"
  | "showing_all_expenses"
  | "show"
  | "all_categories"
  | "page_total"
  | "grand_total"
  | "filtered"
  | "all"
  // Expense page keys
  | "expenses"
  | "add_expense"
  | "add_new_expense"
  | "add_expense_description"
  | "edit_expense"
  | "edit_expense_description"
  | "delete_expense_warning"
  | "select_category"
  | "no_categories"
  | "save_expense"
  | "update_expense"
  | "filter_expenses"
  | "filter_expenses_description"
  | "from_date"
  | "to_date"
  | "select_date"
  | "no_expenses_found"
  | "save_category"
  // Dashboard page keys
  | "out_of_stock"
  | "low_stock"
  | "pick_date_range"
  | "loading_dashboard_data"
  | "overview"
  | "total_sales"
  | "transactions"
  | "total_expenses"
  | "profit"
  | "loss"
  | "for_selected_period"
  | "inventory_status"
  | "recent_sales"
  | "last_n_sales"
  | "no_recent_sales_found"
  | "sale"
  | "recent_expenses"
  | "last_n_expenses"
  | "no_recent_expenses_found"
  | "unknown_date"
  | "inventory_details_displayed_here"
  // Reports page keys
  | "failed_fetch_sales"
  | "failed_fetch_expenses"
  | "failed_fetch_inventory"
  | "export_successful"
  | "report_exported"
  | "uncategorized"
  | "select_period"
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "custom_range"
  | "export"
  | "refresh"
  | "filters"
  | "payment_method"
  | "all_methods"
  | "cash"
  | "card"
  | "transfer"
  | "for_period"
  | "total_profit"
  | "margin"
  | "average"
  | "per_transaction"
  | "payment_methods"
  | "sales_trend"
  | "daily_sales_profit"
  | "no_sales_data"
  | "sales_transactions"
  | "transactions_for_period"
  | "revenue"
  | "cost"
  | "sales_by_payment_method"

// Define translations for each supported language
export const appTranslations: Record<string, Record<AppTranslationKey, string>> = {
  en: {
    alerts: "Alerts",
    dashboard: "Dashboard",
    products: "Products",
    categories: "Categories",
    customers: "Customers",
    sales: "Sales",
    reports: "Reports",
    settings: "Settings",
    logout: "Logout",
    profile: "Profile",
    inventory: "Inventory",
    pointOfSale: "Point of Sale",
    addNew: "Add New",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    search: "Search",
    filter: "Filter",
    sort: "Sort",
    actions: "Actions",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    previous: "Previous",
    loading: "Loading",
    noResults: "No Results",
    error: "Error",
    success: "Success",
    warning: "Warning",
    info: "Information",
    required: "Required",
    optional: "Optional",
    name: "Name",
    description: "Description",
    price: "Price",
    stock: "Stock",
    category: "Category",
    image: "Image",
    barcode: "Barcode",
    date: "Date",
    time: "Time",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    enabled: "Enabled",
    disabled: "Disabled",
    yes: "Yes",
    no: "No",
    all: "All",
    none: "None",
    select: "Select",
    clear: "Clear",
    apply: "Apply",
    reset: "Reset",
    total: "Total",
    subtotal: "Subtotal",
    tax: "Tax",
    discount: "Discount",
    quantity: "Quantity",
    welcome: "Welcome",
    signIn: "Sign In",
    signOut: "Sign Out",
    register: "Register",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    forgotPassword: "Forgot Password",
    resetPassword: "Reset Password",
    rememberMe: "Remember Me",
    or: "Or",
    and: "And",
    with: "With",
    by: "By",
    for: "For",
    to: "To",
    from: "From",
    at: "At",
    on: "On",
    in: "In",
    of: "Of",
    // Settings page translations
    settings_saved_successfully: "Your settings have been saved successfully.",
    error_saving_settings: "Error saving settings",
    manage_store_settings: "Manage your store settings",
    tax_rate: "Tax Rate",
    currency: "Currency",
    change_currency: "Change Currency ($, £, €, DH)",
    select_currency: "Select currency",
    language: "Language",
    select_language: "Select language",
    preview: "Preview",
    my_store: "My Store",
    amount: "Amount",
    saving: "Saving",
    save_settings: "Save Settings",
    settings_saved: "Settings Saved",
    changes_take_effect: "The changes will take effect immediately.",
    error_saving_settings_try_again: "There was an error saving your settings. Please try again.",
    close: "Close",
    // Inventory page translations
    add_product: "Add Product",
    add_new_product: "Add New Product",
    add_product_description: "Enter the details of the new product to add to your inventory.",
    edit_product: "Edit Product",
    edit_product_description: "Update the details of this product.",
    delete_product: "Delete Product",
    product_added: "Product Added",
    product_added_successfully: "The product has been added successfully.",
    product_updated: "Product Updated",
    product_updated_successfully: "The product has been updated successfully.",
    product_deleted: "Product Deleted",
    product_deleted_successfully: "The product has been deleted successfully.",
    failed_to_add_product: "Failed to add product. Please try again.",
    failed_to_update_product: "Failed to update product. Please try again.",
    failed_to_delete_product: "Failed to delete product. Please try again.",
    failed_to_load_products: "Failed to load products",
    failed_to_load_categories: "Failed to load categories",
    barcode_generated: "Barcode Generated",
    new_barcode: "New barcode",
    purchase_price: "Purchase Price",
    min_stock: "Min Stock",
    image_url: "Image URL",
    add_category: "Add Category",
    add_new_category: "Add New Category",
    add_category_description: "Create a new category for your products.",
    category_added: "Category Added",
    category_added_successfully: "The category has been added successfully.",
    failed_to_add_category: "Failed to add category. Please try again.",
    validation_error: "Validation Error",
    please_enter_category_name: "Please enter a category name",
    select_category_optional: "Select a category (optional)",
    enter_category_name: "Enter category name",
    save_changes: "Save Changes",
    are_you_sure: "Are you sure?",
    delete_product_confirmation: "This will permanently delete the product",
    action_cannot_be_undone: "This action cannot be undone.",
    barcode_preview: "Barcode Preview",
    barcode_preview_description: "Preview the barcode before printing.",
    print_barcode: "Print Barcode",
    printing_barcode: "Printing Barcode",
    barcode_for: "Barcode for",
    sent_to_printer: "sent to printer",
    generate: "Generate",
    search_by_name_or_barcode: "Search by name or barcode...",
    no_products_found: "No products found. Add some products to your inventory.",
    showing: "Showing",
    entries: "entries",
    page: "Page",
    created_at: "Created At",
    filters_applied: "Filters applied",
    clear_filters: "Clear Filters",
    expense_records: "Expense Records",
    showing_filtered_expenses: "Showing filtered expense records",
    showing_all_expenses: "Showing all expense records",
    show: "Show",
    all_categories: "All Categories",
    page_total: "Page Total",
    grand_total: "Grand Total",
    filtered: "Filtered",
   
    // Expense page translations
    expenses: "Expenses",
    add_expense: "Add Expense",
    add_new_expense: "Add New Expense",
    add_expense_description: "Enter the details of the new expense.",
    edit_expense: "Edit Expense",
    edit_expense_description: "Update the details of this expense.",
    delete_expense_warning: "This will permanently delete the expense.",
    select_category: "Select Category",
    no_categories: "No categories found.",
    save_expense: "Save Expense",
    update_expense: "Update Expense",
    filter_expenses: "Filter Expenses",
    filter_expenses_description: "Filter expenses by date and category.",
    from_date: "From Date",
    to_date: "To Date",
    select_date: "Select Date",
    no_expenses_found: "No expenses found.",
    save_category: "Save Category",
    // Dashboard page translations
    out_of_stock: "Out of Stock",
    low_stock: "Low Stock",
    pick_date_range: "Pick Date Range",
    loading_dashboard_data: "Loading dashboard data...",
    overview: "Overview",
    total_sales: "Total Sales",
    transactions: "Transactions",
    total_expenses: "Total Expenses",
    profit: "Profit",
    loss: "Loss",
    for_selected_period: "For Selected Period",
    inventory_status: "Inventory Status",
    recent_sales: "Recent Sales",
    last_n_sales: "Last {n} Sales",
    no_recent_sales_found: "No recent sales found.",
    sale: "Sale",
    recent_expenses: "Recent Expenses",
    last_n_expenses: "Last {n} Expenses",
    no_recent_expenses_found: "No recent expenses found.",
    unknown_date: "Unknown Date",
    inventory_details_displayed_here: "Inventory details displayed here",
    // Reports page translations
    failed_fetch_sales: "Failed to fetch sales data",
    failed_fetch_expenses: "Failed to fetch expenses data",
    failed_fetch_inventory: "Failed to fetch inventory data",
    export_successful: "Export Successful",
    report_exported: "Report exported:",
    uncategorized: "Uncategorized",
    select_period: "Select Period",
    today: "Today",
    yesterday: "Yesterday",
    last_7_days: "Last 7 Days",
    last_30_days: "Last 30 Days",
    this_month: "This Month",
    last_month: "Last Month",
    custom_range: "Custom Range",
    export: "Export",
    refresh: "Refresh",
    filters: "Filters",
    payment_method: "Payment Method",
    all_methods: "All Methods",
    cash: "Cash",
    card: "Card",
    transfer: "Transfer",
    for_period: "For period",
    total_profit: "Total Profit",
    margin: "Margin",
    average: "Average",
    per_transaction: "per transaction",
    payment_methods: "Payment Methods",
    sales_trend: "Sales Trend",
    daily_sales_profit: "Daily Sales & Profit",
    no_sales_data: "No sales data available",
    sales_transactions: "Sales Transactions",
    transactions_for_period: "transactions for period",
    revenue: "Revenue",
    cost: "Cost",
    sales_by_payment_method: "Sales by Payment Method",
  },
  es: {
    alerts: "Alertas",
    dashboard: "Panel de Control",
    products: "Productos",
    categories: "Categorías",
    customers: "Clientes",
    sales: "Ventas",
    reports: "Informes",
    settings: "Configuración",
    logout: "Cerrar Sesión",
    profile: "Perfil",
    inventory: "Inventario",
    pointOfSale: "Punto de Venta",
    addNew: "Añadir Nuevo",
    edit: "Editar",
    delete: "Eliminar",
    save: "Guardar",
    cancel: "Cancelar",
    search: "Buscar",
    filter: "Filtrar",
    sort: "Ordenar",
    actions: "Acciones",
    confirm: "Confirmar",
    back: "Atrás",
    next: "Siguiente",
    previous: "Anterior",
    loading: "Cargando",
    noResults: "Sin Resultados",
    error: "Error",
    success: "Éxito",
    warning: "Advertencia",
    info: "Información",
    required: "Requerido",
    optional: "Opcional",
    name: "Nombre",
    description: "Descripción",
    price: "Precio",
    stock: "Existencias",
    category: "Categoría",
    image: "Imagen",
    barcode: "Código de Barras",
    date: "Fecha",
    time: "Hora",
    status: "Estado",
    active: "Activo",
    inactive: "Inactivo",
    enabled: "Habilitado",
    disabled: "Deshabilitado",
    yes: "Sí",
    no: "No",
    all: "Todos",
    none: "Ninguno",
    select: "Seleccionar",
    clear: "Limpiar",
    apply: "Aplicar",
    reset: "Restablecer",
    total: "Total",
    subtotal: "Subtotal",
    tax: "Impuesto",
    discount: "Descuento",
    quantity: "Cantidad",
    welcome: "Bienvenido",
    signIn: "Iniciar Sesión",
    signOut: "Cerrar Sesión",
    register: "Registrarse",
    email: "Correo Electrónico",
    password: "Contraseña",
    confirmPassword: "Confirmar Contraseña",
    forgotPassword: "Olvidé mi Contraseña",
    resetPassword: "Restablecer Contraseña",
    rememberMe: "Recordarme",
    or: "O",
    and: "Y",
    with: "Con",
    by: "Por",
    for: "Para",
    to: "A",
    from: "De",
    at: "En",
    on: "En",
    in: "En",
    of: "De",
    // Settings page translations
    settings_saved_successfully: "Tu configuración se ha guardado correctamente.",
    error_saving_settings: "Error al guardar la configuración",
    manage_store_settings: "Administra la configuración de tu tienda",
    tax_rate: "Tasa de Impuesto",
    currency: "Moneda",
    change_currency: "Cambiar Moneda ($, £, €, DH)",
    select_currency: "Seleccionar moneda",
    language: "Idioma",
    select_language: "Seleccionar idioma",
    preview: "Vista previa",
    my_store: "Mi Tienda",
    amount: "Cantidad",
    saving: "Guardando",
    save_settings: "Guardar Configuración",
    settings_saved: "Configuración Guardada",
    changes_take_effect: "Los cambios tendrán efecto inmediatamente.",
    error_saving_settings_try_again: "Hubo un error al guardar tu configuración. Por favor, inténtalo de nuevo.",
    close: "Cerrar",
    // Inventory page translations
    add_product: "Añadir Producto",
    add_new_product: "Añadir Nuevo Producto",
    add_product_description: "Ingresa los detalles del nuevo producto para añadirlo a tu inventario.",
    edit_product: "Editar Producto",
    edit_product_description: "Actualiza los detalles de este producto.",
    delete_product: "Eliminar Producto",
    product_added: "Producto Añadido",
    product_added_successfully: "El producto ha sido añadido exitosamente.",
    product_updated: "Producto Actualizado",
    product_updated_successfully: "El producto ha sido actualizado exitosamente.",
    product_deleted: "Producto Eliminado",
    product_deleted_successfully: "El producto ha sido eliminado exitosamente.",
    failed_to_add_product: "Error al añadir el producto. Por favor, inténtalo de nuevo.",
    failed_to_update_product: "Error al actualizar el producto. Por favor, inténtalo de nuevo.",
    failed_to_delete_product: "Error al eliminar el producto. Por favor, inténtalo de nuevo.",
    failed_to_load_products: "Error al cargar los productos",
    failed_to_load_categories: "Error al cargar las categorías",
    barcode_generated: "Código de Barras Generado",
    new_barcode: "Nuevo código de barras",
    purchase_price: "Precio de Compra",
    min_stock: "Stock Mínimo",
    image_url: "URL de Imagen",
    add_category: "Añadir Categoría",
    add_new_category: "Añadir Nueva Categoría",
    add_category_description: "Crea una nueva categoría para tus productos.",
    category_added: "Categoría Añadida",
    category_added_successfully: "La categoría ha sido añadida exitosamente.",
    failed_to_add_category: "Error al añadir la categoría. Por favor, inténtalo de nuevo.",
    validation_error: "Error de Validación",
    please_enter_category_name: "Por favor, ingresa un nombre de categoría",
    select_category_optional: "Selecciona una categoría (opcional)",
    enter_category_name: "Ingresa el nombre de la categoría",
    save_changes: "Guardar Cambios",
    are_you_sure: "¿Estás seguro?",
    delete_product_confirmation: "Esto eliminará permanentemente el producto",
    action_cannot_be_undone: "Esta acción no se puede deshacer.",
    barcode_preview: "Vista Previa del Código de Barras",
    barcode_preview_description: "Vista previa del código de barras antes de imprimir.",
    print_barcode: "Imprimir Código de Barras",
    printing_barcode: "Imprimiendo Código de Barras",
    barcode_for: "Código de barras para",
    sent_to_printer: "enviado a la impresora",
    generate: "Generar",
    search_by_name_or_barcode: "Buscar por nombre o código de barras...",
    no_products_found: "No se encontraron productos. Añade algunos productos a tu inventario.",
    showing: "Mostrando",
    entries: "entradas",
    page: "Página",
    created_at: "Creado El",
    filters_applied: "Filtros aplicados",
    clear_filters: "Limpiar Filtros",
    expense_records: "Registros de Gastos",
    showing_filtered_expenses: "Mostrando registros de gastos filtrados",
    showing_all_expenses: "Mostrando todos los registros de gastos",
    show: "Mostrar",
    all_categories: "Todas las Categorías",
    page_total: "Total de Página",
    grand_total: "Total General",
    filtered: "Filtrado",
   
    // Expense page translations
    expenses: "Gastos",
    add_expense: "Añadir Gasto",
    add_new_expense: "Añadir Nuevo Gasto",
    add_expense_description: "Ingresa los detalles del nuevo gasto.",
    edit_expense: "Editar Gasto",
    edit_expense_description: "Actualiza los detalles de este gasto.",
    delete_expense_warning: "Esto eliminará permanentemente el gasto.",
    select_category: "Seleccionar Categoría",
    no_categories: "No se encontraron categorías.",
    save_expense: "Guardar Gasto",
    update_expense: "Actualizar Gasto",
    filter_expenses: "Filtrar Gastos",
    filter_expenses_description: "Filtrar gastos por fecha y categoría.",
    from_date: "Desde la Fecha",
    to_date: "Hasta la Fecha",
    select_date: "Seleccionar Fecha",
    no_expenses_found: "No se encontraron gastos.",
    save_category: "Guardar Categoría",
    // Dashboard page translations
    out_of_stock: "Sin stock",
    low_stock: "Stock bajo",
    pick_date_range: "Seleccione el rango de fechas",
    loading_dashboard_data: "Cargando datos del panel...",
    overview: "Visión general",
    total_sales: "Ventas totales",
    transactions: "Transacciones",
    total_expenses: "Gastos totales",
    profit: "Beneficio",
    loss: "Pérdida",
    for_selected_period: "Para el período seleccionado",
    inventory_status: "Estado del inventario",
    recent_sales: "Ventas recientes",
    last_n_sales: "Últimas {n} ventas",
    no_recent_sales_found: "No se encontraron ventas recientes.",
    sale: "Venta",
    recent_expenses: "Gastos recientes",
    last_n_expenses: "Últimos {n} gastos",
    no_recent_expenses_found: "No se encontraron gastos recientes.",
    unknown_date: "Fecha desconocida",
    inventory_details_displayed_here: "Detalles del inventario mostrados aquí",
    // Reports page translations
    failed_fetch_sales: "Error al obtener datos de ventas",
    failed_fetch_expenses: "Error al obtener datos de gastos",
    failed_fetch_inventory: "Error al obtener datos de inventario",
    export_successful: "Exportación Exitosa",
    report_exported: "Informe exportado:",
    uncategorized: "Sin categoría",
    select_period: "Seleccionar Período",
    today: "Hoy",
    yesterday: "Ayer",
    last_7_days: "Últimos 7 Días",
    last_30_days: "Últimos 30 Días",
    this_month: "Este Mes",
    last_month: "Mes Pasado",
    custom_range: "Rango Personalizado",
    export: "Exportar",
    refresh: "Actualizar",
    filters: "Filtros",
    payment_method: "Método de Pago",
    all_methods: "Todos los Métodos",
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    for_period: "Para el período",
    total_profit: "Beneficio Total",
    margin: "Margen",
    average: "Promedio",
    per_transaction: "por transacción",
    payment_methods: "Métodos de Pago",
    sales_trend: "Tendencia de Ventas",
    daily_sales_profit: "Ventas y Beneficios Diarios",
    no_sales_data: "No hay datos de ventas disponibles",
    sales_transactions: "Transacciones de Ventas",
    transactions_for_period: "transacciones para el período",
    revenue: "Ingresos",
    cost: "Costo",
    sales_by_payment_method: "Ventas por Método de Pago",
  },
  fr: {
    alerts: "Alertes",
    dashboard: "Tableau de Bord",
    products: "Produits",
    categories: "Catégories",
    customers: "Clients",
    sales: "Ventes",
    reports: "Rapports",
    settings: "Paramètres",
    logout: "Déconnexion",
    profile: "Profil",
    inventory: "Inventaire",
    pointOfSale: "Point de Vente",
    addNew: "Ajouter Nouveau",
    edit: "Modifier",
    delete: "Supprimer",
    save: "Enregistrer",
    cancel: "Annuler",
    search: "Rechercher",
    filter: "Filtrer",
    sort: "Trier",
    actions: "Actions",
    confirm: "Confirmer",
    back: "Retour",
    next: "Suivant",
    previous: "Précédent",
    loading: "Chargement",
    noResults: "Aucun Résultat",
    error: "Erreur",
    success: "Succès",
    warning: "Avertissement",
    info: "Information",
    required: "Requis",
    optional: "Optionnel",
    name: "Nom",
    description: "Description",
    price: "Prix",
    stock: "Stock",
    category: "Catégorie",
    image: "Image",
    barcode: "Code-barres",
    date: "Date",
    time: "Heure",
    status: "Statut",
    active: "Actif",
    inactive: "Inactif",
    enabled: "Activé",
    disabled: "Désactivé",
    yes: "Oui",
    no: "Non",
    all: "Tous",
    none: "Aucun",
    select: "Sélectionner",
    clear: "Effacer",
    apply: "Appliquer",
    reset: "Réinitialiser",
    total: "Total",
    subtotal: "Sous-total",
    tax: "Taxe",
    discount: "Remise",
    quantity: "Quantité",
    welcome: "Bienvenue",
    signIn: "Se Connecter",
    signOut: "Se Déconnecter",
    register: "S'inscrire",
    email: "Email",
    password: "Mot de Passe",
    confirmPassword: "Confirmer le Mot de Passe",
    forgotPassword: "Mot de Passe Oublié",
    resetPassword: "Réinitialiser le Mot de Passe",
    rememberMe: "Se Souvenir de Moi",
    or: "Ou",
    and: "Et",
    with: "Avec",
    by: "Par",
    for: "Pour",
    to: "À",
    from: "De",
    at: "À",
    on: "Sur",
    in: "Dans",
    of: "De",
    // Settings page translations
    settings_saved_successfully: "Vos paramètres ont été enregistrés avec succès.",
    error_saving_settings: "Erreur lors de l'enregistrement des paramètres",
    manage_store_settings: "Gérer les paramètres de votre magasin",
    tax_rate: "Taux de Taxe",
    currency: "Devise",
    change_currency: "Changer de Devise ($, £, €, DH)",
    select_currency: "Sélectionner une devise",
    language: "Langue",
    select_language: "Sélectionner une langue",
    preview: "Aperçu",
    my_store: "Mon Magasin",
    amount: "Montant",
    saving: "Enregistrement",
    save_settings: "Enregistrer les Paramètres",
    settings_saved: "Paramètres Enregistrés",
    changes_take_effect: "Les modifications prendront effet immédiatement.",
    error_saving_settings_try_again:
      "Une erreur s'est produite lors de l'enregistrement de vos paramètres. Veuillez réessayer.",
    close: "Fermer",
    // Inventory page translations
    add_product: "Ajouter Produit",
    add_new_product: "Ajouter Nouveau Produit",
    add_product_description: "Entrez les détails du nouveau produit à ajouter à votre inventaire.",
    edit_product: "Modifier Produit",
    edit_product_description: "Mettre à jour les détails de ce produit.",
    delete_product: "Supprimer Produit",
    product_added: "Produit Ajouté",
    product_added_successfully: "Le produit a été ajouté avec succès.",
    product_updated: "Produit Mis à Jour",
    product_updated_successfully: "Le produit a été mis à jour avec succès.",
    product_deleted: "Produit Supprimé",
    product_deleted_successfully: "Le produit a été supprimé avec succès.",
    failed_to_add_product: "Échec de l'ajout du produit. Veuillez réessayer.",
    failed_to_update_product: "Échec de la mise à jour du produit. Veuillez réessayer.",
    failed_to_delete_product: "Échec de la suppression du produit. Veuillez réessayer.",
    failed_to_load_products: "Échec du chargement des produits",
    failed_to_load_categories: "Échec du chargement des catégories",
    barcode_generated: "Code-barres Généré",
    new_barcode: "Nouveau code-barres",
    purchase_price: "Prix d'Achat",
    min_stock: "Stock Minimum",
    image_url: "URL de l'Image",
    add_category: "Ajouter Catégorie",
    add_new_category: "Ajouter Nouvelle Catégorie",
    add_category_description: "Créer une nouvelle catégorie pour vos produits.",
    category_added: "Catégorie Ajoutée",
    category_added_successfully: "La catégorie a été ajoutée avec succès.",
    failed_to_add_category: "Échec de l'ajout de la catégorie. Veuillez réessayer.",
    validation_error: "Erreur de Validation",
    please_enter_category_name: "Veuillez entrer un nom de catégorie",
    select_category_optional: "Sélectionner une catégorie (optionnel)",
    enter_category_name: "Entrer le nom de la catégorie",
    save_changes: "Enregistrer les Modifications",
    are_you_sure: "Êtes-vous sûr?",
    delete_product_confirmation: "Cela supprimera définitivement le produit",
    action_cannot_be_undone: "Cette action ne peut pas être annulée.",
    barcode_preview: "Aperçu du Code-barres",
    barcode_preview_description: "Aperçu du code-barres avant impression.",
    print_barcode: "Imprimer le Code-barres",
    printing_barcode: "Impression du Code-barres",
    barcode_for: "Code-barres pour",
    sent_to_printer: "envoyé à l'imprimante",
    generate: "Générer",
    search_by_name_or_barcode: "Rechercher par nom ou code-barres...",
    no_products_found: "Aucun produit trouvé. Ajoutez des produits à votre inventaire.",
    showing: "Affichage",
    entries: "entrées",
    page: "Page",
    created_at: "Créé Le",
    filters_applied: "Filtres appliqués",
    clear_filters: "Effacer les Filtres",
    expense_records: "Registres de Dépenses",
    showing_filtered_expenses: "Affichage des dépenses filtrées",
    showing_all_expenses: "Affichage de toutes les dépenses",
    show: "Afficher",
    all_categories: "Toutes les Catégories",
    page_total: "Total de la Page",
    grand_total: "Total Général",
    filtered: "Filtré",
    
    // Expense page translations
    expenses: "Dépenses",
    add_expense: "Ajouter une Dépense",
    add_new_expense: "Ajouter une Nouvelle Dépense",
    add_expense_description: "Entrez les détails de la nouvelle dépense.",
    edit_expense: "Modifier la Dépense",
    edit_expense_description: "Mettre à jour les détails de cette dépense.",
    delete_expense_warning: "Cela supprimera définitivement la dépense.",
    select_category: "Sélectionner une Catégorie",
    no_categories: "Aucune catégorie trouvée.",
    save_expense: "Enregistrer la Dépense",
    update_expense: "Mettre à Jour la Dépense",
    filter_expenses: "Filtrer les Dépenses",
    filter_expenses_description: "Filtrer les dépenses par date et catégorie.",
    from_date: "Date de Début",
    to_date: "Date de Fin",
    select_date: "Sélectionner une Date",
    no_expenses_found: "Aucune dépense trouvée.",
    save_category: "Enregistrer la Catégorie",
    // Dashboard page translations
    out_of_stock: "Rupture de stock",
    low_stock: "Stock faible",
    pick_date_range: "Choisir une plage de dates",
    loading_dashboard_data: "Chargement des données du tableau de bord...",
    overview: "Aperçu",
    total_sales: "Ventes totales",
    transactions: "Transactions",
    total_expenses: "Dépenses totales",
    profit: "Profit",
    loss: "Perte",
    for_selected_period: "Pour la période sélectionnée",
    inventory_status: "État des stocks",
    recent_sales: "Ventes récentes",
    last_n_sales: "Dernières {n} ventes",
    no_recent_sales_found: "Aucune vente récente trouvée.",
    sale: "Vente",
    recent_expenses: "Dépenses récentes",
    last_n_expenses: "Dernières {n} dépenses",
    no_recent_expenses_found: "Aucune dépense récente trouvée.",
    unknown_date: "Date inconnue",
    inventory_details_displayed_here: "Détails de l'inventaire affichés ici",
    // Reports page translations
    failed_fetch_sales: "Échec de la récupération des données de ventes",
    failed_fetch_expenses: "Échec de la récupération des données de dépenses",
    failed_fetch_inventory: "Échec de la récupération des données d'inventaire",
    export_successful: "Exportation Réussie",
    report_exported: "Rapport exporté:",
    uncategorized: "Non catégorisé",
    select_period: "Sélectionner une Période",
    today: "Aujourd'hui",
    yesterday: "Hier",
    last_7_days: "7 Derniers Jours",
    last_30_days: "30 Derniers Jours",
    this_month: "Ce Mois",
    last_month: "Mois Dernier",
    custom_range: "Plage Personnalisée",
    export: "Exporter",
    refresh: "Actualiser",
    filters: "Filtres",
    payment_method: "Méthode de Paiement",
    all_methods: "Toutes les Méthodes",
    cash: "Espèces",
    card: "Carte",
    transfer: "Virement",
    for_period: "Pour la période",
    total_profit: "Profit Total",
    margin: "Marge",
    average: "Moyenne",
    per_transaction: "par transaction",
    payment_methods: "Méthodes de Paiement",
    sales_trend: "Tendance des Ventes",
    daily_sales_profit: "Ventes et Profits Quotidiens",
    no_sales_data: "Aucune donnée de vente disponible",
    sales_transactions: "Transactions de Ventes",
    transactions_for_period: "transactions pour la période",
    revenue: "Revenu",
    cost: "Coût",
    sales_by_payment_method: "Ventes par Méthode de Paiement",
  },
  ar: {
    alerts: "التنبيهات",
    dashboard: "لوحة التحكم",
    products: "المنتجات",
    categories: "الفئات",
    customers: "العملاء",
    sales: "المبيعات",
    reports: "التقارير",
    settings: "الإعدادات",
    logout: "تسجيل الخروج",
    profile: "الملف الشخصي",
    inventory: "المخزون",
    pointOfSale: "نقطة البيع",
    addNew: "إضافة جديد",
    edit: "تعديل",
    delete: "حذف",
    save: "حفظ",
    cancel: "إلغاء",
    search: "بحث",
    filter: "تصفية",
    sort: "ترتيب",
    actions: "الإجراءات",
    confirm: "تأكيد",
    back: "رجوع",
    next: "التالي",
    previous: "السابق",
    loading: "جاري التحميل",
    noResults: "لا توجد نتائج",
    error: "خطأ",
    success: "نجاح",
    warning: "تحذير",
    info: "معلومات",
    required: "مطلوب",
    optional: "اختياري",
    name: "الاسم",
    description: "الوصف",
    price: "السعر",
    stock: "المخزون",
    category: "الفئة",
    image: "الصورة",
    barcode: "الباركود",
    date: "التاريخ",
    time: "الوقت",
    status: "الحالة",
    active: "نشط",
    inactive: "غير نشط",
    enabled: "مفعل",
    disabled: "معطل",
    yes: "نعم",
    no: "لا",
    all: "الكل",
    none: "لا شيء",
    select: "اختيار",
    clear: "مسح",
    apply: "تطبيق",
    reset: "إعادة تعيين",
    total: "الإجمالي",
    subtotal: "الإجمالي الفرعي",
    tax: "الضريبة",
    discount: "الخصم",
    quantity: "الكمية",
    welcome: "مرحبًا",
    signIn: "تسجيل الدخول",
    signOut: "تسجيل الخروج",
    register: "تسجيل",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    forgotPassword: "نسيت كلمة المرور",
    resetPassword: "إعادة تعيين كلمة المرور",
    rememberMe: "تذكرني",
    or: "أو",
    and: "و",
    with: "مع",
    by: "بواسطة",
    for: "لـ",
    to: "إلى",
    from: "من",
    at: "في",
    on: "على",
    in: "في",
    of: "من",
    // Settings page translations
    settings_saved_successfully: "تم حفظ الإعدادات بنجاح.",
    error_saving_settings: "خطأ في حفظ الإعدادات",
    manage_store_settings: "إدارة إعدادات المتجر",
    tax_rate: "معدل الضريبة",
    currency: "العملة",
    change_currency: "تغيير العملة ($, £, €, DH)",
    select_currency: "اختر العملة",
    language: "اللغة",
    select_language: "اختر اللغة",
    preview: "معاينة",
    my_store: "متجري",
    amount: "المبلغ",
    saving: "جاري الحفظ",
    save_settings: "حفظ الإعدادات",
    settings_saved: "تم حفظ الإعدادات",
    changes_take_effect: "سيتم تطبيق التغييرات فورًا.",
    error_saving_settings_try_again: "حدث خطأ أثناء حفظ الإعدادات. حاول مرة أخرى.",
    close: "إغلاق",
    // Inventory page translations
    add_product: "إضافة منتج",
    add_new_product: "إضافة منتج جديد",
    add_product_description: "أدخل تفاصيل المنتج الجديد لإضافته إلى المخزون.",
    edit_product: "تعديل المنتج",
    edit_product_description: "قم بتحديث تفاصيل هذا المنتج.",
    delete_product: "حذف المنتج",
    product_added: "تمت إضافة المنتج",
    product_added_successfully: "تمت إضافة المنتج بنجاح.",
    product_updated: "تم تحديث المنتج",
    product_updated_successfully: "تم تحديث المنتج بنجاح.",
    product_deleted: "تم حذف المنتج",
    product_deleted_successfully: "تم حذف المنتج بنجاح.",
    failed_to_add_product: "فشل في إضافة المنتج. حاول مرة أخرى.",
    failed_to_update_product: "فشل في تحديث المنتج. حاول مرة أخرى.",
    failed_to_delete_product: "فشل في حذف المنتج. حاول مرة أخرى.",
    failed_to_load_products: "فشل في تحميل المنتجات",
    failed_to_load_categories: "فشل في تحميل الفئات",
    barcode_generated: "تم إنشاء الباركود",
    new_barcode: "باركود جديد",
    purchase_price: "سعر الشراء",
    min_stock: "أدنى كمية مخزون",
    image_url: "رابط الصورة",
    add_category: "إضافة فئة",
    add_new_category: "إضافة فئة جديدة",
    add_category_description: "قم بإنشاء فئة جديدة لمنتجاتك.",
    category_added: "تمت إضافة الفئة",
    category_added_successfully: "تمت إضافة الفئة بنجاح.",
    failed_to_add_category: "فشل في إضافة الفئة. حاول مرة أخرى.",
    validation_error: "خطأ في التحقق",
    please_enter_category_name: "يرجى إدخال اسم الفئة",
    select_category_optional: "اختر فئة (اختياري)",
    enter_category_name: "أدخل اسم الفئة",
    save_changes: "حفظ التغييرات",
    are_you_sure: "هل أنت متأكد؟",
    delete_product_confirmation: "سيتم حذف المنتج نهائيًا.",
    action_cannot_be_undone: "لا يمكن التراجع عن هذا الإجراء.",
    barcode_preview: "معاينة الباركود",
    barcode_preview_description: "قم بمعاينة الباركود قبل الطباعة.",
    print_barcode: "طباعة الباركود",
    printing_barcode: "جاري طباعة الباركود",
    barcode_for: "باركود لـ",
    sent_to_printer: "تم الإرسال إلى الطابعة",
    generate: "إنشاء",
    search_by_name_or_barcode: "البحث بالاسم أو الباركود...",
    no_products_found: "لم يتم العثور على منتجات. أضف بعض المنتجات إلى المخزون.",
    showing: "عرض",
    entries: "إدخالات",
    page: "صفحة",
    created_at: "تم الإنشاء في",
    filters_applied: "تم تطبيق الفلاتر",
    clear_filters: "مسح الفلاتر",
    expense_records: "سجلات المصروفات",
    showing_filtered_expenses: "عرض سجلات المصروفات المصفاة",
    showing_all_expenses: "عرض جميع سجلات المصروفات",
    show: "عرض",
    all_categories: "جميع الفئات",
    page_total: "إجمالي الصفحة",
    grand_total: "المجموع الكلي",
    filtered: "تم التصفية",
    
    // Expense page translations
    expenses: "المصروفات",
    add_expense: "إضافة مصروف",
    add_new_expense: "إضافة مصروف جديد",
    add_expense_description: "أدخل تفاصيل المصروف الجديد.",
    edit_expense: "تعديل المصروف",
    edit_expense_description: "قم بتحديث تفاصيل هذا المصروف.",
    delete_expense_warning: "سيتم حذف المصروف نهائيًا.",
    select_category: "اختر الفئة",
    no_categories: "لم يتم العثور على فئات.",
    save_expense: "حفظ المصروف",
    update_expense: "تحديث المصروف",
    filter_expenses: "تصفية المصروفات",
    filter_expenses_description: "تصفية المصروفات حسب التاريخ والفئة.",
    from_date: "من تاريخ",
    to_date: "إلى تاريخ",
    select_date: "اختر التاريخ",
    no_expenses_found: "لم يتم العثور على مصروفات.",
    save_category: "حفظ الفئة",
    // Dashboard page translations
    out_of_stock: "نفذ من المخزون",
    low_stock: "مخزون منخفض",
    pick_date_range: "اختر نطاق التاريخ",
    loading_dashboard_data: "جاري تحميل بيانات لوحة التحكم...",
    overview: "نظرة عامة",
    total_sales: "إجمالي المبيعات",
    transactions: "المعاملات",
    total_expenses: "إجمالي المصروفات",
    profit: "الربح",
    loss: "الخسارة",
    for_selected_period: "للفترة المحددة",
    inventory_status: "حالة المخزون",
    recent_sales: "المبيعات الأخيرة",
    last_n_sales: "آخر {n} مبيعات",
    no_recent_sales_found: "لم يتم العثور على مبيعات حديثة.",
    sale: "بيع",
    recent_expenses: "المصروفات الأخيرة",
    last_n_expenses: "آخر {n} مصروفات",
    no_recent_expenses_found: "لم يتم العثور على مصروفات حديثة.",
    unknown_date: "تاريخ غير معروف",
    inventory_details_displayed_here: "تفاصيل المخزون معروضة هنا",
    // Reports page translations
    failed_fetch_sales: "فشل في جلب بيانات المبيعات",
    failed_fetch_expenses: "فشل في جلب بيانات المصروفات",
    failed_fetch_inventory: "فشل في جلب بيانات المخزون",
    export_successful: "تم التصدير بنجاح",
    report_exported: "تم تصدير التقرير:",
    uncategorized: "غير مصنف",
    select_period: "اختر الفترة",
    today: "اليوم",
    yesterday: "الأمس",
    last_7_days: "آخر 7 أيام",
    last_30_days: "آخر 30 يوم",
    this_month: "هذا الشهر",
    last_month: "الشهر الماضي",
    custom_range: "نطاق مخصص",
    export: "تصدير",
    refresh: "تحديث",
    filters: "الفلاتر",
    payment_method: "طريقة الدفع",
    all_methods: "جميع الطرق",
    cash: "نقدًا",
    card: "بطاقة",
    transfer: "تحويل",
    for_period: "للفترة",
    total_profit: "إجمالي الربح",
    margin: "الهامش",
    average: "المتوسط",
    per_transaction: "لكل معاملة",
    payment_methods: "طرق الدفع",
    sales_trend: "اتجاه المبيعات",
    daily_sales_profit: "المبيعات والأرباح اليومية",
    no_sales_data: "لا توجد بيانات مبيعات متاحة",
    sales_transactions: "معاملات المبيعات",
    transactions_for_period: "المعاملات للفترة",
    revenue: "الإيرادات",
    cost: "التكلفة",
    sales_by_payment_method: "المبيعات حسب طريقة الدفع",
  },
}

// Function to get a translation
export function getAppTranslation(key: AppTranslationKey, language = "en"): string {
  // If the language is not supported, fall back to English
  if (!appTranslations[language]) {
    return appTranslations.en[key]
  }

  // If the key doesn't exist in the language, fall back to English
  return appTranslations[language][key] || appTranslations.en[key]
}

