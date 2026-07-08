"""
verify.py — Verification logic.

Compares extracted diploma fields against reference records in the SQLite DB.
Uses fuzzy name matching (difflib) and fuzzy per-field comparison.

Result per record:
  match      — found in DB, all fields similar enough
  mismatch   — found in DB but some fields differ beyond threshold (includes diff list)
  not_found  — no similar name found in DB above the threshold
"""

import re
from difflib import SequenceMatcher
from typing import Optional

FIELDS = [
    "nom_prenom",
    "date_naissance",
    "lieu_naissance",
    "type_diplome",
    "domaine",
    "filiere",
    "specialite",
    "etablissement",
]

FUZZY_THRESHOLD = 0.65  # minimum name similarity to consider a match

# Per-field fuzzy thresholds — fields with lower thresholds are more forgiving
FIELD_THRESHOLDS = {
    "nom_prenom": 0.80,
    "date_naissance": 1.0,      # dates must match exactly
    "lieu_naissance": 0.75,
    "type_diplome": 0.90,
    "domaine": 0.70,
    "filiere": 0.70,
    "specialite": 0.65,
    "etablissement": 0.60,      # universities have many variant names
}

# Known university aliases — different names for the same institution
UNIVERSITY_ALIASES = {
    "guelma": [
        "universite de guelma",
        "universite 8 mai 1945 guelma",
        "universite 8 mai 1945, guelma",
        "8 mai 1945 guelma",
        "8 mai 1945, guelma",
        "universite 8 mai 1945",
        "university of guelma",
    ],
    "annaba": [
        "universite badji mokhtar annaba",
        "universite badji mokhtar",
        "universite d annaba",
        "universite de annaba",
        "badji mokhtar annaba",
    ],
    "constantine": [
        "universite des freres mentouri constantine",
        "universite constantine 1",
        "universite constantine",
        "freres mentouri constantine",
    ],
    "alger": [
        "universite d alger",
        "universite alger 1",
        "universite alger",
    ],
    "setif": [
        "universite ferhat abbas setif",
        "universite de setif",
        "ferhat abbas setif",
    ],
    "batna": [
        "universite de batna",
        "universite batna 1",
        "universite el hadj lakhdar batna",
    ],
    "tlemcen": [
        "universite abou bekr belkaid tlemcen",
        "universite de tlemcen",
    ],
    "oran": [
        "universite oran 1",
        "universite d oran",
        "universite ahmed ben bella oran",
    ],
    "bejaia": [
        "universite abderrahmane mira bejaia",
        "universite de bejaia",
    ],
    "tizi ouzou": [
        "universite mouloud mammeri tizi ouzou",
        "universite de tizi ouzou",
    ],
    "blida": [
        "universite saad dahlab blida",
        "universite de blida",
    ],
    "biskra": [
        "universite mohamed khider biskra",
        "universite de biskra",
    ],
    "souk ahras": [
        "universite de souk ahras",
        "universite mohamed cherif messaadia souk ahras",
    ],
    "skikda": [
        "universite 20 aout 1955 skikda",
        "universite de skikda",
    ],
    "jijel": [
        "universite mohammed seddik benyahia jijel",
        "universite de jijel",
    ],
    "oum el bouaghi": [
        "universite larbi ben m hidi oum el bouaghi",
        "universite de oum el bouaghi",
    ],
    "tebessa": [
        "universite larbi tebessi tebessa",
        "universite de tebessa",
    ],
    "bordj bou arreridj": [
        "universite mohamed el bachir el ibrahimi bordj bou arreridj",
        "universite de bordj bou arreridj",
    ],
    "msila": [
        "universite mohamed boudiaf m sila",
        "universite de m sila",
    ],
    "mostaganem": [
        "universite abdelhamid ibn badis mostaganem",
        "universite de mostaganem",
    ],
    "chlef": [
        "universite hassiba benbouali chlef",
        "universite de chlef",
    ],
    "sba": [
        "universite djillali liabes sidi bel abbes",
        "universite de sidi bel abbes",
    ],
    "khenchela": [
        "universite abbas laghrour khenchela",
        "universite de khenchela",
    ],
    "el oued": [
        "universite hamma lakhdar el oued",
        "universite de el oued",
    ],
    "bouira": [
        "universite akli mohand oulhadj bouira",
        "universite de bouira",
    ],
    "medea": [
        "universite yahia fares medea",
        "universite de medea",
    ],
    "djelfa": [
        "universite ziane achour djelfa",
        "universite de djelfa",
    ],
    "ouargla": [
        "universite kasdi merbah ouargla",
        "universite de ouargla",
    ],
    "saida": [
        "universite moulay tahar saida",
        "universite de saida",
    ],
    "tiaret": [
        "universite ibn khaldoun tiaret",
        "universite de tiaret",
    ],
    "adrar": [
        "universite ahmed draia adrar",
        "universite de adrar",
    ],
    "laghouat": [
        "universite amar telidji laghouat",
        "universite de laghouat",
    ],
    "bechar": [
        "universite tahri mohammed bechar",
        "universite de bechar",
    ],
    "ghardaia": [
        "universite de ghardaia",
    ],
}


def _normalize(text: Optional[str]) -> str:
    """Lowercase, strip, collapse whitespace, remove accents and common diacritics."""
    if not text:
        return ""
    t = text.lower().strip()
    # Remove common French accents for comparison
    replacements = {
        '\u00e9': 'e', '\u00e8': 'e', '\u00ea': 'e', '\u00eb': 'e',
        '\u00e0': 'a', '\u00e2': 'a', '\u00e4': 'a',
        '\u00f9': 'u', '\u00fb': 'u', '\u00fc': 'u',
        '\u00ee': 'i', '\u00ef': 'i',
        '\u00f4': 'o', '\u00f6': 'o',
        '\u00e7': 'c',
        "'": ' ', "\u2019": ' ', "-": ' ',
    }
    for old, new in replacements.items():
        t = t.replace(old, new)
    return " ".join(t.split())


