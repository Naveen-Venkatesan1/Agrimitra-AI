import io
import logging
import numpy as np
from PIL import Image

def validate_image(image_bytes: bytes) -> dict:
    """
    Validates that the provided bytes represent a usable plant/crop leaf image.
    Performs checks: valid format, resolution, file size, and plant foliage presence.
    Returns:
        dict: {"is_valid": bool, "error": str, "image": PIL.Image}
    """
    try:
        if not image_bytes:
            return {"is_valid": False, "error": "Image file is empty."}
            
        # 1. File size check
        size_kb = len(image_bytes) / 1024
        if size_kb < 5:
            return {"is_valid": False, "error": "Image file is too small (under 5KB). Please upload a clear photo."}
        if size_kb > 15000:
            return {"is_valid": False, "error": "Image file is too large (over 15MB). Please compress the photo."}

        # 2. Decode check
        image = Image.open(io.BytesIO(image_bytes))
        image.load()  # verify format and decode pixel data in single pass
        
        # 3. Resolution check
        width, height = image.size
        if width < 150 or height < 150:
            return {"is_valid": False, "error": f"Image resolution ({width}x{height}) is too low. Please upload a clearer photo."}
            
        # Convert to RGB
        if image.mode not in ('RGB', 'L'):
            image = image.convert('RGB')

        # 4. Green Foliage & Plant Leaf Tissue Presence Validation
        img_rgb = image.convert('RGB').resize((150, 150))
        img_arr = np.array(img_rgb, dtype=np.float32)

        r = img_arr[:, :, 0]
        g = img_arr[:, :, 1]
        b = img_arr[:, :, 2]

        # Plant foliage mask: Green leaf tissue (G > R and G > B) OR chlorotic yellow/brown leaf tissue (R > B and G > B)
        is_green = (g > r * 0.95) & (g > b * 1.05)
        is_yellow_brown = (r > b * 1.1) & (g > b * 1.05) & (g > 40)
        
        plant_mask = is_green | is_yellow_brown
        total_pixels = 150 * 150
        plant_pixels = int(np.sum(plant_mask))
        plant_ratio = float(plant_pixels) / total_pixels

        # Non-leaf / Non-plant rejection (e.g. blue sky, solid grey walls, furniture, cars)
        if plant_ratio < 0.15:
            logging.warning(f"Non-leaf photo rejected (plant ratio: {plant_ratio:.3f}).")
            return {
                "is_valid": False,
                "error": "Unable to detect a crop leaf in the photo. Please upload a clear close-up image of your plant or leaf."
            }

        return {"is_valid": True, "error": None, "image": image}
        
    except Exception as e:
        logging.warning(f"Image validation failed: {str(e)}")
        return {"is_valid": False, "error": "Invalid image format. Please upload a standard JPG or PNG photo."}
