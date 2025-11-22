from typing import Annotated
from langchain_core.tools import tool, InjectedToolCallId  # type: ignore
from langchain_core.runnables import RunnableConfig
from tools.utils.image_generation_core import generate_multiple_images_parallel
from pydantic import BaseModel, Field


class GenerateImageByNanobananaInputSchema(BaseModel):
    prompt: str = Field(
        description="Required. The prompt for image generation. If you want to edit or create variations of an image, describe what you want in detail."
    )
    aspect_ratio: str = Field(
        description="Required. Aspect ratio of the image, only these values are allowed: 1:1, 16:9, 4:3, 3:4, 9:16. Choose the best fitting aspect ratio according to the prompt. Best ratio for posters is 3:4"
    )
    input_images: list[str] | None = Field(
        default=None,
        description="Optional; Image(s) to use as reference for generation. Supports multiple images, e.g. ['im_abc123.png', 'im_xyz789.png']. Best for: Creating variations of existing images, Image editing tasks, Maintaining visual style or elements, Combining multiple references, etc."
    )
    num_images: int = Field(
        default=1,
        ge=1,
        le=8,
        description="Optional; Number of images to generate in parallel (1-8). Default is 1. Generating multiple images in parallel is faster than generating them sequentially. Recommended: 2-4 for best performance, up to 8 for maximum parallelization."
    )
    tool_call_id: Annotated[str, InjectedToolCallId]


@tool("generate_image_by_nanobanana_google",
      description="Generate one or more images by Google Nanobanana (Gemini 2.5 Flash Image) model using text prompt. This is Google's high-quality image generation and editing model that SUPPORTS input images for reference and editing. You can provide reference images to create variations, edits, or style transfers. When generating multiple images, they are processed in parallel for faster results.",
      args_schema=GenerateImageByNanobananaInputSchema)
async def generate_image_by_nanobanana_google(
    prompt: str,
    aspect_ratio: str,
    config: RunnableConfig,
    tool_call_id: Annotated[str, InjectedToolCallId],
    input_images: list[str] | None = None,
    num_images: int = 1,
) -> str:
    """
    Generate one or more images using Google Nanobanana (Gemini 2.5 Flash Image) model
    
    Args:
        prompt: Image generation prompt
        aspect_ratio: Image aspect ratio (1:1, 16:9, 4:3, 3:4, 9:16)
        config: Runtime configuration with canvas_id and session_id
        tool_call_id: Injected tool call identifier
        input_images: Optional list of input image file IDs for reference
        num_images: Number of images to generate in parallel (1-8)
    
    Returns:
        str: Generation result message with all generated images
    """
    ctx = config.get('configurable', {})
    canvas_id = ctx.get('canvas_id', '')
    session_id = ctx.get('session_id', '')
    return await generate_multiple_images_parallel(
        canvas_id=canvas_id,
        session_id=session_id,
        provider='google',
        model="gemini-2.5-flash-image",
        prompt=prompt,
        aspect_ratio=aspect_ratio,
        input_images=input_images,
        num_images=num_images,
    )


# Export the tool for easy import
__all__ = ["generate_image_by_nanobanana_google"]

