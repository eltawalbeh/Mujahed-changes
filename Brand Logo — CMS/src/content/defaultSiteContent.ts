export type SitePageKey =
  | 'home'
  | 'business'
  | 'about'
  | 'contact'
  | 'faq'
  | 'footer'
  | 'privacy'
  | 'terms'

export const defaultSiteContent: Record<SitePageKey, Record<string, any>> = {
  home: {
    eyebrow: 'الشيف مجاهد',
    title: 'حلويات ومخبوزات بطابع دافئ، من الفكرة حتى لحظة التقديم.',
    description: 'مطبخ متخصص في الحلويات والكيك والمعجنات الحلوة والمخبوزات، مع تجربة طلب منظمة للأفراد والشركات.',
    primaryCtaLabel: 'استكشف قائمتنا',
    secondaryCtaLabel: 'طلبات الشركات',
    heroImages: [],
    heroImageUrl: '',
    processEyebrow: 'كيف يعمل الطلب؟',
    processTitle: 'بسيط من جهتك، منظم من جهتنا',
    steps: [
      { title: 'اختر من قائمتنا', description: 'تصفح الحلويات والكيك والمعجنات الحلوة وأضف ما يناسب طلبك.' },
      { title: 'أرسل طلبك', description: 'حدد الكمية والتفاصيل وطريقة التوصيل أو الاستلام ثم سجّل الطلب.' },
      { title: 'نراجع ونتواصل معك', description: 'الطلب لا يعتبر مؤكداً حتى يراجعه الفريق ويتواصل معك للتأكيد.' },
    ],
    businessEyebrow: 'للشركات',
    businessTitle: 'طلبات منظمة للكميات واحتياجات الأعمال',
    businessDescription: 'اختر المنتجات والكميات والوحدات أو الصيغ المتاحة، وأرسل طلب الشركات بدون أسعار عامة ليتم مراجعته والتواصل معك.',
    businessImageUrl: '',
    aboutEyebrow: 'عن الشيف مجاهد',
    aboutTitle: 'مطبخ متخصص في عالم الحلويات والمخبوزات الحلوة',
    aboutDescription: 'يركز نطاق العمل على الحلويات الفردية والكيك والمعجنات الحلوة والمخبوزات وكاسات وعلب الحلويات والطلبات الموسمية والمخصصة.',
    aboutImageUrl: '',
    contactTitle: 'عندك طلب خاص أو مناسبة؟',
    contactDescription: 'ابدأ من القائمة، أو تواصل معنا بعد تسجيل طلبك لمتابعة التفاصيل.',
  },
  business: {
    eyebrow: 'للشركات والأعمال',
    title: 'طلبات حلويات منظمة لاحتياجات أعمالكم',
    description: 'تصفح المنتجات المتاحة للشركات، حدد الكميات والتخصيص، ثم أرسل طلباً منظماً للمراجعة والتواصل — بدون أسعار عامة وبدون تأكيد تلقائي.',
    heroImageUrl: '',
    steps: [
      { title: 'اختر المنتجات', description: 'ابدأ من المنتجات المتاحة للشركات بدون عرض أسعار عامة.' },
      { title: 'حدد احتياجك', description: 'أدخل الكمية والوحدة أو الصيغة وخيارات التخصيص المتاحة.' },
      { title: 'أرسل الطلب', description: 'أدخل بيانات الشركة والتواصل والتسليم ثم سجّل الطلب للمراجعة.' },
    ],
    catalogEyebrow: 'كتالوج الشركات',
    catalogTitle: 'اختر المنتجات والكميات المطلوبة',
    catalogDescription: 'الأسعار لا تظهر للعامة؛ تتم مراجعة تفاصيل الطلب والتواصل مع الشركة بعد التسجيل.',
    confirmationTitle: 'الطلب المسجل ليس تأكيداً نهائياً',
    confirmationDescription: 'بعد تسجيل الطلب يتم إنشاء رقم مرجعي، ثم يمكنك فتح واتساب برسالة مجهزة وإرسالها يدوياً لمتابعة الطلب. يبدأ التجهيز فقط بعد مراجعة الطلب والموافقة عليه.',
  },
  about: {
    eyebrow: 'عن الشيف مجاهد',
    title: 'مطبخ متخصص في الحلويات والكيك والمعجنات الحلوة والمخبوزات.',
    intro: 'يشمل نطاق المنتجات الحلويات الفردية، الكيك، المعجنات الحلوة، المخبوزات، كاسات وعلب الحلويات، المنتجات الموسمية والمخصصة، وطلبات الشركات.',
    heroImageUrl: '',
    cards: [
      { title: 'قصة الشيف مجاهد', body: '' },
      { title: 'الخبرة والفلسفة', body: '' },
      { title: 'الحرفية والتقديم', body: '' },
    ],
  },
  contact: {
    eyebrow: 'تواصل معنا',
    title: 'كيف نقدر نساعدك؟',
    intro: 'للطلبات، الأفضل البدء من قائمتنا وتسجيل الطلب أولاً.',
    whatsapp: '',
    phone: '',
    address: '',
    workingHours: '',
  },
  faq: {
    eyebrow: 'الأسئلة الشائعة',
    title: 'إجابات واضحة قبل تسجيل طلبك',
    intro: '',
    items: [
      { question: 'الطلبات والتأكيد', answer: '' },
      { question: 'الدفع', answer: '' },
      { question: 'التوصيل أو الاستلام', answer: '' },
      { question: 'التخصيص', answer: '' },
      { question: 'طلبات الأفراد B2C', answer: '' },
      { question: 'طلبات الشركات B2B', answer: '' },
    ],
  },
  footer: {
    logoUrl: '',
    description: 'مطبخ متخصص في الحلويات والكيك والمعجنات الحلوة والمخبوزات، مع تجربة طلب منظمة للأفراد والشركات.',
    copyright: '© ٢٠٢٦ الشيف مجاهد. جميع الحقوق محفوظة.',
  },
  privacy: { title: 'سياسة الخصوصية', body: '' },
  terms: { title: 'الشروط والأحكام', body: '' },
}

