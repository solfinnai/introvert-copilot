/** Browser keys for the home profile. Reset demo clears both. */

export const HOME_NOTES_KEY = "ic-home-notes-v1";
export const HOME_IMPORT_KEY = "ic-home-imported-v1";
export const HOME_NOTES_MAX = 2000;

export function cleanHomeNotes(value: string): string {
  return value.replace(/\u2014/g, ", ").replace(/\u2013/g, ", ").slice(0, HOME_NOTES_MAX);
}
