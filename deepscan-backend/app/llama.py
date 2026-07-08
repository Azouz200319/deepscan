"""llama.py — Step 2: send OCR text to LLaMA via Ollama or cloud API, return structured fields.
Uses the full original prompt with all 8 rules and 3 complete examples.
Supports two providers:
  - "ollama" (default): local Ollama server
  - "groq": Groq cloud API (requires GROQ_API_KEY)
"""

import os
import re, json, requests

# --- Persistent config file ---
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "..", "llm_config.json")

def _load_config():
    """Load config from file, fallback to env vars."""
    defaults = {
        "provider": os.environ.get("LLM_PROVIDER", "groq"),
        "ollama_url": os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate"),
        "ollama_model": os.environ.get("OLLAMA_MODEL", "llama3.2"),
        "groq_api_key": os.environ.get("GROQ_API_KEY", ""),
        "groq_model": os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                file_config = json.load(f)
                for key, value in file_config.items():
                    if value:  # Only override if value is not empty
                        defaults[key] = value
        except Exception:
            pass
    return defaults

def _save_config(config):
    """Save config to file."""
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=2)
    except Exception:
        pass

# Export CONFIG_FILE for access from main.py
__all__ = ['CONFIG_FILE', 'call_ollama', 'postprocess', 'get_llm_config', 'set_llm_config']

# --- Provider configuration ---
_llm_config = _load_config()

OLLAMA_URL   = _llm_config["ollama_url"]
OLLAMA_MODEL = _llm_config["ollama_model"]


def get_llm_config() -> dict:
    """Return current LLM configuration (API key masked)."""
    cfg = dict(_llm_config)
    if cfg.get("groq_api_key"):
        key = cfg["groq_api_key"]
        cfg["groq_api_key"] = key[:8] + "..." + key[-4:] if len(key) > 12 else "***"
    return cfg


def set_llm_config(provider: str = None, ollama_url: str = None, ollama_model: str = None,
                   groq_api_key: str = None, groq_model: str = None) -> dict:
    """Update LLM configuration at runtime and persist to file.
    
    IMPORTANT: Only updates fields that are explicitly provided and non-empty.
    This prevents empty API keys from overwriting saved keys when user saves Settings
    without re-entering the key.
    """
    global OLLAMA_URL, OLLAMA_MODEL
    if provider is not None and provider.strip():
        _llm_config["provider"] = provider
    if ollama_url is not None and ollama_url.strip():
        _llm_config["ollama_url"] = ollama_url
        OLLAMA_URL = ollama_url
    if ollama_model is not None and ollama_model.strip():
        _llm_config["ollama_model"] = ollama_model
        OLLAMA_MODEL = ollama_model
    # Only update key if it's provided AND looks like a real key (not masked, not empty)
    if groq_api_key is not None and groq_api_key.strip() and not groq_api_key.startswith("gsk_...") and "..." not in groq_api_key:
        _llm_config["groq_api_key"] = groq_api_key
    if groq_model is not None and groq_model.strip():
        _llm_config["groq_model"] = groq_model
    # Persist to file so config survives server restarts
    _save_config(_llm_config)
    return get_llm_config()


