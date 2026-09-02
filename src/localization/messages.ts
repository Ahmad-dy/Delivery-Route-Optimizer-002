export type Locale = 'ar' | 'en';

export interface Messages {
  common: {
    appName: string;
    appSubtitle: string;
    loading: string;
    saving: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    actions: string;
    status: string;
    active: string;
    inactive: string;
    confirmDelete: string;
    retry: string;
    noData: string;
    success: string;
    error: string;
    kg: string;
    km: string;
    minutes: string;
    hours: string;
  };
  navigation: {
    dashboard: string;
    import: string;
    routing: string;
    optimization: string;
    buyers: string;
    drivers: string;
    settings: string;
    logout: string;
    login: string;
    userProfile: string;
  };
  auth: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    signIn: string;
    signInWithGoogle: string;
    signOut: string;
    guestMode: string;
    authenticatedAs: string;
    roleDispatcher: string;
  };
  buyers: {
    title: string;
    subtitle: string;
    addNew: string;
    editBuyer: string;
    buyerCode: string;
    buyerName: string;
    latitude: string;
    longitude: string;
    emptyList: string;
    emptyListSub: string;
    deleteConfirm: string;
    addedSuccess: string;
    updatedSuccess: string;
    deletedSuccess: string;
  };
  drivers: {
    title: string;
    subtitle: string;
    addNew: string;
    editDriver: string;
    driverId: string;
    driverName: string;
    nominalCapacity: string;
    maxAllowedCapacity: string;
    capacityNotice: string;
    statusActive: string;
    statusInactive: string;
    emptyList: string;
    emptyListSub: string;
    deleteConfirm: string;
    addedSuccess: string;
    updatedSuccess: string;
    deletedSuccess: string;
  };
  settings: {
    title: string;
    subtitle: string;
    depotTitle: string;
    depotSubtitle: string;
    depotName: string;
    depotLatitude: string;
    depotLongitude: string;
    depotAddress: string;
    optimizationTitle: string;
    optimizationSubtitle: string;
    distanceWeight: string;
    loadBalanceWeight: string;
    capacityTolerance: string;
    savedSuccess: string;
  };
  dashboard: {
    title: string;
    welcome: string;
    stage2NoticeTitle: string;
    stage2NoticeBody: string;
    quickStats: {
      registeredBuyers: string;
      activeDrivers: string;
      fleetNominalCapacity: string;
      fleetMaxCapacity: string;
    };
  };
  import: {
    title: string;
    subtitle: string;
    dropzoneTitle: string;
    dropzoneSubtitle: string;
    dropzoneActive: string;
    selectFile: string;
    processing: string;
    fileInfo: string;
    fileName: string;
    fileSize: string;
    rowCount: string;
    summaryTitle: string;
    totalLists: string;
    validLists: string;
    invalidRows: string;
    uniqueBuyers: string;
    totalWeight: string;
    oversizedStops: string;
    missingBuyers: string;
    nameMismatches: string;
    maxActiveDriverCapacity: string;
    tabs: {
      lists: string;
      stops: string;
      errors: string;
      warnings: string;
    };
    listsTable: {
      rowNum: string;
      listNumber: string;
      buyerCode: string;
      excelBuyerName: string;
      masterBuyerName: string;
      weight: string;
      status: string;
      notes: string;
    };
    stopsTable: {
      stopId: string;
      buyerCode: string;
      buyerName: string;
      listCount: string;
      listsIncluded: string;
      totalWeight: string;
      gpsStatus: string;
      capacityStatus: string;
    };
    actions: {
      confirmImport: string;
      cancelImport: string;
      reimport: string;
      reimportConfirm: string;
      clearSession: string;
    };
    emptyStates: {
      noFile: string;
      noData: string;
      noErrors: string;
      noWarnings: string;
    };
    alerts: {
      oversizedAlert: string;
      blockingErrorNotice: string;
      readyToConfirm: string;
      sessionConfirmed: string;
      reimportWarning: string;
    };
  };
  routing: {
    title: string;
    subtitle: string;
    calculating: string;
    calculatingSubtitle: string;
    progressText: string;
    depotHub: string;
    stopsCount: string;
    totalConnections: string;
    calculateMatrix: string;
    recalculate: string;
    matrixView: string;
    diagnosticsTitle: string;
    requestCount: string;
    cacheHits: string;
    cacheMisses: string;
    retryCount: string;
    routingDuration: string;
    noConfirmedSession: string;
    noConfirmedSessionSub: string;
    importFirstButton: string;
    successNotice: string;
    partialWarning: string;
    failedNotice: string;
    mapPreviewTitle: string;
    mapPreviewSubtitle: string;
    origin: string;
    destination: string;
    distance: string;
    duration: string;
    status: string;
    modeDrive: string;
    realRoadNetwork: string;
    noHaversineNote: string;
  };
  optimization: {
    title: string;
    subtitle: string;
    runOptimization: string;
    reoptimize: string;
    optimizing: string;
    optimizingSubtitle: string;
    routesOverview: string;
    assignedRoutes: string;
    unassignedStops: string;
    noUnassigned: string;
    unassignedWarning: string;
    objectiveScore: string;
    totalDistance: string;
    totalDuration: string;
    totalPayload: string;
    fleetUtilization: string;
    balanceFairness: string;
    driverRouteDetails: string;
    routeSequence: string;
    stopNumber: string;
    stopId: string;
    buyerName: string;
    listsCount: string;
    payloadKg: string;
    reassignStop: string;
    targetDriver: string;
    moveStop: string;
    nominalCap: string;
    maxCap110: string;
    oversizedBadge: string;
    capacityWarning: string;
    routeEmpty: string;
    noActiveDrivers: string;
    noConfirmedSession: string;
    noRoadMatrix: string;
    calculateMatrixFirst: string;
    manualInterventionSuccess: string;
    capacityExceededError: string;
  };
  validation: {
    buyerCodeRequired: string;
    buyerCodeTooLong: string;
    buyerNameRequired: string;
    buyerNameTooLong: string;
    invalidLatitude: string;
    invalidLongitude: string;
    driverIdRequired: string;
    driverNameRequired: string;
    invalidDriverCapacity: string;
    capacityTooLarge: string;
    invalidActiveStatus: string;
    listNumberRequired: string;
    invalidListWeight: string;
    emptyStopLists: string;
    stopBuyerMismatch: string;
    stopWeightMismatch: string;
    duplicateDriverId: string;
  };
  errors: {
    general: string;
    validation: string;
    duplicateBuyerCode: string;
    duplicateListNumber: string;
    duplicateListNumberWithRows: string;
    missingBuyer: string;
    buyerNotFound: string;
    missingLocation: string;
    missingBuyerLocation: string;
    capacityExceeded: string;
    oversizedList: string;
    routingUnavailable: string;
    routingTimeout: string;
    routingQuotaExceeded: string;
    routingInvalidRequest: string;
    routingNoRoute: string;
    depotLocationInvalid: string;
    invalidGpsCoordinates: string;
    authFailed: string;
    permissionDenied: string;
    repositoryFailure: string;
    notFound: string;
    invalidFile: string;
    fileTooLarge: string;
    rowLimitExceeded: string;
    importHeaderError: string;
    missingListNumber: string;
    missingBuyerCode: string;
    invalidWeight: string;
    firebaseUnavailable: string;
  };
  warnings: {
    unassignedStops: string;
    noActiveDrivers: string;
    buyerNameMismatch: string;
    oversizedStop: string;
  };
}

