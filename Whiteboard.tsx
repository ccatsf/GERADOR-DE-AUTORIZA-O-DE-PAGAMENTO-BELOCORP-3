import React, { useRef, useState, useEffect, useCallback } from 'react';

type Tool = 'select' | 'pen' | 'rect' | 'ellipse' | 'arrow' | 'text' | 'sticky' | 'eraser';

interface Point { x: number; y: number; }

interface BaseElement {
  id: string;
  x: number; y: number;
  selected?: boolean;
}
interface PathElement extends BaseElement {
  type: 'path';
  points: Point[];
  color: string;
  width: number;
}
interface RectElement extends BaseElement {
  type: 'rect';
  w: number; h: number;
  color: string;
  fill: string;
}
interface EllipseElement extends BaseElement {
  type: 'ellipse';
  rx: number; ry: number;
  color: string;
  fill: string;
}
interface ArrowElement extends BaseElement {
  type: 'arrow';
  x2: number; y2: number;
  color: string;
}
interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  color: string;
  fontSize: number;
}
interface StickyElement extends BaseElement {
  type: 'sticky';
  text: string;
  bg: string;
  w: number; h: number;
}

type Element = PathElement | RectElement | EllipseElement | ArrowElement | TextElement | StickyElement;

const STICKY_COLORS = ['#fef08a','#86efac','#93c5fd','#f9a8d4','#fdba74','#c4b5fd','#6ee7b7'];
const STROKE_COLORS = ['#1e293b','#ef4444','#3b82f6','#22c55e','#f59e0b','#a855f7','#ec4899','#ffffff'];
const FILL_COLORS   = ['none','#fef9c3','#dbeafe','#dcfce7','#fce7f3','#fff7ed','#f3e8ff'];

const genId = () => Math.random().toString(36).slice(2,9);

interface Props { onBack: () => void; }

