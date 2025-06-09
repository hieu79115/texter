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
  const cursorRef = useRef<HTMLSpanElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/plain" && !file.name.endsWith('.txt')) {
      alert("only support (.txt)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = event.target?.result as string;

      if (text.length > 0) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(text);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }

      setText(fileContent);
      setCursorPosition(0);
      clearSelection();
    };

    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  useEffect(() => {
    document.body.style.minHeight = "100vh";
    document.documentElement.style.minHeight = "100vh";

    document.body.style.overflowY = "auto";
    document.documentElement.style.overflowY = "auto";
  }, []);

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

  useEffect(() => {
    scrollCursorIntoView();
  }, [cursorPosition, text]);
  const scrollCursorIntoView = () => {
    if (cursorRef.current) {
      cursorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  };

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

    if (!e.shiftKey) {
      clearSelection();
    } else if (selectedText.start === -1) {
      setSelectedText({ start: cursorPosition, end: clickPosition });
    } else {
      setSelectedText(prev => ({ ...prev, end: clickPosition }));
    }

    setCursorPosition(clickPosition);

    if (containerRef.current) {
      containerRef.current.focus();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const clickPosition = calculateClickPosition(e);
    setCursorPosition(clickPosition);
    setSelectedText({ start: clickPosition, end: clickPosition });

    if (containerRef.current) {
      containerRef.current.focus();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1 && selectedText.start !== -1) {
      const movePosition = calculateClickPosition(e);
      setSelectedText(prev => ({ ...prev, end: movePosition }));
      setCursorPosition(movePosition);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const upPosition = calculateClickPosition(e);


    if (selectedText.start === selectedText.end) {
      clearSelection();
    }

    setCursorPosition(upPosition);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case "c":
          if (selectedText.start !== -1 && selectedText.end !== -1) {
            e.preventDefault();
            const textToCopy = getTextSelection();
            navigator.clipboard.writeText(textToCopy);
            return;
          }
          break;
        case "v":
          e.preventDefault();
          navigator.clipboard.readText().then(clipText => {
            if (selectedText.start !== -1 && selectedText.end !== -1) {
              const start = Math.min(selectedText.start, selectedText.end);
              const end = Math.max(selectedText.start, selectedText.end);
              setText(prev => prev.substring(0, start) + clipText + prev.substring(end));
              setCursorPosition(start + clipText.length);
            } else {
              setText(prev =>
                prev.substring(0, cursorPosition) + clipText + prev.substring(cursorPosition)
              );
              setCursorPosition(cursorPosition + clipText.length);
            }
            clearSelection();
            setTimeout(scrollCursorIntoView, 0);
          });
          return;
        case "x":
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
        case "a":
          e.preventDefault();
          setSelectedText({ start: 0, end: text.length });
          return;
        case "z":
          e.preventDefault();
          if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
            setText(history[historyIndex - 1]);
            setCursorPosition(history[historyIndex - 1].length);
            clearSelection();
          }
          return;
        case "y":
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

    if (e.shiftKey) {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (cursorPosition > 0) {
            if (selectedText.start === -1) {
              setSelectedText({ start: cursorPosition, end: cursorPosition - 1 });
            } else {
              setSelectedText(prev => ({ ...prev, end: cursorPosition - 1 }));
            }
            setCursorPosition(prev => prev - 1);
          }
          return;
        case "ArrowRight":
          e.preventDefault();
          if (cursorPosition < text.length) {
            if (selectedText.start === -1) {
              setSelectedText({ start: cursorPosition, end: cursorPosition + 1 });
            } else {
              setSelectedText(prev => ({ ...prev, end: cursorPosition + 1 }));
            }
            setCursorPosition(prev => prev + 1);
          }
          return;
      }
    }

    e.preventDefault();

    if (e.key !== "Shift" && !e.ctrlKey) {
      clearSelection();
    }

    switch (e.key) {
      case "Backspace":
        if (selectedText.start !== -1 && selectedText.end !== -1) {
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
        break; case "Enter":
        setText(
          (prev) =>
            prev.substring(0, cursorPosition) +
            "\n" +
            prev.substring(cursorPosition)
        );
        setCursorPosition((prev) => prev + 1);
        setTimeout(scrollCursorIntoView, 0);
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
  }; const renderText = () => {

    if (selectedText.start === -1 || selectedText.end === -1) {
      const beforeCursor = text.substring(0, cursorPosition);
      const afterCursor = text.substring(cursorPosition);

      return (
        <>
          <span>{beforeCursor}</span>
          <span ref={cursorRef} className="animate-pulse">|</span>
          <span>{afterCursor}</span>
        </>
      );
    } else {
      const start = Math.min(selectedText.start, selectedText.end);
      const end = Math.max(selectedText.start, selectedText.end);

      const beforeSelection = text.substring(0, start);
      const selection = text.substring(start, end);
      const afterSelection = text.substring(end);

      return (
        <>
          <span>{beforeSelection}</span>
          <span className="bg-blue-500 text-white">{selection}</span>
          {cursorPosition === end && <span ref={cursorRef} className="animate-pulse">|</span>}
          <span>{afterSelection}</span>
          {cursorPosition !== end && <span ref={cursorRef} className="animate-pulse">|</span>}
        </>
      );
    }
  }; const handleDownload = () => {
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });

      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}`;
      const filename = `my_text_${formattedDate}.txt`;

      if ('showSaveFilePicker' in window) {
        const saveFile = async () => {
          try {
            const fileHandle = await (window as any).showSaveFilePicker({
              suggestedName: filename,
              types: [{
                description: 'Text Files',
                accept: { 'text/plain': ['.txt'] },
              }],
            });
            const writable = await fileHandle.createWritable();

            await writable.write(blob);

            await writable.close();
          } catch (err: any) {
            if (err?.name !== 'AbortError') {
              fallbackDownload();
            }
          }
        };
        saveFile();
      } else {
        fallbackDownload();
      }

      function fallbackDownload() {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert("Cannot download file, please try again.");
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center min-h-screen bg-black p-4 relative"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <h1 className="absolute top-4 left-10 text-white text-3xl font-bold">Texter</h1>
      
      <div className="absolute top-4 right-4 flex gap-3">
        {/* Upload button */}
        <button
          onClick={triggerFileUpload}
          className="hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-md text-lg transition-colors duration-200 flex items-center"
          style={{ boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)" }}
          title="upload a text file"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </button>
        
        {/* Download button */}
        <button
          onClick={handleDownload}
          className="hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-md text-lg transition-colors duration-200 flex items-center"
          style={{ boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)" }}
          title="download the text file"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div
        ref={textDisplayRef}
        className="text-white text-3xl whitespace-pre-wrap font-mono w-full max-w-4xl mx-auto p-6 rounded mt-12"
        style={{
          overflowWrap: "break-word",
          wordWrap: "break-word",
          wordBreak: "break-word",
          minHeight: "70vh",
          userSelect: "none",
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
