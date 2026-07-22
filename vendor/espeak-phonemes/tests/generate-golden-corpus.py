#!/usr/bin/env python3
"""Generate golden corpus: reference IPA output for English voice variants.

Run from the build directory:
    ESPEAK_DATA_PATH=$(pwd) python3 ../tests/generate-golden-corpus.py

Output: tests/golden-corpus.ndjson (one JSON object per line)
         tests/golden-corpus.json (single JSON array)
"""

import json
import subprocess
import sys
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BUILD_DIR = REPO_ROOT / "build"
ESPEAK = BUILD_DIR / "src" / "espeak-ng"
DATA_DIR = BUILD_DIR

def run_ipa(lang, text):
    env = os.environ.copy()
    env["ESPEAK_DATA_PATH"] = str(DATA_DIR)
    env["LD_LIBRARY_PATH"] = str(BUILD_DIR / "src") + ":" + env.get("LD_LIBRARY_PATH", "")
    result = subprocess.run(
        [str(ESPEAK), "-q", "--ipa", "-v", lang, text],
        capture_output=True, text=True, env=env, timeout=30
    )
    ipa = result.stdout.strip()
    return ipa

ENTRIES = []

def add(lang, text):
    ipa = run_ipa(lang, text)
    ENTRIES.append({"lang": lang, "text": text, "ipa": ipa})
    print(f"  [{lang}] {text!r} -> {ipa}")

print("Generating golden corpus...")
print()