PROMPT_TEMPLATE = """\
You are a precise data-extraction assistant for Algerian university diplomas written in French.

Your ONLY job is to locate and copy values that are clearly present in the OCR text.
Return ONLY a valid JSON object — no explanation, no markdown, no code fences.
ALWAYS close the JSON object with a final }} brace. Never leave the JSON incomplete.

━━━ FIELDS ━━━
- "nom_prenom"      : full name of the graduate (LAST NAME in UPPERCASE + given name)
- "date_naissance"  : date of birth  → format DD/MM/YYYY
- "lieu_naissance"  : place of birth — copy the FULL city name as written, keep spaces
- "type_diplome"    : MUST be exactly "Licence" OR "Master" — nothing else
- "domaine"         : domain of study
- "filiere"         : filière (sub-field)
- "specialite"      : spécialité
- "etablissement"   : university name 

━━━ STRICT EXTRACTION RULES ━━━
1. DATE RULE — copy dates EXACTLY as they appear in the OCR text.
   - NEVER invent or guess a date that is not in the text.

2. TYPE DIPLOME RULE
   - If the text contains "Master"  (any case, with or without accents) → "Master"
   - If the text contains "Licence" (any case) → "Licence"
   - If both appear, pick the one closest to the student name.
   - Default to "Licence" ONLY if neither word appears.

3. NAME RULE
   - The name follows "décerné à [PREFIX] NAME" where PREFIX is one of:
     GM, CM, SM, OM, WV, CV, CN, ON, GN, OK, M., Mme, Mlle — strip the prefix, keep the name.
   - The name format is: LASTNAME FIRSTNAME (LASTNAME is in ALL CAPS).
   - Keep the name in the order it appears — do NOT swap first and last name.
   - Remove any leading/trailing underscores, dashes, or punctuation from the name.

4. PLACE OF BIRTH RULE
   - The birth place appears after the date of birth.
   - It may contain ONE or TWO city names (commune + wilaya) separated by symbols like ~ - / or space.
   - City names can be MULTI-WORD (e.g. "Oued Zenati", "Boumahra Ahmed", "Souk Ahras").
   - If TWO cities appear, return BOTH separated by a comma (e.g. "Oued Zenati, Guelma" or "Boumahra Ahmed, Guelma").
   - If only ONE city appears, return it as-is (e.g. "Guelma", "Annaba", "Souk Ahras").
   - To distinguish two cities: look for a separator symbol (~ - /) OR a known wilaya name
     starting after the first city name.
   - Replace any dots used as spaces between words (e.g. "souk.Ahras" → "Souk Ahras").
   - Strip any leading characters that are not letters (e.g. "d 'Tebessa" → "Tebessa").
   - Examples:
     "Bouchegouf~Guelma"        → "Bouchegouf, Guelma"
     "Boumahra ahmed - Guelma"  → "Boumahra Ahmed, Guelma"
     "Oued Zenati - Guelma"     → "Oued Zenati, Guelma"
     "souk.Ahras"               → "Souk Ahras"
     "Guelma"                   → "Guelma"

5. FILIERE AND SPECIALITE RULE
   - Both filière and spécialité labels may be garbled in OCR (e.g. "ST CT%", "pcre", "GHiliére").
   - ALWAYS skip the garbled label and take the NEXT clean readable word or phrase as the value.
   - Example: "ST CT%  Electrotechnique-  pcre  Electrotechnique"
     → filiere   = "Electrotechnique"  (clean value after first garbage label "ST CT%")
     → specialite = "Electrotechnique" (clean value after second garbage label "pcre")
   - A "clean value" means: real words with only letters, spaces, or hyphens — NO % signs,
     NO random short letter combinations (pcre, ST, CT), NO symbols.
   - Strip any trailing dashes or punctuation from the extracted value.

6. ESTABLISHMENT RULE
   - Remove any leading dashes, dots, or symbols from the university name.
   - Always include "Université" prefix if it appears nearby in the text.

7. NOISE RULE — if a field value contains mostly symbols, numbers, or garbage
   characters set that field to null.

8. NULL RULE — if a field is genuinely absent from the text, set it to null.

━━━ FEW-SHOT EXAMPLES ━━━

Example A:
OCR: "Il est décerné à CV GUIBOUB Madjeda cNe (e) le 16/08/1999 Bouchegouf~Guelma
      Le Diplôme de Licence
      Domaine: Sciences de la Nature et de la Vie
      Filière: Sciences biologiques
      Spécialité: Biochimie
      Délivré par l'établissement universitaire : Université 8 Mai 1945, Guelma"
Expected JSON:
{{
  "nom_prenom": "GUIBOUB Madjeda",
  "date_naissance": "16/08/1999",
  "lieu_naissance": "Bouchegouf",
  "type_diplome": "Licence",
  "domaine": "Sciences de la Nature et de la Vie",
  "filiere": "Sciences biologiques",
  "specialite": "Biochimie",
  "etablissement": "Université 8 Mai 1945, Guelma"
}}

Example B:
OCR: "Il est décernié à CN TRAD KHODJA HAMZA ONC 10/12/1997 souk.Ahras
      Le Diplôme de Master
      Domaine: Architecture, Urbanisme et Métiers de la Ville
      Filière: Architecture
      Spécialité: Architecture
      Délivré par l'établissement universitaire : - 8 Mai 1945, Guelma"
Expected JSON:
{{
  "nom_prenom": "TRAD KHODJA HAMZA",
  "date_naissance": "10/12/1997",
  "lieu_naissance": "Souk Ahras",
  "type_diplome": "Master",
  "domaine": "Architecture, Urbanisme et Métiers de la Ville",
  "filiere": "Architecture",
  "specialite": "Architecture",
  "etablissement": "Université 8 Mai 1945, Guelma"
}}

Example C:
OCR: "Il est décerné à OM DJEBAR Rami cNe (e) le 01/08/2003 Annaba
      Le Diplôme de Licence
      Domaine: DROIT ET SCIENCES POLITIQUES
      Filière: DROIT
      Spécialité: DROIT
      Délivré par l'établissement universitaire : université de guelma"
Expected JSON:
{{
  "nom_prenom": "DJEBAR Rami",
  "date_naissance": "01/08/2003",
  "lieu_naissance": "Annaba",
  "type_diplome": "Licence",
  "domaine": "DROIT ET SCIENCES POLITIQUES",
  "filiere": "DROIT",
  "specialite": "DROIT",
  "etablissement": "université de guelma"
}}

━━━ NOW PROCESS THIS OCR TEXT ━━━
\"\"\"
{ocr_text}
\"\"\"

JSON:"""

DATE_RE = re.compile(r'\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})\b')


def _fix_date(dd, mm, yyyy):
    d, m, y = int(dd), int(mm), int(yyyy)
    if d > 31: d -= 30
    if m > 12: m -= 30
    if not (1900 <= y <= 2100): return None
    if not (1 <= d <= 31) or not (1 <= m <= 12): return None
    return f"{d:02d}/{m:02d}/{y}"


