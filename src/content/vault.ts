/**
 * THE ROYAL WISH VAULT – owner-only interface text.
 * (Shipped in a separate, lazily loaded chunk; nothing here is secret.)
 */
export const vault = {
  title: 'THE ROYAL WISH VAULT',
  loginLead: 'A private room for the wishes that found their way here.',
  codeLabel: 'Access code',
  openLabel: 'Open the vault',
  closeLabel: 'Close the vault',
  lockLabel: 'Lock & leave',
  refreshLabel: 'Refresh',
  inboxTitle: 'Received wishes',
  empty: 'No wishes yet. The sky is listening.',
  unread: 'Unread',
  read: 'Read',
  markRead: 'Mark as read',
  markUnread: 'Mark as unread',
  back: 'All wishes',
  delete: 'Delete',
  deleteConfirmTitle: 'Delete this wish?',
  deleteConfirmBody: 'It will be removed from the vault permanently. This cannot be undone.',
  deleteConfirm: 'Delete permanently',
  cancel: 'Cancel',

  controlRoomTitle: 'Control room',
  controlRoomLead: 'For the owner only. Visitors never see this.',
  resetLabel: 'RESET ENTIRE EXPERIENCE',
  resetConfirmTitle: 'Reset the entire experience?',
  resetConfirmBody:
    'This will restore Princess Prism to its original first-visit state. All visitor progress, discoveries and completed animations will be reset. Submitted wishes in the Royal Wish Vault will remain untouched.',
  resetConfirm: 'Yes, reset the experience',
  resetDone: 'The experience has been reset. Every device will start fresh on its next visit. Returning to the beginning…',

  errors: {
    'wrong-code': 'That code does not open the vault.',
    locked: 'Too many attempts. The vault is resting for 15 minutes.',
    'vault-not-configured': 'The vault is not set up yet: its access code has not been configured on the server.',
    'storage-unavailable': 'The vault has no storage configured yet.',
    'storage-failed': 'The vault could not be reached just now. Please try again.',
    'not-connected': 'The vault is not connected on this version of the site.',
    unauthorised: 'Your session has ended. Please enter the code again.',
    'not-found': 'That wish is no longer in the vault.',
    network: 'The vault could not be reached. Check your connection and try again.',
    generic: 'Something went wrong. Please try again.',
  } as Record<string, string>,
};
