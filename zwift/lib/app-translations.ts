// Add the missing translation keys to the AppTranslationKey type
export type AppTranslationKey =
  | "alerts" // Add this line
  | "dashboard"
  | "analytics"
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
  
  // Category management keys - Adding the missing keys
  | "category_deleted_successfully"
  | "failed_to_delete_category"
  | "category_updated_successfully"
  | "failed_to_update_category"
  | "existing_categories"
  | "delete_category_warning"
  | "this_action_cannot_be_undone"
  | "edit_category"
  | "edit_category_description"
  | "update_category"
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
  | "low_stock_products"
  | "items_below_min_stock"
  | "products_below_min_stock"
  | "current_stock"
  | "add_to_cart"
  | "restock"
  | "adjust"
  | "no_low_stock_products"
  | "adjust_stock_level"
  | "update_stock_for"
  | "update_stock_level"
  | "stock_updated"
  | "stock_has_been_updated"
  | "units"
  | "has_been_restocked"
  | "failed_to_restock_product"
  | "failed_to_update_stock"
  | "filter_by_category"
  | "search_products"
  | "stock_below_min"
  // User management keys
  | "user_management"
  | "add_user"
  | "add_new_user"
  | "add_user_description"
  | "edit_user"
  | "edit_user_description"
  | "delete_user"
  | "user_added_successfully"
  | "user_updated_successfully"
  | "user_deleted_successfully"
  | "failed_to_add_user"
  | "failed_to_update_user"
  | "failed_to_delete_user"
  | "failed_to_fetch_profiles"
  | "unexpected_error"
  | "loading_users"
  | "search_users"
  | "registered_users_list"
  | "username"
  | "full_name"
  | "not_available"
  | "open_menu"
  | "view_profile"
  | "users"
  | "no_users_found"
  | "unnamed_user"
  | "processing"
  | "confirm_delete"
  | "delete_user_confirmation"
  | "role"
  | "select_role"
  | "role_cashier"
  | "role_manager"
  | "role_admin"
  // Capital Analytics page keys
  | "capital_analytics"
  | "loading_capital_analytics"
  | "total_inventory_value"
  | "estimated_profit"
  | "profit_margin"
  | "inventory_cost"
  | "avg_cost_per_product"
  | "inventory_turnover"
  | "industry_avg"
  | "profitability"
  | "trends"
  | "optimization"
  | "capital_distribution_by_category"
  | "capital_distribution_description"
  | "top_categories_by_value"
  | "categories_highest_inventory_value"
  | "est_profit"
  | "high_value_products"
  | "products_highest_inventory_value"
  | "unit_price"
  | "total_value"
  | "export_full_list"
  | "slow_moving_inventory"
  | "products_high_stock_low_sales"
  | "sales_ratio"
  | "capital_tied"
  | "product_profitability_analysis"
  | "profit_margin_vs_turnover"
  | "profit_margin_percent"
  | "turnover_rate"
  | "most_profitable_products"
  | "products_highest_profit_margins"
  | "highest_turnover_products"
  | "products_sell_most_frequently"
  | "potential_profit"
  | "lowest_turnover_products"
  | "products_sell_least_frequently"
  | "capital_trends_over_time"
  | "sales_expenses_profit_trends"
  | "for_the_period"
  | "inventory_optimization_summary"
  | "recommendations_optimize_inventory"
  | "potential_capital_release"
  | "by_reducing_overstock"
  | "required_restock_investment"
  | "to_maintain_optimal_stock"
  | "net_capital_impact"
  | "estimated_impact_working_capital"
  | "optimization_impact"
  | "potential_impact_inventory_metrics"
  | "reduce_stock"
  | "maintain"
  | "restock_recommendations"
  | "products_need_restocking"
  | "optimal_stock"
  | "restock_quantity"
  | "investment_required"
  | "reduce_stock_recommendations"
  | "products_excess_inventory"
  | "excess_quantity"
  | "capital_release"
  | "refresh_data"
  | "last_3_months"
  | "last_12_months"
  | "failed_fetch_capital_analytics"
  | "failed_fetch_capital_trends"
  | "failed_fetch_product_profitability"
  | "failed_fetch_inventory_optimization"
  | "product"
  | "inventory_activity"
  | "inventory_activity_description"
  | "filter_description"
  | "search_placeholder"
  | "action_type"
  | "select_action"
  | "all_actions"
  | "purchase"
  | "adjustment"
  | "date_range"
  | "table_view"
  | "actions_chart"
  | "products_chart"
  | "timeline_chart"
  | "actions_distribution"
  | "actions_distribution_description"
  | "product_activity"
  | "product_activity_description"
  | "activity_timeline"
  | "activity_timeline_description"
  | "no_data_available"
  | "quantity_change"
  | "previous_stock"
  | "new_stock"
  | "notes"
  | "user"
  // Additional keys for sales reports page
