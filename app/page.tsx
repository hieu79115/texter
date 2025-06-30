"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedText, setSelectedText] = useState({ start: -1, end: -1 });
  const [history, setHistory] = useState<string[]>([""]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [notification, setNotification] = useState<{ message: string, type: "info" | "success" | "warning" } | null>(null);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [darkMode, setDarkMode] = useState<boolean | null>(null);
  const [searchText, setSearchText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const textDisplayRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastHorizPosition = useRef<number | null>(null);
  const lineHeightRef = useRef(24); // Default line height, will be measured

  // Load saved content on initial render
  useEffect(() => {
    const savedText = localStorage.getItem('texter-content');
    const savedCursorPosition = localStorage.getItem('texter-cursor-position');
    const savedShowLineNumbers = localStorage.getItem('texter-show-line-numbers');
    const savedWordWrap = localStorage.getItem('texter-word-wrap');
    const savedDarkMode = localStorage.getItem('texter-dark-mode');

    if (savedText) {
      setText(savedText);

      // Update history with saved content
      setHistory([savedText]);
      setHistoryIndex(0);

      // Restore cursor position if available
      if (savedCursorPosition) {
        const position = parseInt(savedCursorPosition, 10);
        if (!isNaN(position) && position >= 0 && position <= savedText.length) {
          setCursorPosition(position);
        }
      }

      // Show notification that content was recovered
      showNotification("Content restored from previous session", "info");
    }

    // Restore UI preferences
    if (savedShowLineNumbers !== null) {
      setShowLineNumbers(savedShowLineNumbers === 'true');
    }

    if (savedWordWrap !== null) {
      setWordWrap(savedWordWrap === 'true');
    }

    // Initialize dark mode based on saved preference or system preference
    if (savedDarkMode !== null) {
      const isDark = savedDarkMode === 'true';
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      }
    }

  }, []);

  // Function to create a new document
  const createNewDocument = () => {
    if (text.trim().length > 0) {
      const confirmNew = confirm("Do you want to create a new document? Any unsaved changes will be lost.");
      if (!confirmNew) return;
    }

    // Add current text to history before clearing
    const newHistory = [""];
    setHistory(newHistory);
    setHistoryIndex(0);

    // Clear text and reset cursor
    setText("");
    setCursorPosition(0);
    clearSelection();

    // Update localStorage
    localStorage.setItem('texter-content', "");
    localStorage.setItem('texter-cursor-position', "0");

    showNotification("New document created", "success");

    // Set focus to the editor
    if (containerRef.current) {
      containerRef.current.focus();
    }
  };

  // Function to show notifications
  const showNotification = (message: string, type: "info" | "success" | "warning") => {
    setNotification({ message, type });

    // Auto-hide notification after 3 seconds
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/plain" && !file.name.endsWith('.txt')) {
      showNotification("Only .txt files are supported", "warning");
      return;
    }
    // If there's existing content, confirm before replacing
    if (text.length > 0) {
      const shouldReplace = confirm("There is existing content. Do you want to replace it with the new file?");

      if (!shouldReplace) {
        // Cancel operation
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result as string;

        // Add current text to history before replacing
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(text);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);

        // Replace existing content
        const newText = fileContent;
        setText(newText);
        setCursorPosition(0);

        setText(newText);
        clearSelection();

        // Save the new content to localStorage
        localStorage.setItem('texter-content', newText);

        showNotification(`File "${file.name}" loaded successfully`, "success");
      };

      reader.readAsText(file);
    } else {
      // No existing content, proceed with normal loading
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result as string;
        setText(fileContent);
        setCursorPosition(0);
        clearSelection();

        // Save the new content to localStorage
        localStorage.setItem('texter-content', fileContent);

        showNotification(`File "${file.name}" loaded successfully`, "success");
      };

      reader.readAsText(file);
    }

    // Reset file input for future uploads
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

      // Save content to localStorage whenever it changes
      localStorage.setItem('texter-content', text);
    }
  }, [text]);

  // Save cursor position whenever it changes
  useEffect(() => {
    if (text.length > 0) {
      localStorage.setItem('texter-cursor-position', cursorPosition.toString());
    }
  }, [cursorPosition, text]);

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
        case "s":
          e.preventDefault();
          handleDownload();
          return;
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
        case "n":
          e.preventDefault();
          createNewDocument();
          return;
        case "f":
          e.preventDefault();
          toggleSearch();
          return;
        case "l":
          e.preventDefault();
          toggleLineNumbers();
          return;
        case "w":
          e.preventDefault();
          toggleWordWrap();
          return;
        case "d":
          e.preventDefault();
          toggleDarkMode();
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
        // Reset lastHorizPosition when moving horizontally
        lastHorizPosition.current = null;

        if (cursorPosition > 0) {
          setCursorPosition((prev) => prev - 1);
        }
        break;
      case "ArrowRight":
        // Reset lastHorizPosition when moving horizontally
        lastHorizPosition.current = null;

        if (cursorPosition < text.length) {
          setCursorPosition((prev) => prev + 1);
        }
        break;
      case "ArrowUp": {
        console.log("ArrowUp pressed, cursor position:", cursorPosition, "text length:", text.length);
        if (textDisplayRef.current) {
          // Get current cursor position in viewport coordinates
          const cursorElement = cursorRef.current;
          if (!cursorElement) break;

          const cursorRect = cursorElement.getBoundingClientRect();
          const targetX = cursorRect.left; // Same horizontal position
          const targetY = cursorRect.top - lineHeightRef.current; // Move up one line based on measured line height

          // Create a range from the point above the cursor
          const position = getPositionFromPoint(targetX, targetY);

          if (position !== -1) {
            setCursorPosition(position);
            console.log("Visual position found for up:", position);
            // Ensure that the cursor becomes visible
            setTimeout(scrollCursorIntoView, 0);
          } else {
            console.log("Falling back to logical line handling for up");
            // Fallback to logical line handling if visual positioning fails
            const textBeforeCursor = text.substring(0, cursorPosition);
            const currentLineStart = textBeforeCursor.lastIndexOf("\n") + 1;
            const currentColumnPosition = cursorPosition - currentLineStart;

            // If we're already at the first line, don't do anything
            if (currentLineStart > 0) {
              const prevLineStart = textBeforeCursor.substring(0, currentLineStart - 1).lastIndexOf("\n") + 1;
              const prevLineEnd = currentLineStart - 1;
              const prevLineLength = prevLineEnd - prevLineStart;

              // Store horizontal position for consistent column navigation
              if (!lastHorizPosition.current) {
                lastHorizPosition.current = currentColumnPosition;
              }

              const targetColumn = lastHorizPosition.current !== null ?
                lastHorizPosition.current :
                currentColumnPosition;
              const newColumn = Math.min(targetColumn, prevLineLength);

              if (prevLineStart >= 0) {
                setCursorPosition(prevLineStart + newColumn);
                // Ensure that the cursor becomes visible after position change
                setTimeout(scrollCursorIntoView, 0);
              }
            }
          }
        }
        break;
      }
      case "ArrowDown": {
        console.log("ArrowDown pressed, cursor position:", cursorPosition, "text length:", text.length);
        if (textDisplayRef.current) {
          // Get current cursor position in viewport coordinates
          const cursorElement = cursorRef.current;

          if (!cursorElement) {
            // Basic fallback if no cursor element
            if (cursorPosition < text.length) {
              // Find the next line break
              const nextLineBreak = text.indexOf('\n', cursorPosition);
              if (nextLineBreak !== -1) {
                setCursorPosition(nextLineBreak + 1);
              }
            }
            break;
          }

          const cursorRect = cursorElement.getBoundingClientRect();
          const targetX = cursorRect.left; // Same horizontal position
          const targetY = cursorRect.top + lineHeightRef.current; // Move down one line based on measured line height

          // Create a range from the point below the cursor
          const position = getPositionFromPoint(targetX, targetY);

          if (position !== -1 && position <= text.length) {
            setCursorPosition(position);
            // We found a valid position, don't need fallback
            console.log("Visual position found:", position);
            // Ensure that the cursor becomes visible
            setTimeout(scrollCursorIntoView, 0);
          } else {
            console.log("Falling back to logical line handling");
            // Fallback to logical line handling
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

            const currentLineStart = text.substring(0, cursorPosition).lastIndexOf("\n") + 1;
            const currentColumnPosition = cursorPosition - currentLineStart;

            // Store horizontal position for consistent column navigation
            if (!lastHorizPosition.current) {
              lastHorizPosition.current = currentColumnPosition;
            }

            // Only move down if we're not on the last line
            if (currentLine < lines.length - 1) {
              // Calculate the position at the start of the next line
              const nextLineStart = charCount + lines[currentLine].length + 1;

              // Handle edge cases where we're at the end of text
              if (nextLineStart < text.length) {
                const nextLineLength = lines[currentLine + 1].length;

                // Use the stored horizontal position or current column
                const targetColumn = lastHorizPosition.current !== null ?
                  lastHorizPosition.current :
                  currentColumnPosition;

                // Make sure we don't go past the end of the next line
                const newColumn = Math.min(targetColumn, nextLineLength);

                // Set the new cursor position
                setCursorPosition(nextLineStart + newColumn);
                // Ensure that the cursor becomes visible after position change
                setTimeout(scrollCursorIntoView, 0);
              }
            }
          }
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
          <span data-before-cursor="true">{beforeCursor}</span>
          <span
            ref={cursorRef}
            className="animate-pulse"
            style={{
              position: 'relative',
              height: `${lineHeightRef.current}px`,
              display: 'inline-block'
            }}
          >|</span>
          <span data-after-cursor="true">{afterCursor}</span>
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
          <span data-before-selection="true">{beforeSelection}</span>
          <span className="bg-blue-500 text-white" data-selection="true">{selection}</span>
          {cursorPosition === end && (
            <span
              ref={cursorRef}
              className="animate-pulse"
              style={{
                position: 'relative',
                height: `${lineHeightRef.current}px`,
                display: 'inline-block'
              }}
            >|</span>
          )}
          <span data-after-selection="true">{afterSelection}</span>
          {cursorPosition !== end && (
            <span
              ref={cursorRef}
              className="animate-pulse"
              style={{
                position: 'relative',
                height: `${lineHeightRef.current}px`,
                display: 'inline-block'
              }}
            >|</span>
          )}
        </>
      );
    }
  }; const handleDownload = () => {
    try {
      if (text.trim().length === 0) {
        showNotification("Nothing to save - document is empty", "warning");
        return;
      }

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

            showNotification("File saved successfully", "success");
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

        showNotification("File downloaded successfully", "success");
      }
    } catch (error) {
      console.error("Download failed:", error);
      showNotification("Cannot download file, please try again", "warning");
    }
  };

  // Calculate word count and reading time
  const getTextStats = () => {
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    // Average reading speed: 200-250 words per minute, using 225 wpm
    const readingTimeMinutes = wordCount / 225;
    let readingTime = '';

    if (readingTimeMinutes < 1) {
      const seconds = Math.ceil(readingTimeMinutes * 60);
      readingTime = `${seconds} sec read`;
    } else {
      const minutes = Math.floor(readingTimeMinutes);
      const seconds = Math.ceil((readingTimeMinutes - minutes) * 60);
      readingTime = seconds > 0 ?
        `${minutes} min ${seconds} sec read` :
        `${minutes} min read`;
    }

    return { wordCount, readingTime };
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('texter-dark-mode', String(newDarkMode));

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    showNotification(`${newDarkMode ? 'Dark' : 'Light'} mode activated`, "info");
  };

  // Toggle line numbers
  const toggleLineNumbers = () => {
    const newValue = !showLineNumbers;
    setShowLineNumbers(newValue);
    localStorage.setItem('texter-show-line-numbers', String(newValue));
    showNotification(`Line numbers ${newValue ? 'enabled' : 'disabled'}`, "info");
  };

  // Toggle word wrap
  const toggleWordWrap = () => {
    const newValue = !wordWrap;
    setWordWrap(newValue);
    localStorage.setItem('texter-word-wrap', String(newValue));
    showNotification(`Word wrap ${newValue ? 'enabled' : 'disabled'}`, "info");
  };

  // Auto-save functionality
  useEffect(() => {
    if (text !== history[historyIndex]) {
      // Clear previous timeout if any
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }

      // Set saving indicator
      setIsSaving(true);

      // Set new timeout for auto-save
      const timeout = setTimeout(() => {
        // Save content to localStorage
        localStorage.setItem('texter-content', text);
        setIsSaving(false);

        // Update history
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(text);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }, 1000); // Delay of 1 second

      setAutoSaveTimeout(timeout);
    }
  }, [text]);

  // Search functionality
  const handleSearch = () => {
    if (!searchText) {
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const matches: number[] = [];
    let startIndex = 0;
    let index: number;

    // Find all occurrences of searchText
    while ((index = text.indexOf(searchText, startIndex)) > -1) {
      matches.push(index);
      startIndex = index + searchText.length;
    }

    setSearchMatches(matches);
    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      setCursorPosition(matches[0]);
      setSelectedText({ start: matches[0], end: matches[0] + searchText.length });
    } else {
      setCurrentMatchIndex(-1);
      showNotification(`No matches found for "${searchText}"`, "info");
    }
  };

  // Navigate between search results
  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchMatches.length === 0) return;

    let newIndex = currentMatchIndex;

    if (direction === 'next') {
      newIndex = (currentMatchIndex + 1) % searchMatches.length;
    } else {
      newIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    }

    setCurrentMatchIndex(newIndex);
    setCursorPosition(searchMatches[newIndex]);
    setSelectedText({
      start: searchMatches[newIndex],
      end: searchMatches[newIndex] + searchText.length
    });

    scrollCursorIntoView();
  };

  // Replace current match
  const replaceMatch = () => {
    if (currentMatchIndex === -1 || searchMatches.length === 0) return;

    const matchPos = searchMatches[currentMatchIndex];
    const before = text.substring(0, matchPos);
    const after = text.substring(matchPos + searchText.length);

    setText(before + replaceText + after);

    // Update matches after replace
    const newMatches = searchMatches.map((pos, idx) => {
      if (idx < currentMatchIndex) return pos;
      if (idx === currentMatchIndex) return pos;
      return pos - searchText.length + replaceText.length;
    });

    setSearchMatches(newMatches);
    setCursorPosition(matchPos + replaceText.length);

    // If we're on the last match, go to the next or reset
    if (currentMatchIndex >= searchMatches.length - 1) {
      setCurrentMatchIndex(0);
    } else {
      navigateSearch('next');
    }
  };

  // Replace all matches
  const replaceAllMatches = () => {
    if (searchMatches.length === 0) return;

    let result = text;
    let offset = 0;

    searchMatches.forEach((pos) => {
      const actualPos = pos + offset;
      result =
        result.substring(0, actualPos) +
        replaceText +
        result.substring(actualPos + searchText.length);

      offset += replaceText.length - searchText.length;
    });

    setText(result);
    setSearchMatches([]);
    setCurrentMatchIndex(-1);

    showNotification(`Replaced ${searchMatches.length} occurrences`, "success");
  };

  // Toggle search panel
  const toggleSearch = () => {
    const newValue = !showSearch;
    setShowSearch(newValue);

    if (newValue) {
      // Focus the search input when opened
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    } else {
      // Clear search state when closed
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      clearSelection();
    }
  };

  // Render line numbers
  const renderLineNumbers = () => {
    if (!showLineNumbers) return null;

    const lines = text.split('\n');
    const lineNumbers = [];

    for (let i = 0; i < lines.length; i++) {
      lineNumbers.push(
        <div key={i} className="text-right pr-2 text-gray-400 select-none">
          {i + 1}
        </div>
      );
    }

    // Always ensure at least one line number is shown
    if (lineNumbers.length === 0) {
      lineNumbers.push(
        <div key="0" className="text-right pr-2 text-gray-400 select-none">
          1
        </div>
      );
    }

    return (
      <div className="mr-2 py-6 bg-gray-50 dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col">
        {lineNumbers}
      </div>
    );
  };

  const getPositionFromPoint = (x: number, y: number): number => {
    const textDisplay = textDisplayRef.current;
    if (!textDisplay) return -1;

    // Check if coordinates are within text display bounds
    const rect = textDisplay.getBoundingClientRect();
    if (y < rect.top || y > rect.bottom || x < rect.left || x > rect.right) {
      console.log("Coordinates out of bounds:", x, y, rect);
      return -1;
    }

    // DOM-based approach that works in modern browsers
    try {
      // Try using the standard DOM method first
      if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(x, y);

        if (range) {
          // Make sure we have a text node
          if (range.startContainer.nodeType === Node.TEXT_NODE) {
            // Calculate text position based on the range
            const tempRange = document.createRange();
            tempRange.setStart(textDisplay, 0);
            tempRange.setEnd(range.startContainer, range.startOffset);

            // Get the text content up to this point
            const beforeText = tempRange.toString();
            return beforeText.length;
          }
        }
      }

      // Fallback to our coordinate-based calculation
      return calculatePositionFromCoordinates(x, y);

    } catch (error) {
      console.error("Error determining position from point:", error);
      // Always fallback to coordinate calculation when DOM methods fail
      return calculatePositionFromCoordinates(x, y);
    }
  };

  // Fallback function to calculate position from coordinates
  const calculatePositionFromCoordinates = (x: number, y: number): number => {
    if (!textDisplayRef.current) return -1;

    const textElement = textDisplayRef.current;
    const content = text;
    const lines = content.split('\n');

    // Calculate line index based on y-coordinate
    const lineHeight = lineHeightRef.current;
    const rect = textElement.getBoundingClientRect();
    const paddingTop = parseFloat(window.getComputedStyle(textElement).paddingTop) || 0;

    const offsetY = y - rect.top - paddingTop;
    let lineIndex = Math.floor(offsetY / lineHeight);

    // Make sure lineIndex is within bounds
    lineIndex = Math.max(0, Math.min(lineIndex, lines.length - 1));

    // Get the padding values
    const paddingLeft = parseFloat(window.getComputedStyle(textElement).paddingLeft) || 0;
    const offsetX = x - rect.left - paddingLeft;

    // Estimate character width based on font settings (this will be approximate)
    const fontSizePx = parseFloat(window.getComputedStyle(textElement).fontSize) || 16;
    const charWidth = fontSizePx * 0.6; // Approximation for monospace font

    console.log(`Pos calculation: line ${lineIndex}, offsetX ${offsetX}, charWidth ${charWidth}`);

    // For non-wrapped text, it's straightforward
    if (!wordWrap) {
      let charCount = 0;
      // Count characters in lines before the target line
      for (let i = 0; i < lineIndex; i++) {
        charCount += lines[i].length + 1; // +1 for the newline
      }

      // For the current line, calculate horizontal position
      const currentLine = lines[lineIndex];
      const charPosition = Math.max(0, Math.floor(offsetX / charWidth));

      return charCount + Math.min(charPosition, currentLine.length);
    }
    // For word wrapped text - more complex calculation
    else {
      // Estimate how many characters fit in a line
      const charsPerVisualLine = Math.max(1, Math.floor((rect.width - paddingLeft * 2) / charWidth));

      // Count characters in all previous logical lines
      let charCount = 0;
      for (let i = 0; i < lineIndex; i++) {
        charCount += lines[i].length + 1; // +1 for the newline
      }

      // For the current logical line
      const currentLine = lines[lineIndex];

      // Calculate which wrapped line within the current logical line we're at
      const visualLineIndex = Math.floor(offsetY % (lineHeight * Math.ceil(currentLine.length / charsPerVisualLine)));
      const visualLineStart = visualLineIndex * charsPerVisualLine;

      // Calculate the horizontal character position within that visual line
      const charPosition = Math.floor(offsetX / charWidth);

      return charCount + Math.min(visualLineStart + charPosition, currentLine.length);
    }
  };

  // Add this function to the component to measure and set line height
  const measureLineHeight = useCallback(() => {
    if (textDisplayRef.current) {
      const styles = window.getComputedStyle(textDisplayRef.current);
      const calculatedLineHeight = parseInt(styles.lineHeight) || 24;
      lineHeightRef.current = calculatedLineHeight;
    }
  }, []);

  // Add this to useEffect where other initializations happen
  useEffect(() => {
    // Add this to the existing useEffect that handles initial setup
    measureLineHeight();

    // Reset lastHorizPosition when moving horizontally
    const resetLastHorizPosition = () => {
      lastHorizPosition.current = null;
    };

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        resetLastHorizPosition();
      }
    });

    return () => {
      document.removeEventListener("keydown", resetLastHorizPosition);
    };
  }, [measureLineHeight]);

  // Add this useEffect to measure line height when text changes
  useEffect(() => {
    if (textDisplayRef.current) {
      measureLineHeight();
    }
  }, [text, measureLineHeight]);

  // Ensure cursor is visible - called after cursor position changes
  const ensureCursorVisible = useCallback(() => {
    const cursorElement = cursorRef.current;
    const textDisplay = textDisplayRef.current;

    if (cursorElement && textDisplay) {
      const cursorRect = cursorElement.getBoundingClientRect();
      const containerRect = textDisplay.getBoundingClientRect();

      console.log("Cursor position check:",
        `cursor(${cursorRect.top}, ${cursorRect.bottom})`,
        `container(${containerRect.top}, ${containerRect.bottom})`);

      // Add some margin to make sure cursor isn't right at the edge
      const margin = Math.max(20, lineHeightRef.current / 2);

      // Check if cursor is outside visible area
      const isCursorAbove = cursorRect.top < containerRect.top + margin;
      const isCursorBelow = cursorRect.bottom > containerRect.bottom - margin;

      if (isCursorAbove) {
        // Scroll up to show cursor with margin
        textDisplay.scrollTop -= (containerRect.top - cursorRect.top + margin);
        console.log("Scrolling up to show cursor");
      } else if (isCursorBelow) {
        // Scroll down to show cursor with margin
        textDisplay.scrollTop += (cursorRect.bottom - containerRect.bottom + margin);
        console.log("Scrolling down to show cursor");
      }

      // Also check horizontal visibility if word wrap is disabled
      if (!wordWrap) {
        const horizontalMargin = margin;
        const isCursorLeft = cursorRect.left < containerRect.left + horizontalMargin;
        const isCursorRight = cursorRect.right > containerRect.right - horizontalMargin;

        if (isCursorLeft) {
          textDisplay.scrollLeft -= (containerRect.left - cursorRect.left + horizontalMargin);
        } else if (isCursorRight) {
          textDisplay.scrollLeft += (cursorRect.right - containerRect.right + horizontalMargin);
        }
      }
    }
  }, [wordWrap]);

  // Ensure cursor visibility whenever cursor position changes
  useEffect(() => {
    // Small timeout to let the DOM update before checking visibility
    const timeout = setTimeout(() => {
      ensureCursorVisible();
    }, 10);

    return () => clearTimeout(timeout);
  }, [cursorPosition, ensureCursorVisible]);

  // Helper function for moving down by logical lines
  const handleArrowDownLogical = () => {
    // Fallback to logical line handling
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

    const currentLineStart = text.substring(0, cursorPosition).lastIndexOf("\n") + 1;
    const currentColumnPosition = cursorPosition - currentLineStart;

    // Store horizontal position for consistent column navigation
    if (!lastHorizPosition.current) {
      lastHorizPosition.current = currentColumnPosition;
    }

    // Only move down if we're not on the last line
    if (currentLine < lines.length - 1) {
      // Calculate the position at the start of the next line
      const nextLineStart = charCount + lines[currentLine].length + 1;

      // Handle edge cases where we're at the end of text
      if (nextLineStart < text.length) {
        const nextLineLength = lines[currentLine + 1].length;

        // Use the stored horizontal position or current column
        const targetColumn = lastHorizPosition.current !== null ?
          lastHorizPosition.current :
          currentColumnPosition;

        // Make sure we don't go past the end of the next line
        const newColumn = Math.min(targetColumn, nextLineLength);

        // Set the new cursor position
        setCursorPosition(nextLineStart + newColumn);
        // Ensure that the cursor becomes visible after position change
        setTimeout(scrollCursorIntoView, 0);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4 relative"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <div className="fixed top-0 left-0 w-full bg-white dark:bg-gray-800 shadow-md py-3 px-4 flex justify-between items-center z-10">
        <h1 className="text-gray-800 dark:text-gray-100 text-2xl font-bold flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Texter
          {isSaving && (
            <span className="ml-3 text-xs text-gray-500 dark:text-gray-400 animate-pulse">
              Saving...
            </span>
          )}
        </h1>

        <div className="flex gap-2">
          {/* New document button */}
          <button
            onClick={createNewDocument}
            className="hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium py-2 px-3 rounded-md transition-colors duration-200 flex items-center border border-gray-300 dark:border-gray-600"
            title="Create new document (Ctrl+N)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New
          </button>

          {/* Upload button */}
          <button
            onClick={triggerFileUpload}
            className="hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium py-2 px-3 rounded-md transition-colors duration-200 flex items-center border border-gray-300 dark:border-gray-600"
            title="Open a text file"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Open
          </button>

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-3 rounded-md transition-colors duration-200 flex items-center shadow-sm"
            title="Save as text file (Ctrl+S)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Save
          </button>

          {/* Search button */}
          <button
            onClick={toggleSearch}
            className={`${showSearch ? 'bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600'} text-gray-800 dark:text-gray-200 font-medium py-2 px-3 rounded-md transition-colors duration-200 flex items-center border`}
            title="Find and replace (Ctrl+F)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search
          </button>

          {/* Settings dropdown */}
          <div className="relative group">
            <button
              className="hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium py-2 px-3 rounded-md transition-colors duration-200 flex items-center border border-gray-300 dark:border-gray-600"
              title="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 border border-gray-200 dark:border-gray-700">
              <div className="p-2">
                <button
                  onClick={toggleDarkMode}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-800 dark:text-gray-200"
                  title="Toggle dark mode (Ctrl+D)"
                >
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                  onClick={toggleLineNumbers}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-800 dark:text-gray-200"
                  title="Toggle line numbers (Ctrl+L)"
                >
                  {showLineNumbers ? 'Hide Line Numbers' : 'Show Line Numbers'}
                </button>
                <button
                  onClick={toggleWordWrap}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-800 dark:text-gray-200"
                  title="Toggle word wrap (Ctrl+W)"
                >
                  {wordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification toast */}
      {notification && (
        <div
          className={`fixed top-20 right-4 p-4 rounded-lg shadow-lg z-50 transition-opacity duration-300 flex items-center
            ${notification.type === 'success' ? 'bg-green-50 text-green-800 border-l-4 border-green-500 dark:bg-green-900/30 dark:text-green-200' :
              notification.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border-l-4 border-yellow-500 dark:bg-yellow-900/30 dark:text-yellow-200' :
                'bg-indigo-50 text-indigo-800 border-l-4 border-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-200'}`}
        >
          <div className="mr-3">
            {notification.type === 'success' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            ) : notification.type === 'warning' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            )}
          </div>
          {notification.message}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Search panel */}
      {showSearch && (
        <div className="fixed top-16 left-0 w-full bg-white dark:bg-gray-800 shadow-md py-3 px-4 flex flex-col md:flex-row gap-3 z-10 border-t border-gray-200 dark:border-gray-700">
          <div className="flex-1 flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Find</label>
              <div className="flex">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  placeholder="Search text..."
                />
                <button
                  onClick={handleSearch}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-r-md transition-colors duration-200"
                >
                  Search
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Replace</label>
              <div className="flex">
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  placeholder="Replace with..."
                />
                <button
                  onClick={replaceMatch}
                  disabled={searchMatches.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 transition-colors duration-200"
                >
                  Replace
                </button>
                <button
                  onClick={replaceAllMatches}
                  disabled={searchMatches.length === 0}
                  className="bg-indigo-700 hover:bg-indigo-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded-r-md transition-colors duration-200"
                >
                  All
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="text-sm text-gray-500 dark:text-gray-400 self-center">
              {searchMatches.length > 0 ? `${currentMatchIndex + 1} of ${searchMatches.length} matches` : 'No matches'}
            </div>
            <button
              onClick={() => navigateSearch('prev')}
              disabled={searchMatches.length === 0}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              ↑
            </button>
            <button
              onClick={() => navigateSearch('next')}
              disabled={searchMatches.length === 0}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-md bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              ↓
            </button>
            <button
              onClick={toggleSearch}
              className="ml-2 px-3 py-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors duration-200"
              title="Close search"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className={`w-full max-w-5xl mx-auto ${showSearch ? 'mt-36' : 'mt-20'} mb-6`}>
        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-2 px-2">
          <div className="flex gap-4">
            <div>{text.length} characters</div>
            <div>{getTextStats().wordCount} words</div>
            <div>{getTextStats().readingTime}</div>
          </div>
          <div>
            Line: {text.substring(0, cursorPosition).split('\n').length},
            Col: {cursorPosition - text.substring(0, cursorPosition).lastIndexOf('\n')}
          </div>
        </div>

        <div className="flex rounded bg-white dark:bg-gray-800 shadow-lg border dark:border-gray-700">
          {/* Line numbers column */}
          {showLineNumbers && renderLineNumbers()}

          {/* Text editor area */}
          <div
            ref={textDisplayRef}
            className="text-gray-800 dark:text-gray-200 text-lg font-mono w-full p-6 flex-1 overflow-auto"
            style={{
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
              overflowWrap: wordWrap ? "break-word" : "normal",
              wordWrap: wordWrap ? "break-word" : "normal",
              wordBreak: wordWrap ? "break-word" : "normal",
              overflowX: wordWrap ? "hidden" : "auto",
              minHeight: "70vh",
              userSelect: "none",
              cursor: "text",
              lineHeight: "1.6",
              letterSpacing: "0.3px",
              tabSize: 4,
              position: "relative"
            }}
            data-testid="text-editor"
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {renderText()}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-3xl px-4">
        <div className="flex items-center"><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+Z</kbd> <span className="ml-1">Undo</span></div>
        <div className="flex items-center"><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+Y</kbd> <span className="ml-1">Redo</span></div>
        <div className="flex items-center"><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+S</kbd> <span className="ml-1">Save</span></div>
        <div className="flex items-center"><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+A</kbd> <span className="ml-1">Select All</span></div>
        <div className="flex items-center"><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+F</kbd> <span className="ml-1">Find</span></div>
      </div>
    </div>
  );
}
