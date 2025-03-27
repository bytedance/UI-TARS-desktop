# SearXNG Search Configuration

## Overview

SearXNG is a privacy-respecting, self-hosted metasearch engine that aggregates results from various search engines. This document explains how to configure SearXNG search in Agent TARS.

## How to Use

[search-searxng](../images/search-searxng.png)

## Configuration Options

### Basic Configuration

To use SearXNG search, you need to specify the following parameters:

| Parameter | Description | Default Value |
|-----------|-------------|---------------|
| `baseUrl` | URL of the SearXNG instance | `https://127.0.0.1:8081` |

### Advanced Options

> The following configurations are optional and currently use default values. In the future, configuration via the GUI will be supported.

When performing searches, you can customize the following options:

| Option | Description | Default Value |
|--------|-------------|---------------|
| `count` | Maximum number of results to return | 10 |
| `language` | Search language code | `zh-CN` |
| `categories` | Categories to search in (e.g., general, images, news) | `['general']` |
| `time_range` | Time range for results (e.g., day, week, month, year) | - |
| `safesearch` | Safe search level (0: off, 1: moderate, 2: strict) | 1 |

## Setting Up SearXNG

### Using a Public Instance

You can use a public SearXNG instance by setting the `baseUrl` to the instance URL. However, for privacy and reliability reasons, we recommend hosting your own instance.

### Self-Hosting SearXNG

To set up your own SearXNG instance:

1. Follow the [official SearXNG installation guide](https://searxng.github.io/searxng/admin/installation.html)
2. Configure your instance according to your needs
3. Update the `baseUrl` in Agent TARS settings to point to your instance
