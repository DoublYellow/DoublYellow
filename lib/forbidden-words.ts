/**
 * Forbidden username patterns.
 * Checked against a normalised version of the username (lowercase, common
 * leet-speak substitutions replaced) so variants like "4dmin" or "r4c1st"
 * are also caught.
 */

const FORBIDDEN_WORDS: string[] = [
  // ── Impersonation / official-sounding ─────────────────────────────────────
  'admin', 'administrator', 'moderator', 'mod', 'staff', 'support',
  'doubleyellow', 'doubleyellowapp', 'official', 'system', 'bot',

  // ── Racial slurs ──────────────────────────────────────────────────────────
  'nigger', 'nigga', 'niga', 'chink', 'spic', 'spick', 'kike', 'gook',
  'wetback', 'coon', 'jigaboo', 'sambo', 'paki', 'raghead', 'towelhead',
  'beaner', 'zipperhead', 'slope', 'cracker', 'honky', 'gringo',
  'darkie', 'golliwog', 'wog', 'yid', 'heeb', 'hymie', 'raghead',

  // ── Homophobic / transphobic ───────────────────────────────────────────────
  'faggot', 'fag', 'dyke', 'tranny', 'shemale', 'queer',

  // ── General offensive / sexual ────────────────────────────────────────────
  'cunt', 'fuck', 'fucker', 'fucking', 'shit', 'shitter', 'asshole',
  'arsehole', 'bastard', 'bitch', 'cock', 'dick', 'dickhead', 'prick',
  'pussy', 'twat', 'wanker', 'whore', 'slut', 'skank', 'bollocks',
  'bellend', 'knobhead', 'minge', 'tit', 'tits', 'boobs', 'penis',
  'vagina', 'anus', 'rectum', 'cum', 'jizz', 'spunk', 'rape',

  // ── Hate / extremism ──────────────────────────────────────────────────────
  'nazi', 'hitler', 'heil', 'kkk', 'nonce', 'paedo', 'pedo', 'pedophile',
  'paedophile', 'jihad', 'terrorist',

  // ── Scam / misleading ─────────────────────────────────────────────────────
  'freeprize', 'winner', 'lottery', 'giveaway', 'clickhere',
];

/** Normalise a string to catch common leet-speak substitutions */
function normalise(str: string): string {
  return str
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/8/g, 'b')
    .replace(/[@]/g, 'a')
    .replace(/[^a-z]/g, ''); // strip non-alpha chars so "f.u.c.k" → "fuck"
}

/**
 * Returns true if the username contains a forbidden word.
 * Call this before saving any username.
 */
export function containsForbiddenWord(username: string): boolean {
  const norm = normalise(username);
  return FORBIDDEN_WORDS.some((word) => norm.includes(normalise(word)));
}
