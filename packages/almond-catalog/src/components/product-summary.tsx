/**
 * ProductSummary — the single, reusable product reference (sp-64 §3.2, §6).
 *
 * ONE component with TWO render paths — `full-card` and `compact-row` — so the same
 * product reads consistently across every page it appears on. The `presentation` morph that
 * switches paths is a `radio` quick-variant (T9) — the picker offers it and a flip commits a
 * prop `update`. The other lever, the semantic `productId` select, is flagged
 * `morphable:false` (§5.4): re-pointing which product shows is content, so it stays in the
 * prop editor and out of the presentational picker. A molecule inherits its section theme,
 * so ProductSummary carries no `theme` field of its own (§5.1).
 *
 * Resolution is total: an unknown id renders a labeled placeholder, never a crash
 * (§6; the dangling-ref state is finished in T12).
 */

import type { ComponentConfig } from "@puckeditor/core";
import { type ProductId, products, resolveProduct } from "../data/products";
import "./product-summary.css";

export type ProductPresentation = "full-card" | "compact-row";

/** The Puck field contract: the content-resolving `productId` (prop-editor-only, §5.4) plus
 *  the presentational `presentation` morph (a picker quick-variant, T9). */
export interface ProductSummaryProps {
  productId: string;
  presentation: ProductPresentation;
}

/** The component keeps `presentation` optional (defaulting `full-card`) so a direct render
 *  omits it; the Puck contract requires it and `defaultProps` supplies it. */
type ProductSummaryViewProps = Omit<ProductSummaryProps, "presentation"> & {
  presentation?: ProductPresentation;
};

export function ProductSummary({
  productId,
  presentation = "full-card",
}: ProductSummaryViewProps) {
  const product = resolveProduct(productId);

  if (!product) {
    return (
      <div className="almond-product almond-product--missing" role="note">
        Unknown product “{productId}”
      </div>
    );
  }

  if (presentation === "compact-row") {
    return (
      <a className="almond-product almond-product--row" href={product.href}>
        <span className="almond-product__icon" aria-hidden="true">
          {product.icon}
        </span>
        <span className="almond-product__name">{product.name}</span>
        <span className="almond-product__price">{product.price}</span>
      </a>
    );
  }

  return (
    <article className="almond-product almond-product--card">
      <span className="almond-product__icon" aria-hidden="true">
        {product.icon}
      </span>
      <h3 className="almond-product__name">{product.name}</h3>
      <p className="almond-product__price">{product.price}</p>
      <p className="almond-product__blurb">{product.blurb}</p>
      <a className="almond-product__link" href={product.href}>
        Learn more
      </a>
    </article>
  );
}

const productOptions = (Object.keys(products) as ProductId[]).map((id) => ({
  label: products[id].name,
  value: id,
}));

export const productSummaryConfig: ComponentConfig<ProductSummaryProps> = {
  fields: {
    productId: {
      type: "select",
      options: productOptions,
      metadata: { morphable: false },
    },
    presentation: {
      type: "radio",
      options: [
        { label: "Full card", value: "full-card" },
        { label: "Compact row", value: "compact-row" },
      ],
    },
  },
  defaultProps: { productId: "everyday", presentation: "full-card" },
  render: ({ productId, presentation }) => (
    <ProductSummary productId={productId} presentation={presentation} />
  ),
};
