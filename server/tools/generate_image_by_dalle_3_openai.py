from typing import Annotated
from langchain_core.tools import tool, InjectedToolCallId  # type: ignore
from langchain_core.runnables import RunnableConfig
from tools.utils.image_generation_core import generate_image_with_provider
from pydantic import BaseModel, Field


class GenerateImageByDalle3InputSchema(BaseModel):
    prompt: str = Field(
        description="Required. The prompt for image generation. Describe what you want to create in detail."
    )
    aspect_ratio: str = Field(
        description="Required. Aspect ratio of the image, only these values are allowed: 1:1, 16:9, 9:16. Choose the best fitting aspect ratio according to the prompt."
    )
    tool_call_id: Annotated[str, InjectedToolCallId]


@tool("generate_image_by_dalle_3_openai",
      description="Generate an image by OpenAI DALL-E 3 model using text prompt. This is a high-quality image generation model from OpenAI. This model does NOT support input images for reference or editing.",
      args_schema=GenerateImageByDalle3InputSchema)
async def generate_image_by_dalle_3_openai(
    prompt: str,
    aspect_ratio: str,
    config: RunnableConfig,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> str:
    """
    Generate an image using OpenAI DALL-E 3 model
    """
    ctx = config.get('configurable', {})
    canvas_id = ctx.get('canvas_id', '')
    session_id = ctx.get('session_id', '')
    return await generate_image_with_provider(
        canvas_id=canvas_id,
        session_id=session_id,
        provider='openai',
        model="dall-e-3",
        prompt=prompt,
        aspect_ratio=aspect_ratio,
        input_images=None,
    )


# Export the tool for easy import
__all__ = ["generate_image_by_dalle_3_openai"]

