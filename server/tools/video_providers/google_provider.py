import os
import traceback
import asyncio
import base64
import aiofiles
from typing import Optional, Dict, Any, List
from nanoid import generate

from .video_base_provider import VideoProviderBase
from utils.http_client import HttpClient
from services.config_service import config_service, FILES_DIR


class GoogleVideoProvider(VideoProviderBase, provider_name="google"):
    """Google VEO video generation provider implementation"""

    def __init__(self):
        config = config_service.app_config.get('google', {})
        self.api_key = config.get("api_key", "")
        self.base_url = config.get("url", "https://generativelanguage.googleapis.com/v1beta").rstrip("/")

        if not self.api_key:
            raise ValueError("Google API key is not configured")
        if not self.base_url:
            raise ValueError("Google URL is not configured")

    def _build_api_url(self, model: str) -> str:
        """Build API URL for Google VEO Video Generation"""
        # VEO uses predictLongRunning endpoint (official API)
        return f"{self.base_url}/models/{model}:predictLongRunning"

    def _build_headers(self) -> Dict[str, str]:
        """Build request headers for VEO API"""
        return {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json",
        }

    def _map_resolution(self, resolution: str) -> str:
        """Map resolution string to VEO format"""
        # VEO 3.1 supports 720p and 1080p (8 seconds only for 1080p)
        resolution_map = {
            "480p": "720p",  # Round up to 720p
            "720p": "720p", 
            "1080p": "1080p",
        }
        return resolution_map.get(resolution, "720p")

    def _map_aspect_ratio(self, aspect_ratio: str) -> str:
        """Map aspect ratio to VEO format (only 16:9 and 9:16 supported)"""
        aspect_ratio_map = {
            "1:1": "16:9",    # Default to 16:9
            "16:9": "16:9",
            "9:16": "9:16",
            "4:3": "16:9",    # Round to 16:9
            "3:4": "9:16",    # Round to 9:16
            "21:9": "16:9",   # Round to 16:9
        }
        return aspect_ratio_map.get(aspect_ratio, "16:9")
    
    def _map_duration(self, duration: int) -> int:
        """Map duration to VEO format (4, 6, or 8 seconds)"""
        if duration <= 4:
            return 4
        elif duration <= 6:
            return 6
        else:
            return 8

    def _build_request_payload(
        self,
        prompt: str,
        resolution: str = "720p",
        duration: int = 8,
        aspect_ratio: str = "16:9",
        input_image_data: Optional[str] = None,
        input_image_mime_type: Optional[str] = None,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Build request payload for Google VEO API according to official docs"""
        
        # VEO uses "instances" + "parameters" format
        # instances: contains prompt (and optionally image)
        # parameters: contains generation settings
        
        instance: Dict[str, Any] = {
            "prompt": prompt
        }
        
        # Add input image if provided (for image-to-video)
        if input_image_data:
            instance["image"] = {
                "bytesBase64Encoded": input_image_data,
                "mimeType": input_image_mime_type or "image/jpeg"
            }

        # Build parameters object (separate from instances)
        parameters: Dict[str, Any] = {
            "aspectRatio": self._map_aspect_ratio(aspect_ratio),
            "resolution": self._map_resolution(resolution),
            "durationSeconds": self._map_duration(duration)
        }

        return {
            "instances": [instance],
            "parameters": parameters
        }

    async def _save_base64_video(self, video_base64: str, mime_type: str) -> str:
        """Save base64 encoded video to a temporary file and return file path"""
        # Determine extension from mime type
        extension = "mp4"  # default
        if "webm" in mime_type:
            extension = "webm"
        elif "mov" in mime_type:
            extension = "mov"
        
        # Generate temporary file name
        temp_id = "temp_veo_" + generate(size=12)
        temp_file_path = os.path.join(FILES_DIR, f"{temp_id}.{extension}")
        
        # Decode and save video data
        try:
            video_bytes = base64.b64decode(video_base64)
            async with aiofiles.open(temp_file_path, "wb") as f:
                await f.write(video_bytes)
            
            print(f"🎥 Saved Google VEO video to temporary file: {temp_file_path}")
            # Return as file:// URL so it can be processed by existing infrastructure
            return f"file://{temp_file_path}"
        except Exception as e:
            print(f"🎥 Error saving base64 video: {str(e)}")
            raise e

    async def _poll_operation(self, operation_name: str) -> str:
        """Poll operation status until completion"""
        
        poll_url = f"{self.base_url}/{operation_name}"
        headers = self._build_headers()
        
        async with HttpClient.create_aiohttp() as session:
            while True:
                print(f"🎥 Polling Google VEO generation, operation: {operation_name}...")
                await asyncio.sleep(10)  # VEO generation takes longer, wait 10 seconds
                
                async with session.get(poll_url, headers=headers) as poll_response:
                    poll_res = await poll_response.json()
                    
                    print(f"🎥 Poll response: {poll_res}")  # Debug log
                    
                    # Check if operation is done
                    if poll_res.get("done", False):
                        # Check for error
                        if "error" in poll_res:
                            error = poll_res["error"]
                            raise Exception(f"Google VEO generation failed: {error.get('message', 'Unknown error')}")
                        
                        # Extract video URI from response (official format)
                        # response.generateVideoResponse.generatedSamples[0].video.uri
                        response = poll_res.get("response", {})
                        
                        if "generateVideoResponse" in response:
                            gen_response = response["generateVideoResponse"]
                            if "generatedSamples" in gen_response and len(gen_response["generatedSamples"]) > 0:
                                sample = gen_response["generatedSamples"][0]
                                if "video" in sample and "uri" in sample["video"]:
                                    video_uri = sample["video"]["uri"]
                                    print(f"🎥 Got video URI: {video_uri}")
                                    return video_uri
                        
                        raise Exception(f"No video URI found in response: {response}")
    
    async def _download_video_from_uri(self, video_uri: str) -> str:
        """Download video from Google's URI and save to temp file"""
        headers = self._build_headers()
        
        print(f"🎥 Downloading video from URI: {video_uri}")
        
        async with HttpClient.create_aiohttp() as session:
            # Follow redirects (-L flag in curl)
            async with session.get(video_uri, headers=headers, allow_redirects=True) as response:
                if response.status != 200:
                    raise Exception(f"Failed to download video: HTTP {response.status}")
                
                video_content = await response.read()
                
                # Save to temporary file
                temp_id = "temp_veo_" + generate(size=12)
                temp_file_path = os.path.join(FILES_DIR, f"{temp_id}.mp4")
                
                async with aiofiles.open(temp_file_path, "wb") as f:
                    await f.write(video_content)
                
                print(f"🎥 Video downloaded and saved: {temp_file_path}")
                return f"file://{temp_file_path}"

    async def generate(
        self,
        prompt: str,
        model: str,
        resolution: str = "720p",
        duration: int = 8,
        aspect_ratio: str = "16:9",
        input_images: Optional[List[str]] = None,
        camera_fixed: bool = True,
        **kwargs: Any
    ) -> str:
        """
        Generate video using Google VEO API

        Returns:
            str: Video data URL (base64 encoded)
        """
        try:
            # Map to correct VEO model name
            # Official model name: veo-3.1-generate-preview
            model_name_map = {
                "veo-3": "veo-3.1-generate-preview",
                "veo-3.1": "veo-3.1-generate-preview",
                "veo-3-fast": "veo-3-fast-generate-preview",
            }
            
            if not model or "veo" not in model.lower():
                model = "veo-3.1-generate-preview"  # Official VEO 3.1 model name
            elif model in model_name_map:
                model = model_name_map[model]
            
            api_url = self._build_api_url(model)
            headers = self._build_headers()
            
            print(f"🎥 Calling VEO API URL: {api_url}")  # Debug log

            # Use the first input image if provided (already processed as base64 data URL)
            input_image_data = None
            input_image_mime_type = None
            if input_images and len(input_images) > 0:
                # Extract base64 data and mime type from data URL (format: "data:image/xxx;base64,...")
                data_url = input_images[0]
                if data_url and data_url.startswith('data:'):
                    # Extract mime type and base64 data
                    # Format: data:image/jpeg;base64,/9j/4AAQ...
                    header, _, base64_data = data_url.partition(',')
                    if base64_data:
                        input_image_data = base64_data
                        # Extract mime type from header (e.g., "data:image/jpeg;base64" -> "image/jpeg")
                        mime_part = header.split(':')[1].split(';')[0] if ':' in header else "image/jpeg"
                        input_image_mime_type = mime_part
                    else:
                        input_image_data = data_url
                        input_image_mime_type = "image/jpeg"
                else:
                    input_image_data = data_url
                    input_image_mime_type = "image/jpeg"

            # Build request payload
            payload = self._build_request_payload(
                prompt=prompt,
                resolution=resolution,
                duration=duration,
                aspect_ratio=aspect_ratio,
                input_image_data=input_image_data,
                input_image_mime_type=input_image_mime_type,
                **kwargs
            )

            print(f"🎥 Starting Google VEO video generation with model: {model}")

            # Make API request to create generation task
            async with HttpClient.create_aiohttp() as session:
                async with session.post(api_url, headers=headers, json=payload) as response:
                    if response.status != 200:
                        try:
                            error_data = await response.json()
                            error_message = error_data.get("error", {}).get("message", f"HTTP {response.status}")
                        except Exception:
                            error_message = f"HTTP {response.status}"
                        raise Exception(f"Google VEO task creation failed: {error_message}")

                    result = await response.json()
                    
                    print(f"🎥 VEO API Response: {result}")
                    
                    # Check if we have an operation name (long-running operation - typical for VEO)
                    operation_name = result.get("name")
                    
                    if operation_name:
                        print(f"🎥 Google VEO video generation task created, operation: {operation_name}")
                        # Poll for completion to get video URI
                        video_uri = await self._poll_operation(operation_name)
                        # Download the video from URI
                        video_file_url = await self._download_video_from_uri(video_uri)
                        print(f"🎥 Google VEO video generation completed")
                        return video_file_url
                    else:
                        # Immediate response (unusual for VEO, but handle it)
                        if "videoUrl" in result:
                            return result["videoUrl"]
                        
                        if "video" in result and "bytesBase64Encoded" in result["video"]:
                            return await self._save_base64_video(
                                result["video"]["bytesBase64Encoded"],
                                "video/mp4"
                            )
                        
                        raise Exception(f"Unexpected VEO response format: {result}")

        except Exception as e:
            print(f"🎥 Error generating video with Google VEO: {str(e)}")
            traceback.print_exc()
            raise e

