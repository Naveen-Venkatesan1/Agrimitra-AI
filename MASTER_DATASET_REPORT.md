# AgriMitra AI — Master Crop Dataset Report

**Generated Date:** 2026-08-18  
**Dataset Version:** v1.0.0-Master  
**Location:** `data/master_crop_dataset/`  

---

## 1. Executive Summary

All distributed agriculture image sources across the project were scanned, audited, cleaned, deduplicated, and normalized into a unified, high-integrity **Master Crop Intelligence Dataset**.

- **Total Discovered Images:** 859
- **Cleaned & Usable Images:** 841
- **Quarantined Images (Duplicates / Corrupted):** 18
- **Total Diagnostic Classes:** 18 distinct crop, disease, pest, and healthy categories
- **Crops Represented:** Rice (*Oryza sativa*), Maize/Corn (*Zea mays*), Tomato (*Solanum lycopersicum*)
- **Storage Structure:** `data/master_crop_dataset/{images, train, validation, test, metadata, quarantine}`

---

## 2. Dataset Demographics & Class Distribution

| Index | Normalized Class Name | Crop | Health Category | Total Samples | Train (70%) | Val (15%) | Test (15%) |
|:---:|:---|:---|:---|:---:|:---:|:---:|:---:|
| 0 | `Corn_(maize)___Aphid` | Maize | Pest Affected | 49 | 34 | 7 | 8 |
| 1 | `Corn_(maize)___Curvularia_leaf_spot` | Maize | Diseased | 50 | 35 | 7 | 8 |
| 2 | `Corn_(maize)___FAW_symptoms` | Maize | Pest Damage | 50 | 35 | 7 | 8 |
| 3 | `Corn_(maize)___Fall_armyworm` | Maize | Pest Affected | 50 | 35 | 7 | 8 |
| 4 | `Corn_(maize)___Maydis_leaf_blight` | Maize | Diseased | 50 | 35 | 7 | 8 |
| 5 | `Corn_(maize)___Northern_Leaf_Blight` | Maize | Diseased | 50 | 35 | 7 | 8 |
| 6 | `Corn_(maize)___Sorghum_downy_mildew` | Maize | Diseased | 50 | 35 | 7 | 8 |
| 7 | `Maize___healthy` | Maize | Healthy | 50 | 35 | 7 | 8 |
| 8 | `Rice___Bacterial_leaf_blight` | Rice | Diseased | 46 | 32 | 6 | 8 |
| 9 | `Rice___Brown_spot` | Rice | Diseased | 50 | 35 | 7 | 8 |
| 10 | `Rice___False_smut` | Rice | Diseased | 50 | 35 | 7 | 8 |
| 11 | `Rice___Leaf_folder` | Rice | Pest Affected | 49 | 34 | 7 | 8 |
| 12 | `Rice___Leaf_sheath_blight` | Rice | Diseased | 50 | 35 | 7 | 8 |
| 13 | `Rice___Rice_skipper` | Rice | Pest Affected | 45 | 31 | 6 | 8 |
| 14 | `Rice___White_stem_borer` | Rice | Pest Affected | 51 | 35 | 7 | 9 |
| 15 | `Rice___Yellow_stem_borer` | Rice | Pest Affected | 46 | 32 | 6 | 8 |
| 16 | `Rice___healthy` | Rice | Healthy | 48 | 33 | 7 | 8 |
| 17 | `Tomato___Early_Blight` | Tomato | Diseased | 7 | 5 | 1 | 1 |
| **Total** | **18 Classes** | **3 Crops** | — | **841** | **586 (69.7%)** | **117 (13.9%)** | **138 (16.4%)** |

---

## 3. Data Integrity, Deduplication & Quarantine

- **Integrity Verification:** Every candidate image was decoded via Pillow, verified for 3-channel RGB matrix consistency, and checked for file header truncation.
- **MD5 Exact Deduplication:** 18 exact duplicate images were detected and isolated into `data/master_crop_dataset/quarantine/` with a full audit trace stored in `quarantine_log.json`.
- **Zero Loss Guarantee:** Original source folders (`crop datas/` and `dasboard images/`) remain untouched and preserved.

---

## 4. Leakage-Free Stratification Plan

To prevent optimistic bias and test set leakage:
1. **Partition Strategy:** Stratified random sampling per class (`random_state=42`).
2. **Hash Isolation:** MD5 verification guarantees zero identical images across Train, Validation, and Test partitions.
3. **Augmentation Isolation:** Augmentations (rotation, zoom, horizontal flips) are applied strictly during runtime training generator execution. Validation and Test partitions remain 100% unaugmented and pristine.

---

## 5. Master Dataset Artifact Locations

- **Master Metadata CSV:** [`data/master_crop_dataset/metadata/master_dataset.csv`](file:///c:/Users/prave/Pictures/agriculture/data/master_crop_dataset/metadata/master_dataset.csv)
- **Quarantine Log JSON:** [`data/master_crop_dataset/quarantine/quarantine_log.json`](file:///c:/Users/prave/Pictures/agriculture/data/master_crop_dataset/quarantine/quarantine_log.json)
- **Train Directory:** [`data/master_crop_dataset/train/`](file:///c:/Users/prave/Pictures/agriculture/data/master_crop_dataset/train)
- **Validation Directory:** [`data/master_crop_dataset/validation/`](file:///c:/Users/prave/Pictures/agriculture/data/master_crop_dataset/validation)
- **Test Directory:** [`data/master_crop_dataset/test/`](file:///c:/Users/prave/Pictures/agriculture/data/master_crop_dataset/test)
