import Button from "../primitives/Button";
import styled from "styled-components";
import { AudioLines } from "lucide-react";
import ReactDOM from "react-dom";

import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";
import { ResultReason } from "microsoft-cognitiveservices-speech-sdk";
import { useRecording } from "../hooks/useRecording";
import { electronAPI } from "../utils";
import { useMouseForwarding } from "../hooks/useMouseForwarding";
import { useEffect, useRef, useState } from "react";
import { usePopover } from "../hooks/usePopover";
import { useChat } from "../hooks/useChat";
import { STEPS } from "../atoms/chatAtom";

const AudioDisplay = ({ coords, streamingText }) => {
  const containerRef = useMouseForwarding();
  const { setIsRecording } = useRecording();

  useEffect(() => {
    return () => {
      setIsRecording(false);
    };
  }, []);

  return (
    <Container ref={containerRef} top={coords.top}>
      <DisplayContainer>
        {streamingText ? streamingText : "Listening..."}
      </DisplayContainer>
    </Container>
  );
};

const Audio = () => {
  const { isRecording, setIsRecording } = useRecording();
  const [streamingText, setStreamingText] = useState("");
  const { setGlobalInputValue } = useChat();

  const { isOpen, toggle } = usePopover(4);
  const { toggle: toggleChatBox } = usePopover(2);
  const [coords, setCoords] = useState({ top: 0 });
  const { setChatStep } = useChat();
  const buttonRef = useRef(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const { bottom } = buttonRef.current.getBoundingClientRect();
      setCoords({ top: bottom + 15 });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleShortcut = (accelerator) => {
      if (accelerator === "CMD_L") {
        startRecording();
      }
    };
    electronAPI.onKeyBoardShortcut(handleShortcut);
  }, []);

  const startRecording = async () => {
    if (isRecording) return;
    toggle();
    setStreamingText("");
    const STT_API_KEY = await electronAPI.getSttApiKey();
    const STT_REGION = await electronAPI.getSttRegion();
    if (!STT_API_KEY || STT_API_KEY === "YOUR_AZURE_SPEECH_KEY") {
      // Free path: use Web Speech API (no key, no downloads)
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setStreamingText("Web Speech API not supported in this browser.");
          return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        recognition.onresult = (e) => {
          const finalResult = Array.from(e.results)
            .find(r => r.isFinal);
          if (finalResult) {
            const text = finalResult[0]?.transcript?.trim() || "";
            setStreamingText(text);
            if (text) {
              setGlobalInputValue(text);
              setChatStep(STEPS.INPUT);
              toggle();
              toggleChatBox();
            }
          } else {
            const interimText = Array.from(e.results)
              .map((r) => r[0]?.transcript || "")
              .join(" ")
              .trim();
            setStreamingText(interimText || "Listening...");
          }
        };

        recognition.onerror = (e) => {
          console.error("Speech recognition error:", e.error);
          if (e.error === "network") {
            setStreamingText("Network error. Check internet connection or try typing instead.");
          } else if (e.error === "not-allowed") {
            setStreamingText("Microphone permission denied. Allow microphone access and try again.");
          } else if (e.error === "no-speech") {
            setStreamingText("No speech detected. Try speaking louder or closer to microphone.");
          } else {
            setStreamingText(`Speech error: ${e.error}. Try typing instead.`);
          }
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        setStreamingText("Listening (free)...");

        // Add timeout to prevent hanging
        setTimeout(() => {
          if (isRecording) {
            recognition.stop();
            setStreamingText("Speech timeout. Try typing instead.");
            setIsRecording(false);
          }
        }, 10000); // 10 second timeout

        return;
      } catch (err) {
        setStreamingText("Microphone permission denied or unsupported.");
      }
      return;
    }
    setIsRecording(true);

    navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
      const speechConfig = speechsdk.SpeechConfig.fromSubscription(
        STT_API_KEY,
        STT_REGION
      );

      speechConfig.speechRecognitionLanguage = "en-US";

      const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new speechsdk.SpeechRecognizer(
        speechConfig,
        audioConfig
      );

      recognizer.canceled = (s, e) => {
        const details = e.errorDetails || "Speech canceled";
        console.error("Speech canceled:", details);
        setStreamingText(`Speech error: ${details}`);
        setIsRecording(false);
      };

      recognizer.sessionStarted = () => {
        // no-op, but useful to confirm session
      };

      recognizer.sessionStopped = () => {
        // no-op
      };

      recognizer.recognizing = async (s, e) => {
        setStreamingText(e.result.text);
      };

      recognizer.recognizeOnceAsync((result) => {
        setIsRecording(false);
        if (result.reason === ResultReason.RecognizedSpeech) {
          const text = result.text;
          if (text) {
            setGlobalInputValue(text);
            setChatStep(STEPS.INPUT);
            toggle();
            toggleChatBox();
          }
        } else if (result.reason === ResultReason.Canceled) {
          const cancellation = speechsdk.CancellationDetails.fromResult(result);
          const details = cancellation.errorDetails || "Canceled";
          console.error("Recognize canceled:", details);
          setStreamingText(`Speech error: ${details}`);
        }
      });
    });
  };

  return (
    <>
      <ButtonContainer ref={buttonRef}>
        <SolidButton disabled={isRecording} onClick={startRecording}>
          <ButtonContent>
            <span>{isRecording ? "Listening" : "Listen"}</span>
            <ShortcutGroup>
              <AudioLines size={14} />
            </ShortcutGroup>
          </ButtonContent>
        </SolidButton>
      </ButtonContainer>
      {isOpen &&
        ReactDOM.createPortal(
          <AudioDisplay coords={coords} streamingText={streamingText} />,
          document.getElementById("root-portal")
        )}
    </>
  );
};

const Container = styled.div`
  position: fixed;
  top: ${({ top }) => top}px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 4px;
  border-radius: 8px;
  z-index: 9999;
  border: 1px solid #3a3a3a;
  display: flex;
  align-items: center;
  width: 600px;
`;

const DisplayContainer = styled.div`
  flex-grow: 1;
  background: transparent;
  min-height: 20px;
  border: none;
  padding: 4px;
  font-size: 0.75rem;
  line-height: 18px;
  color: white;
  &::placeholder {
    color: grey;
    font-weight: semibold;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
`;

const SolidButton = styled(Button)`
  background-color: rgba(74, 74, 74, 0.6);
  border-radius: 444444px;

  &:hover {
    background-color: rgba(74, 74, 74, 0.3);
  }
`;

const ButtonContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ShortcutGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ShortcutKey = styled.div`
  background: #2a2a2a;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export default Audio;
