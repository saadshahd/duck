/**
 * Testimonial — one customer quote for the TestimonialSection collection (sp-64 §3.2).
 *
 * A leaf: a `quote`, an `author`, and an optional `avatar` source. With no avatar the
 * figure falls back to a themed monogram (the author's initial) rather than a broken
 * `<img>` or a DS-shipped raster (§2.7) — the empty state is finished in T12.
 */

import type { ComponentConfig } from "@puckeditor/core";
import "./testimonial.css";

export interface TestimonialProps {
  quote: string;
  author: string;
  avatar: string;
}

export function Testimonial({ quote, author, avatar }: TestimonialProps) {
  const monogram = author.trim().charAt(0).toUpperCase();
  return (
    <figure className="almond-testimonial">
      <blockquote className="almond-testimonial__quote">{quote}</blockquote>
      <figcaption className="almond-testimonial__by">
        <span className="almond-testimonial__avatar" aria-hidden="true">
          {avatar ? <img src={avatar} alt="" /> : monogram}
        </span>
        <span className="almond-testimonial__author">{author}</span>
      </figcaption>
    </figure>
  );
}

export const testimonialConfig: ComponentConfig<TestimonialProps> = {
  fields: {
    quote: { type: "textarea" },
    author: { type: "text" },
    avatar: { type: "text" },
  },
  defaultProps: {
    quote:
      "I finally understand where my money goes. No jargon, no surprises — it just tells me the truth.",
    author: "Priya N.",
    avatar: "",
  },
  render: ({ quote, author, avatar }) => (
    <Testimonial quote={quote} author={author} avatar={avatar} />
  ),
};
