> [!WARNING]
> This document has been archived.

# Deployment

### ⚠️ Important Announcement: GGUF Model Performance

The **GGUF model** has undergone quantization, but unfortunately, its performance cannot be guaranteed. As a result, we have decided to **downgrade** it.

💡 **Alternative Solution**:
You can use **[Cloud Deployment](#cloud-deployment)** or **[Local Deployment [vLLM]](#local-deployment-vllm)**(If you have enough GPU resources) instead.

We appreciate your understanding and patience as we work to ensure the best possible experience.

## Cloud Deployment

We recommend using HuggingFace Inference Endpoints for fast deployment.
We provide two docs for users to refer:

English version: [GUI Model Deployment Guide](https://juniper-switch-f10.notion.site/GUI-Model-Deployment-Guide-17b5350241e280058e98cea60317de71)

中文版: [GUI模型部署教程](https://bytedance.sg.larkoffice.com/docx/TCcudYwyIox5vyxiSDLlgIsTgWf#U94rdCxzBoJMLex38NPlHL21gNb)

## Local Deployment [vLLM]
We recommend using vLLM for fast deployment and inference. You need to use `vllm>=0.6.1`.
```bash
pip install -U transformers
VLLM_VERSION=0.6.6
CUDA_VERSION=cu124
pip install vllm==${VLLM_VERSION} --extra-index-url https://download.pytorch.org/whl/${CUDA_VERSION}

```
### Download the Model
We provide three model sizes on Hugging Face: **2B**, **7B**, and **72B**. To achieve the best performance, we recommend using the **7B-DPO** or **72B-DPO** model (based on your hardware configuration):

- [2B-SFT](https://huggingface.co/bytedance-research/UI-TARS-2B-SFT)
- [7B-SFT](https://huggingface.co/bytedance-research/UI-TARS-7B-SFT)
- [7B-DPO](https://huggingface.co/bytedance-research/UI-TARS-7B-DPO)
- [72B-SFT](https://huggingface.co/bytedance-research/UI-TARS-72B-SFT)
- [72B-DPO](https://huggingface.co/bytedance-research/UI-TARS-72B-DPO)


### Start an OpenAI API Service
Run the command below to start an OpenAI-compatible API service:

```bash
python -m vllm.entrypoints.openai.api_server --served-model-name ui-tars --model <path to your model>
```

### Input your API information

<img src="./images/settings_model.png" width="500px" />

<!-- If you use Ollama, you can use the following settings to start the server:

```yaml
VLM Provider: ollama
VLM Base Url: http://localhost:11434/v1
VLM API Key: api_key
VLM Model Name: ui-tars
``` -->

> **Note**: VLM Base Url is OpenAI compatible API endpoints (see [OpenAI API protocol document](https://platform.openai.com/docs/guides/vision/uploading-base-64-encoded-images) for more details).