| "refreshing"
| "refresh"
| "loading_data"
| "filters"
| "clear_filters"
| "export"
| "payment_methods"
| "sales_trend"
| "daily_sales_profit"
| "no_sales_data"
| "sales_transactions"
| "transactions_for_period"
| "revenue"
| "cost"
| "sales_by_payment_method"
| "all_methods"
| "cash"
| "card"
| "transfer"
| "for_period"
| "total_profit"
| "margin"
| "average"
| "per_transaction"
// Inventory Forecasting page keys
| "inventory_forecasting"
| "plan_reorders_prevent_stockouts"
| "lead_time_settings"
| "configure_supplier_lead_time"
| "average_supplier_lead_time"
| "supplier_lead_time_description"
| "safety_stock"
| "buffer_inventory_percentage"
| "safety_stock_percentage"
| "safety_stock_description"
| "forecast_range"
| "days_project_future"
| "forecast_days"
| "select_days"
| "forecast_range_description"
| "inventory_forecast"
| "products_need_attention"
| "search_products"
| "sort_by"
| "current_stock"
| "daily_sales"
| "days_until_stockout"
| "reorder_quantity"
| "all_products"
| "critical"
| "critical_days"
| "warning"
| "warning_days"
| "reorder_now"
| "reset_filters"
| "showing_products"
| "forecast_details"
| "projected_inventory"
| "select_product_view_forecast"
| "reorder_recommendation"
| "based_on_avg_sales"
| "units"
| "create_purchase_order"
| "no_immediate_reorder"
| "sufficient_stock"
| "inventory_health_overview"
| "summary_inventory_status"
| "number_of_products"
| "healthy"
| "no_sales"
| "days_of_stock"
| "more_than_days_stock"
| "no_recent_sales_activity"
| "order_from_supplier"
| "quantity"
| "cost"
| "order_created"
| "total_items"
| "cancel"
| "creating"
| "create_order"
| "export_report"
| "page_title.home"
| "page_title.settings"
| "page_title.products"
| "page_title.customers"
| "page_title.orders"
| "page_title.login"
| "page_title.logout"
| "page_title.register"
| "page_title.forgot_password"
| "page_title.reset_password"
| "page_title.verify_email"
| "page_title.profile"
| "page_title.edit_profile"
| "page_title.change_password"
| "page_title.users"
| "page_title.roles"
| "page_title.permissions"
| "page_title.audit_logs"
| "page_title.notifications"
| "page_title.announcements"
| "page_title.support"
| "page_title.contact_us"
| "page_title.terms_of_service"
| "page_title.privacy_policy"
| "page_title.faq"
| "page_title.blog"
| "page_title.pricing"
| "page_title.features"
| "page_title.integrations"
| "page_title.api"
| "page_title.documentation"
| "page_title.status"
| "page_title.maintenance"
| "page_title.coming_soon"
| "page_title.not_found"
| "page_title.unauthorized"
| "page_title.forbidden"
| "page_title.server_error"
| "page_title.bad_request"
| "page_title.payment_required"
| "page_title.conflict"
| "page_title.gone"
| "page_title.too_many_requests"
| "page_title.internal_server_error"
| "page_title.service_unavailable"
| "page_title.gateway_timeout"
| "page_title.network_authentication_required"
| "common.ok"
| "common.cancel"
| "common.delete"
| "common.edit"
| "common.view"
| "common.add"
| "common.save"
| "common.update"
| "common.create"
| "common.search"
| "common.reset"
| "common.back"
| "common.next"
| "common.previous"
| "common.submit"
| "common.confirm"
| "common.close"
| "common.loading"
| "common.error"
| "common.success"
| "common.warning"
| "common.info"
| "common.home"
| "common.settings"
| "common.products"
| "common.customers"
| "common.orders"
| "common.login"
| "common.logout"
| "common.register"
| "common.forgot_password"
| "common.reset_password"
| "common.verify_email"
| "common.profile"
| "common.edit_profile"
| "common.change_password"
| "common.users"
| "common.roles"
| "common.permissions"
| "common.audit_logs"
| "common.notifications"
| "common.announcements"
| "common.support"
| "common.contact_us"
| "common.terms_of_service"
| "common.privacy_policy"
| "common.faq"
| "common.blog"
| "common.pricing"
| "common.features"
| "common.integrations"
| "common.api"
| "common.documentation"
| "common.status"
| "common.maintenance"
| "common.coming_soon"
| "common.not_found"
| "common.unauthorized"
| "common.forbidden"
| "common.server_error"
| "common.bad_request"
| "common.payment_required"
| "common.conflict"
| "common.gone"
| "common.too_many_requests"
| "common.internal_server_error"
| "common.service_unavailable"
| "common.gateway_timeout"
| "common.network_authentication_required"

// Add these translation keys to the AppTranslationKey type:

// Inventory Forecasting page keys
| "inventory_forecasting"
| "plan_reorders_prevent_stockouts"
| "lead_time_settings"
| "configure_supplier_lead_time"
| "average_supplier_lead_time"
| "supplier_lead_time_description"
| "safety_stock"
| "buffer_inventory_percentage"
| "safety_stock_percentage"
| "safety_stock_description"
| "forecast_range"
| "days_project_future"
| "forecast_days"
| "select_days"
| "forecast_range_description"
| "inventory_forecast"
| "products_need_attention"
| "search_products"
| "sort_by"
| "current_stock"
| "daily_sales"
| "days_until_stockout"
| "reorder_quantity"
| "all_products"
| "critical"
| "warning"
| "reorder_now"
| "reset_filters"
| "showing_products"
| "forecast_details"
| "projected_inventory_for"
| "select_product_view_forecast"
| "click_product_view_forecast"
| "reorder_recommendation"
| "based_on_avg_sales"
| "units"
| "and"
| "lead_time_of"
| "you_should_order"
| "units_now"
| "create_purchase_order"
| "no_immediate_reorder"
| "sufficient_stock"
| "inventory_health_overview"
| "summary_inventory_status"
| "number_of_products"
| "healthy"
| "no_sales"
| "less_than_days_stock"
| "days_of_stock"
| "no_recent_sales_activity"
| "order_from_supplier"
| "order_product_from_supplier"
| "quantity"
| "cost"
| "order_created"
| "total_items"
| "cancel"
| "creating"
| "create_order"
| "export_report"
| "purchase_order_created"
| "order_created_successfully"
| "view_all_orders"
| "failed_create_purchase_order"
| "failed_load_forecasting_data"
| "order"
| "details"
| "days"
| "product_name"
| "avg_daily_sales"
| "reorder_qty"
| "projected_stock"
| "min_stock"
| "sammury"
| "Analyses"
| "ActivityReports"
| "Sales_Reports"
| "purchaseOrders"
| "forecasting"
| "capital_analytics"


