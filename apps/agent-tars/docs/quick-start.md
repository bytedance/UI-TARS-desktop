# Getting started with Agent TARS

Hello, welcome to Agent TARS!

This guide will walk you through the process of setting up your first Agent TARS project.

## Necessary Configuration

Before you begin, you will need to set some necessary configuration.

Enable the Accessibility permission of **Agent TARS** in MacOS:
  - System Settings -> Privacy & Security -> **Accessibility**

![accessibility-permission.png](https://github.com/user-attachments/assets/77e171d2-dffb-4905-98c0-92c5ab00e333)


You can click the left-bottom button to open the configuration page:

![setting-icon.png](https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/setting-icon.jpeg)

Then you can set the model config and the search config.

For model config, you can set the model provider and api key:

![model-config.png](https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/model-setting.jpeg)

> For Azure OpenAI, you can set more params, including apiVersion, deploymentName and endpoint.

For search config, you can set the search provider and api key:

![search-settings.png](https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/search-setting.jpeg)

## Start Your First Journey

Now you can start your first journey in Agent TARS!

You can input your first question in the input box, and then press Enter to send your question. Here is an example:

![first-journey.jpeg](https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/start-journey.jpeg)

It's working!

We also support **Human In the Loop**, that means you can interact with the agent in the working process by the input box. If you want to change the direction of current agent work, you can insert your thoughts in the special input box on the top position, and then press Enter to send your thoughts. Here is an example:

![human-in-the-loop.jpeg](https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/human-in-the-loop.jpeg)

## Share Your Thead

You can share your thread with others by the share button on the top menu.

There are two modes to share your thread:

- **Local Html**: Agent TARS will bundle your thread into a html file, and you can share it with others.
- **Remote Server Url**: Agent TARS will generate a url for you to share your thread with others, Agent TARS will upload the html bundle to a remote server.

### Local Mode

You can click the share button to open the share modal, and then click the **Local Html** button to share your thread.

![local-share](https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/local-share.jpeg)

### Remote Mode

For the remote share mode, you need to set the remote server url in the share modal:

![remote-share](https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/remote-share.jpeg)

Then Agent TARS will post a request to the remote server to upload the html bundle, and then you can share the url with others. The specific request information is as follows:

- Method: POST
- Body:
  - file: the html bundle file(type: multipart/form-data)
- Response:
  - data: { url: string }

Then the server will return an object including the `url` parameter, which is the url to share your thread.

### Enjoy the replay experience!

When you finish the shared process, you can preview the bundle and experience the wonderful replay process! That's really cool!

## Advanced

- [Configure MCP Server](./settings/mcp.md)
