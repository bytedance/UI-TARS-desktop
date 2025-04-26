> [!WARNING]
> This document has been archived.

# Preset Management Guide

> [!IMPORTANT]  
> Currently, **UI-TARS Desktop** does not directly provide server-side capabilities, so we do not provide a Preset for the open source community. welcome community developers to contribute your presets [here](../examples/presets/).

A **preset** is a collection of [settings](./setting.md)  (_Introduced at [#61](https://github.com/bytedance/UI-TARS-desktop/pull/61)_), **UI-TARS Desktop** supports import presets via `files` or `URLs`:

```mermaid
graph TD
    A[Import Preset] --> B{Preset Type}
    B -->|File| C[YAML File]
    B -->|URL| D[URL Endpoint]
    C --> E[Manual Updates 🔧]
    D --> F[Auto Sync ⚡]
```

<br>


## Preset Types Comparison

| Feature               | Local Presets          | Remote Presets         |
|-----------------------|------------------------|------------------------|
| **Storage**           | Device-local           | Cloud-hosted          |
| **Update Mechanism**  | Manual                 | Automatic             |
| **Access Control**    | Read/Write             | Read-Only             |
| **Versioning**        | Manual                 | Git-integrated        |



<br>


## Examples

### Import from file

**UI-TARS Desktop** supports importing presets from files. Once the file is parsed successfully, the settings will be automatically updated.

| Function | Snapshot |
| --- | ---|
| Open Setting |<img width="320" alt="image" src="https://github.com/user-attachments/assets/1d2ae27c-9b2e-4896-96a6-04832f850907" /> |
| Import Success | <img width="320" alt="image" src="https://github.com/user-attachments/assets/38f77101-7388-4363-ab27-668180f51aaa" />|
| Exception: Invalid Content | <img width="320" alt="image" src="https://github.com/user-attachments/assets/5ebec2b2-12f6-4d1a-84a7-8202ef651223" /> |


<br>


### Import from URL

**UI-TARS Desktop** also supports importing presets from URLs. If automatic updates are set, presets will be automatically pulled every time the application is started.

| Function | Snapshot |
| --- | ---|
| Open Setting | <img width="320" alt="image" src="https://github.com/user-attachments/assets/d446da0e-3bb4-4ca5-bc95-4f235d979fd0" /> |
| Import Success (Default) | <img width="320" alt="image" src="https://github.com/user-attachments/assets/a6470ed4-80ac-45a1-aaba-39e598d5af0f" /> |
| Import Success (Auto Update) | <img width="320" alt="image" src="https://github.com/user-attachments/assets/b5364d66-6654-401b-969e-f85baeedbda0" />|


<br>


### Preset Example

```yaml
name: UI TARS Desktop Example Preset
language: en
vlmProvider: Hugging Face
vlmBaseUrl: https://your-endpoint.huggingface.cloud/v1
vlmApiKey: your_api_key
vlmModelName: your_model_name
reportStorageBaseUrl: https://your-report-storage-endpoint.com/upload
utioBaseUrl: https://your-utio-endpoint.com/collect
```

See all [example presets](../examples/presets).

