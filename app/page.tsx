"use client";
import React, { useState, useEffect, useRef } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedText, setSelectedText] = useState({ start: -1, end: -1 });
  const [history, setHistory] = useState<string[]>([""]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const textDisplayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (text !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(text);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [text]);

  const getTextSelection = () => {
    if (selectedText.start === -1 || selectedText.end === -1) {
      return "";
    }
    const start = Math.min(selectedText.start, selectedText.end);
    const end = Math.max(selectedText.start, selectedText.end);
    return text.substring(start, end);
  };

  const clearSelection = () => {
    setSelectedText({ start: -1, end: -1 });
  };
  const calculateClickPosition = (e: React.MouseEvent) => {
    if (!textDisplayRef.current) return 0;

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

        const textContent = preRange.toString();
        position = textContent.length;
      }
    }
    else if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) {
        const preRange = document.createRange();
        preRange.setStart(textDisplayRef.current, 0);
        preRange.setEnd(range.startContainer, range.startOffset);

        const textContent = preRange.toString();
        position = textContent.length;
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

    return Math.min(position, text.length);
  };

  const handleClick = (e: React.MouseEvent) => {
    const clickPosition = calculateClickPosition(e);

    // Clear any existing selection unless shift is pressed
    if (!e.shiftKey) {
      clearSelection();
    } else if (selectedText.start === -1) {
      // If shift is pressed and no selection exists, start from current cursor
      setSelectedText({ start: cursorPosition, end: clickPosition });
    } else {
      // If shift is pressed and selection exists, extend it
      setSelectedText(prev => ({ ...prev, end: clickPosition }));
    }

    setCursorPosition(clickPosition);

    if (containerRef.current) {
      containerRef.current.focus();
    }
  };

  // Add mouse events for drag selection
  const handleMouseDown = (e: React.MouseEvent) => {
    const clickPosition = calculateClickPosition(e);
    setCursorPosition(clickPosition);
    setSelectedText({ start: clickPosition, end: clickPosition });

    // Enable focus for keyboard events
    if (containerRef.current) {
      containerRef.current.focus();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Only track movement if mouse button is pressed
    if (e.buttons === 1 && selectedText.start !== -1) {
      const movePosition = calculateClickPosition(e);
      setSelectedText(prev => ({ ...prev, end: movePosition }));
      setCursorPosition(movePosition);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const upPosition = calculateClickPosition(e);

    // If no movement happened, clear selection
    if (selectedText.start === selectedText.end) {
      clearSelection();
    }

    setCursorPosition(upPosition);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case "c": // Copy
          if (selectedText.start !== -1 && selectedText.end !== -1) {
            e.preventDefault();
            const textToCopy = getTextSelection();
            navigator.clipboard.writeText(textToCopy);
            return;
          }
          break;
        case "v": // Paste
          e.preventDefault();
          navigator.clipboard.readText().then(clipText => {
            // If text is selected, replace it
            if (selectedText.start !== -1 && selectedText.end !== -1) {
              const start = Math.min(selectedText.start, selectedText.end);
              const end = Math.max(selectedText.start, selectedText.end);
              setText(prev => prev.substring(0, start) + clipText + prev.substring(end));
              setCursorPosition(start + clipText.length);
            } else {
              // Insert at cursor position
              setText(prev =>
                prev.substring(0, cursorPosition) + clipText + prev.substring(cursorPosition)
              );
              setCursorPosition(cursorPosition + clipText.length);
            }
            clearSelection();
          });
          return;
        case "x": // Cut
          if (selectedText.start !== -1 && selectedText.end !== -1) {
            e.preventDefault();
            const textToCut = getTextSelection();
            navigator.clipboard.writeText(textToCut);
            const start = Math.min(selectedText.start, selectedText.end);
            const end = Math.max(selectedText.start, selectedText.end);
            setText(prev => prev.substring(0, start) + prev.substring(end));
            setCursorPosition(start);
            clearSelection();
            return;
          }
          break;
        case "a": // Select all
          e.preventDefault();
          setSelectedText({ start: 0, end: text.length });
          return;
        case "z": // Undo
          e.preventDefault();
          if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
            setText(history[historyIndex - 1]);
            setCursorPosition(history[historyIndex - 1].length);
            clearSelection();
          }
          return;
        case "y": // Redo
          e.preventDefault();
          if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
            setText(history[historyIndex + 1]);
            setCursorPosition(history[historyIndex + 1].length);
            clearSelection();
          }
          return;
      }
    }

    // Handle shift key for selection
    if (e.shiftKey) {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (cursorPosition > 0) {
            // Start selection if none exists
            if (selectedText.start === -1) {
              setSelectedText({ start: cursorPosition, end: cursorPosition - 1 });
            } else {
              // Extend selection
              setSelectedText(prev => ({ ...prev, end: cursorPosition - 1 }));
            }
            setCursorPosition(prev => prev - 1);
          }
          return;
        case "ArrowRight":
          e.preventDefault();
          if (cursorPosition < text.length) {
            // Start selection if none exists
            if (selectedText.start === -1) {
              setSelectedText({ start: cursorPosition, end: cursorPosition + 1 });
            } else {
              // Extend selection
              setSelectedText(prev => ({ ...prev, end: cursorPosition + 1 }));
            }
            setCursorPosition(prev => prev + 1);
          }
          return;
      }
    }

    e.preventDefault();

    // Clear selection for most operations
    if (e.key !== "Shift" && !e.ctrlKey) {
      clearSelection();
    }

    switch (e.key) {
      case "Backspace":
        if (selectedText.start !== -1 && selectedText.end !== -1) {
          // Delete selected text
          const start = Math.min(selectedText.start, selectedText.end);
          const end = Math.max(selectedText.start, selectedText.end);
          setText(prev => prev.substring(0, start) + prev.substring(end));
          setCursorPosition(start);
          clearSelection();
        } else if (cursorPosition > 0) {
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
    // If there's no selection, render as before
    if (selectedText.start === -1 || selectedText.end === -1) {
      const beforeCursor = text.substring(0, cursorPosition);
      const afterCursor = text.substring(cursorPosition);

      return (
        <>
          <span>{beforeCursor}</span>
          <span className="animate-pulse">|</span>
          <span>{afterCursor}</span>
        </>
      );
    } else {
      // Handle text with selection
      const start = Math.min(selectedText.start, selectedText.end);
      const end = Math.max(selectedText.start, selectedText.end);

      const beforeSelection = text.substring(0, start);
      const selection = text.substring(start, end);
      const afterSelection = text.substring(end);

      return (
        <>
          <span>{beforeSelection}</span>
          <span className="bg-blue-500 text-white">{selection}</span>
          {cursorPosition === end && <span className="animate-pulse">|</span>}
          <span>{afterSelection}</span>
          {cursorPosition !== end && <span className="animate-pulse">|</span>}
        </>
      );
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center h-screen bg-black p-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: "none" }}
    >      <div
      ref={textDisplayRef}
      className="text-white text-3xl whitespace-pre-wrap font-mono w-full max-w-2xl mx-auto p-6 rounded overflow-hidden"
      style={{
        overflowWrap: "break-word",
        wordWrap: "break-word",
        wordBreak: "break-word",
        maxHeight: "80vh",
        overflow: "auto",
        userSelect: "none", // Prevent default browser selection
        cursor: "text"
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
        {renderText()}
      </div>
    </div>
  );
}
