import os
import sys
import json
import logging
import numpy as np
import tensorflow as tf
from datetime import datetime
from PIL import Image
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def train_disease_model():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    datasets_dir = os.path.join(base_dir, "..", "datasets")
    
    pv_train_dir = os.path.join(datasets_dir, "plant village", "PlantVillage", "train")
    pv_val_dir = os.path.join(datasets_dir, "plant village", "PlantVillage", "val")
    rice_dir = os.path.join(datasets_dir, "rice leaf", "rice_leaf_diseases")
    
    models_dir = os.path.join(base_dir, "models")
    reports_dir = os.path.join(models_dir, "training_report")
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)
    
    model_save_path = os.path.join(models_dir, "disease_model_v1.keras")
    classes_path = os.path.join(models_dir, "disease_classes.txt")
    config_path = os.path.join(models_dir, "model_config.json")
    
    logging.info("=" * 60)
    logging.info("STEP 1: DATASET DISCOVERY & FAST PREPROCESSING")
    logging.info("=" * 60)
    
    pv_classes = sorted([d for d in os.listdir(pv_train_dir) if os.path.isdir(os.path.join(pv_train_dir, d))]) if os.path.exists(pv_train_dir) else []
    rice_classes = sorted([d for d in os.listdir(rice_dir) if os.path.isdir(os.path.join(rice_dir, d))]) if os.path.exists(rice_dir) else []
    
    normalized_rice_map = {c: f"Rice___{c.replace(' ', '_')}" for c in rice_classes}
    all_classes = sorted(pv_classes + list(normalized_rice_map.values()))
    
    logging.info(f"Discovered {len(all_classes)} normalized disease classes (PlantVillage: {len(pv_classes)}, Rice Leaf: {len(rice_classes)}).")
    
    with open(classes_path, "w", encoding="utf-8") as f:
        for cls_name in all_classes:
            f.write(cls_name + "\n")
    logging.info(f"Class index mapping saved to {classes_path}")
    
    class_to_idx = {cls_name: idx for idx, cls_name in enumerate(all_classes)}
    
    train_files, val_files, test_files = [], [], []
    train_labels, val_labels, test_labels = [], [], []
    
    seen_signatures = set()
    corrupt_count = 0
    duplicate_count = 0
    
    def process_class_files(files_list, cls_normalized_name, target_split="train"):
        nonlocal corrupt_count, duplicate_count
        for fpath in files_list:
            try:
                stat = os.stat(fpath)
                sig = (os.path.basename(fpath), stat.st_size)
                if sig in seen_signatures:
                    duplicate_count += 1
                    continue
                seen_signatures.add(sig)
                
                label_idx = class_to_idx[cls_normalized_name]
                if target_split == "train":
                    train_files.append(fpath)
                    train_labels.append(label_idx)
                elif target_split == "val":
                    val_files.append(fpath)
                    val_labels.append(label_idx)
                elif target_split == "test":
                    test_files.append(fpath)
                    test_labels.append(label_idx)
            except Exception:
                corrupt_count += 1

    # Process PlantVillage
    for c in pv_classes:
        c_train_dir = os.path.join(pv_train_dir, c)
        c_files = [os.path.join(c_train_dir, f) for f in os.listdir(c_train_dir) if f.lower().endswith(('.jpg', '.png', '.jpeg', '.webp'))]
        tr_f, te_f = train_test_split(c_files, test_size=0.15, random_state=42)
        
        process_class_files(tr_f, c, "train")
        process_class_files(te_f, c, "test")
        
        c_val_dir = os.path.join(pv_val_dir, c)
        if os.path.exists(c_val_dir):
            c_val_files = [os.path.join(c_val_dir, f) for f in os.listdir(c_val_dir) if f.lower().endswith(('.jpg', '.png', '.jpeg', '.webp'))]
            process_class_files(c_val_files, c, "val")
            
    # Process Rice Leaf
    for raw_rice_c, norm_rice_c in normalized_rice_map.items():
        c_rice_dir = os.path.join(rice_dir, raw_rice_c)
        c_files = [os.path.join(c_rice_dir, f) for f in os.listdir(c_rice_dir) if f.lower().endswith(('.jpg', '.png', '.jpeg', '.webp'))]
        tr_f, rest_f = train_test_split(c_files, test_size=0.20, random_state=42)
        va_f, te_f = train_test_split(rest_f, test_size=0.50, random_state=42)
        
        process_class_files(tr_f, norm_rice_c, "train")
        process_class_files(va_f, norm_rice_c, "val")
        process_class_files(te_f, norm_rice_c, "test")

    logging.info(f"Fast Data Audit: Duplicates skipped: {duplicate_count}, Corrupt skipped: {corrupt_count}")
    logging.info(f"Split Totals -> Train: {len(train_files)}, Val: {len(val_files)}, Test: {len(test_files)}")
    
    class_weights_arr = compute_class_weight('balanced', classes=np.unique(train_labels), y=train_labels)
    class_weight_dict = {i: float(w) for i, w in zip(np.unique(train_labels), class_weights_arr)}
    
    IMG_SIZE = (224, 224)
    BATCH_SIZE = 32
    
    # Preprocessing is applied in tf.data pipeline to match MobileNetV2 preprocess_input exactly!
    def parse_train_image(fpath, label):
        img_raw = tf.io.read_file(fpath)
        img = tf.image.decode_jpeg(img_raw, channels=3)
        img = tf.image.resize(img, IMG_SIZE)
        img = tf.image.random_flip_left_right(img)
        img = tf.image.random_flip_up_down(img)
        img = tf.keras.applications.mobilenet_v2.preprocess_input(img)
        return img, label

    def parse_val_test_image(fpath, label):
        img_raw = tf.io.read_file(fpath)
        img = tf.image.decode_jpeg(img_raw, channels=3)
        img = tf.image.resize(img, IMG_SIZE)
        img = tf.keras.applications.mobilenet_v2.preprocess_input(img)
        return img, label

    train_ds = tf.data.Dataset.from_tensor_slices((train_files, train_labels))
    train_ds = train_ds.shuffle(buffer_size=5000).map(parse_train_image, num_parallel_calls=tf.data.AUTOTUNE).batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)
    
    val_ds = tf.data.Dataset.from_tensor_slices((val_files, val_labels))
    val_ds = val_ds.map(parse_val_test_image, num_parallel_calls=tf.data.AUTOTUNE).batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)
    
    test_ds = tf.data.Dataset.from_tensor_slices((test_files, test_labels))
    test_ds = test_ds.map(parse_val_test_image, num_parallel_calls=tf.data.AUTOTUNE).batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)

    logging.info("=" * 60)
    logging.info("STEP 2: BUILDING MOBILENETV2 TRANSFER LEARNING MODEL")
    logging.info("=" * 60)
    
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights='imagenet'
    )
    base_model.trainable = False
    
    inputs = tf.keras.layers.Input(shape=(224, 224, 3), name="image_input")
    x = base_model(inputs, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dense(256, activation='relu')(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    outputs = tf.keras.layers.Dense(len(all_classes), activation='softmax', name="predictions")(x)
    
    model = tf.keras.Model(inputs=inputs, outputs=outputs, name="AgriMitra_Disease_MobileNetV2")
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    logging.info("Phase 1: Training Classification Head with Frozen Base...")
    callbacks_phase1 = [
        tf.keras.callbacks.EarlyStopping(monitor='val_accuracy', patience=2, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.2, patience=1, min_lr=1e-6),
        tf.keras.callbacks.ModelCheckpoint(model_save_path, monitor='val_accuracy', save_best_only=True, verbose=1)
    ]
    
    history1 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=4,
        steps_per_epoch=250,
        validation_steps=50,
        class_weight=class_weight_dict,
        callbacks=callbacks_phase1
    )
    
    logging.info("Phase 2: Fine-Tuning Upper Layers of MobileNetV2...")
    base_model.trainable = True
    for layer in base_model.layers[:-25]:
        layer.trainable = False
        
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    callbacks_phase2 = [
        tf.keras.callbacks.EarlyStopping(monitor='val_accuracy', patience=2, restore_best_weights=True),
        tf.keras.callbacks.ModelCheckpoint(model_save_path, monitor='val_accuracy', save_best_only=True, verbose=1)
    ]
    
    history2 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=2,
        steps_per_epoch=250,
        validation_steps=50,
        class_weight=class_weight_dict,
        callbacks=callbacks_phase2
    )

    logging.info("=" * 60)
    logging.info("STEP 3: MODEL EVALUATION & METRICS GENERATION")
    logging.info("=" * 60)
    
    best_model = tf.keras.models.load_model(model_save_path)
    
    logging.info("Evaluating best saved model on test dataset...")
    y_true = []
    y_pred_probs = []
    
    for x_batch, y_batch in test_ds.take(50):
        preds = best_model.predict(x_batch, verbose=0)
        y_true.extend(y_batch.numpy())
        y_pred_probs.extend(preds)
        
    y_true = np.array(y_true)
    y_pred_probs = np.array(y_pred_probs)
    y_pred = np.argmax(y_pred_probs, axis=1)
    
    test_acc = float(accuracy_score(y_true, y_pred))
    prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted', zero_division=0)
    
    unique_labels = sorted(list(set(y_true)))
    target_names_unique = [all_classes[i] for i in unique_labels]
    cls_report = classification_report(y_true, y_pred, labels=unique_labels, target_names=target_names_unique, zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=unique_labels).tolist()
    
    logging.info(f"MEASURED TEST ACCURACY: {test_acc * 100:.2f}% | Precision: {prec:.4f} | Recall: {rec:.4f} | F1-Score: {f1:.4f}")
    
    model_config = {
        "input_size": [224, 224, 3],
        "class_count": len(all_classes),
        "class_names": all_classes,
        "preprocessing_method": "tf.keras.applications.mobilenet_v2.preprocess_input",
        "model_architecture": "MobileNetV2 Transfer Learning",
        "training_dataset": "PlantVillage (38 classes) + Rice Leaf Disease Dataset (3 classes)",
        "training_date": datetime.utcnow().isoformat() + "Z",
        "test_accuracy": round(test_acc, 4),
        "test_f1_score": round(float(f1), 4),
        "total_train_samples": len(train_files),
        "total_val_samples": len(val_files),
        "total_test_samples": len(test_files)
    }
    
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(model_config, f, indent=2)
    logging.info(f"Saved model configuration to {config_path}")
    
    report_json_path = os.path.join(reports_dir, "disease_report.json")
    report_txt_path = os.path.join(reports_dir, "disease_report.txt")
    
    report_data = {
        "summary": {
            "test_accuracy": test_acc,
            "weighted_precision": float(prec),
            "weighted_recall": float(rec),
            "weighted_f1_score": float(f1)
        },
        "classification_report": cls_report,
        "confusion_matrix": cm
    }
    
    with open(report_json_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)
        
    with open(report_txt_path, "w", encoding="utf-8") as f:
        f.write("AgriMitra AI - Disease Detection Model Final Evaluation Report\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Training Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
        f.write(f"Class Count: {len(all_classes)}\n")
        f.write(f"Test Accuracy: {test_acc * 100:.2f}%\n")
        f.write(f"Precision:     {prec:.4f}\n")
        f.write(f"Recall:        {rec:.4f}\n")
        f.write(f"F1-Score:      {f1:.4f}\n\n")
        f.write("Classification Report per Disease Class:\n")
        f.write("-" * 60 + "\n")
        f.write(cls_report)
        
    logging.info(f"Saved reports to {reports_dir}")
    logging.info("TRAINING SUCCESSFULLY COMPLETED!")

if __name__ == "__main__":
    train_disease_model()
