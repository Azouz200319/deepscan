"""ocr.py — Step 1: image preprocessing + Tesseract OCR (lazy imports)"""

import re

IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif')


def fix_date(text):
    def fix_missing_slash(m):
        raw, year = m.group(1), m.group(2)
        if len(raw) == 4:
            dd, mm = raw[:2], raw[2:]
        elif len(raw) == 5:
            dd = raw[:2]; mm = raw[3:5]
            if int(dd) > 31: dd = '1' + dd[1]
        else:
            return m.group(0)
        return f"{dd}/{mm}/{year}"
    text = re.sub(r'\b(\d{4,5})/(\d{4})\b', fix_missing_slash, text)

    def fix_impossible(m):
        dd, mm, yyyy = m.group(1), m.group(2), m.group(3)
        if int(dd) > 31: dd = '0' + dd[1]
        if int(mm) > 12: mm = '0' + mm[1]
        return f"{dd}/{mm}/{yyyy}"
    text = re.sub(r'\b(\d{2})/(\d{2})/(\d{4})\b', fix_impossible, text)
    return text


def process_image(input_path):
    import cv2
    import numpy as np
    import pytesseract
    from PIL import Image as PILImage

    img = cv2.imread(input_path)
    if img is None:
        return None
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    fl = int(w*0.08); fr = int(w*0.52); ft = int(h*0.31); fb = int(h*0.70)
    french_bin = binary[ft:fb, fl:fr]
    rows = np.where(np.sum(french_bin==0, axis=1) >= 8)[0]
    cols = np.where(np.sum(french_bin==0, axis=0) >= 8)[0]
    if len(rows)==0 or len(cols)==0:
        return None
    x1=fl+cols[0]-5; x2=fl+cols[-1]+5; y1=ft+rows[0]-5; y2=ft+rows[-1]+5
    crop = img[y1:y2, x1:x2]
    pil = PILImage.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
    pw, ph = pil.size
    pil = pil.resize((pw*4, ph*4), PILImage.LANCZOS)
    big = np.array(pil)
    hsv = cv2.cvtColor(big, cv2.COLOR_RGB2HSV)
    gray_big = cv2.cvtColor(big, cv2.COLOR_RGB2GRAY)
    mask_dark    = (gray_big < 85).astype(np.uint8) * 255
    mask_colored = ((hsv[:,:,1]>60) & (hsv[:,:,2]<180)).astype(np.uint8) * 255
    mask_ink     = cv2.bitwise_or(mask_dark, mask_colored)
    kernel       = cv2.getStructuringElement(cv2.MORPH_RECT, (2,2))
    mask_ink     = cv2.morphologyEx(mask_ink, cv2.MORPH_OPEN,  kernel)
    mask_ink     = cv2.morphologyEx(mask_ink, cv2.MORPH_CLOSE, kernel)
    bin_ocr      = cv2.bitwise_not(mask_ink)
    kernel_text  = cv2.getStructuringElement(cv2.MORPH_RECT, (25,5))
    dilated      = cv2.dilate(bin_ocr, kernel_text, iterations=2)
    contours, _  = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    text_output  = ""
    for c in contours:
        x, y, w_box, h_box = cv2.boundingRect(c)
        if w_box<50 or h_box<20: continue
        roi     = bin_ocr[y:y+h_box, x:x+w_box]
        roi_pil = PILImage.fromarray(roi)
        cfg     = '--psm 11 --oem 3 -c preserve_interword_spaces=1'
        text    = pytesseract.image_to_string(roi_pil, lang='eng+fra', config=cfg)
        text_output += text + "\n"
    return fix_date(text_output)
