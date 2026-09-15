import re
from typing import Any, Dict, List, Optional

SUPPORTED_LANGUAGES = ("en", "kn", "hi", "te", "ta", "ml", "ur", "mr", "bn")

SCRIPT_RANGES = {
    "kn": ((0x0C80, 0x0CFF),),
    "te": ((0x0C00, 0x0C7F),),
    "ta": ((0x0B80, 0x0BFF),),
    "ml": ((0x0D00, 0x0D7F),),
    "hi": ((0x0900, 0x097F),),
    "bn": ((0x0980, 0x09FF),),
    "ur": ((0x0600, 0x06FF),),
}

LANGUAGE_PATTERNS = {
    "kn": ["ನನ್ನ", "ನಿಮ್ಮ", "ಎಷ್ಟು", "ಲಾಭ", "ಖರ್ಚು", "ಇವತ್ತು", "ನಾಳೆ", "ವಾರ", "ಗ್ರಾಹಕ", "ಆರ್ಡರ್", "ತೋರಿಸು", "ಹತ್ತಿರ", "ಅಂಗಡಿ", "ಇದೆ", "elli ide", "location helu", "eshtu"],
    "hi": ["मेरा", "आपका", "कितना", "लाभ", "मुनाफा", "खर्च", "आज", "कल", "सप्ताह", "ग्राहक", "ऑर्डर", "दिखाओ", "कहाँ", "पास", "ka", "batao", "kitna", "aaj"],
    "mr": ["माझा", "तुमचा", "किती", "नफा", "खर्च", "आज", "उद्या", "आठवडा", "ग्राहक", "ऑर्डर", "दाखवा", "कुठे", "जवळ", "kuthe", "sanga", "kiti"],
    "te": ["నా", "మీ", "ఎంత", "లాభం", "ఖర్చు", "ఈరోజు", "రేపు", "వారం", "కస్టమర్", "ఆర్డర్", "చూపించు", "ఎక్కడ", "సమీపంలో", "ekkada", "undi", "cheppu", "entha"],
    "ta": ["என்", "உங்கள்", "எவ்வளவு", "லாபம்", "செலவு", "இன்று", "நாளை", "வாரம்", "வாடிக்கையாளர்", "ஆர்டர்", "காட்டு", "எங்கே", "அருகில்", "enge", "irukku", "enna", "evvalavu"],
    "ml": ["എന്റെ", "നിങ്ങളുടെ", "എത്ര", "ലാഭം", "ചെലവ്", "ഇന്ന്", "നാളെ", "ആഴ്ച", "ഉപഭോക്താവ്", "ഓർഡർ", "കാണിക്കുക", "എവിടെ", "അടുത്ത്", "evide", "parayu", "ethra"],
    "ur": ["میرا", "آپ کا", "کتنے", "منافع", "خرچ", "آج", "کل", "ہفتہ", "گاہک", "آرڈر", "دکھاؤ", "کہاں", "پاس", "kahan", "batao", "kitna"],
    "bn": ["আমার", "আপনার", "কত", "লাভ", "খরচ", "আজ", "আগামীকাল", "সপ্তাহ", "ক্রেতা", "অর্ডার", "দেখান", "কোথায়", "কাছাকাছি", "kothay", "bolun", "koto"],
}

