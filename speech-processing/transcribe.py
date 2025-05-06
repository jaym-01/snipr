from typing import List
import torchaudio
import torch
import numpy as np
import whisper_timestamped as whisper


class Word:
    def __init__(self, word, start, end):
        self.word = word
        self.start = start
        self.end = end

    def __repr__(self):
        return f"{self.word} | {self.start} | {self.end}"


def get_words(result):
    words: List[Word] = []

    for segment in result["segments"]:
        for word in segment["words"]:
            words.append(Word(word["text"], word["start"], word["end"]))

    return words


def resample(audio, sample_rate):
    if sample_rate != 16000:
        resampler = torchaudio.transforms.Resample(
            orig_freq=sample_rate, new_freq=16000)
        audio_tensor = torch.tensor(audio).unsqueeze(0)
        return resampler(audio_tensor).squeeze(0).numpy().astype(np.float32)

    else:
        return torch.tensor(audio).numpy().astype(np.float32)


def transcribe(audio, sample_rate):
    audio_resampled = resample(audio, sample_rate)
    model = whisper.load_model(
        "tiny", device="cuda" if torch.cuda.is_available() else "cpu")
    result = whisper.transcribe(model, audio_resampled, language="en")
    words = get_words(result)
    return words