// Define translations for each supported language
export const appTranslations: Record<string, Record<AppTranslationKey, string>> = {
  en: {
    more_than_days_stock:"more than days stock",
    less_than_days_stock:"less than days stock",
    purchaseOrders: "purchase Orders",
    alerts: "Alerts",
    dashboard: "Dashboard",
    refreshing: "Refreshing",
    loading_data: "Loading data",
    inventory_forecasting: "Inventory forecasting",
    plan_reorders_prevent_stockouts: "Plan reorders to prevent stockouts",
    products: "Products",
    categories: "Categories",
    customers: "Users",
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
    category_deleted_successfully: "The category has been deleted successfully.",
    failed_to_delete_category: "Failed to delete category. Please try again.",
    category_updated_successfully: "The category has been updated successfully.",
    failed_to_update_category: "Failed to update category. Please try again.",
    existing_categories: "Existing Categories",
    delete_category_warning: "This will permanently delete the category.",
    this_action_cannot_be_undone: "This action cannot be undone.",
    edit_category: "Edit Category",
    edit_category_description: "Update the name of this category.",
    update_category: "Update Category",
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
    low_stock_products: "Low Stock Products",
    items_below_min_stock: "Items Below Minimum Stock",
    products_below_min_stock: "Products that are below minimum stock level.",
    current_stock: "Current Stock",
    add_to_cart: "Add to Cart",
    restock: "Restock",
    adjust: "Adjust",
    no_low_stock_products: "No low stock products found.",
    adjust_stock_level: "Adjust Stock Level",
    update_stock_for: "Update stock level for",
    update_stock_level: "Update stock level",
    stock_updated: "Stock Updated",
    stock_has_been_updated: "stock has been updated to",
    units: "units",
    has_been_restocked: "has been restocked to",
    failed_to_restock_product: "Failed to restock product",
    failed_to_update_stock: "Failed to update stock level",
    filter_by_category: "Filter by Category",
    search_products: "Search products...",
    stock_below_min: "New stock level is below minimum stock threshold.",
    // User management keys
    user_management: "User Management",
    add_user: "Add User",
    add_new_user: "Add New User",
    add_user_description: "Enter the details of the new user to add to the system.",
    edit_user: "Edit User",
    edit_user_description: "Update the details of this user.",
    delete_user: "Delete User",
    user_added_successfully: "User has been added successfully.",
    user_updated_successfully: "User has been updated successfully.",
    user_deleted_successfully: "User has been deleted successfully.",
    failed_to_add_user: "Failed to add user. Please try again.",
    failed_to_update_user: "Failed to update user. Please try again.",
    failed_to_delete_user: "Failed to delete user. Please try again.",
    failed_to_fetch_profiles: "Failed to fetch profiles.",
    unexpected_error: "An unexpected error occurred.",
    loading_users: "Loading users...",
    search_users: "Search users...",
    registered_users_list: "A list of your registered users.",
    username: "Username",
    full_name: "Full Name",
    not_available: "N/A",
    open_menu: "Open menu",
    view_profile: "View Profile",
    users: "users",
    no_users_found: "No users found.",
    unnamed_user: "Unnamed User",
    processing: "Processing...",
    confirm_delete: "Confirm Delete",
    delete_user_confirmation: "Are you sure you want to delete user",
    role: "Role",
    select_role: "Select role",
    role_cashier: "Cashier",
    role_manager: "Manager",
    role_admin: "Administrator",
    product: "Product",
    // Capital Analytics page translations
    capital_analytics: "Capital Analytics",
    loading_capital_analytics: "Loading capital analytics data...",
    total_inventory_value: "Total Inventory Value",
    estimated_profit: "Estimated Profit",
    profit_margin: "Profit Margin",
    inventory_cost: "Inventory Cost",
    avg_cost_per_product: "Average Cost per Product",
    inventory_turnover: "Inventory Turnover",
    industry_avg: "Industry Average",
    profitability: "Profitability",
    trends: "Trends",
    optimization: "Optimization",
    capital_distribution_by_category: "Capital Distribution by Category",
    capital_distribution_description: "How your inventory capital is distributed across categories",
    top_categories_by_value: "Top Categories by Value",
    categories_highest_inventory_value: "Categories with the highest inventory value",
    est_profit: "Est. Profit",
    high_value_products: "High Value Products",
    products_highest_inventory_value: "Products with the highest inventory value",
    unit_price: "Unit Price",
    total_value: "Total Value",
    export_full_list: "Export Full List",
    slow_moving_inventory: "Slow Moving Inventory",
    products_high_stock_low_sales: "Products with high stock but low sales",
    sales_ratio: "Sales Ratio",
    capital_tied: "Capital Tied",
    product_profitability_analysis: "Product Profitability Analysis",
    profit_margin_vs_turnover: "Profit Margin vs. Turnover Rate",
    profit_margin_percent: "Profit Margin (%)",
    turnover_rate: "Turnover Rate",
    most_profitable_products: "Most Profitable Products",
    products_highest_profit_margins: "Products with the highest profit margins",
    highest_turnover_products: "Highest Turnover Products",
    products_sell_most_frequently: "Products that sell most frequently",
    potential_profit: "Potential Profit",
    lowest_turnover_products: "Lowest Turnover Products",
    products_sell_least_frequently: "Products that sell least frequently",
    capital_trends_over_time: "Capital Trends Over Time",
    sales_expenses_profit_trends: "Sales, Expenses, and Profit Trends",
    for_the_period: "For the period",
    inventory_optimization_summary: "Inventory Optimization Summary",
    recommendations_optimize_inventory: "Recommendations to optimize your inventory",
    potential_capital_release: "Potential Capital Release",
    by_reducing_overstock: "By reducing overstock in",
    required_restock_investment: "Required Restock Investment",
    to_maintain_optimal_stock: "To maintain optimal stock levels for",
    net_capital_impact: "Net Capital Impact",
    estimated_impact_working_capital: "Estimated impact on working capital",
    optimization_impact: "Optimization Impact",
    potential_impact_inventory_metrics: "Potential impact on inventory metrics",
    reduce_stock: "Reduce Stock",
    maintain: "Maintain",
    restock_recommendations: "Restock Recommendations",
    products_need_restocking: "Products that need restocking",
    optimal_stock: "Optimal Stock",
    restock_quantity: "Restock Quantity",
    investment_required: "Investment Required",
    reduce_stock_recommendations: "Reduce Stock Recommendations",
    products_excess_inventory: "Products with excess inventory",
    excess_quantity: "Excess Quantity",
    capital_release: "Capital Release",
    refresh_data: "Refresh Data",
    last_3_months: "Last 3 Months",
    last_12_months: "Last 12 Months",
    failed_fetch_capital_analytics: "Failed to fetch capital analytics data",
    failed_fetch_capital_trends: "Failed to fetch capital trends data",
    failed_fetch_product_profitability: "Failed to fetch product profitability data",
    failed_fetch_inventory_optimization: "Failed to fetch inventory optimization data",
    inventory_activity: "Inventory Activity",
    inventory_activity_description: "Track changes to your inventory over time",
    filter_description: "Filter activity records by various criteria",
    search_placeholder: "Search by product name or notes...",
    action_type: "Action Type",
    select_action: "Select action",
    all_actions: "All Actions",
    purchase: "Purchase",
    adjustment: "Adjustment",
    date_range: "Date Range",
    table_view: "Table",
    actions_chart: "Actions",
    products_chart: "Products",
    timeline_chart: "Timeline",
    actions_distribution: "Actions Distribution",
    actions_distribution_description: "Distribution of different types of inventory actions",
    product_activity: "Product Activity",
    product_activity_description: "Activity volume by product",
    activity_timeline: "Activity Timeline",
    activity_timeline_description: "Inventory activity over time",
    no_data_available: "No data available",
    quantity_change: "Quantity Change",
    previous_stock: "Previous Stock",
    new_stock: "New Stock",
    notes: "Notes",
    user: "User",
  },
  es: {
    more_than_days_stock: "más de días de stock",
    alerts: "Alertas",
    dashboard: "Tablero",
    refreshing: "Actualizando",
    loading_data: "Cargando datos",
    inventory_forecasting: "Pronóstico de inventario",
    plan_reorders_prevent_stockouts: "Planificar pedidos para evitar desabastecimientos",
    products: "Productos",
    categories: "Categorías",
    customers: "Usuarios",
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
    analytics: "analítica",
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
    category_deleted_successfully: "La categoría ha sido eliminada exitosamente.",
    failed_to_delete_category: "Error al eliminar la categoría. Por favor, inténtalo de nuevo.",
    category_updated_successfully: "La categoría ha sido actualizada exitosamente.",
    failed_to_update_category: "Error al actualizar la categoría. Por favor, inténtalo de nuevo.",
    existing_categories: "Categorías Existentes",
    delete_category_warning: "Esto eliminará permanentemente la categoría.",
    this_action_cannot_be_undone: "Esta acción no se puede deshacer.",
    edit_category: "Editar Categoría",
    edit_category_description: "Actualiza el nombre de esta categoría.",
    update_category: "Actualizar Categoría",
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
    low_stock_products: "Productos con Bajo Stock",
    items_below_min_stock: "Artículos por Debajo del Stock Mínimo",
    products_below_min_stock: "Productos que están por debajo del nivel mínimo de stock.",
    current_stock: "Stock Actual",
    add_to_cart: "Añadir al Carrito",
    restock: "Reabastecer",
    adjust: "Ajustar",
    no_low_stock_products: "No se encontraron productos con bajo stock.",
    adjust_stock_level: "Ajustar Nivel de Stock",
    update_stock_for: "Actualizar nivel de stock para",
    update_stock_level: "Actualizar nivel de stock",
    stock_updated: "Stock Actualizado",
    stock_has_been_updated: "stock ha sido actualizado a",
    units: "unidades",
    has_been_restocked: "ha sido reabastecido a",
    failed_to_restock_product: "Error al reabastecer el producto",
    failed_to_update_stock: "Error al actualizar el nivel de stock",
    filter_by_category: "Filtrar por Categoría",
    search_products: "Buscar productos...",
    stock_below_min: "El nuevo nivel de stock está por debajo del umbral mínimo.",
    // User management keys
    user_management: "Gestión de Usuarios",
    add_user: "Añadir Usuario",
    add_new_user: "Añadir Nuevo Usuario",
    add_user_description: "Ingresa los detalles del nuevo usuario para añadirlo al sistema.",
    edit_user: "Editar Usuario",
    edit_user_description: "Actualiza los detalles de este usuario.",
    delete_user: "Eliminar Usuario",
    user_added_successfully: "El usuario ha sido añadido exitosamente.",
    user_updated_successfully: "El usuario ha sido actualizado exitosamente.",
    user_deleted_successfully: "El usuario ha sido eliminado exitosamente.",
    failed_to_add_user: "Error al añadir el usuario. Por favor, inténtalo de nuevo.",
    failed_to_update_user: "Error al actualizar el usuario. Por favor, inténtalo de nuevo.",
    failed_to_delete_user: "Error al eliminar el usuario. Por favor, inténtalo de nuevo.",
    failed_to_fetch_profiles: "Error al obtener perfiles.",
    unexpected_error: "Ocurrió un error inesperado.",
    loading_users: "Cargando usuarios...",
    search_users: "Buscar usuarios...",
    registered_users_list: "Una lista de tus usuarios registrados.",
    username: "Nombre de Usuario",
    full_name: "Nombre Completo",
    not_available: "N/D",
    open_menu: "Abrir menú",
    view_profile: "Ver Perfil",
    users: "usuarios",
    no_users_found: "No se encontraron usuarios.",
    unnamed_user: "Usuario Sin Nombre",
    processing: "Procesando...",
    confirm_delete: "Confirmar Eliminación",
    delete_user_confirmation: "¿Estás seguro de que quieres eliminar al usuario",
    role: "Rol",
    select_role: "Seleccionar rol",
    role_cashier: "Cajero",
    role_manager: "Gerente",
    role_admin: "Administrador",
    product: "Producto",
    // Capital Analytics page translations
    capital_analytics: "Análisis de Capital",
    loading_capital_analytics: "Cargando datos de análisis de capital...",
    total_inventory_value: "Valor Total del Inventario",
    estimated_profit: "Beneficio Estimado",
    profit_margin: "Margen de Beneficio",
    inventory_cost: "Costo del Inventario",
    avg_cost_per_product: "Costo Promedio por Producto",
    inventory_turnover: "Rotación de Inventario",
    industry_avg: "Promedio de la Industria",
    profitability: "Rentabilidad",
    trends: "Tendencias",
    optimization: "Optimización",
    capital_distribution_by_category: "Distribución de Capital por Categoría",
    capital_distribution_description: "Cómo se distribuye el capital de inventario entre categorías",
    top_categories_by_value: "Categorías Principales por Valor",
    categories_highest_inventory_value: "Categorías con el valor de inventario más alto",
    est_profit: "Beneficio Est.",
    high_value_products: "Productos de Alto Valor",
    products_highest_inventory_value: "Productos con el valor de inventario más alto",
    unit_price: "Precio Unitario",
    total_value: "Valor Total",
    export_full_list: "Exportar Lista Completa",
    slow_moving_inventory: "Inventario de Movimiento Lento",
    products_high_stock_low_sales: "Productos con alto stock pero bajas ventas",
    sales_ratio: "Ratio de Ventas",
    purchaseOrders: "Órdenes de compra",
    capital_tied: "Capital Inmovilizado",
    product_profitability_analysis: "Análisis de Rentabilidad de Productos",
    profit_margin_vs_turnover: "Margen de Beneficio vs. Tasa de Rotación",
    profit_margin_percent: "Margen de Beneficio (%)",
    turnover_rate: "Tasa de Rotación",
    most_profitable_products: "Productos Más Rentables",
    products_highest_profit_margins: "Productos con los márgenes de beneficio más altos",
    highest_turnover_products: "Productos con Mayor Rotación",
    products_sell_most_frequently: "Productos que se venden con mayor frecuencia",
    potential_profit: "Beneficio Potencial",
    lowest_turnover_products: "Productos con Menor Rotación",
    products_sell_least_frequently: "Productos que se venden con menor frecuencia",
    capital_trends_over_time: "Tendencias de Capital a lo Largo del Tiempo",
    sales_expenses_profit_trends: "Tendencias de Ventas, Gastos y Beneficios",
    for_the_period: "Para el período",
    inventory_optimization_summary: "Resumen de Optimización de Inventario",
    recommendations_optimize_inventory: "Recomendaciones para optimizar tu inventario",
    potential_capital_release: "Liberación Potencial de Capital",
    by_reducing_overstock: "Reduciendo el exceso de stock en",
    required_restock_investment: "Inversión Requerida para Reabastecimiento",
    to_maintain_optimal_stock: "Para mantener niveles óptimos de stock para",
    net_capital_impact: "Impacto Neto de Capital",
    estimated_impact_working_capital: "Impacto estimado en el capital de trabajo",
    optimization_impact: "Impacto de la Optimización",
    potential_impact_inventory_metrics: "Impacto potencial en métricas de inventario",
    reduce_stock: "Reducir Stock",
    maintain: "Mantener",
    restock_recommendations: "Recomendaciones de Reabastecimiento",
    products_need_restocking: "Productos que necesitan reabastecimiento",
    optimal_stock: "Stock Óptimo",
    restock_quantity: "Cantidad de Reabastecimiento",
    investment_required: "Inversión Requerida",
    reduce_stock_recommendations: "Recomendaciones para Reducir Stock",
    products_excess_inventory: "Productos con exceso de inventario",
    excess_quantity: "Cantidad Excedente",
    capital_release: "Liberación de Capital",
    refresh_data: "Actualizar Datos",
    last_3_months: "Últimos 3 Meses",
    last_12_months: "Últimos 12 Meses",
    failed_fetch_capital_analytics: "Error al obtener datos de análisis de capital",
    failed_fetch_capital_trends: "Error al obtener datos de tendencias de capital",
    failed_fetch_product_profitability: "Error al obtener datos de rentabilidad de productos",
    failed_fetch_inventory_optimization: "Error al obtener datos de optimización de inventario",
    inventory_activity: "Actividad de Inventario",
    inventory_activity_description: "Seguimiento de cambios en tu inventario a lo largo del tiempo",
    filter_description: "Filtrar registros de actividad por varios criterios",
    search_placeholder: "Buscar por nombre de producto o notas...",
    action_type: "Tipo de Acción",
    select_action: "Seleccionar acción",
    all_actions: "Todas las Acciones",
    purchase: "Compra",
    adjustment: "Ajuste",
    date_range: "Rango de Fechas",
    table_view: "Tabla",
    actions_chart: "Acciones",
    products_chart: "Productos",
    timeline_chart: "Cronología",
    actions_distribution: "Distribución de Acciones",
    actions_distribution_description: "Distribución de diferentes tipos de acciones de inventario",
    product_activity: "Actividad de Productos",
    product_activity_description: "Volumen de actividad por producto",
    activity_timeline: "Cronología de Actividad",
    activity_timeline_description: "Actividad de inventario a lo largo del tiempo",
    no_data_available: "No hay datos disponibles",
    quantity_change: "Cambio de Cantidad",
    previous_stock: "Stock Anterior",
    new_stock: "Nuevo Stock",
    notes: "Notas",
    user: "Usuario",
  },
  fr: {
    more_than_days_stock: "plus de jours de stock",
    alerts: "Alertes",
    purchaseOrders: "Ordres d'achat",
    dashboard: "Tableau de Bord",
    products: "Produits",
    categories: "Catégories",
    customers: "Utilisateurs",
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
    analytics: "analytique",

    // Expense page translations
    category_deleted_successfully: "La catégorie a été supprimée avec succès.",
    failed_to_delete_category: "Échec de la suppression de la catégorie. Veuillez réessayer.",
    category_updated_successfully: "La catégorie a été mise à jour avec succès.",
    failed_to_update_category: "Échec de la mise à jour de la catégorie. Veuillez réessayer.",
    existing_categories: "Catégories Existantes",
    delete_category_warning: "Cela supprimera définitivement la catégorie.",
    this_action_cannot_be_undone: "Cette action ne peut pas être annulée.",
    edit_category: "Modifier la Catégorie",
    edit_category_description: "Mettre à jour le nom de cette catégorie.",
    update_category: "Mettre à Jour la Catégorie",
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
    low_stock_products: "Produits en Stock Faible",
    items_below_min_stock: "Articles en Dessous du Stock Minimum",
    products_below_min_stock: "Produits qui sont en dessous du niveau de stock minimum.",
    current_stock: "Stock Actuel",
    add_to_cart: "Ajouter au Panier",
    restock: "Réapprovisionner",
    adjust: "Ajuster",
    no_low_stock_products: "Aucun produit en stock faible trouvé.",
    adjust_stock_level: "Ajuster le Niveau de Stock",
    update_stock_for: "Mettre à jour le niveau de stock pour",
    update_stock_level: "Mettre à jour le niveau de stock",
    stock_updated: "Stock Mis à Jour",
    stock_has_been_updated: "stock a été mis à jour à",
    units: "unités",
    has_been_restocked: "a été réapprovisionné à",
    failed_to_restock_product: "Échec du réapprovisionnement du produit",
    failed_to_update_stock: "Échec de la mise à jour du niveau de stock",

    filter_by_category: "Filtrer par Catégorie",
    search_products: "Rechercher des produits...",
    stock_below_min: "Le nouveau niveau de stock est inférieur au seuil minimum.",
    // User management keys
    user_management: "Gestion des Utilisateurs",
    add_user: "Ajouter Utilisateur",
    add_new_user: "Ajouter Nouvel Utilisateur",
    add_user_description: "Entrez les détails du nouvel utilisateur à ajouter au système.",
    edit_user: "Modifier Utilisateur",
    edit_user_description: "Mettre à jour les détails de cet utilisateur.",
    delete_user: "Supprimer Utilisateur",
    user_added_successfully: "L'utilisateur a été ajouté avec succès.",
    user_updated_successfully: "L'utilisateur a été mis à jour avec succès.",
    user_deleted_successfully: "L'utilisateur a été supprimé avec succès.",
    failed_to_add_user: "Échec de l'ajout de l'utilisateur. Veuillez réessayer.",
    failed_to_update_user: "Échec de la mise à jour de l'utilisateur. Veuillez réessayer.",
    failed_to_delete_user: "Échec de la suppression de l'utilisateur. Veuillez réessayer.",
    failed_to_fetch_profiles: "Échec de la récupération des profils.",
    unexpected_error: "Une erreur inattendue s'est produite.",
    loading_users: "Chargement des utilisateurs...",
    search_users: "Rechercher des utilisateurs...",
    registered_users_list: "Une liste de vos utilisateurs enregistrés.",
    username: "Nom d'Utilisateur",
    full_name: "Nom Complet",
    not_available: "N/D",
    open_menu: "Ouvrir le menu",
    view_profile: "Voir le Profil",
    users: "utilisateurs",
    no_users_found: "Aucun utilisateur trouvé.",
    unnamed_user: "Utilisateur Sans Nom",
    processing: "Traitement en cours...",
    confirm_delete: "Confirmer la Suppression",
    delete_user_confirmation: "Êtes-vous sûr de vouloir supprimer l'utilisateur",
    role: "Rôle",
    select_role: "Sélectionner le rôle",
    role_cashier: "Caissier",
    role_manager: "Gérant",
    role_admin: "Administrateur",
    product: "Produit",
    // Capital Analytics page translations
    capital_analytics: "Analyse du Capital",
    loading_capital_analytics: "Chargement des données d'analyse du capital...",
    total_inventory_value: "Valeur Totale de l'Inventaire",
    estimated_profit: "Profit Estimé",
    profit_margin: "Marge Bénéficiaire",
    inventory_cost: "Coût de l'Inventaire",
    avg_cost_per_product: "Coût Moyen par Produit",
    inventory_turnover: "Rotation des Stocks",
    industry_avg: "Moyenne de l'Industrie",
    profitability: "Rentabilité",
    trends: "Tendances",
    optimization: "Optimisation",
    capital_distribution_by_category: "Distribution du Capital par Catégorie",
    capital_distribution_description: "Comment votre capital d'inventaire est distribué entre les catégories",
    top_categories_by_value: "Catégories Principales par Valeur",
    categories_highest_inventory_value: "Catégories avec la plus haute valeur d'inventaire",
    est_profit: "Profit Est.",
    high_value_products: "Produits à Haute Valeur",
    products_highest_inventory_value: "Produits avec la plus haute valeur d'inventaire",
    unit_price: "Prix Unitaire",
    total_value: "Valeur Totale",
    export_full_list: "Exporter la Liste Complète",
    slow_moving_inventory: "Inventaire à Rotation Lente",
    products_high_stock_low_sales: "Produits avec stock élevé mais ventes faibles",
    sales_ratio: "Ratio de Ventes",
    capital_tied: "Capital Immobilisé",
    product_profitability_analysis: "Analyse de Rentabilité des Produits",
    profit_margin_vs_turnover: "Marge Bénéficiaire vs. Taux de Rotation",
    profit_margin_percent: "Marge Bénéficiaire (%)",
    turnover_rate: "Taux de Rotation",
    most_profitable_products: "Produits les Plus Rentables",
    products_highest_profit_margins: "Produits avec les marges bénéficiaires les plus élevées",
    highest_turnover_products: "Produits à Rotation la Plus Élevée",
    products_sell_most_frequently: "Produits qui se vendent le plus fréquemment",
    potential_profit: "Profit Potentiel",
    lowest_turnover_products: "Produits à Rotation la Plus Faible",
    products_sell_least_frequently: "Produits qui se vendent le moins fréquemment",
    capital_trends_over_time: "Tendances du Capital dans le Temps",
    sales_expenses_profit_trends: "Tendances des Ventes, Dépenses et Profits",
    for_the_period: "Pour la période",
    inventory_optimization_summary: "Résumé d'Optimisation de l'Inventaire",
    recommendations_optimize_inventory: "Recommandations pour optimiser votre inventaire",
    potential_capital_release: "Libération Potentielle de Capital",
    by_reducing_overstock: "En réduisant le surstock dans",
    required_restock_investment: "Investissement Requis pour le Réapprovisionnement",
    to_maintain_optimal_stock: "Pour maintenir des niveaux de stock optimaux pour",
    net_capital_impact: "Impact Net sur le Capital",
    estimated_impact_working_capital: "Impact estimé sur le fonds de roulement",
    optimization_impact: "Impact de l'Optimisation",
    potential_impact_inventory_metrics: "Impact potentiel sur les métriques d'inventaire",
    reduce_stock: "Réduire le Stock",
    maintain: "Maintenir",
    restock_recommendations: "Recommandations de Réapprovisionnement",
    products_need_restocking: "Produits nécessitant un réapprovisionnement",
    optimal_stock: "Stock Optimal",
    restock_quantity: "Quantité de Réapprovisionnement",
    investment_required: "Investissement Requis",
    reduce_stock_recommendations: "Recommandations de Réduction de Stock",
    products_excess_inventory: "Produits avec excès d'inventaire",
    excess_quantity: "Quantité Excédentaire",
    capital_release: "Libération de Capital",
    refresh_data: "Actualiser les Données",
    last_3_months: "3 Derniers Mois",
    last_12_months: "12 Derniers Mois",
    failed_fetch_capital_analytics: "Échec de la récupération des données d'analyse du capital",
    failed_fetch_capital_trends: "Échec de la récupération des données de tendances du capital",
    failed_fetch_product_profitability: "Échec de la récupération des données de rentabilité des produits",
    failed_fetch_inventory_optimization: "Échec de la récupération des données d'optimisation de l'inventaire",
    inventory_activity: "Activité d'Inventaire",
    inventory_activity_description: "Suivez les changements de votre inventaire au fil du temps",
    filter_description: "Filtrer les enregistrements d'activité selon divers critères",
    search_placeholder: "Rechercher par nom de produit ou notes...",
    action_type: "Type d'Action",
    select_action: "Sélectionner une action",
    all_actions: "Toutes les Actions",
    purchase: "Achat",
    adjustment: "Ajustement",
    date_range: "Plage de Dates",
    table_view: "Tableau",
    actions_chart: "Actions",
    products_chart: "Produits",
    timeline_chart: "Chronologie",
    actions_distribution: "Distribution des Actions",
    actions_distribution_description: "Distribution des différents types d'actions d'inventaire",
    product_activity: "Activité des Produits",
    product_activity_description: "Volume d'activité par produit",
    activity_timeline: "Chronologie d'Activité",
    activity_timeline_description: "Activité d'inventaire au fil du temps",
    no_data_available: "Aucune donnée disponible",
    quantity_change: "Changement de Quantité",
    previous_stock: "Stock Précédent",
    new_stock: "Nouveau Stock",
    notes: "Notes",
    user: "Utilisateur",
  },
  ar: {
    category_deleted_successfully: "تم حذف الفئة بنجاح.",
    failed_to_delete_category: "فشل في حذف الفئة. حاول مرة أخرى.",
    category_updated_successfully: "تم تحديث الفئة بنجاح.",
    failed_to_update_category: "فشل في تحديث الفئة. حاول مرة أخرى.",
    existing_categories: "الفئات الموجودة",
    delete_category_warning: "سيتم حذف الفئة نهائيًا.",
    this_action_cannot_be_undone: "لا يمكن التراجع عن هذا الإجراء.",
    edit_category: "تعديل الفئة",
    edit_category_description: "قم بتحديث اسم هذه الفئة.",
    update_category: "تحديث الفئة",
    alerts: "التنبيهات",
    dashboard: "لوحة التحكم",
    products: "المنتجات",
    categories: "الفئات",
    customers: "المستخدمين",
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
    low_stock_products: "المنتجات ذات المخزون المنخفض",
    items_below_min_stock: "العناصر أقل من الحد الأدنى للمخزون",
    products_below_min_stock: "المنتجات التي هي أقل من مستوى المخزون الأدنى.",
    current_stock: "المخزون الحالي",
    add_to_cart: "أضف إلى السلة",
    restock: "إعادة تخزين",
    adjust: "تعديل",
    no_low_stock_products: "لم يتم العثور على منتجات ذات مخزون منخفض.",
    adjust_stock_level: "تعديل مستوى المخزون",
    update_stock_for: "تحديث مستوى المخزون لـ",
    update_stock_level: "تحديث مستوى المخزون",
    stock_updated: "تم تحديث المخزون",
    stock_has_been_updated: "تم تحديث المخزون إلى",
    units: "وحدات",
    has_been_restocked: "تمت إعادة تخزينه إلى",
    failed_to_restock_product: "فشل في إعادة تخزين المنتج",
    failed_to_update_stock: "فشل في تحديث مستوى المخزون",
    filter_by_category: "تصفية حسب الفئة",
    search_products: "البحث عن المنتجات...",
    stock_below_min: "مستوى المخزون الجديد أقل من الحد الأدنى للمخزون.",
    // User management keys
    user_management: "إدارة المستخدمين",
    add_user: "إضافة مستخدم",
    add_new_user: "إضافة مستخدم جديد",
    add_user_description: "أدخل تفاصيل المستخدم الجديد لإضافته إلى النظام.",
    edit_user: "تعديل المستخدم",
    edit_user_description: "قم بتحديث تفاصيل هذا المستخدم.",
    delete_user: "حذف المستخدم",
    user_added_successfully: "تمت إضافة المستخدم بنجاح.",
    user_updated_successfully: "تم تحديث المستخدم بنجاح.",
    user_deleted_successfully: "تم حذف المستخدم بنجاح.",
    failed_to_add_user: "فشل في إضافة المستخدم. حاول مرة أخرى.",
    failed_to_update_user: "فشل في تحديث المستخدم. حاول مرة أخرى.",
    failed_to_delete_user: "فشل في حذف المستخدم. حاول مرة أخرى.",
    failed_to_fetch_profiles: "فشل في جلب الملفات الشخصية.",
    unexpected_error: "حدث خطأ غير متوقع.",
    loading_users: "جاري تحميل المستخدمين...",
    search_users: "البحث عن المستخدمين...",
    registered_users_list: "قائمة المستخدمين المسجلين لديك.",
    username: "اسم المستخدم",
    full_name: "الاسم الكامل",
    not_available: "غير متوفر",
    open_menu: "فتح القائمة",
    view_profile: "عرض الملف الشخصي",
    users: "مستخدمين",
    no_users_found: "لم يتم العثور على مستخدمين.",
    unnamed_user: "مستخدم بدون اسم",
    processing: "جاري المعالجة...",
    confirm_delete: "تأكيد الحذف",
    delete_user_confirmation: "هل أنت متأكد أنك تريد حذف المستخدم",
    role: "الدور",
    select_role: "اختر الدور",
    role_cashier: "أمين الصندوق",
    role_manager: "مدير",
    role_admin: "مسؤول",
    product: "المنتج",
    // Capital Analytics page translations
    capital_analytics: "تحليلات رأس المال",
    loading_capital_analytics: "جاري تحميل بيانات تحليلات رأس المال...",
    total_inventory_value: "إجمالي قيمة المخزون",
    estimated_profit: "الربح المقدر",
    profit_margin: "هامش الربح",
    inventory_cost: "تكلفة المخزون",
    avg_cost_per_product: "متوسط تكلفة المنتج",
    inventory_turnover: "معدل دوران المخزون",
    industry_avg: "متوسط الصناعة",
    profitability: "الربحية",
    trends: "الاتجاهات",
    optimization: "التحسين",
    capital_distribution_by_category: "توزيع رأس المال حسب الفئة",
    capital_distribution_description: "كيفية توزيع رأس مال المخزون عبر الفئات",
    top_categories_by_value: "أعلى الفئات من حيث القيمة",
    categories_highest_inventory_value: "الفئات ذات أعلى قيمة مخزون",
    est_profit: "الربح المقدر",
    high_value_products: "المنتجات ذات القيمة العالية",
    products_highest_inventory_value: "المنتجات ذات أعلى قيمة مخزون",
    unit_price: "سعر الوحدة",
    total_value: "القيمة الإجمالية",
    export_full_list: "تصدير القائمة الكاملة",
    slow_moving_inventory: "المخزون بطيء الحركة",
    products_high_stock_low_sales: "المنتجات ذات المخزون العالي والمبيعات المنخفضة",
    sales_ratio: "نسبة المبيعات",
    capital_tied: "رأس المال المقيد",
    product_profitability_analysis: "تحليل ربحية المنتج",
    profit_margin_vs_turnover: "هامش الربح مقابل معدل الدوران",
    profit_margin_percent: "هامش الربح (%)",
    turnover_rate: "معدل الدوران",
    most_profitable_products: "المنتجات الأكثر ربحية",
    products_highest_profit_margins: "المنتجات ذات أعلى هوامش ربح",
    highest_turnover_products: "المنتجات ذات أعلى معدل دوران",
    products_sell_most_frequently: "المنتجات التي تباع بشكل متكرر",
    potential_profit: "الربح المحتمل",
    lowest_turnover_products: "المنتجات ذات أدنى معدل دوران",
    products_sell_least_frequently: "المنتجات التي تباع بشكل أقل تكرارًا",
    capital_trends_over_time: "اتجاهات رأس المال عبر الزمن",
    sales_expenses_profit_trends: "اتجاهات المبيعات والمصروفات والأرباح",
    for_the_period: "للفترة",
    inventory_optimization_summary: "ملخص تحسين المخزون",
    recommendations_optimize_inventory: "توصيات لتحسين المخزون",
    potential_capital_release: "إطلاق رأس المال المحتمل",
    by_reducing_overstock: "عن طريق تقليل فائض المخزون في",
    required_restock_investment: "الاستثمار المطلوب لإعادة التخزين",
    to_maintain_optimal_stock: "للحفاظ على المستويات المثلى للمخزون لـ",
    net_capital_impact: "تأثير صافي رأس المال",
    estimated_impact_working_capital: "التأثير المقدر على رأس المال العامل",
    optimization_impact: "تأثير التحسين",
    potential_impact_inventory_metrics: "التأثير المحتمل على مقاييس المخزون",
    reduce_stock: "تقليل المخزون",
    maintain: "الحفاظ",
    restock_recommendations: "توصيات إعادة التخزين",
    products_need_restocking: "المنتجات التي تحتاج إلى إعادة تخزين",
    optimal_stock: "المخزون الأمثل",
    restock_quantity: "كمية إعادة التخزين",
    investment_required: "الاستثمار المطلوب",
    reduce_stock_recommendations: "توصيات تقليل المخزون",
    products_excess_inventory: "المنتجات ذات المخزون الزائد",
    excess_quantity: "الكمية الزائدة",
    capital_release: "إطلاق رأس المال",
    refresh_data: "تحديث البيانات",
    last_3_months: "آخر 3 أشهر",
    last_12_months: "آخر 12 شهرًا",
    failed_fetch_capital_analytics: "فشل في جلب بيانات تحليلات رأس المال",
    failed_fetch_capital_trends: "فشل في جلب بيانات اتجاهات رأس المال",
    failed_fetch_product_profitability: "فشل في جلب بيانات ربحية المنتج",
    failed_fetch_inventory_optimization: "فشل في جلب بيانات تحسين المخزون",
    inventory_activity: "نشاط المخزون",
    inventory_activity_description: "تتبع التغييرات في المخزون الخاص بك على مر الزمن",
    filter_description: "تصفية سجلات النشاط حسب معايير مختلفة",
    search_placeholder: "البحث حسب اسم المنتج أو الملاحظات...",
    action_type: "نوع الإجراء",
    select_action: "اختر الإجراء",
    all_actions: "جميع الإجراءات",
    purchase: "شراء",
    adjustment: "تعديل",
    date_range: "نطاق التاريخ",
    table_view: "جدول",
    actions_chart: "الإجراءات",
    products_chart: "المنتجات",
    timeline_chart: "الجدول الزمني",
    actions_distribution: "توزيع الإجراءات",
    actions_distribution_description: "توزيع أنواع مختلفة من إجراءات المخزون",
    product_activity: "نشاط المنتج",
    product_activity_description: "حجم النشاط حسب المنتج",
    activity_timeline: "الجدول الزمني للنشاط",
    activity_timeline_description: "نشاط المخزون على مر الزمن",
    no_data_available: "لا توجد بيانات متاحة",
    quantity_change: "تغيير الكمية",
    previous_stock: "المخزون السابق",
    new_stock: "المخزون الجديد",
    notes: "ملاحظات",
    user: "المستخدم",
    more_than_days_stock: "المخزون لأكثر من أيام",
    less_than_days_stock: "المخزون لأقل من أيام",
    "page_title.home": "الرئيسية",
    "page_title.settings": "الإعدادات",
    "page_title.products": "المنتجات",
    "page_title.customers": "العملاء",
    "page_title.orders": "الطلبات",
    "page_title.login": "تسجيل الدخول",
    "page_title.logout": "تسجيل الخروج",
    "page_title.register": "إنشاء حساب",
    "page_title.forgot_password": "نسيت كلمة المرور",
    "page_title.reset_password": "إعادة تعيين كلمة المرور",
    "page_title.verify_email": "تأكيد البريد الإلكتروني",
    "page_title.profile": "الملف الشخصي",
    "page_title.edit_profile": "تعديل الملف الشخصي",
    "page_title.change_password": "تغيير كلمة المرور",
    "page_title.users": "المستخدمون",
    "page_title.roles": "الأدوار",
    "page_title.permissions": "الصلاحيات",
    "page_title.audit_logs": "سجلات التدقيق",
    "page_title.notifications": "الإشعارات",
    "page_title.announcements": "الإعلانات",
    "page_title.support": "الدعم",
    "page_title.contact_us": "اتصل بنا",
    "page_title.terms_of_service": "شروط الخدمة",
    "page_title.privacy_policy": "سياسة الخصوصية",
    "page_title.faq": "الأسئلة الشائعة",
    "page_title.blog": "المدونة",
    "page_title.pricing": "الأسعار",
    "page_title.features": "المزايا",
    "page_title.integrations": "التكاملات",
    "page_title.api": "واجهة برمجة التطبيقات",
    "page_title.documentation": "التوثيق",
    "page_title.status": "الحالة",
    "page_title.maintenance": "الصيانة",
    "page_title.coming_soon": "قريبًا",
    "page_title.not_found": "غير موجود",
    "page_title.unauthorized": "غير مصرح به",
    "page_title.forbidden": "ممنوع",
    "page_title.server_error": "خطأ في الخادم",
    "page_title.bad_request": "طلب غير صالح",
    "page_title.payment_required": "يتطلب الدفع",
    "page_title.conflict": "تعارض",
    "page_title.gone": "غير متوفر",
    "page_title.too_many_requests": "طلبات كثيرة جدًا",
    "page_title.internal_server_error": "خطأ داخلي في الخادم",
    "page_title.service_unavailable": "الخدمة غير متاحة",
    "page_title.gateway_timeout": "انتهت مهلة البوابة",
    "page_title.network_authentication_required": "مطلوب مصادقة الشبكة",

    // Inventory Forecasting
    inventory_forecasting: "توقعات المخزون",
    plan_reorders_prevent_stockouts: "تخطيط إعادة الطلب لتجنب نفاد المخزون",
    lead_time_settings: "إعدادات وقت التسليم",
    configure_supplier_lead_time: "تكوين وقت التسليم للمورد",
    average_supplier_lead_time: "متوسط وقت التسليم للمورد",
    supplier_lead_time_description: "وصف وقت التسليم للمورد",
    safety_stock: "المخزون الاحتياطي",
    buffer_inventory_percentage: "نسبة المخزون الاحتياطي",
    safety_stock_percentage: "نسبة المخزون الاحتياطي",
    safety_stock_description: "وصف المخزون الاحتياطي",
    forecast_range: "نطاق التوقع",
    days_project_future: "عدد الأيام المتوقعة في المستقبل",
    forecast_days: "أيام التوقع",
    select_days: "حدد الأيام",
    forecast_range_description: "وصف نطاق التوقع",
    inventory_forecast: "توقع المخزون",
    products_need_attention: "المنتجات التي تحتاج إلى انتباه",
   
    sort_by: "فرز حسب",
   
    daily_sales: "المبيعات اليومية",
    days_until_stockout: "الأيام حتى نفاد المخزون",
    reorder_quantity: "كمية إعادة الطلب",
    all_products: "جميع المنتجات",
    critical: "حرج",
    
    reorder_now: "إعادة الطلب الآن",
    reset_filters: "إعادة تعيين الفلاتر",
    showing_products: "عرض المنتجات",
    forecast_details: "تفاصيل التوقع",
    projected_inventory_for: "المخزون المتوقع لـ",
    select_product_view_forecast: "حدد منتجًا لعرض التوقع",
    click_product_view_forecast: "انقر على المنتج لعرض التوقع",
    reorder_recommendation: "توصية بإعادة الطلب",
    based_on_avg_sales: "استنادًا إلى متوسط المبيعات",
    purchaseOrders: "أوامر الشراء",
    
    lead_time_of: "وقت التسليم لـ",
    you_should_order: "يجب أن تطلب",
    units_now: "وحدات الآن",
    create_purchase_order: "إنشاء طلب شراء",
    no_immediate_reorder: "لا حاجة لإعادة الطلب حاليًا",
    sufficient_stock: "مخزون كافٍ",
    inventory_health_overview: "نظرة عامة على صحة المخزون",
    summary_inventory_status: "ملخص حالة المخزون",
    number_of_products: "عدد المنتجات",
    healthy: "جيد",
    no_sales: "بدون مبيعات",
    
    days_of_stock: "أيام المخزون",
    
    no_recent_sales_activity: "لا يوجد نشاط مبيعات حديث",
    order_from_supplier: "طلب من المورد",
    order_product_from_supplier: "طلب منتج من المورد",
    
    order_created: "تم إنشاء الطلب",
    total_items: "إجمالي العناصر",
    analytics: "تحليلات",
    creating: "جارٍ الإنشاء",
    create_order: "إنشاء طلب",
    export_report: "تصدير التقرير",
    purchase_order_created: "تم إنشاء طلب الشراء",
    order_created_successfully: "تم إنشاء الطلب بنجاح",
    view_all_orders: "عرض جميع الطلبات",
    failed_create_purchase_order: "فشل إنشاء طلب الشراء",
    failed_load_forecasting_data: "فشل تحميل بيانات التوقعات",
    order: "طلب",
    details: "التفاصيل",
    days: "أيام",
    product_name: "اسم المنتج",
    avg_daily_sales: "متوسط المبيعات اليومية",
    reorder_qty: "كمية إعادة الطلب",
    projected_stock: "المخزون المتوقع",
    sammury: "ملخص",
    Analyses: "تحليلات",
    ActivityReports: "تقارير النشاط",
    forecasting: "التنبؤ",
    
    
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

