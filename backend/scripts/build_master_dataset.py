import os
import shutil
import hashlib
import json
import random
import pandas as pd
from collections import defaultdict
from PIL import Image

# Set random seed for reproducibility
RANDOM_SEED = 42
random.seed(RANDOM_SEED)

ROOT_DIR = r"c:\Users\prave\Pictures\agriculture"
OUTPUT_DIR = os.path.join(ROOT_DIR, "data", "master_crop_dataset")
IMAGES_DIR = os.path.join(OUTPUT_DIR, "images")
METADATA_DIR = os.path.join(OUTPUT_DIR, "metadata")
TRAIN_DIR = os.path.join(OUTPUT_DIR, "train")
VAL_DIR = os.path.join(OUTPUT_DIR, "validation")
TEST_DIR = os.path.join(OUTPUT_DIR, "test")
QUARANTINE_DIR = os.path.join(OUTPUT_DIR, "quarantine")

for d in [IMAGES_DIR, METADATA_DIR, TRAIN_DIR, VAL_DIR, TEST_DIR, QUARANTINE_DIR]:
    os.makedirs(d, exist_ok=True)

# Sources to scan
SOURCES = [
    {
        "name": "Rice_and_Maize_Dataset",
        "path": os.path.join(ROOT_DIR, "crop datas", "Rice_and_Maize_Dataset")
    },
    {
        "name": "Dashboard_Leaf_Samples",
        "path": os.path.join(ROOT_DIR, "dasboard images")
    }
]

def compute_md5(filepath):
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()

def verify_image(filepath):
    try:
        with Image.open(filepath) as img:
            img.verify()
        with Image.open(filepath) as img:
            w, h = img.size
            fmt = img.format
            mode = img.mode
            # Try to convert to RGB to test decode
            rgb = img.convert('RGB')
            rgb.resize((224, 224))
        return True, w, h, fmt, mode, None
    except Exception as e:
        return False, None, None, None, None, str(e)

# Label Normalization Mapping
def normalize_label(crop, category_name):
    cat_lower = category_name.lower().replace("_", " ").strip()
    crop_name = crop.capitalize()
    
    # Specific normalization rules
    if "healthy" in cat_lower:
        return crop_name, "Healthy", "Healthy", f"{crop_name}___healthy"
    
    # Rice mappings
    if crop_name.lower() == "rice":
        if "bacterial" in cat_lower and "blight" in cat_lower:
            return "Rice", "Bacterial Leaf Blight", "Diseased", "Rice___Bacterial_leaf_blight"
        elif "brown" in cat_lower and "spot" in cat_lower:
            return "Rice", "Brown Spot", "Diseased", "Rice___Brown_spot"
        elif "false" in cat_lower and "smut" in cat_lower:
            return "Rice", "False Smut", "Diseased", "Rice___False_smut"
        elif "sheath" in cat_lower and "blight" in cat_lower:
            return "Rice", "Leaf Sheath Blight", "Diseased", "Rice___Leaf_sheath_blight"
        elif "folder" in cat_lower:
            return "Rice", "Leaf Folder Pest", "Pest Affected", "Rice___Leaf_folder"
        elif "skipper" in cat_lower:
            return "Rice", "Rice Skipper Pest", "Pest Affected", "Rice___Rice_skipper"
        elif "white" in cat_lower and "stem" in cat_lower:
            return "Rice", "White Stem Borer", "Pest Affected", "Rice___White_stem_borer"
        elif "yellow" in cat_lower and "stem" in cat_lower:
            return "Rice", "Yellow Stem Borer", "Pest Affected", "Rice___Yellow_stem_borer"
            
    # Maize mappings
    if crop_name.lower() in ["maize", "corn"]:
        if "maydis" in cat_lower:
            return "Maize", "Maydis Leaf Blight", "Diseased", "Corn_(maize)___Maydis_leaf_blight"
        elif "turcicum" in cat_lower or "northern" in cat_lower:
            return "Maize", "Northern Leaf Blight", "Diseased", "Corn_(maize)___Northern_Leaf_Blight"
        elif "curvularia" in cat_lower:
            return "Maize", "Curvularia Leaf Spot", "Diseased", "Corn_(maize)___Curvularia_leaf_spot"
        elif "downy" in cat_lower:
            return "Maize", "Sorghum Downy Mildew", "Diseased", "Corn_(maize)___Sorghum_downy_mildew"
        elif "aphid" in cat_lower:
            return "Maize", "Aphid Pest", "Pest Affected", "Corn_(maize)___Aphid"
        elif "fall" in cat_lower and "armyworm" in cat_lower:
            return "Maize", "Fall Armyworm Pest", "Pest Affected", "Corn_(maize)___Fall_armyworm"
        elif "faw" in cat_lower:
            return "Maize", "Fall Armyworm Damage Symptoms", "Pest Affected", "Corn_(maize)___FAW_symptoms"
        elif "common" in cat_lower and "rust" in cat_lower:
            return "Maize", "Common Rust", "Diseased", "Corn_(maize)___Common_rust_"
            
    # Default fallback
    clean_cat = " ".join(w.capitalize() for w in cat_lower.split())
    return crop_name, clean_cat, "Diseased", f"{crop_name}___{clean_cat.replace(' ', '_')}"

print("=" * 80)
print("STARTING MASTER CROP DATASET CREATION AND NORMALIZATION")
print("=" * 80)

discovered_files = []
seen_hashes = {}
quarantine_log = []
master_records = []

