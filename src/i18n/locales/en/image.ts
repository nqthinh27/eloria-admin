/**
 * `image` namespace — CMS image standards (PLAN Phase 22). **No numbers inside translated strings**:
 * every figure (ratio, px, size, seconds) is interpolated from `IMAGE_SPEC` / `COVER_ROTATE_MS`.
 */
export default {
    hint: {
        line: 'Ratio {{ratio}} · recommended {{rw}} × {{rh}} px · minimum {{mw}} × {{mh}} px · {{formats}} ≤ {{size}}',
        why: 'Why?',
        whyTitle: 'Where does this image appear on the storefront?',
    },

    why: {
        PRODUCT:
            'Product images always sit in a {{ratio}} portrait frame on every page (home, listing, detail). Images with another ratio are cropped to fill the frame.',
        CATEGORY_TILE:
            'The category tile in the home page "Shop by category" grid is a {{ratio}} portrait frame. Images with another ratio are cropped to fill the frame.',
        HOME_HERO:
            'The hero image runs full width at the top of the home page ({{ratio}}). On phones the frame becomes {{mobileRatio}} and only about {{visible}} % of the image width stays visible.',
        BANNER_WIDE:
            'A full-width strip ({{ratio}}). On phones the frame becomes {{mobileRatio}} and only about {{visible}} % of the image width stays visible — keep the subject centred.',
        POST_COVER: 'The post cover is shown in a {{ratio}} frame on the post page and post cards.',
        OG_IMAGE:
            'Image shared to social networks ({{ratio}}). Some platforms crop it to a square, so keep the subject centred.',
        LOGO_SQUARE:
            'The logo is shown in a {{ratio}} square frame, uncropped (the whole image is kept). A transparent background works best.',
    },

    issue: {
        format: 'Unsupported format — only JPG, PNG, GIF or WebP are accepted.',
        formatSoft: 'Prefer {{formats}} for this slot; the current format can still be saved.',
        tooLarge: 'The image is {{size}}, above the {{max}} limit.',
        belowMin:
            'The image is {{w}} × {{h}} px, below the {{minW}} × {{minH}} px minimum — it will look blurry when enlarged.',
        ratioSides:
            'The {{w}} × {{h}} px image does not match the {{ratio}} ratio: about {{percent}} % of its width will be cropped (evenly on both sides).',
        ratioTopBottom:
            'The {{w}} × {{h}} px image does not match the {{ratio}} ratio: about {{percent}} % of its height will be cropped (evenly top and bottom).',
    },

    file: {
        blocked: '"{{name}}": {{reason}}',
        warned: '"{{name}}": {{reason}}',
    },

    field: {
        clear: 'Remove image',
        placeholder: 'Paste the image link (up to 500 characters)',
        measuring: 'Checking the image…',
        loadFailed: 'Could not load an image from this link — check the link.',
        size: 'Image size: {{w}} × {{h}} px',
        linkOnlyNote:
            'Because the image is entered as a link, only its size and ratio can be checked; file size and format cannot.',
        previewButton: 'Preview in frame',
        previewTitle: 'Preview in the real storefront frame',
        blockedNotice: 'This image does not meet the minimum requirements — pick another one before saving.',
    },

    frame: {
        desktop: 'Desktop (from {{px}} px)',
        mobile: 'Phone ({{px}} px)',
        single: 'Display frame',
        empty: 'No image yet',
        safe: {
            default:
                'The subject and any text must sit inside the bright frame — anything outside is cropped on phones.',
            OG_IMAGE:
                'Social networks may crop to a square — keep the subject inside the bright frame at the centre.',
            LOGO_SQUARE: 'Keep the logo inside the bright frame, with an even margin on all sides.',
        },
    },

    hover: {
        primary: 'Image 1 — default',
        secondary: 'Image 2 — on hover',
        empty: 'No image yet',
        hint: 'Hover over the tile to see the hover image.',
        noHover: 'No hover image — hovering the tile will not change the picture.',
        noImages: 'Leave both empty ⇒ the storefront uses the system default image.',
    },

    slides: {
        empty: 'No cover images yet — the Products page will show no banner strip for this category.',
        counter: 'Image {{current}}/{{total}} · changes every {{seconds}} seconds, looping forever',
        single: 'Only 1 image — the storefront shows it statically, no slideshow.',
        pause: 'Pause',
        play: 'Resume',
        reducedMotion:
            'Reduced motion is on — the preview stays on the first image, like the storefront.',
        textOverlay:
            'The storefront draws the category title over the left half of the image — avoid images with built-in text or very bright areas there.',
        gapNote: 'Empty slots are skipped — the remaining images play back to back in order.',
        previewTitle: 'Cover slideshow preview',
    },
}
