import type { NavPage, Position } from '../src/types';

/** Fictional brands, one per industry, each with a site map and a look. Icons are Lucide names. */
export interface Industry {
  id: string;
  name: string;
  icon: string;
  brand: string;
  domain: string;
  logo: string;
  dark: boolean;
  accent: string;
  design: string;
  position: Position;
  meta: string;
  eyebrow: string;
  headline: string;
  lede: string;
  art: string;
  highlights: [string, string][];
  pages: NavPage[];
}

export const INDUSTRIES: Industry[] = [
  {
    id: 'restaurant',
    name: 'Restaurant',
    icon: 'UtensilsCrossed',
    brand: 'Osteria Lume',
    domain: 'osterialume.example',
    logo: 'Flame',
    dark: false,
    accent: '#b5532d',
    design: 'paper',
    position: 'bottom',
    meta: 'Open tonight · 18:00 – 23:30',
    eyebrow: 'Via del Forno 12',
    headline: 'Seasonal Italian cooking, wood-fired since 1998.',
    lede: 'Handmade pasta every morning, a short menu that changes with the market, and a wine list that leans natural.',
    art: `<ol class="menu-art">
      <li><span>Burrata, blood orange, fennel</span><i></i><b>14</b></li>
      <li><span>Tagliatelle al ragù bianco</span><i></i><b>19</b></li>
      <li><span>Hake, chickpeas, salsa verde</span><i></i><b>26</b></li>
      <li><span>Olive oil cake, mascarpone</span><i></i><b>9</b></li>
    </ol>`,
    highlights: [
      ['Lunch on weekends', 'A four-course menu del giorno, Saturdays and Sundays from noon.'],
      ['Private dining', 'The cellar room seats up to 18 under the old brick vaults.'],
      ['Cooking classes', 'Learn our pasta doughs on the first Monday of every month.'],
    ],
    pages: [
      { label: 'Home', href: '/', icon: 'House' },
      {
        label: 'Menu',
        href: '/menu',
        icon: 'UtensilsCrossed',
        description: 'Seasonal, changes weekly',
        children: [
          { label: 'Antipasti', href: '/menu/antipasti', icon: 'Salad' },
          {
            label: 'Pasta',
            href: '/menu/pasta',
            icon: 'Wheat',
            children: [
              { label: 'Fresh pasta', href: '/menu/pasta/fresh', icon: 'ChefHat' },
              { label: 'Ragù & sauces', href: '/menu/pasta/ragu', icon: 'CookingPot' },
              { label: 'Gluten-free', href: '/menu/pasta/gluten-free', icon: 'WheatOff' },
            ],
          },
          { label: 'Secondi', href: '/menu/secondi', icon: 'Beef' },
          { label: 'Dolci', href: '/menu/dolci', icon: 'CakeSlice' },
          { label: 'Wine', href: '/menu/wine', icon: 'Wine' },
        ],
      },
      { label: 'Reserve', href: '/reserve', icon: 'CalendarCheck', description: 'Book a table for tonight' },
      {
        label: 'Visit',
        href: '/visit',
        icon: 'MapPin',
        children: [
          { label: 'Hours', href: '/visit/hours', icon: 'Clock' },
          { label: 'Directions', href: '/visit/directions', icon: 'Navigation' },
          { label: 'Private dining', href: '/visit/private-dining', icon: 'Users' },
        ],
      },
      { label: 'Gift cards', href: '/gift-cards', icon: 'Gift' },
      { label: 'Our story', href: '/story', icon: 'BookOpen' },
    ],
  },
  {
    id: 'fashion',
    name: 'Fashion',
    icon: 'Shirt',
    brand: 'NOIR/BLANC',
    domain: 'noirblanc.example',
    logo: 'Scissors',
    dark: false,
    accent: '#0a0a0a',
    design: 'mono',
    position: 'right',
    meta: 'Free returns · 30 days',
    eyebrow: 'Autumn – Winter 26',
    headline: 'Quiet clothes for loud cities.',
    lede: 'Wool, cotton and nothing else. Cut in our atelier, made to be worn for a decade.',
    art: `<div class="looks"><figure><span></span><figcaption>Look 01</figcaption></figure><figure><span></span><figcaption>Look 02</figcaption></figure><figure><span></span><figcaption>Look 03</figcaption></figure></div>`,
    highlights: [
      ['The coat edit', 'Twelve shapes in double-faced wool, from cocoon to trench.'],
      ['Atelier service', 'Free tailoring on every full-price piece, for life.'],
      ['Archive sale', 'Past seasons, one weekend only, in our Paris store.'],
    ],
    pages: [
      { label: 'New in', href: '/new', icon: 'Sparkles' },
      {
        label: 'Women',
        href: '/women',
        icon: 'Shirt',
        children: [
          { label: 'Coats', href: '/women/coats', icon: 'Snowflake' },
          { label: 'Knitwear', href: '/women/knitwear', icon: 'Shirt' },
          { label: 'Shoes', href: '/women/shoes', icon: 'Footprints' },
          {
            label: 'Accessories',
            href: '/women/accessories',
            icon: 'Gem',
            children: [
              { label: 'Eyewear', href: '/women/accessories/eyewear', icon: 'Glasses' },
              { label: 'Watches', href: '/women/accessories/watches', icon: 'Watch' },
              { label: 'Jewellery', href: '/women/accessories/jewellery', icon: 'Gem' },
            ],
          },
        ],
      },
      {
        label: 'Men',
        href: '/men',
        icon: 'Shirt',
        children: [
          { label: 'Tailoring', href: '/men/tailoring', icon: 'Scissors' },
          { label: 'Knitwear', href: '/men/knitwear', icon: 'Shirt' },
          { label: 'Shoes', href: '/men/shoes', icon: 'Footprints' },
        ],
      },
      {
        label: 'Collections',
        href: '/collections',
        icon: 'Layers',
        children: [
          { label: 'AW26', href: '/collections/aw26', icon: 'Snowflake' },
          { label: 'Atelier', href: '/collections/atelier', icon: 'Scissors' },
          { label: 'Archive', href: '/collections/archive', icon: 'Archive' },
        ],
      },
      { label: 'Stores', href: '/stores', icon: 'Store' },
      { label: 'Bag', href: '/bag', icon: 'ShoppingBag' },
    ],
  },
  {
    id: 'saas',
    name: 'SaaS',
    icon: 'Boxes',
    brand: 'Flowbase',
    domain: 'flowbase.example',
    logo: 'Workflow',
    dark: true,
    accent: '#8b5cf6',
    design: 'neon',
    position: 'bottom-right',
    meta: 'v4.2 is live →',
    eyebrow: 'Automation platform',
    headline: 'Ship workflows, not tickets.',
    lede: 'Connect your tools, describe the process once, and let Flowbase run it — with logs, retries and approvals built in.',
    art: `<dl class="metrics"><div><dt>Runs per day</dt><dd>2.4M</dd></div><div><dt>Median latency</dt><dd>38ms</dd></div><div><dt>Uptime</dt><dd>99.99%</dd></div></dl>`,
    highlights: [
      ['Visual builder', 'Drag steps, branch on conditions, test against real payloads.'],
      ['Audit everything', 'Every run is replayable, diffable and exportable.'],
      ['Self-host', 'One container, your cloud, the same features.'],
    ],
    pages: [
      {
        label: 'Product',
        href: '/product',
        icon: 'Boxes',
        children: [
          { label: 'Automations', href: '/product/automations', icon: 'Workflow' },
          {
            label: 'Integrations',
            href: '/product/integrations',
            icon: 'Plug',
            children: [
              { label: 'Chat apps', href: '/product/integrations/chat', icon: 'MessageSquare' },
              { label: 'Warehouses', href: '/product/integrations/warehouses', icon: 'Database' },
              { label: 'Webhooks', href: '/product/integrations/webhooks', icon: 'Webhook' },
            ],
          },
          { label: 'Analytics', href: '/product/analytics', icon: 'ChartLine' },
          { label: 'Security', href: '/product/security', icon: 'ShieldCheck' },
        ],
      },
      {
        label: 'Solutions',
        href: '/solutions',
        icon: 'Lightbulb',
        children: [
          { label: 'Startups', href: '/solutions/startups', icon: 'Rocket' },
          { label: 'Enterprise', href: '/solutions/enterprise', icon: 'Building2' },
          { label: 'Agencies', href: '/solutions/agencies', icon: 'Briefcase' },
        ],
      },
      {
        label: 'Docs',
        href: '/docs',
        icon: 'BookOpen',
        children: [
          { label: 'Quickstart', href: '/docs/quickstart', icon: 'Zap' },
          { label: 'API reference', href: '/docs/api', icon: 'Code' },
          { label: 'SDKs', href: '/docs/sdks', icon: 'Package' },
        ],
      },
      { label: 'Pricing', href: '/pricing', icon: 'Tag', description: 'Free up to 10k runs' },
      { label: 'Changelog', href: '/changelog', icon: 'History' },
      { label: 'Sign in', href: '/login', icon: 'LogIn' },
    ],
  },
  {
    id: 'health',
    name: 'Healthcare',
    icon: 'Stethoscope',
    brand: 'Harbor Health',
    domain: 'harborhealth.example',
    logo: 'HeartPulse',
    dark: false,
    accent: '#0f8b8d',
    design: 'soft',
    position: 'bottom-left',
    meta: 'Urgent? Call 0800 123 456',
    eyebrow: 'Family practice & clinics',
    headline: 'Care that comes to you.',
    lede: 'Same-day appointments, video visits in minutes, and one record that follows you between every clinic.',
    art: `<div class="next-slot"><span>Next available</span><strong>Today, 14:20</strong><em>Dr. Amira Haddad · Primary care</em></div>`,
    highlights: [
      ['Video visits', 'See a clinician from home, usually within 15 minutes.'],
      ['Lab results online', 'Results land in your portal with a plain-language summary.'],
      ['Seven clinics', 'Walk in, or book ahead — your record is already there.'],
    ],
    pages: [
      { label: 'Book a visit', href: '/book', icon: 'CalendarPlus', description: 'Same-day appointments' },
      {
        label: 'Services',
        href: '/services',
        icon: 'Stethoscope',
        children: [
          { label: 'Primary care', href: '/services/primary', icon: 'HeartPulse' },
          { label: 'Children', href: '/services/children', icon: 'Baby' },
          { label: 'Mental health', href: '/services/mental-health', icon: 'Brain' },
          {
            label: 'Lab tests',
            href: '/services/lab',
            icon: 'FlaskConical',
            children: [
              { label: 'Blood work', href: '/services/lab/blood', icon: 'Droplet' },
              { label: 'Imaging', href: '/services/lab/imaging', icon: 'ScanLine' },
              { label: 'Results', href: '/services/lab/results', icon: 'FileText' },
            ],
          },
        ],
      },
      { label: 'Find a doctor', href: '/doctors', icon: 'UserSearch' },
      { label: 'Locations', href: '/locations', icon: 'MapPin' },
      {
        label: 'My health',
        href: '/portal',
        icon: 'ClipboardList',
        children: [
          { label: 'Messages', href: '/portal/messages', icon: 'MessageCircle' },
          { label: 'Prescriptions', href: '/portal/prescriptions', icon: 'Pill' },
          { label: 'Billing', href: '/portal/billing', icon: 'Receipt' },
        ],
      },
      {
        label: 'Urgent care',
        href: '/urgent',
        icon: 'Siren',
        color: '#d64545',
        description: 'Open 24/7, no appointment',
      },
    ],
  },
  {
    id: 'realestate',
    name: 'Real estate',
    icon: 'Building',
    brand: 'Atlas & Vale',
    domain: 'atlasvale.example',
    logo: 'Crown',
    dark: true,
    accent: '#c8a96a',
    design: 'luxe',
    position: 'inline',
    meta: '',
    eyebrow: 'Private residences',
    headline: 'Homes with a sense of place.',
    lede: 'A small portfolio of exceptional houses, represented by people who know every street they sell on.',
    art: `<div class="arch"><span>Featured</span><strong>The Old Rectory</strong><em>1,240 m² · 6 bedrooms · 2 acres</em></div>`,
    highlights: [
      ['Off-market first', 'Two thirds of our homes sell before they are ever listed.'],
      ['Valuations', 'A considered price within 48 hours, from a partner, not an algorithm.'],
      ['After the keys', 'Introductions to architects, schools and the best local builders.'],
    ],
    pages: [
      {
        label: 'Buy',
        href: '/buy',
        icon: 'KeyRound',
        children: [
          { label: 'Penthouses', href: '/buy/penthouses', icon: 'Building' },
          { label: 'Townhouses', href: '/buy/townhouses', icon: 'House' },
          { label: 'Country estates', href: '/buy/country', icon: 'Trees' },
          { label: 'New builds', href: '/buy/new', icon: 'Hammer' },
        ],
      },
      {
        label: 'Rent',
        href: '/rent',
        icon: 'Key',
        children: [
          { label: 'Long let', href: '/rent/long', icon: 'CalendarRange' },
          { label: 'Furnished', href: '/rent/furnished', icon: 'Sofa' },
        ],
      },
      {
        label: 'Sell',
        href: '/sell',
        icon: 'HandCoins',
        children: [
          { label: 'Valuation', href: '/sell/valuation', icon: 'Calculator' },
          { label: 'How we sell', href: '/sell/how', icon: 'Megaphone' },
        ],
      },
      { label: 'Neighbourhoods', href: '/areas', icon: 'Map' },
      { label: 'Journal', href: '/journal', icon: 'Newspaper' },
      { label: 'Contact', href: '/contact', icon: 'Phone' },
    ],
  },
  {
    id: 'docs',
    name: 'Developer docs',
    icon: 'SquareTerminal',
    brand: 'kern',
    domain: 'kern.example',
    logo: 'SquareTerminal',
    dark: true,
    accent: '#39ff88',
    design: 'circuit',
    position: 'left',
    meta: 'v3.2 · MIT',
    eyebrow: 'Documentation',
    headline: 'A build tool that stays out of the way.',
    lede: 'Zero-config builds, incremental by default, with a plugin API small enough to read in one sitting.',
    art: `<pre class="term"><span>$</span> npm i -g kern
<span>$</span> kern init my-app
<i>✓ created my-app (0.4s)</i>
<span>$</span> kern run dev
<i>▲ ready on http://localhost:4000</i></pre>`,
    highlights: [
      ['Incremental', 'Only rebuild what changed — cold builds under a second for most apps.'],
      ['Plugins', 'Three hooks, typed end to end, no magic.'],
      ['Reproducible', 'Lockfile-aware caching you can share across CI runs.'],
    ],
    pages: [
      {
        label: 'Getting started',
        href: '/start',
        icon: 'Rocket',
        children: [
          { label: 'Install', href: '/start/install', icon: 'Download' },
          { label: 'First project', href: '/start/first-project', icon: 'FolderPlus' },
          { label: 'Configuration', href: '/start/config', icon: 'SlidersHorizontal' },
        ],
      },
      {
        label: 'Guides',
        href: '/guides',
        icon: 'BookOpen',
        children: [
          { label: 'Deploying', href: '/guides/deploy', icon: 'CloudUpload' },
          { label: 'Testing', href: '/guides/testing', icon: 'FlaskConical' },
          {
            label: 'Plugins',
            href: '/guides/plugins',
            icon: 'Puzzle',
            children: [
              { label: 'Write a plugin', href: '/guides/plugins/write', icon: 'PenLine' },
              { label: 'Plugin API', href: '/guides/plugins/api', icon: 'Braces' },
            ],
          },
        ],
      },
      {
        label: 'CLI',
        href: '/cli',
        icon: 'Terminal',
        children: [
          { label: 'kern init', href: '/cli/init', icon: 'SquareTerminal' },
          { label: 'kern build', href: '/cli/build', icon: 'Hammer' },
          { label: 'kern run', href: '/cli/run', icon: 'Play' },
        ],
      },
      { label: 'Changelog', href: '/changelog', icon: 'GitCommitHorizontal' },
      { label: 'Community', href: '/community', icon: 'MessagesSquare' },
      { label: 'Source', href: '/source', icon: 'GitBranch' },
    ],
  },
  {
    id: 'agency',
    name: 'Creative agency',
    icon: 'PenTool',
    brand: 'OFFBEAT',
    domain: 'offbeat.example',
    logo: 'Shapes',
    dark: false,
    accent: '#ffd60a',
    design: 'brutal',
    position: 'center',
    meta: 'Now booking Q1',
    eyebrow: 'Independent studio',
    headline: 'We make brands impossible to scroll past.',
    lede: 'Identity, web and motion for companies that would rather be remembered than liked.',
    art: `<div class="sticker">Hold the button →</div>`,
    highlights: [
      ['Branding', 'Names, marks and systems that survive a thousand templates.'],
      ['Web', 'Sites with one idea, executed loudly.'],
      ['Motion', 'Launch films, loops and everything in between.'],
    ],
    pages: [
      {
        label: 'Work',
        href: '/work',
        icon: 'Briefcase',
        children: [
          { label: 'Branding', href: '/work/branding', icon: 'PenTool' },
          { label: 'Web', href: '/work/web', icon: 'Globe' },
          { label: 'Motion', href: '/work/motion', icon: 'Clapperboard' },
          { label: 'Campaigns', href: '/work/campaigns', icon: 'Megaphone' },
        ],
      },
      {
        label: 'Studio',
        href: '/studio',
        icon: 'Users',
        children: [
          { label: 'Team', href: '/studio/team', icon: 'Smile' },
          { label: 'Careers', href: '/studio/careers', icon: 'Rocket' },
        ],
      },
      { label: 'Services', href: '/services', icon: 'Layers' },
      { label: 'Playground', href: '/playground', icon: 'Shapes' },
      { label: 'Contact', href: '/contact', icon: 'Mail' },
    ],
  },
  {
    id: 'finance',
    name: 'Banking',
    icon: 'Landmark',
    brand: 'Ledgerly',
    domain: 'ledgerly.example',
    logo: 'Landmark',
    dark: false,
    accent: '#1f6feb',
    design: 'solid',
    position: 'top-right',
    meta: '',
    eyebrow: 'Good afternoon, Sam',
    headline: '€12,480.55',
    lede: 'Available across 3 accounts · up €320 this month',
    art: `<svg class="spark" viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 62 L30 58 L60 64 L90 50 L120 54 L150 40 L180 44 L210 30 L240 34 L270 18 L300 22"/></svg>`,
    highlights: [
      ['Rent', 'Scheduled for the 1st · €1,150.00'],
      ['Groceries', 'This month · €286.40 of €400'],
      ['Holiday pot', 'Savings · €2,040.00 · 68% of goal'],
    ],
    pages: [
      { label: 'Overview', href: '/', icon: 'LayoutDashboard' },
      {
        label: 'Accounts',
        href: '/accounts',
        icon: 'Wallet',
        children: [
          { label: 'Current', href: '/accounts/current', icon: 'Landmark' },
          { label: 'Savings', href: '/accounts/savings', icon: 'PiggyBank' },
          { label: 'Joint', href: '/accounts/joint', icon: 'Users' },
        ],
      },
      {
        label: 'Cards',
        href: '/cards',
        icon: 'CreditCard',
        children: [
          { label: 'Freeze card', href: '/cards/freeze', icon: 'Snowflake' },
          { label: 'Limits', href: '/cards/limits', icon: 'Gauge' },
          { label: 'Virtual cards', href: '/cards/virtual', icon: 'Smartphone' },
        ],
      },
      {
        label: 'Payments',
        href: '/payments',
        icon: 'ArrowLeftRight',
        children: [
          { label: 'Send', href: '/payments/send', icon: 'Send' },
          { label: 'Request', href: '/payments/request', icon: 'HandCoins' },
          { label: 'Scheduled', href: '/payments/scheduled', icon: 'CalendarClock' },
          { label: 'Bills', href: '/payments/bills', icon: 'Receipt' },
        ],
      },
      { label: 'Invest', href: '/invest', icon: 'TrendingUp' },
      { label: 'Help', href: '/help', icon: 'LifeBuoy' },
    ],
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: 'Compass',
    brand: 'Solace',
    domain: 'solace.example',
    logo: 'Sun',
    dark: false,
    accent: '#e07a5f',
    design: 'glass',
    position: 'top',
    meta: 'Coastal retreats',
    eyebrow: 'Slow travel',
    headline: 'Stay longer. Do less. Come back different.',
    lede: 'Hand-picked villas, cabins and small hotels by the sea, with nothing on the schedule unless you want it.',
    art: `<div class="sunset"><span class="sun"></span><span class="sea"></span></div>`,
    highlights: [
      ['Week-long stays', 'Seven nights for the price of six, all autumn.'],
      ['Local hosts', 'Every stay comes with someone who knows the good beach.'],
      ['By train', 'Most of our places are a scenic rail journey away.'],
    ],
    pages: [
      {
        label: 'Destinations',
        href: '/destinations',
        icon: 'Compass',
        children: [
          {
            label: 'Coast',
            href: '/destinations/coast',
            icon: 'Waves',
            children: [
              { label: 'Algarve', href: '/destinations/coast/algarve', icon: 'Sun' },
              { label: 'Cornwall', href: '/destinations/coast/cornwall', icon: 'Waves' },
              { label: 'Amalfi', href: '/destinations/coast/amalfi', icon: 'Sailboat' },
            ],
          },
          { label: 'Mountains', href: '/destinations/mountains', icon: 'Mountain' },
          { label: 'Islands', href: '/destinations/islands', icon: 'TreePalm' },
        ],
      },
      {
        label: 'Stays',
        href: '/stays',
        icon: 'BedDouble',
        children: [
          { label: 'Villas', href: '/stays/villas', icon: 'House' },
          { label: 'Cabins', href: '/stays/cabins', icon: 'Tent' },
          { label: 'Small hotels', href: '/stays/hotels', icon: 'Hotel' },
        ],
      },
      {
        label: 'Experiences',
        href: '/experiences',
        icon: 'Sailboat',
        children: [
          { label: 'Sailing', href: '/experiences/sailing', icon: 'Sailboat' },
          { label: 'Cooking', href: '/experiences/cooking', icon: 'ChefHat' },
          { label: 'Wellness', href: '/experiences/wellness', icon: 'Flower2' },
        ],
      },
      { label: 'Offers', href: '/offers', icon: 'Percent' },
      { label: 'My trips', href: '/trips', icon: 'Luggage' },
      { label: 'Help', href: '/help', icon: 'CircleHelp' },
    ],
  },
];

export const industryById = (id: string) => INDUSTRIES.find((i) => i.id === id) ?? INDUSTRIES[0];
