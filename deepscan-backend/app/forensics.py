"""forensics.py — Lazy-loaded forensics analysis to minimize memory usage."""

import sys
import base64
from io import BytesIO


def _imports():
    """Lazy load heavy libraries only when needed."""
    import numpy as np
    import cv2
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from PIL import Image
    return np, cv2, plt, Image


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def img_to_base64(img_np):
    """Convert a numpy image (BGR) to base64 string."""
    if img_np is None:
        return None
    import cv2
    _, buffer = cv2.imencode('.png', img_np)
    return base64.b64encode(buffer).decode('utf-8')

def pil_to_base64(pil_img):
    """Convert a PIL image to base64 string."""
    if pil_img is None:
        return None
    buffered = BytesIO()
    pil_img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

# ═══════════════════════════════════════════════════════════════
# STAGE 1 — DCT DOUBLE COMPRESSION DETECTOR
# ═══════════════════════════════════════════════════════════════

def extract_dct_coeffs(img, block_size=8):
    np, cv2, plt, Image = _imports()
    h, w = img.shape
    coeffs = []
    positions = [(1,1), (2,1), (1,2), (2,2), (3,1), (1,3)]
    for i in range(0, h - block_size, block_size):
        for j in range(0, w - block_size, block_size):
            block = img[i:i+8, j:j+8]
            dct = cv2.dct(block)
            for (x, y) in positions:
                val = dct[x, y]
                if abs(val) > 1:
                    coeffs.append(val)
    return np.array(coeffs)

def analyze_fft(coeffs):
    np, cv2, plt, Image = _imports()
    hist, _ = np.histogram(coeffs, bins=80)
    hist = hist.astype(float)
    hist /= (np.sum(hist) + 1e-8)
    hist -= np.mean(hist)
    fft_vals = np.abs(np.fft.fft(hist))
    fft_vals[0:2] = 0
    peak = np.max(fft_vals)
    avg = np.mean(fft_vals)
    score = peak / (avg + 1e-8)
    return score, hist, fft_vals

def detect_double_compression(path):
    np, cv2, plt, Image = _imports()
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return "Error loading image", 0, None, None
    img = np.float32(img)
    coeffs = extract_dct_coeffs(img)
    if len(coeffs) < 100:
        return "Image too small", 0, None, None
    score, hist, fft_vals = analyze_fft(coeffs)
    if score > 5:
        result = "DOUBLE COMPRESSED"
    elif score > 3:
        result = "SUSPICIOUS"
    else:
        result = "SINGLE COMPRESSED"
    return result, score, hist, fft_vals

def plot_dct_to_base64(hist, fft_vals):
    np, cv2, plt, Image = _imports()
    fig, axes = plt.subplots(2, 1, figsize=(6, 4), facecolor='#0d0d0d')
    for ax in axes:
        ax.set_facecolor('#1a1a1a')
        ax.tick_params(colors='#888')
        for spine in ax.spines.values():
            spine.set_edgecolor('#333')

    axes[0].plot(hist, color='#00e5ff', linewidth=1.2)
    axes[0].set_title("DCT Histogram", color='#ccc', fontsize=9)

    axes[1].plot(fft_vals, color='#ff4081', linewidth=1.2)
    axes[1].set_title("FFT Spectrum", color='#ccc', fontsize=9)

    plt.tight_layout(pad=1.0)
    buf = BytesIO()
    plt.savefig(buf, format='png', dpi=100, facecolor='#0d0d0d')
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode('utf-8')

# ═══════════════════════════════════════════════════════════════
# STAGE 2 — DCT COPY-MOVE / FORGED TEXT DETECTOR
# ═══════════════════════════════════════════════════════════════

