import { useState, useEffect } from "react";
import UploadFile from "@/components/UploadFile.tsx";
import { invoke } from "@tauri-apps/api/core";
import Waveform from "../Waveform.tsx";

export default function Home() {
  const [media, setMedia] = useState<number[][][]>([]);

  const handleFileRecieved = async (filePath: string) => {
    const results = await invoke("get_audio", { fileDest: filePath });
    setMedia((prev) => [...prev, results as number[][]]);
  };

  useEffect(() => {
    handleFileRecieved(
      "C:\\Users\\jay_m\\Documents\\Repos\\snipr\\speech-processing\\cut.mp3"
    );
  }, []);

  return (
    <main className="flex h-full">
      {media.length == 0 ? (
        <UploadFile handleFileRecieved={handleFileRecieved} />
      ) : (
        <div className="flex-1 flex flex-col">
          {media.map((audio, index) => (
            <Waveform key={index} audio={audio} />
          ))}
        </div>
      )}
    </main>
  );
}
