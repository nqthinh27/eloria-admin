export default {
    pageTitle: 'About us',
    pageDescription: 'Content of the storefront "About us" page — edit in place, changes apply when saved.',
    loading: 'Loading content…',
    loadFailed: 'Could not load the page content. Please try again.',
    retry: 'Retry',
    lastSaved: 'Last saved {{time}}',

    images: {
        title: 'Header images',
        description:
            'Up to 5 images in a row, growing towards the centre. The storefront only shows an ODD number of images (1, 3 or 5): empty slots are skipped and with an even count the last image is dropped.',
        slot: 'Image {{n}}',
        caption: 'Saved as soon as you pick an image.',
        moveLeft: 'Swap with the image on the left',
        moveRight: 'Swap with the image on the right',
        count: '{{filled}} images — the storefront shows {{shown}}.',
        countEven: '{{filled}} images (even) — the storefront shows only {{shown}}, dropping the last one. Add or remove one image to show them all.',
        countNone: 'No images yet — the storefront hides the header strip.',
        preview: 'Layout preview on the storefront',
        center: 'Centre image (largest)',
    },

    content: {
        title: 'Content',
        description:
            'The large title, a short tagline and the content below the image strip. Use centring, button links and borderless tables (image | text) to lay out the page.',
        heading: 'Page title',
        headingPlaceholder: 'e.g. About us',
        subtitle: 'Short tagline',
        subtitlePlaceholder: 'e.g. éloria — More than just clothes',
        body: 'Content',
    },

    submit: 'Save content',
    submitting: 'Saving…',
    unsaved: 'Unsaved changes',

    validation: {
        noAngleBrackets: 'Must not contain < or >',
        titleRequired: 'Please enter the page title',
        titleMaxLength: 'Title must be at most 150 characters',
        subtitleMaxLength: 'Tagline must be at most 255 characters',
        contentMaxLength: 'Content is too long (max 200,000 characters)',
        metaTitleMaxLength: 'SEO title must be at most 150 characters',
        metaDescriptionMaxLength: 'SEO description must be at most 300 characters',
    },

    toast: {
        saved: 'About us page saved',
        imageSaved: 'Header image updated',
        imageRemoved: 'Image removed',
    },
}
