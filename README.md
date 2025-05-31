# Translator Assistant

A lightweight Progressive Web App that translates text using AI. Designed to work with your Open-WebUI instance for LLM access. Supports English/Russian to Polish and Polish to English translation.

## Docker Container

### Building and Running Locally

You can run this application in a Docker container:

```bash
# Build the Docker image
docker build -t translator-app .

# Run the container
docker run -p 8080:80 translator-app
```

Then visit http://localhost:8080 in your browser.

### Automated Builds via GitHub Actions

This repository includes a GitHub Actions workflow that automatically builds and publishes the Docker image to GitHub Container Registry when changes are pushed to the main branch or new tags are created.

To use the pre-built container from GitHub Container Registry:

```bash
# Pull the image (replace OWNER/REPO with actual repository path)
docker pull ghcr.io/OWNER/REPO:latest

# Run the container
docker run -p 8080:80 ghcr.io/OWNER/REPO:latest
```

Note: You may need to authenticate to GitHub Container Registry first if the repository is private.

## Docker Container

### Building and Running Locally

You can run this application in a Docker container:

```bash
# Build the Docker image
docker build -t translator-app .

# Run the container
docker run -p 8080:80 translator-app
```

Then visit http://localhost:8080 in your browser.

### Automated Builds via GitHub Actions

This repository includes a GitHub Actions workflow that automatically builds and publishes the Docker image to GitHub Container Registry when changes are pushed to the main branch or new tags are created.

To use the pre-built container from GitHub Container Registry:

```bash
# Pull the image (replace OWNER/REPO with actual repository path)
docker pull ghcr.io/OWNER/REPO:latest

# Run the container
docker run -p 8080:80 ghcr.io/OWNER/REPO:latest
```

Note: You may need to authenticate to GitHub Container Registry first if the repository is private.

## Features

- Connects to your Open-WebUI instance
- Works offline with limited functionality
- Installable on any device
- Dark mode support
- Markdown rendering
- Response streaming

## Setup

1. Enter your Open-WebUI API settings:
   - API URL (default: https://chat.pashutk.com/api/chat/completions)
   - API Key from your Open-WebUI instance
   - Model (default: anthropic.claude-sonnet-4-20250514)

2. Type text in any supported language and send

## Installation

- **Mobile**: Open in browser → Share/Menu → Add to Home Screen
- **Desktop**: Click install icon in address bar

## Keyboard Shortcuts

- **Cmd+Enter/Ctrl+Enter**: Send message

## Troubleshooting

If issues occur, check your Open-WebUI API settings, internet connection, or clear browser cache.