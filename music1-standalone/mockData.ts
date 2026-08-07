export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  qty: number;
  costPrice: number;
  sellPrice: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  initialQty?: number;
  reorderSalePercent?: number;
}

export const initialProducts: Product[] = [
  { id: 'P001', code: 'SKU-TSH-01', name: 'Classic Summer T-Shirt', category: 'T-Shirts', qty: 45, costPrice: 12.00, sellPrice: 24.99, status: 'In Stock' },
  { id: 'P002', code: 'SKU-DRS-02', name: 'Elegant Evening Dress', category: 'Dresses', qty: 12, costPrice: 45.00, sellPrice: 99.99, status: 'Low Stock' },
  { id: 'P003', code: 'SKU-PAN-03', name: 'Slim Fit Denim Jeans', category: 'Jeans', qty: 85, costPrice: 18.00, sellPrice: 49.99, status: 'In Stock' },
  { id: 'P004', code: 'SKU-SHO-04', name: 'Leather Casual Sneakers', category: 'Footwear', qty: 25, costPrice: 30.00, sellPrice: 79.99, status: 'In Stock' },
  { id: 'P005', code: 'SKU-HOD-05', name: 'Oversized Cotton Hoodie', category: 'Hoodies', qty: 0, costPrice: 15.00, sellPrice: 39.99, status: 'Out of Stock' },
  { id: 'P006', code: 'SKU-JAC-06', name: 'Waterproof Winter Jacket', category: 'Outerwear', qty: 8, costPrice: 50.00, sellPrice: 129.99, status: 'Low Stock' },
];

