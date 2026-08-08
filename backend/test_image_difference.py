import os
import hashlib
import time
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing import image
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

def compute_image_hash(filepath):
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        hasher.update(f.read())
    return hasher.hexdigest()

def compute_plant_health_score(disease_name: str, confidence: float, severity: str):
    is_healthy = "healthy" in disease_name.lower()
    if is_healthy:
        score = max(85, min(100, int(98 - (1.0 - confidence) * 10)))
        rating = "Healthy"
    else:
        sev = severity.lower()
        if sev in ["high", "critical", "severe"]:
            score = max(15, min(45, int(45 - confidence * 20)))
        elif sev in ["moderate", "medium"]:
            score = max(40, min(65, int(65 - confidence * 15)))
        else:
            score = max(60, min(79, int(78 - confidence * 12)))
        rating = "Moderate" if score >= 60 else ("Poor" if score >= 40 else "Critical")
    return score, rating

def test_image_difference():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "models", "disease_model_v1.keras")
    classes_path = os.path.join(base_dir, "models", "disease_classes.txt")
    dataset_dir = os.path.join(base_dir, "..", "datasets", "plant village", "PlantVillage", "train")
    rice_dir = os.path.join(base_dir, "..", "datasets", "rice leaf", "rice_leaf_diseases")

    print("=" * 80)
    print("MANDATORY CRITICAL SAME-RESULT TEST (IMAGE A vs IMAGE B vs IMAGE C)")
    print("Verifying fresh tensor preprocessing, non-cached model inference & dynamic outputs")
    print("=" * 80)

    if not os.path.exists(model_path):
        print(f"Error: Model file not found at {model_path}")
        return

    print("Loading disease model...")
    model = load_model(model_path)

    with open(classes_path, "r", encoding="utf-8") as f:
        classes = [line.strip() for line in f.readlines() if line.strip()]

    print(f"Model loaded with {len(classes)} classes.")

    # Gather 3 distinct image samples from different disease classes
    sample_images = []
    
    # 1. Try Rice Leaf image
    if os.path.exists(rice_dir):
        for root, dirs, files in os.walk(rice_dir):
            for f in files:
                if f.lower().endswith(('.jpg', '.png', '.jpeg')):
                    sample_images.append(("Rice Leaf Disease", os.path.join(root, f)))
                    break
            if len(sample_images) >= 1:
                break
                
    # 2. Pick 2 distinct PlantVillage classes
    pv_subdirs = [d for d in os.listdir(dataset_dir) if os.path.isdir(os.path.join(dataset_dir, d))]
    for cls_name in pv_subdirs[:10]:
        cls_dir = os.path.join(dataset_dir, cls_name)
        files = [f for f in os.listdir(cls_dir) if f.lower().endswith(('.jpg', '.png', '.jpeg'))]
        if files:
            sample_images.append((cls_name, os.path.join(cls_dir, files[0])))
        if len(sample_images) >= 3:
            break

    if len(sample_images) < 3:
        print("Error: Could not find 3 distinct image samples across dataset directories.")
        return

    test_samples = sample_images[:3] # Image A, Image B, Image C
    labels = ["Image A", "Image B", "Image C"]
    
    predictions = []
    hashes = []

    for i, (gt, img_path) in enumerate(test_samples):
        img_hash = compute_image_hash(img_path)
        hashes.append(img_hash)
        
        # Load fresh image, resize, convert to RGB numpy array
        img = image.load_img(img_path, target_size=(224, 224))
        x = image.img_to_array(img)
        x = np.expand_dims(x, axis=0) # 1 x 224 x 224 x 3
        x = preprocess_input(x) # MobileNetV2 preprocessing

        start_time = time.time()
        preds = model.predict(x, verbose=0)[0]
        latency = time.time() - start_time

        top1_idx = int(np.argmax(preds))
        confidence = float(preds[top1_idx])
        pred_label = classes[top1_idx]

        top3_idx = np.argsort(preds)[-3:][::-1]
        top3 = [(classes[j], float(preds[j])) for j in top3_idx]

        is_healthy = "healthy" in pred_label.lower()
        severity = "Low" if is_healthy else ("High" if confidence > 0.85 else "Moderate")
        health_score, rating = compute_plant_health_score(pred_label, confidence, severity)

        predictions.append(pred_label)

        print(f"\n[{labels[i]}] Filename: {os.path.basename(img_path)}")
        print(f"  Ground Truth: {gt}")
        print(f"  MD5 Hash:     {img_hash}")
        print(f"  Prediction:   {pred_label}")
        print(f"  Confidence:   {confidence * 100:.2f}%")
        print(f"  Health Score: {health_score}/100 ({rating})")
        print(f"  Severity:     {severity}")
        print(f"  Latency:      {latency:.4f}s")
        print(f"  Top-3 Predictions:")
        for rank, (c, p) in enumerate(top3, 1):
            print(f"    {rank}. {c[:35]:<35} ({p*100:.2f}%)")

    print("\n" + "=" * 80)
    print("CRITICAL SAME-RESULT VERIFICATION SUMMARY:")
    print(f"- MD5 Hashes Unique: {len(set(hashes))} / {len(hashes)}")
    print(f"- Predictions Unique: {len(set(predictions))} / {len(predictions)}")

    if len(set(hashes)) == 3 and len(set(predictions)) >= 2:
        print("[OK] SUCCESS: Verification passed! Images produce distinct, dynamic predictions.")
    elif len(set(predictions)) == 1:
        print("[FAIL] CRITICAL ERROR: All three images produced identical predictions! Investigate model/preprocessing.")
        exit(1)
    print("=" * 80 + "\n")

if __name__ == "__main__":
    test_image_difference()
