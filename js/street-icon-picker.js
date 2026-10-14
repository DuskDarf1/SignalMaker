// Searchable thumbnail picker adapted from SignMaker v2.2 (GPL-3.0).
(() => {
  const app = window.SignalMaker;
  const key = 'signalmaker-street-icons-v1';
  const restore = raw => {
    try { const data = JSON.parse(raw); return (Array.isArray(data) ? data : []).map(app.restoreStreetIcon).filter(Boolean); }
    catch { return []; }
  };
  let library = [];
  try { library = restore(localStorage.getItem(key)); } catch {}
  function remember(icon) {
    const clean = app.restoreStreetIcon(icon);
    if (!clean) return false;
    if (!library.some(item => item.src === clean.src)) library.push(clean);
    try { localStorage.setItem(key, JSON.stringify(library)); return true; } catch { return false; }
  }
  async function rasterIcon(icon) {
    if (app.restoreStreetIcon(icon)) return { ...icon };
    const image = new Image(); image.src = icon.src; await image.decode();
    const canvas = document.createElement('canvas');
    let scale = Math.min(1, 1024 / Math.max(icon.width, icon.height));
    let src;
    do {
      canvas.width = Math.max(1, Math.round(icon.width * scale)); canvas.height = Math.max(1, Math.round(icon.height * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      src = canvas.toDataURL('image/png'); scale *= 0.75;
    } while (src.length > 512 * 1024);
    return { src, width: canvas.width, height: canvas.height, name: icon.name };
  }
  app.startStreetIconPicker = ({ project, selected, iconUploads }) => {
    const get = id => document.getElementById(id);
    const picker = get('streetIconPicker'), grid = get('streetIconGrid');
    let target = null;
    let request = null;
    const populate = () => {
      const query = get('streetIconSearch').value.trim().toLowerCase();
      const existing = (app.mastArmProjects?.(project) ?? [project]).flatMap(arm => arm.streetSigns ?? []).map(sign => sign.icon).filter(Boolean);
      const custom = [...new Map([...library, ...existing].map(icon => [icon.src, icon])).values()];
      const icons = [app.streetOrangeIcon, ...custom].filter(icon => icon.name.toLowerCase().includes(query));
      grid.replaceChildren();
      for (const icon of icons) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'iconGridItem';
        button.title = icon.name; button.setAttribute('aria-label', icon.name); button.setAttribute('aria-pressed', String(target?.icon?.src === icon.src));
        const image = document.createElement('img'); image.src = icon.src; image.alt = ''; image.loading = 'lazy'; button.append(image);
        button.addEventListener('click', async () => {
          const token = {}; request = token;
          try {
            const image = await rasterIcon(icon);
            if (request !== token || !picker.open || !project.streetSigns.includes(target)) return;
            iconUploads.delete(target);
            app.runWithUndo(() => { target.icon = image; app.refresh(false); });
            picker.close();
          } catch { get('streetSignIconStatus').textContent = 'Could not load that icon.'; }
        });
        grid.append(button);
      }
      if (!icons.length) { const empty = document.createElement('p'); empty.textContent = 'No icons found. Upload an icon to add it to your library.'; grid.append(empty); }
    };
    get('chooseStreetSignIcon').addEventListener('click', () => {
      target = selected(); if (!target || app.isRegulatorySign(target)) return;
      get('streetIconSearch').value = ''; populate(); picker.showModal(); get('streetIconSearch').focus();
    });
    get('streetIconSearch').addEventListener('input', populate);
    get('closeStreetIconPicker').addEventListener('click', () => picker.close());
    picker.addEventListener('close', () => { request = null; get('chooseStreetSignIcon').focus({ preventScroll: true }); });
  };
  Object.assign(app, { rememberStreetIcon: remember, restoreStreetIconLibrary: restore });
})();
