"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAppStore, type ViewStep } from "@/lib/store";

interface Props {
  children: React.ReactNode;
  viewKey: ViewStep;
}

const variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "60%" : "-60%",
    opacity: 0,
    scale: 0.96,
    filter: "blur(6px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: (dir: number) => ({
    x: dir < 0 ? "60%" : "-60%",
    opacity: 0,
    scale: 0.96,
    filter: "blur(6px)",
  }),
};

export default function ViewTransition({ children, viewKey }: Props) {
  const { viewDirection } = useAppStore();

  return (
    <AnimatePresence mode="wait" custom={viewDirection}>
      <motion.div
        key={viewKey}
        custom={viewDirection}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 26,
          mass: 0.8,
        }}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
