// All landing-page copy lives here so it can be edited without touching the layout code.
// Every statement describes something the application actually does today, except items
// explicitly marked as coming soon.

export const CONTACT = {
  email: 'roxasprince1422@gmail.com',
  phoneDisplay: '0936 089 8100',
  phoneHref: 'tel:+639360898100',
  subject: 'Business Performance CRM inquiry',
};
export const mailtoHref = `mailto:${CONTACT.email}?subject=${encodeURIComponent(CONTACT.subject)}`;
// Opens a Gmail compose window for people who do not have a desktop mail app set up.
export const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT.email)}&su=${encodeURIComponent(CONTACT.subject)}`;

export const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#roles', label: 'Roles' },
  { href: '#about', label: 'About' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contact', label: 'Contact' },
];

// The invoice walk-through in the hero. Amounts are whole pesos in an example invoice.
export const INVOICE_TOTAL = 50000;
export const JOURNEY = [
  { key: 'draft', tab: 'Draft', status: 'Draft', actor: 'Sales', revenue: 0, cash: 0,
    note: 'Sales drafts the invoice. A draft is not revenue yet, so every figure stays at zero.', action: 'Issue the invoice' },
  { key: 'issued', tab: 'Issued', status: 'Issued', actor: 'Finance', revenue: 50000, cash: 0,
    note: 'Finance issues it. Revenue is counted on the issue date, but no cash has arrived, so the full amount is owed to you.', action: 'Record a ₱20,000 payment' },
  { key: 'part', tab: 'Part paid', status: 'Partly paid', actor: 'Finance', revenue: 50000, cash: 20000,
    note: 'A partial payment lands. Cash rises, and what is still owed drops by the same amount.', action: 'Record the ₱30,000 balance' },
  { key: 'paid', tab: 'Paid', status: 'Paid', actor: 'Finance', revenue: 50000, cash: 50000,
    note: 'Paid in full. Revenue and cash now agree, and nothing is outstanding.', action: 'Start over' },
];

export const FEATURE_GROUPS = [
  {
    id: 'sales', icon: 'users', title: 'Sell', blurb: 'Customers to quotations',
    items: [
      { name: 'Customers', text: 'One searchable record per customer, with an owner on your team.' },
      { name: 'Leads', text: 'Track new, contacted and qualified leads, then convert one into a customer in a click.' },
      { name: 'Pipeline', text: 'Move opportunities from prospecting to won or lost, with the value of each stage.' },
      { name: 'Quotations', text: 'Numbered quotes with a status, so you know which are waiting on an answer.' },
      { name: 'Sales targets', text: 'Set a company target or one per person and watch progress against actual sales.' },
    ],
  },
  {
    id: 'money', icon: 'receipt', title: 'Get paid', blurb: 'Invoices to cash',
    items: [
      { name: 'Invoices', text: 'Draft, issue, collect or void. Status follows the money: paid, partly paid or overdue.' },
      { name: 'Payments and refunds', text: 'Record partial payments and refunds against the invoice. A double-clicked submit never records money twice.' },
      { name: 'Expenses', text: 'Log expenses, approve them, then mark them paid so profit reflects real spending.' },
      { name: 'Receivables', text: 'See what customers still owe and which invoices are past due.' },
      { name: 'Cash flow', text: 'Cash received against cash paid out, separate from revenue and expenses.' },
    ],
  },
  {
    id: 'insight', icon: 'chart', title: 'Understand', blurb: 'Dashboard and reports',
    items: [
      { name: 'Executive dashboard', text: 'Revenue, expenses, net profit and margin, with growth compared to the previous period.' },
      { name: 'Alerts', text: 'Overdue invoices, negative cash flow and losses surface on their own.' },
      { name: 'Reports and CSV export', text: 'Sales and financial reports whose totals match the rows shown. CSV export is available on plans that include it.' },
      { name: 'Investments and ROI', text: 'Record what you spent on a campaign or equipment, attach the returns, and see the ROI.' },
    ],
  },
  {
    id: 'control', icon: 'shield', title: 'Stay in control', blurb: 'Access and safety',
    items: [
      { name: 'Roles', text: 'CEO/COO, Finance and Sales each see and change only what their job needs. The server enforces it.' },
      { name: 'Audit trail', text: 'Sensitive actions such as payments, refunds and role changes are logged.' },
      { name: 'Separate workspaces', text: 'Every company’s data is isolated from every other company’s.' },
      { name: 'Plans and limits', text: 'A 14-day trial, plan limits on users, customers and invoices, and a read-only mode when a plan lapses.' },
      { name: 'Light and dark themes', text: 'Follow your device setting or choose one yourself.' },
    ],
  },
];

export const HANDOFF = [
  { who: 'Sales', title: 'Draft the invoice', text: 'Add the customer, then draft the invoice for what was sold.' },
  { who: 'Finance', title: 'Issue it', text: 'Finance reviews and issues the invoice. Revenue is counted from the issue date.' },
  { who: 'Finance', title: 'Record payments', text: 'As money arrives, record it. Partial payments and refunds are supported.' },
  { who: 'CEO/COO', title: 'Read the dashboard', text: 'Revenue, profit, cash and receivables update from the same records you can open.' },
];

export const ROLE_COLUMNS = ['CEO/COO', 'Finance', 'Sales'];
export const ROLE_ROWS = [
  { what: 'Dashboard', cells: ['Whole company', 'Financial view', 'Own sales'] },
  { what: 'Customers, leads and pipeline', cells: ['View', 'View customers', 'Create and edit'] },
  { what: 'Quotations', cells: ['View', null, 'Create and edit'] },
  { what: 'Invoices', cells: ['View', 'Create, issue, void', 'Create drafts'] },
  { what: 'Payments and refunds', cells: ['View', 'Record', null] },
  { what: 'Expenses', cells: ['View', 'Manage', null] },
  { what: 'Investments and ROI', cells: ['Manage', 'Manage', null] },
  { what: 'Sales targets', cells: ['Set', null, 'View own'] },
  { what: 'Reports', cells: ['All reports', 'Financial reports', 'Sales reports'] },
  { what: 'CSV export', cells: ['Yes, on supported plans', 'Yes, on supported plans', null] },
  { what: 'Team and subscription', cells: ['Manage', 'View plan', null] },
  { what: 'Audit trail', cells: ['Everything', 'Financial entries', null] },
];

export const AI_SEES = ['Revenue, expenses and profit totals', 'Receivables and cash flow', 'Pipeline value and win rate', 'Progress against targets'];
export const AI_NEVER = ['Customer names, emails or phone numbers', 'Invoice numbers or team member names'];

export const ABOUT_PRINCIPLES = [
  'Money is calculated in whole cents, never with floating-point numbers.',
  'The server decides who you are and which company you belong to, not the browser.',
  'Sensitive actions are logged, and each log entry records who did what.',
  'An empty workspace says it is empty. It never shows invented numbers.',
];
export const BUILT_WITH = ['React', 'Vite', 'Tailwind CSS', 'Node.js', 'Express', 'MySQL'];

export const FAQ = [
  { q: 'Is there a free trial?', a: 'Yes. A new workspace starts with a 14-day trial. If the plan later lapses, your data stays visible and the workspace becomes read-only until it is reactivated.' },
  { q: 'Can customers pay through the system?', a: 'Not yet. Your Finance team records each payment when the money arrives. There is no online payment gateway.' },
  { q: 'Can other companies see my data?', a: 'No. Every record belongs to one company, and the server checks that on every request.' },
  { q: 'Which AI providers will the advisor work with?', a: 'OpenAI, Anthropic (Claude) and Google (Gemini), using an API key from your own account. A paid ChatGPT, Claude or Gemini subscription is separate from API access, so a key has to be created in the provider’s developer console.' },
  { q: 'Is this accounting software?', a: 'No. It is built for management reporting: one currency per company, no tax handling and no double-entry bookkeeping. Keep your accountant for statutory books.' },
  { q: 'Can I export my reports?', a: 'Yes, as CSV, on plans that include exports.' },
];
