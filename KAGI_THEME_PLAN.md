# Kagi Theme Implementation Plan

## Overview
Add a Kagi-inspired theme to Radiant based on the color schemes used by Kagi search engine. The implementation will follow the existing Catppuccin theme pattern, adding new theme variants that can be selected by users.

## Research Summary

Based on research of Kagi's official themes and community implementations:

### Kagi Default Colors
- **Dark Background**: `#151515` (charcoal black)
- **Dark Text**: `#f4f2f4` (light gray)
- **Light Background**: `#ffffff` (white)
- **Light Text**: `#18181a` (dark gray)
- **Primary Accent**: `#f16d43` (orange)
- **Secondary Accent**: `#62a09d` (teal)
- **Link Color**: `#a0c5ff` (light blue)

### Official Kagi Themes Referenced
1. **Kagi Dark (Default)** - Uses `#151515` background
2. **Calm Blue (Light)** - Sand/amber palette with warm tones
3. **Moon Dark** - Dark variant with sand/amber accents

## Proposed Implementation

### Theme Variants
Create **two Kagi-inspired variants** to match Radiant's existing pattern:

1. **Kagi Light** - Clean, minimal light theme
   - Base: `#ffffff`
   - Text: `#18181a`
   - Accent: `#f16d43` (orange)
   - Secondary: `#62a09d` (teal)
   - Surfaces: Light grays (`#ebebeb`, `#d6d6d6`, `#c2c2c2`)

2. **Kagi Dark** - Deep dark theme with orange accents
   - Base: `#151515`
   - Text: `#f4f2f4`
   - Accent: `#f16d43` (orange)
   - Secondary: `#62a09d` (teal)
   - Surfaces: Dark grays (`#2a2a2a`, `#3d3d3d`, `#525252`)

### Color Palette Mapping

Following Catppuccin's structure (26 colors), we need to define:

#### Monochromatic Colors (14 colors)
- `base` - Main background
- `mantle` - Secondary background (slightly darker/lighter)
- `crust` - Tertiary background
- `surface0` - Surface layer 0
- `surface1` - Surface layer 1
- `surface2` - Surface layer 2
- `overlay0` - Overlay layer 0
- `overlay1` - Overlay layer 1
- `overlay2` - Overlay layer 2
- `subtext0` - Dimmed text
- `subtext1` - Slightly dimmed text
- `text` - Primary text

