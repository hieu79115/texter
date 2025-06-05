"use client";
import React, { useState, useEffect, useRef } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const textDisplayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (!textDisplayRef.current) return;

    const rect = textDisplayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const document = window.document;
    let position = 0;

    if (document.caretPositionFromPoint) {
      const caretPosition = document.caretPositionFromPoint(e.clientX, e.clientY);
      if (caretPosition) {
        const preRange = document.createRange();
        preRange.setStart(textDisplayRef.current, 0);
        preRange.setEnd(caretPosition.offsetNode, caretPosition.offset);

        const selectedText = preRange.toString();
        position = selectedText.length;
      }
    }
    else if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) {

        const preRange = document.createRange();
        preRange.setStart(textDisplayRef.current, 0);
        preRange.setEnd(range.startContainer, range.startOffset);

        const selectedText = preRange.toString();
        position = selectedText.length;
      }
    }
    else {
      const lines = text.split("\n");
      const lineHeight = 24;
      const charWidth = 12;

      const lineIndex = Math.floor(y / lineHeight);
      if (lineIndex >= 0 && lineIndex < lines.length) {
        let charsBeforeLine = 0;
        for (let i = 0; i < lineIndex; i++) {
          charsBeforeLine += lines[i].length + 1;
        }

        const charIndexInLine = Math.floor(x / charWidth);
        position = charsBeforeLine + Math.min(charIndexInLine, lines[lineIndex].length);
      } else {
        position = text.length;
      }
    }

    setCursorPosition(Math.min(position, text.length));

    if (containerRef.current) {
      containerRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();

    switch (e.key) {
      case "Backspace":
        if (cursorPosition > 0) {
          setText(
            (prev) =>
              prev.substring(0, cursorPosition - 1) +
              prev.substring(cursorPosition)
          );
          setCursorPosition((prev) => prev - 1);
        }
        break;
      case "Delete":
        if (cursorPosition < text.length) {
          setText(
            (prev) =>
              prev.substring(0, cursorPosition) +
              prev.substring(cursorPosition + 1)
          );
        }
        break;
      case "Enter":
        setText(
          (prev) =>
            prev.substring(0, cursorPosition) +
            "\n" +
            prev.substring(cursorPosition)
        );
        setCursorPosition((prev) => prev + 1);
        break;
      case "Tab":
        e.preventDefault();
        setText(
          (prev) =>
            prev.substring(0, cursorPosition) +
            "    " +
            prev.substring(cursorPosition)
        );
        setCursorPosition((prev) => prev + 4);
        break;
      case "ArrowLeft":
        if (cursorPosition > 0) {
          setCursorPosition((prev) => prev - 1);
        }
        break;
      case "ArrowRight":
        if (cursorPosition < text.length) {
          setCursorPosition((prev) => prev + 1);
        }
        break;
      case "ArrowUp": {
        const textBeforeCursor = text.substring(0, cursorPosition);
        const currentLineStart = textBeforeCursor.lastIndexOf("\n") + 1;
        const currentColumnPosition = cursorPosition - currentLineStart;

        const prevLineStart =
          textBeforeCursor.substring(0, currentLineStart - 1).lastIndexOf(
            "\n"
          ) + 1;
        const prevLineEnd = currentLineStart - 1;
        const prevLineLength = prevLineEnd - prevLineStart;

        const newColumn = Math.min(currentColumnPosition, prevLineLength);
        if (prevLineStart >= 0) {
          setCursorPosition(prevLineStart + newColumn);
        }
        break;
      }
      case "ArrowDown": {
        const lines = text.split("\n");
        let currentLine = 0;
        let charCount = 0;

        for (let i = 0; i < lines.length; i++) {
          if (charCount + lines[i].length >= cursorPosition) {
            currentLine = i;
            break;
          }
          charCount += lines[i].length + 1;
        }

        const currentLineStart = text.substring(0, cursorPosition).lastIndexOf(
          "\n"
        );
        const currentColumnPosition = cursorPosition - currentLineStart;

        if (currentLine < lines.length - 1) {
          const nextLineStart = charCount + lines[currentLine].length + 1;
          const nextLineLength = lines[currentLine + 1].length;
          const newColumn = Math.min(currentColumnPosition, nextLineLength);
          setCursorPosition(nextLineStart + newColumn);
        }
        break;
      }
      case "Home":
        const lineStart = text.substring(0, cursorPosition).lastIndexOf("\n") + 1;
        setCursorPosition(lineStart);
        break;
      case "End":
        const lineEnd = text.indexOf("\n", cursorPosition);
        if (lineEnd === -1) {
          setCursorPosition(text.length);
        } else {
          setCursorPosition(lineEnd);
        }
        break;
      case "Shift":
      case "Control":
      case "Alt":
      case "Meta":
      case "CapsLock":
      case "Escape":
        break;
      default:
        if (e.key.length === 1) {
          setText(
            (prev) =>
              prev.substring(0, cursorPosition) +
              e.key +
              prev.substring(cursorPosition)
          );
          setCursorPosition((prev) => prev + 1);
        }
    }
  };

  const renderText = () => {
    const beforeCursor = text.substring(0, cursorPosition);
    const afterCursor = text.substring(cursorPosition);

    return (
      <>
        <span>{beforeCursor}</span>
        <span className="animate-pulse">|</span>
        <span>{afterCursor}</span>
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center h-screen bg-black p-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <div
        ref={textDisplayRef}
        className="text-white text-3xl whitespace-pre-wrap font-mono w-full max-w-2xl mx-auto p-6 rounded overflow-hidden"
        style={{
          overflowWrap: "break-word",
          wordWrap: "break-word",
          wordBreak: "break-word",
          maxHeight: "80vh",
          overflow: "auto",
        }}
        onClick={handleClick}
      >
        {renderText()}
      </div>
    </div>
  );
}
