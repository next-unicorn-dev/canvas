import os
import traceback
from typing import Optional, Any
from .image_base_provider import ImageProviderBase
from ..utils.image_utils import get_image_info_and_save, generate_image_id
from services.config_service import FILES_DIR
from utils.http_client import HttpClient
from services.config_service import config_service


class GoogleImageProvider(ImageProviderBase):
    """Google Gemini API image generation provider implementation for Gemini models (e.g., Gemini 2.5 Flash Image, Gemini 3 Pro Image Preview)"""

    def _build_url(self, model: str, base_url: str, api_key: str) -> str:
        """Build request URL for Google Gemini API"""
        return f"{base_url}/models/{model}:generateContent?key={api_key}"

    def _build_headers(self) -> dict[str, str]:
        """Build request headers"""
        return {
            "Content-Type": "application/json",
        }

    async def _make_request(self, url: str, headers: dict[str, str], data: dict[str, Any]) -> dict[str, Any]:
        """
        Send HTTP request and handle response

        Returns:
            dict[str, Any]: Response data from Google Gemini API
        """
        async with HttpClient.create_aiohttp() as session:
            print(f'🌈 Google Gemini API request: {url}')
            async with session.post(url, headers=headers, json=data) as response:
                json_data = await response.json()
                print('🌈 Google Gemini API response', json_data)
                return json_data

    async def _process_response(self, res: dict[str, Any]) -> tuple[str, int, int, str]:
        """
        Process Google Gemini API response and save image

        Args:
            res: Response data from Google Gemini API

        Returns:
            tuple[str, int, int, str]: (mime_type, width, height, filename)
        """
        candidates = res.get('candidates', [])
        if not candidates:
            error_msg = res.get("error", {}).get("message", "No candidates returned")
            raise Exception(f'Google image generation failed: {error_msg}')
        
        content = candidates[0].get('content', {})
        parts = content.get('parts', [])
        
        # Look for inline_data (base64 image)
        image_data = None
        for part in parts:
            if 'inlineData' in part:
                image_data = part['inlineData']['data']
                break
        
        if not image_data:
            raise Exception('Google image generation failed: no image data found in response')
        
        image_id = generate_image_id()
        mime_type, width, height, extension = await get_image_info_and_save(
            image_data, os.path.join(FILES_DIR, f'{image_id}'), is_b64=True
        )

        filename = f'{image_id}.{extension}'
        return mime_type, width, height, filename

    async def generate(
        self,
        prompt: str,
        model: str,
        aspect_ratio: str = "1:1",
        input_images: Optional[list[str]] = None,
        metadata: Optional[dict[str, Any]] = None,
        **kwargs: Any
    ) -> tuple[str, int, int, str]:
        """
        Generate image using Google Vertex AI API

        Args:
            prompt: Image generation prompt
            model: Model name to use for generation (e.g., "gemini-2.5-flash-image", "gemini-3-pro-image-preview")
            aspect_ratio: Image aspect ratio. Supported ratios vary by model: Gemini 2.5 Flash Image supports 1:1, 16:9, 4:3, 3:4, 9:16. Gemini 3 Pro Image Preview supports 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
            input_images: Optional input images for reference or editing
            **kwargs: Additional provider-specific parameters (project_id, location)

        Returns:
            tuple[str, int, int, str]: (mime_type, width, height, filename)
        """
        try:
            config = config_service.app_config.get('google', {})
            api_key = config.get("api_key", "")
            base_url = config.get("url", "https://generativelanguage.googleapis.com/v1beta")

            if not api_key:
                raise ValueError("Google API key is not configured")

            url = self._build_url(model, base_url, api_key)
            headers = self._build_headers()

            # Build request data for Gemini API
            parts = []
            
            # Add input images if provided (Gemini supports base64 images)
            if input_images:
                for img_data in input_images:
                    if img_data:
                        # If it's already a data URL, extract the base64 part
                        if img_data.startswith('data:image'):
                            parts.append({
                                "inline_data": {
                                    "mime_type": img_data.split(';')[0].split(':')[1],
                                    "data": img_data.split(',', 1)[1]
                                }
                            })
                        else:
                            # Assume it's already base64
                            parts.append({
                                "inline_data": {
                                    "mime_type": "image/png",
                                    "data": img_data
                                }
                            })
                print(f"✨ Google Provider: Added {len(input_images)} input image(s) to request")
            
            # Add text prompt
            parts.append({
                "text": f"Generate an image with aspect ratio {aspect_ratio}: {prompt}"
            })
            
            data = {
                "contents": [{
                    "parts": parts
                }],
                "generationConfig": {
                    "temperature": 1.0,
                    "responseModalities": ["image"]
                }
            }

            # Make request
            res = await self._make_request(url, headers, data)

            # Process response and return result
            return await self._process_response(res)

        except Exception as e:
            print('Error generating image with Google Vertex AI:', e)
            traceback.print_exc()
            raise e

