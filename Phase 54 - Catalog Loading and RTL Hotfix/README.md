# Phase 54 — Catalog Loading, Photos and Dashboard RTL Hotfix

This bundle contains **10 path-for-path replacement files** from the verified original `eltawalbeh/ChefMujahed` repository, merged through [PR #1](https://github.com/eltawalbeh/ChefMujahed/pull/1).

## Included fixes

- **Missing images and disabled product Add button**: The old 1.2-second timeout discarded complete product records and returned only basic rows. Catalog data is now fetched as base rows with related images and selling units in parallel, with a short cache that avoids repeated navigation delays.
- **B2C and B2B detail pages**: Do not instruct visitors to fill nonexistent options; identify products whose required selling units actually need admin setup.
- **Homepage RTL**: Keep “ابدأ من هنا” anchored on the Arabic side.
- **Dashboard alerts**: Correct notification title/dot alignment and card layout.
- **Manual internal orders**: RTL-first layout and field grouping, product search, X close icon, one footer cancellation action.
- **Quick add customer**: X close icon and RTL modal header.
- **Order details**: Highlight “الخطوة التالية” and keep tab content geometry stable.
- **CSS**: Stable scrollbar gutter to reduce horizontal shifting.

## How to use in Figma Make

1. Save or snapshot the current application.
2. Copy the **contents of** the `src/` folder of this bundle onto matching existing paths, *not* the outer Phase 54 folder.
3. Check the app on desktop and mobile Arabic RTL. In particular navigate repeatedly: B2C home → catalog → lotus-desspasito → cart, then B2B catalog, dashboard notifications, manual orders, and the order detail tabs.
4. Keep the automatic **WhatsApp redirection** and existing Phase 53 financial features. This bundle does not change them.
5. If images still fail, check the browser network response for storage URLs, especially 403/404. The product detail page will now surface errors rather than treating an incomplete catalog fetch as a valid product.

## Read-only database findings (2026-10-17)

- `lotus-desspasito`: **3 product images** and **1 active B2C unit**. Its missing photo and disabled add button were caused by the client-side fallback.
- **4 active B2C products** have no images *and* no B2C units: رافيلو كيك، سينامون رول، كوكيز بان، موش شوكلت. These cannot be repaired with a front-end patch alone; add approved product photography and configure the correct selling units, or apply the previously prepared Phase 53 **B2C default-unit migration** after staging verification.
- **1 active B2B product**, موس رازبري, lacks an active B2B unit; configure the actual packaging/quantity option rather than inventing a selling unit.

## Release notes

- **Frontend build:** Verified by GitHub Actions in the original repo. A companion bundle build checks the overlay against the source baseline.
- **Not yet confirmed:** real-browser speed measurements across customer devices, every production image URL, staging database behavior, full end-to-end checkout.
- No production customer/order/catalog database records were changed.
- Phase 53 Supabase migration is a separate prerequisite for certain discount/default-unit behaviors and has **not** been applied automatically.
