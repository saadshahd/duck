/**
 * The 8 Almond pages (sp-64 §1, §7.1) — the same ~14 organisms recomposed, NOT fixed
 * templates. Personal + Business landings are the sketch-proven pair (⑤); the other six are
 * low-risk recompositions. Range-maker organisms (Hero, FeatureGrid, StatBand,
 * ProductShowcase, TestimonialSection, CTABand, LogoCloud, RateWidget) read Personal↔Business
 * by theme + content only. Mixed-theme is legal and demonstrated (§7.1): the Personal landing
 * closes with a Business-themed CTABand.
 *
 * Content is authored id-free through the small builders below; `almondPage` mints
 * deterministic ids (see `page.ts`). The builders are the DRY seam for the leaf nodes each
 * page repeats — a raw `{ type: "Button", props: {...} }` restated dozens of times is the
 * duplicated concept they remove.
 */

import type { ThemeName } from "../tokens/themes";
import { type AlmondPage, type BareComponent, almondPage } from "./page";
import type { HeaderContent } from "../chrome/header";
import type { FooterContent } from "../chrome/footer";

// --- Content builders (module-local; the leaf/organism nodes pages repeat) ---

type ButtonVariant = "primary" | "secondary" | "ghost";
type Density = "comfortable" | "compact";
type Presentation = "full-card" | "compact-row";

const heading = (text: string, level: 1 | 2 | 3 | 4 = 2): BareComponent => ({
  type: "Heading",
  props: { text, level },
});
const text = (value: string): BareComponent => ({
  type: "Text",
  props: { text: value },
});
const prose = (body: string): BareComponent => ({
  type: "Prose",
  props: { body },
});
const button = (
  label: string,
  variant: ButtonVariant = "primary",
  href = "#",
): BareComponent => ({ type: "Button", props: { label, href, variant } });
const appBadges = (): BareComponent => ({
  type: "AppStoreBadges",
  props: { appStoreHref: "#", playStoreHref: "#" },
});
const feature = (
  icon: string,
  heading: string,
  text: string,
): BareComponent => ({ type: "FeatureItem", props: { icon, heading, text } });
const stat = (value: string, label: string): BareComponent => ({
  type: "StatItem",
  props: { value, label },
});
const step = (heading: string, text: string): BareComponent => ({
  type: "StepItem",
  props: { heading, text },
});
const quote = (quote: string, author: string): BareComponent => ({
  type: "Testimonial",
  props: { quote, author, avatar: "" },
});
const cert = (icon: string, label: string): BareComponent => ({
  type: "Certification",
  props: { icon, label },
});
const logo = (alt: string): BareComponent => ({
  type: "LogoItem",
  props: { image: "", alt },
});
const faq = (question: string, answer: string): BareComponent => ({
  type: "FaqItem",
  props: { question, answer },
});
const product = (
  productId: string,
  presentation: Presentation = "full-card",
): BareComponent => ({
  type: "ProductSummary",
  props: { productId, presentation },
});

const hero = (
  theme: ThemeName,
  copy: {
    eyebrow: string;
    headline: string;
    subhead: string;
    actions: BareComponent[];
    media?: { src: string; alt: string };
  },
): BareComponent => ({
  type: "Hero",
  props: {
    theme,
    eyebrow: copy.eyebrow,
    headline: copy.headline,
    subhead: copy.subhead,
    media: copy.media ?? { src: "", alt: "" },
    actions: copy.actions,
  },
});
const collection = (
  type: string,
  theme: ThemeName,
  items: BareComponent[],
  density: Density = "comfortable",
): BareComponent => ({ type, props: { theme, density, items } });
const section = (theme: ThemeName, body: BareComponent[]): BareComponent => ({
  type: "Section",
  props: { theme, body },
});
const cta = (
  theme: ThemeName,
  copy: { headline: string; subhead: string; actions: BareComponent[] },
  format: "band" | "interstitial" = "band",
): BareComponent => ({
  type: "CTABand",
  props: {
    theme,
    format,
    headline: copy.headline,
    subhead: copy.subhead,
    actions: copy.actions,
  },
});
const comparisonTable = (
  theme: ThemeName,
  comparisonSet: string,
  goal: string,
): BareComponent => ({
  type: "ComparisonTable",
  props: { theme, comparisonSet, goal },
});
const rateWidget = (
  theme: ThemeName,
  props: {
    mode: "static" | "interactive";
    fromCurrency: string;
    toCurrency: string;
    amount: number;
  },
): BareComponent => ({ type: "RateWidget", props: { theme, ...props } });
const disclosureBand = (theme: ThemeName, ids: string[]): BareComponent => ({
  type: "DisclosureBand",
  props: { theme, snippets: ids.map((id) => ({ id })) },
});

