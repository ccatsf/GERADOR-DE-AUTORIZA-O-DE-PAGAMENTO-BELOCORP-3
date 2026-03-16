import React, { useRef, useState, useEffect, useCallback } from 'react';

type Tool = 'select' | 'pen' | 'rect' | 'ellipse' | 'arrow' | 'text' | 'sticky' | 'eraser';
interface Point { x: number; y: number; }
interface BaseEl { id: string; x: number; y: number; }
interface PathEl  extends BaseEl { type:'path';    points:Point[]; color:string; width:number; }
interface RectEl  extends BaseEl { type:'rect';    w:number; h:number; color:string; fill:string; }
interface EllEl   extends BaseEl { type:'ellipse'; rx:number; ry:number; color:string; fill:string; }
interface ArrowEl extends BaseEl { type:'arrow';   x2:number; y2:number; color:string; }
interface TextEl  extends BaseEl { type:'text';    text:string; color:string; fontSize:number; }
interface StickyEl extends BaseEl { type:'sticky'; text:string; bg:string; w:number; h:number; }
type El = PathEl | RectEl | EllEl | ArrowEl | TextEl | StickyEl;

const STICKY_COLORS = ['#fef08a','#86efac','#93c5fd','#f9a8d4','#fdba74','#c4b5fd','#6ee7b7'];
const STROKE_COLORS = ['#1e293b','#ef4444','#3b82f6','#22c55e','#f59e0b','#a855f7','#ec4899','#ffffff'];
const FILL_COLORS   = ['none','#fef9c3','#dbeafe','#dcfce7','#fce7f3','#fff7ed','#f3e8ff'];
const genId = () => Math.random().toString(36).slice(2,9);

