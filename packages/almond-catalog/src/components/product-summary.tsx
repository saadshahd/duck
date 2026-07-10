/**
 * ProductSummary — the single, reusable product reference (sp-64 §3.2, §6).
 *
 * ONE component with TWO render paths — `full-card` and `compact-row` — so the same
 * product reads consistently across every page it appears on. The `presentation` morph
 * that switches paths is wired in T9; here it is a component-level param defaulting to
 * `full-card`, so both paths exist and are testable without yet touching the Puck field
 * contract (the editor lever today is only the semantic `productId` select).
 *
 * Resolution is total: an unknown id renders a labeled placeholder, never a crash
 * (§6; the dangling-ref state is finished in T12).
 */

import type { ComponentConfig } from "@puckeditor/core";
import { type ProductId, products, resolveProduct } from "../data/products";
import "./product-summary.css";

export type ProductPresentation = "full-card" | "compact-row";

/** The Puck field contract: `productId` only. `presentation` joins it as a morph in T9. */
export interface ProductSummaryProps {
  productId: string;
}

interface ProductSummaryViewProps extends ProductSummaryProps {
  presentation?: ProductPresentation;
}

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
    productId: { type: "select", options: productOptions },
  },
  defaultProps: { productId: "everyday" },
  render: ({ productId }) => <ProductSummary productId={productId} />,
};
