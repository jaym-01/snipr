import { useRef, useEffect } from "react";

const LINE_WIDTH = 5;
const LINE_GAP = 3;

function getWaveformWidth(sampleCount: number) {
  return sampleCount * LINE_WIDTH + (sampleCount - 1) * LINE_GAP;
}

export default function Waveform({ audio }: { audio: number[][] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && containerRef.current) {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const minValues = audio[0];
      const maxValues = audio[1];

      canvas.width = Math.max(
        getWaveformWidth(minValues.length),
        container.clientWidth
      );
      canvas.height = container.clientHeight;

      drawWaveform(canvas, minValues, maxValues, [
        container.clientHeight,
        canvas.width,
      ]);
    }
  }, [audio]);

  return (
    <div ref={containerRef} className="w-full h-50 overflow-x-auto">
      <canvas ref={canvasRef} className="h-full"></canvas>
    </div>
  );
}

function drawWaveform(
  canvas: HTMLCanvasElement,
  minValues: number[],
  maxValues: number[],
  hw: [number, number]
) {
  const ctx = canvas.getContext("2d");
  const width = hw[1];
  const height = hw[0];

  if (ctx) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = "#000";
    ctx.lineCap = "round";

    const startX = (width - getWaveformWidth(minValues.length)) / 2;

    let x = startX;
    for (let i = 0; i < minValues.length; i++) {
      ctx.beginPath();
      const yMax = ((maxValues[i] + 1) / 2) * height;
      const yMin = ((minValues[i] + 1) / 2) * height;
      ctx.moveTo(x, yMax);
      ctx.lineTo(x, yMin);
      ctx.stroke();

      x += LINE_WIDTH + LINE_GAP;
    }
  }
}
