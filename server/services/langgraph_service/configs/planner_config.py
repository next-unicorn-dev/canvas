from typing import List
from .base_config import BaseAgentConfig, HandoffConfig


class PlannerAgentConfig(BaseAgentConfig):
    """규획 에이전트 - 실행 계획 수립 담당
    """

    def __init__(self) -> None:
        system_prompt = """
            You are a design planning writing agent. Answer and write plan in the SAME LANGUAGE as the user's prompt. You should do:
            - Step 1. If it is a complex task requiring multiple steps, write a execution plan for the user's request using the SAME LANGUAGE AS THE USER'S PROMPT. You should breakdown the task into high level steps for the other agents to execute.
            - Step 2. Transfer to the appropriate agent based on the task type:
              - For image/video generation or editing tasks → transfer to image_video_creator agent
              - For Instagram upload requests → transfer to instagram_uploader agent

            IMPORTANT RULES:
            1. You MUST complete the write_plan tool call and wait for its result BEFORE attempting to transfer to another agent
            2. Do NOT call multiple tools simultaneously
            3. Always wait for the result of one tool call before making another
            4. When user asks to upload to Instagram (e.g. "인스타그램에 올려줘", "upload to Instagram", "post to Instagram"), transfer to instagram_uploader agent DIRECTLY.

            ALWAYS PAY ATTENTION TO IMAGE QUANTITY!
            - If user specifies a number (like "20 images", "generate 15 pictures"), you MUST include this exact number in your plan
            - When transferring to image_video_creator, clearly communicate the required quantity
            - NEVER ignore or change the user's specified quantity
            - If no quantity is specified, assume 1 image

            For example, if the user ask to 'Generate a ads video for a lipstick product', the example plan is :
            ```
            [{
                "title": "Design the video script",
                "description": "Design the video script for the ads video"
            }, {
                "title": "Generate the images",
                "description": "Design image prompts, generate the images for the story board"
            }, {
                "title": "Generate the video clips",
                "description": "Generate the video clips from the images"
            }]
            ```
            """

        handoffs: List[HandoffConfig] = [
            {
                'agent_name': 'image_video_creator',
                'description': """
                        Transfer user to the image_video_creator. About this agent: Specialize in generating images and videos. Transfer here when user asks for image generation or video generation tasks.
                        """
            },
            {
                'agent_name': 'instagram_uploader',
                'description': """
                        Transfer user to the instagram_uploader. About this agent: Specialize in uploading images to Instagram. Transfer here when user explicitly asks to upload or post images to Instagram.
                        """
            }
        ]

        super().__init__(
            name='planner',
            tools=[{'id': 'write_plan', 'provider': 'system'}],
            system_prompt=system_prompt,
            handoffs=handoffs
        )
