import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  ChevronDown,
  RefreshCw,
  FileCode,
  ShieldAlert,
  TestTube,
  GitFork,
  Layers,
  Move,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { sendAnalysisChatMessage } from '../services/api';

/**
 * Tokenizes and renders inline markdown formatting: code spans, bold, and italic.
 */
function renderInlineMarkdown(text) {
  if (!text) return null;

  const tokens = [];
  let key = 0;
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code
          key={`code-${key++}`}
          className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px] border border-slate-700/60"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={`bold-${key++}`} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push(
        <em key={`em-${key++}`} className="italic text-slate-300">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push(text.substring(lastIndex));
  }

  return tokens;
}

/**
 * Renders structured markdown content including tables, headers, lists, and blockquotes.
 */
function MarkdownMessageContent({ content, isUser }) {
  if (isUser) {
    return (
      <div className="whitespace-pre-wrap select-text font-sans break-words text-[12px]">
        {content}
      </div>
    );
  }

  const lines = (content || '').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check for Markdown table block (starts with | and has at least two pipes)
    if (line.trim().startsWith('|') && line.includes('|', 1)) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

        const startRowIdx = tableLines[1].includes('---') ? 2 : 1;
        const dataRows = tableLines.slice(startRowIdx).map((tl) =>
          tl
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        blocks.push({
          type: 'table',
          headers: headerRow,
          rows: dataRows,
        });
      }
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.replace(/^###\s+/, '') });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.replace(/^##\s+/, '') });
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.replace(/^#\s+/, '') });
      i++;
      continue;
    }
    if (line.startsWith('> ')) {
      blocks.push({ type: 'blockquote', text: line.replace(/^>\s+/, '') });
      i++;
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      blocks.push({ type: 'bullet', text: line.replace(/^[-*•]\s+/, '') });
      i++;
      continue;
    }

    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      blocks.push({ type: 'numbered', num: numMatch[1], text: numMatch[2] });
      i++;
      continue;
    }

    if (line.trim() === '') {
      blocks.push({ type: 'empty' });
    } else {
      blocks.push({ type: 'paragraph', text: line });
    }
    i++;
  }

  return (
    <div className="select-text font-sans break-words text-[12px] space-y-1.5">
      {blocks.map((b, idx) => {
        if (b.type === 'table') {
          return (
            <div
              key={idx}
              className="overflow-x-auto my-2 rounded-lg border border-slate-700/80 bg-slate-950/70 shadow-sm"
            >
              <table className="w-full text-left border-collapse text-[11px] font-sans">
                <thead className="bg-slate-800/90 text-cyan-300 border-b border-slate-700">
                  <tr>
                    {b.headers.map((h, hIdx) => (
                      <th
                        key={hIdx}
                        className="px-2.5 py-1.5 font-semibold text-slate-200 whitespace-nowrap"
                      >
                        {renderInlineMarkdown(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {b.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        rIdx % 2 === 1 ? 'bg-slate-900/40' : ''
                      }`}
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-2.5 py-1.5 text-slate-300 whitespace-nowrap font-sans"
                        >
                          {renderInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (b.type === 'h1' || b.type === 'h2' || b.type === 'h3') {
          return (
            <h4
              key={idx}
              className="font-bold text-slate-100 text-[12px] pt-1 flex items-center gap-1.5"
            >
              {renderInlineMarkdown(b.text)}
            </h4>
          );
        }
        if (b.type === 'blockquote') {
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-cyan-500/70 pl-2.5 my-1.5 text-slate-300 text-[11px] italic bg-cyan-950/20 py-1 rounded-r"
            >
              {renderInlineMarkdown(b.text)}
            </blockquote>
          );
        }
        if (b.type === 'bullet') {
          return (
            <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5 text-slate-300">
              <span className="text-cyan-400 font-bold shrink-0 leading-tight">•</span>
              <span className="flex-1 leading-relaxed">{renderInlineMarkdown(b.text)}</span>
            </div>
          );
        }
        if (b.type === 'numbered') {
          return (
            <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5 text-slate-300">
              <span className="text-cyan-400 font-mono font-semibold shrink-0 leading-tight">
                {b.num}.
              </span>
              <span className="flex-1 leading-relaxed">{renderInlineMarkdown(b.text)}</span>
            </div>
          );
        }
        if (b.type === 'empty') {
          return <div key={idx} className="h-0.5" />;
        }
        return (
          <p key={idx} className="leading-relaxed text-slate-300">
            {renderInlineMarkdown(b.text)}
          </p>
        );
      })}
    </div>
  );
}

export function ChatAssistant({ analysisId, selectedNodeId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        '👋 **Hello! I am ChangeLens AI.**\n\nI have the complete AST dependency graph and blast radius analysis loaded in memory. You can ask me about import relationships ("Kon kisko import kar raha hai?"), potential regression risks, or what tests to run before merging.',
      provider: 'ChangeLens',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Window geometry state
  const DEFAULT_WIDTH = 450;
  const DEFAULT_HEIGHT = 580;
  const MIN_WIDTH = 340;
  const MIN_HEIGHT = 360;

  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [position, setPosition] = useState(null); // { x, y }
  const [isMaximized, setIsMaximized] = useState(false);
  const [preMaximizeState, setPreMaximizeState] = useState(null);

  const windowRef = useRef(null);
  const posRef = useRef({ x: 20, y: 20 });
  const sizeRef = useRef({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const rafId = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => {
    if (position) {
      posRef.current = position;
    }
  }, [position]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  // Initialize position when first opened
  useEffect(() => {
    if (isOpen && !position) {
      const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
      const initialX = Math.max(20, screenWidth - DEFAULT_WIDTH - 460);
      const initialY = Math.max(30, screenHeight - DEFAULT_HEIGHT - 30);
      const initialPos = { x: initialX, y: initialY };
      setPosition(initialPos);
      posRef.current = initialPos;
    }
  }, [isOpen, position]);

  // Handle window resize to keep floating window within bounds
  useEffect(() => {
    const handleWindowResize = () => {
      const maxX = Math.max(10, window.innerWidth - sizeRef.current.width - 10);
      const maxY = Math.max(10, window.innerHeight - sizeRef.current.height - 10);
      const clampedX = Math.min(Math.max(10, posRef.current.x), maxX);
      const clampedY = Math.min(Math.max(10, posRef.current.y), maxY);
      posRef.current = { x: clampedX, y: clampedY };
      setPosition({ x: clampedX, y: clampedY });
      if (windowRef.current) {
        windowRef.current.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
      }
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Butter-smooth GPU-accelerated dragging via requestAnimationFrame
  const handleHeaderMouseDown = (e) => {
    // Ignore interactive controls inside header
    if (e.target.closest('button') || e.target.closest('input')) {
      return;
    }

    e.preventDefault();
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    // If maximized, user can still freely drag!
    if (isMaximized) {
      setIsMaximized(false);
    }

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startX = posRef.current.x;
    const startY = posRef.current.y;
    const currentWidth = sizeRef.current.width;
    const currentHeight = sizeRef.current.height;

    let pendingX = startX;
    let pendingY = startY;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      pendingX = Math.max(10, Math.min(screenWidth - currentWidth - 10, startX + deltaX));
      pendingY = Math.max(10, Math.min(screenHeight - currentHeight - 10, startY + deltaY));

      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          if (windowRef.current) {
            windowRef.current.style.transform = `translate3d(${pendingX}px, ${pendingY}px, 0)`;
          }
          posRef.current = { x: pendingX, y: pendingY };
          rafId.current = null;
        });
      }
    };

    const onMouseUp = () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      // Commit final position to React state
      setPosition({ x: pendingX, y: pendingY });
      posRef.current = { x: pendingX, y: pendingY };
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { once: true });
  };

  // Butter-smooth GPU-accelerated resizing via requestAnimationFrame
  const handleResizeMouseDown = (direction, e) => {
    e.preventDefault();
    e.stopPropagation();

    document.body.style.userSelect = 'none';
    const resizeCursor =
      direction === 'se' || direction === 'nw'
        ? 'nwse-resize'
        : direction === 'sw' || direction === 'ne'
        ? 'nesw-resize'
        : direction === 'e' || direction === 'w'
        ? 'ew-resize'
        : 'ns-resize';
    document.body.style.cursor = resizeCursor;

    // If maximized, user can still freely resize!
    if (isMaximized) {
      setIsMaximized(false);
    }

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startWidth = sizeRef.current.width;
    const startHeight = sizeRef.current.height;
    const startPosX = posRef.current.x;
    const startPosY = posRef.current.y;

    let pendingWidth = startWidth;
    let pendingHeight = startHeight;
    let pendingX = startPosX;
    let pendingY = startPosY;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // Horizontal resizing
      if (direction.includes('e')) {
        pendingWidth = Math.max(MIN_WIDTH, Math.min(screenWidth - startPosX - 10, startWidth + deltaX));
      } else if (direction.includes('w')) {
        const proposedWidth = startWidth - deltaX;
        if (proposedWidth >= MIN_WIDTH) {
          const proposedX = startPosX + deltaX;
          if (proposedX >= 10) {
            pendingWidth = proposedWidth;
            pendingX = proposedX;
          }
        }
      }

      // Vertical resizing
      if (direction.includes('s')) {
        pendingHeight = Math.max(MIN_HEIGHT, Math.min(screenHeight - startPosY - 10, startHeight + deltaY));
      } else if (direction.includes('n')) {
        const proposedHeight = startHeight - deltaY;
        if (proposedHeight >= MIN_HEIGHT) {
          const proposedY = startPosY + deltaY;
          if (proposedY >= 10) {
            pendingHeight = proposedHeight;
            pendingY = proposedY;
          }
        }
      }

      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          if (windowRef.current) {
            windowRef.current.style.width = `${pendingWidth}px`;
            windowRef.current.style.height = `${pendingHeight}px`;
            windowRef.current.style.transform = `translate3d(${pendingX}px, ${pendingY}px, 0)`;
          }
          sizeRef.current = { width: pendingWidth, height: pendingHeight };
          posRef.current = { x: pendingX, y: pendingY };
          rafId.current = null;
        });
      }
    };

    const onMouseUp = () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      // Commit final size and position to React state
      setSize({ width: pendingWidth, height: pendingHeight });
      setPosition({ x: pendingX, y: pendingY });
      sizeRef.current = { width: pendingWidth, height: pendingHeight };
      posRef.current = { x: pendingX, y: pendingY };
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { once: true });
  };

  const handleToggleMaximize = () => {
    if (isMaximized) {
      if (preMaximizeState) {
        setPosition(preMaximizeState.position);
        setSize(preMaximizeState.size);
        posRef.current = preMaximizeState.position;
        sizeRef.current = preMaximizeState.size;
        if (windowRef.current) {
          windowRef.current.style.width = `${preMaximizeState.size.width}px`;
          windowRef.current.style.height = `${preMaximizeState.size.height}px`;
          windowRef.current.style.transform = `translate3d(${preMaximizeState.position.x}px, ${preMaximizeState.position.y}px, 0)`;
        }
      }
      setIsMaximized(false);
    } else {
      setPreMaximizeState({ position: { ...posRef.current }, size: { ...sizeRef.current } });
      const newPos = { x: 20, y: 70 };
      const newSize = {
        width: Math.min(window.innerWidth - 40, 960),
        height: window.innerHeight - 90,
      };
      setPosition(newPos);
      setSize(newSize);
      posRef.current = newPos;
      sizeRef.current = newSize;
      if (windowRef.current) {
        windowRef.current.style.width = `${newSize.width}px`;
        windowRef.current.style.height = `${newSize.height}px`;
        windowRef.current.style.transform = `translate3d(${newPos.x}px, ${newPos.y}px, 0)`;
      }
      setIsMaximized(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build history for context (exclude initial system greeting)
      const history = messages.slice(1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendAnalysisChatMessage(analysisId || 'default', {
        message: query,
        history,
        selectedNodeId,
      });

      const botMsg = {
        role: 'assistant',
        content: res.message,
        provider: res.provider === 'gemini' ? 'Gemini 1.5 Flash' : 'Deterministic AST',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Notice:** ${err.message || 'Failed to process request.'}`,
          provider: 'Error',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const quickPrompts = [
    { label: 'Kon kisko import kar raha hai?', icon: GitFork, prompt: 'kon kisko import kar raha hai' },
    { label: 'Direct vs Transitive impact', icon: Layers, prompt: 'Direct vs Transitive impact mein kya farak hai?' },
    { label: 'Why is this high risk?', icon: ShieldAlert, prompt: 'Why is this change classified as this risk level?' },
    { label: 'What tests to run?', icon: TestTube, prompt: 'What specific unit and integration tests should I write for these affected files?' },
  ];

  if (selectedNodeId) {
    const baseName = selectedNodeId.split('/').pop();
    quickPrompts.unshift({
      label: `Inspect ${baseName}`,
      icon: FileCode,
      prompt: `Explain which files import "${selectedNodeId}" and what it depends on.`,
    });
  }

  return (
    <>
      {/* Floating Trigger Button (Always Fixed in Workspace) */}
      <div className="absolute bottom-4 right-4 z-40 select-none">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-white font-semibold text-xs shadow-xl active:scale-95 transition-all cursor-pointer border whitespace-nowrap ${
            isOpen
              ? 'bg-slate-800/90 border-cyan-500/60 shadow-cyan-500/20 text-cyan-300 ring-2 ring-cyan-500/30'
              : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 shadow-purple-600/30 hover:shadow-cyan-500/40 hover:scale-105 border-white/20'
          }`}
          title={isOpen ? 'Hide ChangeLens AI' : 'Open ChangeLens AI Copilot'}
        >
          <div className="relative">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin-slow" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          </div>
          <span>{isOpen ? 'ChangeLens AI (Open)' : 'Ask ChangeLens AI'}</span>
        </button>
      </div>

      {/* Draggable & Resizable Floating Chat Drawer Window */}
      {isOpen && (
        <aside
          ref={windowRef}
          aria-label="ChangeLens AI Assistant Window"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            transform: `translate3d(${position?.x ?? 20}px, ${position?.y ?? 20}px, 0)`,
            width: `${size.width}px`,
            height: `${size.height}px`,
            zIndex: 50,
            willChange: 'transform, width, height',
          }}
          className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden ring-1 ring-cyan-500/20"
        >
          {/* Edge and Corner Resize Handles (Always Active) */}
          {/* Corner Handles */}
          <div
            onMouseDown={(e) => handleResizeMouseDown('se', e)}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center text-slate-500 hover:text-cyan-400 select-none z-20 group"
            title="Resize window"
          >
            <svg className="w-2.5 h-2.5 rotate-90 opacity-60 group-hover:opacity-100" viewBox="0 0 6 6" fill="currentColor">
              <path d="M6 6H5V5H6V6ZM6 4H5V3H6V4ZM4 6H3V5H4V6ZM6 2H5V1H6V2ZM2 6H1V5H2V6ZM4 4H3V3H4V4Z" />
            </svg>
          </div>
          <div
            onMouseDown={(e) => handleResizeMouseDown('sw', e)}
            className="absolute bottom-0 left-0 w-3.5 h-3.5 cursor-sw-resize z-20"
            title="Resize window"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown('nw', e)}
            className="absolute top-0 left-0 w-3.5 h-3.5 cursor-nw-resize z-20"
            title="Resize window"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown('ne', e)}
            className="absolute top-0 right-0 w-3.5 h-3.5 cursor-ne-resize z-20"
            title="Resize window"
          />

          {/* Edge Handles */}
          <div
            onMouseDown={(e) => handleResizeMouseDown('e', e)}
            className="absolute top-4 bottom-4 right-0 w-2 cursor-e-resize z-10 hover:bg-cyan-500/30 transition-colors"
            title="Resize width"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown('w', e)}
            className="absolute top-4 bottom-4 left-0 w-2 cursor-w-resize z-10 hover:bg-cyan-500/30 transition-colors"
            title="Resize width"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown('s', e)}
            className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize z-10 hover:bg-cyan-500/30 transition-colors"
            title="Resize height"
          />

          {/* Header (Acts as Drag Bar) */}
          <div
            onMouseDown={handleHeaderMouseDown}
            onDoubleClick={handleToggleMaximize}
            className="p-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between cursor-grab active:cursor-grabbing select-none shrink-0"
            title="Drag to move • Double-click to maximize"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center shadow-md shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white tracking-tight">ChangeLens Copilot</h3>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <p className="text-[10px] text-slate-400">Context-Aware AST Assistant</p>
              </div>
            </div>

            {/* Draggable hint icon */}
            <div className="hidden sm:flex items-center gap-1.5 text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded-md bg-slate-900/60 border border-slate-800 text-[10px] font-mono pointer-events-none">
              <Move className="w-2.5 h-2.5 text-cyan-400" />
              <span>Drag to move</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleMaximize}
                title={isMaximized ? 'Restore Size' : 'Maximize Window'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
              >
                {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() =>
                  setMessages([
                    {
                      role: 'assistant',
                      content: 'Chat context refreshed. Ask me any question about the current blast radius!',
                      provider: 'ChangeLens',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ])
                }
                title="Clear Conversation"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Graph Selection Indicator */}
          {selectedNodeId && (
            <div className="px-3.5 py-1.5 bg-cyan-950/40 border-b border-cyan-800/40 text-[11px] text-cyan-300 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1.5 truncate">
                <FileCode className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">
                  Selected Node: <strong className="font-mono">{selectedNodeId}</strong>
                </span>
              </span>
              <span className="text-[10px] text-cyan-400/80 font-mono">In Scope</span>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-6 space-y-3.5 text-xs">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-md bg-purple-600/30 border border-purple-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-purple-300" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-xl p-3 leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-cyan-600 text-white rounded-br-none'
                      : 'bg-slate-950/90 text-slate-200 border border-slate-800 rounded-bl-none'
                  }`}
                >
                  <MarkdownMessageContent content={msg.content} isUser={msg.role === 'user'} />

                  <div className="mt-1.5 pt-1.5 flex items-center justify-between gap-2 text-[10px] opacity-70 border-t border-white/10">
                    <span>{msg.provider ? `⚡ ${msg.provider}` : msg.timestamp}</span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopy(msg.content, i)}
                        className="hover:opacity-100 transition-opacity p-0.5"
                        title="Copy answer"
                      >
                        {copiedIndex === i ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400 hover:text-white" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-md bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-cyan-300" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start items-center text-slate-400 text-xs pl-8">
                <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                <span className="italic">Reasoning over AST dependency graph...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Suggestions */}
          <div className="px-3.5 py-2 bg-slate-950/50 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {quickPrompts.map((qp, idx) => {
              const Icon = qp.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={loading}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-medium flex items-center gap-1 transition-all active:scale-95 disabled:opacity-40"
                >
                  <Icon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{qp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Input Box Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                selectedNodeId
                  ? `Ask about ${selectedNodeId.split('/').pop()} or impact...`
                  : 'Ask about blast radius, tests, or risks...'
              }
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white transition-all shadow-md shadow-cyan-600/20 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
