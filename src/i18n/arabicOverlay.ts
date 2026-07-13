// Lightweight Arabic overlay: swaps common English UI/accounting terms with
// Arabic in the DOM when i18n language is "ar". Zero refactor to pages.
// Skips inputs, code, script, style, and elements marked [data-no-translate].
import i18n from "./index";

// Ordered longest-first to prevent partial overlaps ("Journal" before "Journal Entry")
const DICTIONARY: Array<[RegExp, string]> = (
  [
    // Multi-word accounting terms (translate first)
    ["Chart of Accounts", "دليل الحسابات"],
    ["Journal Entries", "قيود اليومية"],
    ["Journal Entry", "قيد يومية"],
    ["Financial Statements", "القوائم المالية"],
    ["Financial Reports", "التقارير المالية"],
    ["Financial Dashboard", "لوحة المالية"],
    ["Financial Ratios", "النسب المالية"],
    ["Cash Flow Statement", "قائمة التدفقات النقدية"],
    ["Cash Flow Forecast", "توقعات التدفق النقدي"],
    ["Statement of Equity", "قائمة حقوق الملكية"],
    ["Trial Balance", "ميزان المراجعة"],
    ["Balance Sheet", "الميزانية العمومية"],
    ["Income Statement", "قائمة الدخل"],
    ["Profit and Loss", "الأرباح والخسائر"],
    ["Aging Reports", "تقارير أعمار الديون"],
    ["Aging Report", "تقرير أعمار الديون"],
    ["Accounts Receivable", "الحسابات المدينة"],
    ["Accounts Payable", "الحسابات الدائنة"],
    ["General Ledger", "دفتر الأستاذ العام"],
    ["Sub Ledger", "الأستاذ المساعد"],
    ["Fixed Assets", "الأصول الثابتة"],
    ["Cost Centers", "مراكز التكلفة"],
    ["Cost Center", "مركز التكلفة"],
    ["Cost Allocation", "توزيع التكاليف"],
    ["Cost Center Reports", "تقارير مراكز التكلفة"],
    ["Recurring Journals", "قيود متكررة"],
    ["Recurring Invoices", "فواتير متكررة"],
    ["Purchase Orders", "أوامر الشراء"],
    ["Purchase Order", "أمر شراء"],
    ["Sales Orders", "أوامر البيع"],
    ["Sales Order", "أمر بيع"],
    ["Sales Commissions", "عمولات المبيعات"],
    ["Credit Notes", "إشعارات دائنة"],
    ["Debit Notes", "إشعارات مدينة"],
    ["Credit / Debit Notes", "إشعارات دائنة / مدينة"],
    ["Credit Note", "إشعار دائن"],
    ["Debit Note", "إشعار مدين"],
    ["Withholding Tax", "ضريبة الخصم"],
    ["Deferred Tax", "الضريبة المؤجلة"],
    ["Corporate Tax", "ضريبة الشركات"],
    ["Tax Compliance", "الامتثال الضريبي"],
    ["Tax Return", "الإقرار الضريبي"],
    ["VAT Return", "الإقرار الضريبي للقيمة المضافة"],
    ["Bank Reconciliation", "التسوية البنكية"],
    ["Bank Statement Import", "استيراد كشف الحساب البنكي"],
    ["Bank Accounts", "الحسابات البنكية"],
    ["Bank Transfers", "التحويلات البنكية"],
    ["Bank Guarantees", "الضمانات البنكية"],
    ["Cash Accounts", "حسابات النقدية"],
    ["Cheque Management", "إدارة الشيكات"],
    ["Petty Cash", "المصروفات النثرية"],
    ["Payment Reminders", "تذكيرات الدفع"],
    ["Payment Terms", "شروط الدفع"],
    ["Payment Method", "طريقة الدفع"],
    ["Payment Date", "تاريخ الدفع"],
    ["Payment Voucher", "سند صرف"],
    ["Receipt Voucher", "سند قبض"],
    ["Treasury Vouchers", "سندات الخزينة"],
    ["Foreign Exchange", "الصرف الأجنبي"],
    ["Exchange Rate", "سعر الصرف"],
    ["Exchange Rates", "أسعار الصرف"],
    ["FX Revaluation", "إعادة تقييم العملات"],
    ["FX Gain/Loss", "أرباح/خسائر الصرف"],
    ["FX Gain / Loss", "أرباح / خسائر الصرف"],
    ["Fair Value", "القيمة العادلة"],
    ["Fair Value Hierarchy", "التسلسل الهرمي للقيمة العادلة"],
    ["Business Combinations", "اندماج الأعمال"],
    ["Hedge Accounting", "محاسبة التحوط"],
    ["Investment Property", "العقارات الاستثمارية"],
    ["Borrowing Costs", "تكاليف الاقتراض"],
    ["Lease Accounting", "محاسبة الإيجارات"],
    ["Loan Amortization", "إطفاء القروض"],
    ["Amortization Schedule", "جدول الإطفاء"],
    ["Amortization Schedules", "جداول الإطفاء"],
    ["Depreciation Scheduler", "جدولة الإهلاك"],
    ["Depreciation Schedule", "جدول الإهلاك"],
    ["Asset Impairment", "اضمحلال الأصول"],
    ["Held for Sale", "المحتفظ به للبيع"],
    ["Government Grants", "المنح الحكومية"],
    ["Share-Based Payments", "المدفوعات على أساس الأسهم"],
    ["Share Based Payments", "المدفوعات على أساس الأسهم"],
    ["Related Parties", "الأطراف ذات العلاقة"],
    ["Related Party", "طرف ذو علاقة"],
    ["Segment P&L", "أرباح وخسائر القطاعات"],
    ["Operating Segments", "القطاعات التشغيلية"],
    ["Interim Reporting", "التقارير الدورية"],
    ["Events After Reporting", "الأحداث اللاحقة للتقرير"],
    ["Accounting Policies", "السياسات المحاسبية"],
    ["Approval Matrix", "مصفوفة الاعتماد"],
    ["Approval Workflows", "مسارات الاعتماد"],
    ["Approval Workflow", "مسار الاعتماد"],
    ["Purchase Approval Matrix", "مصفوفة اعتماد المشتريات"],
    ["Expense Approvals", "اعتمادات المصروفات"],
    ["Consolidation Workbench", "منصة التوحيد"],
    ["Consolidated Statements", "القوائم الموحدة"],
    ["Partner Statements", "كشوف الشركاء"],
    ["Intercompany Transactions", "المعاملات بين الشركات"],
    ["Transfer Pricing", "أسعار التحويل"],
    ["Country by Country", "تقرير الدولة بالدولة"],
    ["Global Minimum Tax", "الحد الأدنى العالمي للضريبة"],
    ["Earnings Per Share", "ربحية السهم"],
    ["End of Service Benefits", "مكافأة نهاية الخدمة"],
    ["Payroll Expenses", "مصروفات الرواتب"],
    ["Sales Commissions", "عمولات المبيعات"],
    ["Project Costing", "تكاليف المشاريع"],
    ["Revenue Recognition", "الاعتراف بالإيرادات"],
    ["Expected Credit Loss", "الخسائر الائتمانية المتوقعة"],
    ["Customer Credit", "ائتمان العملاء"],
    ["Customer Portal", "بوابة العملاء"],
    ["Customer Price List", "قائمة أسعار العملاء"],
    ["Supplier Price List", "قائمة أسعار الموردين"],
    ["Vendor Portal", "بوابة الموردين"],
    ["Vendor Invoices", "فواتير الموردين"],
    ["Vendor Scorecards", "بطاقات تقييم الموردين"],
    ["Contracts Renewals", "تجديد العقود"],
    ["Contract Lifecycle Automation", "أتمتة دورة حياة العقود"],
    ["Document Management", "إدارة المستندات"],
    ["Finance Notification Center", "مركز إشعارات المالية"],
    ["Finance Stations", "محطات المالية"],
    ["Financial Close", "الإقفال المالي"],
    ["Notes Payable", "أوراق الدفع"],
    ["Notes Receivable", "أوراق القبض"],
    ["Objection & Variance", "الاعتراضات والفروقات"],
    ["Objection Variance", "الاعتراضات والفروقات"],
    ["Budget Management", "إدارة الموازنات"],
    ["Budget Variance", "انحرافات الموازنة"],
    ["Accruals & Deferrals", "المستحقات والمؤجلات"],
    ["Accruals and Deferrals", "المستحقات والمؤجلات"],
    ["Allocation Drivers", "محركات التوزيع"],
    ["Audit Log", "سجل التدقيق"],
    ["Bank Reconciliation Workbench", "منصة التسوية البنكية"],
    ["Collections Workflow", "مسار التحصيل"],
    ["Dunning Runs", "دفعات المطالبة"],
    ["Custom Report Builder", "منشئ التقارير المخصصة"],
    ["Tax Compliance Center", "مركز الامتثال الضريبي"],
    ["WHT Year-End Statements", "كشوف نهاية السنة للخصم"],
    ["Year-End", "نهاية السنة"],
    ["Total Amount", "المبلغ الإجمالي"],
    ["Net Amount", "صافي المبلغ"],
    ["Gross Amount", "إجمالي المبلغ"],
    ["Opening Balance", "الرصيد الافتتاحي"],
    ["Closing Balance", "الرصيد الختامي"],
    ["As of Date", "بتاريخ"],
    ["Due Date", "تاريخ الاستحقاق"],
    ["Invoice Date", "تاريخ الفاتورة"],
    ["Invoice Number", "رقم الفاتورة"],
    ["Invoice No.", "رقم الفاتورة"],
    ["Invoice No", "رقم الفاتورة"],
    ["Reference No.", "الرقم المرجعي"],
    ["Reference", "المرجع"],
    ["Description", "الوصف"],
    ["Base Currency", "العملة الأساسية"],
    ["Cost Center", "مركز التكلفة"],
    ["Journal No.", "رقم القيد"],
    ["Entry Date", "تاريخ القيد"],
    ["Posting Date", "تاريخ الترحيل"],

    // Single words (nouns / labels)
    ["Save", "حفظ"],
    ["Cancel", "إلغاء"],
    ["Edit", "تعديل"],
    ["Delete", "حذف"],
    ["Add", "إضافة"],
    ["New", "جديد"],
    ["Create", "إنشاء"],
    ["Update", "تحديث"],
    ["Submit", "إرسال"],
    ["Approve", "اعتماد"],
    ["Reject", "رفض"],
    ["Post", "ترحيل"],
    ["Unpost", "إلغاء الترحيل"],
    ["Draft", "مسودة"],
    ["Posted", "مرحّل"],
    ["Pending", "قيد الانتظار"],
    ["Approved", "معتمد"],
    ["Rejected", "مرفوض"],
    ["Completed", "مكتمل"],
    ["Cancelled", "ملغي"],
    ["Active", "نشط"],
    ["Inactive", "غير نشط"],
    ["Issued", "صادر"],
    ["Paid", "مدفوع"],
    ["Unpaid", "غير مدفوع"],
    ["Overdue", "متأخر"],
    ["Search", "بحث"],
    ["Filter", "تصفية"],
    ["Filters", "التصفيات"],
    ["Export", "تصدير"],
    ["Import", "استيراد"],
    ["Download", "تحميل"],
    ["Upload", "رفع"],
    ["Print", "طباعة"],
    ["View", "عرض"],
    ["Details", "تفاصيل"],
    ["Actions", "إجراءات"],
    ["Action", "إجراء"],
    ["Notes", "ملاحظات"],
    ["Note", "ملاحظة"],
    ["Date", "التاريخ"],
    ["Time", "الوقت"],
    ["From", "من"],
    ["To", "إلى"],
    ["Type", "النوع"],
    ["Category", "الفئة"],
    ["Status", "الحالة"],
    ["Amount", "المبلغ"],
    ["Total", "الإجمالي"],
    ["Subtotal", "المجموع الفرعي"],
    ["Balance", "الرصيد"],
    ["Debit", "مدين"],
    ["Credit", "دائن"],
    ["Currency", "العملة"],
    ["Rate", "السعر"],
    ["Quantity", "الكمية"],
    ["Price", "السعر"],
    ["Unit", "الوحدة"],
    ["Tax", "الضريبة"],
    ["VAT", "ضريبة القيمة المضافة"],
    ["Discount", "الخصم"],
    ["Vendor", "المورد"],
    ["Vendors", "الموردون"],
    ["Supplier", "المورد"],
    ["Suppliers", "الموردون"],
    ["Customer", "العميل"],
    ["Customers", "العملاء"],
    ["Client", "العميل"],
    ["Clients", "العملاء"],
    ["Invoice", "فاتورة"],
    ["Invoices", "الفواتير"],
    ["Payment", "الدفع"],
    ["Payments", "المدفوعات"],
    ["Receipt", "الإيصال"],
    ["Receipts", "الإيصالات"],
    ["Account", "الحساب"],
    ["Accounts", "الحسابات"],
    ["Report", "تقرير"],
    ["Reports", "التقارير"],
    ["Company", "الشركة"],
    ["Companies", "الشركات"],
    ["Station", "المحطة"],
    ["Stations", "المحطات"],
    ["Location", "الموقع"],
    ["Custodian", "أمين العهدة"],
    ["Bank", "البنك"],
    ["Cash", "النقدية"],
    ["Cheque", "شيك"],
    ["Check", "شيك"],
    ["Transfer", "تحويل"],
    ["Transfers", "التحويلات"],
    ["Deposit", "إيداع"],
    ["Withdrawal", "سحب"],
    ["Voucher", "سند"],
    ["Vouchers", "السندات"],
    ["Ledger", "دفتر الأستاذ"],
    ["Period", "الفترة"],
    ["Year", "السنة"],
    ["Month", "الشهر"],
    ["Quarter", "الربع"],
    ["Week", "الأسبوع"],
    ["Weekly", "أسبوعي"],
    ["Monthly", "شهري"],
    ["Yearly", "سنوي"],
    ["Daily", "يومي"],
    ["Loading", "جارٍ التحميل"],
    ["Loading…", "جارٍ التحميل…"],
    ["Loading...", "جارٍ التحميل..."],
    ["No data", "لا توجد بيانات"],
    ["No records", "لا توجد سجلات"],
    ["No results", "لا توجد نتائج"],
    ["Yes", "نعم"],
    ["No", "لا"],
    ["OK", "موافق"],
    ["Close", "إغلاق"],
    ["Back", "رجوع"],
    ["Next", "التالي"],
    ["Previous", "السابق"],
    ["Settings", "الإعدادات"],
    ["Refresh", "تحديث"],
    ["Reset", "إعادة تعيين"],
    ["Clear", "مسح"],
    ["Confirm", "تأكيد"],
    ["Grade", "التقدير"],
    ["Score", "الدرجة"],
    ["Quality", "الجودة"],
    ["Delivery", "التسليم"],
    ["Compliance", "الامتثال"],
    ["Communication", "التواصل"],
    ["History", "السجل"],
    ["Overview", "نظرة عامة"],
    ["Summary", "الملخص"],
    ["Dashboard", "لوحة المعلومات"],
    ["Home", "الرئيسية"],
  ] as Array<[string, string]>
).map(([en, ar]) => [
  // Word-boundary match, case-insensitive, escaping regex metachars
  new RegExp(`(?<![\\p{L}\\p{N}])(${en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![\\p{L}\\p{N}])`, "giu"),
  ar,
]);

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "INPUT", "SELECT", "OPTION"]);

