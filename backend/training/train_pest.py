import os
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
import logging
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def train_pest_model():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(base_dir, "..", "datasets", "pest_images")
    train_dir = os.path.join(dataset_dir, "train")
    val_dir = os.path.join(dataset_dir, "val")
    model_save_path = os.path.join(base_dir, "models", "pest_model_v1.keras")
    class_names_path = os.path.join(base_dir, "models", "pest_classes.txt")
    reports_dir = os.path.join(base_dir, "reports")
    report_save_path = os.path.join(reports_dir, "pest_report_v1.txt")
    
    if not os.path.exists(reports_dir):
        os.makedirs(reports_dir)
        
    if not os.path.exists(train_dir):
        logging.error(f"Dataset not found at {train_dir}")
        return

    logging.info("Loading pest dataset...")
    
    train_ds = tf.keras.preprocessing.image_dataset_from_directory(
        train_dir,
        seed=123,
        image_size=(224, 224),
        batch_size=32
    )

    val_ds = tf.keras.preprocessing.image_dataset_from_directory(
        val_dir,
        seed=123,
        image_size=(224, 224),
        batch_size=32
    )

    class_names = train_ds.class_names
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    with open(class_names_path, "w") as f:
        for name in class_names:
            f.write(name + "\n")
            
    logging.info("Building EfficientNetB0 model...")
    base_model = EfficientNetB0(input_shape=(224, 224, 3), include_top=False, weights='imagenet')
    base_model.trainable = False 
    
    model = models.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.2),
        layers.Dense(len(class_names), activation='softmax')
    ])

    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])
                  
    logging.info("Training Pest Detection model...")
    callbacks = [
        EarlyStopping(patience=3, restore_best_weights=True)
    ]
    
    model.fit(train_ds, validation_data=val_ds, epochs=2, callbacks=callbacks)

    logging.info("Saving model...")
    model.save(model_save_path)
    
    logging.info("Generating evaluation report...")
    y_true = []
    y_pred = []
    for x, y in val_ds:
        preds = model.predict(x, verbose=0)
        y_true.extend(y.numpy())
        y_pred.extend(np.argmax(preds, axis=-1))
        
    report = classification_report(y_true, y_pred, target_names=class_names)
    
    with open(report_save_path, "w") as f:
        f.write("Pest Detection Model Evaluation Report (v1)\n")
        f.write("="*50 + "\n\n")
        f.write(report)
        
    logging.info(f"Model saved to {model_save_path}")

if __name__ == "__main__":
    train_pest_model()