INTENT_KEYWORDS = {
    "DASHBOARD_SUMMARY": ["dashboard", "summary", "overview", "business overview", "ವ್ಯವಹಾರ", "सारांश", "సారాంశం", "சுருக்கம்", "സംഗ്രഹം", "خلاصہ", "সারাংশ"],
    "PROFIT_REPORT": ["profit", "revenue", "income", "earn", "made", "ಲಾಭ", "मुनाफा", "लाभ", "नफा", "నష్టం", "లాభం", "லாபம்", "ലാഭം", "منافع", "লাভ", "ನफा"],
    "SALES_REPORT": ["sales", "sale", "revenue", "ಮಾರಾಟ", "बिक्री", "विक्री", "అమ్మకాలు", "விற்பனை", "വിൽപ്പന", "فروخت", "বিক্রয়"],
    "EXPENSE_REPORT": ["expense", "expenses", "spend", "spent", "cost", "fuel", "ಖರ್ಚು", "खर्च", "खर्चे", "వ్యయం", "ఖర్చు", "செலவு", "ചെലവ്", "خرچ", "খরচ"],
    "WASTAGE_REPORT": ["wastage", "waste", "loss", "lost", "spoilage", "ನಷ್ಟ", "नष्ट", "नुकसान", "నష్టం", "இழப்பு", "നഷ്ടം", "ضائع", "অপচয়"],
    "PENDING_PAYMENTS": ["owe", "dues", "pending payment", "debtor", "बाकी", "बकाया", "ബാക്കി", "బాకీ", "பாக்கி", "بقایا", "বাকি"],
    "CUSTOMER_BALANCE": ["customer balance", "customer ledger", "ಬಾಕಿ", "ग्राहक शेष", "ग्राहक बॅलन्स", "కస్టమర్ బాకీ", "வாடிக்கையாளர் நிலுவை", "ഉപഭോക്തൃ ബാലൻസ്", "گاہک بیلنس", "ক্রেতার বকেয়া"],
    "CUSTOMER_LIST": ["customer", "customers", "client", "clients", "ಗ್ರಾಹಕ", "ग्राहक", "विक्रेता", "కస్టమర్", "வாடிக்கையாளர்", "ഉപഭോക്താവ്", "گاہک", "ক্রেতা"],
    "PENDING_ORDERS": ["pending order", "pending orders", "order pending", "pending", "ಬಾಕಿ ಆರ್ಡರ್", "लंबित ऑर्डर", "పెండింగ్ ఆర్డర్", "நிலுவை ஆர்டர்", "പെൻഡിംഗ് ഓർഡർ", "زیر التوا آرڈر", "পেন্ডিং অর্ডার"],
    "ORDER_DETAILS": ["order details", "order detail", "ಆರ್ಡರ್ ವಿವರ", "ऑर्डर विवरण", "ऑर्डर तपशील", "ఆర్డర్ వివరాలు", "ஆர்டர் விவரம்", "ഓർഡർ വിശദാംശങ്ങൾ", "آرڈر کی تفصیل", "অর্ডারের বিবরণ"],
    "ACTIVE_TRIPS": ["active trip", "active trips", "running trip", "fleet", "ಚಲಿಸುತ್ತಿರುವ", "चलती ट्रक", "ప్రస్తుత ట్రిప్", "செயலில் பயணம்", "സജീവ യാത്ര", "فعال ٹرپ", "সক্রিয় ট্রিপ"],
    "TRIP_STOCK": ["trip stock", "stock in trip", "ಟ್ರಿಪ್ ಸ್ಟಾಕ್", "ट्रिप स्टॉक", "ట్రిప్ స్టాక్", "டிரிப் ஸ்டாக்", "ട്രിപ്പ് സ്റ്റോക്ക്", "ٹرپ اسٹاک", "ট্রিপ স্টক"],
    "STOCK_STATUS": ["stock", "chicken left", "remaining", "inventory", "ಸ್ಟಾಕ್", "ಉಳಿದ", "स्टॉक", "बचा", "स्टॉक", "మిగిలిన", "ஸ்டாக்", "மீதம்", "സ്റ്റോക്ക്", "ബാക്കി", "اسٹاک", "باقی", "স্টক", "বাকি"],
    "TRUCK_LOCATION": ["truck location", "where is truck", "truck gps", "ಟ್ರಕ್ ಎಲ್ಲಿದೆ", "ट्रक कहाँ", "ट्रक कुठे", "ట్రక్ ఎక్కడ", "டிரக் எங்கே", "ട്രക്ക് എവിടെ", "ٹرک کہاں", "ট্রাক কোথায়"],
    "NEAREST_PURCHASER": ["nearest purchaser", "nearest customer", "closest customer", "who should truck deliver next", "ಹತ್ತಿರದ ಗ್ರಾಹಕ", "सबसे नज़दीकी ग्राहक", "सबसे पास ग्राहक", "సమీప కస్టమర్", "அருகிலுள்ள வாடிக்கையாளர்", "ഏറ്റവും അടുത്ത ഉപഭോക്താവ്", "قریب ترین گاہک", "নিকটতম ক্রেতা"],
    "DUE_DELIVERIES": ["due next", "due soon", "delivery due", "deliveries due", "late delivery", "which orders are due", "ಯಾವ ಆರ್ಡರ್ ಮೊದಲು", "अगली डिलीवरी", "कौन सा ऑर्डर पहले", "తదుపరి డెలివరీ", "அடுத்த டெலிவரி", "അടുത്ത ഡെലിവറി", "اگلی ڈیلیوری", "পরবর্তী ডেলিভারি"],
    "TRUCK_STATUS": ["truck status", "trucks", "vehicle status", "ಟ್ರಕ್ ಸ್ಥಿತಿ", "ट्रक स्थिति", "ट्रक स्थिती", "ట్రక్ స్థితి", "டிரக் நிலை", "ട്രക്ക് നില", "ٹرک کی حالت", "ট্রাকের অবস্থা"],
    "NEARBY_BUSINESSES": ["nearby", "near", "around", "close", "shop", "buyer", "restaurant", "hotel", "ಹತ್ತಿರ", "दुकान", "पास", "जवळ", "సమీపంలో", "கடை", "அருகில்", "ഷോപ്പ്", "അടുത്ത്", "دکان", "پاس", "দোকান", "কাছাকাছি"],
}

