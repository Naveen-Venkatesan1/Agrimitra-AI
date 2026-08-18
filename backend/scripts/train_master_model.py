import os
import json
import time
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from sklearn.metrics import classification_report, confusion_matrix

# Set reproducibility seeds
np.random.seed(42)
tf.random.set_seed(42)

# Paths
ROOT_DIR = r"c:\Users\prave\Pictures\agriculture"
DATA_DIR = os.path.join(ROOT_DIR, "data", "master_crop_dataset")
TRAIN_DIR = os.path.join(DATA_DIR, "train")
VAL_DIR = os.path.join(DATA_DIR, "validation")
TEST_DIR = os.path.join(DATA_DIR, "test")

OUTPUT_MODEL_DIR = os.path.join(ROOT_DIR, "backend", "models", "crop_disease_model")
MODELS_DIR = os.path.join(ROOT_DIR, "backend", "models")
os.makedirs(OUTPUT_MODEL_DIR, exist_ok=True)

# Hyperparameters
IMG_SIZE = (224, 224)
BATCH_SIZE = 16
INITIAL_EPOCHS = 12
LEARNING_RATE = 1e-3

print("=" * 80)
print("TRAINING MASTER CROP DISEASE ML MODEL (MobileNetV2 Transfer Learning)")
print("=" * 80)

# Real-time Biological Data Augmentation (Training ONLY)
train_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input,
    rotation_range=20,
    width_shift_range=0.1,
    height_shift_range=0.1,
    zoom_range=0.15,
    horizontal_flip=True,
    brightness_range=[0.85, 1.15],
    fill_mode='nearest'
)

# Untouched Validation and Test Generators (Strictly No Augmentations)
val_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)
test_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)

train_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    shuffle=True,
    seed=42
)

val_generator = val_datagen.flow_from_directory(
    VAL_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    shuffle=False
)

test_generator = test_datagen.flow_from_directory(
    TEST_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    shuffle=False
)

num_classes = train_generator.num_classes
class_indices = train_generator.class_indices
class_names = list(class_indices.keys())
print(f"\nDiscovered {num_classes} Classes:")
for idx, name in enumerate(class_names):
    print(f"  [{idx:2d}] {name}")

# Compute Class Weights for Imbalance handling
class_counts = np.bincount(train_generator.classes)
total_samples = float(sum(class_counts))
class_weights = {i: total_samples / (num_classes * count) for i, count in enumerate(class_counts)}
print("\nComputed Class Weights (Balanced):")
for i, w in class_weights.items():
    print(f"  {class_names[i]}: {w:.3f}")

# Model Architecture: Pre-trained MobileNetV2
base_model = MobileNetV2(
    weights='imagenet',
    include_top=False,
    input_shape=(224, 224, 3)
)

# Freeze base model layers initially
base_model.trainable = False

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(256, activation='relu')(x)
x = Dropout(0.3)(x)
predictions = Dense(num_classes, activation='softmax')(x)

model = Model(inputs=base_model.input, outputs=predictions)

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),
    loss='categorical_crossentropy',
    metrics=['accuracy', tf.keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')]
)

checkpoint_path = os.path.join(OUTPUT_MODEL_DIR, "best_model_checkpoint.keras")

callbacks = [
    EarlyStopping(monitor='val_accuracy', patience=4, restore_best_weights=True, verbose=1),
    ModelCheckpoint(checkpoint_path, monitor='val_accuracy', save_best_only=True, verbose=1),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=2, min_lr=1e-6, verbose=1)
]

print("\nStarting Model Training Phase 1 (Transfer Learning)...")
start_time = time.time()

history = model.fit(
    train_generator,
    epochs=INITIAL_EPOCHS,
    validation_data=val_generator,
    class_weight=class_weights,
    callbacks=callbacks,
    verbose=1
)

# Fine-tuning Phase: Unfreeze top layers of base model
print("\nStarting Model Training Phase 2 (Fine-Tuning Top Layers)...")
base_model.trainable = True
# Fine-tune from layer 100 onwards
for layer in base_model.layers[:100]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
    loss='categorical_crossentropy',
    metrics=['accuracy', tf.keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')]
)

history_finetune = model.fit(
    train_generator,
    epochs=6,
    validation_data=val_generator,
    class_weight=class_weights,
    callbacks=callbacks,
    verbose=1
)

