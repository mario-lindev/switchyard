---
name: Switchyard
description: A bright engineering instrument for release rehearsals.
colors:
  primary: "#c94823"
  primary-hover: "#ce4e29"
  canvas: "#f6f7f9"
  surface: "#ffffff"
  sidebar: "#171b23"
  ink: "#202631"
  secondary-text: "#66717f"
  muted: "#69717f"
  line: "#e5e8ed"
  positive: "#218564"
  danger: "#d54e4e"
  nav-active-surface: "#342721"
  nav-active-text: "#f88b69"
  nav-text: "#b5bdc9"
  healthy-surface: "#edf8f2"
  healthy-text: "#248062"
  warning-surface: "#fff6ee"
  warning-text: "#94602a"
  toggle-on: "#e9784c"
typography:
  headline:
    fontFamily: '"DM Sans Variable", sans-serif'
    fontSize: "30px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.035em"
  title:
    fontFamily: '"DM Sans Variable", sans-serif'
    fontSize: "14px"
    fontWeight: 600
    letterSpacing: "0"
  body:
    fontFamily: '"DM Sans Variable", sans-serif'
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: '"DM Sans Variable", sans-serif'
    fontSize: "12px"
    fontWeight: 450
  metric:
    fontFamily: '"DM Sans Variable", sans-serif'
    fontSize: "29px"
    fontWeight: 550
    lineHeight: 1.3
    letterSpacing: "-1px"
  code:
    fontFamily: '"JetBrains Mono Variable", monospace'
    fontSize: "12px"
rounded:
  small: "4px"
  badge: "5px"
  control: "7px"
  node: "8px"
  panel: "12px"
spacing:
  4: "4px"
  8: "8px"
  12: "12px"
  16: "16px"
  20: "20px"
  24: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "#4b535f"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "#777f8d"
    padding: "0"
  input-number:
    backgroundColor: "{colors.surface}"
    textColor: "#566477"
    padding: "10px 5px 10px 12px"
    width: "83px"
  navigation-active:
    backgroundColor: "{colors.nav-active-surface}"
    textColor: "{colors.nav-active-text}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
  chip-healthy:
    backgroundColor: "{colors.healthy-surface}"
    textColor: "{colors.healthy-text}"
    rounded: "{rounded.badge}"
    padding: "3px 6px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  service-node:
    backgroundColor: "{colors.surface}"
    textColor: "#414a58"
    rounded: "{rounded.node}"
    padding: "9px"
  toggle-on:
    backgroundColor: "{colors.toggle-on}"
    height: "17px"
    width: "30px"
---

# Design System: Switchyard

## Overview

**Creative North Star: "The Bright Engineering Instrument"**

A bright engineering instrument: paper-white work surfaces, a graphite navigation rail, vermilion actions, green healthy telemetry, and precise hairlines. The existing visual world is practical, calm, and dense enough for an engineer to operate a release rehearsal without losing the relationship between controls and outcomes.

The light topology is the signature spatial element. Small service cards, measured values, and moving request markers connect a flag decision to a visible failure or recovery. All traffic, service metrics, latencies, and failures are synthetic; a connected Flagsmith API supplies real flag decisions. Connection and simulation labels are part of the interface's visual truth.

**Key Characteristics:**

- Light work surfaces framed by graphite navigation.
- Restrained vermilion actions with semantic health and failure states.
- Readable UI type paired with monospaced code and measured data.
- Compact operational controls and a responsive service topology.

## Colors

A cool neutral workspace carries one vermilion action accent; green and red communicate simulated health and failure. Frontmatter records the current values, including the separate secondary-text and legacy muted tokens.

### Primary

- **Vermilion Action** (`primary`): primary run actions, brand mark, range thumbs, focus outlines, and mobile request markers.
- **Warm Action Hover** (`primary-hover`): the implemented primary-button hover treatment.
- **Soft Toggle Orange** (`toggle-on`): enabled feature switches. It is a distinct implemented state color, not the primary button color.

### Neutral