PERIOD_PATTERNS = {
    "today": ["today", "ಇವತ್ತು", "ಇಂದು", "आज", "आजचा", "ఈరోజు", "இன்று", "ഇന്ന്", "آج", "আজ"],
    "yesterday": ["yesterday", "ನಿನ್ನೆ", "कल", "நேற்று", "ഇന്നലെ", "کل", "গতকাল"],
    "tomorrow": ["tomorrow", "ನಾಳೆ", "कल", "उद्या", "రేపు", "நாளை", "നാളെ", "کل", "আগামীকাল"],
    "this_week": ["this week", "ಈ ವಾರ", "इस हफ्ते", "या आठवड्यात", "ఈ వారం", "இந்த வாரம்", "ഈ ആഴ്ച", "اس ہفتے", "এই সপ্তাহে"],
    "last_week": ["last week", "ಕಳೆದ ವಾರ", "पिछले हफ्ते", "मागील आठवड्यात", "గత వారం", "கடந்த வாரம்", "കഴിഞ്ഞ ആഴ്ച", "گزشتہ ہفتے", "গত সপ্তাহে"],
    "this_month": ["this month", "ಈ ತಿಂಗಳು", "इस महीने", "या महिन्यात", "ఈ నెల", "இந்த மாதம்", "ഈ മാസം", "اس ماہ", "এই মাসে"],
    "last_month": ["last month", "ಕಳೆದ ತಿಂಗಳು", "पिछले महीने", "मागील महिन्यात", "గత నెల", "கடந்த மாதம்", "കഴിഞ്ഞ മാസം", "گزشتہ ماہ", "গত মাসে"],
}

CATEGORY_PATTERNS = {
    "fuel": ["fuel", "petrol", "diesel", "ಇಂಧನ", "पेट्रोल", "डीजल", "డీజిల్", "எரிபொருள்", "ഇന്ധനം", "پٹرول", "জ্বালানি"],
    "labour": ["labour", "labor", "worker", "ಕೆಲಸಗಾರ", "मजदूर", "कामगार", "కార్మిక", "தொழிலாளர்", "തൊഴിലാളി", "مزدور", "শ্রমিক"],
    "maintenance": ["maintenance", "repair", "ದುರಸ್ತಿ", "मरम्मत", "दुरुस्ती", "నిర్వహణ", "பராமரிப்பு", "പരിപാലനം", "مرمت", "রক্ষণাবেক্ষণ"],
    "food": ["food", "ಆಹಾರ", "भोजन", "अन्न", "ఆహారం", "உணவு", "ഭക്ഷണം", "کھانا", "খাবার"],
}

