"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENTROPY_BYTES = exports.MNEMONIC_WORDS = exports.WORD_COUNT = exports.WORD_LIST = void 0;
exports.wordIndex = wordIndex;
/**
 * 256-word list for Sierpinski HD wallet mnemonics.
 * Each word encodes one byte (0–255).  Identical to the Zig implementation
 * in wallet.zig so mnemonics are interoperable.
 */
exports.WORD_LIST = [
    // 0..7
    "able", "acid", "also", "area", "army", "baby", "back", "ball",
    // 8..15
    "band", "bank", "bare", "barn", "base", "bath", "beam", "bean",
    // 16..23
    "bear", "beat", "beef", "bell", "best", "bike", "bird", "bite",
    // 24..31
    "blue", "boat", "bold", "bolt", "bond", "bone", "book", "boot",
    // 32..39
    "born", "both", "bowl", "bulk", "burn", "busy", "cage", "cake",
    // 40..47
    "call", "calm", "came", "camp", "card", "care", "case", "cash",
    // 48..55
    "cave", "cell", "chef", "chip", "clan", "clay", "clip", "club",
    // 56..63
    "coal", "coat", "code", "coil", "cold", "come", "cook", "cool",
    // 64..71
    "cope", "copy", "core", "cork", "corn", "cost", "cozy", "crew",
    // 72..79
    "crop", "cube", "cure", "curl", "dash", "data", "dawn", "days",
    // 80..87
    "deal", "dear", "deck", "deep", "deer", "deft", "dent", "desk",
    // 88..95
    "dial", "dice", "diet", "disk", "dive", "dock", "does", "dome",
    // 96..103
    "done", "door", "dose", "down", "draw", "drum", "dual", "duke",
    // 104..111
    "dune", "dusk", "dust", "duty", "each", "earn", "ease", "edge",
    // 112..119
    "else", "emit", "epic", "even", "ever", "exam", "face", "fact",
    // 120..127
    "fair", "fall", "farm", "fast", "fear", "feed", "feel", "fell",
    // 128..135
    "felt", "file", "fill", "film", "find", "fine", "fire", "firm",
    // 136..143
    "fish", "fist", "flag", "flat", "flew", "flex", "flip", "flow",
    // 144..151
    "foam", "fold", "folk", "font", "food", "fool", "foot", "ford",
    // 152..159
    "fork", "form", "fort", "free", "from", "fuel", "full", "fund",
    // 160..167
    "fuse", "gain", "game", "gaze", "gear", "gift", "give", "glad",
    // 168..175
    "glow", "glue", "goal", "goat", "gold", "gone", "good", "gown",
    // 176..183
    "grab", "gray", "grew", "grid", "grip", "grow", "gulf", "gust",
    // 184..191
    "half", "hall", "halt", "hand", "hang", "hard", "harm", "hash",
    // 192..199
    "have", "hawk", "head", "heal", "heap", "heat", "heel", "held",
    // 200..207
    "help", "herb", "hero", "high", "hill", "hint", "hold", "hole",
    // 208..215
    "home", "hook", "hope", "horn", "host", "huge", "hull", "hump",
    // 216..223
    "hunt", "hurt", "idle", "inch", "into", "iris", "iron", "isle",
    // 224..231
    "item", "jade", "jazz", "join", "jump", "jury", "just", "keen",
    // 232..239
    "keep", "kelp", "kind", "king", "knot", "know", "lace", "lake",
    // 240..247
    "land", "lane", "lark", "last", "late", "lead", "leaf", "lean",
    // 248..255
    "leap", "left", "lend", "lens", "life", "lift", "like", "lime",
];
exports.WORD_COUNT = 256;
exports.MNEMONIC_WORDS = 16;
exports.ENTROPY_BYTES = 16;
/** Return the index of a word, or -1 if not in the list. */
function wordIndex(word) {
    return exports.WORD_LIST.indexOf(word);
}
//# sourceMappingURL=wallet-wordlist.js.map