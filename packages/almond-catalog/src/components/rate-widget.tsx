/**
 * RateWidget — a resolved/computed widget: an FX conversion read from the rates stub
 * (sp-64 §3.3c, §6).
 *
 * TWO render paths behind the `mode` morph — `static` (a fixed conversion) and `interactive`
 * (a live amount input). `mode` is a `radio` quick-variant (T9) — the picker offers it and a
 * flip commits a prop `update`. The editor's fields are `theme`, `mode`, `fromCurrency`,
 * `toCurrency`, `amount`; the currency selects stay flagged `morphable:false` (§5.4) — re-
 * pointing which rate is shown is content, not a presentational alternative, so it is prop-
 * editor-only. (T9 ruling: §5.4's four-item enumeration is illustrative, not exhaustive; the
 * operative test is content-vs-presentational, and currency is content of the same kind.)
 *
 * A widget carries its own `theme` (§5.1) but is decorated WITHIN a sibling organism, so it
 * paints a `data-theme` root rather than a nested `SectionShell` <section>. Resolution is
 * total: an unknown currency pair renders an honest "unavailable" fallback plus a retry,
 * never a guessed number (§6; error state finished in T12).
 */

import type { ComponentConfig } from "@puckeditor/core";
import { useState } from "react";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";
import { themeField } from "./theme-field";
import { CURRENCIES, resolveRate } from "../data/rates";
import "./rate-widget.css";

export type RateMode = "static" | "interactive";

export interface RateWidgetProps {
  theme: ThemeName;
  mode: RateMode;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
}

/** The component keeps `mode` optional (defaulting `static`) so a direct render omits it;
 *  the Puck contract (`RateWidgetProps`) requires it and `defaultProps` supplies it. */
type RateWidgetViewProps = Omit<RateWidgetProps, "mode"> & { mode?: RateMode };

const money = (value: number) => value.toFixed(2);

export function RateWidget({
  theme,
  fromCurrency,
  toCurrency,
  amount,
  mode = "static",
}: RateWidgetViewProps) {
  const [liveAmount, setLiveAmount] = useState(amount);
  const [, retry] = useState(0);
  const rate = resolveRate(fromCurrency, toCurrency);

  if (rate === null) {
    return (
      <div
        className="almond-rate almond-rate--error"
        data-theme={theme}
        role="alert"
      >
        <p className="almond-rate__message">
          Live rate unavailable for {fromCurrency} → {toCurrency}.
        </p>
        <button
          type="button"
          className="almond-rate__retry"
          onClick={() => retry((n) => n + 1)}
        >
          Retry
        </button>
      </div>
    );
  }

  const source = mode === "interactive" ? liveAmount : amount;

  return (
    <div className="almond-rate" data-theme={theme}>
      <div className="almond-rate__row">
        <span className="almond-rate__amount">
          {money(source)} {fromCurrency}
        </span>
        <span className="almond-rate__arrow" aria-hidden="true">
          →
        </span>
        <span className="almond-rate__amount almond-rate__amount--out">
          {money(source * rate)} {toCurrency}
        </span>
      </div>
      <p className="almond-rate__rate">
        1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
      </p>
      {mode === "interactive" && (
        <label className="almond-rate__control">
          <span className="almond-rate__label">Amount</span>
          <input
            className="almond-rate__input"
            type="number"
            min={0}
            value={liveAmount}
            onChange={(event) => setLiveAmount(Number(event.target.value))}
          />
        </label>
      )}
    </div>
  );
}

const currencyOptions = CURRENCIES.map((code) => ({
  label: code,
  value: code,
}));

export const rateWidgetConfig: ComponentConfig<RateWidgetProps> = {
  fields: {
    theme: themeField,
    mode: {
      type: "radio",
      options: [
        { label: "Static", value: "static" },
        { label: "Interactive", value: "interactive" },
      ],
    },
    fromCurrency: {
      type: "select",
      options: currencyOptions,
      metadata: { morphable: false },
    },
    toCurrency: {
      type: "select",
      options: currencyOptions,
      metadata: { morphable: false },
    },
    amount: { type: "number" },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
    mode: "static",
    fromCurrency: "USD",
    toCurrency: "GBP",
    amount: 1000,
  },
  render: ({ theme, mode, fromCurrency, toCurrency, amount }) => (
    <RateWidget
      theme={theme}
      mode={mode}
      fromCurrency={fromCurrency}
      toCurrency={toCurrency}
      amount={amount}
    />
  ),
};
