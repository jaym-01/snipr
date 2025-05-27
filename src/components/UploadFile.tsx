import { Folder } from "lucide-react";
import { useEffect, useRef } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

const extensionFilters = ["mp3", "wav", "flac"];

export default function UploadFile() {
  const unlistenRefs = useRef<UnlistenFn[]>([]);

  useEffect(() => {
    const init = async function () {
      const unlistenDragDrop = await listen<{ paths: string[] }>(
        "tauri://drag-drop",
        (event) => {
          const allPaths = event.payload.paths;
          if (
            allPaths &&
            allPaths.length > 0 &&
            extensionFilters.includes(
              allPaths[0].substring(allPaths[0].length - 3)
            )
          ) {
            // handle file dropped in
            // runProcess(event.payload.paths[0]);
          }
        }
      );

      unlistenRefs.current.push(unlistenDragDrop);
    };

    init();

    invoke("get_samples", {
      fileDest: "",
    }).then((result) => {
      console.log(result);
    });

    return () => {
      unlistenRefs.current.forEach((unlisten) => unlisten());
      unlistenRefs.current = [];
    };
  }, []);

  return (
    <div className="flex items-center justify-center h-full flex-row gap-2 font-semibold">
      <Folder className="inline-block size-7" />
      Drag in a media file
    </div>
  );
}
