/**
 * Image — a framed content-image atom (sp-64 §3.1: `src`, `alt`, `ratio` enum).
 *
 * The DS owns the FRAME (aspect ratio, corner radius, hairline), never the pixels:
 * `ratio` is the curated variant, `src`/`alt` are content. With no `src` the atom
 * renders the themed empty frame alone — never a broken `<img>`, and never a
 * DS-shipped raster (sp-64 §2.7 media doctrine forbids raster as DS chrome; a
 * content designer supplies the source).
 */

import type { ComponentConfig } from "@puckeditor/core";
import "./image.css";

export type ImageRatio = "square" | "landscape" | "portrait";

export interface ImageProps {
  src: string;
  alt: string;
  ratio: ImageRatio;
}

export function Image({ src, alt, ratio }: ImageProps) {
  return (
    <span className="almond-image" data-ratio={ratio}>
      {src ? <img src={src} alt={alt} /> : null}
    </span>
  );
}

export const imageConfig: ComponentConfig<ImageProps> = {
  fields: {
    src: { type: "text" },
    alt: { type: "text" },
    ratio: {
      type: "select",
      options: [
        { label: "Square (1:1)", value: "square" },
        { label: "Landscape (16:9)", value: "landscape" },
        { label: "Portrait (3:4)", value: "portrait" },
      ],
    },
  },
  defaultProps: { src: "", alt: "", ratio: "landscape" },
  render: ({ src, alt, ratio }) => <Image src={src} alt={alt} ratio={ratio} />,
};
