Fix the Veralyze Light Theme implementation immediately.

Current issue:
The Light mode toggle is selected, but the screen is still using dark theme backgrounds and dark overlays. This creates unreadable text and a broken mixed-theme UI.

This is not acceptable.

Light mode must not be a partial color change.
When Light mode is selected, the entire product must switch to a proper full light theme.

Critical fixes:

1. Remove mixed theme styling

* Do not keep dark page background in Light mode.
* Do not keep black/dark overlays in Light mode.
* Do not keep dark glass cards in Light mode.
* Do not keep dark sidebar in Light mode.
* Do not leave black text on dark backgrounds.
* Do not use gray washed-out inactive nav pills.

2. Light mode global background
   When Light mode is active:

* Main page background: #F7F7F2 or #FAFAF6
* Content area background: light, clean, warm off-white
* No near-black background should remain on the main canvas
* No dark fog overlay
* No dark gradient covering the page

3. Light mode text colors

* Primary text: #181818
* Secondary text: #5F625A or #6B6B65
* Muted text: rgba(24,24,24,0.55)
* Placeholder text: rgba(24,24,24,0.45)
* Do not use black text on dark surfaces
* Do not use white text on light surfaces unless it is inside a dark badge/action

4. Light mode cards and surfaces
   All cards in Light mode should use:

* Background: #FFFFFF or #FCFCF8
* Border: rgba(24,24,24,0.08)
* Shadow: soft neutral shadow
* Optional #E7FF47 back-glow behind important cards only at 6–10% opacity
* Glow must stay behind cards, never over content

Main input panel in Light mode:

* Background: white / warm white
* Border: subtle neutral border
* Text: #181818
* Input background: #FFFFFF
* Input border: rgba(24,24,24,0.10)
* No dark panel styling should remain

5. Light mode scan type cards
   Analyze Manipulation selected card:

* Soft lime tinted background or lime border
* Text: #181818
* Icon: #181818 or #E7FF47 depending on contrast
* Recommended badge: #E7FF47 background with #181818 text

Verify Sources unselected card:

* White background
* Subtle border
* Text: #181818
* Muted description color

6. CTA rules
   Primary CTA in both themes:

* Background: #E7FF47
* Text/icon: #181818
* Never use white text on lime buttons

Light mode CTA must be fully readable.
Disabled CTA should use muted neutral background and muted readable text.

7. Light mode sidebar
   When Light mode is active:

* Sidebar background: #FFFFFF or #FCFCF8
* Sidebar border: rgba(24,24,24,0.08)
* Logo icon visible at top
* Logo text: #181818 or brand dark
* Inactive nav items:

  * Transparent background
  * Icon/text: muted dark gray
* Hover inactive nav item:

  * Background: rgba(24,24,24,0.06)
  * Icon/text: #181818
* Active nav item:

  * Background: #E7FF47
  * Icon/text: #181818
* Do not use gray filled pills for every inactive nav item.
* Only active item should look highlighted.

8. Profile card in Light mode

* Profile card background: white or subtle neutral
* Avatar remains visible
* Name: Fatima Arif
* Text: #181818
* Secondary text: muted gray
* Gear icon visible and readable
* No dark-only styling should remain

9. Theme toggle
   The toggle must actually switch the full UI theme.
   When Light is selected:

* Entire app becomes light
* Dashboard becomes light
* Analyze becomes light
* History becomes light
* Verification becomes light
* Feedback becomes light
* Settings becomes light
* Report Detail becomes light
* Modals, drawers, toasts, command palette also become light

When Dark is selected:

* Entire app returns to dark premium AI workspace theme

Do not mix dark and light components on the same screen.

10. Dashboard Light mode specific
    For the Dashboard in Light mode:

* Background should be warm off-white
* Headline should be #181818
* Subtitle should be muted dark gray
* AI Intelligence Workspace pill should be light neutral with dark text
* Main intake card should be white glass / white card
* Input should be white with readable placeholder
* Scan option cards should be white
* Selected scan card uses subtle lime accent
* CTA remains lime with dark text
* Quick action chips should be light neutral with dark text
* No dark content background should remain

11. Dark mode must stay intact
    Do not destroy the current dark design.
    Create clean theme variants or token-based theme styles:

* Dark mode uses dark tokens
* Light mode uses light tokens

Use proper design tokens:

* bg/app
* bg/sidebar
* bg/surface
* bg/surface-elevated
* text/primary
* text/secondary
* border/default
* accent/primary
* button/primary-bg
* button/primary-text
* input/bg
* input/border
* hover/bg
* active/bg
* shadow/default
* glow/brand

Do not manually recolor random elements inconsistently.

12. Full self-audit before finalizing
    Audit every screen and every component.

Check:

* No dark page background in Light mode
* No black text on dark backgrounds
* No white text on lime CTA
* No unreadable gray text
* No dark glass cards in Light mode
* No gray inactive nav pills in Light mode
* No dark-only inputs in Light mode
* No mixed theme modals/drawers/toasts
* Sidebar works in both themes
* Toggle correctly reflects the selected theme
* Dashboard greeting remains “Good evening, Fatima.”
* Sidebar profile remains “Fatima Arif”
* Logo icon remains visible in both themes

Final result:
Light mode should look like a fully intentional premium light AI SaaS product.

It should not look like dark mode with a few light colors pasted on top.

Fix the theme system properly across the entire product.
