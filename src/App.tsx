import { useState, useEffect, useRef } from "react";
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { Music, X, Loader } from 'lucide-react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { ScreenState } from "./states.ts";
import "./App.css";
import ProgressBar from "./ProgressBar.tsx";

const extensionFilters = ["mp3", "wav", "flac"];

function App() {
  const [state, setState] = useState<ScreenState>(ScreenState.IDLE);
  const [file, setFile] = useState<string | null>(null);
  const [savedFile, setSavedFile] = useState<string | null>(null);
  const [disableCancel, setDisableCancel] = useState(false);
  const [curProgress, setProgress] = useState(0);

  const unlistenRefs = useRef<UnlistenFn[]>([]);

  const invokeSaveFile = async function(file_: string | null){
    if(file_){
      setSavedFile(file_);
      setState(ScreenState.SAVE_LOADING);
      await invoke("save_file", {fileDest: file_});
      setState(ScreenState.DONE);
    }
  }

  const saveFile = async function(){
    const file_ = await save({
      filters: [{name: "Music", extensions: extensionFilters}]
    });
    if(file_) {
      setSavedFile(null);
      setSavedFile(file_)
    }
    return file_;
  }

  const runProcess = async function(file_: string, select_save: boolean = true){
    setState(ScreenState.LOADING);
    setDisableCancel(false);
    setProgress(0);

    let save_file_: string | null = null;

    if(select_save){
      save_file_ = await saveFile();
    }

    if(await invoke("cut_silences", {fileDest: file_}) === null){
      setState(ScreenState.DONE);
      invokeSaveFile(save_file_);
    }
    else
      setState(ScreenState.IDLE);
  }

  const handleOpenFile = async function(){
    const file = await open({
      multiple: false,
      directory: false,
      filters: [{name: "Music", extensions: extensionFilters}]
    });
    if(file){
      setFile(file);
      runProcess(file.toString());
    }
  }

  const handleSaveFile = async function(){
    const file_ = await saveFile();
    invokeSaveFile(file_);
  };

  const handleCancel = async function(){
    setDisableCancel(true);
    await invoke("cancel");
    setFile(null);
    setSavedFile(null);
    setState(ScreenState.IDLE);
    setDisableCancel(false);
  }

  useEffect(()=>{
    const init = async function(){

      const unlistenDragDrop = await listen<{paths: string[]}>("tauri://drag-drop", (event)=>{
        const allPaths = event.payload.paths;
        if(allPaths && allPaths.length > 0 && extensionFilters.includes(allPaths[0].substring(allPaths[0].length-3))){
          setFile(event.payload.paths[0]);
          runProcess(event.payload.paths[0]);
        }
      });

      unlistenRefs.current.push(unlistenDragDrop);

      const unlistenCutProgress = await listen<number>("cut-progress", (event)=>{
        setProgress(event.payload);
      });

      unlistenRefs.current.push(unlistenCutProgress);
    }

    init();

    return ()=>{
      unlistenRefs.current.forEach(unlisten => unlisten());
      unlistenRefs.current = [];
    };
  }, [])

  return (
    <main className="container">
      <div className="main-wrapper">
        <div className={`title-content ${state !== ScreenState.LOADING && state !== ScreenState.SAVE_LOADING  ? "title-content-h": ""}`}>
        <Music className={state !== ScreenState.LOADING && state !== ScreenState.SAVE_LOADING  ? "title" : "title-proc"} />
          <h2 className={state !== ScreenState.LOADING && state !== ScreenState.SAVE_LOADING  ? "title" : "title-proc"} onClick={state !== ScreenState.LOADING && state !== ScreenState.SAVE_LOADING  ? handleOpenFile: ()=>undefined}>Click here or drag to open file</h2>
        </div>
        {/* {state == ScreenState.LOADING && <Loader size={50} className="spin" />} */}
        {/* {state == ScreenState.LOADING && <progress value={curProgress/100} />} */}
        {state == ScreenState.LOADING && <ProgressBar p={curProgress} />}
      </div>
      <div className="control-wrapper">

        {file && <small className="title-proc">{file}</small>}

        {state === ScreenState.LOADING &&
          <button className={`cancel ${disableCancel ? "": "cancel-h"}`} onClick={handleCancel} disabled={disableCancel} style={{
            opacity: disableCancel ? 0.6 : 1,
          }}><X /></button>
        }
        
        {
          (state === ScreenState.DONE || state === ScreenState.SAVE_LOADING) &&
          <button className={`save ${state !== ScreenState.SAVE_LOADING ? "save-h" : ""}`} 
          disabled={state === ScreenState.SAVE_LOADING} 
          onClick={handleSaveFile}
          style={{
            opacity: state === ScreenState.SAVE_LOADING ? 0.6 : 1,
          }}
          >Save Audio
          {state === ScreenState.SAVE_LOADING && <Loader className="spin" />}
          </button>
        }

        {savedFile && <small className="save-txt">{state === ScreenState.LOADING || state === ScreenState.SAVE_LOADING ? "Saving" : "Saved"} to: {savedFile}</small>}
      </div>
    </main>
  );
}

export default App;