export const defaultSiteContentEn: Record<SitePageKey, Record<string, any>> = {
  home: {
    eyebrow: 'Chef Mujahed',
    title: 'Warm desserts and baked treats, from the idea to the moment of serving.',
    description: 'A specialized kitchen for desserts, cakes, sweet pastries and baked treats, with a structured request experience for individuals and businesses.',
    primaryCtaLabel: 'Explore our menu',
    secondaryCtaLabel: 'Business requests',
    heroImages: [],
    heroImageUrl: '',
    processEyebrow: 'How requests work',
    processTitle: 'Simple for you, organized for us',
    steps: [
      { title: 'Choose from our menu', description: 'Browse desserts, cakes and sweet pastries, then add what fits your request.' },
      { title: 'Send your request', description: 'Set quantities, details and delivery or collection preferences, then register the request.' },
      { title: 'We review and contact you', description: 'The request is not confirmed until our team reviews it and contacts you to confirm the details.' },
    ],
    businessEyebrow: 'For business',
    businessTitle: 'Structured requests for quantities and business needs',
    businessDescription: 'Choose products, quantities and available units or formats, then send a business request without public pricing for review and follow-up.',
    businessImageUrl: '',
    aboutEyebrow: 'About Chef Mujahed',
    aboutTitle: 'A specialized kitchen focused on desserts and sweet baked goods',
    aboutDescription: 'Our scope focuses on individual desserts, cakes, sweet pastries, baked treats, dessert cups and boxes, seasonal and custom products.',
    aboutImageUrl: '',
    contactTitle: 'Planning a special request or occasion?',
    contactDescription: 'Start from the menu, or contact us after registering your request to follow up on the details.',
  },
  business: {
    eyebrow: 'For companies and businesses',
    title: 'Structured dessert requests for your business needs',
    description: 'Browse products available for businesses, define quantities and customization, then send a structured request for review and follow-up — without public pricing or automatic confirmation.',
    heroImageUrl: '',
    steps: [
      { title: 'Choose products', description: 'Start with products available for businesses without public pricing.' },
      { title: 'Define your needs', description: 'Enter quantity, unit or format, and any available customization options.' },
      { title: 'Send the request', description: 'Enter company, contact and fulfillment details, then register the request for review.' },
    ],
    catalogEyebrow: 'Business catalog',
    catalogTitle: 'Choose the products and quantities you need',
    catalogDescription: 'Prices are not shown publicly; request details are reviewed and the company is contacted after registration.',
    confirmationTitle: 'A registered request is not a final confirmation',
    confirmationDescription: 'After registration, a reference number is created. You can then open WhatsApp with a prepared message and send it manually to follow up. Production starts only after the request is reviewed and approved.',
  },
  about: {
    eyebrow: 'About Chef Mujahed',
    title: 'A specialized kitchen for desserts, cakes, sweet pastries and baked treats.',
    intro: 'The product scope includes individual desserts, cakes, sweet pastries, baked treats, dessert cups and boxes, seasonal and custom products, and business requests.',
    heroImageUrl: '',
    cards: [
      { title: 'Chef Mujahed story', body: '' },
      { title: 'Experience and philosophy', body: '' },
      { title: 'Craft and presentation', body: '' },
    ],
  },
  contact: {
    eyebrow: 'Contact us',
    title: 'How can we help?',
    intro: 'For requests, we recommend starting from our menu and registering the request first.',
    whatsapp: '',
    phone: '',
    address: '',
    workingHours: '',
  },
  faq: {
    eyebrow: 'Frequently asked questions',
    title: 'Clear answers before you register your request',
    intro: '',
    items: [
      { question: 'Requests and confirmation', answer: '' },
      { question: 'Payment', answer: '' },
      { question: 'Delivery or collection', answer: '' },
      { question: 'Customization', answer: '' },
      { question: 'Individual B2C requests', answer: '' },
      { question: 'Business B2B requests', answer: '' },
    ],
  },
  footer: {
    logoUrl: '',
    description: 'A specialized kitchen for desserts, cakes, sweet pastries and baked treats, with a structured request experience for individuals and businesses.',
    copyright: '© 2026 Chef Mujahed. All rights reserved.',
  },
  privacy: { title: 'Privacy Policy', body: '' },
  terms: { title: 'Terms and Conditions', body: '' },
}