# ============ Common words ============
print("=== Common words ===")
COMMON_WORDS = [
    "hello", "world", "the", "quick", "brown", "fox", "jumps", "over",
    "lazy", "dog", "this", "is", "a", "test", "of", "and", "to", "in",
    "it", "for", "with", "on", "that", "was", "are", "but", "not",
    "you", "all", "have", "be", "or", "one", "had", "by", "word",
    "said", "what", "we", "when", "can", "your", "about", "into",
    "other", "more", "some", "people", "time", "water", "been", "now",
    "find", "long", "down", "day", "did", "get", "may", "come",
    "made", "part", "could", "great", "such", "only", "these", "very",
    "after", "thing", "our", "just", "most", "year", "also", "even",
    "back", "much", "before", "two", "new", "first", "any", "work",
    "place", "live", "where", "while", "might", "again", "little",
    "ever", "every", "own", "through", "still", "being", "both",
    "life", "under", "never", "same", "another", "well", "must",
    "because", "does", "here", "give", "help", "free", "from",
    "high", "read", "right", "left", "hand", "show", "need", "name",
    "good", "old", "way", "house", "know", "think", "want", "mean",
    "feel", "like", "take", "use", "tell", "ask", "water", "money",
    "friend", "family", "school", "book", "car", "door", "room",
    "mother", "father", "sister", "brother", "child", "children",
    "morning", "evening", "afternoon", "today", "tomorrow", "yesterday",
    "breakfast", "lunch", "dinner", "please", "thanks", "sorry",
    "always", "often", "sometimes", "never", "maybe", "perhaps",
    "able", "above", "across", "address", "almost", "alone",
    "already", "also", "although", "among", "amount", "animal",
    "answer", "appear", "apple", "area", "army", "around",
    "arrive", "article", "avoid", "baby", "ball", "bank",
    "base", "battle", "beauty", "become", "begin", "behind",
    "believe", "belong", "below", "beside", "beyond", "bill",
    "black", "blood", "board", "boat", "body", "born",
    "bottom", "brain", "branch", "break", "bridge", "bring",
    "broad", "brother", "build", "business", "busy", "camera",
    "capital", "captain", "care", "carry", "case", "catch",
    "cause", "center", "century", "certain", "chair", "chance",
    "change", "character", "charge", "check", "choose", "church",
    "circle", "citizen", "claim", "class", "clean", "clear",
    "close", "coast", "coffee", "collect", "college", "color",
    "column", "come", "comfort", "common", "community", "company",
    "compare", "complete", "condition", "connect", "consider",
    "contain", "content", "continue", "control", "correct",
    "cost", "could", "council", "count", "country", "course",
    "court", "cover", "create", "crime", "cross", "crowd",
    "culture", "current", "custom", "cut", "damage", "danger",
    "daughter", "dead", "deal", "death", "debate", "decide",
    "decision", "deep", "defeat", "defense", "degree", "demand",
    "depend", "describe", "design", "detail", "determine",
    "develop", "die", "difference", "difficult", "dinner",
    "direction", "discover", "discuss", "disease", "distance",
    "distinguish", "divide", "document", "double", "doubt",
    "dozen", "draw", "dream", "dress", "drink", "drive",
    "drop", "drug", "during", "duty", "each", "early",
    "earth", "east", "easy", "economy", "edge", "edition",
    "educate", "effect", "effort", "eight", "either", "election",
    "element", "eleven", "else", "employ", "encourage", "enemy",
    "energy", "engage", "engine", "enough", "enter", "entire",
    "environment", "equal", "equipment", "escape", "especially",
    "establish", "even", "evening", "event", "evidence", "exactly",
    "examine", "example", "exchange", "excuse", "exercise",
    "exist", "expect", "experience", "expert", "explain",
    "express", "extend", "extent", "external", "extreme",
    "fact", "fail", "fair", "faith", "fall", "familiar",
    "famous", "farm", "fast", "father", "fear", "feature",
    "feed", "field", "fight", "figure", "file", "fill",
    "film", "final", "financial", "finger", "finish", "fire",
    "firm", "fish", "five", "floor", "follow", "food",
    "force", "foreign", "forest", "forget", "form", "former",
    "fortune", "forward", "four", "free", "fresh", "friend",
    "front", "fruit", "full", "function", "future", "gain",
    "game", "garden", "general", "gentleman", "genuine", "gesture",
    "giant", "girl", "glass", "global", "goal", "gold",
    "government", "grass", "green", "ground", "group", "growth",
    "guess", "guest", "guide", "gun", "habit", "half",
    "hall", "hand", "handle", "hang", "happen", "happy",
    "hard", "hate", "head", "health", "hear", "heart",
    "heat", "heaven", "heavy", "height", "hell", "help",
    "here", "heritage", "hide", "hill", "history", "hit",
    "hold", "hole", "home", "honor", "hope", "horse",
    "hospital", "hotel", "hour", "house", "human", "hundred",
    "hunger", "hunt", "hurry", "hurt", "husband", "idea",
    "identify", "ignore", "image", "imagine", "immediate",
    "impact", "import", "impose", "improve", "include",
    "income", "increase", "indeed", "indicate", "industry",
    "influence", "inform", "initial", "injury", "inner",
    "inquiry", "insist", "inspect", "instead", "interest",
    "internal", "international", "interrupt", "interview",
    "introduce", "invest", "investigate", "invite", "involve",
    "island", "issue", "item", "itself", "jacket", "job",
    "join", "journey", "joy", "judge", "jump", "justice",
    "keep", "key", "kill", "kind", "king", "kitchen",
    "knowledge", "land", "language", "large", "last", "late",
    "latter", "laugh", "launch", "law", "lay", "lead",
    "leader", "learn", "least", "leave", "legal", "less",
    "lesson", "level", "lie", "life", "light", "limit",
    "line", "link", "list", "listen", "literature", "little",
    "live", "load", "local", "locate", "lock", "logical",
    "lonely", "long", "look", "lord", "lose", "loss",
    "lot", "loud", "love", "lovely", "low", "luck",
    "lunch", "machine", "magazine", "main", "maintain", "major",
    "majority", "make", "male", "manage", "manner", "many",
    "map", "march", "margin", "mark", "market", "marriage",
    "master", "match", "material", "matter", "mayor", "meal",
    "mean", "measure", "meat", "medical", "medium", "meet",
    "member", "memory", "mention", "message", "metal", "method",
    "middle", "might", "military", "million", "mind", "minister",
    "minute", "miss", "mistake", "model", "modern", "moment",
    "money", "month", "moral", "morning", "mother", "motion",
    "mountain", "mouth", "move", "movement", "murder", "music",
    "narrow", "nation", "native", "natural", "nature", "near",
    "nearly", "necessary", "neck", "need", "negative", "neighbor",
    "neither", "network", "never", "nevertheless", "next", "nice",
    "night", "nine", "nobody", "noise", "normal", "north",
    "nose", "note", "nothing", "notice", "notion", "number",
    "object", "obtain", "occasion", "occur", "ocean", "odd",
    "offer", "office", "officer", "official", "often", "oil",
    "old", "once", "open", "operate", "opinion", "oppose",
    "option", "order", "organization", "origin", "original",
    "other", "otherwise", "ought", "outcome", "outside", "over",
    "overcome", "owner", "page", "pain", "paint", "pair",
    "panel", "paper", "parent", "park", "part", "particular",
    "partner", "party", "pass", "passage", "passenger", "past",
    "path", "patient", "pattern", "pause", "pay", "payment",
    "peace", "peculiar", "people", "percent", "perfect", "perform",
    "perhaps", "period", "permanent", "permit", "person",
    "personal", "persuade", "phone", "physical", "pick", "picture",
    "piece", "place", "plan", "plant", "play", "player",
    "please", "pleasure", "plenty", "pocket", "point", "police",
    "policy", "political", "poor", "popular", "population",
    "position", "positive", "possess", "possible", "post", "pot",
    "potential", "pound", "power", "practice", "pray", "prayer",
    "prefer", "prepare", "presence", "present", "president",
    "press", "pressure", "pretend", "pretty", "prevent", "previous",
    "price", "prime", "principle", "print", "prior", "prison",
    "private", "prize", "probably", "problem", "procedure",
    "produce", "product", "program", "progress", "project",
    "promise", "promote", "proper", "property", "proportion",
    "proposal", "propose", "prospect", "protect", "protection",
    "protest", "proud", "prove", "provide", "provision",
    "public", "publish", "pull", "purpose", "pursue", "push",
    "put", "quality", "quarter", "question", "quick", "quiet",
    "quite", "race", "raise", "range", "rate", "rather",
    "reach", "react", "read", "ready", "real", "reality",
    "realize", "reason", "receive", "recent", "recognize",
    "recommend", "record", "recover", "red", "reduce", "refer",
    "reflect", "reform", "region", "regret", "reject", "relate",
    "relation", "relative", "release", "relief", "religion",
    "rely", "remain", "remark", "remember", "remind", "remove",
    "repeat", "replace", "report", "represent", "republic",
    "reputation", "request", "require", "research", "reserve",
    "resident", "resist", "resolve", "resort", "resource",
    "respond", "response", "responsibility", "rest", "restore",
    "result", "retain", "retire", "return", "reveal", "revenue",
    "review", "revolution", "rich", "ride", "right", "ring",
    "rise", "risk", "river", "road", "rock", "role",
    "roll", "roof", "room", "root", "rough", "round",
    "route", "row", "royal", "rule", "run", "rush",
    "safe", "safety", "sail", "sake", "salary", "sale",
    "salt", "sample", "sand", "satisfy", "save", "scale",
    "scene", "scheme", "school", "science", "score", "screen",
    "sea", "search", "season", "seat", "second", "secret",
    "section", "security", "seed", "seek", "select", "self",
    "sell", "senate", "send", "senior", "sense", "sentence",
    "separate", "sequence", "serious", "servant", "serve",
    "service", "session", "set", "settle", "seven", "several",
    "severe", "shade", "shadow", "shake", "shall", "shape",
    "share", "sharp", "sheet", "shelf", "shell", "shelter",
    "shift", "shine", "ship", "shock", "shoe", "shoot",
    "shop", "shore", "short", "shot", "should", "shoulder",
    "shout", "show", "shut", "sick", "side", "sight",
    "sign", "signal", "silence", "silver", "similar", "simple",
    "since", "sing", "single", "sister", "site", "situation",
    "six", "size", "skill", "skin", "sky", "slave",
    "sleep", "slice", "slide", "slight", "slip", "slow",
    "small", "smart", "smell", "smile", "smoke", "smooth",
    "snake", "snow", "social", "society", "soft", "soil",
    "soldier", "solution", "solve", "some", "someone", "son",
    "song", "soon", "sort", "soul", "sound", "source",
    "south", "space", "speak", "special", "specific", "speech",
    "speed", "spend", "spirit", "spite", "split", "sport",
    "spot", "spread", "spring", "square", "stable", "staff",
    "stage", "stand", "standard", "star", "stare", "start",
    "state", "station", "status", "stay", "steady", "steal",
    "steel", "step", "stick", "still", "stock", "stomach",
    "stone", "stop", "store", "storm", "story", "strange",
    "strategy", "stream", "street", "strength", "stress", "stretch",
    "strike", "string", "stroke", "strong", "structure", "struggle",
    "student", "study", "stuff", "style", "subject", "submit",
    "subsequent", "substance", "succeed", "success", "suffer",
    "sufficient", "sugar", "suggest", "suit", "summer", "summit",
    "supply", "support", "suppose", "sure", "surface", "surgery",
    "surprise", "surround", "survey", "survive", "suspect",
    "sustain", "swear", "sweep", "sweet", "swim", "swing",
    "switch", "symbol", "system", "table", "tail", "take",
    "tale", "talent", "talk", "tank", "tape", "target",
    "task", "taste", "tax", "tea", "teach", "teacher",
    "team", "tear", "telephone", "television", "tell", "temperature",
    "tend", "term", "test", "text", "thank", "theme",
    "theory", "thing", "think", "third", "thirty", "though",
    "thought", "thousand", "threat", "three", "throat", "through",
    "throw", "ticket", "tight", "till", "time", "tip",
    "tire", "title", "today", "together", "tomorrow", "tone",
    "tonight", "tool", "top", "total", "touch", "tour",
    "toward", "tower", "town", "track", "trade", "tradition",
    "traffic", "train", "transfer", "transform", "travel",
    "treat", "treatment", "treaty", "tree", "trial", "tribe",
    "trick", "trip", "trouble", "truck", "true", "truly",
    "trust", "truth", "try", "tube", "turn", "twelve",
    "twenty", "twice", "twin", "two", "type", "typical",
    "ugly", "uncle", "under", "understand", "union", "unique",
    "unit", "unite", "universe", "university", "unless", "unlike",
    "unlikely", "until", "unusual", "update", "upon", "upper",
    "urban", "urge", "use", "used", "useful", "user",
    "usual", "valley", "value", "variety", "various", "vast",
    "vehicle", "version", "very", "vessel", "veteran", "victim",
    "victory", "video", "view", "village", "violence", "vision",
    "visit", "visual", "voice", "volume", "vote", "wage",
    "wait", "walk", "wall", "want", "war", "warm",
    "warn", "wash", "waste", "watch", "water", "wave",
    "way", "weak", "wealth", "weapon", "wear", "weather",
    "web", "wedding", "week", "weekend", "weight", "welcome",
    "welfare", "well", "west", "western", "wet", "whether",
    "while", "white", "whole", "whom", "wide", "wife",
    "wild", "will", "win", "wind", "window", "wine",
    "wing", "winner", "winter", "wire", "wise", "wish",
    "with", "withdraw", "within", "without", "witness", "woman",
    "wonder", "wood", "word", "work", "worker", "world",
    "worry", "worth", "would", "wrap", "write", "writer",
    "wrong", "yard", "year", "yesterday", "yet", "young",
    "zero", "zone",
]
for w in COMMON_WORDS:
    add("en", w)