function translateText(text: string): string {
  let out = text;
  for (const [re, ar] of DICTIONARY) out = out.replace(re, ar);
  return out;
}

function shouldSkip(node: Node): boolean {
  let el: Node | null = node;
  while (el) {
    if (el.nodeType === 1) {
      const e = el as HTMLElement;
      if (SKIP_TAGS.has(e.tagName)) return true;
      if (e.hasAttribute?.("data-no-translate")) return true;
      if (e.getAttribute?.("contenteditable") === "true") return true;
    }
    el = el.parentNode;
  }
  return false;
}

function walk(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (shouldSkip(n)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  let cur: Node | null;
  while ((cur = walker.nextNode())) nodes.push(cur as Text);
  for (const t of nodes) {
    const original = t.nodeValue!;
    const translated = translateText(original);
    if (translated !== original) t.nodeValue = translated;
  }
  // Also translate placeholder / title / aria-label / value on buttons where applicable
  if (root.nodeType === 1) {
    const el = root as HTMLElement;
    const all = el.matches?.("*") ? [el, ...Array.from(el.querySelectorAll("*"))] : Array.from(el.querySelectorAll?.("*") ?? []);
    for (const node of all) {
      if (SKIP_TAGS.has(node.tagName) && node.tagName !== "INPUT") continue;
      if ((node as HTMLElement).hasAttribute?.("data-no-translate")) continue;
      const ph = node.getAttribute?.("placeholder");
      if (ph) {
        const t = translateText(ph);
        if (t !== ph) node.setAttribute("placeholder", t);
      }
      const tt = node.getAttribute?.("title");
      if (tt) {
        const t = translateText(tt);
        if (t !== tt) node.setAttribute("title", t);
      }
      const al = node.getAttribute?.("aria-label");
      if (al) {
        const t = translateText(al);
        if (t !== al) node.setAttribute("aria-label", t);
      }
    }
  }
}

let observer: MutationObserver | null = null;
let scheduled = false;
const pending = new Set<Node>();

function flush() {
  scheduled = false;
  const nodes = Array.from(pending);
  pending.clear();
  for (const n of nodes) {
    if (n.isConnected) walk(n);
  }
}
function schedule(n: Node) {
  pending.add(n);
  if (!scheduled) {
    scheduled = true;
    (window.requestIdleCallback ?? window.requestAnimationFrame)(flush as any);
  }
}

function enable() {
  if (observer) return;
  walk(document.body);
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "childList") {
        m.addedNodes.forEach((n) => schedule(n));
      } else if (m.type === "characterData" && m.target) {
        schedule(m.target.parentNode ?? m.target);
      } else if (m.type === "attributes" && m.target) {
        schedule(m.target);
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["placeholder", "title", "aria-label"],
  });
}

function disable() {
  if (!observer) return;
  observer.disconnect();
  observer = null;
  // Note: existing translated text remains until next reload; that's fine.
}

export function initArabicOverlay() {
  const apply = (lng: string) => {
    if (lng === "ar") enable();
    else disable();
  };
  apply(i18n.language || "en");
  i18n.on("languageChanged", apply);
}
