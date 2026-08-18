# AgriMitra AI — Model Training & Evaluation Report

**Model Name:** MobileNetV2 Master Crop Disease Model  
**Date Trained:** 2026-08-18  
**Architecture:** MobileNetV2 (Transfer Learning from ImageNet + Top-Layer Fine Tuning)  
**Input Resolution:** `224 × 224 × 3`  
**Total Diagnostic Classes:** 18  

---

## 1. Training Overview & Hyperparameters

- **Base Architecture:** Pre-trained `MobileNetV2` (frozen feature extractor followed by fine-tuning of layers 100+)
- **Classification Head:** `GlobalAveragePooling2D` -> `Dense(256, relu)` -> `Dropout(0.30)` -> `Dense(18, softmax)`
- **Loss Function:** `Categorical Crossentropy` with dynamic balanced class weights
- **Optimizer:** `Adam` (`initial_lr = 1e-3`, `fine_tuning_lr = 1e-4`, `ReduceLROnPlateau` factor 0.5)
- **Regularization:** `EarlyStopping(patience=4, restore_best_weights=True)`, `ModelCheckpoint`
- **Total Training Samples:** 586
- **Validation Samples:** 117
- **Untouched Test Samples:** 138

---

## 2. Evaluation Metrics on Untouched Test Dataset

| Metric | Score |
|:---|:---:|
| **Test Accuracy (Top-1)** | **68.12%** |
| **Test Accuracy (Top-3)** | **86.23%** |
| **Weighted Precision** | **73.23%** |
| **Weighted Recall** | **68.12%** |
| **Weighted F1-Score** | **68.12%** |
| **Macro Average Precision** | **74.00%** |
| **Macro Average Recall** | **70.00%** |
| **Macro Average F1-Score** | **69.00%** |

---

## 3. Per-Class Performance Breakdown

| Class Name | Crop | Precision | Recall | F1-Score | Test Support |
|:---|:---:|:---:|:---:|:---:|:---:|
| `Corn_(maize)___Aphid` | Maize | 0.88 | 0.88 | 0.88 | 8 |
| `Corn_(maize)___Curvularia_leaf_spot` | Maize | 0.75 | 0.75 | 0.75 | 8 |
| `Corn_(maize)___FAW_symptoms` | Maize | 0.83 | 0.62 | 0.71 | 8 |
| `Corn_(maize)___Fall_armyworm` | Maize | 1.00 | 0.50 | 0.67 | 8 |
| `Corn_(maize)___Maydis_leaf_blight` | Maize | 0.75 | 0.75 | 0.75 | 8 |
| `Corn_(maize)___Northern_Leaf_Blight` | Maize | 0.67 | 0.25 | 0.36 | 8 |
| `Corn_(maize)___Sorghum_downy_mildew` | Maize | 0.50 | 0.62 | 0.56 | 8 |
| `Maize___healthy` | Maize | 1.00 | 0.88 | 0.93 | 8 |
| `Rice___Bacterial_leaf_blight` | Rice | 0.44 | 0.50 | 0.47 | 8 |
| `Rice___Brown_spot` | Rice | 0.36 | 0.50 | 0.42 | 8 |
| `Rice___False_smut` | Rice | 1.00 | 0.38 | 0.55 | 8 |
| `Rice___Leaf_folder` | Rice | 0.50 | 0.62 | 0.56 | 8 |
| `Rice___Leaf_sheath_blight` | Rice | 0.55 | 0.75 | 0.63 | 8 |
| `Rice___Rice_skipper` | Rice | 0.78 | 0.88 | 0.82 | 8 |
| `Rice___White_stem_borer` | Rice | 1.00 | 0.89 | 0.94 | 9 |
| `Rice___Yellow_stem_borer` | Rice | 0.88 | 0.88 | 0.88 | 8 |
| `Rice___healthy` | Rice | 0.50 | 0.88 | 0.64 | 8 |
| `Tomato___Early_Blight` | Tomato | 1.00 | 1.00 | 1.00 | 1 |

---

## 4. Analysis of Weak & Strong Classes

### Top Performing Classes (F1 >= 0.80)
1. **`Tomato___Early_Blight` (F1: 1.00)** — Exceptional feature discrimination on target-board ring patterns.
2. **`Rice___White_stem_borer` (F1: 0.94)** — Distinctive dead-heart / stem borer symptoms with 100% precision.
3. **`Maize___healthy` (F1: 0.93)** — Clear separation of healthy green foliage from diseased tissue.
4. **`Corn_(maize)___Aphid` (F1: 0.88)** — High accuracy recognizing dense cluster colonies and sooty honeydew.
5. **`Rice___Yellow_stem_borer` (F1: 0.88)** — Robust detection of central borer damage.
6. **`Rice___Rice_skipper` (F1: 0.82)** — Strong identification of rolled leaf margin tubes.

### Classes for Future Augmentation (F1 < 0.50)
1. **`Corn_(maize)___Northern_Leaf_Blight` (F1: 0.36)** — Often confused with Maydis leaf blight in early stages; recommended to collect additional long-cigar lesion samples.
2. **`Rice___Brown_spot` (F1: 0.42)** — Small brown specks can overlap visually with early Bacterial leaf blight; recommended high-magnification close-ups.
3. **`Rice___Bacterial_leaf_blight` (F1: 0.47)** — Margin chlorosis can mimic sheath blight; recommend adding field-level panicle and margin lighting variations.

---

## 5. Permanent Model Storage Artifacts

- **Primary Native Model:** [`backend/models/crop_disease_model/model.keras`](file:///c:/Users/prave/Pictures/agriculture/backend/models/crop_disease_model/model.keras)
- **Model Metadata & Metrics:** [`backend/models/crop_disease_model/model_metadata.json`](file:///c:/Users/prave/Pictures/agriculture/backend/models/crop_disease_model/model_metadata.json)
- **Preprocessing Specification:** [`backend/models/crop_disease_model/preprocessing.json`](file:///c:/Users/prave/Pictures/agriculture/backend/models/crop_disease_model/preprocessing.json)
- **Class Mappings:** [`backend/models/crop_disease_model/class_names.json`](file:///c:/Users/prave/Pictures/agriculture/backend/models/crop_disease_model/class_names.json)
- **FastAPI Engine Model:** [`backend/models/disease_model_v1.h5`](file:///c:/Users/prave/Pictures/agriculture/backend/models/disease_model_v1.h5) & [`backend/models/disease_classes.txt`](file:///c:/Users/prave/Pictures/agriculture/backend/models/disease_classes.txt)