export default function Whiteboard({ onBack }: { onBack: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tool, setTool]           = useState<Tool>('select');
  const [elements, setElements]   = useState<El[]>([]);
  const [drawing, setDrawing]     = useState<El | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText]   = useState('');
  const [strokeColor, setStrokeColor] = useState('#1e293b');
  const [fillColor, setFillColor] = useState('none');
  const [penWidth, setPenWidth]   = useState(2);
  const [stickyColor, setStickyColor] = useState(STICKY_COLORS[0]);
  const [pan, setPan]             = useState<Point>({ x:0, y:0 });
  const [zoom, setZoom]           = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart]   = useState<Point>({ x:0, y:0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x:0, y:0 });
  const [history, setHistory]     = useState<El[][]>([[]]);
  const [histIdx, setHistIdx]     = useState(0);
  const [darkMode, setDarkMode]   = useState(false);
  // eraser stroke: collect ids to erase while holding mouse
  const erasingRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem('wb-els');
    if (saved) try { setElements(JSON.parse(saved)); } catch {}
  }, []);
  useEffect(() => { localStorage.setItem('wb-els', JSON.stringify(elements)); }, [elements]);

  const commit = useCallback((els: El[]) => {
    setElements(els);
    setHistory((h: El[][]) => [...h.slice(0, histIdx + 1), els]);
    setHistIdx((i: number) => i + 1);
  }, [histIdx]);

  const undo = () => { if (histIdx > 0) { setHistIdx(histIdx-1); setElements(history[histIdx-1]); } };
  const redo = () => { if (histIdx < history.length-1) { setHistIdx(histIdx+1); setElements(history[histIdx+1]); } };

  const svgPt = (e: React.MouseEvent): Point => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left - pan.x) / zoom, y: (e.clientY - r.top - pan.y) / zoom };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true); setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); return;
    }
    if (e.button !== 0) return;
    const p = svgPt(e);
    if (tool === 'eraser') { erasingRef.current = true; return; }
    if (tool === 'select') { setSelectedId(null); return; }
    if (tool === 'pen')    { setDrawing({ id:genId(), type:'path', x:0, y:0, points:[p], color:strokeColor, width:penWidth }); return; }
    if (tool === 'rect')   { setDrawing({ id:genId(), type:'rect', x:p.x, y:p.y, w:0, h:0, color:strokeColor, fill:fillColor }); return; }
    if (tool === 'ellipse'){ setDrawing({ id:genId(), type:'ellipse', x:p.x, y:p.y, rx:0, ry:0, color:strokeColor, fill:fillColor }); return; }
    if (tool === 'arrow')  { setDrawing({ id:genId(), type:'arrow', x:p.x, y:p.y, x2:p.x, y2:p.y, color:strokeColor }); return; }
    if (tool === 'text')   { const el: TextEl = { id:genId(), type:'text', x:p.x, y:p.y, text:'', color:strokeColor, fontSize:18 }; commit([...elements, el]); setEditingId(el.id); setEditText(''); return; }
    if (tool === 'sticky') { const el: StickyEl = { id:genId(), type:'sticky', x:p.x, y:p.y, text:'', bg:stickyColor, w:160, h:140 }; commit([...elements, el]); setEditingId(el.id); setEditText(''); return; }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isPanning) { setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); return; }
    if (draggingId) {
      const r = svgRef.current!.getBoundingClientRect();
      const nx = (e.clientX - r.left - pan.x) / zoom - dragOffset.x;
      const ny = (e.clientY - r.top  - pan.y) / zoom - dragOffset.y;
      setElements((prev: El[]) => prev.map((el: El) => el.id === draggingId ? { ...el, x: nx, y: ny } : el));
      return;
    }
    if (!drawing) return;
    const p = svgPt(e);
    if (drawing.type === 'path')    setDrawing({ ...drawing, points: [...drawing.points, p] });
    else if (drawing.type === 'rect')    setDrawing({ ...drawing, w: p.x - drawing.x, h: p.y - drawing.y });
    else if (drawing.type === 'ellipse') setDrawing({ ...drawing, rx: Math.abs(p.x-drawing.x)/2, ry: Math.abs(p.y-drawing.y)/2, x:(p.x+drawing.x)/2, y:(p.y+drawing.y)/2 });
    else if (drawing.type === 'arrow')   setDrawing({ ...drawing, x2: p.x, y2: p.y });
  };

  const onMouseUp = () => {
    setIsPanning(false);
    erasingRef.current = false;
    if (draggingId) {
      // save drag to history
      commit([...elements]);
      setDraggingId(null);
      return;
    }
    if (!drawing) return;
    if (drawing.type === 'path' && drawing.points.length < 2) { setDrawing(null); return; }
    commit([...elements, drawing]);
    setDrawing(null);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z: number) => Math.min(4, Math.max(0.2, z * (e.deltaY > 0 ? 0.9 : 1.1))));
  };

  const onElMouseDown = (e: React.MouseEvent, el: El) => {
    e.stopPropagation();
    if (tool === 'eraser') { commit(elements.filter((x: El) => x.id !== el.id)); return; }
    if (tool === 'select') {
      setSelectedId(el.id);
      const p = svgPt(e);
      setDraggingId(el.id);
      setDragOffset({ x: p.x - el.x, y: p.y - el.y });
    }
  };

  const onElDblClick = (e: React.MouseEvent, el: El) => {
    e.stopPropagation();
    if (el.type === 'text' || el.type === 'sticky') { setEditingId(el.id); setEditText(el.text); }
  };

  const finishEdit = () => {
    if (!editingId) return;
    commit(elements.map((el: El) => el.id === editingId ? { ...el, text: editText } : el));
    setEditingId(null); setEditText('');
  };

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    commit(elements.filter((el: El) => el.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, elements, commit]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      if ((e.ctrlKey||e.metaKey) && e.key==='z') { e.shiftKey ? redo() : undo(); }
      const map: Record<string,Tool> = { v:'select',p:'pen',r:'rect',e:'ellipse',a:'arrow',t:'text',s:'sticky',x:'eraser' };
      if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [deleteSelected, histIdx, history]);

  const renderEl = (el: El, preview = false) => {
    const sel = selectedId === el.id && !preview;
    const base = preview ? {} : {
      onMouseDown: (e: React.MouseEvent) => onElMouseDown(e, el),
      onDoubleClick: (e: React.MouseEvent) => onElDblClick(e, el),
      style: { cursor: tool==='eraser' ? 'crosshair' : tool==='select' ? 'grab' : 'default' },
    };
    const selRect = sel ? <rect x={el.x-4} y={el.y-4} width={
      el.type==='rect' ? Math.abs((el as RectEl).w)+8 :
      el.type==='sticky' ? (el as StickyEl).w+8 : 60
    } height={
      el.type==='rect' ? Math.abs((el as RectEl).h)+8 :
      el.type==='sticky' ? (el as StickyEl).h+8 : 30
    } fill="none" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="5,3" rx={6} pointerEvents="none" /> : null;

    if (el.type === 'path') {
      const d = el.points.map((p,i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
      return <g key={el.id}>{sel && <path d={d} stroke="#6366f1" strokeWidth={el.width+4} fill="none" strokeLinecap="round" opacity={0.3} pointerEvents="none"/>}<path d={d} stroke={el.color} strokeWidth={el.width} fill="none" strokeLinecap="round" strokeLinejoin="round" {...base} /></g>;
    }
    if (el.type === 'rect') {
      const x = el.w<0?el.x+el.w:el.x, y = el.h<0?el.y+el.h:el.y;
      return <g key={el.id}>{selRect}<rect x={x} y={y} width={Math.abs(el.w)} height={Math.abs(el.h)} stroke={el.color} strokeWidth={2} fill={el.fill==='none'?'none':el.fill} rx={4} {...base}/></g>;
    }
    if (el.type === 'ellipse') {
      return <g key={el.id}>{sel && <ellipse cx={el.x} cy={el.y} rx={el.rx+4} ry={el.ry+4} fill="none" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="5,3" pointerEvents="none"/>}<ellipse cx={el.x} cy={el.y} rx={el.rx} ry={el.ry} stroke={el.color} strokeWidth={2} fill={el.fill==='none'?'none':el.fill} {...base}/></g>;
    }
    if (el.type === 'arrow') {
      const dx=el.x2-el.x, dy=el.y2-el.y, len=Math.sqrt(dx*dx+dy*dy)||1;
      const ux=dx/len, uy=dy/len;
      return <g key={el.id} {...base}>
        <line x1={el.x} y1={el.y} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={2}/>
        <polygon points={`${el.x2},${el.y2} ${el.x2-ux*14-uy*7},${el.y2-uy*14+ux*7} ${el.x2-ux*14+uy*7},${el.y2-uy*14-ux*7}`} fill={el.color}/>
      </g>;
    }
    if (el.type === 'text') {
      if (editingId===el.id) return null;
      return <g key={el.id}>{selRect}<text x={el.x} y={el.y} fill={el.color} fontSize={el.fontSize} fontFamily="sans-serif" {...base}>{el.text||'...'}</text></g>;
    }
    if (el.type === 'sticky') {
      if (editingId===el.id) return null;
      return <g key={el.id} {...base} transform={`translate(${el.x},${el.y})`}>
        {sel && <rect x={-4} y={-4} width={el.w+8} height={el.h+8} fill="none" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="5,3" rx={8} pointerEvents="none"/>}
        <rect width={el.w} height={el.h} fill={el.bg} rx={6} filter="url(#shadow)"/>
        <rect width={el.w} height={14} fill="rgba(0,0,0,0.1)" rx={6}/>
        <foreignObject x={8} y={18} width={el.w-16} height={el.h-26}>
          <div style={{fontSize:13,fontFamily:'sans-serif',color:'#1e293b',wordBreak:'break-word',whiteSpace:'pre-wrap',lineHeight:1.4}}>
            {el.text || <span style={{opacity:0.4}}>Duplo clique para editar</span>}
          </div>
        </foreignObject>
      </g>;
    }
    return null;
  };

  const editEl = elements.find((e: El) => e.id === editingId);

  const dm = darkMode;
  const bg      = dm ? '#1a1a2e' : '#f8f9fa';
  const toolbar = dm ? '#16213e' : '#ffffff';
  const border  = dm ? '#2d3561' : '#e2e8f0';
  const txt     = dm ? '#e2e8f0' : '#334155';
  const btnBg   = dm ? '#0f3460' : '#f1f5f9';
  const btnHov  = dm ? '#1a4a7a' : '#e2e8f0';
  const gridCol = dm ? '#2a2a4a' : '#e2e8f0';

  const tools: {id:Tool;icon:string;title:string}[] = [
    {id:'select', icon:'↖', title:'Selecionar (V)'},
    {id:'pen',    icon:'✏️',title:'Caneta (P)'},
    {id:'rect',   icon:'▭', title:'Retângulo (R)'},
    {id:'ellipse',icon:'○', title:'Elipse (E)'},
    {id:'arrow',  icon:'→', title:'Seta (A)'},
    {id:'text',   icon:'T', title:'Texto (T)'},
    {id:'sticky', icon:'📝',title:'Post-it (S)'},
    {id:'eraser', icon:'⌫', title:'Borracha (X)'},
  ];

  return (
    <div className="flex flex-col h-full select-none overflow-hidden" style={{background:bg}}>
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 flex-wrap z-20 shadow-sm"
        style={{background:toolbar, borderBottom:`1px solid ${border}`}}>

        <button onClick={onBack} style={{color:txt,background:btnBg}} className="px-3 py-1.5 rounded-lg text-sm font-bold hover:opacity-80 mr-1">← Voltar</button>

        {/* Tools */}
        <div className="flex items-center gap-0.5 rounded-xl p-1" style={{background:btnBg}}>
          {tools.map(t => (
            <button key={t.id} title={t.title} onClick={() => setTool(t.id)}
              style={{
                background: tool===t.id ? (dm?'#6366f1':'white') : 'transparent',
                color: tool===t.id ? (dm?'white':'#6366f1') : txt,
                boxShadow: tool===t.id ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
              }}
              className="w-9 h-9 rounded-lg text-base flex items-center justify-center transition-all font-bold">
              {t.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-7 mx-1" style={{background:border}}/>

        {/* Stroke */}
        <div className="flex gap-1">
          {STROKE_COLORS.map(c => (
            <button key={c} onClick={() => setStrokeColor(c)}
              className="w-5 h-5 rounded-full transition-transform hover:scale-125"
              style={{backgroundColor:c, border:`2px solid ${strokeColor===c?'#6366f1':border}`}}/>
          ))}
        </div>

        <div className="w-px h-7 mx-1" style={{background:border}}/>

        {/* Fill */}
        <div className="flex gap-1">
          {FILL_COLORS.map(c => (
            <button key={c} onClick={() => setFillColor(c)}
              className="w-5 h-5 rounded transition-transform hover:scale-125"
              style={{
                backgroundColor: c==='none'?'transparent':c,
                backgroundImage: c==='none'?'repeating-linear-gradient(45deg,#aaa 0,#aaa 2px,transparent 0,transparent 50%)':'none',
                backgroundSize:'6px 6px',
                border:`2px solid ${fillColor===c?'#6366f1':border}`,
              }}/>
          ))}
        </div>

        <div className="w-px h-7 mx-1" style={{background:border}}/>

        {/* Pen width */}
        <div className="flex gap-1">
          {[1,2,4,7].map(w => (
            <button key={w} onClick={() => setPenWidth(w)}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{background: penWidth===w ? (dm?'#6366f1':'#e0e7ff') : btnBg}}>
              <div className="rounded-full" style={{width:w*2+4, height:w*2+4, background:dm?'#e2e8f0':'#334155'}}/>
            </button>
          ))}
        </div>

        <div className="w-px h-7 mx-1" style={{background:border}}/>

        {/* Sticky colors */}
        <div className="flex gap-1">
          {STICKY_COLORS.map(c => (
            <button key={c} onClick={() => setStickyColor(c)}
              className="w-5 h-5 rounded transition-transform hover:scale-125"
              style={{backgroundColor:c, border:`2px solid ${stickyColor===c?'#6366f1':border}`}}/>
          ))}
        </div>

        <div className="w-px h-7 mx-1" style={{background:border}}/>

        <button onClick={undo} disabled={histIdx===0}
          style={{background:btnBg,color:txt}} className="px-2.5 py-1.5 text-xs font-bold rounded-lg disabled:opacity-30 hover:opacity-80">↩</button>
        <button onClick={redo} disabled={histIdx>=history.length-1}
          style={{background:btnBg,color:txt}} className="px-2.5 py-1.5 text-xs font-bold rounded-lg disabled:opacity-30 hover:opacity-80">↪</button>

        {selectedId && (
          <button onClick={deleteSelected}
            className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-red-500 text-white hover:bg-red-600">🗑</button>
        )}

        <button onClick={() => { if(confirm('Limpar tudo?')) commit([]); }}
          style={{background:btnBg,color:txt}} className="px-2.5 py-1.5 text-xs font-bold rounded-lg hover:opacity-80 ml-auto">Limpar</button>

        {/* Dark mode toggle */}
        <button onClick={() => setDarkMode((d: boolean) => !d)}
          style={{background: dm?'#6366f1':btnBg, color: dm?'white':txt}}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold hover:opacity-80 transition-all"
          title="Modo noturno">
          {dm ? '☀️' : '🌙'}
        </button>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z:number) => Math.max(0.2,z-0.1))}
            style={{background:btnBg,color:txt}} className="w-7 h-7 rounded font-bold hover:opacity-80">−</button>
          <span style={{color:txt}} className="text-xs font-bold w-11 text-center">{Math.round(zoom*100)}%</span>
          <button onClick={() => setZoom((z:number) => Math.min(4,z+0.1))}
            style={{background:btnBg,color:txt}} className="w-7 h-7 rounded font-bold hover:opacity-80">+</button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden"
        style={{cursor: isPanning?'grabbing': draggingId?'grabbing': tool==='eraser'?'crosshair': tool==='pen'?'crosshair': tool==='select'?'default':'crosshair'}}>

        <svg ref={svgRef} className="w-full h-full"
          onMouseDown={onMouseDown} onMouseMove={onMouseMove}
          onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel}>
          <defs>
            <filter id="shadow" x="-10%" y="-10%" width="130%" height="140%">
              <feDropShadow dx="2" dy="3" stdDeviation="4" floodOpacity={dm?0.4:0.15}/>
            </filter>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x%40},${pan.y%40}) scale(${zoom})`}>
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={gridCol} strokeWidth="0.5"/>
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)"/>

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {elements.map((el: El) => renderEl(el))}
            {drawing && renderEl(drawing, true)}
          </g>
        </svg>

        {/* Inline editor */}
        {editingId && editEl && (() => {
          const r = svgRef.current?.getBoundingClientRect();
          if (!r) return null;
          const sx = editEl.x * zoom + pan.x + r.left;
          const sy = editEl.y * zoom + pan.y + r.top;
          const isSticky = editEl.type === 'sticky';
          return (
            <div style={{position:'fixed', left:sx, top:sy, zIndex:50}}>
              <textarea autoFocus value={editText}
                onChange={e => setEditText(e.target.value)}
                onBlur={finishEdit}
                onKeyDown={e => { if(e.key==='Escape') finishEdit(); }}
                style={{
                  width:  isSticky ? (editEl as StickyEl).w*zoom : 200,
                  height: isSticky ? (editEl as StickyEl).h*zoom : 60,
                  background: isSticky ? (editEl as StickyEl).bg : (dm?'#1e293b':'white'),
                  color: '#1e293b',
                  border:'2px solid #6366f1', borderRadius:6,
                  padding: isSticky ? '20px 8px 8px' : '4px 8px',
                  fontSize: isSticky ? 13*zoom : 18*zoom,
                  fontFamily:'sans-serif', resize:'none', outline:'none',
                  boxShadow:'0 4px 20px rgba(0,0,0,0.2)',
                }}/>
            </div>
          );
        })()}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full shadow pointer-events-none"
          style={{background: dm?'rgba(30,30,60,0.8)':'rgba(255,255,255,0.85)', color: dm?'#94a3b8':'#64748b'}}>
          Alt+arrastar para mover o quadro • Scroll = zoom • Selecionar + arrastar = mover elemento
        </div>
      </div>
    </div>
  );
}
