/* Life OS — settings.js: user settings state, theme, and the Settings screen. */
let SETTINGS = {id:"main", name:"Darius", currency:"KSh", theme:"dark", pinHash:null, lockTimeoutMin:2, weekStart:1, notificationsOn:false, webauthnId:null, autoLocationOn:false, onboardingComplete:false};

async function loadSettings(){
  const s = await DB.get("settings", "main");
  if(s){
    // Grandfather in existing installs that predate onboarding — only truly
    // new installs (no settings record at all) should see the first-run flow.
    if(s.onboardingComplete===undefined) s.onboardingComplete = true;
    SETTINGS = Object.assign(SETTINGS, s);
  }
  if(!SETTINGS.name){ SETTINGS.name = "Darius"; }
  await DB.put("settings", SETTINGS);
}

const ICON_SUN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></svg>`;
const ICON_MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>`;
function applyTheme(){
  document.body.classList.toggle("theme-light", SETTINGS.theme==="light");
  document.getElementById("theme-btn").innerHTML = SETTINGS.theme==="light" ? ICON_SUN : ICON_MOON;
}

function openSettingsSheet(){
  openSheet(`
    <div class="sheet-title">Settings</div>
    <label>Your name</label><input id="st-name" value="${esc(SETTINGS.name)}">
    <label>Currency label</label><input id="st-currency" value="${esc(SETTINGS.currency)}">
    <label>Theme</label>
    <div class="chips">
      <span class="chip ${SETTINGS.theme!=='light'?'active':''}" id="st-theme-dark">🌙 Dark</span>
      <span class="chip ${SETTINGS.theme==='light'?'active':''}" id="st-theme-light">☀️ Light</span>
    </div>
    <label>App PIN lock</label>
    <div class="btn-row">
      <button class="btn ghost sm" id="st-setpin">${SETTINGS.pinHash? "Change PIN":"Set PIN"}</button>
      ${SETTINGS.pinHash? `<button class="btn ghost sm" id="st-clearpin">Turn off PIN</button>`:""}
    </div>
    <label>Biometric unlock</label>
    <div class="btn-row">
      <button class="btn ghost sm" id="st-biometric">${SETTINGS.webauthnId? "Re-enable fingerprint/Face ID":"Enable fingerprint/Face ID"}</button>
      ${SETTINGS.webauthnId? `<button class="btn ghost sm" id="st-biometric-off">Turn off</button>`:""}
    </div>
    <p class="field-hint">Requires a PIN to be set first, and a device with fingerprint/Face ID support.</p>
    <label>Notifications</label>
    <div class="btn-row">
      <button class="btn ghost sm" id="st-notif-on" style="${SETTINGS.notificationsOn?'display:none;':''}">Enable notifications</button>
      <button class="btn ghost sm" id="st-notif-off" style="${!SETTINGS.notificationsOn?'display:none;':''}">Turn off</button>
      ${SETTINGS.notificationsOn? `<button class="btn ghost sm" id="st-notif-test">🔔 Send test</button>`:""}
    </div>
    <p class="field-hint">Uses your phone's default notification sound and vibration. Fires while Life OS is open — this is a fully offline app, so background push isn't possible without a server. On iPhone, notifications only work if you've added Life OS to your Home Screen (Share → Add to Home Screen) — Safari tabs can't show them at all.</p>
    <label>Sound cues</label>
    <div class="chips">
      <span class="chip ${SETTINGS.soundsOn!==false?'active':''}" id="st-sounds-on">🔊 On</span>
      <span class="chip ${SETTINGS.soundsOn===false?'active':''}" id="st-sounds-off">🔇 Off</span>
      <span class="chip" id="st-sounds-test">▶ Test</span>
    </div>
    <p class="field-hint">Short distinct tones for completing a task, finishing a habit, and a shared goal being achieved — synthesized on-device, no audio files.</p>
    <label>Developer contact (shown in About)</label>
    <input id="st-dev-phone" value="${esc(SETTINGS.devPhone||'')}" placeholder="Phone number" type="tel">
    <input id="st-dev-email" value="${esc(SETTINGS.devEmail||'')}" placeholder="Email" type="email" style="margin-top:8px;">
    <p class="field-hint">Only shown to you in the About screen of this install — not sent anywhere.</p>
    <label>🤖 Online AI (optional)</label>
    <div class="chips">
      <span class="chip ${!SETTINGS.aiOnline?'active':''}" id="st-ai-off">Local only</span>
      <span class="chip ${SETTINGS.aiOnline?'active':''}" id="st-ai-on">Real AI when online</span>
    </div>
    <div id="st-ai-key-wrap" style="${SETTINGS.aiOnline?'':'display:none;'} margin-top:10px;">
      <input id="st-ai-key" type="password" value="${esc(SETTINGS.anthropicKey||'')}" placeholder="Your Anthropic API key (sk-ant-...)">
      <p class="field-hint">⚠️ This app has no backend, so the key is stored on this device and sent <b>directly from your browser</b> to Anthropic when you ask the Assistant something while online. It's visible in your browser's network tab — use a key with a spending limit set, and never share this device's backup file with anyone you don't trust. When off, or when you're offline, the Assistant keeps working exactly as before using only your local data — nothing breaks either way. Get a key at console.anthropic.com.</p>
    </div>
    <label>🔗 Shared goals (optional — needs Supabase)</label>
    <input id="st-sb-url" value="${esc(SETTINGS.supabaseUrl||'')}" placeholder="Supabase project URL">
    <input id="st-sb-key" type="password" value="${esc(SETTINGS.supabaseKey||'')}" placeholder="Supabase anon key" style="margin-top:8px;">
    <p class="field-hint">Lets you and anyone you share a goal code with — your wife, a friend, a group — each run Life OS on your own phone and see the same progress live. Needs a free Supabase project. Go to Money → Shared goals for the exact table setup, then paste the URL and anon key here. Without this, Shared goals still works but stays local to this device only.</p>
    <div class="chips" style="margin-top:10px;">
      <span class="chip ${SETTINGS.shareProfileOnGoals?'active':''}" id="st-share-profile">🙂 Share my name/photo/birthday on goals I join</span>
    </div>
    <p class="field-hint">Off by default. When on, people who share a goal code with you can see your name, a small photo, and — only if your profile has a birthday set — your birthday. This is what lets the app notify others when you hit a shared goal or on your birthday.</p>
    <label>☁️ Google Drive backup (optional)</label>
    <input id="st-google-id" value="${esc(SETTINGS.googleClientId||'')}" placeholder="Google OAuth Client ID">
    <p class="field-hint">Needs a free OAuth Client ID (Web application type) from Google Cloud Console, with this app's hosted URL added as an authorized JavaScript origin. Once set, More → Backup & restore gets one-tap backup/restore to your own Drive — the app only ever sees files it created itself, never the rest of your Drive.</p>
    <div style="margin-top:22px;">
      <button class="btn danger sm" id="st-wipe">Delete all data</button>
    </div>
    <button class="btn" id="st-save" style="margin-top:18px;">Save settings</button>
  `);
  document.getElementById("st-ai-off").onclick = ()=>{ document.getElementById("st-ai-off").classList.add("active"); document.getElementById("st-ai-on").classList.remove("active"); document.getElementById("st-ai-key-wrap").style.display="none"; };
  document.getElementById("st-ai-on").onclick = ()=>{ document.getElementById("st-ai-on").classList.add("active"); document.getElementById("st-ai-off").classList.remove("active"); document.getElementById("st-ai-key-wrap").style.display="block"; };
  document.getElementById("st-share-profile").onclick = (e)=> e.target.classList.toggle("active");
  document.getElementById("st-sounds-on").onclick = ()=>{ document.getElementById("st-sounds-on").classList.add("active"); document.getElementById("st-sounds-off").classList.remove("active"); };
  document.getElementById("st-sounds-off").onclick = ()=>{ document.getElementById("st-sounds-off").classList.add("active"); document.getElementById("st-sounds-on").classList.remove("active"); };
  document.getElementById("st-sounds-test").onclick = ()=> playTone("achieve");
  document.getElementById("st-save").onclick = async ()=>{
    SETTINGS.name = document.getElementById("st-name").value.trim();
    SETTINGS.currency = document.getElementById("st-currency").value.trim() || "KSh";
    SETTINGS.devPhone = document.getElementById("st-dev-phone").value.trim();
    SETTINGS.devEmail = document.getElementById("st-dev-email").value.trim();
    SETTINGS.aiOnline = document.getElementById("st-ai-on").classList.contains("active");
    SETTINGS.anthropicKey = document.getElementById("st-ai-key").value.trim();
    SETTINGS.supabaseUrl = document.getElementById("st-sb-url").value.trim();
    SETTINGS.supabaseKey = document.getElementById("st-sb-key").value.trim();
    SETTINGS.shareProfileOnGoals = document.getElementById("st-share-profile").classList.contains("active");
    SETTINGS.soundsOn = document.getElementById("st-sounds-off").classList.contains("active") ? false : true;
    SETTINGS.googleClientId = document.getElementById("st-google-id").value.trim();
    await DB.put("settings", SETTINGS);
    closeSheet(); toast("Settings saved"); setTab(STATE.tab);
  };
  document.getElementById("st-theme-dark").onclick = async ()=>{ SETTINGS.theme="dark"; await DB.put("settings",SETTINGS); applyTheme(); openSettingsSheet(); };
  document.getElementById("st-theme-light").onclick = async ()=>{ SETTINGS.theme="light"; await DB.put("settings",SETTINGS); applyTheme(); openSettingsSheet(); };
  document.getElementById("st-setpin").onclick = ()=> openPinSetupSheet();
  const cp = document.getElementById("st-clearpin");
  if(cp) cp.onclick = async ()=>{ SETTINGS.pinHash=null; SETTINGS.webauthnId=null; await DB.put("settings", SETTINGS); toast("PIN lock off"); closeSheet(); };
  document.getElementById("st-biometric").onclick = async ()=>{
    if(!SETTINGS.pinHash){ toast("Set a PIN first, as a fallback"); return; }
    await enableBiometric(); openSettingsSheet();
  };
  const bo = document.getElementById("st-biometric-off");
  if(bo) bo.onclick = async ()=>{ SETTINGS.webauthnId=null; await DB.put("settings",SETTINGS); renderLockExtras(); openSettingsSheet(); };
  document.getElementById("st-notif-on").onclick = async ()=>{ await enableNotifications(); openSettingsSheet(); };
  document.getElementById("st-notif-off").onclick = async ()=>{ await disableNotifications(); toast("Notifications off"); openSettingsSheet(); };
  const notifTest = document.getElementById("st-notif-test");
  if(notifTest) notifTest.onclick = ()=> fireNotification("Test notification", "If you heard/felt that, notifications are working 🎉", "test-"+Date.now());
  document.getElementById("st-wipe").onclick = ()=>{
    closeSheet();
    setTimeout(()=>{
      const typed = prompt('This permanently deletes everything on this device.\n\nType DELETE MY DATA to confirm:');
      if(typed==="DELETE MY DATA"){
        Promise.all(STORES.map(s=>DB.clear(s.name))).then(()=>{
          toast("All data deleted"); location.reload();
        });
      } else if(typed!==null){ toast("Not confirmed — nothing deleted"); }
    }, 300);
  };
}