- **Cool Paper** (`canvas`): the surrounding application workspace.
- **Instrument White** (`surface`): panels, controls, and cards.
- **Graphite Rail** (`sidebar`): persistent desktop navigation.
- **Graphite Ink** (`ink`): main interface text.
- **Readable Slate** (`secondary-text`): recurring metadata, captions, service details, and helper text.
- **Legacy Muted Slate** (`muted`): the root custom property still used by page subtitles; it is separate from the corrected recurring secondary text.
- **Cool Hairline** (`line`): panel boundaries and dividers.
- **Rail Text**, **Warm Rail Selection**, and **Peach Rail Text**: inactive navigation labels, selected navigation background, and selected navigation labels respectively.

### Status

- **Healthy Green** (`positive`): healthy metrics and status text. Healthy badges use their dedicated pale surface and darker text tokens.
- **Failure Red** (`danger`): error metrics and degraded service state, with related pale red surfaces and borders.
- **Warning Ochre** (`warning-text`): warning badges on the warm warning surface. There is no root warning custom property.

**The Evidence Rule.** Connection state identifies the flag source; it never changes the synthetic nature of traffic or telemetry.

## Typography

**Display and Body Font:** DM Sans Variable, with sans-serif fallback.
**Label/Mono Font:** JetBrains Mono Variable, with monospace fallback.

Both fonts are served through local package imports. DM Sans provides the compact interface voice; JetBrains Mono distinguishes code, identifiers, timestamps, and selected measured values. Numeric metrics use tabular figures even when set in DM Sans.

### Hierarchy

- **Headline:** the page heading uses the headline token, tightening to (27px) at tablet and phone widths.
- **Title:** panel headings use the title token on wide desktops; the intermediate rail layout uses (12px), and phone panels use the smaller inherited scale. Global h2 defaults are (15px, weight 650); components deliberately override them.
- **Body:** the root is (16px, weight 400). Paragraph line height is (1.65); much of the workbench uses (12–14px) contextual body copy rather than the root size.
- **Label:** desktop metric labels use the label token. Dense metadata generally ranges from (10–12px); phone metric labels use (9px).
- **Metric:** the primary measured values use the metric token, reducing to (25px) in the intermediate layout and (23px) on phones.
- **Code:** the code token is the baseline; dense topology identifiers and timestamps use smaller contextual sizes. Monospaced content uses tabular figures.

## Layout

This is a code-first, operate-mode developer workbench. The desktop shell has a fixed graphite rail (232px), a top bar (64px), and a centered main region capped at (1720px), with default content padding (31px 34px 74px). A context bar and four-column metric strip introduce the release lab. The main lab is a flexible topology/telemetry column beside a compact controls column (294px), with a (20px) gap.

The CSS uses a recurring small-step spacing vocabulary, recorded in frontmatter, alongside component-specific values. Panels commonly separate at (20px), panel headings use (15px 18px), and flag lists use (16px) horizontal insets. These are observed patterns, not a strict universal four-pixel grid.

- **Large desktop, at least 1600px:** rail expands to (250px), control column to (330px).
- **Compact desktop, at most 1250px:** rail is (205px). The final cascade from (761px through 1050px) uses a (76px) icon rail and a (260px) controls column.
- **Tablet, at most 760px:** the main lab becomes one column, while the aside initially becomes a two-column controls area. Main content uses (18px) horizontal padding; the icon rail remains until the phone breakpoint.
- **Phone, at most 540px:** the rail disappears; a menu opens full-width navigation below the (56px) top bar. Content uses (15px) horizontal padding. Four compact metrics stay on one row; their sparklines and detail rows are hidden. The order is flags, topology, failure injection, guardrail summary, then telemetry. Flags have shorter rows and hide descriptions. The topology becomes a compact animated four-step request path above a three-column grid of seven service cards; its final card is centered. Desktop SVG edges and edge labels are hidden. Telemetry, cohorts, and events remain below.

A fixed bottom run dock follows the available content width. Expanded topology and command search use overlays rather than altering the page grid.

## Elevation & Depth

Normal panels are flat white surfaces separated by cool borders and subtle background changes. Small ambient shadows distinguish buttons and service nodes; stronger shadows belong to inspectors, popovers, expanded topology, and command search.

### Shadow Vocabulary