# Scan Rice & Maize dataset
rm_dir = SOURCES[0]["path"]
if os.path.exists(rm_dir):
    for root, dirs, files in os.walk(rm_dir):
        rel = os.path.relpath(root, rm_dir)
        parts = rel.split(os.sep)
        if len(parts) >= 2:
            crop = parts[0]
            category = parts[-1]
            for f in files:
                if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    src_path = os.path.join(root, f)
                    discovered_files.append((src_path, crop, category, "Rice_and_Maize_Dataset"))

# Scan Dashboard Leaf Samples (Tomato, Apple, etc.)
dash_dir = SOURCES[1]["path"]
if os.path.exists(dash_dir):
    for f in os.listdir(dash_dir):
        if "3.0" in f and f.lower().endswith(('.jpg', '.jpeg', '.png')):
            src_path = os.path.join(dash_dir, f)
            discovered_files.append((src_path, "Tomato", "Early Blight", "Dashboard_Leaf_Samples"))

print(f"Total candidate images discovered: {len(discovered_files)}")

# Process each image
for src_path, raw_crop, raw_cat, src_name in discovered_files:
    is_valid, w, h, fmt, mode, err = verify_image(src_path)
    filename = os.path.basename(src_path)
    
    if not is_valid:
        quarantine_dst = os.path.join(QUARANTINE_DIR, f"corrupted_{filename}")
        shutil.copy2(src_path, quarantine_dst)
        quarantine_log.append({
            "filename": filename,
            "original_path": src_path,
            "reason": f"Corrupted/unreadable image: {err}"
        })
        continue
        
    md5 = compute_md5(src_path)
    if md5 in seen_hashes:
        quarantine_dst = os.path.join(QUARANTINE_DIR, f"duplicate_{filename}")
        shutil.copy2(src_path, quarantine_dst)
        quarantine_log.append({
            "filename": filename,
            "original_path": src_path,
            "reason": f"Exact duplicate of {seen_hashes[md5]}"
        })
        continue
        
    seen_hashes[md5] = src_path
    
    crop, disease, health_status, norm_class = normalize_label(raw_crop, raw_cat)
    
    # Store in master images folder
    crop_folder = os.path.join(IMAGES_DIR, crop.lower(), norm_class)
    os.makedirs(crop_folder, exist_ok=True)
    dst_img_path = os.path.join(crop_folder, filename)
    shutil.copy2(src_path, dst_img_path)
    
    master_records.append({
        "filename": filename,
        "image_path": dst_img_path,
        "crop": crop,
        "disease": disease,
        "health_status": health_status,
        "normalized_label": norm_class,
        "source_dataset": src_name,
        "original_label": f"{raw_crop}/{raw_cat}",
        "width": w,
        "height": h,
        "format": fmt,
        "mode": mode,
        "md5": md5
    })

print(f"Total Usable Images Cleaned & Validated: {len(master_records)}")
print(f"Total Quarantined (Corrupted/Duplicates): {len(quarantine_log)}")

# Save Quarantine log
with open(os.path.join(QUARANTINE_DIR, "quarantine_log.json"), "w", encoding="utf-8") as f:
    json.dump(quarantine_log, f, indent=2)

# Perform Stratified 70/15/15 Split
class_groups = defaultdict(list)
for r in master_records:
    class_groups[r["normalized_label"]].append(r)

train_records = []
val_records = []
test_records = []

for cls, items in class_groups.items():
    random.shuffle(items)
    n = len(items)
    n_train = max(1, int(n * 0.70))
    n_val = max(1, int(n * 0.15))
    
    train_items = items[:n_train]
    val_items = items[n_train:n_train + n_val]
    test_items = items[n_train + n_val:]
    
    # If test_items is empty due to small n, adjust
    if not test_items and len(train_items) > 1:
        test_items = [train_items.pop()]
        
    for item in train_items:
        item["split"] = "train"
        train_records.append(item)
        dst = os.path.join(TRAIN_DIR, cls)
        os.makedirs(dst, exist_ok=True)
        shutil.copy2(item["image_path"], os.path.join(dst, item["filename"]))
        
    for item in val_items:
        item["split"] = "validation"
        val_records.append(item)
        dst = os.path.join(VAL_DIR, cls)
        os.makedirs(dst, exist_ok=True)
        shutil.copy2(item["image_path"], os.path.join(dst, item["filename"]))
        
    for item in test_items:
        item["split"] = "test"
        test_records.append(item)
        dst = os.path.join(TEST_DIR, cls)
        os.makedirs(dst, exist_ok=True)
        shutil.copy2(item["image_path"], os.path.join(dst, item["filename"]))

# Save master dataset CSV
df = pd.DataFrame(master_records)
csv_path = os.path.join(METADATA_DIR, "master_dataset.csv")
df.to_csv(csv_path, index=False)

print("\n" + "=" * 80)
print("SPLIT SUMMARY:")
print("=" * 80)
print(f"Train Set Count:      {len(train_records)} ({len(train_records)/len(master_records)*100:.1f}%)")
print(f"Validation Set Count: {len(val_records)} ({len(val_records)/len(master_records)*100:.1f}%)")
print(f"Test Set Count:       {len(test_records)} ({len(test_records)/len(master_records)*100:.1f}%)")
print(f"Total Classes:        {len(class_groups)}")
print(f"Master CSV Saved:     {csv_path}")
print("=" * 80)