// --- Fixed app-shell chrome (§3.4): shared across pages, painted per page-default theme ---

const SITE_HEADER: HeaderContent = {
  brand: "Almond",
  navItems: [
    { label: "Personal", href: "#personal" },
    { label: "Business", href: "#business" },
    { label: "Send", href: "#send" },
    { label: "Pricing", href: "#pricing" },
    { label: "Security", href: "#security" },
  ],
  cta: { label: "Open an account", href: "#" },
};

const SITE_FOOTER: FooterContent = {
  linkColumns: [
    {
      title: "Products",
      links: [
        { label: "Everyday", href: "#everyday" },
        { label: "Interest", href: "#interest" },
        { label: "Send", href: "#send" },
        { label: "Card", href: "#card" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Press", href: "#" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Help centre", href: "#" },
        { label: "Security", href: "#security" },
        { label: "Contact", href: "#" },
      ],
    },
  ],
  locale: "United Kingdom (English)",
  currency: "GBP",
  disclosures: ["deposits", "fx", "capital"],
};

// --- The 8 pages ---

const personalLanding = almondPage({
  id: "personal",
  title: "Personal",
  defaultTheme: "personal",
  header: SITE_HEADER,
  footer: SITE_FOOTER,
  content: [
    hero("personal", {
      eyebrow: "Everyday money",
      headline: "Money you keep, quietly.",
      subhead:
        "Hold, spend and grow your money without the hidden markup — the boring parts of money, finally done plainly.",
      actions: [button("Open an account"), button("See how it works", "ghost")],
    }),
    collection("FeatureGrid", "personal", [
      feature(
        "◇",
        "No hidden markup",
        "The price you see is the price you pay — every time.",
      ),
      feature(
        "◈",
        "Held in your name",
        "Your money is ring-fenced and never lent out.",
      ),
      feature(
        "◆",
        "Paid daily",
        "Interest lands the next morning, not once a year.",
      ),
    ]),
    collection("StatBand", "personal", [
      stat("0", "hidden fees"),
      stat("4.1%", "AER, paid daily"),
      stat("2 min", "to open an account"),
    ]),
    collection("StepsSection", "personal", [
      step(
        "Open your account",
        "Two minutes and a photo of your ID — no branch, no paperwork.",
      ),
      step("Add your money", "Move funds in by bank transfer or debit card."),
      step(
        "Start earning",
        "Interest lands the next morning and every day after.",
      ),
    ]),
    collection("ProductShowcase", "personal", [
      product("everyday"),
      product("interest"),
      product("send"),
    ]),
    collection("TestimonialSection", "personal", [
      quote("I finally understand where my money goes.", "Priya N."),
      quote("Opening an account took less time than my coffee.", "Marcus T."),
      quote("The interest just shows up every morning.", "Lena K."),
    ]),
    // Mixed-theme proof (§7.1): a Personal page hosting a Business-themed section.
    cta(
      "business",
      {
        headline: "Running a business? Almond works for teams too.",
        subhead:
          "Multi-user accounts, real exchange rates, and the same honest pricing.",
        actions: [button("Explore Almond Business")],
      },
      "interstitial",
    ),
  ],
});

const businessLanding = almondPage({
  id: "business",
  title: "Business",
  defaultTheme: "business",
  header: SITE_HEADER,
  footer: SITE_FOOTER,
  content: [
    hero("business", {
      eyebrow: "Business banking",
      headline: "Money that works as hard as you do.",
      subhead:
        "Pay suppliers abroad at the real rate, give your team cards, and see every penny — in one account.",
      actions: [
        button("Open a business account"),
        button("Talk to sales", "ghost"),
      ],
    }),
    collection("FeatureGrid", "business", [
      feature(
        "⬡",
        "Real exchange rates",
        "Pay international invoices with no markup buried in the numbers.",
      ),
      feature(
        "⬢",
        "Team cards",
        "Issue cards with limits you set, and see spend as it happens.",
      ),
      feature(
        "◫",
        "One clear ledger",
        "Every account and currency in a single, exportable view.",
      ),
    ]),
    collection("StatBand", "business", [
      stat("50+", "currencies supported"),
      stat("0.4%", "average FX saving"),
      stat("Same day", "to most destinations"),
    ]),
    collection("LogoCloud", "business", [
      logo("Northwind"),
      logo("Globex"),
      logo("Initech"),
      logo("Umbrella"),
      logo("Hooli"),
      logo("Vandelay"),
    ]),
    collection("ProductShowcase", "business", [
      product("everyday"),
      product("send"),
      product("card"),
    ]),
    section("business", [
      heading("See how a business account compares", 2),
      comparisonTable("business", "everyday", "full"),
    ]),
    cta("business", {
      headline: "Ready to give your business honest money?",
      subhead: "Open a business account in minutes — no setup fees.",
      actions: [button("Open a business account")],
    }),
  ],
});

const card = almondPage({
  id: "card",
  title: "Card",
  defaultTheme: "personal-bright-green",
  header: SITE_HEADER,
  footer: SITE_FOOTER,
  content: [
    hero("personal-bright-green", {
      eyebrow: "Almond Card",
      headline: "One card, every currency, honest rates.",
      subhead:
        "Spend anywhere at the real exchange rate. No foreign transaction fees, no surprises on the statement.",
      actions: [button("Get your card"), appBadges()],
    }),
    collection("FeatureGrid", "personal-bright-green", [
      feature(
        "▢",
        "Spend at the real rate",
        "Every currency converts at the honest rate — no markup.",
      ),
      feature(
        "⚑",
        "Freeze in a tap",
        "Lost the card? Freeze and unfreeze it instantly from the app.",
      ),
      feature(
        "↺",
        "Instant notifications",
        "Know exactly what you spent the moment you spend it.",
      ),
    ]),
    section("personal-bright-green", [
      heading("Meet the Almond Card", 2),
      product("card", "full-card"),
      text(
        "Metal or plastic, the rate is the same honest one. No monthly fee, ever.",
      ),
    ]),
    collection("TrustSection", "personal-bright-green", [
      cert("🛡", "FSCS protected"),
      cert("🔒", "256-bit encryption"),
      cert("✅", "FCA regulated"),
      cert("🏛", "Ring-fenced deposits"),
    ]),
    cta("personal-bright-green", {
      headline: "Spend honestly, everywhere.",
      subhead: "Order the Almond Card free — it arrives in days.",
      actions: [button("Get your card"), appBadges()],
    }),
  ],
});

const send = almondPage({
  id: "send",
  title: "Send",
  defaultTheme: "business-bright-blue",
  header: SITE_HEADER,
  footer: SITE_FOOTER,
  content: [
    hero("business-bright-blue", {
      eyebrow: "Almond Send",
      headline: "Send money abroad at the real rate.",
      subhead:
        "The mid-market rate you see on Google, with no markup hidden in the numbers. See the exact amount before you send.",
      actions: [button("Send money")],
    }),
    section("business-bright-blue", [
      heading("See the rate before you send", 2),
      rateWidget("business-bright-blue", {
        mode: "interactive",
        fromCurrency: "GBP",
        toCurrency: "EUR",
        amount: 1000,
      }),
    ]),
    collection("FeatureGrid", "business-bright-blue", [
      feature(
        "→",
        "The real rate",
        "The mid-market rate, always — never a marked-up one.",
      ),
      feature(
        "⚡",
        "Same-day arrival",
        "Most transfers land the same day, weekends included.",
      ),
      feature(
        "◎",
        "Track every step",
        "Watch your transfer move from sent to arrived.",
      ),
    ]),
    section("business-bright-blue", [
      heading("Send vs the alternatives", 2),
      comparisonTable("business-bright-blue", "send", "full"),
    ]),
    collection("StatBand", "business-bright-blue", [
      stat("0%", "hidden markup"),
      stat("50+", "currencies"),
      stat("Same day", "to most places"),
    ]),
    cta("business-bright-blue", {
      headline: "Move money like it's the 21st century.",
      subhead: "Your first transfer takes two minutes.",
      actions: [button("Send money")],
    }),
  ],
});

const interest = almondPage({
  id: "interest",
  title: "Interest",
  defaultTheme: "personal-forrest-green",
  header: SITE_HEADER,
  footer: SITE_FOOTER,
  content: [
    hero("personal-forrest-green", {
      eyebrow: "Almond Interest",
      headline: "4.1% AER. Paid daily.",
      subhead:
        "Put idle cash to work at a rate that actually moves. Interest is calculated every day and lands the next morning.",
      actions: [button("Start earning")],
    }),
    // Number-forward composition (⑤ dec 6): foreground the AER bignum + honest StatBand.
    // No ProjectionPanel organism; the RateHistory sparkline is a Fog visual-tuning item.
    collection("StatBand", "personal-forrest-green", [
      stat("4.1%", "AER, variable"),
      stat("Daily", "interest paid"),
      stat("£0", "to start earning"),
    ]),
    section("personal-forrest-green", [
      heading("How the interest works", 2),
      prose(
        "<p>Your balance earns <strong>4.1% AER</strong>, calculated on every pound, every day. There's no minimum, no lock-in, and you can withdraw whenever you like — the interest you've already earned is yours to keep.</p>",
      ),
      product("interest", "full-card"),
    ]),
    collection("StepsSection", "personal-forrest-green", [
      step(
        "Move money in",
        "Add funds by transfer or card — no minimum balance.",
      ),
      step("Earn every day", "Interest accrues daily on your whole balance."),
      step(
        "Withdraw anytime",
        "Take your money out whenever you need it, penalty-free.",
      ),
    ]),
    disclosureBand("personal-forrest-green", ["aer", "capital"]),
    cta("personal-forrest-green", {
      headline: "Start earning 4.1% today.",
      subhead: "It takes two minutes and there's no fee to start.",
      actions: [button("Start earning")],
    }),
  ],
});

const security = almondPage({
  id: "security",
  title: "Security",
  defaultTheme: "business-forrest-blue",
  header: SITE_HEADER,
  footer: SITE_FOOTER,
  content: [
    hero("business-forrest-blue", {
      eyebrow: "Security & trust",
      headline: "Built to keep your money safe.",
      subhead:
        "Your money is held in your name, protected by the FSCS, and guarded by the same encryption banks use.",
      actions: [button("How we protect you")],
    }),
    collection("TrustSection", "business-forrest-blue", [
      cert("🛡", "FSCS protected up to £85,000"),
      cert("🔒", "256-bit encryption"),
      cert("✅", "FCA regulated"),
      cert("🏛", "Ring-fenced deposits"),
    ]),
    collection("FeatureGrid", "business-forrest-blue", [
      feature(
        "⊚",
        "Held in your name",
        "Deposits are ring-fenced and never lent out.",
      ),
      feature(
        "⊕",
        "Biometric access",
        "Face and fingerprint unlock, plus a PIN only you know.",
      ),
      feature(
        "⊘",
        "Fraud watch",
        "We monitor for unusual activity and flag it in real time.",
      ),
    ]),
    collection("FAQSection", "business-forrest-blue", [
      faq(
        "Is my money safe with Almond?",
        "<p>Yes — eligible deposits are protected up to <strong>£85,000</strong> by the FSCS, and your money is held in your name.</p>",
      ),
      faq(
        "What happens if I lose my phone?",
        "<p>Your account is protected by biometrics and a PIN. You can freeze access instantly from any browser.</p>",
      ),
      faq(
        "Do you sell my data?",
        "<p>Never. We make money from honest product fees, not from selling what we know about you.</p>",
      ),
    ]),
    disclosureBand("business-forrest-blue", ["deposits", "capital"]),
    cta("business-forrest-blue", {
      headline: "Money you can trust, quietly.",
      subhead: "Open an account protected from day one.",
      actions: [button("Open an account")],
    }),
  ],
});

const pricing = almondPage({
  id: "pricing",
  title: "Pricing",
  defaultTheme: "personal",
  header: SITE_HEADER,
  footer: SITE_FOOTER,
  content: [
    hero("personal", {
      eyebrow: "Pricing",
      headline: "Simple pricing. No surprises.",
      subhead:
        "Every Almond product is free to open, with the honest rate built in — you only ever pay for what you use.",
      actions: [button("Open an account")],
    }),
    collection("ProductShowcase", "personal", [
      product("everyday"),
      product("interest"),
      product("send"),
      product("card"),
    ]),
    collection("FeatureGrid", "personal", [
      feature(
        "✓",
        "Free to open",
        "Every account opens free, with no monthly fee.",
      ),
      feature(
        "✓",
        "No hidden markup",
        "The exchange rate is always the real one.",
      ),
      feature(
        "✓",
        "Pay as you go",
        "You only pay for extras like expedited transfers.",
      ),
    ]),
    collection("FAQSection", "personal", [
      faq(
        "Are there any monthly fees?",
        "<p>No. Opening and holding an Almond account is free — always.</p>",
      ),
      faq(
        "How do you make money?",
        "<p>From clear, optional fees on things like premium cards — never from a markup you can't see.</p>",
      ),
    ]),
    cta("personal", {
      headline: "Honest money, honestly priced.",
      subhead: "Open your free account in minutes.",
      actions: [button("Open an account")],
    }),
  ],
});

const comparison = almondPage({
  id: "comparison",
  title: "Comparison",
  defaultTheme: "business",
  header: SITE_HEADER,
  footer: SITE_FOOTER,
  content: [
    hero("business", {
      eyebrow: "Compare",
      headline: "See how Almond compares.",
      subhead:
        "Side by side with the high street and the other apps — on the things that actually cost you money.",
      actions: [button("Open an account")],
    }),
    section("business", [
      heading("Your everyday account", 2),
      comparisonTable("business", "everyday", "full"),
    ]),
    section("business", [
      heading("Sending money abroad", 2),
      comparisonTable("business", "send", "full"),
    ]),
    collection("FeatureGrid", "business", [
      feature("◇", "No hidden markup", "The rate you see is the rate you get."),
      feature(
        "◆",
        "Paid daily",
        "Interest that lands every morning, not once a year.",
      ),
      feature("→", "Real FX", "The mid-market rate on every currency."),
    ]),
    cta("business", {
      headline: "Switch to money that tells the truth.",
      subhead: "Opening an account takes two minutes.",
      actions: [button("Open an account")],
    }),
  ],
});

/** The 8 pages, in IA order (§1). */
export const PAGES: readonly AlmondPage[] = [
  personalLanding,
  businessLanding,
  card,
  send,
  interest,
  security,
  pricing,
  comparison,
];
