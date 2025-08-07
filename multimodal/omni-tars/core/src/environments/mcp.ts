/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export const MCP_ENVIRONMENT = `<MCP_ENVIRONMENT>

Function:
def Search(query: str):
    """
    这是一个联网搜索工具，输入搜索问题，返回网页列表与对应的摘要信息。搜索问题应该简洁清晰，复杂问题应该拆解成多步并一步一步搜索。如果没有搜索到有用的页面，可以调整问题描述（如减少限定词、更换搜索思路）后再次搜索。搜索结果质量和语种有关，对于中文资源可以尝试输入中文问题，非中资源可以尝试使用英文或对应语种。

    Args:
        - query (str) [Required]: 搜索问题
    """

Function:
def LinkReader(description: str, url: str):
    """
    这是一个链接浏览工具，可以打开链接（可以是网页、pdf等）并根据需求描述汇总页面上的所有相关信息。建议对所有有价值的链接都调用该工具来获取信息，有价值的链接包括但不限于如下几种：1.任务中明确提供的网址，2.搜索结果提供的带有相关摘要的网址，3. 之前调用LinkReader返回的内容中包含的且判断可能含有有用信息的网址。请尽量避免自己凭空构造链接。

    Args:
        - description (str) [Required]: 需求描述文本，详细描述在当前url内想要获取的内容
        - url (str) [Required]: 目标链接，应该是一个完整的url（以 http 开头）
    """

## Note
- 请使用和用户问题相同的语言进行推理和回答，除非用户有明确要求。
- 你具备使用多种工具的能力，请仔细阅读每个Function的功能和参数信息，工具不限制调用次数。
- 每次调用工具，都需要以<|FunctionCallBegin|>开始，中间以json格式给出name和parameters，然后以<|FunctionCallEnd|>结尾。
</MCP_ENVIRONMENT>`;