from typing import List, Dict, Any, Optional
from langgraph.prebuilt import create_react_agent  # type: ignore
from langgraph.graph.graph import CompiledGraph
from langchain_core.tools import BaseTool
from models.tool_model import ToolInfoJson
from services.langgraph_service.configs.image_vide_creator_config import ImageVideoCreatorAgentConfig
from .configs import PlannerAgentConfig, create_handoff_tool, BaseAgentConfig
from services.tool_service import tool_service


class AgentManager:
    """Agent Manager - Responsible for creating and managing all agents

    This class is responsible for coordinating the retrieval of agent configurations
    and the creation of actual LangGraph agents.
    """

    @staticmethod
    def create_agents(
        model: Any,
        tool_list: List[ToolInfoJson],
        system_prompt: str = ""
    ) -> List[CompiledGraph]:
        """Create all agents

        Args:
            model: Language model instance
            registered_tools: List of registered tool names
            system_prompt: System prompt

        Returns:
            List[Any]: List of created agents
        """
        # Filter appropriate tools for different types of agents
        image_tools =  [tool for tool in tool_list if tool.get('type') == 'image']
        video_tools = [tool for tool in tool_list if tool.get('type') == 'video']

        print(f"📸 Image tools: {image_tools}")
        print(f"🎬 Video tools: {video_tools}")

        planner_config = PlannerAgentConfig()
        # Add custom system prompt to planner if provided
        if system_prompt:
            planner_config.system_prompt = system_prompt + "\n\n" + planner_config.system_prompt
            print(f'📝 Planner agent system prompt updated (first 200 chars): {planner_config.system_prompt[:200]}...')
        planner_agent = AgentManager._create_langgraph_agent(
            model, planner_config)

        # image_designer_config = ImageDesignerAgentConfig(
        #     image_tools, system_prompt)
        # print('👇image_designer_config tools', image_designer_config.tools)
        # print('👇image_designer_config system_prompt', image_designer_config.system_prompt)
        # image_designer_agent = AgentManager._create_langgraph_agent(
        #     model, image_designer_config)

        # video_designer_config = VideoDesignerAgentConfig(
        #     video_tools)
        # video_designer_agent = AgentManager._create_langgraph_agent(
        #     model, video_designer_config)

        image_video_creator_config = ImageVideoCreatorAgentConfig(tool_list)
        # Add custom system prompt to image/video creator if provided
        if system_prompt:
            image_video_creator_config.system_prompt = system_prompt + "\n\n" + image_video_creator_config.system_prompt
            print(f'📝 Image/Video creator agent system prompt updated (first 200 chars): {image_video_creator_config.system_prompt[:200]}...')
        image_video_creator_agent = AgentManager._create_langgraph_agent(
            model, image_video_creator_config)

        return [planner_agent, image_video_creator_agent]

    @staticmethod
    def _create_langgraph_agent(
        model: Any,
        config: BaseAgentConfig
    ) -> CompiledGraph:
        """Create a single LangGraph agent based on configuration

        Args:
            model: Language model instance
            config: Agent configuration dictionary

        Returns:
            Any: Created LangGraph agent instance
        """
        # Create handoff tools for agent switching
        handoff_tools: List[BaseTool] = []
        for handoff in config.handoffs:
            handoff_tool = create_handoff_tool(
                agent_name=handoff['agent_name'],
                description=handoff['description'],
            )
            if handoff_tool:
                handoff_tools.append(handoff_tool)

        # Get business tools
        business_tools: List[BaseTool] = []
        for tool_json in config.tools:
            tool = tool_service.get_tool(tool_json['id'])
            if tool:
                business_tools.append(tool)

        # Create and return LangGraph agent
        return create_react_agent(
            name=config.name,
            model=model,
            tools=[*business_tools, *handoff_tools],
            prompt=config.system_prompt
        )

    @staticmethod
    def get_last_active_agent(
        messages: List[Dict[str, Any]],
        agent_names: List[str]
    ) -> Optional[str]:
        """Get the last active agent

        Args:
            messages: Message history
            agent_names: List of agent names

        Returns:
            Optional[str]: Name of the last active agent, or None if not found
        """
        for message in reversed(messages):
            if message.get('role') == 'assistant':
                message_name = message.get('name')
                if message_name and message_name in agent_names:
                    return message_name
        return None
