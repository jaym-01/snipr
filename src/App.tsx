import { useState, useEffect } from "react";
import { listen } from '@tauri-apps/api/event';
import { Music, X, Loader } from 'lucide-react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { ScreenState } from "./states";
import "./App.css";

const extensionFilters = ["mp3", "wav", "flac"];

function App() {
  const [state, setState] = useState<ScreenState>(ScreenState.LOADING);
  const [file, setFile] = useState<string | null>(null);

  const runProcess = async function(file_: string) {
    setState(ScreenState.LOADING);
    console.log(file_);
    await invoke("cut_silences", {fileDest: file_});
    setState(ScreenState.DONE);
  }

  const handleOpenFile = async function(){
    const file = await open({
      multiple: false,
      directory: false,
      filters: [{name: "Music", extensions: extensionFilters}]
    });
    setFile(file);
    if(file)
      runProcess(file.toString());
  }

  const handleSaveFile = async function(){
    const file_ = await save({
      filters: [{name: "Music", extensions: extensionFilters}]
    });
    console.log("file_", file_);
    if(file_){
      setState(ScreenState.SAVE_LOADING);
      await invoke("save_file", {fileDest: file_});
      setState(ScreenState.DONE);
    }
  };

  useEffect(()=>{
    const unlisten = listen<{paths: string[]}>("tauri://drag-drop", (event)=>{
      const allPaths = event.payload.paths;
      if(allPaths && allPaths.length > 0 && extensionFilters.includes(allPaths[0].substring(allPaths[0].length-3))){
        setFile(event.payload.paths[0]);
        runProcess(event.payload.paths[0]);
      }
    });
  }, [])

  return (
    <main className="container">
      <div className="main-wrapper">
        <div className={`title-content ${state !== ScreenState.LOADING ? "title-content-h": ""}`}>
        <Music className={state !== ScreenState.LOADING ? "title" : "title-proc"} />
          <h2 className={state !== ScreenState.LOADING ? "title" : "title-proc"} onClick={state !== ScreenState.LOADING ? handleOpenFile: ()=>undefined}>Click here or drag to open file</h2>
        </div>
        {state == ScreenState.LOADING && <progress value={undefined} />}
      </div>
      <div className="control-wrapper">
        {file && <small className="title-proc">{file}</small>}
        {state === ScreenState.LOADING &&
          <button className="cancel" onClick={()=>setFile(null)}><X /></button>
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
      </div>
    </main>
  );
}

export default App;
