import Button from "../primitives/Button";
import styled from "styled-components";
import { AudioLines } from "lucide-react";
import ReactDOM from "react-dom";

// Removed Azure and Web Speech API imports
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
  // Add a ref to store the latest transcribed text
  const latestTranscribedText = useRef("");
  // Dynamically import makeQuery from Chat component
  const [makeQuery, setMakeQuery] = useState(null);

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

  // Dynamically import makeQuery from Chat only once
  useEffect(() => {
    import("./Chat/Chat.jsx").then(mod => {
      if (mod && typeof mod.makeQuery === "function") {
        setMakeQuery(() => mod.makeQuery);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleShortcut = (accelerator) => {
      if (accelerator === "CMD_L") {
        startRecording();
      }
    };
    electronAPI.onKeyBoardShortcut(handleShortcut);
  }, []);

  // Only use Whisper/MediaRecorder for voice input
  const startRecording = async () => {
    if (isRecording) return;
    toggle();
    setStreamingText("");
    setIsRecording(true);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    let chunks = [];
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(chunks, { type: 'audio/wav' });
      setStreamingText("Transcribing...");
      try {
        const text = await transcribeAudio(audioBlob);
        setStreamingText(text); // Show transcription immediately
        latestTranscribedText.current = text;
        if (text) {
          setGlobalInputValue(text);
          setChatStep(STEPS.INPUT);
          toggle();
          toggleChatBox();
          // Wait a short moment for UI update, then send to model
          setTimeout(() => {
            if (makeQuery) makeQuery(text);
          }, 500);
        }
      } catch (err) {
        setStreamingText("Transcription failed.");
      }
      setIsRecording(false);
    };
    mediaRecorder.start();

    // Stop recording after 10 seconds
    setTimeout(() => {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      setIsRecording(false);
    }, 10000);
  };

  async function transcribeAudio(audioBlob) {
    //console.log(audioBlob.type);
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    const response = await fetch('http://localhost:5000/transcribe', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    return data.text;
  }

  // handleMediaRecorder removed; all logic is in startRecording

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