def detect_copy_move(image_path):
    np, cv2, plt, Image = _imports()
    block_size = 8
    img_gray = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    img_color = cv2.imread(image_path)
    if img_gray is None:
        return None, None, 0

    h, w = img_gray.shape
    img_gray  = img_gray [:h//block_size*block_size, :w//block_size*block_size]
    img_color = img_color[:h//block_size*block_size, :w//block_size*block_size]
    h, w = img_gray.shape

    dct_map = np.zeros((h, w), np.float32)
    for i in range(0, h, block_size):
        for j in range(0, w, block_size):
            block = img_gray[i:i+block_size, j:j+block_size].astype(np.float32)
            coeffs = cv2.dct(block)
            ac_energy = np.sum(np.abs(coeffs)) - np.abs(coeffs[0, 0])
            dct_map[i:i+block_size, j:j+block_size] = ac_energy

    dct_norm = cv2.normalize(dct_map, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    energy_threshold = 180
    suspicious_mask = (dct_norm >= energy_threshold).astype(np.uint8) * 255
    h_kern = cv2.getStructuringElement(cv2.MORPH_RECT, (block_size * 8, block_size))
    v_kern = cv2.getStructuringElement(cv2.MORPH_RECT, (block_size, block_size * 2))
    dilated = cv2.dilate(suspicious_mask, h_kern, iterations=1)
    dilated = cv2.dilate(dilated, v_kern, iterations=1)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    MAX_RECT_COUNT = 30
    initial_count = len(contours)
    result = img_color.copy()
    kept = 0
    if initial_count <= MAX_RECT_COUNT:
        heights = [cv2.boundingRect(c)[3] for c in contours if cv2.boundingRect(c)[2] >= block_size * 4]
        if heights:
            median_h = sorted(heights)[len(heights)//2]
            min_h = median_h * 0.6
        else:
            min_h = block_size * 4
        for cnt in contours:
            x, y, rw, rh = cv2.boundingRect(cnt)
            if rw < block_size * 4:       continue
            if rh < min_h:                continue
            if rw > w * 0.75:             continue
            if rh > rw * 1.5:             continue
            if x < 20 or y < 20 or (x + rw) > w - 20 or (y + rh) > h - 20:
                continue
            cv2.rectangle(result, (x, y), (x + rw, y + rh), (0, 0, 255), 4)
            kept += 1

    heatmap = cv2.applyColorMap(dct_norm, cv2.COLORMAP_INFERNO)
    return result, heatmap, kept

# ═══════════════════════════════════════════════════════════════
# STAGE 3 — GHOST ANALYSIS + FULL FORGERY DETECTION
# ═══════════════════════════════════════════════════════════════

def ghost_analysis(image_path, quality_range=range(60, 100, 2)):
    np, cv2, plt, Image = _imports()
    original = Image.open(image_path).convert('RGB')
    orig_array = np.array(original, dtype=np.float32)
    h, w = orig_array.shape[:2]

    # ── Step 1: Build best-quality map ──
    min_diffs = np.full((h, w), np.inf)
    best_quality = np.zeros((h, w), dtype=np.int32)

    for q in quality_range:
        buf = BytesIO()
        original.save(buf, 'JPEG', quality=q)
        buf.seek(0)
        recomp = np.array(Image.open(buf).convert('RGB'), dtype=np.float32)
        diff = np.mean((orig_array - recomp) ** 2, axis=2)
        mask = diff < min_diffs
        min_diffs[mask] = diff[mask]
        best_quality[mask] = q

    # ── Step 2: Normalize ghost map and colorize ──
    ghost_norm = (best_quality.astype(np.float32) - best_quality.min()) / \
                 (best_quality.max() - best_quality.min() + 1e-8)
    ghost_color = cv2.applyColorMap(
        (ghost_norm * 255).astype(np.uint8), cv2.COLORMAP_JET
    )

    # ── Step 3: Block-level statistical anomaly detection ──
    block = 16
    rows_b, cols_b = h // block, w // block
    block_norm = np.zeros((rows_b, cols_b), dtype=np.float32)
    for i in range(rows_b):
        for j in range(cols_b):
            block_norm[i, j] = ghost_norm[
                i*block:(i+1)*block, j*block:(j+1)*block
            ].mean()

    # ── Step 4: Isolate Active Document Blocks (Text, Lines, Photos) ──
    # Disregard flat white/blank background areas to avoid skewing statistics
    gray = cv2.cvtColor(orig_array.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    h_clipped, w_clipped = rows_b * block, cols_b * block
    gray_blocks = gray[:h_clipped, :w_clipped].reshape(rows_b, block, cols_b, block)
    
    # Blocks with local pixel standard deviation > 6 contain text, borders, or graphics
    active_blocks = gray_blocks.std(axis=(1, 3)) > 6.0

    orig_bgr_clean = cv2.cvtColor(orig_array.astype(np.uint8), cv2.COLOR_RGB2BGR)

    # Calculate statistics ONLY across blocks that contain information
    active_values = block_norm[active_blocks]
    if len(active_values) > 0:
        active_mean = active_values.mean()
        active_std = active_values.std()
        
        # Safety floor prevents minor natural rendering variances from tripping clean text
        adjusted_std = max(active_std, 0.06) 
        
        # Flag blocks that are compression outliers relative to other text segments
        anomaly_blocks = (
            (block_norm > (active_mean + 2.3 * adjusted_std)) |
            (block_norm < (active_mean - 2.3 * adjusted_std))
        ) & active_blocks
    else:
        anomaly_blocks = np.zeros((rows_b, cols_b), dtype=bool)

    # Convert block anomalies back to full resolution
    anomaly_raw = cv2.resize(
        anomaly_blocks.astype(np.uint8) * 255, (w, h), interpolation=cv2.INTER_NEAREST
    )

    # Morphological clean up of localized zones
    k_close = cv2.getStructuringElement(cv2.MORPH_RECT, (2*block, 2*block))
    k_open  = cv2.getStructuringElement(cv2.MORPH_RECT, (block, block))
    anomaly_morphed = cv2.morphologyEx(anomaly_raw, cv2.MORPH_CLOSE, k_close)
    anomaly_morphed = cv2.morphologyEx(anomaly_morphed, cv2.MORPH_OPEN,  k_open)

    contours, _ = cv2.findContours(
        anomaly_morphed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    orig_bgr  = orig_bgr_clean.copy()
    ghost_out = ghost_color.copy()

    palette = [
        (0,   0,   255), (0,   165, 255), (0,   255, 255),
        (255, 0,   0  ), (255, 0,   255), (0,   255, 0  )
    ]

    MIN_AREA = block * block * 12
    thick    = max(5, w // 450)
    fscale   = max(1.0, w / 1800)

    count = 0
    for cnt in sorted(contours, key=cv2.contourArea, reverse=True):
        area = cv2.contourArea(cnt)
        if area < MIN_AREA:
            continue
        x, y, bw, bh = cv2.boundingRect(cnt)
        
        if bw > w * 0.75 and bh > h * 0.75:
            continue
        if x < 15 or y < 15 or (x+bw) > w-15 or (y+bh) > h-15:
            continue

        # Structural Geometry Guardrails
        aspect_ratio = max(bw / bh, bh / bw)
        if aspect_ratio > 5.5: 
            continue

        hull = cv2.convexHull(cnt)
        hull_area = cv2.contourArea(hull)
        solidity = float(area) / hull_area if hull_area > 0 else 0
        if solidity < 0.40:
            continue

        contour_mask = np.zeros_like(anomaly_raw)
        cv2.drawContours(contour_mask, [cnt], -1, 255, -1)
        total_contour_pixels = np.sum(contour_mask == 255)
        actual_anomaly_pixels = np.sum((contour_mask == 255) & (anomaly_raw == 255))
        density = actual_anomaly_pixels / (total_contour_pixels + 1e-8)

        if density < 0.35:
            continue

        count += 1
        color = palette[(count - 1) % len(palette)]

        # Apply Visual Signatures
        overlay = orig_bgr.copy()
        cv2.rectangle(overlay, (x, y), (x+bw, y+bh), color, -1)
        cv2.addWeighted(overlay, 0.15, orig_bgr, 0.85, 0, orig_bgr)
        cv2.rectangle(orig_bgr, (x, y), (x+bw, y+bh), color, thick)

        label = f"Forged #{count}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, fscale, max(2, thick // 2))
        cv2.rectangle(orig_bgr, (x, y - th - 14), (x + tw + 10, y), color, -1)
        cv2.putText(orig_bgr, label, (x + 5, y - 8), cv2.FONT_HERSHEY_SIMPLEX, fscale, (255, 255, 255), max(2, thick // 2), cv2.LINE_AA)

        cv2.rectangle(ghost_out, (x, y), (x+bw, y+bh), (255, 255, 255), thick)
        cv2.putText(ghost_out, f"#{count}", (x + 6, y + int(55 * fscale)), cv2.FONT_HERSHEY_SIMPLEX, fscale, (255, 255, 255), max(2, thick // 2), max(2, thick // 2), cv2.LINE_AA)

    # ── Step 5: Summary banner ──
    banner_h = 80
    banner = np.zeros((banner_h, w, 3), dtype=np.uint8)
    banner[:] = (30, 30, 30)
    msg = f"GHOST Analysis  |  {count} suspicious forged region(s) detected"
    cv2.putText(banner, msg, (20, 52),
                cv2.FONT_HERSHEY_SIMPLEX, 1.4, (0, 220, 0), 3, cv2.LINE_AA)
    orig_final = np.vstack([banner, orig_bgr])

    orig_pil  = Image.fromarray(cv2.cvtColor(orig_final, cv2.COLOR_BGR2RGB))
    ghost_pil = Image.fromarray(cv2.cvtColor(ghost_out,  cv2.COLOR_BGR2RGB))

    return orig_pil, ghost_pil, count

# ═══════════════════════════════════════════════════════════════
# MAIN ANALYSIS ENTRY POINT
# ═══════════════════════════════════════════════════════════════

def run_full_forensics(path):
    results = {}

    # Stage 1
    label, score, hist, fft_vals = detect_double_compression(path)
    results['stage1'] = {
        'label': label,
        'score': float(score),
        'plot': plot_dct_to_base64(hist, fft_vals) if hist is not None else None
    }

    # Skip stages 2 and 3 if double compressed with score > 3
    if score > 3:
        results['stage2'] = {
            'annotated': None,
            'heatmap': None,
            'kept_count': 0,
            'skipped': True,
            'reason': 'Image is double compressed with score > 3'
        }
        results['stage3'] = {
            'annotated_original': None,
            'ghost_map': None,
            'forged_count': 0,
            'skipped': True,
            'reason': 'Image is double compressed with score > 3'
        }
        return results

    # Stage 2
    annotated, heatmap, kept = detect_copy_move(path)
    results['stage2'] = {
        'annotated': img_to_base64(annotated),
        'heatmap': img_to_base64(heatmap),
        'kept_count': int(kept)
    }

    # Stage 3
    orig_img, ghost_img, forged_count = ghost_analysis(path)
    results['stage3'] = {
        'annotated_original': pil_to_base64(orig_img),
        'ghost_map': pil_to_base64(ghost_img),
        'forged_count': int(forged_count)
    }

    return results
