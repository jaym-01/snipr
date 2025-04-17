import { useEffect, useRef, useState } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { Laptop, Loader, Moon, Music, Sun, X } from "lucide-react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { ScreenState } from "@/utils/states.ts";
import ProgressBar from "../ProgressBar.tsx";
import { CutProps } from "@/utils/settings.ts";
import { useTheme } from "@/utils/theme.tsx";

const extensionFilters = ["mp3", "wav", "flac"];

function saveFile() {
  return save({
    filters: [{ name: "Music", extensions: extensionFilters }],
  });
}

export default function Home() {
  const [state, setState] = useState<ScreenState>(ScreenState.IDLE);
  const [file, setFile] = useState<string | null>(null);
  const [savedFile, setSavedFile] = useState<string | null>(null);
  const [disableCancel, setDisableCancel] = useState(false);
  const [curProgress, setProgress] = useState(0);

  const [error, setError] = useState<string | null>(null);

  const unlistenRefs = useRef<UnlistenFn[]>([]);

  const invokeSaveFile = async function (file_: string | null) {
    if (file_) {
      setError(null);
      setSavedFile(file_);
      setState(ScreenState.SAVE_LOADING);
      const result: string | null = await invoke("save_file", {
        fileDest: file_,
      });
      setError(result);
      setState(ScreenState.DONE);
    }
  };

  const runProcess = async function (
    file_: string,
    select_save: boolean = true
  ) {
    try {
      setState(ScreenState.LOADING);
      setDisableCancel(false);
      setProgress(0);
      setError(null);

      let save_file_: string | null = null;

      if (select_save) {
        save_file_ = await saveFile();
      }
      setSavedFile(save_file_);

      let cutProps: CutProps | null = null;
      try {
        cutProps = new CutProps();
        await cutProps.load();
      } catch {}

      const result: string | null = await invoke("cut_silences", {
        fileDest: file_,
        minSil: cutProps?.minSilence,
        padding: cutProps?.padding,
        threshold: cutProps?.threshold,
      });

      console.log("result", result);

      if (result === null) {
        setState(ScreenState.DONE);
        await invokeSaveFile(save_file_);
      } else {
        setState(ScreenState.IDLE);
        setError(result);
        setSavedFile(null);
        setFile(null);
      }
    } catch (e) {
      console.log("here");
      console.error(e);
    }
  };

  const handleOpenFile = async function () {
    const file = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Music", extensions: extensionFilters }],
    });
    if (file) {
      setFile(file);
      await runProcess(file.toString());
    }
  };

  const handleSaveFile = async function () {
    const file_ = await saveFile();
    if (file_) {
      setSavedFile(file_);
    }
    await invokeSaveFile(file_);
  };

  const handleCancel = async function () {
    setDisableCancel(true);
    await invoke("cancel");
    setFile(null);
    setSavedFile(null);
    setDisableCancel(false);
    setError(null);
    setState(ScreenState.IDLE);
  };

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
            setFile(event.payload.paths[0]);
            runProcess(event.payload.paths[0]);
          }
        }
      );

      unlistenRefs.current.push(unlistenDragDrop);

      const unlistenCutProgress = await listen<number>(
        "cut-progress",
        (event) => {
          setProgress(event.payload);
        }
      );

      unlistenRefs.current.push(unlistenCutProgress);
    };

    init();

    return () => {
      unlistenRefs.current.forEach((unlisten) => unlisten());
      unlistenRefs.current = [];
    };
  }, []);

  const { theme, toggleTheme } = useTheme();

  const isLoadingScreen =
    state === ScreenState.LOADING || state === ScreenState.SAVE_LOADING;

  return (
    <main className="container">
      <button
        onClick={async () => await toggleTheme()}
        className="theme-toggle"
      >
        {theme === "dark" ? <Moon /> : theme === "light" ? <Sun /> : <Laptop />}
      </button>
      <div className="main-wrapper">
        <div
          className={`title-content ${
            !isLoadingScreen ? "title-content-h" : ""
          }`}
        >
          <Music className={!isLoadingScreen ? "titlet" : "title-proc"} />
          <h2
            className={!isLoadingScreen ? "titlet" : "title-proc"}
            onClick={!isLoadingScreen ? handleOpenFile : () => undefined}
            style={{ flex: 1 }}
          >
            Click here or drag to open file
          </h2>
        </div>

        {state == ScreenState.LOADING && <ProgressBar p={curProgress} />}
      </div>
      <div className="control-wrapper">
        {file && <small className="title-proc">{file}</small>}

        {state === ScreenState.LOADING && (
          <button
            type="button"
            className="cancel"
            onClick={handleCancel}
            disabled={disableCancel}
            style={{
              opacity: disableCancel ? 0.6 : 1,
            }}
          >
            <X />
          </button>
        )}

        {(state === ScreenState.DONE || state === ScreenState.SAVE_LOADING) && (
          <button
            type="button"
            className="save"
            disabled={state === ScreenState.SAVE_LOADING}
            onClick={handleSaveFile}
            style={{
              opacity: state === ScreenState.SAVE_LOADING ? 0.6 : 1,
            }}
          >
            Save Audio
            {state === ScreenState.SAVE_LOADING && <Loader className="spin" />}
          </button>
        )}

        {savedFile && (
          <small className="save-txt">
            {isLoadingScreen ? "Saving" : "Saved"} to: {savedFile}
          </small>
        )}

        {error && <small className="error">{error}</small>}
      </div>
    </main>
  );
}
