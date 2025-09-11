import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { electronAPI } from "../utils";

import {
  addUserMessage,
  addAssistantMessage,
  getConversationHistory,
} from "../atoms/conversationHistoryAtom";

const takeScreenshot = async () => {
  return await electronAPI.takeScreenshot();
};

export async function openaiChatStream({
  userMessage,
  onChunk,
  onFinish,
  onError,
  signal,
  apiKey,
}) {
  try {
    const image = await takeScreenshot();

    addUserMessage(userMessage, image);

    // Use only Ollama via its OpenAI-compatible local endpoint
    const openai = createOpenAI({
      apiKey: "ollama", // ignored by Ollama
      baseURL: "http://localhost:11434/v1",
    });
    const model = openai("llama3.2:1b");
    const { textStream, fullStream } = streamText({
      model,
      messages: getConversationHistory(),
      onError: () => {
        onError?.(
          "Error fetching data. Ensure Ollama is running at http://localhost:11434 and model 'llama3.2:1b' is pulled."
        );
      },
    });
    let assistantReply = "";

    (async () => {
      try {
        for await (const chunk of textStream) {
          if (signal?.aborted) break;
          assistantReply += chunk;
          onChunk?.(chunk);
        }
        if (!signal?.aborted) {
          addAssistantMessage(assistantReply);
          onFinish?.();
        }
      } catch (err) {
        if (!signal?.aborted) {
          onError?.(err || "Error fetching data.");
        }
      }
    })();

    return fullStream;
  } catch (err) {
    onError?.(err.message || "Unexpected error occurred.");
  }
}