training_duration = round(time.time() - start_time, 2)
print(f"\nTraining Completed in {training_duration} seconds.")

# Evaluation on Untouched Test Dataset
print("\n" + "=" * 80)
print("EVALUATING MODEL ON UNTOUCHED TEST SET")
print("=" * 80)

test_eval = model.evaluate(test_generator, verbose=1)
test_loss = test_eval[0]
test_acc = test_eval[1]
test_top3 = test_eval[2]

# Predict all test samples
test_generator.reset()
y_pred_probs = model.predict(test_generator, verbose=1)
y_pred = np.argmax(y_pred_probs, axis=1)
y_true = test_generator.classes

# Scikit-learn classification report
report_dict = classification_report(y_true, y_pred, target_names=class_names, output_dict=True, zero_division=0)
report_str = classification_report(y_true, y_pred, target_names=class_names, zero_division=0)
conf_matrix = confusion_matrix(y_true, y_pred).tolist()

print("\nClassification Report:")
print(report_str)
print(f"Test Accuracy:       {test_acc * 100:.2f}%")
print(f"Test Top-3 Accuracy: {test_top3 * 100:.2f}%")
print(f"Weighted Precision:  {report_dict['weighted avg']['precision'] * 100:.2f}%")
print(f"Weighted Recall:     {report_dict['weighted avg']['recall'] * 100:.2f}%")
print(f"Weighted F1-Score:   {report_dict['weighted avg']['f1-score'] * 100:.2f}%")

# Save Permanent Model Files
final_keras_path = os.path.join(OUTPUT_MODEL_DIR, "model.keras")
model.save(final_keras_path)

# Also save directly into backend/models for FastAPI engine
backend_h5_path = os.path.join(MODELS_DIR, "disease_model_v1.h5")
backend_keras_path = os.path.join(MODELS_DIR, "disease_model_v1.keras")
model.save(backend_h5_path)
model.save(backend_keras_path)

# Save class mapping
class_names_path = os.path.join(OUTPUT_MODEL_DIR, "class_names.json")
with open(class_names_path, "w", encoding="utf-8") as f:
    json.dump(class_names, f, indent=2)

backend_classes_txt = os.path.join(MODELS_DIR, "disease_classes.txt")
with open(backend_classes_txt, "w", encoding="utf-8") as f:
    for c in class_names:
        f.write(f"{c}\n")

# Save Preprocessing Configuration
preprocessing_config = {
    "target_size": [224, 224, 3],
    "color_mode": "rgb",
    "preprocessing_function": "tf.keras.applications.mobilenet_v2.preprocess_input",
    "normalization_range": "[-1, 1]",
    "architecture": "MobileNetV2"
}
with open(os.path.join(OUTPUT_MODEL_DIR, "preprocessing.json"), "w", encoding="utf-8") as f:
    json.dump(preprocessing_config, f, indent=2)

# Save Model Metadata & Evaluation Report
model_metadata = {
    "model_name": "AgriMitra Master Crop Disease Model",
    "architecture": "MobileNetV2 Transfer Learning",
    "training_date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "training_duration_seconds": training_duration,
    "num_classes": num_classes,
    "class_names": class_names,
    "train_samples": train_generator.samples,
    "val_samples": val_generator.samples,
    "test_samples": test_generator.samples,
    "test_accuracy": float(test_acc),
    "test_top3_accuracy": float(test_top3),
    "test_loss": float(test_loss),
    "weighted_precision": float(report_dict["weighted avg"]["precision"]),
    "weighted_recall": float(report_dict["weighted avg"]["recall"]),
    "weighted_f1_score": float(report_dict["weighted avg"]["f1-score"]),
    "classification_report": report_dict,
    "confusion_matrix": conf_matrix,
    "model_size_mb": round(os.path.getsize(final_keras_path) / (1024 * 1024), 2)
}

metadata_json_path = os.path.join(OUTPUT_MODEL_DIR, "model_metadata.json")
with open(metadata_json_path, "w", encoding="utf-8") as f:
    json.dump(model_metadata, f, indent=2)

print("\n" + "=" * 80)
print(f"Model saved successfully to: {final_keras_path}")
print(f"Metadata saved to:           {metadata_json_path}")
print(f"Backend models updated at:   {backend_h5_path}")
print("=" * 80)
