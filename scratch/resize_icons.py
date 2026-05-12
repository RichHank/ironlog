import os
import shutil
from PIL import Image

def resize_icons():
    src_dir = 'public/icons'
    backup_dir = 'public/icons_original'
    
    if not os.path.exists(src_dir):
        print(f"Source directory {src_dir} does not exist.")
        return
        
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
        print(f"Created backup directory: {backup_dir}")
        
    # Determine the Lanczos filter
    try:
        resample_filter = Image.Resampling.LANCZOS
    except AttributeError:
        resample_filter = Image.LANCZOS

    for filename in os.listdir(src_dir):
        if not filename.endswith('.png'):
            continue
            
        src_path = os.path.join(src_dir, filename)
        backup_path = os.path.join(backup_dir, filename)
        
        # Backup original if not already backed up
        if not os.path.exists(backup_path):
            shutil.copy2(src_path, backup_path)
            print(f"Backed up {filename} to {backup_dir}")
        else:
            print(f"Backup already exists for {filename}, using existing backup to resize.")
            
        # Open backup (original) to do resizing to avoid losing quality from repeated runs
        with Image.open(backup_path) as img:
            # Check size
            orig_size = img.size
            orig_file_size = os.path.getsize(backup_path)
            
            # Resize to 128x128
            resized_img = img.resize((128, 128), resample=resample_filter)
            
            # Save optimized png
            resized_img.save(src_path, format='PNG', optimize=True)
            
            new_file_size = os.path.getsize(src_path)
            reduction = (orig_file_size - new_file_size) / orig_file_size * 100
            
            print(f"Resized {filename} from {orig_size} ({orig_file_size/1024:.1f} KB) -> 128x128 ({new_file_size/1024:.1f} KB) - Reduced by {reduction:.1f}%")

if __name__ == '__main__':
    resize_icons()
