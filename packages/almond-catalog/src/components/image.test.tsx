import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Image, type ImageRatio } from "./image";

describe("Image atom", () => {
  test("tags the frame with the chosen ratio", () => {
    const ratios: ImageRatio[] = ["square", "landscape", "portrait"];
    for (const ratio of ratios) {
      const html = renderToStaticMarkup(
        <Image src="/x.jpg" alt="x" ratio={ratio} />,
      );
      expect(html).toContain(`data-ratio="${ratio}"`);
    }
  });

  test("renders the image when a src is set", () => {
    const html = renderToStaticMarkup(
      <Image src="/photo.jpg" alt="A photo" ratio="landscape" />,
    );
    expect(html).toContain('src="/photo.jpg"');
    expect(html).toContain('alt="A photo"');
  });

  test("renders the themed empty frame — never a broken img — when src is unset", () => {
    const html = renderToStaticMarkup(<Image src="" alt="" ratio="square" />);
    expect(html).not.toContain("<img");
  });
});
