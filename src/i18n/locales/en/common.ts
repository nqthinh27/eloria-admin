export default {
    app: {
        name: 'Eloria Admin',
        description: 'Internal administration portal',
    },
    language: {
        vi: 'Tiếng Việt',
        en: 'English',
    },
    http: {
        unauthorized: 'Your session has expired. Please sign in again.',
        forbidden: 'You do not have permission to perform this action.',
        notFound: 'The requested data could not be found.',
        serverError: 'The system is having trouble. Please try again later.',
        network: 'Cannot reach the server. Please check your connection.',
        timeout: 'The request timed out. Please try again.',
        unknown: 'Something went wrong. Please try again.',
    },
    action: {
        retry: 'Retry',
        close: 'Close',
        cancel: 'Cancel',
        confirm: 'Confirm',
        export: 'Export data',
        exportExcel: 'Export Excel',
        exportPdf: 'Export PDF',
        edit: 'Edit',
        save: 'Save',
        detail: 'Detail',
    },
    dataTable: {
        empty: 'No data',
        error: 'Could not load data. Please try again.',
        searchPlaceholder: 'Search…',
        showingRange: 'Showing {{from}}–{{to}} of {{total}} {{unit}}',
        pageOf: 'Page {{page}} / {{pageCount}}',
        prevPage: 'Previous page',
        nextPage: 'Next page',
    },
    confirmDialog: {
        auditNotice: 'This action will be recorded in the audit log.',
    },
}
