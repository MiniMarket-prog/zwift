// Define types for our application-wide translations
export type AppTranslationKey =
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
  // Add the missing keys from the error messages
  | "settings_saved_successfully"
  | "error_saving_settings"
  | "manage_store_settings"
  | "tax_rate"
  | "currency"
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
  // Add all the missing keys from the expenses page
  | "validation_error"
  | "expenses"
  | "add_expense"
  | "add_new_expense"
  | "add_expense_description"
  | "select_category"
  | "no_categories"
  | "save_expense"
  | "filter_expenses"
  | "filter_expenses_description"
  | "from_date"
  | "select_date"
  | "to_date"
  | "all_categories"
  | "filters_applied"
  | "clear_filters"
  | "expense_records"
  | "showing_filtered_expenses"
  | "showing_all_expenses"
  | "show"
  | "entries"
  | "no_expenses_found"
  | "page_total"
  | "grand_total"
  | "filtered"
  | "showing"
  | "page"
  | "add_category"
  | "add_category_description"
  | "save_category"
  | "edit_expense"
  | "edit_expense_description"
  | "update_expense"
  | "are_you_sure"
  | "delete_expense_warning"
  | "manage_expenses"
  | "no_expenses"
  // Add reports page translations
  | "failed_fetch_sales"
  | "failed_fetch_expenses"
  | "failed_fetch_inventory"
  | "export_successful"
  | "report_exported"
  | "uncategorized"
  | "profit"
  | "select_period"
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "custom_range"
  | "pick_date_range"
  | "export"
  | "refresh"
  | "filters"
  | "payment_method"
  | "all_methods"
  | "cash"
  | "card"
  | "transfer"
  | "total_sales"
  | "for_period"
  | "total_profit"
  | "margin"
  | "transactions"
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
  | "alerts"
  | "open_sidebar"
  | "toggle_theme"
  | "toggle_sidebar"
  | "rights_reserved"
  | "overview"
  | "loading_dashboard_data"
  | "total_expenses"
  | "loss"
  | "for_selected_period"
  | "inventory_status"
  | "low_stock"
  | "out_of_stock"
  | "recent_sales"
  | "last_n_sales"
  | "no_recent_sales_found"
  | "sale"
  | "recent_expenses"
  | "last_n_expenses"
  | "no_recent_expenses_found"
  | "unknown_date"
  | "sales_overview"
  | "detailed_sales_information"
  | "sales_details_displayed_here"
  | "inventory_overview"
  | "detailed_inventory_information"
  | "inventory_details_displayed_here"