ENTITY_PATTERNS = {
    "customer_name": r"(?:for|of|from|के लिए|साठी|ಗಾಗಿ|కోసం|க்கு|വേണ്ടി|کے لیے|জন্য)\s+([A-Za-z\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF\u0D00-\u0D7F\u0600-\u06FF]+(?:\s+[A-Za-z\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF\u0D00-\u0D7F\u0600-\u06FF]+)?)",
    "quantity": r"(\d+(?:\.\d+)?)\s*(kg|kgs|kilo|kilos|कि\.?ग्रा|किलो|ಕಿಲೋ|కిలో|கிலோ|കിലോ|کلو|কেজি)",
    "radius": r"(\d+(?:\.\d+)?)\s*(?:km|kilometer|kilometers|ಕಿಮೀ|किमी|किलोमीटर|కిమీ|கிமீ|കിമീ|کلومیٹر|কিমি)",
}


def _pattern_score(text: str, patterns: List[str]) -> int:
    lowered = text.lower()
    return sum(1 for pattern in patterns if pattern.lower() in lowered)


def detect_script(text: str) -> str:
    counts = {lang: 0 for lang in SCRIPT_RANGES}
    for char in text:
        code = ord(char)
        for lang, ranges in SCRIPT_RANGES.items():
            if any(start <= code <= end for start, end in ranges):
                counts[lang] += 1
                break
    devanagari_count = counts["hi"]
    if devanagari_count:
        mr_score = _pattern_score(text, LANGUAGE_PATTERNS["mr"])
        hi_score = _pattern_score(text, LANGUAGE_PATTERNS["hi"])
        return "mr" if mr_score > hi_score else "hi"
    detected = max(counts, key=counts.get)
    return detected if counts[detected] else "en"


def detect_language_by_patterns(text: str) -> str:
    scores = {lang: _pattern_score(text, patterns) for lang, patterns in LANGUAGE_PATTERNS.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] else "en"


def calculate_confidence(text: str, detected_lang: str) -> float:
    if detected_lang == "en":
        return 0.85 if text.strip() else 0.5
    script_lang = detect_script(text)
    pattern_lang = detect_language_by_patterns(text)
    score = 0.55 if script_lang == detected_lang else 0.0
    score += 0.4 if pattern_lang == detected_lang else 0.0
    return min(0.99, score + (0.05 if script_lang == pattern_lang else 0.0))


def detect_language(text: str, explicit_language: Optional[str] = None) -> Dict[str, Any]:
    if explicit_language:
        language = explicit_language.lower().strip()
        if language in SUPPORTED_LANGUAGES:
            return {"language": language, "confidence": 1.0, "explicit": True}
    if not text or not text.strip():
        return {"language": "en", "confidence": 0.5, "explicit": False}
    script_lang = detect_script(text)
    pattern_lang = detect_language_by_patterns(text)
    language = script_lang if script_lang != "en" else pattern_lang
    if language not in SUPPORTED_LANGUAGES:
        language = "en"
    return {"language": language, "confidence": calculate_confidence(text, language), "explicit": False}


def detect_intent(message: str) -> Dict[str, Any]:
    text = message.lower()
    scores = {intent: _pattern_score(text, keywords) for intent, keywords in INTENT_KEYWORDS.items()}
    # Specific intents win over broad words such as "order", "stock", and "customer".
    priority = ["ORDER_DETAILS", "TRIP_STOCK", "CUSTOMER_BALANCE", "PENDING_PAYMENTS", "PENDING_ORDERS", "NEAREST_PURCHASER", "DUE_DELIVERIES", "TRUCK_LOCATION", "TRUCK_STATUS", "ACTIVE_TRIPS", "NEARBY_BUSINESSES", "PROFIT_REPORT", "SALES_REPORT", "EXPENSE_REPORT", "WASTAGE_REPORT", "STOCK_STATUS", "CUSTOMER_LIST", "DASHBOARD_SUMMARY"]
    best_score = max(scores.values(), default=0)
    if not best_score:
        return {"intent": "GENERAL_BUSINESS_QUERY", "confidence": 0.0}
    best = next(intent for intent in priority if scores.get(intent) == best_score)
    return {"intent": best, "confidence": min(1.0, best_score / 3.0)}


