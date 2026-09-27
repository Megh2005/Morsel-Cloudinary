import React from "react";

const BackgroundPattern = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-50 pointer-events-none overflow-hidden"
    >
      {/* Subtle Dot Matrix with Radial Center-to-Edge Fade */}
      <div className="absolute inset-0 h-full w-full bg-[radial-gradient(#94a3b8_1.25px,transparent_1.25px)] dark:bg-[radial-gradient(#475569_1.25px,transparent_1.25px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_80%_65%_at_50%_45%,#000_35%,transparent_100%)] opacity-75 dark:opacity-40" />

      {/* Gentle ambient glow accents matching Morsel's palette */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-175 h-100 bg-sky-200/20 dark:bg-sky-900/15 blur-[130px] rounded-full pointer-events-none" />
    </div>
  );
};

export default BackgroundPattern;

