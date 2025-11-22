# services/magic_service.py

# Import necessary modules
import asyncio
import json
from typing import Dict, Any, List

# Import service modules
from services.db_service import db_service
from services.websocket_service import send_to_websocket  # type: ignore
from services.stream_service import add_stream_task, remove_stream_task


async def handle_magic(data: Dict[str, Any]) -> None:
    """
    Handle an incoming magic generation request.

    Workflow:
    - Parse incoming magic generation data.
    - Run Agents.
    - Save magic session and messages to the database.
    - Notify frontend via WebSocket.

    Args:
        data (dict): Magic generation request data containing:
            - messages: list of message dicts
            - session_id: unique session identifier
            - canvas_id: canvas identifier (contextual use)
            - text_model: text model configuration
            - tool_list: list of tool model configurations (images/videos)
    """
    # Extract fields from incoming data
    messages: List[Dict[str, Any]] = data.get('messages', [])
    session_id: str = data.get('session_id', '')
    canvas_id: str = data.get('canvas_id', '')

    # print('✨ magic_service 接收到数据:', {
    #     'session_id': session_id,
    #     'canvas_id': canvas_id,
    #     'messages_count': len(messages),
    # })

    # If there is only one message, create a new magic session
    if len(messages) == 1:
        # create new session
        prompt = messages[0].get('content', '')
        await db_service.create_chat_session(session_id, 'gpt', 'prism', canvas_id, (prompt[:200] if isinstance(prompt, str) else ''))

    # Save user message to database
    if len(messages) > 0:
        await db_service.create_message(
            session_id, messages[-1].get('role', 'user'), json.dumps(messages[-1])
        )

    # Create and start magic generation task
    task = asyncio.create_task(_process_magic_generation(messages, session_id, canvas_id))

    # Register the task in stream_tasks (for possible cancellation)
    add_stream_task(session_id, task)
    try:
        # Await completion of the magic generation task
        await task
    except asyncio.exceptions.CancelledError:
        print(f"🛑Magic generation session {session_id} cancelled")
    finally:
        # Always remove the task from stream_tasks after completion/cancellation
        remove_stream_task(session_id)
        # Notify frontend WebSocket that magic generation is done
        await send_to_websocket(session_id, {'type': 'done'})

    print('✨ magic_service 处理完成')


async def _process_magic_generation(
    messages: List[Dict[str, Any]],
    session_id: str,
    canvas_id: str,
) -> None:
    """
    Process magic generation in a separate async task.
    Generates a magical variation of the input image using available image generation tools.
    This replaces the original Jaaz cloud service with local image generation.

    Args:
        messages: List of messages
        session_id: Session ID
        canvas_id: Canvas ID
    """
    try:
        # Get the last user message
        user_message: Dict[str, Any] = messages[-1] if messages else {}
        image_content: str = ""
        prompt_text: str = "Create a magical and creative variation of this image"

        # Extract image from message content
        if isinstance(user_message.get('content'), list):
            for content_item in user_message['content']:
                if content_item.get('type') == 'image_url':
                    image_content = content_item.get('image_url', {}).get('url', "")
                elif content_item.get('type') == 'text':
                    text = content_item.get('text', '')
                    if text and '✨' not in text:  # Skip magic markers
                        prompt_text = text

        if not image_content:
            ai_response = {
                'role': 'assistant',
                'content': [{'type': 'text', 'text': '✨ No input image found'}]
            }
        else:
            # Get available image generation tools
            from services.tool_service import tool_service
            from tools.utils.image_generation_core import generate_image_with_provider
            from tools.utils.image_utils import get_image_info_and_save
            from services.config_service import FILES_DIR
            from common import DEFAULT_PORT
            from nanoid import generate
            import os
            import base64
            import re
            
            available_tools = tool_service.tools
            image_tools = [
                (tool_id, tool_info) 
                for tool_id, tool_info in available_tools.items() 
                if tool_info.get('type') == 'image'
            ]
            
            if not image_tools:
                raise ValueError("No image generation tools available")
            
            # Use the first available image tool
            tool_id, tool_info = image_tools[0]
            provider = tool_info.get('provider', 'openai')
            
            # Determine model based on provider
            model_map = {
                'openai': 'dall-e-3',
                'google': 'gemini-2.5-flash-image',
                'replicate': 'recraft-ai/recraft-v3',
            }
            model = model_map.get(provider, 'dall-e-3')
            
            # Convert base64 to file for input_images support
            input_file_id = None
            if image_content.startswith('data:image'):
                try:
                    # Extract base64 data
                    base64_data = re.sub(r'^data:image/[^;]+;base64,', '', image_content)
                    
                    # Save to temporary file
                    temp_file_id = generate(size=10)
                    file_path_without_extension = os.path.join(FILES_DIR, temp_file_id)
                    
                    mime_type, width, height, extension = await get_image_info_and_save(
                        base64_data, file_path_without_extension, is_b64=True
                    )
                    
                    input_file_id = f'{temp_file_id}.{extension}'
                    print(f"✨ Input image saved: {input_file_id}")
                except Exception as e:
                    print(f"❌ Failed to process input image: {e}")
            
            # Generate magic image
            # Note: input_images support depends on the provider
            # DALL-E 3 doesn't support input images, but we can use the prompt
            result_message = await generate_image_with_provider(
                canvas_id=canvas_id,
                session_id=session_id,
                provider=provider,
                model=model,
                prompt=f"✨ Magic Transformation: {prompt_text}",
                aspect_ratio="1:1",
                input_images=[input_file_id] if input_file_id else None
            )
            
            # Create success response
            ai_response = {
                'role': 'assistant',
                'content': f'✨ Magic Success!!!\n\n{result_message}'
            }
        
    except Exception as e:
        print(f"❌ Magic generation error: {e}")
        import traceback
        traceback.print_exc()
        
        # Create error response matching original format
        error_msg = str(e).lower()
        if 'timeout' in error_msg or 'timed out' in error_msg:
            text = '✨ Time out'
        else:
            text = f'✨ Magic Generation Error: {str(e)}'
        
        ai_response = {
            'role': 'assistant',
            'content': [{'type': 'text', 'text': text}]
        }

    # Save AI response to database
    await db_service.create_message(session_id, 'assistant', json.dumps(ai_response))

    # Send messages to frontend immediately
    all_messages = messages + [ai_response]
    await send_to_websocket(
        session_id, {'type': 'all_messages', 'messages': all_messages}
    )