#### Accent Colors (14 colors)
Map to Kagi's aesthetic:
- `rosewater` - Soft pink
- `flamingo` - Coral pink
- `pink` - Bright pink
- `mauve` - Purple
- `red` - Error states
- `maroon` - Dark red
- `peach` - **`#f16d43`** (Kagi's primary orange)
- `yellow` - Warnings
- `green` - Success states
- `teal` - **`#62a09d`** (Kagi's secondary accent)
- `sky` - Light blue
- `sapphire` - **`#a0c5ff`** (Kagi's link color)
- `blue` - Primary blue
- `lavender` - Light purple

## Implementation Tasks

### Phase 1: Type Definitions & Color Palettes
**Files**: `src/renderer/themes/catppuccin.ts`

1. Rename or extend the theme type system:
   - Option A: Rename to `themes.ts` and make it generic
   - Option B: Keep `catppuccin.ts` for Catppuccin, create `kagi.ts` for Kagi
   - **Recommendation**: Keep existing structure, add Kagi alongside

2. Add Kagi palette interface (reuse `CatppuccinPalette` structure)
3. Define `kagiLight` and `kagiDark` color objects
4. Update `CatppuccinFlavor` type to include Kagi variants OR create separate `ThemeFlavor` union

### Phase 2: CSS Variables
**File**: `src/renderer/themes/theme.css`

1. Add `.theme-kagi-light` class with 30+ CSS variables
2. Add `.theme-kagi-dark` class with 30+ CSS variables
3. Map colors to semantic variables:
   - `--color-base`, `--color-text`, `--color-accent`
   - `--color-border`, `--color-hover`, `--color-active`
   - `--color-success`, `--color-warning`, `--color-error`
   - etc.

### Phase 3: Theme Store & Service Updates
**Files**:
- `src/renderer/stores/themeStore.ts`
- `src/services/preferencesService.ts`

1. Update `VALID_THEMES` array to include `'kagi-light'` and `'kagi-dark'`
2. Add Kagi themes to type unions
3. Ensure validation accepts new theme names

### Phase 4: UI Components
**Files**:
- `src/renderer/components/ThemeProvider.svelte`
- `src/renderer/components/ThemeSelector.svelte`

1. **ThemeProvider**: Update class removal logic to include Kagi theme classes
2. **ThemeSelector**: Add Kagi theme options to radio button list:
   ```typescript
   { value: 'kagi-light', label: 'Kagi Light', description: 'Clean minimal light theme' },
   { value: 'kagi-dark', label: 'Kagi Dark', description: 'Deep dark with orange accents' }
   ```

### Phase 5: Testing & Quality Assurance
1. Test theme switching between all themes (Catppuccin + Kagi)
2. Verify color contrast meets accessibility standards
3. Test persistence across app restarts
4. Ensure all UI components properly use theme variables
5. Test with both light and dark Kagi variants

### Phase 6: Documentation
1. Update `CLAUDE.md` to mention Kagi theme availability
2. Add color palette reference documentation
3. Update any user-facing theme documentation

## File Modification Checklist

- [ ] `src/renderer/themes/catppuccin.ts` (or new `kagi.ts`)
- [ ] `src/renderer/themes/theme.css`
- [ ] `src/renderer/stores/themeStore.ts`
- [ ] `src/services/preferencesService.ts`
- [ ] `src/renderer/components/ThemeProvider.svelte`
- [ ] `src/renderer/components/ThemeSelector.svelte`
- [ ] `CLAUDE.md` (documentation update)

## Design Decisions

### Why Two Variants (Not Four)?
- Kagi's design is more minimalist than Catppuccin
- Light/Dark covers the primary use cases
- Can add more variants later if needed (e.g., "Kagi Warm", "Kagi Cool")

### Color Mapping Strategy
- Use Kagi's official colors for primary accents
- Fill in remaining palette colors with harmonious complementary colors
- Maintain good contrast ratios for accessibility
- Keep the orange (#f16d43) prominent as it's Kagi's signature color

### Naming Convention
- Use `kagi-light` and `kagi-dark` (kebab-case)
- Consistent with potential future themes
- Clear distinction from Catppuccin's flavor names

## Success Criteria

1. ✅ Two new Kagi themes available in theme selector
2. ✅ Theme persists across app restarts
3. ✅ All UI components render correctly with Kagi colors
4. ✅ No console errors or TypeScript errors
5. ✅ Passes linting and formatting checks
6. ✅ Color contrast meets WCAG AA standards (4.5:1 for normal text)

## References

- [Kagi Custom CSS Documentation](https://help.kagi.com/kagi/features/custom-css.html)
- [Kagi Themes Gallery](https://openkagi.com/themes)
- [Modern Kagi Theme (Orange Accent)](https://gist.github.com/sefidel/ffb677da037e4d6951949a110132fe80)
- [Cozy Kagi Theme (Calm Blue/Moon Dark)](https://gist.github.com/jamesjlyons/26682982319ca84b7bee991eb158ce49)

## Timeline Estimate

**Total Effort**: Medium complexity, ~6-8 hours of work
- Phase 1: 2 hours (color palette definition)
- Phase 2: 2 hours (CSS variables)
- Phase 3: 1 hour (service updates)
- Phase 4: 1 hour (UI updates)
- Phase 5: 2 hours (testing & refinement)
- Phase 6: 30 minutes (documentation)
