"""
manual_ocr.py — Manual OCR region extraction for the web API (lazy imports).
"""


def _preprocess_region(roi):
    import cv2
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    gray = cv2.convertScaleAbs(gray, alpha=1.8, beta=30)
    gray = cv2.bilateralFilter(gray, 9, 75, 75)
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 31, 2)
    return thresh


def extract_region(image_bgr, region):
    """Extract text from a specific region of an image using Tesseract OCR."""
    import cv2
    import pytesseract
    from PIL import Image as PILImage

    x, y, w, h = region
    roi = image_bgr[y:y+h, x:x+w]
    if roi.size == 0:
        return ""
    proc = _preprocess_region(roi)
    config = "--psm 7 --oem 3"
    text = pytesseract.image_to_string(
        PILImage.fromarray(proc), lang='fra+eng', config=config)
    return text.strip()