export default function Whiteboard({ onBack }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [elements, setElements] = useState<Element[]>([]);
  const [drawing, setDrawing] = useState<Element | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [strokeColor, setStrokeColor] = useState('#1e293b');
  const [fillColor, setFillColor] = useState('none');
  const [penWidth, setPenWidth] = useState(2);
  const [stickyColor, setStickyColor] = useState(STICKY_COLORS[0]);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [history, setHistory] = useState<Element[][]>([[]]);
  const [histIdx, setHistIdx] = useState(0);

  const STORAGE_KEY = 'whiteboard-elements';

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { setElements(JSON.parse(saved)); } catch {} }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
  }, [elements]);

  const commit = useCallback((els: Element[]) => {
    setElements(els);
    setHistory(h => { const n = [...h.slice(0, histIdx + 1), els]; return n; });
    setHistIdx(i => i + 1);
  }, [histIdx]);

  const undo = () => { if (histIdx > 0) { setHistIdx(i => i-1); setElements(history[histIdx-1]); } };
  const redo = () => { if (histIdx < history.length-1) { setHistIdx(i => i+1); setElements(history[histIdx+1]); } };

  const getSVGPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top  - pan.y) / zoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }
    if (e.button !== 0) return;
    const p = getSVGPoint(e);

    if (tool === 'select') {
      setSelectedId(null);
      return;
    }
    if (tool === 'eraser') return;

    if (tool === 'pen') {
      setDrawing({ id: genId(), type: 'path', x: 0, y: 0, points: [p], color: strokeColor, width: penWidth });
      return;
    }
    if (tool === 'rect') {
      setDrawing({ id: genId(), type: 'rect', x: p.x, y: p.y, w: 0, h: 0, color: strokeColor, fill: fillColor });
      return;
    }
    if (tool === 'ellipse') {
      setDrawing({ id: genId(), type: 'ellipse', x: p.x, y: p.y, rx: 0, ry: 0, color: strokeColor, fill: fillColor });
      return;
    }
    if (tool === 'arrow') {
      setDrawing({ id: genId(), type: 'arrow', x: p.x, y: p.y, x2: p.x, y2: p.y, color: strokeColor });
      return;
    }
    if (tool === 'text') {
      const el: TextElement = { id: genId(), type: 'text', x: p.x, y: p.y, text: '', color: strokeColor, fontSize: 18 };
      commit([...elements, el]);
      setEditingId(el.id);
      setEditText('');
      return;
    }
    if (tool === 'sticky') {
      const el: StickyElement = { id: genId(), type: 'sticky', x: p.x, y: p.y, text: '', bg: stickyColor, w: 160, h: 140 };
      commit([...elements, el]);
      setEditingId(el.id);
      setEditText('');
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    if (!drawing) return;
    const p = getSVGPoint(e);
    if (drawing.type === 'path') {
      setDrawing({ ...drawing, points: [...drawing.points, p] });
    } else if (drawing.type === 'rect') {
      setDrawing({ ...drawing, w: p.x - drawing.x, h: p.y - drawing.y });
    } else if (drawing.type === 'ellipse') {
      setDrawing({ ...drawing, rx: Math.abs(p.x - drawing.x)/2, ry: Math.abs(p.y - drawing.y)/2,
        x: (p.x + drawing.x)/2, y: (p.y + drawing.y)/2 });
    } else if (drawing.type === 'arrow') {
      setDrawing({ ...drawing, x2: p.x, y2: p.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (!drawing) return;
    if (drawing.type === 'path' && (drawing as PathElement).points.length < 2) { setDrawing(null); return; }
    commit([...elements, drawing]);
    setDrawing(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(4, Math.max(0.2, z * delta)));
  };

  const handleElementClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tool === 'eraser') {
      commit(elements.filter(el => el.id !== id));
      return;
    }
    if (tool === 'select') setSelectedId(id);
  };

  const handleElementDblClick = (e: React.MouseEvent, el: Element) => {
    e.stopPropagation();
    if (el.type === 'text' || el.type === 'sticky') {
      setEditingId(el.id);
      setEditText(el.text);
    }
  };

  const finishEdit = () => {
    if (!editingId) return;
    commit(elements.map(el => el.id === editingId ? { ...el, text: editText } : el));
    setEditingId(null);
    setEditText('');
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    commit(elements.filter(el => el.id !== selectedId));
    setSelectedId(null);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.shiftKey ? redo() : undo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, elements, histIdx]);

  const renderElement = (el: Element, isPreview = false) => {
    const isSelected = selectedId === el.id && !isPreview;
    const selStyle = isSelected ? { outline: '2px dashed #6366f1', outlineOffset: 4 } : {};

    const handlers = isPreview ? {} : {
      onClick: (e: React.MouseEvent) => handleElementClick(e, el.id),
      onDoubleClick: (e: React.MouseEvent) => handleElementDblClick(e, el),
      style: { cursor: tool === 'eraser' ? 'crosshair' : tool === 'select' ? 'move' : 'default', ...selStyle },
    };

    if (el.type === 'path') {
      const d = el.points.map((p,i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
      return <path key={el.id} d={d} stroke={el.color} strokeWidth={el.width} fill="none" strokeLinecap="round" strokeLinejoin="round" {...handlers} />;
    }
    if (el.type === 'rect') {
      const x = el.w < 0 ? el.x + el.w : el.x;
      const y = el.h < 0 ? el.y + el.h : el.y;
      return <rect key={el.id} x={x} y={y} width={Math.abs(el.w)} height={Math.abs(el.h)} stroke={el.color} strokeWidth={2} fill={el.fill === 'none' ? 'none' : el.fill} rx={4} {...handlers} />;
    }
    if (el.type === 'ellipse') {
      return <ellipse key={el.id} cx={el.x} cy={el.y} rx={el.rx} ry={el.ry} stroke={el.color} strokeWidth={2} fill={el.fill === 'none' ? 'none' : el.fill} {...handlers} />;
    }
    if (el.type === 'arrow') {
      const dx = el.x2 - el.x, dy = el.y2 - el.y;
      const len = Math.sqrt(dx*dx+dy*dy) || 1;
      const ux = dx/len, uy = dy/len;
      const ax = el.x2 - ux*14 - uy*7, ay = el.y2 - uy*14 + ux*7;
      const bx = el.x2 - ux*14 + uy*7, by = el.y2 - uy*14 - ux*7;
      return <g key={el.id} {...handlers}>
        <line x1={el.x} y1={el.y} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={2} />
        <polygon points={`${el.x2},${el.y2} ${ax},${ay} ${bx},${by}`} fill={el.color} />
      </g>;
    }
    if (el.type === 'text') {
      if (editingId === el.id) return null;
      return <text key={el.id} x={el.x} y={el.y} fill={el.color} fontSize={el.fontSize} fontFamily="sans-serif" {...handlers}>{el.text || '...'}</text>;
    }
    if (el.type === 'sticky') {
      if (editingId === el.id) return null;
      return <g key={el.id} {...handlers} transform={`translate(${el.x},${el.y})`}>
        <rect width={el.w} height={el.h} fill={el.bg} rx={6} filter="url(#shadow)" />
        <rect width={el.w} height={12} fill="rgba(0,0,0,0.08)" rx="6 6 0 0" />
        <foreignObject x={8} y={16} width={el.w-16} height={el.h-24}>
          <div style={{ fontSize:13, fontFamily:'sans-serif', color:'#1e293b', wordBreak:'break-word', whiteSpace:'pre-wrap', lineHeight:1.4 }}>
            {el.text || <span style={{opacity:0.4}}>Clique duplo para editar</span>}
          </div>
        </foreignObject>
      </g>;
    }
    return null;
  };

  const getEditingEl = () => elements.find(e => e.id === editingId);

  const tools: { id: Tool; icon: string; title: string }[] = [
    { id: 'select',  icon: '↖',  title: 'Selecionar (V)' },
    { id: 'pen',     icon: '✏️', title: 'Caneta (P)' },
    { id: 'rect',    icon: '▭',  title: 'Retângulo (R)' },
    { id: 'ellipse', icon: '○',  title: 'Elipse (E)' },
    { id: 'arrow',   icon: '→',  title: 'Seta (A)' },
    { id: 'text',    icon: 'T',  title: 'Texto (T)' },
    { id: 'sticky',  icon: '📝', title: 'Post-it (S)' },
    { id: 'eraser',  icon: '⌫',  title: 'Borracha (X)' },
  ];

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const map: Record<string,Tool> = { v:'select', p:'pen', r:'rect', e:'ellipse', a:'arrow', t:'text', s:'sticky', x:'eraser' };
      if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const editEl = getEditingEl();

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] select-none overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-200 shadow-sm z-20 flex-wrap">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 text-sm font-bold mr-2">← Voltar</button>

        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {tools.map(t => (
            <button key={t.id} title={t.title} onClick={() => setTool(t.id)}
              className={`w-9 h-9 rounded-lg text-base flex items-center justify-center transition-all ${tool === t.id ? 'bg-white shadow text-indigo-600 font-bold' : 'text-slate-600 hover:bg-white/70'}`}>
              {t.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-8 bg-slate-200 mx-1" />

        {/* Stroke colors */}
        <div className="flex items-center gap-1">
          {STROKE_COLORS.map(c => (
            <button key={c} onClick={() => setStrokeColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${strokeColor === c ? 'border-indigo-500 scale-110' : 'border-slate-300'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>

        <div className="w-px h-8 bg-slate-200 mx-1" />

        {/* Fill colors */}
        <div className="flex items-center gap-1">
          {FILL_COLORS.map(c => (
            <button key={c} onClick={() => setFillColor(c)}
              className={`w-5 h-5 rounded border-2 transition-transform hover:scale-110 ${fillColor === c ? 'border-indigo-500 scale-110' : 'border-slate-300'}`}
              style={{ backgroundColor: c === 'none' ? 'transparent' : c, backgroundImage: c === 'none' ? 'repeating-linear-gradient(45deg,#ccc 0,#ccc 2px,transparent 0,transparent 50%)' : 'none', backgroundSize: '6px 6px' }} />
          ))}
        </div>

        <div className="w-px h-8 bg-slate-200 mx-1" />

        {/* Pen width */}
        <div className="flex items-center gap-1">
          {[1,2,4,7].map(w => (
            <button key={w} onClick={() => setPenWidth(w)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 ${penWidth === w ? 'bg-slate-200' : ''}`}>
              <div className="rounded-full bg-slate-700" style={{ width: w*2+4, height: w*2+4 }} />
            </button>
          ))}
        </div>

        <div className="w-px h-8 bg-slate-200 mx-1" />

        {/* Sticky colors */}
        <div className="flex items-center gap-1">
          {STICKY_COLORS.map(c => (
            <button key={c} onClick={() => setStickyColor(c)}
              className={`w-5 h-5 rounded border-2 transition-transform hover:scale-110 ${stickyColor === c ? 'border-indigo-500 scale-110' : 'border-slate-300'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>

        <div className="w-px h-8 bg-slate-200 mx-1" />

        <button onClick={undo} disabled={histIdx === 0} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30">↩ Desfazer</button>
        <button onClick={redo} disabled={histIdx >= history.length-1} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30">↪ Refazer</button>
        {selectedId && <button onClick={deleteSelected} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-100 text-red-600 hover:bg-red-200">🗑 Deletar</button>}
        <button onClick={() => { if(confirm('Limpar tudo?')) commit([]); }} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 ml-auto">Limpar</button>

        <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
          <button onClick={() => setZoom(z => Math.max(0.2, z-0.1))} className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200">−</button>
          <span className="w-12 text-center">{Math.round(zoom*100)}%</span>
          <button onClick={() => setZoom(z => Math.min(4, z+0.1))} className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200">+</button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden"
        style={{ cursor: isPanning ? 'grabbing' : tool === 'pen' || tool === 'eraser' ? 'crosshair' : tool === 'select' ? 'default' : 'crosshair' }}>

        <svg ref={svgRef} className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}>

          <defs>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="2" dy="3" stdDeviation="3" floodOpacity="0.15" />
            </filter>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x % 40},${pan.y % 40}) scale(${zoom})`}>
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {elements.map(el => renderElement(el))}
            {drawing && renderElement(drawing, true)}
          </g>
        </svg>

        {/* Inline text/sticky editor */}
        {editingId && editEl && (() => {
          const svg = svgRef.current;
          if (!svg) return null;
          const rect = svg.getBoundingClientRect();
          const sx = editEl.x * zoom + pan.x + rect.left;
          const sy = editEl.y * zoom + pan.y + rect.top;
          const isSticky = editEl.type === 'sticky';
          return (
            <div style={{ position:'fixed', left: sx, top: sy, zIndex: 50 }}>
              <textarea
                autoFocus
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onBlur={finishEdit}
                onKeyDown={e => { if (e.key === 'Escape') finishEdit(); }}
                style={{
                  width: isSticky ? (editEl as StickyElement).w * zoom : 200,
                  height: isSticky ? (editEl as StickyElement).h * zoom : 60,
                  background: isSticky ? (editEl as StickyElement).bg : 'white',
                  border: '2px solid #6366f1',
                  borderRadius: 6,
                  padding: isSticky ? '20px 8px 8px' : '4px 8px',
                  fontSize: isSticky ? 13 * zoom : 18 * zoom,
                  fontFamily: 'sans-serif',
                  resize: 'none',
                  outline: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }}
              />
            </div>
          );
        })()}

        {/* Hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-slate-400 bg-white/80 px-3 py-1 rounded-full shadow pointer-events-none">
          Alt+arrastar ou botão do meio para mover • Scroll para zoom • Duplo clique em texto/post-it para editar
        </div>
      </div>
    </div>
  );
}