# ============ Numbers ============
print("=== Numbers ===")
for lang in ["en", "en-US", "en-GB", "en-GB-scotland"]:
    for nums in [
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "10", "11", "12", "13", "14", "15", "16", "17", "18", "19",
        "20", "21", "30", "40", "50", "60", "70", "80", "90", "100",
        "365", "1000", "1000000", "1000000000",
        "123", "4357", "14683", "742359", "6475328",
    ]:
        add(lang, nums)

# ============ Ordinals ============
print("=== Ordinals ===")
for lang in ["en", "en-US", "en-GB", "en-GB-scotland"]:
    for ord in [
        "0th", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th",
        "10th", "11th", "12th", "13th", "14th", "15th", "16th", "17th", "18th", "19th",
        "20th", "30th", "40th", "100th", "1000th", "365th", "123rd",
    ]:
        add(lang, ord)

# ============ Dates, months, days ============
print("=== Dates & Time ===")
for lang in ["en", "en-US", "en-GB"]:
    for item in [
        "January", "February", "March", "April", "June", "July",
        "August", "September", "October", "November", "December",
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
        "3:45pm", "12:00", "June 4th", "January 1st", "December 25th",
    ]:
        add(lang, item)

# ============ Sentences ============
print("=== Sentences ===")
for lang in ["en", "en-US", "en-GB"]:
    for sent in [
        "The quick brown fox jumps over the lazy dog",
        "This is a test of the emergency broadcast system",
        "Hello world, this is a test of numbers and speech",
        "Something important",
        "Capitals",
        "I have a dream",
        "You have mail",
        "We have come here today",
        "It is not a digest to digest",
        "The Polish polish was shiny",
        "Read to be read",
        "Alternate soon alternate and alternates soon alternates",
        "A. B C, D. E: F.",
        "He said: Hello, I am back.",
        "He said: I was born in the U.S.A.'s and left.",
        "Within within within within",
        "For you and thee I compare thee",
        "I won't have but you should have and they should have",
        "Upon this I've had what I've had",
        "You know it because this has since been",
        "Motd of the irc mmorpg",
        "Such as adblock adverse absentee gastrointestinal",
        "Aeon mediaeval. Oeconomy phoenix. Lost history.",
        "IT HAS US vs it has us",
        "Maelstrom maelstrom",
    ]:
        add(lang, sent)

