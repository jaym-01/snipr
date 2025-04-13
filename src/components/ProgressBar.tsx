export default function ProgressBar({ p, ...props }: { p: number }) {
  return (
    <div className="progress-container">
      <div className="progress-wrapper" {...props}>
        <div className="progress" style={{ width: `${p}%` }}></div>
      </div>
    </div>
  );
}
