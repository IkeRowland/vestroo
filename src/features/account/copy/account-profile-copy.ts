/**
 * Story 18.9 / FE.18.8 — member-level `/account/profile` (B2B shuttle / organisation language).
 * Not rental or driver-facing wording.
 */
export const accountProfileCopy = {
	pageTitle: 'Your profile',
	pageIntro:
		'Update your personal details and sign-in security. Organisation notifications and billing defaults stay under Organisation → Preferences.',
	backToAccount: 'Back to account home',
	loadingLabel: 'Loading your profile…',

	ariaPersonalSection: 'Personal details',
	sectionPersonalTitle: 'Personal details',
	sectionPersonalDescription:
		'These details identify you across your organisation’s shuttle bookings. They are separate from organisation-wide preferences.',

	fieldFirstName: 'First name',
	fieldFirstNamePlaceholder: 'Given name',
	fieldLastName: 'Last name',
	fieldLastNamePlaceholder: 'Family name',
	fieldWorkEmail: 'Work email',
	fieldWorkEmailHint: 'Sign-in email from your account. Contact support to change it.',
	fieldPhone: 'Mobile or work phone',
	fieldPhoneHint: 'Optional. Use international format (e.g. +27…) or a national number; we validate with the same rules as trip requests.',
	fieldPhonePlaceholder: 'e.g. +27 82 000 0000',

	savePersonal: 'Save personal details',
	savePersonalPending: 'Saving…',
	personalSuccess: 'Your personal details were saved.',
	personalErrorGeneric: 'We could not save your details. Try again.',
	personalErrorFirstNameRequired: 'Enter your first name.',
	personalErrorPhone: 'Enter a valid phone number, or leave the field blank.',
	personalErrorForm: 'Check the form and try again.',

	gateNoSession: 'Not signed in or no organisation access.',

	avatarErrorChooseFile: 'Choose an image file to upload.',
	avatarErrorTooLarge: 'Image is too large (max 2 MB).',
	avatarErrorFormat: 'Use JPEG, PNG, or WebP.',
	avatarErrorServerConfig: 'Server configuration error.',

	ariaAvatarSection: 'Profile photo',
	sectionAvatarTitle: 'Profile photo',
	sectionAvatarDescriptionOn:
		'Upload a square image (JPEG, PNG, or WebP). Maximum size 2 MB. It may appear in the account portal header.',
	sectionAvatarHiddenNote:
		'Profile photo uploads are not enabled in this environment. Your initials will be used where a photo would appear.',
	uploadAvatarButton: 'Upload photo',
	uploadAvatarPending: 'Uploading…',
	avatarSuccess: 'Your profile photo was updated.',
	avatarErrorGeneric: 'We could not upload that image. Check the format and size, then try again.',
	avatarErrorDisabled: 'Photo uploads are disabled.',
	avatarInputAria: 'Choose profile image file',

	ariaSecuritySection: 'Sign-in security',
	sectionSecurityTitle: 'Sign-in security',
	sectionSecurityDescription: 'Change the password you use to sign in to the organisation account portal.',

	fieldCurrentPassword: 'Current password',
	fieldNewPassword: 'New password',
	fieldConfirmPassword: 'Confirm new password',
	passwordPlaceholder: 'Enter password',

	savePassword: 'Update password',
	savePasswordPending: 'Updating…',
	passwordSuccess: 'Your password was updated.',
	passwordErrorGeneric: 'We could not update your password. Try again.',
	passwordErrorWrongCurrent: 'Current password is not correct.',
	passwordErrorMismatch: 'New password and confirmation do not match.',
	passwordErrorWeak: 'Use at least 8 characters for your new password.',

	ariaMfaSection: 'Multi-factor authentication',
	sectionMfaTitle: 'Multi-factor authentication (MFA)',
	sectionMfaDescription: 'Coming soon',

	ariaSessionsSection: 'Active sessions',
	sectionSessionsTitle: 'Active sessions',
	sectionSessionsSupportBody:
		'Session management for signed-in devices is handled by Vestroo support for now. If you believe your account is compromised, change your password above and contact us immediately.',

	ariaMembershipSection: 'Membership and account access',
	sectionMembershipTitle: 'Leave or transfer membership',
	sectionMembershipBody:
		'Removing you from an organisation or transferring your role is not self-serve. Our team coordinates this with your organisation’s administrators.',
	membershipContactCta: 'Contact Vestroo',
	membershipContactHint: 'Opens the contact form in a new tab.',

	passwordFormAria: 'Change account password',
	personalFormAria: 'Edit personal details',
} as const