# ============ Lexical sets ============
print("=== Lexical sets ===")
for lang in ["en", "en-US", "en-GB", "en-GB-scotland", "en-GB-x-gbclan", "en-GB-x-gbcwmd", "en-GB-x-rp", "en-029"]:
    add(lang, "kit dress trap lot strut foot fleece palm thought goose nurse start north force cure near square term bird happy comma letter explore roses rabbit face price choice goat mouth bath cloth million divided")

# ============ Abbreviations ============
print("=== Abbreviations ===")
for lang in ["en", "en-US", "en-GB"]:
    for abbr in [
        "Dr.", "Mr.", "Mrs.", "Ms.", "St.", "Ave.", "vs.", "e.g.", "i.e.",
        "etc.", "U.S.A.", "U.K.", "IBM", "MIT", "APH", "CES", "ITX",
        "ibm mit ibms mits IBM MIT APH CES ITX IBMs MITs APHs CESs ITXs",
    ]:
        add(lang, abbr)

# ============ Punctuation and edge cases ============
print("=== Punctuation ===")
for lang in ["en", "en-US", "en-GB"]:
    for punct in [
        "hello world",
        "Hello world",
        "Hello, world!",
        "Hello... world?",
        "foo..",
        "foo...",
        "f'eIs pr'aIs tS'OIs g'oUt m'aUT b'aaT",
        "0.99",
        "220",
        "*****",
    ]:
        add(lang, punct)

