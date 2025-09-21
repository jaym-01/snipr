import { Folder } from "lucide-react";
import { useEffect, useRef } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

const extensionFilters = ["mp3", "wav", "flac"];

export default function UploadFile({
  handleFileRecieved,
}: {
  handleFileRecieved: (filePath: string) => void;
}) {
  const unlistenRefs = useRef<UnlistenFn[]>([]);

  useEffect(() => {
    const init = async function () {
      const unlistenDragDrop = await listen<{ paths: string[] }>(
        "tauri://drag-drop",
        (event) => {
          const allPaths = event.payload.paths;
          if (
            allPaths.length > 0 &&
            extensionFilters.includes(
              allPaths[0].substring(allPaths[0].length - 3)
            )
          ) {
            handleFileRecieved(allPaths[0]);
          }
        }
      );

      unlistenRefs.current.push(unlistenDragDrop);
    };

    init();

    return () => {
      unlistenRefs.current.forEach((unlisten) => unlisten());
      unlistenRefs.current = [];
    };
  }, []);

  const handleOpenFile = async () => {
    const file = await open({
      multiple: false,
      filters: [
        {
          name: "Audio Files",
          extensions: extensionFilters,
        },
      ],
    });

    if (file) handleFileRecieved(file);
  };

  return (
    <div
      className="flex-1 flex items-center justify-center gap-2 flex-row h-full font-semibold hover:cursor-pointer hover:scale-105 transition-all duration-200 ease-in-out origin-center"
      onClick={handleOpenFile}
    >
      <Folder className="size-7" />
      Drag in a media file
    </div>
  );
}
