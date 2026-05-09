import { useEffect, useState } from 'react';

// 4-frame loop: arms-down, arms-up, arms-down, arms-up — with motion lines.
// Runs across the screen via a single CSS keyframe (see index.css .mascot).
const FRAMES = [
  '   ( o )\n   /|=|\\\n  /=| |=\\\n   |   |\n   /   \\',
  '  \\( o )/\n   =|=|=\n    | |\n   |   |\n   /   \\',
  '   ( o )\n   /|=|\\\n  /=| |=\\\n   |   |\n   \\   /',
  '  \\( o )/\n   =|=|=\n    | |\n   |   |\n   \\   /',
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
