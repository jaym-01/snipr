from typing import List, Tuple
import torchaudio  # type: ignore
import torch  # type: ignore
import numpy as np
import numpy.typing as npt
import whisper_timestamped as whisper  # type: ignore


def get_words(result) -> List[Tuple[str, float, float]]:
    # convert all data to Word objects
    words = []

    for segment in result["segments"]:
        for word in segment["words"]:
            words.append((word["text"], word["start"], word["end"]))

    return words


def resample(audio: npt.NDArray[np.float32], sample_rate: int, channels: int):
    # compress to a single channel
    if channels != 1:
        audio = audio.reshape(-1, channels).mean(axis=1)

    # resample to 16kHz
    if sample_rate != 16000:
        resampler = torchaudio.transforms.Resample(
            orig_freq=sample_rate, new_freq=16000)
        audio_tensor = torch.tensor(audio).unsqueeze(0)
        return resampler(audio_tensor).squeeze(0).numpy().astype(np.float32)

    else:
        return torch.tensor(audio).numpy().astype(np.float32)


def transcribe(audio: List[int], sample_rate: int, channels: int) -> List[Tuple[str, float, float]]:
    naudio = np.array(audio, dtype=np.float32)
    audio_resampled = resample(naudio, sample_rate, channels)
    model = whisper.load_model(
        "tiny", device="cuda" if torch.cuda.is_available() else "cpu")
    result = whisper.transcribe(model, audio_resampled, language="en")
    words = get_words(result)
    return words