export const initialCompositeItems: any[] = [
  {
    id: 'C001',
    name: 'عرض الصيف المتكامل',
    code: 'OFFER-CMP-01',
    barcode: '622000000001',
    sellPrice: 110,
    costPrice: 35,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P002',
              'qty': 1
        },
        {
              'productId': 'P004',
              'qty': 1
        }
  ]
  },
  {
    id: 'C002',
    name: 'طقم الشتاء الفاخر',
    code: 'OFFER-CMP-02',
    barcode: '622000000002',
    sellPrice: 120,
    costPrice: 40,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P005',
              'qty': 1
        },
        {
              'productId': 'P006',
              'qty': 1
        }
  ]
  },
  {
    id: 'C003',
    name: 'عرض الربيع المنعش',
    code: 'OFFER-CMP-03',
    barcode: '622000000003',
    sellPrice: 130,
    costPrice: 45,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P001',
              'qty': 1
        },
        {
              'productId': 'P002',
              'qty': 1
        },
        {
              'productId': 'P003',
              'qty': 1
        }
  ]
  },
  {
    id: 'C004',
    name: 'مجموعة الخريف الدافئة',
    code: 'OFFER-CMP-04',
    barcode: '622000000004',
    sellPrice: 140,
    costPrice: 50,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P004',
              'qty': 2
        }
  ]
  },
  {
    id: 'C005',
    name: 'عرض العائلة التوفيري',
    code: 'OFFER-CMP-05',
    barcode: '622000000005',
    sellPrice: 150,
    costPrice: 55,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P003',
              'qty': 3
        },
        {
              'productId': 'P006',
              'qty': 2
        }
  ]
  },
  {
    id: 'C006',
    name: 'مجموعة الكاجوال العصرية',
    code: 'OFFER-CMP-06',
    barcode: '622000000006',
    sellPrice: 160,
    costPrice: 60,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P001',
              'qty': 2
        },
        {
              'productId': 'P003',
              'qty': 1
        }
  ]
  },
  {
    id: 'C007',
    name: 'باقة الأناقة الكلاسيكية',
    code: 'OFFER-CMP-07',
    barcode: '622000000007',
    sellPrice: 170,
    costPrice: 65,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P002',
              'qty': 1
        },
        {
              'productId': 'P004',
              'qty': 1
        }
  ]
  },
  {
    id: 'C008',
    name: 'عرض الرياضة المتكامل',
    code: 'OFFER-CMP-08',
    barcode: '622000000008',
    sellPrice: 180,
    costPrice: 70,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P005',
              'qty': 1
        },
        {
              'productId': 'P006',
              'qty': 1
        }
  ]
  },
  {
    id: 'C009',
    name: 'طقم العمل الرسمي',
    code: 'OFFER-CMP-09',
    barcode: '622000000009',
    sellPrice: 190,
    costPrice: 75,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P001',
              'qty': 1
        },
        {
              'productId': 'P002',
              'qty': 1
        },
        {
              'productId': 'P003',
              'qty': 1
        }
  ]
  },
  {
    id: 'C010',
    name: 'باقة الراحة المنزلية',
    code: 'OFFER-CMP-10',
    barcode: '622000000010',
    sellPrice: 200,
    costPrice: 80,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P004',
              'qty': 2
        }
  ]
  },
  {
    id: 'C011',
    name: 'مجموعة السفر خفيفة الوزن',
    code: 'OFFER-CMP-11',
    barcode: '622000000011',
    sellPrice: 210,
    costPrice: 85,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P003',
              'qty': 3
        },
        {
              'productId': 'P006',
              'qty': 2
        }
  ]
  },
  {
    id: 'C012',
    name: 'عرض التميز والإبداع',
    code: 'OFFER-CMP-12',
    barcode: '622000000012',
    sellPrice: 220,
    costPrice: 90,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P001',
              'qty': 2
        },
        {
              'productId': 'P003',
              'qty': 1
        }
  ]
  },
  {
    id: 'C013',
    name: 'باقة التوفير الكبرى',
    code: 'OFFER-CMP-13',
    barcode: '622000000013',
    sellPrice: 230,
    costPrice: 95,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P002',
              'qty': 1
        },
        {
              'productId': 'P004',
              'qty': 1
        }
  ]
  },
  {
    id: 'C014',
    name: 'مجموعة الهدايا القيمة',
    code: 'OFFER-CMP-14',
    barcode: '622000000014',
    sellPrice: 240,
    costPrice: 100,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P005',
              'qty': 1
        },
        {
              'productId': 'P006',
              'qty': 1
        }
  ]
  },
  {
    id: 'C015',
    name: 'طقم الخروج اليومي',
    code: 'OFFER-CMP-15',
    barcode: '622000000015',
    sellPrice: 250,
    costPrice: 105,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P001',
              'qty': 1
        },
        {
              'productId': 'P002',
              'qty': 1
        },
        {
              'productId': 'P003',
              'qty': 1
        }
  ]
  },
  {
    id: 'C016',
    name: 'باقة الشباب العصرية',
    code: 'OFFER-CMP-16',
    barcode: '622000000016',
    sellPrice: 260,
    costPrice: 110,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P004',
              'qty': 2
        }
  ]
  },
  {
    id: 'C017',
    name: 'عرض المناسبات الخاصة',
    code: 'OFFER-CMP-17',
    barcode: '622000000017',
    sellPrice: 270,
    costPrice: 115,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P003',
              'qty': 3
        },
        {
              'productId': 'P006',
              'qty': 2
        }
  ]
  },
  {
    id: 'C018',
    name: 'مجموعة الكلاسيكيات الأساسية',
    code: 'OFFER-CMP-18',
    barcode: '622000000018',
    sellPrice: 280,
    costPrice: 120,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P001',
              'qty': 2
        },
        {
              'productId': 'P003',
              'qty': 1
        }
  ]
  },
  {
    id: 'C019',
    name: 'باقة الاسترخاء والراحة',
    code: 'OFFER-CMP-19',
    barcode: '622000000019',
    sellPrice: 290,
    costPrice: 125,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P002',
              'qty': 1
        },
        {
              'productId': 'P004',
              'qty': 1
        }
  ]
  },
  {
    id: 'C020',
    name: 'عرض الأناقة المتكاملة',
    code: 'OFFER-CMP-20',
    barcode: '622000000020',
    sellPrice: 300,
    costPrice: 130,
    groupId: 'GRP4',
    components: [
        {
              'productId': 'P005',
              'qty': 1
        },
        {
              'productId': 'P006',
              'qty': 1
        }
  ]
  }
];

