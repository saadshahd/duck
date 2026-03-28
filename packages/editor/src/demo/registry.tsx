import React from "react";
import { defineRegistry } from "@json-render/react";
import { catalog } from "./catalog.js";

const wrap =
  (Tag: string, defaultStyle?: React.CSSProperties) =>
  ({
    props,
    children,
  }: {
    props: Record<string, unknown>;
    children?: React.ReactNode;
  }) => {
    const style = {
      ...defaultStyle,
      ...(props.style as React.CSSProperties | undefined),
    };
    const hasChildren =
      children != null && (!Array.isArray(children) || children.length > 0);
    return React.createElement(Tag, { style }, hasChildren ? children : null);
  };

export const { registry } = defineRegistry(catalog, {
  components: {
    Box: wrap("div"),

    Heading: ({ props }: { props: Record<string, unknown> }) => {
      const Tag = (props.level as string) ?? "h2";
      return React.createElement(
        Tag,
        {
          style: {
            margin: "0 0 0.5rem",
            ...(props.style as React.CSSProperties | undefined),
          },
        },
        props.text as string,
      );
    },

    Text: ({ props }: { props: Record<string, unknown> }) =>
      React.createElement(
        "p",
        {
          style: {
            margin: "0 0 1rem",
            lineHeight: 1.6,
            ...(props.style as React.CSSProperties | undefined),
          },
        },
        props.text as string,
      ),

    Button: ({ props }: { props: Record<string, unknown> }) => {
      const isPrimary = props.variant !== "secondary";
      return React.createElement(
        "button",
        {
          style: {
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            border: isPrimary ? "none" : "1px solid #d0d7de",
            background: isPrimary ? "#0969da" : "transparent",
            color: isPrimary ? "#fff" : "#24292f",
            fontSize: "1rem",
            cursor: "pointer",
            ...(props.style as React.CSSProperties | undefined),
          },
        },
        props.label as string,
      );
    },

    Image: ({ props }: { props: Record<string, unknown> }) =>
      React.createElement("img", {
        src: props.src as string,
        alt: props.alt as string,
        style: {
          maxWidth: "100%",
          borderRadius: "8px",
          ...(props.style as React.CSSProperties | undefined),
        },
      }),

    Stack: ({
      props,
      children,
    }: {
      props: Record<string, unknown>;
      children?: React.ReactNode;
    }) => {
      const direction = props.direction === "horizontal" ? "row" : "column";
      return React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: direction,
            gap: (props.gap as string) ?? undefined,
            ...(props.style as React.CSSProperties | undefined),
          },
        },
        children,
      );
    },

    Card: wrap("div", {
      border: "1px solid #d0d7de",
      borderRadius: "12px",
      padding: "1.5rem",
      background: "#fff",
    }),

    Grid: ({
      props,
      children,
    }: {
      props: Record<string, unknown>;
      children?: React.ReactNode;
    }) =>
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: `repeat(${(props.columns as number) ?? 3}, 1fr)`,
            gap: (props.gap as string) ?? "1.5rem",
            ...(props.style as React.CSSProperties | undefined),
          },
        },
        children,
      ),
  },
});
