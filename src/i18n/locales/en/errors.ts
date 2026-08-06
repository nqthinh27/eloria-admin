/** Bản EN của `vi/errors.ts` — hai file phải luôn có cùng bộ key. */
export default {
    error: {
        authenticate: 'Authentication failed. Please sign in again.',
        login: {
            fail: 'Incorrect username or password.',
        },
        password: {
            incorrect: 'Incorrect password.',
        },
        token: {
            invalid: 'Your session is invalid. Please sign in again.',
            forbidden: 'This account is not allowed to perform this action.',
        },
        forbidden: 'You do not have permission to access this feature.',
        activateCode: {
            invalid: 'The activation code is invalid or has expired.',
        },

        user: {
            notExisted: 'The account does not exist.',
            notAvailable: 'The account is unavailable.',
            inactive: 'The account has not been activated.',
            locked: 'The account has been locked.',
            cannotModifySelf: 'You cannot perform this action on your own account.',
            emptyTiktokId: 'No TikTok information available.',
            emptyYoutubeId: 'No YouTube information available.',
        },
        username: {
            existed: 'This username is already taken.',
            invalid: 'The username is invalid.',
        },
        email: {
            existed: 'This email is already in use.',
            notExisted: 'This email does not exist in the system.',
        },
        phone: {
            existed: 'This phone number is already in use.',
        },
        role: {
            notAllowed: 'You are not allowed to assign this role.',
        },
        staff: {
            referenced: 'This employee is referenced elsewhere and cannot be deleted.',
        },

        branch: {
            notExisted: 'The branch does not exist.',
            nameExisted: 'A branch with this name already exists.',
            required: 'Please select a branch.',
            inactive: 'This branch is inactive.',
            hasStaff: 'This branch still has employees and cannot be deleted.',
            hasActiveStaff: 'This branch still has active employees and cannot be deactivated.',
        },

        address: {
            provinceInvalid: 'Invalid province/city.',
            wardInvalid: 'Invalid ward.',
        },

        image: {
            notAvailable: 'The image could not be loaded.',
        },

        input: {
            invalid: 'The submitted data is invalid.',
        },
        validation: 'Invalid data. Please review the fields you entered.',
        dataIntegrity: {
            violation: 'This record is in use elsewhere and the action cannot be completed.',
        },
        concurrencyFailure: 'This record was just changed by someone else. Please reload and try again.',
        other: 'Something went wrong. Please try again.',
    },
}