export const ARABIC_MESSAGES: Messages = {
  common: {
    appName: 'نظام تحسين مسارات التوزيع',
    appSubtitle: 'منظومة إدارة وتوزيع قوائم الشحن وتخطيط الرحلات الذكي',
    loading: 'جاري التحميل...',
    saving: 'جاري الحفظ...',
    save: 'حفظ التغييرات',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة جديد',
    search: 'بحث...',
    actions: 'الإجراءات',
    status: 'الحالة',
    active: 'نشط',
    inactive: 'غير نشط',
    confirmDelete: 'هل أنت متأكد من عملية الحذف؟ لا يمكن التراجع عن هذا الإجراء.',
    retry: 'إعادة المحاولة',
    noData: 'لا توجد بيانات مسجلة حالياً',
    success: 'تمت العملية بنجاح',
    error: 'حدث خطأ غير متوقع',
    kg: 'كغم',
    km: 'كم',
    minutes: 'دقيقة',
    hours: 'ساعة'
  },
  navigation: {
    dashboard: 'لوحة التحكم الرئيسية',
    import: 'استيراد القوائم (Excel)',
    routing: 'مصفوفة المسارات (Google Routes)',
    optimization: 'توزيع وتحسين المسارات (Stage 5)',
    buyers: 'سجل الزبائن (المحلات)',
    drivers: 'أسطول السائقين والمركبات',
    settings: 'إعدادات المستودع المركزي',
    logout: 'تسجيل الخروج',
    login: 'تسجيل الدخول',
    userProfile: 'الملف الشخصي'
  },
  auth: {
    title: 'تسجيل دخول مأمور التوزيع',
    subtitle: 'يرجى تسجيل الدخول للوصول إلى لوحة تخطيط المسارات وإدارة الأسطول',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    signIn: 'تسجيل الدخول',
    signInWithGoogle: 'تسجيل الدخول عبر Google',
    signOut: 'تسجيل الخروج',
    guestMode: 'الدخول كزائر تجريبي (Dispatcher)',
    authenticatedAs: 'مسجل الدخول كـ',
    roleDispatcher: 'مأمور التوزيع (Dispatcher)'
  },
  buyers: {
    title: 'سجل الزبائن والمحلات',
    subtitle: 'إدارة البيانات الجغرافية الدائمة للمشترين والمحلات التجارية',
    addNew: 'إضافة زبون جديد',
    editBuyer: 'تعديل بيانات الزبون',
    buyerCode: 'رمز الزبون (Buyer Code)',
    buyerName: 'اسم الزبون / المحل',
    latitude: 'خط العرض (Latitude)',
    longitude: 'خط الطول (Longitude)',
    emptyList: 'لم يتم تسجيل أي زبائن بعد',
    emptyListSub: 'ابدأ بإضافة الزبائن يدوياً مع إحداثياتهم الجغرافية المعتمدة.',
    deleteConfirm: 'هل أنت متأكد من حذف الزبون المحدد نهائياً من السجل الدائم؟',
    addedSuccess: 'تمت إضافة الزبون بنجاح إلى السجل الدائم.',
    updatedSuccess: 'تم تحديث بيانات الزبون بنجاح.',
    deletedSuccess: 'تم حذف الزبون من السجل الدائم بنجاح.'
  },
  drivers: {
    title: 'أسطول السائقين والمركبات',
    subtitle: 'إدارة أسطول النقل، الحمولات الاسمية، والحد التشغيلي الأقصى (110%)',
    addNew: 'إضافة سائق جديد',
    editDriver: 'تعديل بيانات السائق',
    driverId: 'معرّف السائق (Driver ID)',
    driverName: 'اسم السائق الكامل',
    nominalCapacity: 'الحمولة الاسمية القياسية',
    maxAllowedCapacity: 'الحد الأقصى المسموح (110%)',
    capacityNotice: 'يتم احتساب الحد الأقصى تلقائياً بنسبة +10% تشغيلية عن الحمولة الاسمية.',
    statusActive: 'مشارك في التوزيع (نشط)',
    statusInactive: 'مستبعد من التوزيع (غير نشط)',
    emptyList: 'لم يتم تسجيل أي سائقين في الأسطول',
    emptyListSub: 'أضف سائقين ومركبات لبدء تخصيص الشحنات وتحسين المسارات.',
    deleteConfirm: 'هل أنت متأكد من حذف السائق من سجل الأسطول؟',
    addedSuccess: 'تم تسجيل السائق بنجاح في أسطول التوزيع.',
    updatedSuccess: 'تم تحديث بيانات السائق بنجاح.',
    deletedSuccess: 'تم حذف السائق من السجل بنجاح.'
  },
  settings: {
    title: 'إعدادات النظام والمستودع',
    subtitle: 'تحديد موقع المستودع المركزي (Depot) ومعايير التوزيع',
    depotTitle: 'موقع المستودع المركزي (Central Depot)',
    depotSubtitle: 'نقطة الانطلاق والعودة الإلزامية لجميع مسارات أسطول التوزيع',
    depotName: 'اسم المستودع',
    depotLatitude: 'خط العرض للمستودع (Latitude)',
    depotLongitude: 'خط الطول للمستودع (Longitude)',
    depotAddress: 'العنوان الوصفي للمستودع',
    optimizationTitle: 'معايير خوارزمية التحسين (70/30)',
    optimizationSubtitle: 'الأوزان المعتمدة لموازنة المسافة المقطوعة وعدالة توزيع الحمولات',
    distanceWeight: 'وزن تقليل المسافة الإجمالية للطرق (70%)',
    loadBalanceWeight: 'وزن توازن الأحمال بين السائقين (30%)',
    capacityTolerance: 'نسبة التسامح التشغيلي للحمولة (10%)',
    savedSuccess: 'تم حفظ إعدادات المستودع المركزي بنجاح.'
  },
  dashboard: {
    title: 'لوحة التحكم التشغيلية',
    welcome: 'مرحباً بك في نظام تحسين مسارات التوزيع',
    stage2NoticeTitle: 'المرحلة 3: استيراد قوائم Excel ومطابقة المشترين جاهز',
    stage2NoticeBody: 'يمكنك الآن استيراد ملفات Excel للتحقق من القوائم ودمج المشترين في نقاط توصيل ذرية والتحقق من الحمولات القصوى للأسطول.',
    quickStats: {
      registeredBuyers: 'الزبائن المسجلون',
      activeDrivers: 'السائقون النشطون',
      fleetNominalCapacity: 'إجمالي حمولة الأسطول الاسمية',
      fleetMaxCapacity: 'إجمالي الحد الأقصى التشغيلي (110%)'
    }
  },
  import: {
    title: 'استيراد قوائم التوزيع (Excel)',
    subtitle: 'استيراد وتحقق ومطابقة القوائم مع بيانات المشترين ونقاط التوصيل',
    dropzoneTitle: 'اسحب وأفلت ملف Excel هنا أو اضغط للاختيار',
    dropzoneSubtitle: 'يدعم ملفات .xlsx و .xls (الحد الأقصى 2 ميغابايت و 600 صف)',
    dropzoneActive: 'أفلت الملف هنا لبدء القراءة والتحقق...',
    selectFile: 'اختيار ملف Excel',
    processing: 'جاري قراءة ومعالجة الملف ومطابقة المشترين...',
    fileInfo: 'معلومات الملف',
    fileName: 'اسم الملف',
    fileSize: 'حجم الملف',
    rowCount: 'عدد الصفوف',
    summaryTitle: 'ملخص نتائج الاستيراد والمطابقة',
    totalLists: 'إجمالي القوائم',
    validLists: 'القوائم الصالحة',
    invalidRows: 'الصفوف غير الصالحة',
    uniqueBuyers: 'المشترون الفريدون (النقاط)',
    totalWeight: 'إجمالي الوزن التشغيلي',
    oversizedStops: 'نقاط تتجاوز الحمولة (Oversized)',
    missingBuyers: 'مشترون غير مسجلين',
    nameMismatches: 'تنبيهات اختلاف الأسماء',
    maxActiveDriverCapacity: 'أكبر حمولة تشغيلية للسائقين النشطين (110%)',
    tabs: {
      lists: 'جدول القوائم (Lists)',
      stops: 'جدول نقاط التوصيل (Stops)',
      errors: 'الأخطاء المانعة (Blocking Errors)',
      warnings: 'التحذيرات والتنبيهات (Warnings)'
    },
    listsTable: {
      rowNum: 'الصف',
      listNumber: 'رقم القائمة',
      buyerCode: 'كود المشتري',
      excelBuyerName: 'اسم المشتري (الملف)',
      masterBuyerName: 'اسم المشتري (المعتمد)',
      weight: 'الوزن (كغم)',
      status: 'الحالة',
      notes: 'الملاحظات'
    },
    stopsTable: {
      stopId: 'معرف النقطة',
      buyerCode: 'كود المشتري',
      buyerName: 'اسم المشتري (الرسمي)',
      listCount: 'عدد القوائم',
      listsIncluded: 'القوائم المشمولة',
      totalWeight: 'إجمالي الوزن',
      gpsStatus: 'إحداثيات GPS',
      capacityStatus: 'ملاءمة الحمولة'
    },
    actions: {
      confirmImport: 'تأكيد وحفظ الجلسة التشغيلية',
      cancelImport: 'إلغاء المعاينة',
      reimport: 'استيراد ملف جديد',
      reimportConfirm: 'لديك ملف مستورد غير مؤكد. هل تريد استبداله بملف جديد؟',
      clearSession: 'مسح الجلسة التشغيلية'
    },
    emptyStates: {
      noFile: 'لم يتم اختيار ملف بعد.',
      noData: 'لا توجد بيانات مستوردة.',
      noErrors: 'لا توجد أخطاء مانعة (الملف صالح 100%).',
      noWarnings: 'لا توجد أي تحذيرات تشغيلية.'
    },
    alerts: {
      oversizedAlert: '🔴 الحمولة تتجاوز أكبر حمولة تشغيلية متاحة لأي سائق نشط.',
      blockingErrorNotice: 'يوجد أخطاء مانعة تمنع تأكيد الاستيراد. يرجى تصحيح ملف Excel وإعادة المحاولة.',
      readyToConfirm: 'تم التحقق من البيانات ومطابقة المشترين بنجاح. يمكنك الآن تأكيد الجلسة التشغيلية.',
      sessionConfirmed: 'تم تأكيد الجلسة التشغيلية بنجاح وحفظها في الذاكرة.',
      reimportWarning: 'استيراد ملف جديد سيستبدل البيانات الحالية غير المؤكدة.'
    }
  },
  routing: {
    title: 'مصفوفة المسافات ومسارات القيادة (Google Routes)',
    subtitle: 'حساب المسافات الفعلية وأوقات القيادة الحقيقية عبر شبكة الطرق باستخدام Google Routes API',
    calculating: 'جاري حساب مسافات الطرق...',
    calculatingSubtitle: 'يتم الآن التواصل مع خوادم Google Routes لحساب مصفوفة المسافات وأوقات القيادة الحقيقية بالسيارة (DRIVE mode)...',
    progressText: 'تم حساب {processed} من أصل {total} اتصال بين المواقع',
    depotHub: 'المستودع المركزي (Depot Hub)',
    stopsCount: 'عدد نقاط التوصيل',
    totalConnections: 'إجمالي اتصالات المصفوفة',
    calculateMatrix: 'حساب مصفوفة المسافات الطرقية',
    recalculate: 'إعادة حساب المصفوفة',
    matrixView: 'جدول مصفوفة المسافات (المستودع والنقاط)',
    diagnosticsTitle: 'مؤشرات وتشخيصات محرك المسارات',
    requestCount: 'عدد طلبات API',
    cacheHits: 'مرات الاسترجاع من الذاكرة (Cache Hits)',
    cacheMisses: 'طلبات الشبكة الجديدة (Cache Misses)',
    retryCount: 'مرات إعادة المحاولة (Retries)',
    routingDuration: 'الوقت الإجمالي للحساب',
    noConfirmedSession: 'لا توجد جلسة تشغيلية مؤكدة حالياً',
    noConfirmedSessionSub: 'يرجى استيراد ملف Excel للشحنات أولاً وتأكيده للبدء في حساب مصفوفة المسافات.',
    importFirstButton: 'الانتقال لاستيراد الشحنات',
    successNotice: 'تم حساب مصفوفة المسافات الطرقية بنجاح عبر شبكة Google الطرقية.',
    partialWarning: 'تم الحساب مع وجود بعض المسارات غير القابلة للوصول أو غير المتوفرة.',
    failedNotice: 'فشل حساب مسارات الطرق. يرجى مراجعة مفتاح API أو الاتصال بالإنترنت.',
    mapPreviewTitle: 'معاينة التحقق الجغرافي للمواقع (Depot & Stops)',
    mapPreviewSubtitle: 'التحقق من مواقع المستودع ونقاط التوصيل قبل مرحلة التوزيع والتحسين (Stage 5)',
    origin: 'نقطة الانطلاق',
    destination: 'نقطة الوصول',
    distance: 'المسافة الطرقية',
    duration: 'زمن القيادة',
    status: 'حالة المسار',
    modeDrive: 'نمط القيادة (DRIVE)',
    realRoadNetwork: 'شبكة طرق واقعية',
    noHaversineNote: 'تنبيه معايير القياس: الحساب مبني بنسبة 100% على مسافات القيادة الفعلية على الطرق دون أي تقريب خطي (No Haversine).'
  },
  optimization: {
    title: 'محرك التحسين وتوزيع المسارات الذكي (Stage 5)',
    subtitle: 'توزيع الشحنات على أسطول السائقين وترتيب نقاط التوقف وفق معايير 70% مسافة و 30% عدالة حمولة مع حد 110% كأقصى طاقة تشغيلية',
    runOptimization: 'تشغيل محرك التحسين والتوزيع',
    reoptimize: 'إعادة تحسين التوزيع',
    optimizing: 'جاري تشغيل خوارزميات التحسين (2-Opt & Local Search)...',
    optimizingSubtitle: 'يتم الآن محاكاة وتوليد أفضل التوزيعات مع فحص قيود السعة التشغيلية 110% وعدم تجزئة النقاط...',
    routesOverview: 'نظرة عامة على مسارات الأسطول',
    assignedRoutes: 'المسارات الموزعة',
    unassignedStops: 'نقاط غير موزعة (Unassigned)',
    noUnassigned: 'تم توزيع كافة نقاط التوصيل بنجاح 100% دون أي نقاط معلقة.',
    unassignedWarning: 'تنبيه: توجد نقاط توصيل لم يتم إسنادها بسبب تجاوز السعات التشغيلية لجميع السائقين المتاحين.',
    objectiveScore: 'درجة جودة التوزيع (Objective Score)',
    totalDistance: 'إجمالي المسافة الطرقية',
    totalDuration: 'إجمالي زمن القيادة المقدر',
    totalPayload: 'إجمالي الحمولة المنقولة',
    fleetUtilization: 'معدل استغلال طاقة الأسطول',
    balanceFairness: 'مؤشر عدالة توزيع الحمولات',
    driverRouteDetails: 'تفاصيل مسار السائق',
    routeSequence: 'تسلسل وترتيب نقاط التوصيل',
    stopNumber: '#',
    stopId: 'معرّف النقطة',
    buyerName: 'اسم الزبون / المحل',
    listsCount: 'القوائم المدمجة',
    payloadKg: 'حمولة النقطة (كغم)',
    reassignStop: 'إعادة إسناد يدوي للنقطة',
    targetDriver: 'السائق البديل',
    moveStop: 'نقل النقطة',
    nominalCap: 'الحمولة الاسمية',
    maxCap110: 'الحد الأقصى المسموح (110%)',
    oversizedBadge: 'حمولة حرجة (110%)',
    capacityWarning: 'تحذير تجاوز الحمولة التشغيلية القصوى',
    routeEmpty: 'هذا السائق لا يحمل أي شحنات في التوزيع الحالي.',
    noActiveDrivers: 'لا يوجد سائقون نشطون في الأسطول. يرجى تفعيل السائقين في تبويب الأسطول أولاً.',
    noConfirmedSession: 'لا توجد جلسة شحنات مؤكدة حالياً. يرجى استيراد ملف Excel أولاً.',
    noRoadMatrix: 'مصفوفة المسافات غير محسوبة بعد.',
    calculateMatrixFirst: 'يرجى الانتقال لتبويب مصفوفة المسارات وحساب مسافات الطرق أولاً.',
    manualInterventionSuccess: 'تم تعديل إسناد النقطة وإعادة احتساب مسافات ومسارات السائقين بنجاح.',
    capacityExceededError: 'فشل التعديل اليدوي: الحمولة تتجاوز الحد الأقصى التشغيلي للسائق المحدد (110%).'
  },
  validation: {
    buyerCodeRequired: 'رمز الزبون مطلوب ويجب أن يحتوي على حرفين على الأقل.',
    buyerCodeTooLong: 'رمز الزبون لا يمكن أن يتجاوز 64 حرفاً.',
    buyerNameRequired: 'اسم الزبون مطلوب ويجب أن يحتوي على حرفين على الأقل.',
    buyerNameTooLong: 'اسم الزبون لا يمكن أن يتجاوز 128 حرفاً.',
    invalidLatitude: 'خط العرض غير صحيح. يجب أن يكون رقماً بين -90 و +90.',
    invalidLongitude: 'خط الطول غير صحيح. يجب أن يكون رقماً بين -180 و +180.',
    driverIdRequired: 'معرّف السائق مطلوب.',
    driverNameRequired: 'اسم السائق مطلوب.',
    invalidDriverCapacity: 'الحمولة الاسمية يجب أن تكون رقماً موجباً أكبر من الصفر.',
    capacityTooLarge: 'الحمولة تتجاوز الحد الأقصى المنطقي (100,000 كغم).',
    invalidActiveStatus: 'حالة نشاط السائق غير صحيحة.',
    listNumberRequired: 'رقم قائمة التوزيع مطلوب.',
    invalidListWeight: 'وزن القائمة يجب أن يكون أكبر من الصفر.',
    emptyStopLists: 'يجب أن تحتوي نقطة التوصيل على قائمة واحدة على الأقل.',
    stopBuyerMismatch: 'جميع القوائم في نقطة التوصيل الواحدة يجب أن تخص نفس الزبون.',
    stopWeightMismatch: 'مجموع أوزان القوائم لا يتطابق مع وزن نقطة التوصيل.',
    duplicateDriverId: 'معرّف السائق مستخدم بالفعل لسائق آخر.'
  },
  errors: {
    general: 'حدث خطأ في النظام. يرجى المحاولة لاحقاً.',
    validation: 'يرجى التأكد من صحة الحقول المدخلة.',
    duplicateBuyerCode: 'رمز الزبون مسجل مسبقاً في السجل الدائم.',
    duplicateListNumber: 'رقم قائمة التوزيع مكرر في العملية الحالية.',
    duplicateListNumberWithRows: 'رقم القائمة مكرر في عدة صفوف.',
    missingBuyer: 'الزبون المحدد غير موجود في سجل الزبائن المعتمد.',
    buyerNotFound: 'كود المشتري غير موجود في قاعدة بيانات المشترين.',
    missingLocation: 'الزبون لا يمتلك إحداثيات جغرافية معتمدة.',
    missingBuyerLocation: 'المشتري لا يمتلك إحداثيات GPS صالحة في قاعدة البيانات.',
    capacityExceeded: 'الحمولة المخصصة تتجاوز الحد الأقصى المسموح للسائق (110%).',
    oversizedList: 'وزن القائمة يتجاوز الحد الأقصى الفردي لأي مركبة في الأسطول.',
    routingUnavailable: 'خدمة مسارات Google غير متاحة حالياً ولا تتوفر بيانات طرق مخزنة.',
    routingTimeout: 'انتهت مهلة انتظار استجابة خدمة مسارات Google.',
    routingQuotaExceeded: 'تم استنفاد الحصة المخصصة لـ Google Routes API أو تجاوز معدل الطلبات.',
    routingInvalidRequest: 'طلب غير صالح تم إرساله إلى Google Routes API.',
    routingNoRoute: 'تعذر العثور على مسار قيادة طرقي بين النقطتين المحددين.',
    depotLocationInvalid: 'المستودع المركزي يفتقر إلى إحداثيات GPS صالحة ومعتمدة.',
    invalidGpsCoordinates: 'الإحداثيات الجغرافية المحددة غير صالحة.',
    authFailed: 'فشل التحقق من هوية المستخدم أو تسجيل الدخول.',
    permissionDenied: 'ليس لديك الصلاحيات الكافية لتنفيذ هذا الإجراء.',
    repositoryFailure: 'حدث خطأ أثناء الاتصال بقاعدة البيانات.',
    notFound: 'العنصر المطلوب غير موجود.',
    invalidFile: 'نوع الملف غير مدعوم. يرجى رفع ملف بصيغة .xlsx أو .xls.',
    fileTooLarge: 'حجم الملف يتجاوز الحد الأقصى المسموح به (2 ميغابايت).',
    rowLimitExceeded: 'عدد الصفوف في الملف يتجاوز الحد الأقصى المسموح به (600 صف).',
    importHeaderError: 'أعمدة Excel الإلزامية غير مكتملة. الأعمدة المطلوبة: رقم القائمة، كود المشتري، اسم المشتري، الوزن.',
    missingListNumber: 'رقم القائمة مفقود أو فارغ في الصف.',
    missingBuyerCode: 'كود المشتري مفقود أو فارغ في الصف.',
    invalidWeight: 'الوزن غير صالح في الصف. يجب أن يكون رقماً موجباً أكبر من صفر.',
    firebaseUnavailable: 'تعذر الاتصال بقاعدة بيانات Firebase للتحقق من المشترين.'
  },
  warnings: {
    unassignedStops: 'توجد نقاط توصيل لم تتمكن سعة الأسطول المتاحة من استيعابها.',
    noActiveDrivers: 'لا يوجد سائقون نشطون متاحون لتوزيع الشحنات وتقييم الحمولات.',
    buyerNameMismatch: 'اسم المشتري في الملف يختلف عن الاسم المسجل رسمياً في قاعدة البيانات.',
    oversizedStop: 'حمولة النقطة تتجاوز الحد الأقصى لأي سائق نشط في الأسطول.'
  }
};

