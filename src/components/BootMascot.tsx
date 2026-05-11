import { useEffect, useState } from 'react';

// 4-frame curl cycle. Body anchored centre-column; the [] dumbbells travel
// from hip-level (rest) → mid → shoulder-level (top of curl) → mid → repeat.
// Each frame is 5 cols × 5 lines so monospace alignment stays clean.
const FRAMES = [
  ' [|]_ ♪  \n (⌐■_■)  \n  /|\\\\   \n  / \\\\   ',
  ' [|]_  ♫ \n (⌐■_■)  \n   |\\\\   \n   |>    ',
  ' [|]_ ♪  \n (⌐■_■)  \n //|     \n // \\\\   ',
  ' [|]_  ♫ \n (⌐■_■)  \n //|     \n  <|     ',
];

const FRAME_MS = 140;
const TOTAL_MS = 4200;

export default function BootMascot() {
  const [frame, setFrame] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const tick = window.setInterval(() => setFrame(f => (f + 1) % FRAMES.length), FRAME_MS);
    const end = window.setTimeout(() => setGone(true), TOTAL_MS);
    return () => { clearInterval(tick); clearTimeout(end); };
  }, []);

  if (gone) return null;
  return (
    <pre className="mascot" aria-hidden="true">{FRAMES[frame]}</pre>
  );
}