# ============ Contractions ============
print("=== Contractions ===")
for lang in ["en", "en-US", "en-GB"]:
    for cont in [
        "it's", "don't", "can't", "won't", "I'm", "you're", "they're",
        "I've", "I'll", "he'll", "she'll", "we'll", "they'll",
        "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't",
        "hadn't", "couldn't", "wouldn't", "shouldn't", "mustn't",
        "needn't", "daren't", "mightn't",
    ]:
        add(lang, cont)

# ============ Currency ============
print("=== Currency ===")
for lang in ["en", "en-US", "en-GB"]:
    for curr in ["£10", "$20", "€30", "50%", "100%", "$1.50", "£24.99"]:
        add(lang, curr)

# ============ Homographs ============
print("=== Homographs ===")
for lang in ["en", "en-US", "en-GB"]:
    for hom in [
        "read", "lead", "wind", "tear", "bow", "close", "live",
        "minute", "object", "present", "record", "refuse", "subject",
    ]:
        add(lang, hom)

# ============ Dialect differences ============
print("=== Dialect differences ===")
for lang in ["en", "en-US", "en-GB"]:
    for word in [
        "schedule", "tomato", "either", "neither", "privacy", "vitamin",
        "advertisement", "garage", "leisure", "debuted", "route",
        "herb", "cyst", "direct", "address", "adult", "controversy",
    ]:
        add(lang, word)

