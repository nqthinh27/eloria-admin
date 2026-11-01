/**
 * `image` namespace — CMS image standards (PLAN Phase 22). **No numbers inside translated strings**:
 * every figure (ratio, px, size, seconds) is interpolated from `IMAGE_SPEC` / `COVER_ROTATE_MS`.
 */
export default {
    hint: {
        line: 'Ratio {{ratio}} · recommended {{rw}} × {{rh}} px · minimum {{mw}} × {{mh}} px · {{formats}} ≤ {{size}}',
        /** Only on slots that accept video (product · banner · category). */
        video: 'Videos MP4 · WebM · MOV ≤ {{size}} are accepted (muted, looping). Export as MP4 H.264 — HEVC MOV (iPhone default) may not play in Chrome.',
        why: 'Why?',
        whyTitle: 'Where does this image appear on the storefront?',
    },

    why: {
        PRODUCT:
            'Product images always sit in a {{ratio}} portrait frame on every page (home, listing, detail). Images with another ratio are cropped to fill the frame.',
        CATEGORY_TILE:
            'The category tile in the home page "Shop by category" grid is a {{ratio}} portrait frame. Images with another ratio are cropped to fill the frame.',
        HOME_HERO:
            'The hero image runs full width at the top of the home page ({{ratio}}). On phones the frame fills the screen height (narrowest screen {{mobileRatio}}), so only about {{visible}} % of the image width stays visible — keep the subject and text centred.',
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
        formatMedia:
            'Unsupported format — only JPG, PNG, GIF, WebP images or MP4, WebM, MOV videos are accepted.',
        videoUnplayable:
            'The browser cannot read this video (usually an iPhone HEVC MOV) — it can still be saved but may not play on the storefront. Re-export as MP4 H.264.',
        formatSoft: 'Prefer {{formats}} for this slot; the current format can still be saved.',
        tooLarge: 'The file is {{size}}, above the {{max}} limit.',
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
        uploaded: 'Image saved.',
        removed: 'Image removed.',
        appliesNow: 'Images are saved as soon as you upload or remove them — independent of Save / Cancel.',
        replace: 'Replace image',
        pending: 'Will upload on save: {{name}}',
        upload: 'Upload image',
        uploading: 'Uploading…',
        measuring: 'Checking the image…',
        size: 'Size: {{w}} × {{h}} px',
        previewButton: 'Preview in frame',
        previewTitle: 'Preview in the real storefront frame',
    },

    /** Fullscreen image viewer dialog — shared across grid/table/detail/form (CONVENTIONS section 5). */
    viewer: {
        previous: 'Previous image',
        next: 'Next image',
        close: 'Close',
        openHint: 'Click to view fullscreen',
        counter: '{{current}} / {{total}}',
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
