from typing import Optional
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from services.instagram_service import instagram_service
from services.s3_service import s3_service
from services.config_service import FILES_DIR
from services.db_service import db_service
from services.database.connection import get_db_session
from services.database.models import InstagramToken
from sqlalchemy import select
import os

class UploadToInstagramInput(BaseModel):
    image_url: str = Field(description="The URL or local path of the image to upload. If it's a local file, it will be uploaded to S3 first.")
    caption: str = Field(description="The caption for the Instagram post.")
    hashtags: Optional[str] = Field(None, description="Optional hashtags for the post.")

@tool("upload_to_instagram", args_schema=UploadToInstagramInput)
async def upload_to_instagram(image_url: str, caption: str, hashtags: Optional[str] = None) -> str:
    """Uploads an image to Instagram with a caption. Use this tool when user explicitly asks to upload/post the generated or selected image to Instagram."""
    print(f"📸 Tool called: upload_to_instagram with image={image_url}")
    try:
        # 1. Handle Local File -> S3 Upload
        if "localhost" in image_url or "127.0.0.1" in image_url or not image_url.startswith("http"):
            # It's likely a local file
            filename = os.path.basename(image_url)
            if "?" in filename:
                filename = filename.split("?")[0]
                
            # If it's a full path, use it. If it's just a filename or relative, try to find it in FILES_DIR
            if os.path.exists(image_url):
                 file_path = image_url
            else:
                 file_path = os.path.join(FILES_DIR, filename)
            
            if os.path.exists(file_path):
                if s3_service.enabled:
                    print(f"Uploading local file to S3: {file_path}")
                    s3_url = s3_service.upload_file(file_path)
                    if s3_url:
                        image_url = s3_url
                        print(f"✅ Uploaded to S3: {s3_url}")
                    else:
                        return "Failed to upload local image to S3. Please check S3 configuration."
                else:
                    return "AWS S3 is not configured. Cannot upload local image to Instagram. Please configure AWS credentials in .env file."
            else:
                print(f"⚠️ Local file not found: {file_path}")
                if "localhost" in image_url or "127.0.0.1" in image_url:
                     return f"Local file not found at {file_path}. Cannot upload localhost URL to Instagram."


        # 2. Find a user with Instagram token
        user_id = None
        async with get_db_session() as session:
            stmt = select(InstagramToken.user_id).limit(1)
            result = await session.execute(stmt)
            row = result.first()
            if row:
                user_id = row[0]
        
        if not user_id:
            return "No Instagram account connected. Please connect Instagram in Settings first."

        # 3. Combine caption and hashtags
        final_caption = caption
        if hashtags:
            tags = " ".join(
                tag if tag.startswith("#") else f"#{tag}"
                for tag in hashtags.split()
            )
            final_caption = f"{caption}\n\n{tags}" if caption else tags

        # 4. Upload to Instagram
        await instagram_service.upload_image(
            user_id=user_id,
            image_url=image_url,
            caption=final_caption,
        )
        
        return f"Successfully uploaded image to Instagram! Image: {image_url}"

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ Error uploading to Instagram: {str(e)}")
        return f"Error uploading to Instagram: {str(e)}"

