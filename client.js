window.__ModuleLoader__.load({
  id: '@civnir/dsh-image-studio',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'image-studio';
    const PANEL_ID = 'image-studio';
    const ROUTE = '/api/image-studio';
    const MODEL_KEY = 'image-studio.model';
    const WATERMARK_KEY = 'image-studio.watermark';

    const FILE_URL = (name) => ROUTE + '/file/' + encodeURIComponent(name);

    /** Fetch one JSON endpoint, surfacing the host's message on failure. */
    async function call(pathname, init) {
      const response = await fetch(ROUTE + pathname, { redirect: 'error', ...init });
      let payload = null;
      try { payload = await response.json(); } catch { /* empty or non-JSON body */ }
      if (!response.ok) {
        const message = payload !== null && typeof payload === 'object' && typeof payload.message === 'string'
          ? payload.message
          : 'HTTP ' + response.status;
        throw new Error(message);
      }
      return payload;
    }

    function readSaved(key, fallback) {
      try { const value = localStorage.getItem(key); return value === null ? fallback : value; } catch { return fallback; }
    }

    function saveValue(key, value) {
      try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
    }

    function formatSeconds(ms) {
      if (typeof ms !== 'number' || ms < 0) return '';
      return (ms / 1000).toFixed(1) + 's';
    }

    const BrushIcon = ({ size }) => h('svg', {
      width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true,
      fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round',
    },
      h('path', { d: 'M3.2 12.8c1.1.2 2-.2 2.5-1.1.4-.8.2-1.6-.4-2.1-.7-.6-1.8-.5-2.4.3-.5.7-.5 1.7.3 2.9Z' }),
      h('path', { d: 'M6.4 9.4 11.9 3.9a1.6 1.6 0 0 1 2.2 2.2L8.6 11.6' }),
      h('path', { d: 'M4.4 12.2 6.4 9.4' }),
    );

    /**
     * Outlined field whose label rests inside the box and floats onto the border
     * once the field is focused or filled — saves the separate label row.
     */
    function FloatField(props) {
      const { label, value, onChange, inputMode, disabled, title, wide } = props;
      const filled = value !== null && value !== undefined && String(value) !== '';
      return h('label', {
        className: 'is-float' + (filled ? ' is-filled' : '') + (wide ? ' is-wide' : ''),
        title: title || label,
      },
        h('input', {
          className: 'is-float-input',
          value: value === null || value === undefined ? '' : String(value),
          inputMode,
          disabled,
          onChange,
        }),
        h('span', { className: 'is-float-label' }, label),
      );
    }

    const GearIcon = ({ size }) => h('svg', {
      width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true,
      fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round',
    },
      h('circle', { cx: 8, cy: 8, r: 2.2 }),
      h('path', { d: 'M13.2 9.6a1 1 0 0 1 .2 1.1l-.5.9a1 1 0 0 1-1.1.4l-1-.3a3.6 3.6 0 0 1-.9.5l-.2 1a1 1 0 0 1-1 .8h-1a1 1 0 0 1-1-.8l-.2-1a3.6 3.6 0 0 1-.9-.5l-1 .3a1 1 0 0 1-1.1-.4l-.5-.9a1 1 0 0 1 .2-1.1l.7-.7a3.6 3.6 0 0 1 0-1.1l-.7-.7A1 1 0 0 1 2.3 5l.5-.9a1 1 0 0 1 1.1-.4l1 .3a3.6 3.6 0 0 1 .9-.5l.2-1a1 1 0 0 1 1-.8h1a1 1 0 0 1 1 .8l.2 1c.3.1.6.3.9.5l1-.3a1 1 0 0 1 1.1.4l.5.9a1 1 0 0 1-.2 1.1l-.7.7a3.6 3.6 0 0 1 0 1.1Z' }),
    );

    /** Multi-line sibling of FloatField: the label rests on the first text line. */
    function FloatArea(props) {
      const { label, value, onChange, disabled, title, wide } = props;
      const filled = value !== null && value !== undefined && String(value) !== '';
      return h('label', {
        className: 'is-float is-float-area' + (filled ? ' is-filled' : '') + (wide ? ' is-wide' : ''),
        title: title || label,
      },
        h('textarea', {
          className: 'is-float-input is-float-textarea',
          value: value === null || value === undefined ? '' : String(value),
          disabled,
          onChange,
        }),
        h('span', { className: 'is-float-label' }, label),
      );
    }

    const CSS = [
      '.is-root{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);background:var(--dsw-alias-bg-base)}',
      '.is-top{flex:none;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 16px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.is-brand{font-size:var(--dsw-font-s-14,14px);font-weight:600;letter-spacing:.01em;margin-right:4px}',
      '.is-spacer{flex:1 1 auto;min-width:0}',
      '.is-badge{font-size:12px;padding:2px 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1);white-space:nowrap}',
      '.is-badge-btn{cursor:pointer;font:inherit}',
      '.is-badge-btn:hover{filter:brightness(.97)}',
      '.is-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border-radius:var(--dsw-radius-sm);border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;flex:none}',
      '.is-iconbtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.is-iconbtn-on{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}',
      '.is-pop{position:absolute;top:46px;right:16px;z-index:40;width:308px;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;padding:12px 14px;border-radius:var(--dsw-radius-md);border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);box-shadow:var(--dsw-elevation-prominent,0 8px 24px rgba(0,0,0,.18))}',
      '.is-pop-head{display:flex;align-items:center;gap:8px}',
      '.is-pop-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.is-pop-x{width:20px;height:20px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:14px;cursor:pointer}',
      '.is-pop-x:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.is-pop-row{display:flex;gap:6px}',
      '.is-pop-input{box-sizing:border-box;width:100%;min-width:0;font:inherit;font-size:11px;padding:7px 9px;border-radius:var(--dsw-radius-sm);border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);outline:none}',
      '.is-pop-input:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px var(--dsw-focus-ring-color)}',
      '.is-pop-note{font-size:10px;line-height:1.45;color:var(--dsw-alias-label-tertiary)}',
      '.is-pop-actions{display:flex;gap:8px;margin-top:2px}',
      '.is-btn{font:inherit;font-size:11px;padding:6px 12px;border-radius:var(--dsw-radius-sm);border:1px solid transparent;cursor:pointer;white-space:nowrap}',
      '.is-btn:disabled{opacity:.5;cursor:not-allowed}',
      '.is-btn-primary{background:var(--dsw-alias-state-business-primary);color:#fff}',
      '.is-btn-primary:hover:not(:disabled){filter:brightness(1.06)}',
      '.is-btn-ghost{background:transparent;color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-border-l2)}',
      '.is-btn-ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.is-badge-warn{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}',
      '.is-compose{flex:none;display:flex;gap:10px;padding:12px 16px 0;align-items:stretch}',
      '.is-prompt{box-sizing:border-box;flex:1 1 auto;min-width:0;font:inherit;font-size:var(--dsw-font-xxxs-11,11px);line-height:1.55;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);padding:9px 11px;outline:none;min-height:76px;max-height:190px;resize:vertical}',
      '.is-prompt:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px var(--dsw-focus-ring-color)}',
      '.is-go{flex:none;width:104px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font:inherit;font-size:var(--dsw-font-xxxs-11,11px);font-weight:600;border-radius:var(--dsw-radius-md);border:1px solid transparent;background:var(--dsw-alias-state-business-primary);color:#fff;cursor:pointer}',
      '.is-go:disabled{opacity:.42;cursor:not-allowed}',
      '.is-go:hover:not(:disabled){filter:brightness(1.07)}',
      '.is-go-hint{font-size:10px;font-weight:400;opacity:.85}',
      '.is-float{position:relative;display:block;box-sizing:border-box;min-width:0;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1)}',
      '.is-float:focus-within{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px var(--dsw-focus-ring-color)}',
      '.is-float-input{box-sizing:border-box;width:100%;min-width:0;font:inherit;font-size:var(--dsw-font-xxxs-11,11px);color:var(--dsw-alias-label-primary);background:transparent;border:none;outline:none;padding:14px 9px 5px}',
      '.is-float-input:disabled{opacity:.55;cursor:not-allowed}',
      '.is-float-textarea{resize:vertical;min-height:58px;line-height:1.5;padding:14px 9px 6px}',
      '.is-float-area .is-float-label{top:22px}',
      '.is-float-area:focus-within .is-float-label,.is-float-area.is-filled .is-float-label{top:0}',
      '.is-float-label{position:absolute;left:9px;top:50%;transform:translateY(-50%);font-size:14px;font-weight:400;line-height:1;color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-base);padding:0 4px;border-radius:2px;white-space:nowrap;pointer-events:none;transition:top .12s ease,font-size .12s ease,transform .12s ease,color .12s ease}',
      '.is-float:focus-within .is-float-label,.is-float.is-filled .is-float-label{top:0;transform:translateY(-50%);font-size:14px;font-weight:400}',
      '.is-float:focus-within .is-float-label{color:var(--dsw-alias-label-secondary)}',
      '.is-advanced{flex:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 14px;padding:10px 16px 0}',
      '.is-advanced[hidden]{display:none}',
      '.is-wide{grid-column:1/-1}',
      '.is-field{display:flex;flex-direction:column;gap:5px;min-width:0}',
      '.is-label{font-size:10px;color:var(--dsw-alias-label-tertiary);letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.is-note{font-size:10px;line-height:1.4;color:var(--dsw-alias-label-tertiary)}',
      '.is-input,.is-select,.is-mini{box-sizing:border-box;width:100%;font:inherit;font-size:var(--dsw-font-xxxs-11,11px);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);padding:6px 8px;outline:none;min-width:0}',
      '.is-input:focus,.is-select:focus,.is-mini:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px var(--dsw-focus-ring-color)}',
      '.is-input:disabled,.is-select:disabled,.is-mini:disabled,.is-prompt:disabled{opacity:.55;cursor:not-allowed}',
      '.is-mini{min-height:54px;resize:vertical;line-height:1.5}',
      '.is-top .is-select{width:auto;max-width:230px;padding:5px 8px;font-size:var(--dsw-font-xxxs-11,11px)}',
      '.is-switch{display:inline-flex;align-items:center;gap:6px;font-size:var(--dsw-font-xxxs-11,11px);color:var(--dsw-alias-label-secondary);cursor:pointer;user-select:none;white-space:nowrap}',
      '.is-switch input{appearance:none;-webkit-appearance:none;flex:none;width:30px;height:17px;border-radius:999px;background:var(--dsw-alias-border-l2);position:relative;cursor:pointer;border:none;outline:none;margin:0;transition:background .15s}',
      '.is-switch input:checked{background:var(--dsw-alias-state-business-primary)}',
      '.is-switch input:disabled{opacity:.5;cursor:not-allowed}',
      '.is-switch input::after{content:"";position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:#fff;transition:transform .15s}',
      '.is-switch input:checked::after{transform:translateX(13px)}',
      '.is-toggle{font:inherit;font-size:var(--dsw-font-xxxs-11,11px);padding:5px 10px;border-radius:var(--dsw-radius-sm);border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px}',
      '.is-toggle[aria-expanded="true"]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.is-status{flex:none;display:flex;flex-direction:column;gap:4px;padding:8px 16px 0}',
      '.is-status:empty{display:none}',
      '.is-error{font-size:var(--dsw-font-xxxs-11,11px);line-height:1.5;color:var(--dsw-alias-state-error-primary);word-break:break-word}',
      '.is-notice{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}',
      '.is-body{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 240px;padding:12px 16px 16px;gap:12px}',
      '.is-canvas{min-width:0;min-height:0;display:flex;flex-direction:column;gap:10px}',
      '.is-stage{flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-lg);padding:10px;overflow:hidden;position:relative}',
      '.is-stage img{max-width:100%;max-height:100%;object-fit:contain;display:block;border-radius:var(--dsw-radius-sm)}',
      '.is-placeholder{display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--dsw-alias-label-tertiary);font-size:var(--dsw-font-xxxs-11,11px);text-align:center;padding:24px}',
      '.is-spinner{width:22px;height:22px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-state-business-primary);animation:is-spin .8s linear infinite}',
      '@keyframes is-spin{to{transform:rotate(360deg)}}',
      '.is-meta{flex:none;display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-height:0}',
      '.is-chip{font-size:10px;padding:2px 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);white-space:nowrap}',
      '.is-act{font:inherit;font-size:var(--dsw-font-xxxs-11,11px);padding:4px 10px;border-radius:var(--dsw-radius-sm);border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;text-decoration:none;white-space:nowrap}',
      '.is-act:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.is-act-danger:hover{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}',
      '.is-strip{flex:none;display:flex;gap:8px;overflow-x:auto;padding-bottom:2px}',
      '.is-strip img{width:64px;height:64px;object-fit:cover;border-radius:var(--dsw-radius-sm);border:1px solid var(--dsw-alias-border-l1);cursor:pointer;display:block}',
      '.is-strip img.is-on{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary)}',
      '.is-rail{min-width:0;min-height:0;display:flex;flex-direction:column;gap:8px;border-left:1px solid var(--dsw-alias-border-l1);padding-left:12px}',
      '.is-rail-head{flex:none;display:flex;align-items:center;gap:8px}',
      '.is-rail-title{font-size:var(--dsw-font-xxxs-11,11px);font-weight:600;color:var(--dsw-alias-label-secondary)}',
      '.is-rail-list{flex:1 1 auto;min-height:0;overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-content:start}',
      '.is-thumb{position:relative;aspect-ratio:1/1;padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);overflow:hidden;background:var(--dsw-alias-bg-layer-1);cursor:pointer}',
      '.is-thumb img{width:100%;height:100%;object-fit:cover;display:block}',
      '.is-thumb:hover{border-color:var(--dsw-alias-border-l3)}',
      '.is-thumb.is-on{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary)}',
      '.is-thumb-x{position:absolute;top:3px;right:3px;width:18px;height:18px;line-height:1;display:flex;align-items:center;justify-content:center;border-radius:50%;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:var(--dsw-font-xxxs-11,11px);cursor:pointer;opacity:0;transition:opacity .12s}',
      '.is-thumb:hover .is-thumb-x{opacity:1}',
      '.is-act-on{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l3)}',
      '.is-promptview{flex:none;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);padding:8px 10px;max-height:132px;overflow:auto}',
      '.is-pv-head{display:flex;align-items:center;gap:8px;margin-bottom:5px}',
      '.is-pv-title{font-size:10px;font-weight:600;color:var(--dsw-alias-label-secondary)}',
      '.is-pv-text{font-size:var(--dsw-font-xxxs-11,11px);line-height:1.55;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-secondary)}',
      '.is-pv-neg{margin-top:6px;padding-top:6px;border-top:1px dashed var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary)}',
      '.is-pv-tag{display:inline-block;margin-right:6px;padding:0 6px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);font-size:10px}',
      '.is-thumb-reuse{top:3px;left:3px;right:auto}',
      '@media (max-width:760px){.is-advanced{grid-template-columns:repeat(auto-fit,minmax(112px,1fr))}}',
      '@media (max-width:980px){.is-body{grid-template-columns:minmax(0,1fr)}.is-rail{border-left:none;border-top:1px solid var(--dsw-alias-border-l1);padding-left:0;padding-top:10px;max-height:190px}.is-compose{flex-wrap:wrap}.is-go{width:100%}}',
    ].join('');

    function ImageStudioPage(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key;

      const [catalog, setCatalog] = React.useState(null);
      const [loadError, setLoadError] = React.useState('');
      const [modelId, setModelId] = React.useState('');
      const [prompt, setPrompt] = React.useState('');
      const [negative, setNegative] = React.useState('');
      const [size, setSize] = React.useState('');
      const [count, setCount] = React.useState(1);
      const [seed, setSeed] = React.useState('');
      const [steps, setSteps] = React.useState('');
      const [guidance, setGuidance] = React.useState('');
      const [cfg, setCfg] = React.useState('');
      const [advancedOpen, setAdvancedOpen] = React.useState(false);
      const [watermark, setWatermark] = React.useState(() => readSaved(WATERMARK_KEY, '1') !== '0');
      const [busy, setBusy] = React.useState(false);
      const [elapsed, setElapsed] = React.useState(0);
      const [error, setError] = React.useState('');
      const [notice, setNotice] = React.useState('');
      const [items, setItems] = React.useState([]);
      const [history, setHistory] = React.useState([]);
      const [preview, setPreview] = React.useState(null);
      const [promptOpen, setPromptOpen] = React.useState(false);
      const [keyOpen, setKeyOpen] = React.useState(false);
      const [keyValue, setKeyValue] = React.useState('');
      const [keyInfo, setKeyInfo] = React.useState(null);
      const [keyBusy, setKeyBusy] = React.useState(false);
      const [keyError, setKeyError] = React.useState('');
      const pendingRecord = React.useRef(null);
      const textareaRef = React.useRef(null);

      const models = catalog !== null && Array.isArray(catalog.models) ? catalog.models : [];
      const model = models.find((entry) => entry.id === modelId) ?? null;
      const extras = model === null ? [] : model.params.filter((key) => ['cfg', 'guidance_scale'].includes(key));

      const refreshHistory = React.useCallback(async () => {
        try {
          const payload = await call('/history?limit=120');
          const next = payload !== null && Array.isArray(payload.items) ? payload.items : [];
          setHistory(next);
          return next;
        } catch {
          return [];
        }
      }, []);

      React.useEffect(() => {
        let disposed = false;
        (async () => {
          try {
            const payload = await call('/config');
            if (disposed) return;
            setCatalog(payload);
            const saved = readSaved(MODEL_KEY, '');
            const known = Array.isArray(payload.models) ? payload.models : [];
            setModelId(known.some((entry) => entry.id === saved) ? saved : payload.defaultModel);
            await refreshHistory();
          } catch (failure) {
            if (!disposed) setLoadError(failure.message);
          }
        })();
        return () => { disposed = true; };
      }, [refreshHistory]);

      /** Copy one record's generation parameters onto the form. */
      const applyRecordFields = (record, targetModel) => {
        const sizes = Array.isArray(targetModel?.sizes) ? targetModel.sizes.map((entry) => entry.value) : [];
        setSize(sizes.includes(record.size) ? record.size : (targetModel?.defaultSize ?? record.size ?? ''));
        setSeed(record.seed === null || record.seed === undefined ? '' : String(record.seed));
        setSteps(record.steps === null || record.steps === undefined ? String(targetModel?.defaults?.steps ?? '') : String(record.steps));
        setGuidance(record.guidanceScale === null || record.guidanceScale === undefined ? '' : String(record.guidanceScale));
        setCfg(record.cfg === null || record.cfg === undefined ? String(targetModel?.defaults?.cfg ?? '') : String(record.cfg));
      };

      /** Reuse a history record: refill the prompt (editable) without submitting. */
      const reuseRecord = (record) => {
        if (record === null || record === undefined) return;
        const target = models.find((entry) => entry.id === record.model) ?? null;
        setPrompt(record.prompt ?? '');
        setNegative(record.negativePrompt ?? '');
        setError('');
        setNotice(t('promptLoaded'));
        setPromptOpen(false);
        if (target !== null && target.id !== modelId) {
          // The model effect below consumes this and applies the record instead of defaults.
          pendingRecord.current = record;
          setModelId(target.id);
        } else {
          applyRecordFields(record, target);
        }
        // Focus after the state flush so typing can continue immediately.
        setTimeout(() => { try { textareaRef.current?.focus(); } catch { /* detached */ } }, 0);
      };

      // Switching models re-seeds parameters: from the pending record when one is
      // being reused, otherwise from that model's own defaults.
      React.useEffect(() => {
        if (model === null) return;
        const pending = pendingRecord.current;
        pendingRecord.current = null;
        saveValue(MODEL_KEY, model.id);
        if (pending !== null) {
          applyRecordFields(pending, model);
          return;
        }
        setSize(model.defaultSize);
        setSteps(String(model.defaults?.steps ?? ''));
        setGuidance(model.params.includes('guidance_scale') ? String(model.defaults?.guidanceScale ?? '') : '');
        setCfg(model.params.includes('cfg') ? String(model.defaults?.cfg ?? '') : '');
      }, [model]);

      // A different preview closes the prompt panel.
      React.useEffect(() => { setPromptOpen(false); }, [preview === null ? '' : preview.name]);

      const setWatermarkChoice = React.useCallback((next) => {
        setWatermark(next);
        saveValue(WATERMARK_KEY, next ? '1' : '0');
      }, []);

      const generate = React.useCallback(async () => {
        if (model === null || busy) return;
        setBusy(true);
        setError('');
        setNotice('');
        setElapsed(0);
        // Clear the composer as soon as generation starts; restored below if it fails
        // and the user has not typed a replacement yet.
        const submittedPrompt = prompt;
        setPrompt('');
        const startedAt = Date.now();
        const timer = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 100) / 10), 200);
        try {
          const payload = await call('/generate', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              model: model.id,
              prompt,
              negativePrompt: negative,
              size,
              count,
              seed: seed === '' ? null : seed,
              steps: steps === '' ? null : steps,
              guidanceScale: guidance === '' ? null : guidance,
              cfg: cfg === '' ? null : cfg,
              watermark,
            }),
          });
          const produced = payload !== null && Array.isArray(payload.items) ? payload.items : [];
          setItems(produced);
          setPreview(produced[0] ?? null);
          if (Array.isArray(payload?.failures) && payload.failures.length > 0) {
            setError(t('partialFailure', { message: payload.failures.map((item) => item.message).join('；') }));
          }
          await refreshHistory();
        } catch (failure) {
          setError(failure.message);
          setPrompt((current) => (current === '' ? submittedPrompt : current));
        } finally {
          clearInterval(timer);
          setBusy(false);
        }
      }, [model, busy, prompt, negative, size, count, seed, steps, guidance, cfg, watermark, refreshHistory, t]);

      const remove = React.useCallback(async (record) => {
        try {
          await call('/history/' + encodeURIComponent(record.name), { method: 'DELETE' });
          setHistory((current) => current.filter((entry) => entry.name !== record.name));
          setItems((current) => current.filter((entry) => entry.name !== record.name));
          setPreview((current) => (current !== null && current.name === record.name ? null : current));
        } catch (failure) {
          setError(failure.message);
        }
      }, []);

      const copyPrompt = React.useCallback(async (record) => {
        try {
          await navigator.clipboard.writeText(record.prompt ?? '');
          setNotice(t('copied'));
        } catch {
          setError(t('copyFailed'));
        }
      }, [t]);

      const loadKeyStatus = React.useCallback(async () => {
        try { setKeyInfo(await call('/key')); } catch (failure) { setKeyError(failure.message); }
      }, []);

      const refreshCatalog = React.useCallback(async () => {
        try { setCatalog(await call('/config')); } catch { /* keep the previous catalog */ }
      }, []);

      const saveKey = React.useCallback(async () => {
        if (keyBusy) return;
        const value = keyValue.trim();
        if (value === '') { setKeyError(t('keyEmpty')); return; }
        setKeyBusy(true);
        setKeyError('');
        try {
          await call('/key', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ apiKey: value }),
          });
          setKeyValue('');
          setKeyInfo(await call('/key'));
          await refreshCatalog();
          setNotice(t('keySaved'));
          setKeyOpen(false);
        } catch (failure) {
          setKeyError(failure.message);
        } finally {
          setKeyBusy(false);
        }
      }, [keyBusy, keyValue, refreshCatalog, t]);

      const clearKey = React.useCallback(async () => {
        if (keyBusy) return;
        setKeyBusy(true);
        setKeyError('');
        try {
          await call('/key', { method: 'DELETE' });
          setKeyInfo({ configured: false, source: null });
          await refreshCatalog();
          setNotice(t('keyCleared'));
        } catch (failure) {
          setKeyError(failure.message);
        } finally {
          setKeyBusy(false);
        }
      }, [keyBusy, refreshCatalog, t]);

      if (loadError !== '') {
        return h('div', { className: 'is-root' },
          h('div', { className: 'is-top' }, h('span', { className: 'is-brand' }, t('title'))),
          h('div', { className: 'is-body' }, h('div', { className: 'is-error' }, loadError)),
        );
      }

      const canGenerate = model !== null && prompt.trim() !== '' && !busy && catalog?.keyConfigured !== false;
      const railRecords = history.length > 0 ? history : [];

      return h('div', { className: 'is-root' },
        // ---- top toolbar: what to render with ------------------------------
        h('div', { className: 'is-top' },
          h('span', { className: 'is-brand' }, t('title')),
          h('select', {
            className: 'is-select', value: modelId, disabled: models.length === 0 || busy,
            title: model === null ? '' : model.hint,
            onChange: (event) => { setModelId(event.target.value); setError(''); },
          }, models.map((entry) => h('option', { key: entry.id, value: entry.id }, entry.label))),
          h('select', {
            className: 'is-select', value: size, disabled: busy,
            title: t('size'),
            onChange: (event) => setSize(event.target.value),
          }, (model?.sizes ?? []).map((entry) => h('option', { key: entry.value, value: entry.value }, entry.label))),
          h('select', {
            className: 'is-select', value: String(count), disabled: busy, title: t('count'),
            onChange: (event) => setCount(Number(event.target.value)),
          }, Array.from({ length: Math.max(1, catalog?.maxCount ?? 4) }, (_, index) => index + 1)
            .map((value) => h('option', { key: value, value: String(value) }, value + ' ' + t('countUnit')))),
          h('label', { className: 'is-switch', title: t('watermarkTip') },
            h('input', {
              type: 'checkbox', checked: watermark, disabled: busy,
              onChange: (event) => setWatermarkChoice(event.target.checked),
            }),
            t('watermark'),
          ),
          h('button', {
            className: 'is-toggle', type: 'button',
            'aria-expanded': advancedOpen ? 'true' : 'false',
            onClick: () => setAdvancedOpen((open) => !open),
          }, t('advanced') + (extras.length > 0 ? ' · ' + extras.map((key) => (key === 'cfg' ? 'CFG' : 'GS')).join('/') : '')),
          h('span', { className: 'is-spacer' }),
          catalog?.keyConfigured === false
            ? h('button', {
              className: 'is-badge is-badge-warn is-badge-btn', type: 'button', title: t('keyTitle'),
              onClick: () => { setKeyOpen(true); loadKeyStatus(); },
            }, t('keyMissing'))
            : h('span', { className: 'is-badge' }, catalog === null ? '' : model === null ? '' : model.hint),
          h('button', {
            className: 'is-iconbtn' + (keyOpen ? ' is-iconbtn-on' : ''),
            type: 'button', title: t('keyTitle'), 'aria-label': t('keyTitle'),
            'aria-expanded': keyOpen ? 'true' : 'false',
            onClick: () => {
              const next = !keyOpen;
              setKeyOpen(next);
              if (next) { setKeyError(''); loadKeyStatus(); }
            },
          }, h(GearIcon, { size: 14 })),
        ),

        // ---- SiliconFlow key popover --------------------------------------
        keyOpen ? h('div', { className: 'is-pop', role: 'dialog', 'aria-label': t('keyTitle') },
          h('div', { className: 'is-pop-head' },
            h('span', { className: 'is-pop-title' }, t('keyTitle')),
            h('span', { className: 'is-spacer' }),
            h('button', {
              className: 'is-pop-x', type: 'button', title: t('close'), 'aria-label': t('close'),
              onClick: () => setKeyOpen(false),
            }, '×'),
          ),
          h('div', { className: 'is-pop-row' },
            h('input', {
              className: 'is-pop-input',
              type: 'password',
              autoComplete: 'off',
              spellCheck: false,
              value: keyValue,
              disabled: keyBusy,
              placeholder: t('keyPlaceholder'),
              onChange: (event) => setKeyValue(event.target.value),
              onKeyDown: (event) => { if (event.key === 'Enter') saveKey(); },
            }),
          ),
          h('div', { className: 'is-pop-note' },
            keyInfo === null ? t('keyLoading')
              : keyInfo.configured === true ? t('keyConfiguredWith', { source: keyInfo.source ?? 'file' })
                : t('keyNotConfigured')),
          h('div', { className: 'is-pop-note' }, t('keyOnlySiliconflow')),
          keyError !== '' ? h('div', { className: 'is-error' }, keyError) : null,
          h('div', { className: 'is-pop-actions' },
            h('button', {
              className: 'is-btn is-btn-primary', type: 'button', disabled: keyBusy, onClick: saveKey,
            }, keyBusy ? t('saving') : t('keySave')),
            keyInfo !== null && keyInfo.configured === true
              ? h('button', { className: 'is-btn is-btn-ghost', type: 'button', disabled: keyBusy, onClick: clearKey }, t('keyClear'))
              : null,
          ),
        ) : null,

        // ---- prompt + generate ---------------------------------------------
        h('div', { className: 'is-compose' },
          h('textarea', {
            ref: textareaRef,
            className: 'is-prompt',
            value: prompt,
            placeholder: t('promptPlaceholder'),
            onChange: (event) => setPrompt(event.target.value),
            onKeyDown: (event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') generate();
            },
          }),
          h('button', { className: 'is-go', type: 'button', disabled: !canGenerate, onClick: generate },
            h('span', null, busy ? t('generating', { seconds: elapsed.toFixed(0) }) : t('generate')),
            h('span', { className: 'is-go-hint' }, busy ? t('generatingHint') : t('goHint')),
          ),
        ),

        // ---- advanced parameters -------------------------------------------
        h('div', { className: 'is-advanced', hidden: !advancedOpen },
          model !== null && model.params.includes('negative_prompt') ? h(FloatArea, {
            wide: true, label: t('negative'), value: negative, disabled: busy,
            title: t('negativePlaceholder'),
            onChange: (event) => setNegative(event.target.value),
          }) : null,
          h(FloatField, {
            label: t('seed'), value: seed, inputMode: 'numeric', disabled: busy, title: t('seedPlaceholder'),
            onChange: (event) => setSeed(event.target.value.replace(/[^0-9]/g, '')),
          }),
          model !== null && model.params.includes('num_inference_steps') ? h(FloatField, {
            label: t('steps'), value: steps, inputMode: 'numeric', disabled: busy,
            onChange: (event) => setSteps(event.target.value.replace(/[^0-9]/g, '')),
          }) : null,
          model !== null && model.params.includes('guidance_scale') ? h(FloatField, {
            label: t('guidance'), value: guidance, inputMode: 'decimal', disabled: busy,
            onChange: (event) => setGuidance(event.target.value.replace(/[^0-9.]/g, '')),
          }) : null,
          model !== null && model.params.includes('cfg') ? h(FloatField, {
            label: t('cfg'), value: cfg, inputMode: 'decimal', disabled: busy, title: t('cfgHint'),
            onChange: (event) => setCfg(event.target.value.replace(/[^0-9.]/g, '')),
          }) : null,
        ),

        // ---- status --------------------------------------------------------
        (error !== '' || notice !== '' || !watermark)
          ? h('div', { className: 'is-status' },
            error !== '' ? h('div', { className: 'is-error' }, error) : null,
            notice !== '' ? h('div', { className: 'is-notice' }, notice) : null,
            !watermark ? h('div', { className: 'is-notice' }, t('watermarkOffNote')) : null,
          )
          : null,

        // ---- results -------------------------------------------------------
        h('div', { className: 'is-body' },
          h('div', { className: 'is-canvas' },
            h('div', { className: 'is-stage' },
              busy
                ? h('div', { className: 'is-placeholder' },
                  h('div', { className: 'is-spinner' }),
                  h('div', null, t('generatingHintLong', { seconds: elapsed.toFixed(1) })))
                : preview !== null
                  ? h('img', { src: FILE_URL(preview.name), alt: preview.prompt ?? '' })
                  : h('div', { className: 'is-placeholder' }, t('empty')),
            ),

            preview !== null ? h('div', { className: 'is-meta' },
              h('span', { className: 'is-chip' }, preview.modelLabel ?? preview.model),
              h('span', { className: 'is-chip' }, preview.width + '×' + preview.height),
              preview.seed !== null && preview.seed !== undefined ? h('span', { className: 'is-chip' }, t('seedChip', { seed: preview.seed })) : null,
              preview.steps !== null && preview.steps !== undefined ? h('span', { className: 'is-chip' }, t('stepsChip', { steps: preview.steps })) : null,
              formatSeconds(preview.elapsedMs) !== '' ? h('span', { className: 'is-chip' }, formatSeconds(preview.elapsedMs)) : null,
              h('span', { className: 'is-spacer' }),
              h('button', {
                className: 'is-act' + (promptOpen ? ' is-act-on' : ''), type: 'button',
                'aria-expanded': promptOpen ? 'true' : 'false',
                onClick: () => setPromptOpen((open) => !open),
              }, t('viewPrompt')),
              h('button', { className: 'is-act', type: 'button', onClick: () => reuseRecord(preview) }, t('reuse')),
              h('a', { className: 'is-act', href: FILE_URL(preview.name), download: preview.name }, t('download')),
              h('button', { className: 'is-act is-act-danger', type: 'button', onClick: () => remove(preview) }, t('delete')),
            ) : null,

            // ---- prompt of the previewed record ---------------------------
            preview !== null && promptOpen ? h('div', { className: 'is-promptview' },
              h('div', { className: 'is-pv-head' },
                h('span', { className: 'is-pv-title' }, t('viewPrompt')),
                h('span', { className: 'is-spacer' }),
                h('button', { className: 'is-act', type: 'button', onClick: () => copyPrompt(preview) }, t('copyPrompt')),
              ),
              h('div', { className: 'is-pv-text' }, preview.prompt ?? ''),
              preview.negativePrompt ? h('div', { className: 'is-pv-text is-pv-neg' },
                h('span', { className: 'is-pv-tag' }, t('negative')),
                preview.negativePrompt) : null,
            ) : null,

            items.length > 1 ? h('div', { className: 'is-strip' },
              items.map((record) => h('img', {
                key: record.name, src: FILE_URL(record.name), alt: '',
                className: preview !== null && preview.name === record.name ? 'is-on' : '',
                onClick: () => setPreview(record),
              })),
            ) : null,
          ),

          h('div', { className: 'is-rail' },
            h('div', { className: 'is-rail-head' },
              h('span', { className: 'is-rail-title' }, t('history')),
              h('span', { className: 'is-spacer' }),
              h('button', { className: 'is-act', type: 'button', onClick: () => refreshHistory() }, t('refresh')),
            ),
            railRecords.length === 0
              ? h('div', { className: 'is-notice' }, t('historyEmpty'))
              : h('div', { className: 'is-rail-list' }, railRecords.map((record) => h('div', {
                key: record.name,
                className: 'is-thumb' + (preview !== null && preview.name === record.name ? ' is-on' : ''),
                title: record.prompt ?? '',
              },
                h('img', { src: FILE_URL(record.name), alt: '', onClick: () => setPreview(record) }),
                h('button', {
                  className: 'is-thumb-x is-thumb-reuse', type: 'button', title: t('reuse'), 'aria-label': t('reuse'),
                  onClick: (event) => { event.stopPropagation(); reuseRecord(record); },
                }, '↻'),
                h('button', {
                  className: 'is-thumb-x', type: 'button', title: t('delete'), 'aria-label': t('delete'),
                  onClick: (event) => { event.stopPropagation(); remove(record); },
                }, '×'),
              ))),
          ),
        ),
      );
    }

    const DICTIONARIES = {
      zh: {
        panel: '生图',
        title: '生图工作台',
        model: '模型',
        keyMissing: '未配置密钥',
        promptPlaceholder: '描述你想要的画面…（Ctrl/⌘ + Enter 生成）',
        negative: '负向提示词',
        negativePlaceholder: '不希望出现的内容（可留空）',
        size: '尺寸',
        count: '张数',
        countUnit: '张',
        seed: '种子（留空随机）',
        seedPlaceholder: '随机',
        steps: '推理步数',
        guidance: 'Guidance',
        cfg: 'CFG',
        cfgHint: '图内文字需 > 1，官方推荐 50 步 + CFG 4.0',
        advanced: '高级参数',
        watermark: 'AI 水印',
        watermarkTip: '关闭后不再叠加「AI 生成」水印',
        watermarkOffNote: '已关闭「AI 生成」水印：按规定请自行对输出标注为 AI 生成内容。',
        generate: '生成',
        goHint: 'Ctrl / ⌘ + Enter',
        generating: '{seconds}s',
        generatingHint: '生成中',
        generatingHintLong: '正在生成并下载到本地 · {seconds}s',
        empty: '在上方输入提示词，然后点「生成」',
        history: '历史',
        historyEmpty: '暂无记录',
        refresh: '刷新',
        download: '下载',
        copyPrompt: '复制提示词',
        delete: '删除',
        copied: '提示词已复制',
        copyFailed: '复制失败，请手动选取',
        partialFailure: '部分图片失败：{message}',
        viewPrompt: '查看提示词',
        reuse: '复用提示词',
        promptLoaded: '已填入该记录的提示词，可修改后再生成',
        copyShort: '复制',
        keyTitle: '硅基流动 API Key',
        keyPlaceholder: 'sk-...',
        keyLoading: '读取中…',
        keyNotConfigured: '未配置密钥',
        keyConfiguredWith: '已配置 · 来源 {source}',
        keyOnlySiliconflow: '当前仅支持硅基流动的 API Key，可在 siliconflow.cn 获取。',
        keySave: '保存',
        keyClear: '清除',
        keySaved: 'API Key 已保存',
        keyCleared: 'API Key 已清除',
        keyEmpty: '请先填入 API Key',
        saving: '保存中…',
        close: '关闭',
        seedChip: '种子 {seed}',
        stepsChip: '{steps} 步',
      },
      en: {
        panel: 'Image Studio',
        title: 'Image Studio',
        model: 'Model',
        keyMissing: 'No API key',
        promptPlaceholder: 'Describe the image you want… (Ctrl/⌘ + Enter to generate)',
        negative: 'Negative prompt',
        negativePlaceholder: 'What to avoid (optional)',
        size: 'Size',
        count: 'Images',
        countUnit: 'img',
        seed: 'Seed (blank = random)',
        seedPlaceholder: 'random',
        steps: 'Inference steps',
        guidance: 'Guidance',
        cfg: 'CFG',
        cfgHint: 'Must exceed 1 to render text; official recipe is 50 steps + CFG 4.0',
        advanced: 'Advanced',
        watermark: 'AI watermark',
        watermarkTip: 'When off, the "AI generated" watermark is no longer applied',
        watermarkOffNote: 'The "AI generated" watermark is off — you are responsible for labelling the output as AI-generated.',
        generate: 'Generate',
        goHint: 'Ctrl / ⌘ + Enter',
        generating: '{seconds}s',
        generatingHint: 'working',
        generatingHintLong: 'Generating and downloading locally · {seconds}s',
        empty: 'Write a prompt above, then press Generate',
        history: 'History',
        historyEmpty: 'Nothing yet',
        refresh: 'Refresh',
        download: 'Download',
        copyPrompt: 'Copy prompt',
        delete: 'Delete',
        copied: 'Prompt copied',
        copyFailed: 'Copy failed — select the text manually',
        partialFailure: 'Some images failed: {message}',
        viewPrompt: 'View prompt',
        reuse: 'Reuse prompt',
        promptLoaded: 'Prompt loaded — edit it if you like, then generate',
        copyShort: 'Copy',
        keyTitle: 'SiliconFlow API key',
        keyPlaceholder: 'sk-...',
        keyLoading: 'Reading…',
        keyNotConfigured: 'No key configured',
        keyConfiguredWith: 'Configured · from {source}',
        keyOnlySiliconflow: 'Only a SiliconFlow API key is supported here — get one at siliconflow.cn.',
        keySave: 'Save',
        keyClear: 'Clear',
        keySaved: 'API key saved',
        keyCleared: 'API key cleared',
        keyEmpty: 'Enter an API key first',
        saving: 'Saving…',
        close: 'Close',
        seedChip: 'seed {seed}',
        stepsChip: '{steps} steps',
      },
    };

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'image-studio: dictionaries');

        ctx.effect(() => {
          const style = document.createElement('style');
          style.setAttribute('data-image-studio-style', '');
          style.textContent = CSS;
          document.head.appendChild(style);
          return () => style.remove();
        }, 'image-studio: styles');

        const t = ctx.locale.bind(NS);

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 12,
          locale: NS,
          label: () => t('panel'),
        }, BrushIcon));

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
        }, ImageStudioPage));
      },
    };
  },
});