- **Primary action:** `0 2px 4px #b3462420`.
- **Secondary action:** `0 1px 2px #20263105`.
- **Service node:** `0 3px 8px #20263104`.
- **Node inspector:** `0 5px 15px #2026310b`.
- **Expanded topology:** `0 16px 80px #2026313b`.
- **Command dialog:** `0 20px 70px #14223c33`, above a translucent blurred backdrop.

## Shapes

Panels use gently curved corners through the shared radius custom property. Controls and navigation use the control radius, service cards the node radius, and badges the badge radius. Hairline borders structure white surfaces; circular status dots and switch thumbs provide compact state markers. The slightly rotated brand tile is a small expressive exception within an otherwise precise geometry.

## Components

### Buttons

Compact and deliberate. Primary and secondary buttons share the control radius, (10px 14px) padding, and a minimum height of (38px). Primary is white on Vermilion Action; its hover uses Warm Action Hover. Secondary is white with a cool border and darker gray text, turning pale gray on hover. Text buttons are unfilled; icon buttons use a small pale hover surface. Disabled buttons use (0.5) opacity and a not-allowed cursor.

Background, border, and transform transitions last (0.16s). The shared keyboard focus treatment is a (2px) primary outline with (4px) offset. Primary running state uses a warm pale surface, darker orange text, and a warm border. The keyboard hint within the primary action has its own darker vermilion fill for readable white lettering.

### Chips

Small outlined labels with compact padding and a restrained radius. Neutral chips are pale gray; green, red, and ochre variants communicate health, failure, and warning. They combine color with text and often a dot or icon. Their role is status communication, not an implied interactive filter.

### Cards / Containers

White, bordered panels with the shared panel radius. Headings are horizontally aligned with icons and compact actions, separated from content by a fine internal rule. Ordinary panels have no shadow. Metrics form one joined strip rather than four detached cards.

### Inputs / Fields

Number fields pair a white monospaced input with a pale unit suffix inside an outlined control-radius wrapper. The input is (83px) wide with (10px 5px 10px 12px) padding on desktop. Rollout uses a thin gray range track, accent thumb, percentage label, and endpoint metadata. Shared keyboard focus is visible around controls. Connection configuration is environment based; the interface does not imply that a browser text field accepts server credentials.

### Navigation

Graphite navigation uses light slate inactive labels, a dark warm active surface, peach active text, and an active marker. Hover adds a lighter graphite fill and white text. Wide rail labels use (14px) type; the intermediate icon rail hides text visually. Phone navigation restores text in a menu opened from the top bar. Mobile navigation is a vertical menu, not a horizontal tab bar.

### Feature Switches

Pill switches have a pale gray off track, soft orange on track, and a white circular thumb. The compact phone version is (30px × 17px) with a (13px) thumb moving (13px). State also appears through the surrounding flag context; mutation feedback follows the selected flag source.

### Service Topology

The signature component combines a light dotted field, small bordered service cards, curved request edges, and moving request dots. Service cards expose a name, identifier, latency, and healthy/degraded text. Hover and selection warm the border and background; degraded cards use a pale red surface and red border/status. Selecting a service opens its inspector. While running, request dots travel along the graph; affected edges and markers change color as the synthetic failure propagates. The phone request path preserves this motion in compact form above the service grid.

Reduced-motion preferences remove transitions, shorten CSS animations to a single iteration, and hide SVG request circles. Health text, card state, controls, and selection remain available.

## Do's and Don'ts

### Do:

- **Do** use the primary token for the main run action and keyboard focus.
- **Do** use secondary-text for recurring readable metadata; preserve the separate muted token only where the current implementation uses it.
- **Do** pair service colors with status text, icons, or labels.
- **Do** preserve the synthetic-traffic disclosure alongside connection state.
- **Do** keep mobile flag controls before the topology, with telemetry below the controls and service view.
- **Do** respect reduced-motion preferences while preserving the underlying controls and status information.

### Don't:

- **Don't** describe simulated topology or telemetry as production infrastructure.
- **Don't** reuse the superseded orange primary from the earlier design document.
- **Don't** scale down the desktop topology on narrow phones; use the compact request path and service grid.
- **Don't** turn every surface into a floating card; borders and tonal separation provide the normal hierarchy.