export const ENGLISH_MESSAGES: Messages = {
  common: {
    appName: 'Delivery Route Optimizer',
    appSubtitle: 'Delivery list distribution and multi-driver route planning engine',
    loading: 'Loading...',
    saving: 'Saving...',
    save: 'Save Changes',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add New',
    search: 'Search...',
    actions: 'Actions',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    confirmDelete: 'Are you sure you want to delete this record? This action cannot be undone.',
    retry: 'Retry',
    noData: 'No records found.',
    success: 'Operation completed successfully.',
    error: 'An unexpected error occurred.',
    kg: 'kg',
    km: 'km',
    minutes: 'min',
    hours: 'hrs'
  },
  navigation: {
    dashboard: 'Dashboard',
    import: 'Import Lists (Excel)',
    routing: 'Road Matrix (Routes API)',
    optimization: 'Optimization & Routes (Stage 5)',
    buyers: 'Buyers Registry',
    drivers: 'Driver Fleet',
    settings: 'Depot & Settings',
    logout: 'Sign Out',
    login: 'Sign In',
    userProfile: 'User Profile'
  },
  auth: {
    title: 'Dispatcher Authentication',
    subtitle: 'Sign in to access route planning and fleet management',
    email: 'Email Address',
    password: 'Password',
    signIn: 'Sign In',
    signInWithGoogle: 'Sign In with Google',
    signOut: 'Sign Out',
    guestMode: 'Enter as Demo Dispatcher',
    authenticatedAs: 'Signed in as',
    roleDispatcher: 'Dispatcher'
  },
  buyers: {
    title: 'Buyers Directory',
    subtitle: 'Manage permanent verified customer GPS coordinates',
    addNew: 'Add New Buyer',
    editBuyer: 'Edit Buyer',
    buyerCode: 'Buyer Code',
    buyerName: 'Buyer Name',
    latitude: 'Latitude',
    longitude: 'Longitude',
    emptyList: 'No buyers registered yet',
    emptyListSub: 'Start adding buyers with their verified GPS coordinates.',
    deleteConfirm: 'Are you sure you want to permanently delete this buyer?',
    addedSuccess: 'Buyer successfully added to registry.',
    updatedSuccess: 'Buyer details updated successfully.',
    deletedSuccess: 'Buyer successfully deleted.'
  },
  drivers: {
    title: 'Driver Fleet Registry',
    subtitle: 'Manage delivery fleet, nominal payloads, and the 110% operational ceiling',
    addNew: 'Add New Driver',
    editDriver: 'Edit Driver',
    driverId: 'Driver ID',
    driverName: 'Full Name',
    nominalCapacity: 'Nominal Payload',
    maxAllowedCapacity: 'Max Allowed (110%)',
    capacityNotice: 'Max capacity is computed automatically as nominal payload +10% operational buffer.',
    statusActive: 'Active for Routing',
    statusInactive: 'Excluded from Routing',
    emptyList: 'No drivers registered yet',
    emptyListSub: 'Add drivers and vehicles to begin distributing shipments.',
    deleteConfirm: 'Are you sure you want to delete this driver from the fleet?',
    addedSuccess: 'Driver successfully added to fleet.',
    updatedSuccess: 'Driver details updated successfully.',
    deletedSuccess: 'Driver successfully deleted.'
  },
  settings: {
    title: 'System & Depot Settings',
    subtitle: 'Configure central warehouse depot and optimization parameters',
    depotTitle: 'Central Warehouse Depot',
    depotSubtitle: 'Mandatory origin and return hub for all delivery fleet routes',
    depotName: 'Depot Name',
    depotLatitude: 'Depot Latitude',
    depotLongitude: 'Depot Longitude',
    depotAddress: 'Depot Address',
    optimizationTitle: '70/30 Optimization Parameters',
    optimizationSubtitle: 'Weighted criteria balancing total road distance and driver workload equity',
    distanceWeight: 'Global Distance Minimization Weight (70%)',
    loadBalanceWeight: 'Load Balance Equity Weight (30%)',
    capacityTolerance: 'Capacity Tolerance Buffer (10%)',
    savedSuccess: 'Central depot settings saved successfully.'
  },
  dashboard: {
    title: 'Operations Dashboard',
    welcome: 'Welcome to Delivery Route Optimizer',
    stage2NoticeTitle: 'Stage 3: Excel Import & Buyer Matching Pipeline Ready',
    stage2NoticeBody: 'You can now import Excel delivery lists, validate headers, verify row integrity, aggregate physical stops, and evaluate payload capacity.',
    quickStats: {
      registeredBuyers: 'Registered Buyers',
      activeDrivers: 'Active Drivers',
      fleetNominalCapacity: 'Fleet Nominal Payload',
      fleetMaxCapacity: 'Fleet Max Allowed (110%)'
    }
  },
  import: {
    title: 'Import Delivery Lists (Excel)',
    subtitle: 'Ingest, validate, and match shipment lists with verified customer master data',
    dropzoneTitle: 'Drag & drop Excel file here, or click to browse',
    dropzoneSubtitle: 'Supports .xlsx and .xls (Max 2 MB, up to 600 rows)',
    dropzoneActive: 'Drop the Excel file here to begin parsing...',
    selectFile: 'Select Excel File',
    processing: 'Reading Excel workbook, validating fields, and matching buyers...',
    fileInfo: 'File Details',
    fileName: 'File Name',
    fileSize: 'File Size',
    rowCount: 'Total Rows',
    summaryTitle: 'Import & Matching Summary',
    totalLists: 'Total Lists',
    validLists: 'Valid Lists',
    invalidRows: 'Invalid Rows',
    uniqueBuyers: 'Unique Buyers (Stops)',
    totalWeight: 'Total Operational Weight',
    oversizedStops: 'Oversized Stops',
    missingBuyers: 'Missing Buyers',
    nameMismatches: 'Name Mismatch Warnings',
    maxActiveDriverCapacity: 'Max Active Driver Payload (110%)',
    tabs: {
      lists: 'Lists Table',
      stops: 'Delivery Stops Table',
      errors: 'Blocking Errors',
      warnings: 'Warnings & Alerts'
    },
    listsTable: {
      rowNum: 'Row #',
      listNumber: 'List Number',
      buyerCode: 'Buyer Code',
      excelBuyerName: 'Buyer Name (Excel)',
      masterBuyerName: 'Master Buyer Name (Firebase)',
      weight: 'Weight (kg)',
      status: 'Status',
      notes: 'Notes & Issues'
    },
    stopsTable: {
      stopId: 'Stop ID',
      buyerCode: 'Buyer Code',
      buyerName: 'Official Buyer Name',
      listCount: 'Lists Count',
      listsIncluded: 'Lists Included',
      totalWeight: 'Total Weight',
      gpsStatus: 'GPS Coordinates',
      capacityStatus: 'Capacity Feasibility'
    },
    actions: {
      confirmImport: 'Confirm & Store Operational Session',
      cancelImport: 'Cancel Preview',
      reimport: 'Import New File',
      reimportConfirm: 'You have an unconfirmed imported file. Do you want to replace it with a new file?',
      clearSession: 'Clear Session'
    },
    emptyStates: {
      noFile: 'No file selected yet.',
      noData: 'No imported data available.',
      noErrors: 'No blocking errors (file is 100% valid).',
      noWarnings: 'No operational warnings.'
    },
    alerts: {
      oversizedAlert: '🔴 Stop payload exceeds the maximum operational capacity of any active driver.',
      blockingErrorNotice: 'There are blocking errors preventing confirmation. Please fix the Excel file and try again.',
      readyToConfirm: 'All lists validated and buyers matched successfully. You can now confirm the operational session.',
      sessionConfirmed: 'Operational session confirmed and saved in memory.',
      reimportWarning: 'Uploading a new file will replace the current unconfirmed preview.'
    }
  },
  routing: {
    title: 'Road Distance & Duration Matrix (Google Routes)',
    subtitle: 'Calculates real driving distance and duration on actual road networks via Google Routes API',
    calculating: 'Calculating road driving distances...',
    calculatingSubtitle: 'Querying Google Routes API using DRIVE mode to build real road distance and duration matrix...',
    progressText: 'Computed {processed} of {total} location connections',
    depotHub: 'Central Depot Hub',
    stopsCount: 'Delivery Stops Count',
    totalConnections: 'Total Matrix Pairs',
    calculateMatrix: 'Compute Road Distance Matrix',
    recalculate: 'Recalculate Matrix',
    matrixView: 'Road Distance Matrix Grid (Depot & Stops)',
    diagnosticsTitle: 'Routing Engine Diagnostics & Observability',
    requestCount: 'Google API Requests',
    cacheHits: 'In-Memory Cache Hits',
    cacheMisses: 'Network API Calls (Misses)',
    retryCount: 'Transient Retry Attempts',
    routingDuration: 'Total Processing Duration',
    noConfirmedSession: 'No Confirmed Operational Session',
    noConfirmedSessionSub: 'Please import and confirm an Excel shipment list first to calculate the road matrix.',
    importFirstButton: 'Go to Excel Import',
    successNotice: 'Road distance and duration matrix computed successfully via Google Routes API.',
    partialWarning: 'Routing completed with some unroutable or unavailable road connections.',
    failedNotice: 'Failed to calculate road routes. Please verify your Google API key or network connection.',
    mapPreviewTitle: 'Geographic Location Verification Preview',
    mapPreviewSubtitle: 'Visual verification of Central Depot and Delivery Stops before Stage 5 optimization',
    origin: 'Origin',
    destination: 'Destination',
    distance: 'Road Distance',
    duration: 'Driving Duration',
    status: 'Route Status',
    modeDrive: 'Mode: DRIVE',
    realRoadNetwork: 'Real Road Network',
    noHaversineNote: 'Metric Integrity: 100% real road network driving calculations. No Haversine or straight-line distance approximations.'
  },
  optimization: {
    title: 'Multi-Driver Route Optimization Engine (Stage 5)',
    subtitle: 'Optimizes stop allocation across driver fleet balancing 70% road distance and 30% load fairness with hard 110% operational capacity limits',
    runOptimization: 'Run Optimization Engine',
    reoptimize: 'Re-Optimize Routes',
    optimizing: 'Running Optimization Algorithms (2-Opt & Local Search)...',
    optimizingSubtitle: 'Simulating and evaluating candidate solutions with strict 110% capacity checks and stop atomicity...',
    routesOverview: 'Fleet Routes Overview',
    assignedRoutes: 'Assigned Driver Routes',
    unassignedStops: 'Unassigned Stops',
    noUnassigned: 'All delivery stops were successfully assigned (100% assignment rate).',
    unassignedWarning: 'Warning: Some delivery stops could not be assigned due to capacity constraints across all active drivers.',
    objectiveScore: 'Objective Score (70/30)',
    totalDistance: 'Total Road Distance',
    totalDuration: 'Total Estimated Duration',
    totalPayload: 'Total Fleet Payload',
    fleetUtilization: 'Fleet Capacity Utilization',
    balanceFairness: 'Load Balance Index (Fairness)',
    driverRouteDetails: 'Driver Route Details',
    routeSequence: 'Stop Delivery Sequence',
    stopNumber: '#',
    stopId: 'Stop ID',
    buyerName: 'Buyer Name',
    listsCount: 'Merged Lists',
    payloadKg: 'Stop Weight (kg)',
    reassignStop: 'Manual Stop Reassignment',
    targetDriver: 'Target Driver',
    moveStop: 'Move Stop',
    nominalCap: 'Nominal Capacity',
    maxCap110: 'Max Allowed Cap (110%)',
    oversizedBadge: 'Critical Load (110%)',
    capacityWarning: 'Warning: Exceeds maximum 110% operational capacity',
    routeEmpty: 'This driver has no assigned delivery stops in the current distribution.',
    noActiveDrivers: 'No active drivers in the fleet. Please enable drivers in the Drivers tab first.',
    noConfirmedSession: 'No confirmed delivery stops in memory. Please import an Excel file first.',
    noRoadMatrix: 'Road distance matrix is not computed yet.',
    calculateMatrixFirst: 'Please go to the Road Matrix tab and calculate driving distances first.',
    manualInterventionSuccess: 'Stop reassigned and driver route metrics recalculated successfully.',
    capacityExceededError: 'Reassignment failed: Payload exceeds the 110% operational capacity of the target driver.'
  },
  validation: {
    buyerCodeRequired: 'Buyer Code is required and must have at least 2 characters.',
    buyerCodeTooLong: 'Buyer Code cannot exceed 64 characters.',
    buyerNameRequired: 'Buyer Name is required and must have at least 2 characters.',
    buyerNameTooLong: 'Buyer Name cannot exceed 128 characters.',
    invalidLatitude: 'Invalid latitude. Must be between -90 and +90.',
    invalidLongitude: 'Invalid longitude. Must be between -180 and +180.',
    driverIdRequired: 'Driver ID is required.',
    driverNameRequired: 'Driver Name is required.',
    invalidDriverCapacity: 'Nominal capacity must be a positive number greater than 0.',
    capacityTooLarge: 'Payload exceeds maximum plausible vehicle limit (100,000 kg).',
    invalidActiveStatus: 'Invalid active status.',
    listNumberRequired: 'List Number is required.',
    invalidListWeight: 'List weight must be greater than 0 kg.',
    emptyStopLists: 'Delivery stop must contain at least one list.',
    stopBuyerMismatch: 'All lists in a delivery stop must belong to the same buyer.',
    stopWeightMismatch: 'Total weight does not match sum of lists.',
    duplicateDriverId: 'Driver ID is already in use.'
  },
  errors: {
    general: 'An unexpected system error occurred.',
    validation: 'Please verify the highlighted form fields.',
    duplicateBuyerCode: 'Buyer code is already registered in master directory.',
    duplicateListNumber: 'Delivery list number is duplicated in current operation.',
    duplicateListNumberWithRows: 'List number is duplicated across multiple rows.',
    missingBuyer: 'Selected buyer not found in master directory.',
    buyerNotFound: 'Buyer code was not found in registered master database.',
    missingLocation: 'Selected buyer lacks verified GPS coordinates.',
    missingBuyerLocation: 'Buyer does not have valid GPS coordinates in master database.',
    capacityExceeded: 'Assigned weight exceeds driver 110% capacity ceiling.',
    oversizedList: 'List weight exceeds the maximum single-vehicle capacity of the fleet.',
    routingUnavailable: 'Google Routes service unavailable and no valid cached road data exists.',
    routingTimeout: 'Routing request timed out waiting for Google Routes API.',
    routingQuotaExceeded: 'Google Routes API rate limit or quota exceeded.',
    routingInvalidRequest: 'Invalid routing request sent to Google Routes API.',
    routingNoRoute: 'No road route found between the specified locations.',
    depotLocationInvalid: 'Central depot lacks valid verified GPS coordinates.',
    invalidGpsCoordinates: 'The specified geographic coordinates are invalid.',
    authFailed: 'Authentication failed. Please check credentials.',
    permissionDenied: 'Insufficient permissions to perform this action.',
    repositoryFailure: 'Database repository communication failure.',
    notFound: 'Requested item was not found.',
    invalidFile: 'Unsupported file format. Please upload an .xlsx or .xls file.',
    fileTooLarge: 'File size exceeds the 2 MB maximum limit.',
    rowLimitExceeded: 'File exceeds the maximum limit of 600 rows.',
    importHeaderError: 'Required Excel columns are missing. Required: List Number, Buyer Code, Buyer Name, Weight.',
    missingListNumber: 'List Number is missing or empty in row.',
    missingBuyerCode: 'Buyer Code is missing or empty in row.',
    invalidWeight: 'Invalid weight value in row. Must be a positive number greater than 0.',
    firebaseUnavailable: 'Could not connect to Firebase database to verify buyers.'
  },
  warnings: {
    unassignedStops: 'Some delivery stops could not be accommodated within available fleet capacity.',
    noActiveDrivers: 'No active drivers available in the fleet to evaluate payload feasibility.',
    buyerNameMismatch: 'Buyer name in Excel differs from official master name in database.',
    oversizedStop: 'Stop weight exceeds the maximum capacity of any active driver in the fleet.'
  }
};