// Define translations for each supported language
export const appTranslations: Record<string, Record<AppTranslationKey, string>> = {
  en: {
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
    // Add translations for the new keys
    settings_saved_successfully: "Your settings have been saved successfully.",
    error_saving_settings: "Error saving settings",
    manage_store_settings: "Manage your store settings",
    tax_rate: "Tax Rate",
    currency: "Currency",
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
    // Add translations for the expenses page keys
    validation_error: "Validation Error",
    expenses: "Expenses",
    add_expense: "Add Expense",
    add_new_expense: "Add New Expense",
    add_expense_description: "Enter the details of the expense to add it to your records.",
    select_category: "Select a category",
    no_categories: "No categories available",
    save_expense: "Save Expense",
    filter_expenses: "Filter Expenses",
    filter_expenses_description: "Filter expenses by date range and category",
    from_date: "From Date",
    select_date: "Select date",
    to_date: "To Date",
    all_categories: "All Categories",
    filters_applied: "Filters applied",
    clear_filters: "Clear Filters",
    expense_records: "Expense Records",
    showing_filtered_expenses: "Showing filtered expense records",
    showing_all_expenses: "Showing all expense records",
    show: "Show",
    entries: "entries",
    no_expenses_found: "No expenses found matching your criteria.",
    page_total: "Page Total",
    grand_total: "Grand Total",
    filtered: "Filtered",
    showing: "Showing",
    page: "Page",
    add_category: "Add Category",
    add_category_description: "Create a new category for expenses.",
    save_category: "Save Category",
    edit_expense: "Edit Expense",
    edit_expense_description: "Update the details of this expense.",
    update_expense: "Update Expense",
    are_you_sure: "Are you sure?",
    delete_expense_warning: "This action cannot be undone. This will permanently delete the expense",
    manage_expenses: "Manage your expenses",
    no_expenses: "No expenses found",
    // Add reports page translations
    failed_fetch_sales: "Failed to fetch sales data",
    failed_fetch_expenses: "Failed to fetch expense data",
    failed_fetch_inventory: "Failed to fetch inventory data",
    export_successful: "Export Successful",
    report_exported: "Report has been exported to",
    uncategorized: "Uncategorized",
    profit: "Profit",
    select_period: "Select period",
    today: "Today",
    yesterday: "Yesterday",
    last_7_days: "Last 7 Days",
    last_30_days: "Last 30 Days",
    this_month: "This Month",
    last_month: "Last Month",
    custom_range: "Custom Range",
    pick_date_range: "Pick a date range",
    export: "Export",
    refresh: "Refresh",
    filters: "Filters",
    payment_method: "Payment Method",
    all_methods: "All Methods",
    cash: "Cash",
    card: "Card",
    transfer: "Transfer",
    total_sales: "Total Sales",
    for_period: "For period",
    total_profit: "Total Profit",
    margin: "Margin",
    transactions: "Transactions",
    average: "Average",
    per_transaction: "per transaction",
    payment_methods: "Payment Methods",
    sales_trend: "Sales Trend",
    daily_sales_profit: "Daily sales and profit for the selected period",
    no_sales_data: "No sales data available for the selected period",
    sales_transactions: "Sales Transactions",
    transactions_for_period: "transactions for the selected period",
    revenue: "Revenue",
    cost: "Cost",
    alerts: "Alerts",
    open_sidebar: "Open sidebar",
    toggle_theme: "Toggle theme",
    toggle_sidebar: "Toggle sidebar",
    rights_reserved: "rights reserved",
    overview: "Overview",
    loading_dashboard_data: "Loading dashboard data...",
    total_expenses: "Total Expenses",
    loss: "Loss",
    for_selected_period: "for selected period",
    inventory_status: "Inventory Status",
    low_stock: "low stock",
    out_of_stock: "out of stock",
    recent_sales: "Recent Sales",
    last_n_sales: "Last {n} sales",
    no_recent_sales_found: "No recent sales found.",
    sale: "Sale",
    recent_expenses: "Recent Expenses",
    last_n_expenses: "Last {n} expenses",
    no_recent_expenses_found: "No recent expenses found.",
    unknown_date: "Unknown date",
    sales_overview: "Sales Overview",
    detailed_sales_information: "Detailed sales information for the selected period",
    sales_details_displayed_here: "Sales details will be displayed here.",
    inventory_overview: "Inventory Overview",
    detailed_inventory_information: "Detailed inventory information",
    inventory_details_displayed_here: "Inventory details will be displayed here.",
  },
  es: {
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
    // Add translations for the new keys
    settings_saved_successfully: "Tu configuración se ha guardado correctamente.",
    error_saving_settings: "Error al guardar la configuración",
    manage_store_settings: "Administra la configuración de tu tienda",
    tax_rate: "Tasa de Impuesto",
    currency: "Moneda",
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
    // Add translations for the expenses page keys
    validation_error: "Error de Validación",
    expenses: "Gastos",
    add_expense: "Añadir Gasto",
    add_new_expense: "Añadir Nuevo Gasto",
    add_expense_description: "Ingrese los detalles del gasto para añadirlo a sus registros.",
    select_category: "Seleccionar una categoría",
    no_categories: "No hay categorías disponibles",
    save_expense: "Guardar Gasto",
    filter_expenses: "Filtrar Gastos",
    filter_expenses_description: "Filtrar gastos por rango de fechas y categoría",
    from_date: "Desde Fecha",
    select_date: "Seleccionar fecha",
    to_date: "Hasta Fecha",
    all_categories: "Todas las Categorías",
    filters_applied: "Filtros aplicados",
    clear_filters: "Limpiar Filtros",
    expense_records: "Registros de Gastos",
    showing_filtered_expenses: "Mostrando registros de gastos filtrados",
    showing_all_expenses: "Mostrando todos los registros de gastos",
    show: "Mostrar",
    entries: "entradas",
    no_expenses_found: "No se encontraron gastos que coincidan con sus criterios.",
    page_total: "Total de Página",
    grand_total: "Total General",
    filtered: "Filtrado",
    showing: "Mostrando",
    page: "Página",
    add_category: "Añadir Categoría",
    add_category_description: "Crear una nueva categoría para gastos.",
    save_category: "Guardar Categoría",
    edit_expense: "Editar Gasto",
    edit_expense_description: "Actualizar los detalles de este gasto.",
    update_expense: "Actualizar Gasto",
    are_you_sure: "¿Está seguro?",
    delete_expense_warning: "Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto",
    manage_expenses: "Administrar sus gastos",
    no_expenses: "No se encontraron gastos",
    // Add reports page translations
    failed_fetch_sales: "Error al obtener datos de ventas",
    failed_fetch_expenses: "Error al obtener datos de gastos",
    failed_fetch_inventory: "Error al obtener datos de inventario",
    export_successful: "Exportación exitosa",
    report_exported: "El informe ha sido exportado a",
    uncategorized: "Sin categoría",
    profit: "Beneficio",
    select_period: "Seleccionar período",
    today: "Hoy",
    yesterday: "Ayer",
    last_7_days: "Últimos 7 días",
    last_30_days: "Últimos 30 días",
    this_month: "Este mes",
    last_month: "Mes pasado",
    custom_range: "Rango personalizado",
    pick_date_range: "Elegir un rango de fechas",
    export: "Exportar",
    refresh: "Actualizar",
    filters: "Filtros",
    payment_method: "Método de pago",
    all_methods: "Todos los métodos",
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    total_sales: "Ventas totales",
    for_period: "Para el período",
    total_profit: "Beneficio total",
    margin: "Margen",
    transactions: "Transacciones",
    average: "Promedio",
    per_transaction: "por transacción",
    payment_methods: "Métodos de pago",
    sales_trend: "Tendencia de ventas",
    daily_sales_profit: "Ventas diarias y beneficios para el período seleccionado",
    no_sales_data: "No hay datos de ventas disponibles para el período seleccionado",
    sales_transactions: "Transacciones de ventas",
    transactions_for_period: "transacciones para el período seleccionado",
    revenue: "Ingresos",
    cost: "Costo",
    alerts: "Alertas",
    open_sidebar: "Abrir barra lateral",
    toggle_theme: "Cambiar tema",
    toggle_sidebar: "Alternar barra lateral",
    rights_reserved: "derechos reservados",
    overview: "Resumen",
    loading_dashboard_data: "Cargando datos del panel...",
    total_expenses: "Gastos Totales",
    loss: "Pérdida",
    for_selected_period: "Para el período seleccionado",
    inventory_status: "Estado del Inventario",
    low_stock: "Stock Bajo",
    out_of_stock: "Agotado",
    recent_sales: "Ventas Recientes",
    last_n_sales: "Últimas {n} Ventas",
    no_recent_sales_found: "No se encontraron ventas recientes",
    sale: "Venta",
    recent_expenses: "Gastos Recientes",
    last_n_expenses: "Últimos {n} Gastos",
    no_recent_expenses_found: "No se encontraron gastos recientes",
    unknown_date: "Fecha Desconocida",
    sales_overview: "Resumen de Ventas",
    detailed_sales_information: "Información detallada de ventas",
    sales_details_displayed_here: "Detalles de ventas mostrados aquí",
    inventory_overview: "Resumen de Inventario",
    detailed_inventory_information: "Información detallada del inventario",
    inventory_details_displayed_here: "Detalles del inventario mostrados aquí",
  },
  fr: {
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
    required: "Obligatoire",
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
    discount: "Réduction",
    quantity: "Quantité",
    welcome: "Bienvenue",
    signIn: "Se Connecter",
    signOut: "Se Déconnecter",
    register: "S'inscrire",
    email: "Courriel",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    forgotPassword: "Mot de passe oublié",
    resetPassword: "Réinitialiser le mot de passe",
    rememberMe: "Se souvenir de moi",
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
    // Add translations for the new keys
    settings_saved_successfully: "Vos paramètres ont été enregistrés avec succès.",
    error_saving_settings: "Erreur lors de l'enregistrement des paramètres",
    manage_store_settings: "Gérer les paramètres de votre boutique",
    tax_rate: "Taux de taxe",
    currency: "Devise",
    select_currency: "Sélectionner la devise",
    language: "Langue",
    select_language: "Sélectionner la langue",
    preview: "Aperçu",
    my_store: "Ma Boutique",
    amount: "Montant",
    saving: "Enregistrement",
    save_settings: "Enregistrer les paramètres",
    settings_saved: "Paramètres enregistrés",
    changes_take_effect: "Les modifications prendront effet immédiatement.",
    error_saving_settings_try_again:
      "Une erreur s'est produite lors de l'enregistrement de vos paramètres. Veuillez réessayer.",
    close: "Fermer",
    // Add translations for the expenses page keys
    validation_error: "Erreur de validation",
    expenses: "Dépenses",
    add_expense: "Ajouter une dépense",
    add_new_expense: "Ajouter une nouvelle dépense",
    add_expense_description: "Entrez les détails de la dépense pour l'ajouter à vos enregistrements.",
    select_category: "Sélectionner une catégorie",
    no_categories: "Aucune catégorie disponible",
    save_expense: "Enregistrer la dépense",
    filter_expenses: "Filtrer les dépenses",
    filter_expenses_description: "Filtrer les dépenses par plage de dates et catégorie",
    from_date: "Date de début",
    select_date: "Sélectionner une date",
    to_date: "Date de fin",
    all_categories: "Toutes les catégories",
    filters_applied: "Filtres appliqués",
    clear_filters: "Effacer les filtres",
    expense_records: "Enregistrements de dépenses",
    showing_filtered_expenses: "Affichage des enregistrements de dépenses filtrés",
    showing_all_expenses: "Affichage de tous les enregistrements de dépenses",
    show: "Afficher",
    entries: "entrées",
    no_expenses_found: "Aucune dépense correspondant à vos critères n'a été trouvée.",
    page_total: "Total de la page",
    grand_total: "Total général",
    filtered: "Filtré",
    showing: "Affichage",
    page: "Page",
    add_category: "Ajouter une catégorie",
    add_category_description: "Créer une nouvelle catégorie pour les dépenses.",
    save_category: "Enregistrer la catégorie",
    edit_expense: "Modifier la dépense",
    edit_expense_description: "Mettre à jour les détails de cette dépense.",
    update_expense: "Mettre à jour la dépense",
    are_you_sure: "Êtes-vous sûr?",
    delete_expense_warning: "Cette action est irréversible. Cela supprimera définitivement la dépense",
    manage_expenses: "Gérer vos dépenses",
    no_expenses: "Aucune dépense trouvée",
    // Add reports page translations
    failed_fetch_sales: "Échec de la récupération des données de ventes",
    failed_fetch_expenses: "Échec de la récupération des données de dépenses",
    failed_fetch_inventory: "Échec de la récupération des données d'inventaire",
    export_successful: "Exportation réussie",
    report_exported: "Le rapport a été exporté vers",
    uncategorized: "Non catégorisé",
    profit: "Profit",
    select_period: "Sélectionner une période",
    today: "Aujourd'hui",
    yesterday: "Hier",
    last_7_days: "7 derniers jours",
    last_30_days: "30 derniers jours",
    this_month: "Ce mois-ci",
    last_month: "Le mois dernier",
    custom_range: "Plage personnalisée",
    pick_date_range: "Choisir une plage de dates",
    export: "Exporter",
    refresh: "Actualiser",
    filters: "Filtres",
    payment_method: "Méthode de paiement",
    all_methods: "Toutes les méthodes",
    cash: "Espèces",
    card: "Carte",
    transfer: "Virement",
    total_sales: "Ventes totales",
    for_period: "Pour la période",
    total_profit: "Bénéfice total",
    margin: "Marge",
    transactions: "Transactions",
    average: "Moyenne",
    per_transaction: "par transaction",
    payment_methods: "Méthodes de paiement",
    sales_trend: "Tendance des ventes",
    daily_sales_profit: "Ventes et bénéfices quotidiens pour la période sélectionnée",
    no_sales_data: "Aucune donnée de vente disponible pour la période sélectionnée",
    sales_transactions: "Transactions de vente",
    transactions_for_period: "transactions pour la période sélectionnée",
    revenue: "Revenu",
    cost: "Coût",
    alerts: "Alertes",
    open_sidebar: "Ouvrir la barre latérale",
    toggle_theme: "Basculer le thème",
    toggle_sidebar: "Basculer la barre latérale",
    rights_reserved: "droits réservés",
    overview: "Aperçu",
    loading_dashboard_data: "Chargement des données du tableau de bord...",
    total_expenses: "Dépenses Totales",
    loss: "Perte",
    for_selected_period: "pour la période sélectionnée",
    inventory_status: "État de l'Inventaire",
    low_stock: "stock faible",
    out_of_stock: "rupture de stock",
    recent_sales: "Ventes Récentes",
    last_n_sales: "Dernières {n} ventes",
    no_recent_sales_found: "Aucune vente récente trouvée.",
    sale: "Vente",
    recent_expenses: "Dépenses Récentes",
    last_n_expenses: "Dernières {n} dépenses",
    no_recent_expenses_found: "Aucune dépense récente trouvée.",
    unknown_date: "Date inconnue",
    sales_overview: "Aperçu des Ventes",
    detailed_sales_information: "Informations détaillées sur les ventes pour la période sélectionnée",
    sales_details_displayed_here: "Les détails des ventes seront affichés ici.",
    inventory_overview: "Aperçu de l'Inventaire",
    detailed_inventory_information: "Informations détaillées sur l'inventaire",
    inventory_details_displayed_here: "Les détails de l'inventaire seront affichés ici.",
  },
  ar: {
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
    actions: "إجراءات",
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
    total: "المجموع",
    subtotal: "المجموع الفرعي",
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
    // Add translations for the new keys
    settings_saved_successfully: "تم حفظ الإعدادات الخاصة بك بنجاح.",
    error_saving_settings: "خطأ في حفظ الإعدادات",
    manage_store_settings: "إدارة إعدادات المتجر الخاص بك",
    tax_rate: "معدل الضريبة",
    currency: "العملة",
    select_currency: "اختر العملة",
    language: "اللغة",
    select_language: "اختر اللغة",
    preview: "معاينة",
    my_store: "متجري",
    amount: "المبلغ",
    saving: "جاري الحفظ",
    save_settings: "حفظ الإعدادات",
    settings_saved: "تم حفظ الإعدادات",
    changes_take_effect: "ستظهر التغييرات على الفور.",
    error_saving_settings_try_again: "حدث خطأ أثناء حفظ الإعدادات الخاصة بك. يرجى المحاولة مرة أخرى.",
    close: "إغلاق",
    // Add translations for the expenses page keys
    validation_error: "خطأ في التحقق",
    expenses: "المصروفات",
    add_expense: "إضافة مصروف",
    add_new_expense: "إضافة مصروف جديد",
    add_expense_description: "أدخل تفاصيل المصروف لإضافته إلى سجلاتك.",
    select_category: "اختر فئة",
    no_categories: "لا توجد فئات متاحة",
    save_expense: "حفظ المصروف",
    filter_expenses: "تصفية المصروفات",
    filter_expenses_description: "تصفية المصروفات حسب نطاق التاريخ والفئة",
    from_date: "من تاريخ",
    select_date: "اختر تاريخ",
    to_date: "إلى تاريخ",
    all_categories: "جميع الفئات",
    filters_applied: "تم تطبيق الفلاتر",
    clear_filters: "مسح الفلاتر",
    expense_records: "سجلات المصروفات",
    showing_filtered_expenses: "عرض سجلات المصروفات المصفاة",
    showing_all_expenses: "عرض جميع سجلات المصروفات",
    show: "عرض",
    entries: "إدخالات",
    no_expenses_found: "لم يتم العثور على مصروفات تطابق معاييرك.",
    page_total: "إجمالي الصفحة",
    grand_total: "المجموع الكلي",
    filtered: "مصفى",
    showing: "عرض",
    page: "صفحة",
    add_category: "إضافة فئة",
    add_category_description: "إنشاء فئة جديدة للمصروفات.",
    save_category: "حفظ الفئة",
    edit_expense: "تعديل المصروف",
    edit_expense_description: "تحديث تفاصيل هذا المصروف.",
    update_expense: "تحديث المصروف",
    are_you_sure: "هل أنت متأكد؟",
    delete_expense_warning: "لا يمكن التراجع عن هذا الإجراء. سيؤدي هذا إلى حذف المصروف نهائيًا",
    manage_expenses: "إدارة مصروفاتك",
    no_expenses: "لم يتم العثور على مصروفات",
    // Add reports page translations
    failed_fetch_sales: "فشل في جلب بيانات المبيعات",
    failed_fetch_expenses: "فشل في جلب بيانات المصروفات",
    failed_fetch_inventory: "فشل في جلب بيانات المخزون",
    export_successful: "تم التصدير بنجاح",
    report_exported: "تم تصدير التقرير إلى",
    uncategorized: "غير مصنف",
    profit: "الربح",
    select_period: "اختر الفترة",
    today: "اليوم",
    yesterday: "الأمس",
    last_7_days: "آخر 7 أيام",
    last_30_days: "آخر 30 يوم",
    this_month: "هذا الشهر",
    last_month: "الشهر الماضي",
    custom_range: "نطاق مخصص",
    pick_date_range: "اختر نطاق تاريخ",
    export: "تصدير",
    refresh: "تحديث",
    filters: "المرشحات",
    payment_method: "طريقة الدفع",
    all_methods: "جميع الطرق",
    cash: "نقدًا",
    card: "بطاقة",
    transfer: "تحويل",
    total_sales: "إجمالي المبيعات",
    for_period: "للفترة",
    total_profit: "إجمالي الربح",
    margin: "الهامش",
    transactions: "المعاملات",
    average: "المتوسط",
    per_transaction: "لكل معاملة",
    payment_methods: "طرق الدفع",
    sales_trend: "اتجاه المبيعات",
    daily_sales_profit: "المبيعات اليومية والأرباح للفترة المحددة",
    no_sales_data: "لا توجد بيانات مبيعات متاحة للفترة المحددة",
    sales_transactions: "معاملات المبيعات",
    transactions_for_period: "معاملات للفترة المحددة",
    revenue: "الإيرادات",
    cost: "التكلفة",
    alerts: "التنبيهات",
    open_sidebar: "فتح الشريط الجانبي",
    toggle_theme: "تبديل السمة",
    toggle_sidebar: "تبديل الشريط الجانبي",
    rights_reserved: "جميع الحقوق محفوظة",
    overview: "نظرة عامة",
    loading_dashboard_data: "جارٍ تحميل بيانات لوحة التحكم...",
    total_expenses: "إجمالي المصروفات",
    loss: "الخسارة",
    for_selected_period: "للفترة المحددة",
    inventory_status: "حالة المخزون",
    low_stock: "المخزون المنخفض",
    out_of_stock: "نفاد المخزون",
    recent_sales: "المبيعات الأخيرة",
    last_n_sales: "آخر {n} مبيعات",
    no_recent_sales_found: "لم يتم العثور على مبيعات حديثة",
    sale: "بيع",
    recent_expenses: "المصروفات الأخيرة",
    last_n_expenses: "آخر {n} مصروفات",
    no_recent_expenses_found: "لم يتم العثور على مصروفات حديثة",
    unknown_date: "تاريخ غير معروف",
    sales_overview: "نظرة عامة على المبيعات",
    detailed_sales_information: "معلومات تفصيلية عن المبيعات",
    sales_details_displayed_here: "تفاصيل المبيعات معروضة هنا",
    inventory_overview: "نظرة عامة على المخزون",
    detailed_inventory_information: "معلومات تفصيلية عن المخزون",
    inventory_details_displayed_here: "تفاصيل المخزون معروضة هنا",
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

