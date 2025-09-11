from flask import Flask, request, jsonify
import whisper
import tempfile
import os
import ffmpeg

app = Flask(__name__)
model = whisper.load_model("base")

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file"}), 400
    audio = request.files["audio"]
    tmp_in = tempfile.NamedTemporaryFile(delete=False, suffix='.input')
    audio.save(tmp_in.name)
    tmp_in.close()  # Ensure file is closed before using/deleting
    tmp_wav = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
    tmp_wav.close()
    # Convert any input to PCM WAV using ffmpeg
    ffmpeg.input(tmp_in.name).output(tmp_wav.name, format='wav', acodec='pcm_s16le', ac=1, ar='16000').run(overwrite_output=True)
    result = model.transcribe(tmp_wav.name)
    # Clean up temp files
    os.unlink(tmp_in.name)
    os.unlink(tmp_wav.name)
    return jsonify({"text": result["text"]})

if __name__ == "__main__":
    app.run(port=5000)