def _name_similarity(a: str, b: str) -> float:
    """Return 0..1 similarity ratio between two names."""
    return SequenceMatcher(None, _normalize(a), _normalize(b)).ratio()


def _field_similarity(a: str, b: str) -> float:
    """Return 0..1 similarity ratio between two field values (normalized)."""
    na = _normalize(a)
    nb = _normalize(b)
    if na == nb:
        return 1.0
    return SequenceMatcher(None, na, nb).ratio()


def _are_same_university(a: str, b: str) -> bool:
    """Check if two university names refer to the same institution using alias table."""
    na = _normalize(a)
    nb = _normalize(b)
    if na == nb:
        return True

    for _city, aliases in UNIVERSITY_ALIASES.items():
        norm_aliases = [_normalize(al) for al in aliases]
        a_match = any(na in al or al in na for al in norm_aliases)
        b_match = any(nb in al or al in nb for al in norm_aliases)
        if a_match and b_match:
            return True

    return False


def _dates_match(a: str, b: str) -> bool:
    """Check if two date strings represent the same date, tolerating format differences."""
    na = _normalize(a).strip()
    nb = _normalize(b).strip()
    if na == nb:
        return True

    # Extract digits from both
    digits_a = re.sub(r'[^\d]', '', na)
    digits_b = re.sub(r'[^\d]', '', nb)
    if digits_a == digits_b and len(digits_a) == 8:
        return True

    # Try to parse DD/MM/YYYY vs YYYY-MM-DD etc.
    def _parse_date(s: str):
        m = re.match(r'(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})', s)
        if m:
            return (int(m.group(1)), int(m.group(2)), int(m.group(3)))
        m = re.match(r'(\d{4})[/\-\.](\d{1,2})[/\-\.](\d{1,2})', s)
        if m:
            return (int(m.group(3)), int(m.group(2)), int(m.group(1)))
        return None

    da = _parse_date(na)
    db = _parse_date(nb)
    if da and db and da == db:
        return True

    return False


def _fields_match(field: str, ext_val: str, db_val: str) -> tuple:
    """Check if two field values match using field-specific logic.

    Returns (is_match, similarity_score).
    """
    n_ext = _normalize(ext_val)
    n_db = _normalize(db_val)

    # Both empty = match
    if not n_ext and not n_db:
        return (True, 1.0)

    # One empty, one not = skip (don't count as diff if extracted is empty)
    if not n_ext or not n_db:
        return (True, 0.5)

    # Exact match after normalization
    if n_ext == n_db:
        return (True, 1.0)

    # Field-specific matching
    if field == "date_naissance":
        matched = _dates_match(ext_val, db_val)
        return (matched, 1.0 if matched else 0.0)

    if field == "etablissement":
        if _are_same_university(ext_val, db_val):
            return (True, 1.0)

    # Fuzzy match for all text fields
    score = _field_similarity(ext_val, db_val)
    threshold = FIELD_THRESHOLDS.get(field, 0.75)
    return (score >= threshold, score)


def verify_record(extracted: dict, db_records: list[dict]) -> dict:
    """Compare one extracted record against all DB records.

    Args:
        extracted: dict with field keys (nom_prenom, date_naissance, etc.)
        db_records: list of dicts from the database

    Returns:
        {
          "status": "match" | "mismatch" | "not_found",
          "db_record": {...} | None,
          "name_score": float,
          "candidates": int,
          "diff": ["field1", "field2", ...],
          "field_scores": {"field1": 0.95, "field2": 0.72, ...}
        }
    """
    ext_name = extracted.get("nom_prenom", "") or ""
    if not ext_name.strip():
        return {
            "status": "not_found",
            "db_record": None,
            "name_score": 0,
            "candidates": 0,
            "diff": [],
            "field_scores": {},
        }

    # Find all candidates above threshold
    candidates = []
    for rec in db_records:
        db_name = rec.get("nom_prenom", "") or ""
        score = _name_similarity(ext_name, db_name)
        if score >= FUZZY_THRESHOLD:
            # Check field differences with fuzzy matching
            diffs = []
            field_scores = {}
            for f in FIELDS:
                v_ext = extracted.get(f) or ""
                v_db = rec.get(f) or ""
                is_match, f_score = _fields_match(f, v_ext, v_db)
                field_scores[f] = round(f_score, 4)
                if not is_match:
                    diffs.append(f)
            candidates.append({
                "record": rec,
                "score": score,
                "diffs": diffs,
                "field_scores": field_scores,
            })

    if not candidates:
        return {
            "status": "not_found",
            "db_record": None,
            "name_score": 0,
            "candidates": 0,
            "diff": [],
            "field_scores": {},
        }

    # Sort: fewest diffs first, then highest name score
    candidates.sort(key=lambda c: (len(c["diffs"]), -c["score"]))
    best = candidates[0]

    return {
        "status": "match" if not best["diffs"] else "mismatch",
        "db_record": best["record"],
        "name_score": round(best["score"], 4),
        "candidates": len(candidates),
        "diff": best["diffs"],
        "field_scores": best["field_scores"],
    }


def verify_all(extracted_records: list[dict], db_records: list[dict]) -> list[dict]:
    """Verify a list of extracted records against the DB.

    Returns a list of result dicts, one per extracted record.
    """
    results = []
    for rec in extracted_records:
        fields = rec.get("fields", rec)  # support both {fields: {...}} and flat dict
        v = verify_record(fields, db_records)
        results.append({
            "id": rec.get("id"),
            "extracted": fields,
            "verify": v,
        })
    return results
