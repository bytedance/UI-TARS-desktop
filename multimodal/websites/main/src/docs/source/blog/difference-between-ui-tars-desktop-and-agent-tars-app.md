# Understanding the Difference Between UI TARS Desktop and Agent TARS App

## Motivation

Thank you to the community for your continued support of this project! We're thrilled by your engagement, but recent feedback has highlighted a issue: confusion between **UI TARS Desktop** and **Agent TARS App**. We realize this was due to our failure to adequately clarify their different roles in the appropriate documentation, and we apologize for any confusion this misunderstanding may have caused.

This blog will walk you through the differences between **UI TARS Desktop** and **Agent TARS App**—their unique functionalities, ideal use cases, and how they complement each other. By the end, you’ll have a clear understanding that will guide your decision-making for download correct applications. Let’s dive in! 


## What Is UI TARS Desktop?

**UI TARS Desktop** is exclusively designed for executing tasks as a [GUI Agent](https://arxiv.org/abs/2411.18279). It relies solely on the [UI-TARS](https://github.com/bytedance/UI-TARS) model for automating GUI tasks.

- **Latest Version**: [v0.0.8](https://github.com/bytedance/UI-TARS-desktop/releases/tag/v0.0.8)  
- **Supported Platforms**: **Mac** and **Windows**
- **Model Compatibility**: Limited to [UI-TARS](https://github.com/bytedance/UI-TARS) Model  
- **Applicable Scenarios**: GUI-based control of computers (i.e., desktop automation)
- **Quick Start**: https://github.com/bytedance/UI-TARS-desktop/blob/main/docs/quick-start.md


## What Is Agent TARS App?

The **Agent TARS App** was launched at a later time ([blog](http://localhost:3000/2025/03/18/announcing-agent-tars-app)). it leverages agent, mcp and tools for handling browser-related tasks. It currently supports **Claude** model and is exclusive to **Mac**. Windows support is planned for a future beta release, also, community contributions are welcome.

> [!IMPORTANT]
> It’s important to note that Agent TARS does not support **UI-TARS** models. Claude remains the temporary best option, for the latest information on model support, check out [GitHub Discussion #377](https://github.com/bytedance/UI-TARS-desktop/discussions/377).

- **Latest Version**: [Agent-TARS-v1.0.0-alpha.7](https://github.com/bytedance/UI-TARS-desktop/releases/tag/Agent-TARS-v1.0.0-alpha.7)  
- **Supported Platforms**: Mac only
- **Model Compatibility**: Claude remains the temporary best option.

- **Applicable Scenarios**: Automating browser and research tasks
- **Quick Start**: https://agent-tars.com/doc/quick-start


## Summary

The **UI TARS Desktop** application and **Agent TARS App** serve unique purposes and target different scenarios. Currently, **UI TARS Desktop** supports UI-TARS models, perfect for system-level GUI automation, while the experimental **Agent TARS App** is limited to Mac users and focuses on browser-based tasks. Please note that the app does not support the UI-TARS model "yet".

Choose the tool that fits your needs and compatibility, and for installation assistance or troubleshooting, visit the [GitHub Issues page](https://github.com/bytedance/UI-TARS-desktop/issues). Stay tuned for updates aimed at enhancing functionality and unifying features across these applications!
