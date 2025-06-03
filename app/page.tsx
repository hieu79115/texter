"use client";
import React, { useState, useEffect, useRef } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();

    switch (e.key) {
      case "Backspace":
        setText((prev) => prev.slice(0, -1));
        break;
      case "Enter":
        setText((prev) => prev + "\n");
        break;
      case "Tab":
        e.preventDefault();
        setText((prev) => prev + "    ");
        break;
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown":
      case "Shift":
      case "Control":
      case "Alt":
      case "Meta":
      case "CapsLock":
      case "Escape":
        break;
      default:
        if (e.key.length === 1) {
          setText((prev) => prev + e.key);
        }
    }
  };

  const displayText = text.split("\n").map((line, i) => (
    <span key={i}>
      {line}
      {i < text.split("\n").length - 1 && <br />}
    </span>
  ));

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center h-screen bg-black p-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <div
        className="text-white text-3xl whitespace-pre-wrap font-mono w-full max-w-5xl mx-auto p-6 rounded overflow-hidden"
        style={{
          overflowWrap: "break-word",
          wordWrap: "break-word",
          wordBreak: "break-word",
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        {displayText}
        <span className="animate-pulse">|</span>
      </div>
    </div>
  );
}
