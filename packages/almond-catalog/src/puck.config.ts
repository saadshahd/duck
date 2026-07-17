/**
 * The Almond catalog Puck `Config` — the registry the editor and MCP server load.
 *
 * Components accrete here as tickets land: T2 atoms, T4 molecules, T5 collection
 * organisms (this pass), then T6/T7 field-host + computed organisms. Registration is
 * what makes a component nameable in a slot `allow` grammar (§4) and droppable in the
 * editor — a collection organism's `allow: ["FeatureItem"]` only resolves because
 * `FeatureItem` is a registered component here.
 *
 * Categories group the palette by atomic layer; they are presentational only.
 */

import type { Config } from "@puckeditor/core";

// Atoms (T2)
import { buttonConfig } from "./components/button";
import { dividerConfig } from "./components/divider";
import { headingConfig } from "./components/heading";
import { imageConfig } from "./components/image";
import { proseConfig } from "./components/prose";
import { textConfig } from "./components/text";

// Molecules (T4)
import { appStoreBadgesConfig } from "./components/app-store-badges";
import { certificationConfig } from "./components/certification";
import { faqItemConfig } from "./components/faq-item";
import { featureItemConfig } from "./components/feature-item";
import { logoItemConfig } from "./components/logo-item";
import { planCardConfig } from "./components/plan-card";
import { productSummaryConfig } from "./components/product-summary";
import { statItemConfig } from "./components/stat-item";
import { stepItemConfig } from "./components/step-item";
import { testimonialConfig } from "./components/testimonial";

// Computed widgets (T7)
import { comparisonTableConfig } from "./components/comparison-table";
import { rateWidgetConfig } from "./components/rate-widget";

// Field / free-host organisms (T6)
import { ctaBandConfig } from "./components/cta-band";
import { disclosureBandConfig } from "./components/disclosure-band";
import { heroConfig } from "./components/hero";
import { sectionConfig } from "./components/section";

// Collection organisms (T5)
import { faqSectionConfig } from "./components/faq-section";
import { featureGridConfig } from "./components/feature-grid";
import { logoCloudConfig } from "./components/logo-cloud";
import { productShowcaseConfig } from "./components/product-showcase";
import { statBandConfig } from "./components/stat-band";
import { stepsSectionConfig } from "./components/steps-section";
import { testimonialSectionConfig } from "./components/testimonial-section";
import { trustSectionConfig } from "./components/trust-section";

export const config: Config = {
  categories: {
    atoms: {
      title: "Atoms",
      components: ["Heading", "Text", "Prose", "Button", "Image", "Divider"],
    },
    molecules: {
      title: "Molecules",
      components: [
        "FeatureItem",
        "StatItem",
        "StepItem",
        "PlanCard",
        "Certification",
        "Testimonial",
        "LogoItem",
        "FaqItem",
        "ProductSummary",
        "AppStoreBadges",
      ],
    },
    collections: {
      title: "Collection organisms",
      components: [
        "FeatureGrid",
        "StatBand",
        "LogoCloud",
        "TrustSection",
        "TestimonialSection",
        "FAQSection",
        "StepsSection",
        "ProductShowcase",
      ],
    },
    widgets: {
      title: "Computed widgets",
      components: ["ComparisonTable", "RateWidget"],
    },
    hosts: {
      title: "Field / free-host organisms",
      components: ["Hero", "Section", "CTABand", "DisclosureBand"],
    },
  },
  components: {
    // Atoms
    Heading: headingConfig,
    Text: textConfig,
    Prose: proseConfig,
    Button: buttonConfig,
    Image: imageConfig,
    Divider: dividerConfig,
    // Molecules
    FeatureItem: featureItemConfig,
    StatItem: statItemConfig,
    StepItem: stepItemConfig,
    PlanCard: planCardConfig,
    Certification: certificationConfig,
    Testimonial: testimonialConfig,
    LogoItem: logoItemConfig,
    FaqItem: faqItemConfig,
    ProductSummary: productSummaryConfig,
    AppStoreBadges: appStoreBadgesConfig,
    // Collection organisms
    FeatureGrid: featureGridConfig,
    StatBand: statBandConfig,
    LogoCloud: logoCloudConfig,
    TrustSection: trustSectionConfig,
    TestimonialSection: testimonialSectionConfig,
    FAQSection: faqSectionConfig,
    StepsSection: stepsSectionConfig,
    ProductShowcase: productShowcaseConfig,
    // Computed widgets
    ComparisonTable: comparisonTableConfig,
    RateWidget: rateWidgetConfig,
    // Field / free-host organisms
    Hero: heroConfig,
    Section: sectionConfig,
    CTABand: ctaBandConfig,
    DisclosureBand: disclosureBandConfig,
  },
};