export const initialBundledItems: any[] = [
  {
    id: 'B001',
    name: 'مجموعة مجمعة 1',
    code: 'BNDL-001',
    barcode: '633000000001',
    sellPrice: 300,
    costPrice: 100,
    groupId: 'GRP1',
    components: [
      { productId: 'P002', qty: 1 },
      { productId: 'P004', qty: 1 }
    ]
  }
];

export const translations = {
  en: {
    dashboard: "Dashboard",
    home: "Home",
    inventory: "Product Management",
    sales: "Sales",
    purchases: "Purchases",
    employees: "Employees",
    accounts: "Accounts",
    reports: "Reports",
    settings: "Settings",
    totalSales: "Total Sales",
    orders: "Orders",
    products: "Products",
    activeCustomers: "Active Customers",
    quickActions: "Quick Actions",
    mostUsed: "Most commonly used actions",
    addNewProduct: "Add New Product",
    addProductDesc: "Add a product to inventory",
    newSale: "New Sale",
    createSaleDesc: "Create a new sales invoice",
    addCustomer: "Add Customer",
    newCustomerDesc: "Add a new customer",
    start: "Start",
    recentActivity: "Recent Activity",
    salesThisMonth: "Sales This Month",
    fromLastMonth: "from last month",
    sinceLastHour: "since last hour",
    adminUser: "Admin User",
    emptySearch: "No items found",
    search: "Search...",
    // Form fields & lists
    productName: "Product Name",
    category: "Category",
    qty: "Stock Quantity",
    costPrice: "Cost Price ($)",
    sellPrice: "Selling Price ($)",
    sku: "SKU / Code",
    save: "Save",
    cancel: "Cancel",
    customerName: "Customer Name",
    phone: "Phone Number",
    email: "Email Address",
    address: "Location Address",
    selectProduct: "Select Product",
    price: "Price",
    total: "Total",
    items: "Items",
    add: "Add",
    pay: "Complete Sale",
    cash: "Cash",
    card: "Card",
    payment: "Payment Method",
    // Table components
    action: "Action",
    status: "Status",
    addSuccess: "Successfully Saved!",
    productCode: "Product Code",
    stock: "Stock",
    allCategories: "All Categories",
    allStat: "Overall",
    invoiceNo: "Invoice No",
    date: "Date",
    totalAmount: "Total Amount ($)",
    paymentMethod: "Payment Method",
    // Additional views
    homeWelcome: "Welcome to Ma7aly Retail ERP",
    homeMessage: "Manage retail sales invoices, items inventory, employee timetables, and analytical reports in real-time.",
    dailyGoals: "Daily Target Progress",
    systemStatus: "System Pulse",
    purchasesTitle: "Supplier Purchases Ledger",
    purchaseDesc: "Track supplier orders, raw material costs, and incoming warehouse shipments.",
    addPurchase: "New Purchase Order",
    supplierName: "Supplier Name",
    purchaseCost: "Total Order Cost ($)",
    employeesTitle: "Employee Directory & Shift Management",
    employeePerformance: "Performance Score",
    clockAction: "Toggle Attendance",
    accountsTitle: "Business Accounts & Corporate Treasury",
    treasuryCash: "Treasury Cash Box",
    bankBalance: "Corporate Bank Account",
    dailyExpenses: "Operating Expenses (Today)",
    addExpense: "Log Operating Expense",
    expenseName: "Expense Description",
    expenseAmount: "Expense Amount ($)",
    reportsTitle: "Real-time Operations Analytics",
    categoriesShare: "Inventory Level Share By Category",
    topProducts: "Best Performing Products",
    profitEstimated: "Estimated Profit Report ($)",
    currency: "$",
    invoiceDetails: "Detailed Invoice Receipt",
    close: "Close Window"
  },
  ar: {
    dashboard: "لوحة التحكم",
    home: "الرئيسية",
    inventory: "إدارة المنتجات",
    sales: "المبيعات",
    purchases: "المشتريات",
    employees: "الموظفين",
    accounts: "الحسابات",
    reports: "التقارير",
    settings: "الإعدادات",
    totalSales: "إجمالي المبيعات",
    orders: "الطلبات",
    products: "المنتجات بالمخزن",
    activeCustomers: "العملاء النشطين",
    quickActions: "إجراءات سريعة",
    mostUsed: "العمليات الأكثر استخدامًا حاليًا بالسيستم",
    addNewProduct: "إضافة منتج",
    addProductDesc: "إضافة منتج جديد وتعبئة رصيد مخزونه",
    newSale: "فاتورة بيع",
    createSaleDesc: "إنشاء فاتورة مبيعات جديدة لعميل",
    addCustomer: "تسجيل عميل",
    newCustomerDesc: "إضافة عميل جديد بقاعدة البيانات",
    start: "ابدأ الآن",
    recentActivity: "أحدث العمليات بالسيستم",
    salesThisMonth: "مبيعات الشهر الحالي",
    fromLastMonth: "مقارنة بالشهر الماضي",
    sinceLastHour: "منذ الساعة الماضية",
    adminUser: "المشرف العام",
    emptySearch: "لا توجد أية نتائج للبحث",
    search: "بحث وسحب بيانات...",
    // Form fields & lists
    productName: "اسم المنتج",
    category: "الفئة / القسم",
    qty: "الكمية المتاحة",
    costPrice: "سعر التكلفة ($)",
    sellPrice: "سعر البيع للجمهور ($)",
    sku: "باركود المنتج / SKU",
    save: "حفظ البيانات",
    cancel: "إلغاء الأمر",
    customerName: "اسم العميل",
    phone: "رقم الجوال",
    email: "البريد الإلكتروني",
    address: "العنوان الحالي",
    selectProduct: "اختر المنتج من القائمة",
    price: "السعر",
    total: "الإجمالي",
    items: "المنتجات المدرجة",
    add: "إضافة",
    pay: "إتمام واعتماد الفاتورة",
    cash: "كاش / نقدي",
    card: "بطاقة دفع فيزا/ماستر",
    payment: "طريقة الدفع",
    // Table components
    action: "الإجراء الحالي",
    status: "حالة العنصر",
    addSuccess: "تم حفظ البيانات بنجاح!",
    productCode: "كود المنتج",
    stock: "الرصيد",
    allCategories: "جميع الفئات والرتب",
    allStat: "الإجمالي العام",
    invoiceNo: "رقم الفاتورة",
    date: "تاريخ العملية",
    totalAmount: "القيمة الإجمالية ($)",
    paymentMethod: "وسيلة السداد",
    // Additional views
    homeWelcome: "مرحباً بك في نظام محلي لإدارة التجزئة",
    homeMessage: "التحكم الكامل ومتابعة فواتيرك، مستويات مخزونك، ورديات الموظفين، والتقارير الحسابية في شاشة واحدة متكاملة.",
    dailyGoals: "تقدم الهدف اليومي للمبيعات",
    systemStatus: "نبض واستقرار خوادم النظام",
    purchasesTitle: "سجل فواتير المشتريات من الموردين",
    purchaseDesc: "متابعة طلبات التوريد، تكلفة الخامات، والمخزونات الواردة إلى شاحنات المخازن.",
    addPurchase: "أمر توريد جديد",
    supplierName: "اسم الشركة الموردة",
    purchaseCost: "تكلفة الشحنة الإجمالية ($)",
    employeesTitle: "دليل الموظفين وإثبات الحضور والوردية",
    employeePerformance: "معدل الإنجاز والنشاط",
    clockAction: "تسجيل حضور / انصراف",
    accountsTitle: "شؤون الحسابات وخزينة المنشأة",
    treasuryCash: "رصيد الخزينة الفرعية (كاش)",
    bankBalance: "الحساب البنكي للشركة (Visa)",
    dailyExpenses: "المصاريف التشغيلية (اليوم)",
    addExpense: "تسجيل مصاريف تشغيلية",
    expenseName: "بيان المصروف بالتفصيل",
    expenseAmount: "قيمة المصروف ($)",
    reportsTitle: "تقارير وتحليلات العمليات التفاعلية",
    categoriesShare: "مستوى توزع البضاعة حسب الفئة",
    topProducts: "المنتجات الأكثر مبيعاً وتحقيقاً للربح",
    profitEstimated: "التقرير التقديري للأرباح الصافية ($)",
    currency: "دولار",
    invoiceDetails: "تفاصيل فاتورة البيع والعميل",
    close: "إغلاق النافذة"
  }
};