def extract_entities(message: str, language: Optional[str] = None) -> Dict[str, Any]:
    entities: Dict[str, Any] = {"customer_name": None, "customer_id": None, "truck_id": None, "trip_id": None, "order_id": None, "quantity": None, "quantity_unit": None, "date": None, "date_range": None, "period": None, "expense_category": None, "location": None, "radius": None, "language": language}
    lowered = message.lower()
    for period, patterns in PERIOD_PATTERNS.items():
        if any(pattern.lower() in lowered for pattern in patterns):
            entities["period"] = period
            entities["date_range"] = period
            break
    for category, patterns in CATEGORY_PATTERNS.items():
        if any(pattern.lower() in lowered for pattern in patterns):
            entities["expense_category"] = category
            break
    quantity_match = re.search(ENTITY_PATTERNS["quantity"], message, re.IGNORECASE)
    if quantity_match:
        entities["quantity"] = float(quantity_match.group(1))
        entities["quantity_unit"] = "kg"
    radius_match = re.search(ENTITY_PATTERNS["radius"], message, re.IGNORECASE)
    if radius_match:
        entities["radius"] = float(radius_match.group(1))
    customer_match = re.search(ENTITY_PATTERNS["customer_name"], message, re.IGNORECASE)
    if customer_match:
        entities["customer_name"] = customer_match.group(1).strip()
    uuid_match = re.search(r"\b[0-9a-f]{8}-[0-9a-f-]{27,}\b", message, re.IGNORECASE)
    if uuid_match:
        value = uuid_match.group(0)
        if re.search(r"trip|ಟ್ರಿಪ್|ट्रिप|ట్రిప్|டிரிப்|ട്രിപ്പ്|ٹرپ|ট্রিপ", lowered):
            entities["trip_id"] = value
        elif re.search(r"truck|ಟ್ರಕ್|ट्रक|ట్రక్|டிரக்|ട്രക്ക്|ٹرک|ট্রাক", lowered):
            entities["truck_id"] = value
        else:
            entities["order_id"] = value
    return entities


class ConversationContext:
    def __init__(self, max_turns: int = 5):
        self.max_turns = max_turns
        self.turns: List[Dict[str, Any]] = []

    def add_turn(self, user_message: str, intent: str, entities: Dict[str, Any], tool_result: Dict[str, Any]):
        self.turns.append({
            "user_message": user_message[:500],
            "intent": intent,
            "entities": {key: value for key, value in entities.items() if value is not None and key not in {"customer_name"}},
            "tool": tool_result.get("tool"),
            "data_summary": self._summarize(tool_result.get("data")),
        })
        if len(self.turns) > self.max_turns:
            self.turns.pop(0)

    def get_context(self) -> List[Dict[str, Any]]:
        return list(self.turns)

    def last_turn(self) -> Optional[Dict[str, Any]]:
        return self.turns[-1] if self.turns else None

    def _summarize(self, data: Any) -> Any:
        if isinstance(data, dict):
            summary = {}
            for key, value in data.items():
                if key in {"id", "trip_id", "customer_id", "truck_id", "business_id"}:
                    summary[key] = str(value)[:36] if value else None
                elif isinstance(value, (int, float)):
                    summary[key] = value
                elif isinstance(value, list):
                    summary[key] = f"[{len(value)} items]"
                elif isinstance(value, str):
                    summary[key] = value[:100]
            return summary
        if isinstance(data, list):
            return f"[{len(data)} items]"
        return str(data)[:200] if data is not None else None


_context_store: Dict[str, ConversationContext] = {}


def get_conversation_context(business_id: str) -> ConversationContext:
    if business_id not in _context_store:
        _context_store[business_id] = ConversationContext()
    return _context_store[business_id]


def clear_conversation_context(business_id: str):
    _context_store.pop(business_id, None)
