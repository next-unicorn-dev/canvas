from typing import Annotated
from pydantic import BaseModel, Field
from langchain_core.tools import tool, InjectedToolCallId  # type: ignore
from langchain_core.runnables import RunnableConfig
from tools.video_generation.video_generation_core import generate_video_with_provider
from .utils.image_utils import process_input_image


class GenerateVideoByVeo3InputSchema(BaseModel):
    prompt: str = Field(
        description="Required. The prompt for video generation. Describe what you want to see in the video."
    )
    resolution: str = Field(
        default="720p",
        description="Optional. The resolution of the video. Use 720p if not explicitly specified by user. Allowed values: 480p, 720p, 1080p."
    )
    duration: int = Field(
        default=8,
        description="Optional. The duration of the video in seconds. Use 8 by default. VEO 3 supports up to 8 seconds."
    )
    aspect_ratio: str = Field(
        default="16:9",
        description="Optional. The aspect ratio of the video. Allowed values: 1:1, 16:9, 9:16, 4:3, 3:4, 21:9"
    )
    input_images: list[str] | None = Field(
        default=None,
        description="Optional. Images to use as reference. Pass a list of image_id here, e.g. ['im_jurheut7.png']."
    )
    tool_call_id: Annotated[str, InjectedToolCallId]


@tool("generate_video_by_veo3_google",
      description="Generate high-quality videos using Google VEO 3 model. VEO 3 produces cinematic 8-second videos with native audio generation capabilities. Supports text-to-video and image-to-video generation.",
      args_schema=GenerateVideoByVeo3InputSchema)
async def generate_video_by_veo3_google(
    prompt: str,
    config: RunnableConfig,
    tool_call_id: Annotated[str, InjectedToolCallId],
    resolution: str = "720p",
    duration: int = 8,
    aspect_ratio: str = "16:9",
    input_images: list[str] | None = None,
) -> str:
    """
    Generate a video using Google VEO 3 model
    """

    # Process input images if provided
    processed_input_images = None
    if input_images and len(input_images) > 0:
        # Only process the first image for VEO 3
        first_image = input_images[0]
        processed_image = await process_input_image(first_image)
        if processed_image:
            processed_input_images = [processed_image]
            print(f"Using input image for video generation: {first_image}")
        else:
            raise ValueError(
                f"Failed to process input image: {first_image}. Please check if the image exists and is valid.")

    return await generate_video_with_provider(
        prompt=prompt,
        resolution=resolution,
        duration=duration,
        aspect_ratio=aspect_ratio,
        model="veo-3",
        tool_call_id=tool_call_id,
        config=config,
        input_images=processed_input_images,
        camera_fixed=False,  # VEO 3 has dynamic camera movement
    )


# Export the tool for easy import
__all__ = ["generate_video_by_veo3_google"]

