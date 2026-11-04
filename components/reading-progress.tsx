"use client";

import { useEffect, useState } from "react";

export function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height <= 0 ? 0 : Math.min(100, (window.scrollY / height) * 100));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <div className="fixed left-0 top-0 z-[60] h-1 bg-primary transition-[width]" style={{ width: `${progress}%` }} />;
}