/* Styled PIN setup — reuses the same pin-pad/pin-dots visuals as the lock screen. */
function openPinSetupSheet(){
  let stage = "enter", firstPin = "", buf = "";
  openSheet(`
    <div class="sheet-title" id="ps-title">Enter a new 4-digit PIN</div>
    <div class="pin-dots" id="ps-dots" style="margin:20px auto;"></div>
    <div class="pin-pad" id="ps-pad" style="margin:0 auto;"></div>
  `);
  const dotsEl = document.getElementById("ps-dots"), titleEl = document.getElementById("ps-title"), padEl = document.getElementById("ps-pad");
  function draw(){ dotsEl.innerHTML = [0,1,2,3].map(i=>`<div class="pin-dot ${i<buf.length?'filled':''}"></div>`).join(""); }
  padEl.innerHTML = "";
  ["1","2","3","4","5","6","7","8","9","","0","⌫"].forEach(k=>{
    const b = document.createElement("button");
    b.className="pin-key"; b.textContent=k; if(k==="") b.style.visibility="hidden";
    b.addEventListener("click", async ()=>{
      if(k==="⌫"){ buf=buf.slice(0,-1); draw(); return; }
      if(buf.length>=4) return;
      buf+=k; draw();
      if(buf.length===4){
        if(stage==="enter"){
          firstPin = buf; buf=""; stage="confirm";
          titleEl.textContent = "Confirm your PIN";
          setTimeout(draw, 150);
        } else {
          if(buf===firstPin){
            SETTINGS.pinHash = await hashPin(buf);
            await DB.put("settings", SETTINGS);
            if(navigator.vibrate) navigator.vibrate(30);
            toast("PIN set"); closeSheet(); openSettingsSheet();
          } else {
            if(navigator.vibrate) navigator.vibrate([60,40,60]);
            toast("PINs didn't match — try again");
            buf=""; stage="enter"; firstPin=""; titleEl.textContent="Enter a new 4-digit PIN";
            setTimeout(draw, 150);
          }
        }
      }
    });
    padEl.appendChild(b);
  });
  draw();
}
async function hashPin(pin){
  const enc = new TextEncoder().encode("lifeos-salt-"+pin);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

/* =========================================================================
   BACKUP / RESTORE
   ========================================================================= */
