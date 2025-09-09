# Get Crak Interview – Undetectable AI for Windows 
# viersion - w.0.01 
IT is an Electron-based desktop app for AI-powered chat and voice interaction. It supports local LLMs (Ollama), OpenAI, and Azure Cognitive Services for speech recognition. This guide will help you set up, run, and use Cogni on your machine.

## Features
- Chat with local or cloud LLMs (Ollama, OpenAI)
- Voice input using browser-native Web Speech API (free) or Azure Cognitive Services (paid)
- Interrupt and clear chat responses
- Modern UI with keyboard shortcuts

## Prerequisites
- Node.js (v18 or newer recommended)
- npm (comes with Node.js)
- Git
- [Ollama](https://ollama.com/download) (for local LLM)
- (Optional) Azure Cognitive Services Speech API key and region

## Installation
1. **Clone the repository:**
   ```sh
   git clone https://github.com/noobCode-69/Cogni.git
   cd Cogni
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **(Optional) Set up Ollama:**
   - Download and install Ollama from [ollama.com/download](https://ollama.com/download)
   - Pull a model (e.g., llama3):
     ```sh
     ollama pull llama3
     ollama run llama3
     ```
   - Ollama should be running at `http://localhost:11434`
4. **(Optional) Set up Azure Speech API:**
   - Create an Azure account and get a Speech API key and region.
   - Enter your key and region in the app settings.

## Running the App
1. **Start the Electron app:**
   ```sh
   npm run dev
   ```
   or
   ```sh
   npm start
   ```
2. **Open the app window and begin chatting or using voice input.**

## Usage
- **Chat:** Type your question and press Enter or click Ask.
- **Voice Input:** Click the microphone button to start speaking.
- **Stop Response:** Click the Stop button to interrupt a streaming answer.
- **Clear Response:** Click the Clear button to remove the previous answer.
- **Keyboard Shortcuts:**
  - `Cmd + Enter`: Open/close chat
  - `Cmd + Up/Down Arrow`: Scroll chat response

## Configuration
- **API Keys:**
  - OpenAI: Enter your API key in the settings for cloud LLM.
  - Azure: Enter your Speech API key and region for paid voice recognition.
- **Local LLM (Ollama):** No key needed; ensure Ollama is running locally.

## Troubleshooting
- **Ollama not responding:** Make sure Ollama is running and the model is pulled.
- **Speech recognition not working:**
  - For free path, ensure your browser/Electron supports the Web Speech API.
  - For paid path, check your Azure key and region.
- **Network errors:** Check your internet connection and API endpoints.

## Contributing
Pull requests and issues are welcome!

## License
MIT
