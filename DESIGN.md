# Design System

## Direction

An ultra-minimal mobile web product that moves from clear blue-hour atmosphere to a tactile white letter. The private tool is quiet and familiar; the shared invitation is the expressive moment. The tone is playful and complicit, never sentimental.

## Color

Implementation colors use OKLCH, except for the explicitly specified iOS confirmation green.

- Background: `oklch(1 0 0)`
- Surface: `oklch(0.965 0.012 250)`
- Ink: `oklch(0.17 0.012 24)`
- Muted ink: `oklch(0.47 0.025 250)`
- Sky: `oklch(0.86 0.075 247)`
- Blue: `oklch(0.60 0.16 253)`
- Blue dark: `oklch(0.48 0.18 253)`
- Secret vermilion: `oklch(0.58 0.20 23)`
- Success confirmation: `#4CCB61`
- Error: `oklch(0.50 0.18 25)`

Blue carries primary actions and the fallback opening atmosphere. Vermilion is limited to the envelope seal and functional moments of surprise.
The personalized name is the dominant opening element. Its solid light or dark treatment follows the detected brightness of the selected photo.

## Typography

- Interface: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif`
- Reveal display: `"Bodoni 72", Didot, "Times New Roman", serif`
- Fixed product scale: 0.8125rem, 0.9375rem, 1rem, 1.25rem, 2rem, 3.5rem.
- Body copy is never smaller than 1rem; metadata is the only exception.

## Spacing

Four-point base scale: 4, 8, 12, 16, 24, 32, 48, 64, 96px. Related controls use 8–12px gaps; distinct groups use 32–64px separation.

## Components

- Buttons use full-pill geometry, 48–52px touch height, clear focus rings, and restrained press feedback.
- Every invite starts with the same three playful response buttons. Only after that answer is confirmed does the exact-day confirmation or range picker appear.
- Inputs use 12px corners, persistent labels, 48px minimum height, and inline errors.
- The photo picker compresses locally, previews the final contrast treatment, and allows a manual light/dark override.
- Scheduling uses a familiar two-option segmented control: one exact day or a range of up to seven days.
- Date choices are compact two-column controls on the guest letter, followed by an explicit confirmation state.
- Confirmation uses the product success green; a successful response triggers one short, non-interactive confetti shower.
- The optional personal message follows the fixed greeting and remains short enough for the opening viewport.
- Panels use 16px corners maximum, either a hairline border or a shallow shadow, never both.
- Translucent panels are reserved for the guest copy placed over photography; blur exists only to preserve legibility.
- The envelope and letter are semantic HTML/CSS shapes with paper texture restricted to those objects.

## Motion

- Utility feedback: 100–150ms.
- Product state changes: 180–250ms.
- Guest reveal: 500–800ms with ease-out-expo.
- Opening copy, name, message, envelope, and letter choices enter in one capped staggered sequence.
- The signature animation is the envelope expanding into the letter.
- `prefers-reduced-motion` removes staged delays and spatial motion.

## Responsive Behavior

The guest flow is a single-purpose viewport at every size. Its chosen photo persists through greeting, letter, and result. The private generator is one column on phones and becomes a two-part composition only when space comfortably permits it. Safe-area insets and 44px minimum targets are mandatory.
