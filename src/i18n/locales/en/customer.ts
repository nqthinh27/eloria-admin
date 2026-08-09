export default {
    customer: {
        pageTitle: 'Customer management',
        pageDescription: 'CRM – online and in-store customers combined',

        list: {
            searchPlaceholder: 'Search name, phone number…',
            allBranches: 'All branches',
            allStatuses: 'All statuses',
            resultLabel: 'customers',
            addButton: 'Add customer',
            column: {
                customer: 'CUSTOMER',
                contact: 'CONTACT',
                branch: 'BRANCH',
                membershipPoint: 'LOYALTY POINTS',
                status: 'STATUS',
                createdDate: 'CREATED',
                actions: 'ACTIONS',
            },
            noBranch: 'No branch assigned',
            noEmail: 'No email',
            statusActive: 'Active',
            statusInactive: 'Inactive',
            actionEdit: 'Edit profile',
            empty: 'No customers yet',
        },

        form: {
            addTitle: 'Add customer',
            editTitle: 'Edit customer profile',
            fullName: 'Full name',
            fullNamePlaceholder: 'Enter full name',
            phoneNumber: 'Phone number',
            phoneNumberPlaceholder: 'Enter phone number',
            email: 'Email',
            emailPlaceholder: 'Leave blank to auto-generate',
            dob: 'Date of birth',
            gender: 'Gender',
            genderPlaceholder: 'Select gender',
            branch: 'Branch',
            branchPlaceholder: 'Select branch',
            submitCreate: 'Add customer',
            submitUpdate: 'Save changes',
            submitting: 'Saving…',
            phoneLockedHint: 'Phone number and branch cannot be changed after creation',
            validation: {
                fullNameRequired: 'Please enter the full name',
                fullNameMaxLength: 'Full name must be at most 100 characters',
                phoneInvalid: 'Phone number must be 10 digits starting with 0',
                emailInvalid: 'Invalid email address',
                branchRequired: 'Please select a branch',
            },
        },

        detail: {
            title: 'Customer details',
            genderMale: 'Male',
            genderFemale: 'Female',
            genderOther: 'Other',
            notUpdated: 'Not provided',
        },

        duplicate: {
            checking: 'Checking for duplicate phone number…',
            foundTitle: 'Phone number already registered',
            foundDescription: 'Customer "{{name}}" ({{branch}}) already uses this phone number.',
            notViewableTitle: 'Phone number already in use',
            notViewableDescription:
                'This phone number belongs to a profile in another branch. Contact an administrator to look it up or merge the profiles.',
            viewButton: 'View existing profile',
        },

        toast: {
            created: 'Customer added successfully',
            updated: 'Customer updated successfully',
            exportComingSoon: 'Data export will be available once the backend supports it',
        },
    },
}