def _is_garbage(value):
    if not value: return False
    non_alpha = sum(1 for c in value if not c.isalpha() and c not in ' /-,.')
    return len(value) > 0 and non_alpha / len(value) > 0.4


def _repair_json(raw):
    raw = raw.strip()
    open_braces   = raw.count('{') - raw.count('}')
    open_brackets = raw.count('[') - raw.count(']')
    raw = re.sub(r',\s*$', '', raw)
    raw += ']' * open_brackets
    raw += '}' * open_braces
    return raw


def _fix_place(value):
    if not value: return value
    value = re.sub(r'(?<=\w)\.(?=\w)', ' ', value)
    value = re.sub(r'^[\W\d_~]+|[\W\d_~]+$', '', value).strip()
    return value.title() or None


def _fix_establishment(value):
    if not value: return value
    return re.sub(r'^[\s\-\.\,]+', '', value).strip() or None


def postprocess(fields, ocr_text):
    # 1. Garbage cleanup
    for f in ["nom_prenom", "lieu_naissance", "domaine", "filiere",
              "specialite", "etablissement"]:
        if _is_garbage(fields.get(f)):
            fields[f] = None

    # 2. Name cleanup
    if fields.get("nom_prenom"):
        fields["nom_prenom"] = re.sub(r'^[\W_]+|[\W_]+$', '',
                                       fields["nom_prenom"]).strip()

    # 3. Place cleanup
    fields["lieu_naissance"] = _fix_place(fields.get("lieu_naissance"))

    # 4. Establishment cleanup
    fields["etablissement"] = _fix_establishment(fields.get("etablissement"))

    # 5. Date sanity
    val = fields.get("date_naissance")
    if val and DATE_RE.match(val):
        dm = DATE_RE.match(val)
        corrected = _fix_date(dm.group(1), dm.group(2), dm.group(3))
        fields["date_naissance"] = corrected if corrected else None

    # 6. type_diplome safety net — scan OCR directly
    ocr_lower = ocr_text.lower()
    if "master" in ocr_lower:
        fields["type_diplome"] = "Master"
    elif "licence" in ocr_lower or "license" in ocr_lower:
        fields["type_diplome"] = "Licence"

    return fields


def _parse_llm_response(raw: str) -> dict:
    """Parse raw LLM response text into a JSON dict."""
    # Strip markdown fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```$",          "", raw, flags=re.MULTILINE)
    raw = raw.strip()

    # Extract JSON object
    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if json_match:
        raw = json_match.group(0)
    else:
        raw = _repair_json(raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raw = _repair_json(raw)
        return json.loads(raw)


def _call_ollama_local(ocr_text: str) -> dict:
    """Call local Ollama server."""
    prompt = PROMPT_TEMPLATE.format(ocr_text=ocr_text)
    payload = {
        "model":      _llm_config["ollama_model"],
        "prompt":     prompt,
        "stream":     False,
        "keep_alive": -1,
        "options": {
            "temperature": 0,
            "num_predict": 700,
        }
    }
    try:
        response = requests.post(_llm_config["ollama_url"], json=payload, timeout=180)
        response.raise_for_status()
        raw = response.json().get("response", "").strip()
        return _parse_llm_response(raw)
    except requests.exceptions.ConnectionError:
        raise ConnectionError("Cannot connect to Ollama.\nPlease run:  ollama serve")
    except json.JSONDecodeError:
        return {}
    except Exception as e:
        raise RuntimeError(str(e))


def _call_groq(ocr_text: str) -> dict:
    """Call Groq cloud API for LLaMA extraction."""
    api_key = _llm_config.get("groq_api_key", "")
    if not api_key:
        raise ConnectionError(
            "Groq API key not configured. "
            "Set GROQ_API_KEY environment variable or configure it in Settings."
        )

    prompt = PROMPT_TEMPLATE.format(ocr_text=ocr_text)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": _llm_config.get("groq_model", "llama-3.3-70b-versatile"),
        "messages": [
            {
                "role": "system",
                "content": "You are a precise data-extraction assistant. Return ONLY valid JSON, no explanation.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "temperature": 0,
        "max_tokens": 700,
    }
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()
        raw = data["choices"][0]["message"]["content"].strip()
        return _parse_llm_response(raw)
    except requests.exceptions.ConnectionError:
        raise ConnectionError("Cannot connect to Groq API. Check your internet connection.")
    except json.JSONDecodeError:
        return {}
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else "unknown"
        detail = ""
        try:
            detail = e.response.json().get("error", {}).get("message", "")
        except Exception:
            pass
        raise RuntimeError(f"Groq API error ({status}): {detail or str(e)}")
    except Exception as e:
        raise RuntimeError(str(e))


def call_ollama(ocr_text: str) -> dict:
    """Route to the configured LLM provider (Ollama local or Groq cloud)."""
    provider = _llm_config.get("provider", "ollama")
    if provider == "groq":
        return _call_groq(ocr_text)
    else:
        return _call_ollama_local(ocr_text)
