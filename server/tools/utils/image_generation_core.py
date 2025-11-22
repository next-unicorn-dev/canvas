"""
Image generation core module
Contains the main orchestration logic for image generation across different providers
"""

from typing import Optional, Dict, Any, List
import asyncio
from common import DEFAULT_PORT
from tools.utils.image_utils import process_input_image
from ..image_providers.image_base_provider import ImageProviderBase

# 导入所有提供商以确保自动注册 (不要删除这些导入)
from ..image_providers.openai_provider import OpenAIImageProvider
from ..image_providers.replicate_provider import ReplicateImageProvider
from ..image_providers.volces_provider import VolcesProvider
from ..image_providers.wavespeed_provider import WavespeedProvider
from ..image_providers.google_provider import GoogleImageProvider

# from ..image_providers.comfyui_provider import ComfyUIProvider
from .image_canvas_utils import (
    save_image_to_canvas,
)
import time

IMAGE_PROVIDERS: dict[str, ImageProviderBase] = {
    "openai": OpenAIImageProvider(),
    "replicate": ReplicateImageProvider(),
    "volces": VolcesProvider(),
    "wavespeed": WavespeedProvider(),
    "google": GoogleImageProvider(),
}


async def generate_image_with_provider(
    canvas_id: str,
    session_id: str,
    provider: str,
    model: str,
    # image generator args
    prompt: str,
    aspect_ratio: str = "1:1",
    input_images: Optional[list[str]] = None,
) -> str:
    """
    通用图像生成函数，支持不同的模型和提供商

    Args:
        prompt: 图像生成提示词
        aspect_ratio: 图像长宽比
        model_name: 内部模型名称 (如 'gpt-image-1', 'imagen-4')
        model: 模型标识符 (如 'openai/gpt-image-1', 'google/imagen-4')
        tool_call_id: 工具调用ID
        config: 上下文运行配置，包含canvas_id，session_id，model_info，由langgraph注入
        input_images: 可选的输入参考图像列表

    Returns:
        str: 生成结果消息
    """

    provider_instance = IMAGE_PROVIDERS.get(provider)
    if not provider_instance:
        raise ValueError(f"Unknown provider: {provider}")

    # Process input images for the provider
    processed_input_images: list[str] | None = None
    if input_images:
        processed_input_images = []
        for image_path in input_images:
            processed_image = await process_input_image(image_path)
            if processed_image:
                processed_input_images.append(processed_image)

        print(f"Using {len(processed_input_images)} input images for generation")

    # Prepare metadata with all generation parameters
    metadata: Dict[str, Any] = {
        "prompt": prompt,
        "model": model,
        "provider": provider,
        "aspect_ratio": aspect_ratio,
        "input_images": input_images or [],
    }

    # Generate image using the selected provider
    mime_type, width, height, filename = await provider_instance.generate(
        prompt=prompt,
        model=model,
        aspect_ratio=aspect_ratio,
        input_images=processed_input_images,
        metadata=metadata,
    )

    # Save image to canvas
    image_url = await save_image_to_canvas(
        session_id, canvas_id, filename, mime_type, width, height
    )

    return f"image generated successfully ![image_id: {filename}](http://localhost:{DEFAULT_PORT}{image_url})"


async def generate_multiple_images_parallel(
    canvas_id: str,
    session_id: str,
    provider: str,
    model: str,
    prompt: str,
    aspect_ratio: str = "1:1",
    input_images: Optional[list[str]] = None,
    num_images: int = 1,
) -> str:
    """
    Generate multiple images in parallel for faster processing
    
    Args:
        canvas_id: Canvas identifier
        session_id: Session identifier
        provider: Provider name
        model: Model name
        prompt: Image generation prompt
        aspect_ratio: Image aspect ratio
        input_images: Optional input images
        num_images: Number of images to generate in parallel
    
    Returns:
        str: Combined result message with all generated images
    """
    if num_images <= 1:
        # If only one image, use the regular function
        return await generate_image_with_provider(
            canvas_id=canvas_id,
            session_id=session_id,
            provider=provider,
            model=model,
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            input_images=input_images,
        )
    
    # Generate multiple images in parallel
    tasks = [
        generate_image_with_provider(
            canvas_id=canvas_id,
            session_id=session_id,
            provider=provider,
            model=model,
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            input_images=input_images,
        )
        for _ in range(num_images)
    ]
    
    # Execute all tasks in parallel
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Combine results
    success_results = []
    error_count = 0
    
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            error_count += 1
            print(f"❌ Error generating image {i+1}/{num_images}: {result}")
        else:
            success_results.append(result)
    
    if success_results:
        combined_result = "\n\n".join(success_results)
        if error_count > 0:
            combined_result += f"\n\n⚠️ {error_count} out of {num_images} images failed to generate."
        return combined_result
    else:
        raise Exception(f"All {num_images} image generation attempts failed")