# ============ Newline handling ============
print("=== Newline handling ===")
for lang in ["en", "en-US"]:
    add(lang, "\n")
    add(lang, "hello\nworld")
    add(lang, "hello\n\nworld")

# ============ Emoji ============
print("=== Emoji ===")
for lang in ["en", "en-US"]:
    add(lang, "♈")
    add(lang, "⁉")
    add(lang, "🤣")
    add(lang, "♈🌈")
    add(lang, "Aries ♈")
    add(lang, "fish🐠")
    add(lang, "Hello world 🌈")

# ============ Hyphenated ============
print("=== Hyphenated ===")
for lang in ["en", "en-US", "en-GB"]:
    for hyp in [
        "brother-in-law", "passer-by", "well-being", "mother-in-law",
        "up-to-date", "state-of-the-art", "editor-in-chief",
    ]:
        add(lang, hyp)

# ============ Shaw alphabet ============
print("=== Shaw alphabet ===")
add("en", "𐑣𐑽𐑦𐑙 𐑥𐑰 𐑚𐑴, 𐑞 𐑨𐑠𐑼 𐑔𐑮𐑳𐑖 𐑒𐑷𐑟. 𐑺 𐑘𐑹 𐑡𐑶𐑓𐑩𐑤 𐑸𐑾, 𐑲 𐑝𐑬, 𐑿 𐑢𐑪𐑯𐑑 𐑜𐑫𐑛 𐑗𐑭. 𐑧𐑕𐑱 𐑐𐑵'𐑻!.")
add("en-US", "𐑣𐑽𐑦𐑙 𐑥𐑰 𐑚𐑴, 𐑞 𐑨𐑠𐑼 𐑔𐑮𐑳𐑖 𐑒𐑷𐑟. 𐑺 𐑘𐑹 𐑡𐑶𐑓𐑩𐑤 𐑸𐑾, 𐑲 𐑝𐑬, 𐑿 𐑢𐑪𐑯𐑑 𐑜𐑫𐑛 𐑗𐑭. 𐑧𐑕𐑱 𐑐𐑵'𐑻!.")

# ============ UDHR Article 1 ============
print("=== UDHR ===")
add("en", "All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood.")
add("en-US", "All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood.")
add("en-GB", "All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood.")

# ============ Numbers in context ============
print("=== Numbers in context ===")
for lang in ["en", "en-US"]:
    add(lang, "You have 4 new messages")
    add(lang, "The first is from Stephanie Williams and arrived at 3:45pm")
    add(lang, "The subject is ski trip")
    add(lang, "99 bottles of beer on the wall")
    add(lang, "Number 10 Downing Street")
    add(lang, "Room 101")
    add(lang, "Page 42 of the report")

# ============ Upper/lower case ============
print("=== Case ===")
for lang in ["en", "en-US"]:
    add(lang, "ThiS is a TesT for Capitals")
    add(lang, "ALL CAPITALS TEXT HERE")
    add(lang, "all lowercase text here")
    add(lang, "Mixed Case Text Here")

# ============ Write output ============
print("\nWriting output...")

OUTDIR = REPO_ROOT / "tests"
OUTDIR.mkdir(parents=True, exist_ok=True)

# NDJSON
ndjson_path = OUTDIR / "golden-corpus.ndjson"
with open(ndjson_path, "w") as f:
    for entry in ENTRIES:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
print(f"  NDJSON: {ndjson_path} ({len(ENTRIES)} entries)")

# JSON array
json_path = OUTDIR / "golden-corpus.json"
with open(json_path, "w") as f:
    json.dump(ENTRIES, f, ensure_ascii=False, indent=2)
print(f"  JSON:   {json_path} ({len(ENTRIES)} entries)")
