/* Life OS — app.js: screens, rendering, state, and app startup. Depends on db.js and settings.js loading first. */
"use strict";

/* =========================================================================
   UTILITIES
   ========================================================================= */
const uid = ()=> Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const todayStr = ()=> new Date().toISOString().slice(0,10);
const nowISO = ()=> new Date().toISOString();

function fmtMoney(n){
  const v = Number(n||0);
  const s = Math.abs(v).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0});
  return (v<0? "-":"") + SETTINGS.currency + " " + s;
}
function fmtDate(d){
  if(!d) return "";
  const dt = new Date(d+"T00:00:00");
  if(isNaN(dt)) return d;
  return dt.toLocaleDateString(undefined,{weekday:"short", day:"numeric", month:"short"});
}
function daysUntil(d){
  if(!d) return null;
  const dt = new Date(d+"T00:00:00"), t = new Date(todayStr()+"T00:00:00");
  return Math.round((dt-t)/86400000);
}
// Whole years + months between a past date and today, e.g. {years:24, months:9}.
function yearsMonthsSince(dateStr){
  if(!dateStr) return null;
  const past = new Date(dateStr+"T00:00:00"), now = new Date(todayStr()+"T00:00:00");
  if(past > now) return null;
  let years = now.getFullYear()-past.getFullYear();
  let months = now.getMonth()-past.getMonth();
  if(now.getDate() < past.getDate()) months--;
  if(months < 0){ years--; months += 12; }
  return {years, months};
}
function agoText(dateStr){
  const p = yearsMonthsSince(dateStr);
  if(!p) return "";
  if(p.years===0 && p.months===0) return "this month";
  const parts = [];
  if(p.years>0) parts.push(p.years+"yr");
  if(p.months>0) parts.push(p.months+"mo");
  return parts.join(" ")+" ago";
}
function greetingWord(){
  const h = new Date().getHours();
  if(h<12) return "Good morning";
  if(h<17) return "Good afternoon";
  return "Good evening";
}
function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> t.classList.remove("show"), 2200);
}
function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
/* ---------- Icon system (SVG, currentColor) ----------
   A small hand-picked set for the highest-visibility spots (nav, headers,
   empty states). Emoji still cover the long tail (chip options, changelog
   bullets, achievement badges) — replacing every one of those is a much
   larger job than this pass; this covers what people look at constantly. */
const ICONS = {
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  note:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>',
  mountain:'<path d="m3 20 6-11 4 6 3-4 5 9z"/>',
  flame:'<path d="M12 22a6 6 0 0 0 6-6c0-3-2-4-3-6-.3 2-1.3 3-2 3-.7-2 0-4-1-7-3 2-6 6-6 10a6 6 0 0 0 6 6z"/>',
  sprout:'<path d="M12 22V12"/><path d="M12 12C7 12 5 9 5 5c4 0 7 2 7 7z"/><path d="M12 12c5 0 7-3 7-7-4 0-7 2-7 7z"/>',
  trophy:'<path d="M8 4h8v4a4 4 0 0 1-8 0z"/><path d="M8 4H4v2a4 4 0 0 0 4 4M16 4h4v2a4 4 0 0 1-4 4"/><path d="M12 12v4M9 20h6M10 20v-4h4v4"/>',
  wallet:'<path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3"/><path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-4a2 2 0 0 1 0-4h4a1 1 0 0 0 1-1"/><circle cx="16" cy="13" r=".6" fill="currentColor"/>',
  heart:'<path d="M12 21s-7-4.5-9.5-9C.7 8.3 2.3 5 5.6 5c2 0 3.3 1.1 4.4 2.8C11.1 6.1 12.4 5 14.4 5c3.3 0 4.9 3.3 3.1 7-2.5 4.5-9.5 9-9.5 9z"/>',
  smile:'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5s1.2 2 3.5 2 3.5-2 3.5-2M9 9.5h.01M15 9.5h.01"/>',
  box:'<path d="M21 8 12 3 3 8l9 5 9-5z"/><path d="M3 8v9l9 5 9-5V8"/><path d="M12 13v9"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M16 5.5a3.5 3.5 0 0 1 0 7"/><path d="M22 20c0-2.8-1.8-5-4.5-5.7"/>',
  book:'<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5V4.5"/><path d="M20 19H6.5a2.5 2.5 0 0 0 0 5H20"/>',
  activity:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
  scale:'<path d="M12 3v18M5 7h14M5 7 2 15a3.5 3.5 0 0 0 7 0zM19 7l-3 8a3.5 3.5 0 0 0 7 0z"/>',
  bowl:'<path d="M3 12h18a9 6 0 0 1-18 0z"/><path d="M12 3v3M8 4l1 3M16 4l-1 3"/>',
  mapPin:'<path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  plane:'<path d="M10.5 21 12 17l1.5 4h-3z"/><path d="M12 3 3 10.5l4 1 2-1.5V15l2 1 2-1v-5l2 1.5 4-1z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  link:'<path d="M9 15 15 9"/><path d="M11 6l1-1a4 4 0 0 1 5.7 5.7l-1 1"/><path d="M13 18l-1 1A4 4 0 0 1 6.3 13.3l1-1"/>',
  home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
  gym:'<path d="M6.5 8v8M17.5 8v8"/><path d="M3 10.5h3M3 13.5h3M18 10.5h3M18 13.5h3"/><path d="M6.5 12h11"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  doc:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  share:'<circle cx="6" cy="12" r="2.3"/><circle cx="18" cy="6" r="2.3"/><circle cx="18" cy="18" r="2.3"/><path d="M8 10.8 16 6.8M8 13.2l8 4"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M3 12h2.2M18.8 12H21M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"/>',
  sparkle:'<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>',
  save:'<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v6h8V4M8 15h8v5"/>',
  chevronLeft:'<path d="m14 6-6 6 6 6"/>',
  chevronRight:'<path d="m10 6 6 6-6 6"/>',
  timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6M12 2v3"/>',
  pause:'<rect x="7" y="5" width="3.2" height="14" rx="1"/><rect x="13.8" y="5" width="3.2" height="14" rx="1"/>',
  play:'<path d="M7 4.5v15l13-7.5z"/>',
  stop:'<rect x="5" y="5" width="14" height="14" rx="2"/>',
  graduation:'<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>'
};
function icon(name, size){
  size = size||18;
  const body = ICONS[name] || ICONS.target;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;">${body}</svg>`;
}
// Wraps every .tile-grid in the given container with left/right scroll buttons —
// touch-scroll already works, but an explicit control makes it discoverable
// for anyone using a mouse or who doesn't think to swipe sideways.
function addScrollArrows(el2){
  el2.querySelectorAll(".tile-grid").forEach(grid=>{
    if(grid.dataset.arrowsAdded) return;
    grid.dataset.arrowsAdded = "1";
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:relative;";
    grid.parentNode.insertBefore(wrap, grid);
    wrap.appendChild(grid);
    ["left","right"].forEach(dir=>{
      const b = document.createElement("button");
      b.className = "scroll-arrow scroll-arrow-"+dir;
      b.innerHTML = icon(dir==="left"?"chevronLeft":"chevronRight", 15);
      b.setAttribute("aria-label", "Scroll "+dir);
      b.addEventListener("click", ()=> grid.scrollBy({left: dir==="left"?-290:290, behavior:"smooth"}));
      wrap.appendChild(b);
    });
  });
}
/* ---------- Sound cues (synthesized — no audio assets needed) ----------
   Distinct short tones for distinct moments, gated by SETTINGS.soundsOn. */
let audioCtx = null;
function playTone(kind){
  if(SETTINGS && SETTINGS.soundsOn===false) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
    const presets = {
      success: [[880,0.09],[1180,0.13]],
      complete: [[660,0.08],[990,0.08],[1320,0.14]],
      alert: [[440,0.1],[349,0.16]],
      tap: [[720,0.05]],
      achieve: [[523,0.09],[659,0.09],[784,0.09],[1046,0.2]]
    };
    const seq = presets[kind] || presets.tap;
    let t = audioCtx.currentTime;
    seq.forEach(([freq,dur])=>{
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t+0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t+dur);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t); osc.stop(t+dur+0.02);
      t += dur*0.85;
    });
  }catch(e){ /* Web Audio unavailable — sound is a nicety, never blocks the action */ }
}
// Per-category sound styles: each reminder-ish category (tasks, habits, goals,
// fasting, money, debts, general) can be assigned one of these named styles
// independently, so e.g. task pings sound different from bill reminders.
const SOUND_STYLES = {chime:"success", ping:"tap", pulse:"alert", rise:"achieve", none:null};
const SOUND_CATEGORIES = ["tasks","habits","goals","fasting","money","debts","general"];
function playCategorySound(category){
  const prefs = SETTINGS.soundPrefs || {};
  const style = prefs[category] || "chime";
  const kind = SOUND_STYLES[style];
  if(kind) playTone(kind);
}
// Quiet hours: suppresses the OS notification popup + sound for non-critical
// categories during the window, without losing the reminder — it still shows
// up in the bell panel (gatherAlerts always computes live from real data, so
// nothing needs a separate "deliver later" queue).
function inQuietHours(){
  if(!SETTINGS.quietHoursOn) return false;
  const [sh,sm] = (SETTINGS.quietHoursStart||"22:00").split(":").map(Number);
  const [eh,em] = (SETTINGS.quietHoursEnd||"06:00").split(":").map(Number);
  const now = new Date();
  const cur = now.getHours()*60 + now.getMinutes();
  const start = sh*60+sm, end = eh*60+em;
  return start<=end ? (cur>=start && cur<end) : (cur>=start || cur<end);
}
function el(html){ const t=document.createElement("template"); t.innerHTML=html.trim(); return t.content.firstElementChild; }

/* =========================================================================
   MODULE SCHEMA — drives generic list/form UI for record-style modules.
   ========================================================================= */
const MODULES = {
  tasks: {
    label:"Tasks", icon:"check", color:"var(--gold)", store:"tasks",
    fields:[
      {key:"title", label:"Task", type:"text", required:true},
      {key:"dueDate", label:"Due date", type:"date"},
      {key:"priority", label:"Priority", type:"select", options:["Normal","High","Top 3"]},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.title, sub:r=> r.dueDate? "Due "+fmtDate(r.dueDate) : "No due date",
    checkable:true
  },
  reminders: {
    label:"Reminders", icon:"bell", color:"var(--blue)", store:"reminders",
    fields:[
      {key:"title", label:"Reminder", type:"text", required:true},
      {key:"dueDate", label:"Date", type:"date", required:true},
      {key:"time", label:"Time (optional)", type:"time"},
      {key:"repeat", label:"Repeats", type:"select", options:["None","Daily","Weekly","Monthly","Yearly"]},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.title, sub:r=> (r.dueDate? fmtDate(r.dueDate): "")+(r.time?" • "+r.time:"")+(r.repeat&&r.repeat!=="None"?" • "+r.repeat:""), checkable:true
  },
  notes: {
    label:"Notes", icon:"note", color:"var(--violet)", store:"notes",
    fields:[
      {key:"title", label:"Title", type:"text", required:true},
      {key:"body", label:"Note", type:"textarea"},
      {key:"tags", label:"Tags (comma separated)", type:"text"}
    ],
    title:r=>r.title, sub:r=> (r.body||"").slice(0,60)
  },
  expenses: {
    label:"Expenses", icon:"wallet", color:"var(--clay)", store:"expenses",
    fields:[
      {key:"description", label:"What was it for?", type:"text", required:true},
      {key:"amount", label:"Amount", type:"number", required:true},
      {key:"category", label:"Category", type:"select", options:["Food","Transport","Bills","Rent","Health","Shopping","Entertainment","Education","Other"]},
      {key:"member", label:"For (household member)", type:"text"},
      {key:"date", label:"Date", type:"date", required:true},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.description, sub:r=> r.category+" • "+fmtDate(r.date), amount:r=>-r.amount
  },
  income: {
    label:"Income", icon:"wallet", color:"var(--sage)", store:"income",
    fields:[
      {key:"description", label:"Source", type:"text", required:true},
      {key:"amount", label:"Amount", type:"number", required:true},
      {key:"category", label:"Category", type:"select", options:["Salary","Business","Freelance","Gift","Other"]},
      {key:"member", label:"From (household member)", type:"text"},
      {key:"date", label:"Date", type:"date", required:true},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.description, sub:r=> r.category+" • "+fmtDate(r.date), amount:r=>r.amount
  },
  debts: {
    label:"Debts", icon:"wallet", color:"var(--clay)", store:"debts",
    fields:[
      {key:"person", label:"Person", type:"text", required:true},
      {key:"direction", label:"Direction", type:"select", options:["I owe them","They owe me"], required:true},
      {key:"amount", label:"Original amount", type:"number", required:true},
      {key:"remaining", label:"Remaining", type:"number"},
      {key:"dueDate", label:"Due date", type:"date"},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.person, sub:r=>r.direction, amount:r=> (r.direction==="I owe them"? -1:1) * (r.remaining!=null? r.remaining : r.amount)
  },
  subscriptions: {
    label:"Subscriptions", icon:"wallet", color:"var(--blue)", store:"subscriptions",
    fields:[
      {key:"name", label:"Name", type:"text", required:true},
      {key:"category", label:"Category", type:"select", options:["Streaming","Software","Internet","Gym","Insurance","Membership","Cloud storage","Other"]},
      {key:"amount", label:"Amount", type:"number", required:true},
      {key:"frequency", label:"Billing frequency", type:"select", options:["Weekly","Monthly","Quarterly","Yearly"], required:true},
      {key:"nextPaymentDate", label:"Next payment date", type:"date"},
      {key:"paymentMethod", label:"Payment method", type:"text"},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.name, sub:r=> r.frequency+" • next "+(r.nextPaymentDate?fmtDate(r.nextPaymentDate):"—"), amount:r=>-r.amount
  },
  budgets: {
    label:"Budgets", icon:"wallet", color:"var(--sage)", store:"budgets",
    fields:[
      {key:"category", label:"Category", type:"select", options:["Food","Transport","Bills","Rent","Health","Shopping","Entertainment","Education","Other"], required:true},
      {key:"monthlyLimit", label:"Monthly limit", type:"number", required:true}
    ],
    title:r=>r.category, sub:r=> "Limit "+fmtMoney(r.monthlyLimit)+"/mo"
  },
  personalGoals: {
    label:"Goals", icon:"target", color:"var(--gold)", store:"personalGoals",
    fields:[
      {key:"title", label:"Goal", type:"text", required:true},
      {key:"term", label:"Term", type:"select", options:["Short-term","Long-term"]},
      {key:"category", label:"Category", type:"select", options:["Career","Finance","Health","Learning","Relationships","Personal","Other"]},
      {key:"targetDate", label:"Target date", type:"date"},
      {key:"progress", label:"Progress % (0-100)", type:"number"},
      {key:"status", label:"Status", type:"select", options:["Active","Completed","Paused"]},
      {key:"description", label:"Description", type:"textarea"}
    ],
    title:r=>r.title, sub:r=> (r.term==="Long-term"?"🏔️ Long-term • ":"")+(r.category||"Goal")+" • "+(r.status||"Active")
  },
  journal: {
    label:"Journal", icon:"book", color:"var(--violet)", store:"journal",
    fields:[
      {key:"date", label:"Date", type:"date", required:true},
      {key:"title", label:"Title", type:"text"},
      {key:"content", label:"What's on your mind?", type:"textarea", required:true}
    ],
    title:r=>r.title||fmtDate(r.date), sub:r=>(r.content||"").slice(0,60)
  },
  gratitude: {
    label:"Gratitude", icon:"heart", color:"var(--sage)", store:"gratitude",
    fields:[
      {key:"date", label:"Date", type:"date", required:true},
      {key:"item1", label:"Grateful for #1", type:"text"},
      {key:"item2", label:"Grateful for #2", type:"text"},
      {key:"item3", label:"Grateful for #3", type:"text"}
    ],
    title:r=>fmtDate(r.date), sub:r=>[r.item1,r.item2,r.item3].filter(Boolean).join(" · ")
  },
  moods: {
    label:"Mood", icon:"smile", color:"var(--gold)", store:"moods",
    fields:[
      {key:"date", label:"Date", type:"date", required:true},
      {key:"value", label:"Mood (1 low – 5 great)", type:"select", options:["1","2","3","4","5"], required:true},
      {key:"note", label:"Note", type:"textarea"}
    ],
    title:r=> "😊".repeat(0)+ "Mood "+r.value+"/5", sub:r=>fmtDate(r.date)+(r.note? " • "+r.note.slice(0,40):"")
  },
  inventory: {
    label:"Inventory", icon:"box", color:"var(--blue)", store:"inventory",
    fields:[
      {key:"name", label:"Item name", type:"text", required:true},
      {key:"category", label:"Category", type:"select", options:["Electronics","Clothing","Furniture","Tools","Documents","Vehicles","Appliances","Books","Other"]},
      {key:"quantity", label:"Quantity", type:"number"},
      {key:"purchaseDate", label:"Purchase date", type:"date"},
      {key:"purchasePrice", label:"Purchase price", type:"number"},
      {key:"currentValue", label:"Current estimated value", type:"number"},
      {key:"location", label:"Location", type:"text"},
      {key:"condition", label:"Condition", type:"select", options:["New","Excellent","Good","Fair","Needs repair"]},
      {key:"serialNumber", label:"Serial number", type:"text"},
      {key:"warrantyExpiry", label:"Warranty expiry", type:"date"},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.name, sub:r=> (r.category||"Item")+(r.condition?" • "+r.condition:""), amount:r=>r.currentValue!=null?r.currentValue:r.purchasePrice
  },
  contacts: {
    label:"Contacts", icon:"user", color:"var(--violet)", store:"contacts",
    fields:[
      {key:"name", label:"Name", type:"text", required:true},
      {key:"category", label:"Relationship", type:"select", options:["Family","Friends","Work","School","Professional","Other"]},
      {key:"phone", label:"Phone", type:"text"},
      {key:"email", label:"Email", type:"text"},
      {key:"birthday", label:"Birthday", type:"date"},
      {key:"nextFollowUp", label:"Next follow-up", type:"date"},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.name, sub:r=> (r.category||"Contact")+(r.phone?" • "+r.phone:"")
  },
  books: {
    label:"Reading", icon:"book", color:"var(--gold)", store:"books",
    fields:[
      {key:"title", label:"Title", type:"text", required:true},
      {key:"author", label:"Author", type:"text"},
      {key:"genre", label:"Genre", type:"text"},
      {key:"status", label:"Status", type:"select", options:["Want to read","Reading","Completed","Paused","Abandoned"]},
      {key:"rating", label:"Rating (1-5)", type:"select", options:["","1","2","3","4","5"]},
      {key:"startDate", label:"Start date", type:"date"},
      {key:"finishDate", label:"Finish date", type:"date"},
      {key:"notes", label:"Favorite quotes / notes", type:"textarea"}
    ],
    title:r=>r.title, sub:r=> (r.author?r.author+" • ":"")+(r.status||"Want to read")
  },
  workouts: {
    label:"Fitness", icon:"activity", color:"var(--clay)", store:"workouts",
    fields:[
      {key:"category", label:"Type", type:"select", options:["Strength","Cardio","Running","Walking","Cycling","Sports","Home workout","Other"], required:true},
      {key:"date", label:"Date", type:"date", required:true},
      {key:"duration", label:"Duration (minutes)", type:"number"},
      {key:"sets", label:"Sets", type:"number"},
      {key:"reps", label:"Reps", type:"number"},
      {key:"weight", label:"Weight (kg)", type:"number"},
      {key:"distance", label:"Distance (km)", type:"number"},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.category, sub:r=> fmtDate(r.date)+(r.duration?" • "+r.duration+" min":"")
  },
  places: {
    label:"Places", icon:"mapPin", color:"var(--sage)", store:"places",
    fields:[
      {key:"name", label:"Name", type:"text", required:true},
      {key:"category", label:"Category", type:"select", options:["Places to visit","Restaurants","Cities","Countries","Attractions","Events"]},
      {key:"status", label:"Status", type:"select", options:["Want to visit","Planned","Visited"]},
      {key:"rating", label:"Rating (1-5)", type:"select", options:["","1","2","3","4","5"]},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.name, sub:r=> (r.category||"Place")+" • "+(r.status||"Want to visit")
  },
  trips: {
    label:"Travel", icon:"plane", color:"var(--blue)", store:"trips",
    fields:[
      {key:"name", label:"Trip name", type:"text", required:true},
      {key:"destination", label:"Destination", type:"text"},
      {key:"startDate", label:"Start date", type:"date"},
      {key:"endDate", label:"End date", type:"date"},
      {key:"budget", label:"Budget", type:"number"},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.name, sub:r=> (r.destination?r.destination+" • ":"")+(r.startDate?fmtDate(r.startDate):""), amount:r=>r.budget
  },
  importantDates: {
    label:"Special dates", icon:"calendar", color:"var(--violet)", store:"importantDates",
    fields:[
      {key:"title", label:"Title", type:"text", required:true},
      {key:"date", label:"Date", type:"date", required:true},
      {key:"category", label:"Type", type:"select", options:["Birthday","Anniversary","Holiday","Appointment","Other"]},
      {key:"recurring", label:"Repeats every year", type:"select", options:["No","Yes"]},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.title, sub:r=> fmtDate(r.date)+(r.recurring==="Yes"?" • yearly":"")
  },
  sleepLogs: {
    label:"Sleep", icon:"moon", color:"var(--violet)", store:"sleepLogs",
    fields:[
      {key:"date", label:"Wake-up date", type:"date", required:true},
      {key:"bedTime", label:"Went to bed", type:"time"},
      {key:"wakeTime", label:"Woke up", type:"time"},
      {key:"quality", label:"Sleep quality (1-5)", type:"select", options:["","1","2","3","4","5"]},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>fmtDate(r.date), sub:r=>{
      if(!r.bedTime || !r.wakeTime) return r.quality? "Quality "+r.quality+"/5" : "";
      const [bh,bm]=r.bedTime.split(":").map(Number), [wh,wm]=r.wakeTime.split(":").map(Number);
      let mins = (wh*60+wm) - (bh*60+bm); if(mins<0) mins += 24*60;
      return r.bedTime+" → "+r.wakeTime+" • "+(mins/60).toFixed(1)+"h"+(r.quality?" • quality "+r.quality+"/5":"");
    }
  },
  relationships: {
    label:"Friends & relationships", icon:"heart", color:"var(--violet)", store:"relationships",
    fields:[
      {key:"name", label:"Name", type:"text", required:true},
      {key:"type", label:"Type", type:"select", options:["Friend","Best Friend","Partner","Crush","Family","Ex","Other"]},
      {key:"status", label:"Status", type:"select", options:["Active","Distant","Ended"]},
      {key:"metDate", label:"How long known (since)", type:"date"},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.name, sub:r=> (r.type||"Friend")+(r.status?" • "+r.status:"")
  },
  cycleLogs: {
    label:"Cycle log", icon:"heart", color:"var(--clay)", store:"cycleLogs",
    fields:[
      {key:"date", label:"Period start date", type:"date", required:true},
      {key:"periodLength", label:"Period length (days)", type:"number"},
      {key:"flow", label:"Flow", type:"select", options:["Light","Medium","Heavy"]},
      {key:"symptoms", label:"Symptoms", type:"textarea"},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>fmtDate(r.date), sub:r=> (r.flow?r.flow+" flow":"")+(r.periodLength?" • "+r.periodLength+"d":"")
  },
  bodyLogs: {
    label:"Body metrics", icon:"scale", color:"var(--sage)", store:"bodyLogs",
    fields:[
      {key:"date", label:"Date", type:"date", required:true},
      {key:"weight", label:"Weight (kg)", type:"number"},
      {key:"height", label:"Height (cm)", type:"number"},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>fmtDate(r.date), sub:r=> (r.weight?r.weight+"kg":"")+(r.height?" • "+r.height+"cm":"")
  },
  foodLogs: {
    label:"Diet", icon:"bowl", color:"var(--sage)", store:"foodLogs",
    fields:[
      {key:"date", label:"Date", type:"date", required:true},
      {key:"mealType", label:"Meal", type:"select", options:["Breakfast","Lunch","Dinner","Snack"]},
      {key:"description", label:"What did you eat?", type:"text", required:true},
      {key:"calories", label:"Calories (optional)", type:"number"},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.description, sub:r=> (r.mealType||"Meal")+" • "+fmtDate(r.date)+(r.calories?" • "+r.calories+" cal":"")
  },
  gymRoutines: {
    label:"Gym routines", icon:"gym", color:"var(--clay)", store:"gymRoutines",
    fields:[
      {key:"name", label:"Routine name", type:"text", required:true},
      {key:"days", label:"Days", type:"select", options:["Mon/Wed/Fri","Tue/Thu/Sat","Every day","Weekends","Custom"]},
      {key:"time", label:"Usual time", type:"time"},
      {key:"exercises", label:"Exercises", type:"textarea"},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.name, sub:r=> (r.days||"")+(r.time?" • "+r.time:"")
  },
  householdMembers: {
    label:"Household members", icon:"users", color:"var(--sage)", store:"householdMembers",
    fields:[
      {key:"name", label:"Name", type:"text", required:true},
      {key:"relation", label:"Relation", type:"select", options:["Spouse/Partner","Child","Parent","Other"]},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.name, sub:r=>r.relation
  },
  learning: {
    label:"Learning", icon:"graduation", color:"var(--blue)", store:"learningItems",
    fields:[
      {key:"title", label:"Title", type:"text", required:true},
      {key:"type", label:"Type", type:"select", options:["Course","Book","Skill","Subject","Project"]},
      {key:"status", label:"Status", type:"select", options:["Not started","In progress","Completed"]},
      {key:"progress", label:"Progress (%)", type:"number"},
      {key:"startDate", label:"Start date", type:"date"},
      {key:"targetDate", label:"Target completion", type:"date"},
      {key:"notes", label:"Notes", type:"textarea"}
    ],
    title:r=>r.title, sub:r=> (r.type||"")+(r.status?" • "+r.status:"")
  }
};

/* =========================================================================
   REMINDERS — recurrence helper, shared by Plan tab, Calendar, and notifications
   ========================================================================= */
function reminderOccursOn(r, dateStr){
  if(!r.dueDate) return false;
  if(r.dueDate===dateStr) return true;
  if(!r.repeat || r.repeat==="None") return false;
  if(dateStr < r.dueDate) return false;
  const rd = new Date(r.dueDate+"T00:00:00"), dd = new Date(dateStr+"T00:00:00");
  if(r.repeat==="Daily") return true;
  if(r.repeat==="Weekly") return rd.getDay()===dd.getDay();
  if(r.repeat==="Monthly") return rd.getDate()===dd.getDate();
  if(r.repeat==="Yearly") return rd.getMonth()===dd.getMonth() && rd.getDate()===dd.getDate();
  return false;
}

/* =========================================================================
   HABITS — custom logic (streaks) beyond generic CRUD
   ========================================================================= */
async function habitStreak(habitId){
  const comps = (await DB.byIndex("habitCompletions","habitId",habitId)).map(c=>c.date).sort();
  if(!comps.length) return 0;
  const set = new Set(comps);
  let streak = 0, d = new Date(todayStr()+"T00:00:00");
  // if today not done yet, streak counts back from yesterday
  if(!set.has(todayStr())) d.setDate(d.getDate()-1);
  while(set.has(d.toISOString().slice(0,10))){
    streak++; d.setDate(d.getDate()-1);
  }
  return streak;
}
async function toggleHabitToday(habitId){
  const all = await DB.byIndex("habitCompletions","habitId",habitId);
  const today = all.find(c=>c.date===todayStr());
  if(today){ await DB.delete("habitCompletions", today.id); }
  else { await DB.add("habitCompletions", {id:uid(), habitId, date:todayStr()}); }
}

/* =========================================================================
   READING — sessions log against a book; reuses the same streak shape as habits
   ========================================================================= */
async function streakFromDates(dates){
  const set = new Set(dates);
  let streak = 0, d = new Date(todayStr()+"T00:00:00");
  if(!set.has(todayStr())) d.setDate(d.getDate()-1);
  while(set.has(d.toISOString().slice(0,10))){ streak++; d.setDate(d.getDate()-1); }
  return streak;
}
async function readingStreak(){
  const sessions = await DB.getAll("readingSessions");
  return streakFromDates(sessions.map(s=>s.date));
}
function openReadingSessionForm(bookId){
  openSheet(`
    <div class="sheet-title">Log reading session</div>
    <label>Date</label><input id="rs-date" type="date" value="${todayStr()}">
    <label>Minutes read</label><input id="rs-duration" type="number">
    <label>Pages read</label><input id="rs-pages" type="number">
    <button class="btn" id="rs-save" style="margin-top:14px;">Save session</button>
  `);
  document.getElementById("rs-save").onclick = async ()=>{
    await DB.add("readingSessions", {
      id:uid(), bookId, date:document.getElementById("rs-date").value||todayStr(),
      duration:Number(document.getElementById("rs-duration").value)||0,
      pages:Number(document.getElementById("rs-pages").value)||0
    });
    closeSheet(); toast("Reading session logged");
  };
}

/* =========================================================================
   STATE / ROUTER
   ========================================================================= */
let STATE = { tab:"home", stack:[] }; // stack holds {view, module, id} for module screen

function setTab(tab){
  STATE.tab = tab; STATE.stack = [];
  document.querySelectorAll(".tab").forEach(b=> b.classList.toggle("active", b.dataset.tab===tab));
  document.querySelectorAll(".screen").forEach(s=> s.classList.remove("active"));
  document.getElementById("screen-"+tab).classList.add("active");
  renderTab(tab);
}
function pushModule(view, module, id){
  STATE.stack.push({view, module, id});
  document.querySelectorAll(".screen").forEach(s=> s.classList.remove("active"));
  document.getElementById("screen-module").classList.add("active");
  renderModuleScreen();
  navPush();
}
function doPopModule(){
  STATE.stack.pop();
  if(STATE.stack.length===0){ setTab(STATE.tab); return; }
  document.querySelectorAll(".screen").forEach(s=> s.classList.remove("active"));
  document.getElementById("screen-module").classList.add("active");
  renderModuleScreen();
}
function popModule(){ appBack(doPopModule); }

function renderTab(tab){
  const fn = {home:renderHome, plan:renderPlan, money:renderMoney, grow:renderGrow, more:renderMore}[tab];
  if(!fn) return;
  Promise.resolve(fn()).catch(err=>{
    console.error("Render failed for tab "+tab+":", err);
    const el2 = document.getElementById("screen-"+tab);
    if(el2) el2.innerHTML = `<div class="empty"><span class="em">⚠️</span><p>Something went wrong loading this screen. Try closing and reopening the app. If it keeps happening, check the About screen for how to reach the developer.</p></div>`;
  });
}

/* =========================================================================
   HOME / DASHBOARD  (includes the six-dimension Life Ring — signature UI)
   ========================================================================= */
const RING_DIMS = [
  {key:"productivity", label:"Productivity", color:"var(--gold)"},
  {key:"finance", label:"Finance", color:"var(--sage)"},
  {key:"growth", label:"Growth", color:"var(--blue)"},
  {key:"habits", label:"Habits", color:"var(--violet)"},
  {key:"lifestyle", label:"Lifestyle", color:"var(--clay)"},
  {key:"reflection", label:"Reflection", color:"#E0C878"}
];

function ringSVG(scores){
  const size=132, cx=size/2, cy=size/2, r=52, thickness=13, gapDeg=5;
  const segDeg = 360/RING_DIMS.length;
  const polarToXY = (angleDeg, radius)=>{
    const a = (angleDeg-90) * Math.PI/180;
    return [cx + radius*Math.cos(a), cy + radius*Math.sin(a)];
  };
  function arcPath(startDeg, endDeg, radius){
    const [x1,y1] = polarToXY(startDeg, radius), [x2,y2] = polarToXY(endDeg, radius);
    const large = (endDeg-startDeg) > 180 ? 1:0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  }
  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  RING_DIMS.forEach((d,i)=>{
    const start = i*segDeg + gapDeg/2, end = (i+1)*segDeg - gapDeg/2;
    const pct = Math.max(0.04, Math.min(1, (scores[d.key]||0)/100));
    const filledEnd = start + (end-start)*pct;
    svg += `<path d="${arcPath(start,end,r)}" stroke="var(--line)" stroke-width="${thickness}" fill="none" stroke-linecap="round"/>`;
    svg += `<path d="${arcPath(start,filledEnd,r)}" stroke="${d.color}" stroke-width="${thickness}" fill="none" stroke-linecap="round"/>`;
  });
  const overall = Math.round(RING_DIMS.reduce((s,d)=>s+(scores[d.key]||0),0)/RING_DIMS.length);
  svg += `<text x="${cx}" y="${cy-2}" text-anchor="middle" fill="var(--paper)" font-size="20" font-weight="700" font-family="var(--font-mono)">${overall}</text>`;
  svg += `<text x="${cx}" y="${cy+15}" text-anchor="middle" fill="var(--fog)" font-size="9" font-family="var(--font-body)">balance</text>`;
  svg += `</svg>`;
  return svg;
}

async function computeLifeScores(){
  const since7 = (n)=>{ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); };
  const [tasks, journal, expenses, income, goals, habits, habitComps, moods] = await Promise.all([
    DB.getAll("tasks"), DB.getAll("journal"), DB.getAll("expenses"), DB.getAll("income"),
    DB.getAll("personalGoals"), DB.getAll("habits"), DB.getAll("habitCompletions"), DB.getAll("moods")
  ]);
  const last7 = since7(7);
  // Productivity: tasks completed in last 7 days vs created in last 7 days
  const recentTasks = tasks.filter(t=> (t.createdAt||"").slice(0,10) >= last7 || (t.dueDate||"") >= last7);
  const doneRecent = recentTasks.filter(t=>t.done).length;
  const productivity = recentTasks.length? Math.round(100*doneRecent/recentTasks.length) : (tasks.length? 40:20);
  // Finance: did they log any money activity in last 7 days + are budgets respected
  const recentMoney = [...expenses, ...income].filter(x=> x.date >= last7).length;
  const finance = Math.min(100, recentMoney*15 + (expenses.length||income.length? 20:0));
  // Growth: active goals with recent progress
  const activeGoals = goals.filter(g=>g.status!=="Completed");
  const growth = goals.length? Math.min(100, Math.round(40 + activeGoals.reduce((s,g)=>s+(Number(g.progress)||0),0)/Math.max(1,activeGoals.length)*0.6)) : 15;
  // Habits: average streak ratio capped
  let habitsScore = 15;
  if(habits.length){
    const streaks = await Promise.all(habits.map(h=>habitStreak(h.id)));
    habitsScore = Math.min(100, Math.round(streaks.reduce((s,x)=>s+x,0)/habits.length * 12));
  }
  // Lifestyle: mood entries recency
  const recentMoods = moods.filter(m=>m.date>=last7).length;
  const lifestyle = Math.min(100, recentMoods*20 + 10);
  // Reflection: journal entries in last 7 days
  const recentJournal = journal.filter(j=>j.date>=last7).length;
  const reflection = Math.min(100, recentJournal*20 + 10);
  return {productivity, finance, growth, habits:habitsScore, lifestyle, reflection};
}

async function renderHome(){
  document.getElementById("topbar-title").textContent = "Life OS";
  const el2 = document.getElementById("screen-home");
  const [tasks, reminders, expenses, goals, habits, subs, journal, profile, bodyLogs, debts, documents, importantDates, fastingSessions] = await Promise.all([
    DB.getAll("tasks"), DB.getAll("reminders"), DB.getAll("expenses"), DB.getAll("personalGoals"),
    DB.getAll("habits"), DB.getAll("subscriptions"), DB.getAll("journal"), DB.get("profile","main"), DB.getAll("bodyLogs"),
    DB.getAll("debts"), DB.getAll("documents"), DB.getAll("importantDates"), DB.getAll("fastingSessions")
  ]);
  const today = todayStr();
  const todaysTasks = tasks.filter(t=>!t.done && (t.dueDate===today || !t.dueDate));
  const todaysReminders = reminders.filter(r=>!r.done && reminderOccursOn(r, today));
  const spentToday = expenses.filter(e=>e.date===today).reduce((s,e)=>s+Number(e.amount||0),0);
  const activeGoals = goals.filter(g=>g.status!=="Completed").length;
  const subsDue = subs.filter(s=> s.nextPaymentDate && daysUntil(s.nextPaymentDate)!=null && daysUntil(s.nextPaymentDate)>=0 && daysUntil(s.nextPaymentDate)<=7).length;
  let maxStreak = 0;
  for(const h of habits){ const s = await habitStreak(h.id); if(s>maxStreak) maxStreak=s; }
  const top3 = tasks.filter(t=>!t.done && t.priority==="Top 3").slice(0,3);
  const wroteToday = journal.some(j=>j.date===today);
  const scores = await computeLifeScores();
  const lastBody = bodyLogs.sort((a,b)=>(b.date||"")<(a.date||"")?-1:1)[0];
  const activeFast = fastingSessions.find(s=>s.status==="active"||s.status==="paused");

  // "Important updates" — a rolled-up feed of anything that actually needs the
  // user's attention right now, so Home works as a quick-glance summary.
  const updates = [];
  if(activeFast){
    const elapsed = fastElapsedMs(activeFast);
    updates.push({icon:"timer", text:`Fasting — ${fmtDur(elapsed)} of ${activeFast.plannedHours}h${activeFast.status==="paused"?" (paused)":""}`, tone:"gold", open:"__fasting__"});
  }
  const overdueTasks = tasks.filter(t=>!t.done && t.dueDate && t.dueDate<today);
  if(overdueTasks.length) updates.push({icon:"bell", text:`${overdueTasks.length} overdue task${overdueTasks.length===1?"":"s"}`, tone:"clay", open:"tasks"});
  if(todaysReminders.length) updates.push({icon:"bell", text:`${todaysReminders.length} reminder${todaysReminders.length===1?"":"s"} today: ${todaysReminders.slice(0,2).map(r=>r.title).join(", ")}`, tone:"gold", open:"reminders"});
  const soonDebts = debts.filter(d=>d.dueDate && daysUntil(d.dueDate)!=null && daysUntil(d.dueDate)>=0 && daysUntil(d.dueDate)<=7);
  if(soonDebts.length) updates.push({icon:"wallet", text:`${soonDebts.length} debt${soonDebts.length===1?"":"s"} due within a week`, tone:"clay", open:"debts"});
  if(subsDue) updates.push({icon:"wallet", text:`${subsDue} subscription${subsDue===1?"":"s"} renewing within 7 days`, tone:"gold", open:"subscriptions"});
  const expiringDocs = documents.filter(d=>d.expiryDate && daysUntil(d.expiryDate)!=null && daysUntil(d.expiryDate)>=0 && daysUntil(d.expiryDate)<=30);
  if(expiringDocs.length) updates.push({icon:"doc", text:`${expiringDocs.length} document${expiringDocs.length===1?"":"s"} expiring within 30 days`, tone:"clay", open:"__documents__"});
  const soonDates = importantDates.filter(d=>d.date && daysUntil(d.date)!=null && daysUntil(d.date)>=0 && daysUntil(d.date)<=7);
  if(soonDates.length) updates.push({icon:"calendar", text:`${soonDates.length} important date${soonDates.length===1?"":"s"} coming up this week`, tone:"sage", open:"importantDates"});
  if(!overdueTasks.length && !todaysReminders.length && !activeFast) updates.push({icon:"check", text:"Nothing urgent — you're on top of things", tone:"sage", open:null});


  const age = profile? yearsMonthsSince(profile.birthday) : null;
  const milestones = [];
  if(profile){
    if(profile.primaryFinishDate) milestones.push({icon:"🎒", label:"Primary school", ago:agoText(profile.primaryFinishDate)});
    if(profile.highSchoolFinishDate) milestones.push({icon:"🎓", label:"High school", ago:agoText(profile.highSchoolFinishDate)});
    if(profile.collegeFinishDate) milestones.push({icon:"🏛️", label:"College", ago:agoText(profile.collegeFinishDate)});
  }

  el2.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px;">
      ${profile&&profile.photo instanceof Blob? `<div id="home-avatar" style="width:48px; height:48px; border-radius:50%; overflow:hidden; flex:none; border:2px solid var(--gold); cursor:pointer;"></div>` : ""}
      <div>
        <div class="greeting">${greetingWord()}${SETTINGS.name? ", "+esc(SETTINGS.name):""} 👋</div>
        <div class="greeting-date">${new Date().toLocaleDateString(undefined,{weekday:"long", day:"numeric", month:"long"})}</div>
      </div>
    </div>

    <div class="card" id="home-updates-card" style="padding:14px;">
      <h2 style="margin-bottom:8px;"><span class="em">📣</span>Important updates</h2>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${updates.map(u=>`
          <div class="update-row" ${u.open?`data-open-list="${u.open}"`:""} style="display:flex; align-items:center; gap:10px; padding:8px 9px; border-radius:10px; background:var(--panel-2); ${u.open?'cursor:pointer;':''}">
            <span style="font-size:15px;">${icon(u.icon,17)}</span>
            <span style="font-size:12.5px; color:var(--paper); flex:1; line-height:1.4;">${esc(u.text)}</span>
            ${u.open? `<span style="color:var(--fog-dim); font-size:12px;">→</span>`:""}
          </div>
        `).join("")}
      </div>
    </div>

    ${(age || milestones.length)? `
    <div class="card" data-open-custom="__profile__" style="background:linear-gradient(135deg, rgba(217,169,79,0.10), var(--panel) 55%); border-color:rgba(217,169,79,0.25);">
      ${age? `
      <div style="display:flex; align-items:baseline; gap:8px;">
        <span style="font-family:var(--font-display); font-size:34px; font-weight:700; color:var(--gold); line-height:1;">${age.years}</span>
        <span style="font-size:13px; color:var(--fog); font-weight:600;">years${age.months? " "+age.months+" months":""} old today</span>
      </div>` : ""}
      ${milestones.length? `
      <div style="display:flex; flex-direction:column; gap:8px; ${age?'margin-top:14px; padding-top:14px; border-top:1px solid var(--line);':''}">
        ${milestones.map(m=>`
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:17px; width:22px; text-align:center;">${m.icon}</span>
            <span style="font-size:13px; color:var(--paper); flex:1;">${m.label}</span>
            <span style="font-size:12px; color:var(--fog); font-family:var(--font-mono);">${m.ago}</span>
          </div>`).join("")}
      </div>` : ""}
    </div>` : ""}

    ${lastBody? `
    <div class="card" data-open-custom="__profile__">
      <h2><span class="em">⚖️</span>Body</h2>
      <div class="stat-grid">
        <div class="stat"><div class="n">${lastBody.weight||"—"}</div><div class="l">kg</div></div>
        <div class="stat"><div class="n">${lastBody.height||"—"}</div><div class="l">cm</div></div>
        <div class="stat"><div class="n">${(lastBody.weight&&lastBody.height)?(lastBody.weight/((lastBody.height/100)**2)).toFixed(1):"—"}</div><div class="l">BMI</div></div>
      </div>
    </div>` : ""}

    ${updateAvailable? `
    <div class="card" style="border-color:var(--gold); background:linear-gradient(180deg, rgba(217,169,79,0.14), var(--panel));">
      <h2><span class="em">⬆️</span>New version available</h2>
      <p style="font-size:13px; color:var(--fog); margin:0 0 12px;">An updated build of Life OS is ready.</p>
      <button class="btn sm" id="home-update-btn">Update now</button>
    </div>` : ""}

    <div class="card">
      <div class="ring-wrap">
        ${ringSVG(scores)}
        <div class="ring-legend">
          ${RING_DIMS.map(d=>`<div class="li"><span class="dot" style="background:${d.color}"></span>${d.label}</div>`).join("")}
        </div>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="n">${todaysTasks.length}</div><div class="l">tasks today</div></div>
      <div class="stat"><div class="n">${todaysReminders.length}</div><div class="l">reminders</div></div>
      <div class="stat"><div class="n">${fmtMoney(spentToday)}</div><div class="l">spent today</div></div>
      <div class="stat"><div class="n">${activeGoals}</div><div class="l">active goals</div></div>
      <div class="stat"><div class="n">${maxStreak}d</div><div class="l">best streak</div></div>
      <div class="stat"><div class="n">${subsDue}</div><div class="l">due this week</div></div>
    </div>

    <div class="section-label">Today's Focus</div>
    <div class="card">
      ${top3.length? top3.map(t=>`<div class="row" data-open="tasks|${t.id}"><div class="chk">${""}</div><div class="row-body"><div class="row-title">${esc(t.title)}</div></div></div>`).join("")
        : `<div class="empty"><span class="em">🎯</span><p>No Top 3 priorities set. Mark a task as "Top 3" to pin it here.</p></div>`}
    </div>

    <div class="section-label">Reflection</div>
    <div class="card" data-open-new="journal">
      <p style="margin:0; font-size:13.5px; color:${wroteToday?'var(--fog)':'var(--paper)'};">
        ${wroteToday? "You wrote in your journal today. ✅" : "You haven't written today's journal yet."}
      </p>
    </div>
  `;
  el2.querySelectorAll("[data-open]").forEach(n=> n.addEventListener("click", ()=>{
    const [m,id]=n.dataset.open.split("|"); pushModule("detail", m, id);
  }));
  el2.querySelectorAll("[data-open-new]").forEach(n=> n.addEventListener("click", ()=> pushModule("form", n.dataset.openNew, null)));
  el2.querySelectorAll("[data-open-custom]").forEach(n=> n.addEventListener("click", ()=> pushModule("list", n.dataset.openCustom, null)));
  el2.querySelectorAll("[data-open-list]").forEach(n=> n.addEventListener("click", ()=> pushModule("list", n.dataset.openList, null)));
  const homeUpdateBtn = el2.querySelector("#home-update-btn");
  if(homeUpdateBtn) homeUpdateBtn.addEventListener("click", applyUpdate);
  const homeAvatar = document.getElementById("home-avatar");
  if(homeAvatar && profile && profile.photo instanceof Blob){
    homeAvatar.style.backgroundImage = `url(${URL.createObjectURL(profile.photo)})`;
    homeAvatar.style.backgroundSize = "cover";
    homeAvatar.style.backgroundPosition = "center";
    homeAvatar.addEventListener("click", ()=> pushModule("list","__profile__",null));
  }
  updateNotifBadge();
}

/* =========================================================================
   PLAN TAB — Tasks, Reminders, Notes
   ========================================================================= */
async function renderPlan(){
  document.getElementById("topbar-title").textContent = "Plan";
  const el2 = document.getElementById("screen-plan");
  const [tasks, reminders] = await Promise.all([DB.getAll("tasks"), DB.getAll("reminders")]);
  const today = todayStr();
  const overdue = tasks.filter(t=>!t.done && t.dueDate && t.dueDate<today);
  const dueToday = tasks.filter(t=>!t.done && t.dueDate===today);
  const upcoming = tasks.filter(t=>!t.done && t.dueDate && t.dueDate>today).sort((a,b)=>a.dueDate<b.dueDate?-1:1);
  const noDate = tasks.filter(t=>!t.done && !t.dueDate);
  const doneCount = tasks.filter(t=>t.done).length;
  const activeReminders = reminders.filter(r=>!r.done).sort((a,b)=>(a.dueDate||"")<(b.dueDate||"")?-1:1);
  const weekStart = (()=>{ const d=new Date(); d.setDate(d.getDate()-d.getDay()); return d.toISOString().slice(0,10); })();
  const weekTasks = tasks.filter(t=>t.dueDate && t.dueDate>=weekStart);
  const weekDone = weekTasks.filter(t=>t.done).length;
  const weekPct = weekTasks.length? Math.round((weekDone/weekTasks.length)*100) : 0;

  function taskCard(t){
    const pClass = t.priority==="Top 3"?"top3":t.priority==="High"?"high":"";
    return `<div class="grid-card ${pClass}" data-id="${t.id}">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div class="chk ${t.done?'done':''}" data-toggle="${t.id}">${t.done?'✓':''}</div>
      </div>
      <div data-open="${t.id}">
        <div class="gc-title" style="${t.done?'text-decoration:line-through;color:var(--fog-dim);':''}">${esc(t.title)}</div>
        <div class="gc-sub">${t.dueDate? fmtDate(t.dueDate):'No date'}${t.priority==='Top 3'?' • Top 3':t.priority==='High'?' • High':''}</div>
      </div>
    </div>`;
  }
  function remCard(r){
    return `<div class="grid-card" data-id="${r.id}">
      <div class="chk ${r.done?'done':''}" data-toggle-rem="${r.id}">${r.done?'✓':''}</div>
      <div data-open-rem="${r.id}">
        <div class="gc-title" style="${r.done?'text-decoration:line-through;color:var(--fog-dim);':''}">${esc(r.title)}</div>
        <div class="gc-sub">${fmtDate(r.dueDate)}</div>
      </div>
    </div>`;
  }

  el2.innerHTML = `
    <div class="plan-hero">
      <div class="plan-hero-stat" data-open-list="tasks"><div class="n" style="color:${overdue.length?'var(--clay)':'var(--paper)'}">${overdue.length}</div><div class="l">Overdue</div></div>
      <div class="plan-hero-stat" data-open-list="tasks"><div class="n">${dueToday.length}</div><div class="l">Due today</div></div>
      <div class="plan-hero-stat" data-open-list="reminders"><div class="n">${activeReminders.length}</div><div class="l">Reminders</div></div>
      <button class="plan-hero-cal" id="plan-cal-btn">${icon("calendar",18)}<span>Calendar</span></button>
    </div>
    ${weekTasks.length? `<div class="card" style="padding:12px 14px; margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-size:12px; color:var(--fog); font-weight:600;">This week</span>
        <span style="font-size:12px; color:var(--gold); font-weight:700;">${weekDone}/${weekTasks.length}</span>
      </div>
      <div style="height:6px; background:var(--panel-2); border-radius:4px; overflow:hidden;"><div style="height:100%; width:${weekPct}%; background:var(--gold); transition:width .4s ease;"></div></div>
    </div>`:""}

    <div class="section-label">Reminders</div>
    <div class="card-grid">
      ${activeReminders.length? activeReminders.map(remCard).join("") : `<div class="empty full-span">${icon("bell",26)}<p>No reminders yet.</p></div>`}
    </div>
    <div style="margin:12px 0 14px;"><button class="btn ghost" data-new="reminders">+ Add reminder</button></div>

    ${overdue.length? `<div class="section-label" style="color:var(--clay);">Overdue</div><div class="card-grid">${overdue.map(taskCard).join("")}</div>`:""}

    <div class="section-label">Today</div>
    <div class="card-grid">${dueToday.length? dueToday.map(taskCard).join("") : `<div class="empty full-span">${icon("check",26)}<p>Nothing due today.</p></div>`}</div>

    <div class="section-label">Upcoming</div>
    <div class="card-grid">${upcoming.length? upcoming.slice(0,8).map(taskCard).join("") : `<div class="empty full-span"><p>Nothing scheduled.</p></div>`}</div>

    ${noDate.length? `<div class="section-label">No date</div><div class="card-grid">${noDate.map(taskCard).join("")}</div>`:""}

    <div style="margin:14px 0;"><button class="btn" data-new="tasks">+ Add task</button></div>

    <div class="section-label">Notes ${doneCount?`<span style="color:var(--fog-dim); text-transform:none; letter-spacing:0;">· ${doneCount} tasks completed all-time</span>`:''}</div>
    <div class="card-grid" id="plan-notes-preview"></div>
    <button class="btn ghost" data-openmod="notes">Open all notes</button>
  `;

  const notes = (await DB.getAll("notes")).sort((a,b)=>(b.updatedAt||"")<(a.updatedAt||"")?-1:1).slice(0,4);
  document.getElementById("plan-notes-preview").innerHTML = notes.length? notes.map(n=>`
    <div class="grid-card" data-open="${n.id}"><div class="gc-title">${icon("note",14)} ${esc(n.title)}</div><div class="gc-sub">${esc((n.body||"").slice(0,50))}</div></div>
  `).join("") : `<div class="empty full-span"><p>No notes yet.</p></div>`;
  document.getElementById("plan-notes-preview").querySelectorAll("[data-open]").forEach(n=> n.addEventListener("click", ()=> pushModule("detail","notes",n.dataset.open)));

  el2.querySelectorAll("[data-toggle]").forEach(n=> n.addEventListener("click", async (e)=>{
    e.stopPropagation(); const t = await DB.get("tasks", n.dataset.toggle); t.done=!t.done; t.completedAt = t.done? nowISO(): null; await DB.put("tasks", t);
    if(t.done) playCategorySound("tasks");
    renderPlan(); toast(t.done?"Task completed":"Marked incomplete");
  }));
  el2.querySelectorAll("[data-open]").forEach(n=> n.addEventListener("click", ()=> pushModule("form","tasks",n.dataset.open)));
  el2.querySelectorAll("[data-toggle-rem]").forEach(n=> n.addEventListener("click", async (e)=>{
    e.stopPropagation(); const r = await DB.get("reminders", n.dataset.toggleRem); r.done=!r.done; await DB.put("reminders", r); renderPlan();
  }));
  el2.querySelectorAll("[data-open-rem]").forEach(n=> n.addEventListener("click", ()=> pushModule("form","reminders",n.dataset.openRem)));
  el2.querySelectorAll("[data-new]").forEach(n=> n.addEventListener("click", ()=> pushModule("form", n.dataset.new, null)));
  el2.querySelectorAll("[data-openmod]").forEach(n=> n.addEventListener("click", ()=> pushModule("list", n.dataset.openmod, null)));
  el2.querySelectorAll("[data-open-list]").forEach(n=> n.addEventListener("click", ()=> pushModule("list", n.dataset.openList, null)));
  el2.querySelector("#plan-cal-btn").addEventListener("click", ()=> pushModule("list", "__calendar__", null));
}

/* =========================================================================
   MONEY TAB
   ========================================================================= */
async function renderMoney(){
  document.getElementById("topbar-title").textContent = "Money";
  const el2 = document.getElementById("screen-money");
  const [expenses, income, budgets, debts, subs] = await Promise.all([
    DB.getAll("expenses"), DB.getAll("income"), DB.getAll("budgets"), DB.getAll("debts"), DB.getAll("subscriptions")
  ]);
  const ym = todayStr().slice(0,7);
  const monthExpenses = expenses.filter(e=>e.date && e.date.slice(0,7)===ym);
  const monthIncome = income.filter(i=>i.date && i.date.slice(0,7)===ym);
  const totalOut = monthExpenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const totalIn = monthIncome.reduce((s,i)=>s+Number(i.amount||0),0);
  const saved = totalIn-totalOut;
  const owed = debts.filter(d=>d.direction==="They owe me").reduce((s,d)=>s+Number(d.remaining!=null?d.remaining:d.amount||0),0);
  const owe = debts.filter(d=>d.direction==="I owe them").reduce((s,d)=>s+Number(d.remaining!=null?d.remaining:d.amount||0),0);

  const monthlySubCost = subs.reduce((s,x)=>{
    const m = {Weekly:4.33, Monthly:1, Quarterly:1/3, Yearly:1/12}[x.frequency]||1;
    return s + Number(x.amount||0)*m;
  },0);
  const upcomingSubs = subs.filter(s=> s.nextPaymentDate && daysUntil(s.nextPaymentDate)!=null && daysUntil(s.nextPaymentDate)>=0 && daysUntil(s.nextPaymentDate)<=14)
    .sort((a,b)=>a.nextPaymentDate<b.nextPaymentDate?-1:1);

  const byCat = {};
  monthExpenses.forEach(e=> byCat[e.category]=(byCat[e.category]||0)+Number(e.amount||0));
  const topCat = Object.entries(byCat).sort((a,b)=>b[1]-a[1])[0];

  el2.innerHTML = `
    <div class="card">
      <h2><span class="em">💰</span>This month</h2>
      <div class="stat-grid">
        <div class="stat"><div class="n" style="color:var(--sage)">${fmtMoney(totalIn)}</div><div class="l">money in</div></div>
        <div class="stat"><div class="n" style="color:var(--clay)">${fmtMoney(totalOut)}</div><div class="l">money out</div></div>
        <div class="stat"><div class="n">${fmtMoney(saved)}</div><div class="l">net saved</div></div>
        <div class="stat"><div class="n">${fmtMoney(owed)}</div><div class="l">owed to me</div></div>
        <div class="stat"><div class="n">${fmtMoney(owe)}</div><div class="l">I owe</div></div>
        <div class="stat"><div class="n">${fmtMoney(monthlySubCost)}</div><div class="l">subs / month</div></div>
      </div>
      ${topCat? `<p style="font-size:12.5px; color:var(--fog); margin:14px 0 0;">Highest spending category: <b style="color:var(--paper);">${esc(topCat[0])}</b> (${fmtMoney(topCat[1])})</p>`:""}
    </div>

    ${upcomingSubs.length? `
    <div class="section-label">Upcoming renewals</div>
    <div class="card">
      ${upcomingSubs.map(s=>`<div class="row" data-open="subscriptions|${s.id}"><div class="row-icon">🔄</div><div class="row-body"><div class="row-title">${esc(s.name)}</div><div class="row-sub">${daysUntil(s.nextPaymentDate)===0?"Due today":"Due "+fmtDate(s.nextPaymentDate)}</div></div><div class="row-amt" style="color:var(--clay)">${fmtMoney(s.amount)}</div></div>`).join("")}
    </div>`:""}

    <div class="section-label">Manage</div>
    <div class="tile-grid">
      <div class="tile" data-open="expenses"><div class="em">${icon("wallet",22)}</div><div class="l">Expenses</div><div class="d">${expenses.length} logged</div></div>
      <div class="tile" data-open="income"><div class="em">${icon("wallet",22)}</div><div class="l">Income</div><div class="d">${income.length} logged</div></div>
      <div class="tile" data-open="budgets"><div class="em">${icon("wallet",22)}</div><div class="l">Budgets</div><div class="d">${budgets.length} set</div></div>
      <div class="tile" data-open="debts"><div class="em">${icon("wallet",22)}</div><div class="l">Debts</div><div class="d">${debts.length} tracked</div></div>
      <div class="tile" data-open="subscriptions"><div class="em">${icon("wallet",22)}</div><div class="l">Subscriptions</div><div class="d">${subs.length} active</div></div>
    </div>
  `;
  el2.querySelectorAll("[data-open]").forEach(n=>{
    if(n.dataset.open.includes("|")){
      const [m,id]=n.dataset.open.split("|"); n.addEventListener("click", ()=>pushModule("detail", m, id));
    } else {
      n.addEventListener("click", ()=>pushModule("list", n.dataset.open, null));
    }
  });
  addScrollArrows(el2);
}

/* =========================================================================
   GROW TAB — Goals + Habits
   ========================================================================= */
async function renderGrow(){
  document.getElementById("topbar-title").textContent = "Grow";
  const el2 = document.getElementById("screen-grow");
  const [goals, habits, allCompletions, learning] = await Promise.all([DB.getAll("personalGoals"), DB.getAll("habits"), DB.getAll("habitCompletions"), DB.getAll("learningItems")]);
  const streaks = {};
  for(const h of habits) streaks[h.id] = await habitStreak(h.id);
  const doneToday = {};
  const todaysComps = allCompletions.filter(c=>c.date===todayStr());
  todaysComps.forEach(c=> doneToday[c.habitId]=true);
  const completedGoals = goals.filter(g=>g.status==="Completed").length;
  const activeLearning = learning.filter(l=>l.status!=="Completed");
  const last7 = Array.from({length:7}, (_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(6-i)); return d.toISOString().slice(0,10); });
  function trail(habitId){
    const doneDates = new Set(allCompletions.filter(c=>c.habitId===habitId).map(c=>c.date));
    return `<div style="display:flex; gap:3px; margin-top:6px;">${last7.map(d=>`<div title="${d}" style="width:9px; height:9px; border-radius:3px; background:${doneDates.has(d)?'var(--sage)':'var(--panel-2)'};"></div>`).join("")}</div>`;
  }

  function ring(pct, size){
    size = size||44;
    const r = size/2 - 4, c = 2*Math.PI*r;
    const off = c - (Math.min(100,pct)/100)*c;
    return `<svg width="${size}" height="${size}" style="flex:none; transform:rotate(-90deg);">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--panel-2)" stroke-width="4"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--gold)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" style="transition:stroke-dashoffset .5s ease;"/>
    </svg>`;
  }
  function goalCard(g, icn){
    const pct = Math.min(100,Number(g.progress)||0);
    return `<div class="grid-card" data-open="personalGoals|${g.id}" style="align-items:center; text-align:center;">
      <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
        ${ring(pct)}
        <span style="position:absolute; font-size:10px; font-weight:700; color:var(--paper);">${pct}%</span>
      </div>
      <div class="gc-title">${esc(g.title)}</div>
      <div class="gc-sub">${g.targetDate?"Target "+fmtDate(g.targetDate):(icn==="mountain"?"Long-term":"")}</div>
    </div>`;
  }

  el2.innerHTML = `
    <div class="section-label">Today's habits ${habits.length?`<span style="color:var(--fog-dim); text-transform:none; letter-spacing:0;">· ${Object.keys(doneToday).length}/${habits.length} done</span>`:''}</div>
    <div class="card-grid">
      ${habits.length? habits.map(h=>`
        <div class="grid-card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div class="chk ${doneToday[h.id]?'done':''}" data-habit="${h.id}">${doneToday[h.id]?'✓':''}</div>
            ${streaks[h.id]>0? `<div class="streak-pill">${icon("flame",13)}${streaks[h.id]}</div>`:""}
          </div>
          <div class="gc-title">${esc(h.name)}</div><div class="gc-sub">${h.frequency||"Daily"}</div>
          ${trail(h.id)}
        </div>`).join("") : `<div class="empty full-span">${icon("sprout",28)}<p>No habits yet. Add one to start a streak.</p></div>`}
    </div>
    <div style="margin:12px 0 14px;"><button class="btn ghost" data-new="habit">+ Add habit</button></div>

    <div class="section-label">Long-term goals</div>
    <div class="card-grid">
      ${goals.filter(g=>g.term==="Long-term" && g.status!=="Completed").length? goals.filter(g=>g.term==="Long-term" && g.status!=="Completed").map(g=>goalCard(g,"mountain")).join("") : `<div class="empty full-span">${icon("mountain",28)}<p>No long-term goals yet — the big, multi-year stuff goes here.</p></div>`}
    </div>

    <div class="section-label">Goals</div>
    <div class="card-grid">
      ${goals.filter(g=>g.term!=="Long-term" && g.status!=="Completed").length? goals.filter(g=>g.term!=="Long-term" && g.status!=="Completed").map(g=>goalCard(g,"target")).join("") : `<div class="empty full-span">${icon("target",28)}<p>No goals yet.</p></div>`}
    </div>
    ${completedGoals? `<div style="display:flex; align-items:center; gap:6px; margin:10px 0; font-size:12px; color:var(--fog);">${icon("trophy",15)}<span>${completedGoals} goal(s) completed</span></div>`:""}
    <div style="margin-bottom:14px;"><button class="btn ghost" data-new="personalGoals">+ Add goal</button></div>

    <div class="section-label">Learning</div>
    <div class="card-grid">
      ${activeLearning.length? activeLearning.map(l=>`
        <div class="grid-card" data-open="learning|${l.id}">
          <div class="gc-title">${esc(l.title)}</div>
          <div class="gc-sub">${esc(l.type||"")}${l.status?" • "+esc(l.status):""}</div>
          <div style="height:5px; background:var(--panel-2); border-radius:4px; margin-top:6px; overflow:hidden;"><div style="height:100%; width:${Math.min(100,Number(l.progress)||0)}%; background:var(--blue); transition:width .4s ease;"></div></div>
        </div>`).join("") : `<div class="empty full-span">${icon("graduation",28)}<p>No courses, books, or skills being tracked yet.</p></div>`}
    </div>
    <button class="btn" data-new="learning">+ Add learning item</button>
  `;
  el2.querySelectorAll("[data-habit]").forEach(n=> n.addEventListener("click", async ()=>{
    const willComplete = !doneToday[n.dataset.habit];
    await toggleHabitToday(n.dataset.habit);
    if(willComplete) playCategorySound("habits");
    renderGrow();
  }));
  el2.querySelectorAll("[data-open]").forEach(n=>{ const [m,id]=n.dataset.open.split("|"); n.addEventListener("click", ()=>pushModule("form", m, id)); });
  el2.querySelectorAll("[data-new]").forEach(n=> n.addEventListener("click", ()=>{
    if(n.dataset.new==="habit") openHabitForm(); else pushModule("form", n.dataset.new, null);
  }));
}

function openHabitForm(existing){
  openSheet(`
    <div class="sheet-title">${existing?"Edit habit":"New habit"}</div>
    <label>Habit name</label><input id="hf-name" value="${existing?esc(existing.name):''}" placeholder="e.g. Read 20 pages">
    <label>Frequency</label>
    <select id="hf-freq"><option ${existing&&existing.frequency==='Daily'?'selected':''}>Daily</option><option ${existing&&existing.frequency==='Weekly'?'selected':''}>Weekly</option></select>
    <div class="btn-row">
      <button class="btn" id="hf-save">Save</button>
      ${existing?`<button class="btn danger" id="hf-del">Delete</button>`:""}
    </div>
  `);
  document.getElementById("hf-save").onclick = async ()=>{
    const name = document.getElementById("hf-name").value.trim();
    if(!name){ toast("Enter a habit name"); return; }
    const rec = existing || {id:uid(), createdAt:nowISO()};
    rec.name = name; rec.frequency = document.getElementById("hf-freq").value;
    await DB.put("habits", rec); closeSheet(); renderGrow(); toast("Habit saved");
  };
  if(existing){ document.getElementById("hf-del").onclick = async ()=>{ await DB.delete("habits", existing.id); closeSheet(); renderGrow(); }; }
}

/* =========================================================================
   MORE TAB — module tiles + settings/backup/search entry points
   ========================================================================= */
async function renderMore(){
  document.getElementById("topbar-title").textContent = "More";
  const el2 = document.getElementById("screen-more");
  const profile = await DB.get("profile","main");
  el2.innerHTML = `
    <div class="section-label">About Me</div>
    <div class="tile-grid">
      <div class="tile" data-custom="__profile__"><div class="em">${icon("user",22)}</div><div class="l">Profile</div><div class="d">Birthday, sex, education, hobbies, fears</div></div>
      <div class="tile" data-open="sleepLogs"><div class="em">${icon("moon",22)}</div><div class="l">Sleep</div></div>
      <div class="tile" data-open="bodyLogs"><div class="em">${icon("scale",22)}</div><div class="l">Weight & height</div></div>
      ${profile&&profile.sex==="Female"? `<div class="tile" data-open="cycleLogs"><div class="em">${icon("heart",22)}</div><div class="l">Cycle log</div></div>`:""}
      <div class="tile" data-custom="__locations__"><div class="em">${icon("mapPin",22)}</div><div class="l">Location log</div></div>
      <div class="tile" data-custom="__photos__"><div class="em">${icon("image",22)}</div><div class="l">Photos</div></div>
      <div class="tile" data-open="relationships"><div class="em">${icon("heart",22)}</div><div class="l">Friends & relationships</div></div>
      <div class="tile" data-custom="__household__"><div class="em">${icon("users",22)}</div><div class="l">Household budget</div><div class="d">Wife, kids — spending by member</div></div>
      <div class="tile" data-custom="__sharedgoals__"><div class="em">${icon("link",22)}</div><div class="l">Shared goals</div><div class="d">Save toward one goal together</div></div>
    </div>
    <div class="section-label">Track</div>
    <div class="tile-grid">
      <div class="tile" data-custom="__fasting__"><div class="em">${icon("timer",22)}</div><div class="l">Fasting</div></div>
      <div class="tile" data-open="learning"><div class="em">${icon("graduation",22)}</div><div class="l">Learning</div></div>
      <div class="tile" data-open="foodLogs"><div class="em">${icon("bowl",22)}</div><div class="l">Diet</div></div>
      <div class="tile" data-open="gymRoutines"><div class="em">${icon("gym",22)}</div><div class="l">Gym routines</div></div>
      <div class="tile" data-open="workouts"><div class="em">${icon("activity",22)}</div><div class="l">Fitness log</div></div>
      <div class="tile" data-open="books"><div class="em">${icon("book",22)}</div><div class="l">Reading</div></div>
      <div class="tile" data-open="inventory"><div class="em">${icon("box",22)}</div><div class="l">Inventory</div></div>
      <div class="tile" data-open="places"><div class="em">${icon("mapPin",22)}</div><div class="l">Places & bucket list</div></div>
    </div>
    <div class="section-label">Records</div>
    <div class="tile-grid">
      <div class="tile" data-open="contacts"><div class="em">${icon("user",22)}</div><div class="l">Contacts</div></div>
      <div class="tile" data-custom="__documents__"><div class="em">${icon("doc",22)}</div><div class="l">Documents</div></div>
      <div class="tile" data-open="trips"><div class="em">${icon("plane",22)}</div><div class="l">Travel</div></div>
      <div class="tile" data-custom="__timeline__"><div class="em">${icon("clock",22)}</div><div class="l">Life timeline</div></div>
    </div>
    <div class="section-label">Reflect</div>
    <div class="tile-grid">
      <div class="tile" data-open="journal"><div class="em">${icon("book",22)}</div><div class="l">Journal</div></div>
      <div class="tile" data-open="moods"><div class="em">${icon("smile",22)}</div><div class="l">Mood</div></div>
      <div class="tile" data-open="gratitude"><div class="em">${icon("heart",22)}</div><div class="l">Gratitude</div></div>
      <div class="tile" data-custom="__achievements__"><div class="em">${icon("trophy",22)}</div><div class="l">Achievements</div></div>
    </div>
    <div class="section-label">Reviews</div>
    <div class="tile-grid">
      <div class="tile" data-review="weekly"><div class="em">${icon("doc",22)}</div><div class="l">Weekly review</div></div>
      <div class="tile" data-review="monthly"><div class="em">${icon("calendar",22)}</div><div class="l">Monthly review</div></div>
    </div>
    <div class="section-label">System</div>
    <div class="tile-grid">
      <div class="tile" data-action="search"><div class="em">${icon("search",22)}</div><div class="l">Search</div><div class="d">Across everything</div></div>
      <div class="tile" data-action="backup"><div class="em">${icon("save",22)}</div><div class="l">Backup & restore</div><div class="d">Export / import data</div></div>
      <div class="tile" data-action="settings"><div class="em">${icon("gear",22)}</div><div class="l">Settings</div><div class="d">Name, currency, PIN</div></div>
      <div class="tile" data-action="about"><div class="em">${icon("info",22)}</div><div class="l">About & roadmap</div></div>
      <div class="tile" data-action="whatsnew"><div class="em">${icon("sparkle",22)}</div><div class="l">What's new</div><div class="d">v${APP_VERSION}</div></div>
      <div class="tile" data-action="share"><div class="em">${icon("share",22)}</div><div class="l">Share app</div><div class="d">Link + QR code</div></div>
      <div class="tile" data-action="terms"><div class="em">${icon("doc",22)}</div><div class="l">Terms & Conditions</div></div>
      <div class="tile" data-action="privacy"><div class="em">${icon("shield",22)}</div><div class="l">Privacy Policy</div></div>
    </div>
    <p style="font-size:11.5px; color:var(--fog-dim); text-align:center; margin-top:24px;">Everything here lives only on this device.</p>
    <p style="font-size:11px; color:var(--fog-dim); text-align:center; margin-top:6px;">Built by Darius — <a href="https://dmn-solution.vercel.app" target="_blank" rel="noopener" style="color:var(--fog);">dmn-solution.vercel.app</a></p>
  `;
  el2.querySelectorAll("[data-open]").forEach(n=> n.addEventListener("click", ()=>pushModule("list", n.dataset.open, null)));
  el2.querySelectorAll("[data-custom]").forEach(n=> n.addEventListener("click", ()=>pushModule("list", n.dataset.custom, null)));
  el2.querySelector('[data-action="search"]').addEventListener("click", openSearch);
  el2.querySelector('[data-action="backup"]').addEventListener("click", openBackupSheet);
  el2.querySelector('[data-action="settings"]').addEventListener("click", openSettingsSheet);
  el2.querySelector('[data-action="about"]').addEventListener("click", openAboutSheet);
  el2.querySelector('[data-action="whatsnew"]').addEventListener("click", ()=> openSheet(`
    <div class="sheet-title">✨ What's new in ${APP_VERSION}</div>
    ${CHANGELOG.map(c=>`
      <div style="margin-top:14px;">
        <div style="font-family:var(--font-mono); font-size:11px; color:var(--gold); font-weight:700; margin-bottom:6px;">v${c.version}</div>
        ${c.changes.map(ch=>`<div style="display:flex; gap:8px; margin-bottom:6px;"><span style="color:var(--sage);">✓</span><span style="font-size:13px; color:var(--paper); line-height:1.4;">${esc(ch)}</span></div>`).join("")}
      </div>
    `).join("")}
  `));
  el2.querySelector('[data-action="share"]').addEventListener("click", openShareSheet);
  el2.querySelector('[data-action="terms"]').addEventListener("click", openTermsSheet);
  el2.querySelector('[data-action="privacy"]').addEventListener("click", openPrivacySheet);
  el2.querySelector('[data-review="weekly"]').addEventListener("click", ()=>openReview("weekly"));
  el2.querySelector('[data-review="monthly"]').addEventListener("click", ()=>openReview("monthly"));
  addScrollArrows(el2);
}
function openShareSheet(){
  const url = location.href.split("#")[0];
  openSheet(`
    <div class="sheet-title">Share Life OS</div>
    <p style="font-size:12.5px; color:var(--fog); line-height:1.6;">Share this link with someone so they can install their own copy. Each install gets its own separate, private data — nothing here is shared between installs.</p>
    <div class="card" style="background:var(--panel-2); margin:14px 0; word-break:break-all;">
      <p style="font-size:12.5px; color:var(--paper); margin:0; font-family:var(--font-mono);">${esc(url)}</p>
    </div>
    <div class="btn-row">
      <button class="btn" id="share-native">📤 Share link</button>
      <button class="btn ghost" id="share-copy">Copy</button>
    </div>
    <div class="section-label">QR code</div>
    <div class="card" style="text-align:center;">
      <img id="share-qr" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}" style="width:220px; height:220px; background:#fff; border-radius:8px; padding:8px;" onerror="this.style.display='none'; document.getElementById('share-qr-fallback').style.display='block';">
      <p id="share-qr-fallback" style="display:none; font-size:12px; color:var(--fog);">QR code needs an internet connection to generate — copy the link above instead.</p>
      <p style="font-size:11px; color:var(--fog-dim); margin-top:10px;">Scan to open this same link on another phone.</p>
    </div>
  `);
  document.getElementById("share-native").addEventListener("click", async ()=>{
    if(navigator.share){
      try{ await navigator.share({title:"Life OS", text:"A private, offline life management app — install your own copy:", url}); }catch(e){ /* user cancelled */ }
    } else {
      try{ await navigator.clipboard.writeText(url); toast("Link copied"); }catch(e){ toast("Couldn't copy — copy it manually above"); }
    }
  });
  document.getElementById("share-copy").addEventListener("click", async ()=>{
    try{ await navigator.clipboard.writeText(url); toast("Link copied"); }catch(e){ toast("Couldn't copy — select it manually"); }
  });
}

/* =========================================================================
   GENERIC MODULE SCREEN — list / form / detail, driven by MODULES config
   ========================================================================= */
const CUSTOM_SCREENS = {
  "__documents__": {label:"Documents", render:renderDocumentsScreen},
  "__timeline__": {label:"Timeline", render:renderTimelineScreen},
  "__achievements__": {label:"Achievements", render:renderAchievementsScreen},
  "__calendar__": {label:"Calendar", render:renderCalendarScreen},
  "__profile__": {label:"About Me", render:renderProfileScreen},
  "__locations__": {label:"Location log", render:renderLocationsScreen},
  "__photos__": {label:"Photos", render:renderPhotosScreen},
  "__assistant__": {label:"Assistant", render:renderAssistantScreen},
  "__household__": {label:"Household budget", render:renderHouseholdScreen},
  "__sharedgoals__": {label:"Shared goals", render:renderSharedGoalsScreen},
  "__fasting__": {label:"Fasting", render:renderFastingScreen}
};
/* ---------- Fasting ----------
   Fully local, no backend needed. A session's status moves
   active → (paused ⇄ active) → completed/cancelled. Elapsed time excludes
   any accumulated paused duration so pausing genuinely freezes the clock. */
const FAST_PRESETS = [12,14,16,18,20,24];
function fastElapsedMs(s){
  const start = new Date(s.startTime).getTime();
  const end = s.endTime? new Date(s.endTime).getTime() : Date.now();
  let paused = s.totalPausedMs||0;
  if(s.status==="paused" && s.pausedAt) paused += (Date.now() - new Date(s.pausedAt).getTime());
  return Math.max(0, end - start - paused);
}
function fmtDur(ms){
  const totalMin = Math.floor(ms/60000);
  const h = Math.floor(totalMin/60), m = totalMin%60;
  return `${h}h ${m}m`;
}
async function fastingStreak(){
  const sessions = (await DB.getAll("fastingSessions")).filter(s=>s.status==="completed").sort((a,b)=>(b.startTime||"")<(a.startTime||"")?-1:1);
  if(!sessions.length) return 0;
  const days = [...new Set(sessions.map(s=>s.startTime.slice(0,10)))].sort().reverse();
  let streak = 0; let cursor = new Date();
  for(const d of days){
    const cursorStr = cursor.toISOString().slice(0,10);
    if(d===cursorStr){ streak++; cursor.setDate(cursor.getDate()-1); }
    else if(d < cursorStr) break;
  }
  return streak;
}
let fastingTimerHandle = null;
async function renderFastingScreen(el2){
  clearInterval(fastingTimerHandle);
  const sessions = await DB.getAll("fastingSessions");
  const active = sessions.find(s=>s.status==="active"||s.status==="paused");
  const completed = sessions.filter(s=>s.status==="completed").sort((a,b)=>(b.startTime||"")<(a.startTime||"")?-1:1);
  const streak = await fastingStreak();
  const longest = completed.length? Math.max(...completed.map(fastElapsedMs)) : 0;

  if(active){
    const plannedMs = active.plannedHours*3600000;
    el2.innerHTML = `
      <button class="detail-back" data-back>← Back</button>
      <div class="card" style="text-align:center; padding:22px 16px;">
        <div style="font-size:11px; color:var(--fog); letter-spacing:1.5px; text-transform:uppercase; font-weight:700;">${active.status==="paused"?"Paused":"Fasting"}</div>
        <div style="position:relative; width:210px; height:210px; margin:18px auto;">
          <svg width="210" height="210" style="transform:rotate(-90deg);">
            <circle cx="105" cy="105" r="92" fill="none" stroke="var(--panel-2)" stroke-width="9"/>
            <circle id="fast-ring" cx="105" cy="105" r="92" fill="none" stroke="${active.status==='paused'?'var(--fog-dim)':'var(--gold)'}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${2*Math.PI*92}" style="transition:stroke-dashoffset 1s linear;"/>
          </svg>
          <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
            <div id="fast-elapsed" style="font-family:var(--font-mono); font-size:26px; font-weight:700; color:var(--paper);">0h 0m</div>
            <div id="fast-remaining" style="font-size:11.5px; color:var(--fog-dim); margin-top:4px;">of ${active.plannedHours}h planned</div>
          </div>
        </div>
        <div id="fast-pct" style="font-size:13px; color:var(--gold); font-weight:700; margin-bottom:16px;">0%</div>
        <div class="btn-row">
          <button class="btn ghost" id="fast-toggle">${active.status==="paused"?icon("play",16)+" Resume":icon("pause",16)+" Pause"}</button>
          <button class="btn" id="fast-end">${icon("stop",16)} End fast</button>
        </div>
        <button class="btn ghost sm" id="fast-cancel" style="margin-top:10px; color:var(--clay);">Cancel (don't count this one)</button>
      </div>
      <div class="stat-grid" style="margin-top:16px;">
        <div class="stat"><div class="n">${streak}</div><div class="l">Day streak</div></div>
        <div class="stat"><div class="n">${completed.length}</div><div class="l">Total fasts</div></div>
        <div class="stat"><div class="n">${fmtDur(longest)}</div><div class="l">Longest</div></div>
      </div>
      ${fastHistoryHTML(completed)}
    `;
    const tick = ()=>{
      const elapsedEl = document.getElementById("fast-elapsed");
      if(!elapsedEl){ clearInterval(fastingTimerHandle); return; } // screen navigated away — stop ticking
      const elapsed = fastElapsedMs(active);
      const pct = Math.min(100, (elapsed/plannedMs)*100);
      const remaining = plannedMs - elapsed;
      elapsedEl.textContent = fmtDur(elapsed);
      document.getElementById("fast-pct").textContent = Math.round(pct)+"%";
      document.getElementById("fast-remaining").textContent = remaining>0? fmtDur(remaining)+" left" : "Goal reached — "+fmtDur(-remaining)+" over";
      const ring = document.getElementById("fast-ring");
      const c = 2*Math.PI*92;
      ring.style.strokeDashoffset = c - (pct/100)*c;
      if(remaining<=0 && !active.notifiedComplete){
        active.notifiedComplete = true;
        fireNotification("⏱ Fasting goal reached", `Your ${active.plannedHours}h fast is complete — end it whenever you're ready.`, "fast-"+active.id, "fasting");
      }
    };
    tick();
    fastingTimerHandle = setInterval(tick, 1000);
    el2.querySelector("[data-back]").addEventListener("click", popModule);
    el2.querySelector("#fast-toggle").addEventListener("click", async ()=>{
      if(active.status==="paused"){
        active.totalPausedMs = (active.totalPausedMs||0) + (Date.now() - new Date(active.pausedAt).getTime());
        active.pausedAt = null; active.status = "active";
      } else {
        active.pausedAt = nowISO(); active.status = "paused";
      }
      await DB.put("fastingSessions", active);
      renderFastingScreen(el2);
    });
    el2.querySelector("#fast-end").addEventListener("click", async ()=>{
      active.endTime = nowISO(); active.status = "completed";
      await DB.put("fastingSessions", active);
      playCategorySound("fasting"); toast("Fast complete — "+fmtDur(fastElapsedMs(active)));
      renderFastingScreen(el2);
    });
    el2.querySelector("#fast-cancel").addEventListener("click", async ()=>{
      if(!confirm("Cancel this fast? It won't be counted in your history.")) return;
      active.endTime = nowISO(); active.status = "cancelled";
      await DB.put("fastingSessions", active);
      renderFastingScreen(el2);
    });
    return;
  }

  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    <div class="card">
      <div class="form-head"><div class="form-head-icon" style="background:var(--clay);">${icon("timer",20)}</div><h2>Start a fast</h2></div>
      <div class="chip-grid" id="fast-presets">
        ${FAST_PRESETS.map((h,i)=>`<div class="chip-select ${i===2?'active':''}" data-hours="${h}">${h}h</div>`).join("")}
        <div class="chip-select" data-hours="custom">Custom</div>
      </div>
      <div id="fast-custom-wrap" style="display:none; margin-top:10px;">
        <div class="stepper"><button type="button" class="stepper-btn" data-step="-1">−</button><input id="fast-custom-hours" type="number" value="16"><button type="button" class="stepper-btn" data-step="1">+</button></div>
      </div>
      <button class="btn" id="fast-start" style="margin-top:16px;">${icon("play",16)} Start fast</button>
    </div>
    <div class="stat-grid" style="margin-top:16px;">
      <div class="stat"><div class="n">${streak}</div><div class="l">Day streak</div></div>
      <div class="stat"><div class="n">${completed.length}</div><div class="l">Total fasts</div></div>
      <div class="stat"><div class="n">${longest?fmtDur(longest):"—"}</div><div class="l">Longest</div></div>
    </div>
    ${fastHistoryHTML(completed)}
  `;
  el2.querySelector("[data-back]").addEventListener("click", popModule);
  let picked = 16;
  el2.querySelectorAll("#fast-presets .chip-select").forEach(chip=> chip.addEventListener("click", ()=>{
    el2.querySelectorAll("#fast-presets .chip-select").forEach(c=>c.classList.remove("active"));
    chip.classList.add("active");
    const custom = chip.dataset.hours==="custom";
    document.getElementById("fast-custom-wrap").style.display = custom? "block":"none";
    picked = custom? Number(document.getElementById("fast-custom-hours").value) : Number(chip.dataset.hours);
  }));
  el2.querySelectorAll("#fast-custom-wrap .stepper-btn").forEach(btn=> btn.addEventListener("click", ()=>{
    const inp = document.getElementById("fast-custom-hours");
    inp.value = Math.max(1, Number(inp.value) + Number(btn.dataset.step));
    picked = Number(inp.value);
  }));
  el2.querySelector("#fast-start").addEventListener("click", async ()=>{
    await DB.add("fastingSessions", {id:uid(), startTime:nowISO(), plannedHours:picked, endTime:null, status:"active", totalPausedMs:0, pausedAt:null, notifiedComplete:false, createdAt:nowISO()});
    playTone("tap"); toast("Fast started");
    renderFastingScreen(el2);
  });
}
function fastHistoryHTML(completed){
  if(!completed.length) return `<div class="section-label">History</div><div class="empty">${icon("timer",26)}<p>No fasts completed yet — start your first one above.</p></div>`;
  return `<div class="section-label">History</div><div class="card-grid">
    ${completed.slice(0,12).map(s=>{
      const ms = fastElapsedMs(s); const hit = ms >= s.plannedHours*3600000;
      return `<div class="grid-card">
        <div class="gc-title">${fmtDur(ms)}</div>
        <div class="gc-sub">${fmtDate(s.startTime.slice(0,10))} • planned ${s.plannedHours}h</div>
        <div style="font-size:11px; color:${hit?'var(--sage)':'var(--fog-dim)'}; margin-top:2px;">${hit?"✓ Goal hit":"Ended early"}</div>
      </div>`;
    }).join("")}
  </div>`;
}
/* ---------- Shared goals (optional Supabase sync) ----------
   Local-first as always: everything works and is visible on this device
   without any setup. If CONFIG.supabaseUrl/supabaseKey are filled in
   (Settings → Shared goals), progress + member profiles sync through
   Supabase so anyone with the code — not just a spouse — sees the same
   result live, with only the name/photo/birthday each person opts to share. */
const GOAL_TYPES = [
  {key:"Money", icon:"💰", unit:()=> SETTINGS.currency||"KSh"},
  {key:"Fitness", icon:"💪", unit:()=>"workouts"},
  {key:"Health", icon:"❤️", unit:()=>"kg"},
  {key:"Food", icon:"🥗", unit:()=>"meals"},
  {key:"Custom", icon:"✏️", unit:()=>"units"}
];
const SHARED_GOALS_SQL = `create table shared_goals (
  code text primary key, title text, goal_type text, unit text,
  target_amount numeric, current_amount numeric default 0, achieved boolean default false,
  updated_at timestamptz default now());
create table shared_goal_contributions (
  id uuid primary key, code text references shared_goals(code),
  amount numeric, who text, created_at timestamptz default now());
create table shared_goal_members (
  code text references shared_goals(code), member_id text, name text,
  photo text, birthday date, share_birthday boolean default false,
  notify_achieved boolean default true, updated_at timestamptz default now(),
  primary key (code, member_id));
alter table shared_goals enable row level security;
alter table shared_goal_contributions enable row level security;
alter table shared_goal_members enable row level security;
create policy "anyone with the code" on shared_goals for all using (true);
create policy "anyone with the code" on shared_goal_contributions for all using (true);
create policy "anyone with the code" on shared_goal_members for all using (true);`;
function loadSupabaseSDK(){
  return new Promise((resolve, reject)=>{
    if(window.supabase && window.supabase.createClient) return resolve(window.supabase);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload = ()=> resolve(window.supabase);
    s.onerror = ()=> reject(new Error("Could not load Supabase SDK — check your connection."));
    document.head.appendChild(s);
  });
}
let sbClient = null;
async function getSupabase(){
  if(!CONFIG.supabaseUrl || !CONFIG.supabaseKey) return null;
  if(sbClient) return sbClient;
  const sdk = await loadSupabaseSDK();
  sbClient = sdk.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  return sbClient;
}
function genShareCode(){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for(let i=0;i<6;i++) c += chars[Math.floor(Math.random()*chars.length)];
  return c;
}
async function myDeviceId(){
  if(!SETTINGS.deviceId){ SETTINGS.deviceId = uid(); await DB.put("settings", SETTINGS); }
  return SETTINGS.deviceId;
}
// Pushes (or refuses to push) this device's own profile snippet for a goal's
// members list — nothing goes out unless the person has opted in in Settings.
async function pushMyMemberProfile(code){
  if(!SETTINGS.shareProfileOnGoals) return;
  const sb = await getSupabase();
  if(!sb) return;
  const profile = await DB.get("profile","main");
  let photo = null;
  if(profile && profile.photo instanceof Blob){
    try{ photo = await blobToSmallDataURL(profile.photo, 96); }catch(e){}
  }
  await sb.from("shared_goal_members").upsert({
    code, member_id: await myDeviceId(), name: SETTINGS.name||"Someone",
    photo, birthday: (profile&&profile.birthday)||null, share_birthday: !!(profile&&profile.birthday),
    notify_achieved: true, updated_at: new Date().toISOString()
  });
}
function blobToSmallDataURL(blob, maxSize){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    const reader = new FileReader();
    reader.onload = ()=>{ img.onload = ()=>{
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxSize/Math.max(img.width,img.height));
      canvas.width = img.width*scale; canvas.height = img.height*scale;
      canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
      resolve(canvas.toDataURL("image/jpeg",0.7));
    }; img.onerror=reject; img.src = reader.result; };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
async function fetchGoalMembers(code){
  const sb = await getSupabase();
  if(!sb) return [];
  const {data} = await sb.from("shared_goal_members").select().eq("code", code);
  return data||[];
}
async function renderSharedGoalsScreen(el2){
  checkSharedGoalNotices();
  const goals = await DB.getAll("sharedGoals");
  const connected = !!(CONFIG.supabaseUrl && CONFIG.supabaseKey);
  const membersByGoal = {};
  if(connected){ for(const g of goals){ if(g.linked) membersByGoal[g.id] = await fetchGoalMembers(g.shareCode); } }
  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    <div class="card" style="background:linear-gradient(135deg, rgba(212,163,49,0.10), var(--panel) 60%);">
      <h2><span class="em">🔗</span>Shared goals</h2>
      <p style="font-size:12.5px; color:var(--fog); line-height:1.6; margin:0;">
        ${connected? "Connected — anyone with a goal's code sees the same live progress, whether it's your wife, a friend, or a group." : `Not connected yet — works fully on this device already. Ask the developer to enable live sync across other people's phones.`}
      </p>
      ${connected? "" : `<button class="btn ghost sm" id="sg-view-sql" style="margin-top:10px;">🔧 View setup instructions</button>`}
    </div>
    <div class="section-label">Your goals</div>
    <div class="card">
      ${goals.length? goals.map(g=>{
        const type = GOAL_TYPES.find(t=>t.key===g.goalType) || GOAL_TYPES[0];
        const pct = g.targetAmount? Math.min(100, Math.round((g.currentAmount/g.targetAmount)*100)) : 0;
        const members = membersByGoal[g.id]||[];
        return `
        <div class="row" data-id="${g.id}" style="flex-direction:column; align-items:stretch;">
          <div style="display:flex; align-items:center; gap:10px; width:100%;">
            <div class="row-icon">${type.icon}</div>
            <div class="row-body"><div class="row-title">${esc(g.title)}</div><div class="row-sub">Code: ${esc(g.shareCode)} ${g.linked?"• 🟢 synced":connected?"• not yet synced":"• local only"}</div></div>
            <div style="text-align:right;"><div style="font-size:13px; font-weight:700; color:var(--gold);">${g.currentAmount||0} ${g.unit}</div><div style="font-size:10.5px; color:var(--fog-dim);">of ${g.targetAmount} ${g.unit}</div></div>
          </div>
          <div style="height:6px; background:var(--panel-2); border-radius:4px; margin-top:8px; overflow:hidden;"><div style="height:100%; width:${pct}%; background:${pct>=100?'var(--sage)':'var(--gold)'}; transition:width .4s ease;"></div></div>
          ${members.length? `<div style="display:flex; align-items:center; gap:-6px; margin-top:9px;">${members.map(m=>`
            <div title="${esc(m.name)}" style="width:26px; height:26px; border-radius:50%; overflow:hidden; border:2px solid var(--panel); margin-right:-8px; background:var(--panel-2); display:flex; align-items:center; justify-content:center; font-size:11px; color:var(--fog);">
              ${m.photo? `<img src="${m.photo}" style="width:100%; height:100%; object-fit:cover;">` : esc((m.name||"?")[0].toUpperCase())}
            </div>`).join("")}<span style="font-size:11px; color:var(--fog-dim); margin-left:10px;">${members.map(m=>esc(m.name)).join(", ")}</span></div>` : ""}
        </div>`;
      }).join("") : `<div class="empty"><span class="em">🎯</span><p>No shared goals yet.</p></div>`}
    </div>
    <div class="btn-row">
      <button class="btn" id="sg-create">+ Create goal</button>
      <button class="btn ghost" id="sg-join">🔗 Join with a code</button>
    </div>
  `;
  el2.querySelector("[data-back]").addEventListener("click", popModule);
  el2.querySelectorAll(".row[data-id]").forEach(r=> r.addEventListener("click", ()=> openContributeSheet(r.dataset.id)));
  const sqlBtn = el2.querySelector("#sg-view-sql");
  if(sqlBtn) sqlBtn.addEventListener("click", ()=> openSheet(`
    <div class="sheet-title">🔧 Supabase setup</div>
    <p style="font-size:12px; color:var(--fog);">Run this once in your Supabase project's SQL editor, then have the developer add your project URL + anon key to this deployment's config.js.</p>
    <pre style="font-size:10px; background:var(--panel-2); border-radius:8px; padding:10px; overflow-x:auto; color:var(--sage); white-space:pre-wrap;">${esc(SHARED_GOALS_SQL)}</pre>
  `));
  el2.querySelector("#sg-create").addEventListener("click", ()=> openCreateGoalSheet(el2));
  el2.querySelector("#sg-join").addEventListener("click", async ()=>{
    if(!connected){ toast("Shared goals aren't connected on this install yet — ask the developer"); return; }
    const code = (prompt("Enter the 6-character code")||"").trim().toUpperCase();
    if(!code) return;
    try{
      const sb = await getSupabase();
      const {data, error} = await sb.from("shared_goals").select().eq("code", code).single();
      if(error || !data){ toast("No goal found with that code"); return; }
      await DB.add("sharedGoals", {id:uid(), title:data.title, goalType:data.goal_type||"Money", unit:data.unit||(SETTINGS.currency||"KSh"), targetAmount:data.target_amount, currentAmount:data.current_amount, shareCode:code, linked:true, createdAt:nowISO()});
      await pushMyMemberProfile(code);
      toast("Joined — you're now sharing "+data.title);
      renderSharedGoalsScreen(el2);
    }catch(e){ toast("Couldn't reach Supabase — check your URL/key in Settings"); }
  });
}
function openCreateGoalSheet(el2){
  openSheet(`
    <div class="sheet-title">🎯 New shared goal</div>
    <label>What kind of goal?</label>
    <div class="chip-grid">${GOAL_TYPES.map((t,i)=>`<div class="chip-select ${i===0?'active':''}" data-type="${t.key}">${t.icon} ${t.key}</div>`).join("")}</div>
    <label>Title</label>
    <input id="sg-title" placeholder="e.g. Trip to Diani, or Run 100km together">
    <label>Target amount</label>
    <div class="stepper"><button type="button" class="stepper-btn" data-step="-10">−</button><input id="sg-target" type="number" value="0"><button type="button" class="stepper-btn" data-step="10">+</button></div>
    <p class="field-hint" id="sg-unit-hint">Unit: ${SETTINGS.currency||"KSh"}</p>
    <button class="btn" id="sg-create-confirm" style="margin-top:14px;">✓ Create</button>
  `);
  let type = GOAL_TYPES[0];
  document.querySelectorAll("[data-type]").forEach(c=> c.addEventListener("click", ()=>{
    document.querySelectorAll("[data-type]").forEach(x=>x.classList.remove("active"));
    c.classList.add("active");
    type = GOAL_TYPES.find(t=>t.key===c.dataset.type);
    document.getElementById("sg-unit-hint").textContent = "Unit: "+type.unit();
  }));
  document.querySelectorAll(".stepper-btn").forEach(btn=> btn.addEventListener("click", ()=>{
    const inp = btn.parentElement.querySelector("input");
    inp.value = Math.max(0, (Number(inp.value)||0) + Number(btn.dataset.step));
  }));
  document.getElementById("sg-create-confirm").addEventListener("click", async ()=>{
    const title = document.getElementById("sg-title").value.trim();
    const target = Number(document.getElementById("sg-target").value);
    if(!title || !target){ toast("Add a title and target"); return; }
    const connected = !!(CONFIG.supabaseUrl && CONFIG.supabaseKey);
    const code = genShareCode();
    const unit = type.unit();
    const g = {id:uid(), title, goalType:type.key, unit, targetAmount:target, currentAmount:0, shareCode:code, linked:false, achievedNotified:false, createdAt:nowISO()};
    if(connected){
      try{
        const sb = await getSupabase();
        await sb.from("shared_goals").insert({code, title, goal_type:type.key, unit, target_amount:target, current_amount:0});
        g.linked = true;
        await pushMyMemberProfile(code);
      }catch(e){ toast("Saved locally — couldn't reach Supabase (check your setup)"); }
    }
    await DB.add("sharedGoals", g);
    closeSheet();
    toast(connected? `Created — share code ${code} with anyone joining in`:`Created — code ${code} (connect Supabase to actually sync it)`);
    renderSharedGoalsScreen(el2);
  });
}
async function openContributeSheet(goalId){
  const g = await DB.get("sharedGoals", goalId);
  const type = GOAL_TYPES.find(t=>t.key===g.goalType) || GOAL_TYPES[0];
  openSheet(`
    <div class="sheet-title">${type.icon} ${esc(g.title)}</div>
    <p style="font-size:12.5px; color:var(--fog);">Code: <b>${esc(g.shareCode)}</b> — share this with anyone you want to join this goal.</p>
    <label>Add progress (${esc(g.unit)})</label>
    <div class="chip-grid">
      ${(type.key==="Money"?[100,500,1000,5000]:[1,5,10,20]).map(a=>`<div class="chip-select" data-amt="${a}">+${a}</div>`).join("")}
    </div>
    <input id="sg-custom-amt" type="number" placeholder="Custom amount" style="margin-top:10px;">
    <button class="btn" id="sg-add" style="margin-top:14px;">✓ Add</button>
  `);
  let picked = null;
  document.querySelectorAll('[data-amt]').forEach(c=> c.addEventListener("click", ()=>{
    document.querySelectorAll('[data-amt]').forEach(x=>x.classList.remove("active"));
    c.classList.add("active"); picked = Number(c.dataset.amt);
    document.getElementById("sg-custom-amt").value = picked;
  }));
  document.getElementById("sg-add").addEventListener("click", async ()=>{
    const amt = Number(document.getElementById("sg-custom-amt").value) || picked;
    if(!amt){ toast("Enter an amount"); return; }
    const wasAchieved = g.currentAmount >= g.targetAmount;
    g.currentAmount = (g.currentAmount||0) + amt;
    const nowAchieved = g.currentAmount >= g.targetAmount;
    await DB.put("sharedGoals", g);
    await DB.add("sharedGoalContributions", {id:uid(), goalId:g.id, amount:amt, who:SETTINGS.name||"Me", createdAt:nowISO()});
    if(g.linked && CONFIG.supabaseUrl && CONFIG.supabaseKey){
      try{
        const sb = await getSupabase();
        await sb.from("shared_goals").update({current_amount:g.currentAmount, achieved:nowAchieved}).eq("code", g.shareCode);
        await sb.from("shared_goal_contributions").insert({id:uid(), code:g.shareCode, amount:amt, who:SETTINGS.name||"Me"});
      }catch(e){ /* stays correct locally; will be out of sync with others until back online */ }
    }
    closeSheet();
    if(nowAchieved && !wasAchieved){ playCategorySound("goals"); toast("🎉 Goal achieved! "+g.title); }
    else toast("Added — total is now "+g.currentAmount+" "+g.unit);
    if(STATE.stack[STATE.stack.length-1]?.module==="__sharedgoals__") renderModuleScreen();
  });
}
// Checks shared goals this device follows for two things it can tell the user
// about — a co-member's goal being achieved, or their birthday today — but
// only using what that member chose to share (see shareProfileOnGoals).
async function checkSharedGoalNotices(){
  if(!CONFIG.supabaseUrl || !CONFIG.supabaseKey) return;
  const goals = await DB.getAll("sharedGoals");
  const today = todayStr().slice(5);
  for(const g of goals.filter(g=>g.linked)){
    try{
      const sb = await getSupabase();
      const {data: remote} = await sb.from("shared_goals").select().eq("code", g.shareCode).single();
      if(remote && remote.achieved && !g.achievedNotified){
        fireNotification("🎉 Goal achieved!", `"${g.title}" just hit its target.`, "goal-"+g.id, "goals");
        g.achievedNotified = true; g.currentAmount = remote.current_amount; await DB.put("sharedGoals", g);
      }
      const members = await fetchGoalMembers(g.shareCode);
      for(const m of members){
        if(m.member_id===SETTINGS.deviceId || !m.share_birthday || !m.birthday) continue;
        if(m.birthday.slice(5)===today) fireNotification("🎂 Birthday today", `${m.name} (from "${g.title}") has a birthday today.`, "bday-"+m.member_id+"-"+today, "general");
      }
    }catch(e){ /* silent — this is a best-effort background check */ }
  }
}
async function renderHouseholdScreen(el2){
  const [members, expenses, income] = await Promise.all([DB.getAll("householdMembers"), DB.getAll("expenses"), DB.getAll("income")]);
  const monthPrefix = todayStr().slice(0,7);
  const spentThisMonth = expenses.filter(e=>(e.date||"").startsWith(monthPrefix));
  const earnedThisMonth = income.filter(e=>(e.date||"").startsWith(monthPrefix));
  const cur = SETTINGS.currency||"KSh";
  const rollup = (name)=>{
    const s = spentThisMonth.filter(e=>(e.member||"").trim().toLowerCase()===name.toLowerCase()).reduce((s,e)=>s+Number(e.amount||0),0);
    const i = earnedThisMonth.filter(e=>(e.member||"").trim().toLowerCase()===name.toLowerCase()).reduce((s,e)=>s+Number(e.amount||0),0);
    return {s,i};
  };
  const untaggedSpend = spentThisMonth.filter(e=>!e.member).reduce((s,e)=>s+Number(e.amount||0),0);
  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    <div class="card" style="background:linear-gradient(135deg, rgba(139,166,140,0.10), var(--panel) 60%);">
      <h2><span class="em">👪</span>Household budget</h2>
      <p style="font-size:12.5px; color:var(--fog); line-height:1.6; margin:0;">This is a single-device view — tag any expense or income with a household member's name to see it broken down here. Because this app has no backend by design, it can't sync live between your phone and your wife's or kids' phones; everything you see is what's logged on <b>this</b> device. If you want real cross-device sharing later, that needs a small backend — just ask.</p>
    </div>
    <div class="section-label">This month, ${cur}</div>
    <div class="card">
      ${members.length? members.map(m=>{ const r = rollup(m.name); return `
        <div class="row" data-id="${m.id}">
          <div class="row-icon">${m.relation==="Spouse/Partner"?"💞":m.relation==="Child"?"🧒":m.relation==="Parent"?"👴":"👤"}</div>
          <div class="row-body"><div class="row-title">${esc(m.name)}</div><div class="row-sub">${esc(m.relation||"")}</div></div>
          <div style="text-align:right;">
            <div style="font-size:13px; font-weight:700; color:var(--clay);">-${r.s}</div>
            ${r.i? `<div style="font-size:11px; color:var(--sage);">+${r.i}</div>`:""}
          </div>
        </div>`;
      }).join("") : `<div class="empty"><span class="em">👪</span><p>No household members added yet.</p></div>`}
      ${untaggedSpend? `<div class="row"><div class="row-icon">❔</div><div class="row-body"><div class="row-title">Untagged</div><div class="row-sub">Not linked to anyone</div></div><div style="font-size:13px; font-weight:700; color:var(--fog);">-${untaggedSpend}</div></div>`:""}
    </div>
    <button class="btn" id="hh-add">+ Add household member</button>
  `;
  el2.querySelector("[data-back]").addEventListener("click", popModule);
  el2.querySelector("#hh-add").addEventListener("click", ()=> pushModule("form", "householdMembers", null));
  el2.querySelectorAll("[data-id]").forEach(n=> n.addEventListener("click", ()=> pushModule("detail", "householdMembers", n.dataset.id)));
}
async function renderModuleScreen(){
  const top = STATE.stack[STATE.stack.length-1];
  if(!top) return;
  const el2 = document.getElementById("screen-module");

  if(CUSTOM_SCREENS[top.module]){
    document.getElementById("topbar-title").textContent = CUSTOM_SCREENS[top.module].label;
    return CUSTOM_SCREENS[top.module].render(el2);
  }

  const cfg = MODULES[top.module];
  document.getElementById("topbar-title").textContent = cfg.label;

  if(top.view==="list") return renderModuleList(el2, top.module, cfg);
  if(top.view==="form") return renderModuleForm(el2, top.module, cfg, top.id);
  if(top.view==="detail"){
    if(top.module==="trips") return renderTripDetail(el2, top.id);
    return renderModuleDetail(el2, top.module, cfg, top.id);
  }
}

async function renderModuleList(el2, modKey, cfg){
  let records = await DB.getAll(cfg.store);
  if(modKey==="tasks"){
    TASK_LIST_STATE = TASK_LIST_STATE || {filter:"active", sort:"due"};
    const today = todayStr();
    if(TASK_LIST_STATE.filter==="active") records = records.filter(t=>!t.done);
    else if(TASK_LIST_STATE.filter==="done") records = records.filter(t=>t.done);
    else if(TASK_LIST_STATE.filter==="overdue") records = records.filter(t=>!t.done && t.dueDate && t.dueDate<today);
    if(TASK_LIST_STATE.sort==="due") records.sort((a,b)=> (a.dueDate||"9999")<(b.dueDate||"9999")?-1:1);
    else if(TASK_LIST_STATE.sort==="priority"){ const rank={"Top 3":0,"High":1,"Normal":2}; records.sort((a,b)=>(rank[a.priority]??9)-(rank[b.priority]??9)); }
    else records.sort((a,b)=> (b.createdAt||"") < (a.createdAt||"") ? -1:1);
  } else {
    records.sort((a,b)=> (b.date||b.dueDate||b.createdAt||"") < (a.date||a.dueDate||a.createdAt||"") ? -1:1);
  }
  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    ${modKey==="tasks" ? `<div style="display:flex; justify-content:flex-end; margin-bottom:8px;"><button class="btn ghost sm" id="tl-menu">☰ ${TASK_LIST_STATE.filter} · ${TASK_LIST_STATE.sort}</button></div>` : ""}
    <div class="card">
      ${records.length? records.map(r=>`
        <div class="row" data-id="${r.id}">
          <div class="row-icon">${icon(cfg.icon,16)}</div>
          <div class="row-body"><div class="row-title" style="${r.done?'text-decoration:line-through; opacity:0.6;':''}">${esc(cfg.title(r))}</div><div class="row-sub">${esc(cfg.sub? cfg.sub(r):"")}</div></div>
          ${cfg.amount? `<div class="row-amt" style="color:${cfg.amount(r)<0?'var(--clay)':'var(--sage)'}">${fmtMoney(cfg.amount(r))}</div>`:""}
        </div>`).join("") : `<div class="empty">${icon(cfg.icon,26)}<p>No ${cfg.label.toLowerCase()} ${modKey==="tasks"&&TASK_LIST_STATE.filter!=="all"?"matching this filter":"yet"}.</p></div>`}
    </div>
    <div class="btn-row">
      <button class="btn" id="ml-add">+ Add ${cfg.label.toLowerCase().replace(/s$/,'')}</button>
      ${modKey==='contacts'? `<button class="btn ghost" id="ml-import">📱 Import from phone</button>`:""}
    </div>
  `;
  el2.querySelector("[data-back]").addEventListener("click", popModule);
  el2.querySelector("#ml-add").addEventListener("click", ()=> pushModule("form", modKey, null));
  el2.querySelectorAll(".row").forEach(r=> r.addEventListener("click", ()=> pushModule("detail", modKey, r.dataset.id)));
  const imp = el2.querySelector("#ml-import");
  if(imp) imp.addEventListener("click", ()=> importContactsFromPhone(el2, modKey, cfg));
  const menuBtn = el2.querySelector("#tl-menu");
  if(menuBtn) menuBtn.addEventListener("click", ()=> openTaskMenuSheet(el2, modKey, cfg));
}
let TASK_LIST_STATE = null;
function openTaskMenuSheet(el2, modKey, cfg){
  openSheet(`
    <div class="sheet-title">☰ Task list menu</div>
    <label>Show</label>
    <div class="chip-grid">
      ${["active","all","done","overdue"].map(f=>`<div class="chip-select ${TASK_LIST_STATE.filter===f?'active':''}" data-filter="${f}">${f==="active"?"🟢":f==="all"?"📋":f==="done"?"✅":"⚠️"} ${f[0].toUpperCase()+f.slice(1)}</div>`).join("")}
    </div>
    <label>Sort by</label>
    <div class="chip-grid">
      ${[["due","📅 Due date"],["priority","🔥 Priority"],["created","🆕 Newest"]].map(([v,l])=>`<div class="chip-select ${TASK_LIST_STATE.sort===v?'active':''}" data-sort="${v}">${l}</div>`).join("")}
    </div>
    <button class="btn danger sm" id="tl-clear-done" style="margin-top:16px;">🗑 Clear all completed tasks</button>
  `);
  document.querySelectorAll("[data-filter]").forEach(c=> c.addEventListener("click", ()=>{ TASK_LIST_STATE.filter = c.dataset.filter; closeSheet(); renderModuleScreen(); }));
  document.querySelectorAll("[data-sort]").forEach(c=> c.addEventListener("click", ()=>{ TASK_LIST_STATE.sort = c.dataset.sort; closeSheet(); renderModuleScreen(); }));
  document.getElementById("tl-clear-done").addEventListener("click", async ()=>{
    if(!confirm("Delete all completed tasks? This can't be undone.")) return;
    const all = await DB.getAll("tasks");
    for(const t of all.filter(t=>t.done)) await DB.delete("tasks", t.id);
    closeSheet(); toast("Cleared"); renderModuleScreen();
  });
}
async function importContactsFromPhone(el2, modKey, cfg){
  if(!("contacts" in navigator && "ContactsManager" in window)){
    toast("Contact import needs Chrome on Android — not supported on this browser/device");
    return;
  }
  try{
    const picked = await navigator.contacts.select(["name","tel","email"], {multiple:true});
    if(!picked.length) return;
    for(const c of picked){
      await DB.add("contacts", {
        id:uid(), createdAt:nowISO(),
        name:(c.name&&c.name[0])||"Unnamed",
        phone:(c.tel&&c.tel[0])||"",
        email:(c.email&&c.email[0])||"",
        category:"Other"
      });
    }
    toast(`Imported ${picked.length} contact${picked.length===1?'':'s'}`);
    renderModuleList(el2, modKey, cfg);
  }catch(e){ toast("Import cancelled"); }
}

async function renderModuleForm(el2, modKey, cfg, id){
  const [existing, allRecords] = await Promise.all([
    id? DB.get(cfg.store, id) : Promise.resolve(null),
    DB.getAll(cfg.store)
  ]);
  const hint = modKey==="gymRoutines" ? `<p class="field-hint">Saving this creates a weekly reminder automatically, based on the days you pick.</p>`
    : modKey==="foodLogs" ? `<p class="field-hint">Tip: set a daily reminder (e.g. "Log lunch") from Quick Add so you don't forget to track meals.</p>` : "";
  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    <div class="card">
      <div class="form-head">
        <div class="form-head-icon" style="background:${cfg.color};">${icon(cfg.icon,20)}</div>
        <h2>${existing? "Edit":"New"} ${cfg.label.replace(/s$/,'')}</h2>
      </div>
      <form id="mform">
        ${cfg.fields.map((f,i)=>fieldHTML(f, existing, i, allRecords)).join("")}
      </form>
      ${hint}
      <div class="btn-row">
        <button class="btn" id="mf-save">✓ Save</button>
        ${existing? `<button class="btn danger" id="mf-del">🗑 Delete</button>`:""}
      </div>
    </div>
  `;
  el2.querySelector("[data-back]").addEventListener("click", popModule);
  // Chip cards for selects — tap to choose, no dropdown.
  el2.querySelectorAll(".chip-grid[data-target]").forEach(grid=>{
    grid.querySelectorAll(".chip-select").forEach(chip=>{
      chip.addEventListener("click", ()=>{
        grid.querySelectorAll(".chip-select").forEach(c=>c.classList.remove("active"));
        chip.classList.add("active");
        document.getElementById(grid.dataset.target).value = chip.dataset.value;
      });
    });
  });
  // Quick-date chips (Today / Tomorrow) above native date inputs.
  el2.querySelectorAll("[data-quickdate]").forEach(chip=>{
    chip.addEventListener("click", ()=>{
      const inp = chip.closest(".field-row").querySelector('input[type="date"]');
      const d = new Date();
      if(chip.dataset.quickdate==="tomorrow") d.setDate(d.getDate()+1);
      inp.value = d.toISOString().slice(0,10);
      chip.parentElement.querySelectorAll(".chip-select").forEach(c=>c.classList.remove("active"));
      chip.classList.add("active");
    });
  });
  // Number steppers instead of typing digits from scratch.
  el2.querySelectorAll(".stepper-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const inp = btn.parentElement.querySelector("input");
      const next = (Number(inp.value)||0) + Number(btn.dataset.step);
      inp.value = Math.max(0, next);
    });
  });
  el2.querySelector("#mf-save").addEventListener("click", async (e)=>{
    e.preventDefault();
    const btn = e.currentTarget;
    if(btn.disabled) return; // guards against double-tap creating duplicate records
    const isNew = !existing;
    const rec = existing || {id:uid(), createdAt:nowISO()};
    let ok = true;
    cfg.fields.forEach(f=>{
      const node = document.getElementById("mf_"+f.key);
      const val = node.value;
      if(f.required && !val){ ok=false; node.closest(".field-row").classList.add("field-error"); }
      rec[f.key] = f.type==="number"? (val===""? null: Number(val)) : val;
    });
    if(!ok){ toast("Please fill required fields"); return; }
    btn.disabled = true; btn.style.opacity = "0.6";
    rec.updatedAt = nowISO();
    await DB.put(cfg.store, rec);
    playTone("success");
    if(modKey==="gymRoutines" && isNew && rec.days){
      const dayMap = {"Mon/Wed/Fri":["MO","WE","FR"], "Tue/Thu/Sat":["TU","TH","SA"], "Every day":["SU","MO","TU","WE","TH","FR","SA"], "Weekends":["SA","SU"]};
      if(dayMap[rec.days]){
        await DB.add("reminders", {
          id:uid(), title:"Gym: "+rec.name, dueDate:todayStr(), time:rec.time||"", repeat:"Weekly",
          notes:"Auto-created from your gym routine.", createdAt:nowISO()
        });
        toast("Saved — weekly reminder added too");
      } else toast("Saved");
    } else {
      toast("Saved");
    }
    popModule();
  });
  if(existing){
    el2.querySelector("#mf-del").addEventListener("click", async ()=>{
      if(!confirm(`Delete this ${cfg.label.toLowerCase().replace(/s$/,'')}? This can't be undone.`)) return;
      await DB.delete(cfg.store, existing.id);
      toast("Deleted");
      popModule();
    });
  }
}
function fieldIcon(f){
  const s = (f.key+" "+f.label).toLowerCase();
  if(/date/.test(s)) return "📅";
  if(/time/.test(s)) return "⏰";
  if(/(amount|price|value|cost|budget|salary|payment|fee)/.test(s)) return "💰";
  if(/(quantity|qty)/.test(s)) return "#️⃣";
  if(/(location|place|destination|address)/.test(s)) return "📍";
  if(/(condition|status|state)/.test(s)) return "✅";
  if(/weight/.test(s)) return "⚖️";
  if(/height/.test(s)) return "📏";
  if(/(phone|tel)/.test(s)) return "📞";
  if(/email/.test(s)) return "📧";
  if(/(rating|quality|score)/.test(s)) return "⭐";
  if(/(repeat|frequency|recur)/.test(s)) return "🔁";
  if(/priority/.test(s)) return "🔥";
  if(/(category|type|genre)/.test(s)) return "🏷️";
  if(/(notes?|description|desc)/.test(s)) return "📝";
  if(/(name|title)/.test(s)) return "✏️";
  if(/calorie/.test(s)) return "🔥";
  if(/day/.test(s)) return "📆";
  if(f.type==="select") return "🏷️";
  if(f.type==="date") return "📅";
  if(f.type==="time") return "⏰";
  if(f.type==="number") return "🔢";
  if(f.type==="textarea") return "📝";
  return "✏️";
}
// Small keyword→emoji mapping so chip cards feel purpose-built rather than generic.
function optionIcon(o){
  const s = o.toLowerCase();
  if(/new/.test(s)) return "🆕";
  if(/used|fair|poor|worn/.test(s)) return "♻️";
  if(/breakfast/.test(s)) return "🍳";
  if(/lunch/.test(s)) return "🍱";
  if(/dinner/.test(s)) return "🍽️";
  if(/snack/.test(s)) return "🍪";
  if(/^male$/.test(s)) return "👨";
  if(/female/.test(s)) return "👩";
  if(/top 3|urgent/.test(s)) return "🔥";
  if(/^high$/.test(s)) return "🔴";
  if(/^low$/.test(s)) return "🟢";
  if(/^medium$/.test(s)) return "🟡";
  if(/i owe/.test(s)) return "📤";
  if(/they owe/.test(s)) return "📥";
  if(/every ?day/.test(s)) return "📆";
  if(/weekend/.test(s)) return "🏖️";
  if(/daily|weekly|monthly|yearly/.test(s)) return "🔁";
  if(/spouse|partner/.test(s)) return "💞";
  if(/child/.test(s)) return "🧒";
  if(/parent/.test(s)) return "👴";
  return "▫️";
}
function fieldHTML(f, existing, idx, allRecords){
  const val = existing? (existing[f.key]!=null? existing[f.key]:"") : (f.type==="date"? todayStr() : "");
  const icon = fieldIcon(f);
  const delay = ((idx||0)*0.045).toFixed(3);
  const head = `<div class="field-row-head"><span class="field-icon">${icon}</span><span class="field-label-text">${esc(f.label)}</span></div>`;
  let input;
  if(f.type==="textarea"){
    input = `<textarea id="mf_${f.key}">${esc(val)}</textarea>`;
  } else if(f.type==="select"){
    const chips = f.options.map(o=>`<div class="chip-select ${String(val)===o?'active':''}" data-value="${esc(o)}">${optionIcon(o)} ${esc(o)}</div>`).join("");
    input = `<input type="hidden" id="mf_${f.key}" value="${esc(val||f.options[0]||'')}"><div class="chip-grid" data-target="mf_${f.key}">${chips}</div>`;
  } else if(f.type==="date"){
    input = `<div class="chip-grid" style="margin-bottom:8px;">
      <div class="chip-select" data-quickdate="today">📅 Today</div>
      <div class="chip-select" data-quickdate="tomorrow">➡️ Tomorrow</div>
    </div><input id="mf_${f.key}" type="date" value="${esc(val)}">`;
  } else if(f.type==="number"){
    const money = /(amount|price|value|cost|budget|salary|payment|fee|calorie)/.test((f.key+f.label).toLowerCase());
    const step = money? 50 : 1;
    input = `<div class="stepper"><button type="button" class="stepper-btn" data-step="-${step}">−</button><input id="mf_${f.key}" type="number" value="${esc(val)}" step="any"><button type="button" class="stepper-btn" data-step="${step}">+</button></div>`;
  } else {
    const suggestions = allRecords? [...new Set(allRecords.map(r=>r[f.key]).filter(Boolean))].slice(0,8) : [];
    const dlid = "dl_"+f.key;
    input = `<input id="mf_${f.key}" value="${esc(val)}" ${suggestions.length?`list="${dlid}"`:""}>`;
    if(suggestions.length) input += `<datalist id="${dlid}">${suggestions.map(s=>`<option value="${esc(s)}">`).join("")}</datalist>`;
  }
  return `<div class="field-row" style="animation-delay:${delay}s">${head}${input}</div>`;
}

async function renderModuleDetail(el2, modKey, cfg, id){
  const r = await DB.get(cfg.store, id);
  if(!r){ popModule(); return; }
  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    <div class="card">
      <h2 style="display:flex; align-items:center; gap:8px;">${icon(cfg.icon,18)} ${esc(cfg.title(r))}</h2>
      ${cfg.fields.map(f=> r[f.key]!=null && r[f.key]!=="" ? `<div class="kv"><span class="k">${f.label}</span><span class="v">${f.type==='number'?fmtMoney(r[f.key]).replace(SETTINGS.currency+" ",""):esc(r[f.key])}</span></div>`:"").join("")}
    </div>
    <div class="btn-row">
      <button class="btn ghost" id="d-edit">Edit</button>
      <button class="btn danger" id="d-del">Delete</button>
    </div>
    ${modKey==='debts' ? `<button class="btn" id="d-pay" style="margin-top:10px;">Log payment</button>` : ""}
    ${modKey==='books' ? `<button class="btn" id="d-read" style="margin-top:10px;">Log reading session</button>` : ""}
  `;
  el2.querySelector("[data-back]").addEventListener("click", popModule);
  el2.querySelector("#d-edit").addEventListener("click", ()=>{ STATE.stack[STATE.stack.length-1].view="form"; renderModuleScreen(); });
  el2.querySelector("#d-del").addEventListener("click", async ()=>{
    if(!confirm("Delete this record? This can't be undone.")) return;
    await DB.delete(cfg.store, id); toast("Deleted"); popModule();
  });
  const readBtn = el2.querySelector("#d-read");
  if(readBtn) readBtn.addEventListener("click", ()=> openReadingSessionForm(id));
  const payBtn = el2.querySelector("#d-pay");
  if(payBtn) payBtn.addEventListener("click", ()=>{
    const amt = prompt("Payment amount:");
    if(!amt || isNaN(Number(amt))) return;
    (async ()=>{
      const debt = await DB.get("debts", id);
      const remaining = (debt.remaining!=null? debt.remaining : debt.amount) - Number(amt);
      debt.remaining = Math.max(0, remaining);
      await DB.put("debts", debt);
      await DB.add("debtPayments", {id:uid(), debtId:id, amount:Number(amt), date:todayStr()});
      toast("Payment logged"); renderModuleDetail(el2, modKey, cfg, id);
    })();
  });
}

/* =========================================================================
   TRAVEL PLANNER — trip detail with nested itinerary + expenses
   ========================================================================= */
async function renderTripDetail(el2, tripId){
  const trip = await DB.get("trips", tripId);
  if(!trip){ popModule(); return; }
  const [items, exps] = await Promise.all([DB.byIndex("tripItems","tripId",tripId), DB.byIndex("tripExpenses","tripId",tripId)]);
  items.sort((a,b)=> (a.date||"")<(b.date||"")?-1:1);
  const spent = exps.reduce((s,e)=>s+Number(e.amount||0),0);
  const budget = Number(trip.budget||0);
  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    <div class="card">
      <h2>✈️ ${esc(trip.name)}</h2>
      <div class="kv"><span class="k">Destination</span><span class="v">${esc(trip.destination||"—")}</span></div>
      <div class="kv"><span class="k">Dates</span><span class="v">${trip.startDate?fmtDate(trip.startDate):"—"} → ${trip.endDate?fmtDate(trip.endDate):"—"}</span></div>
      ${budget? `<div class="kv"><span class="k">Budget</span><span class="v">${fmtMoney(budget)}</span></div>
      <div class="kv"><span class="k">Spent</span><span class="v" style="color:${spent>budget?'var(--clay)':'var(--sage)'}">${fmtMoney(spent)}</span></div>
      <div class="kv"><span class="k">Remaining</span><span class="v">${fmtMoney(budget-spent)}</span></div>
      <div class="pbar"><div style="width:${Math.min(100,budget?spent/budget*100:0)}%; background:${spent>budget?'var(--clay)':'var(--sage)'};"></div></div>` : ""}
      ${trip.notes? `<p style="font-size:13px; color:var(--fog); margin-top:12px;">${esc(trip.notes)}</p>`:""}
    </div>
    <div class="btn-row"><button class="btn ghost" id="t-edit">Edit trip</button><button class="btn danger" id="t-del">Delete trip</button></div>

    <div class="section-label">Itinerary</div>
    <div class="card">
      ${items.length? items.map(it=>`
        <div class="row" data-item="${it.id}"><div class="row-icon">${{Activity:"🎡",Transport:"🚗",Accommodation:"🏨",Meal:"🍽️",Event:"🎫",Place:"📍",Appointment:"📅"}[it.type]||"📍"}</div>
        <div class="row-body"><div class="row-title">${esc(it.description)}</div><div class="row-sub">${it.date?fmtDate(it.date):""}${it.time?" • "+it.time:""}${it.location?" • "+esc(it.location):""}</div></div>
        ${it.cost? `<div class="row-amt">${fmtMoney(it.cost)}</div>`:""}</div>
      `).join("") : `<div class="empty"><p>No itinerary items yet.</p></div>`}
    </div>
    <button class="btn ghost" id="t-add-item">+ Add itinerary item</button>

    <div class="section-label" style="margin-top:20px;">Trip expenses</div>
    <div class="card">
      ${exps.length? exps.map(e=>`<div class="row"><div class="row-icon">💸</div><div class="row-body"><div class="row-title">${esc(e.category)}</div><div class="row-sub">${esc(e.notes||"")}</div></div><div class="row-amt" style="color:var(--clay)">${fmtMoney(e.amount)}</div></div>`).join("") : `<div class="empty"><p>No expenses logged.</p></div>`}
    </div>
    <button class="btn ghost" id="t-add-exp">+ Add trip expense</button>
  `;
  el2.querySelector("[data-back]").addEventListener("click", popModule);
  el2.querySelector("#t-edit").addEventListener("click", ()=> pushModule("form","trips",tripId));
  el2.querySelector("#t-del").addEventListener("click", async ()=>{
    if(!confirm("Delete this trip and all its itinerary/expenses?")) return;
    await DB.delete("trips", tripId);
    for(const it of items) await DB.delete("tripItems", it.id);
    for(const e of exps) await DB.delete("tripExpenses", e.id);
    toast("Trip deleted"); popModule();
  });
  el2.querySelector("#t-add-item").addEventListener("click", ()=> openTripItemForm(tripId, el2));
  el2.querySelector("#t-add-exp").addEventListener("click", ()=> openTripExpenseForm(tripId, el2));
}
function openTripItemForm(tripId, el2){
  openSheet(`
    <div class="sheet-title">Add itinerary item</div>
    <label>Type</label>
    <select id="ti-type">${["Activity","Transport","Accommodation","Meal","Event","Place","Appointment"].map(t=>`<option>${t}</option>`).join("")}</select>
    <label>Description</label><input id="ti-desc" placeholder="e.g. Check in at hotel">
    <label>Date</label><input id="ti-date" type="date" value="${todayStr()}">
    <label>Time</label><input id="ti-time" type="time">
    <label>Location</label><input id="ti-loc">
    <label>Cost</label><input id="ti-cost" type="number">
    <label>Notes</label><textarea id="ti-notes"></textarea>
    <button class="btn" id="ti-save" style="margin-top:14px;">Add to itinerary</button>
  `);
  document.getElementById("ti-save").onclick = async ()=>{
    const description = document.getElementById("ti-desc").value.trim();
    if(!description){ toast("Enter a description"); return; }
    await DB.add("tripItems", {
      id:uid(), tripId, type:document.getElementById("ti-type").value, description,
      date:document.getElementById("ti-date").value, time:document.getElementById("ti-time").value,
      location:document.getElementById("ti-loc").value, cost:Number(document.getElementById("ti-cost").value)||0,
      notes:document.getElementById("ti-notes").value
    });
    closeSheet(); toast("Added"); renderTripDetail(el2, tripId);
  };
}
function openTripExpenseForm(tripId, el2){
  openSheet(`
    <div class="sheet-title">Add trip expense</div>
    <label>Category</label>
    <select id="te-cat">${["Transport","Accommodation","Food","Activities","Shopping","Other"].map(t=>`<option>${t}</option>`).join("")}</select>
    <label>Amount</label><input id="te-amount" type="number">
    <label>Notes</label><textarea id="te-notes"></textarea>
    <button class="btn" id="te-save" style="margin-top:14px;">Add expense</button>
  `);
  document.getElementById("te-save").onclick = async ()=>{
    const amount = Number(document.getElementById("te-amount").value);
    if(!amount){ toast("Enter an amount"); return; }
    await DB.add("tripExpenses", {id:uid(), tripId, category:document.getElementById("te-cat").value, amount, notes:document.getElementById("te-notes").value, date:todayStr()});
    closeSheet(); toast("Expense added"); renderTripDetail(el2, tripId);
  };
}

/* =========================================================================
   DOCUMENT VAULT — files stored as Blobs directly in IndexedDB, local only
   ========================================================================= */
async function renderDocumentsScreen(el2){
  const docs = (await DB.getAll("documents")).sort((a,b)=>(b.date||"")<(a.date||"")?-1:1);
  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    <p style="font-size:12.5px; color:var(--fog); line-height:1.5; margin-top:0;">Files are stored only in this browser/app install. Back up regularly from More → Backup — clearing site data can erase them.</p>
    <div class="card">
      ${docs.length? docs.map(d=>{
        const days = d.expiryDate? daysUntil(d.expiryDate) : null;
        const warn = days!=null && days<=60;
        return `<div class="row" data-id="${d.id}"><div class="row-icon">📄</div><div class="row-body"><div class="row-title">${esc(d.name)}</div>
        <div class="row-sub" style="${warn?'color:var(--clay);':''}">${d.category||"Document"}${d.expiryDate? " • Expires "+fmtDate(d.expiryDate)+(days!=null?" ("+days+"d)":""):""}</div></div></div>`;
      }).join("") : `<div class="empty"><span class="em">📄</span><p>No documents yet.</p></div>`}
    </div>
    <button class="btn" id="doc-add">+ Add document</button>
  `;
  el2.querySelector("[data-back]").addEventListener("click", popModule);
  el2.querySelector("#doc-add").addEventListener("click", openDocumentForm);
  el2.querySelectorAll("[data-id]").forEach(n=> n.addEventListener("click", ()=> openDocumentDetail(n.dataset.id, el2)));
}
function openDocumentForm(){
  openSheet(`
    <div class="sheet-title">Add document</div>
    <label>Name</label><input id="doc-name" placeholder="e.g. Passport">
    <label>Category</label>
    <select id="doc-cat">${["Identification","Education","Employment","Finance","Insurance","Certificates","Receipts","Personal","Other"].map(c=>`<option>${c}</option>`).join("")}</select>
    <label>Date</label><input id="doc-date" type="date" value="${todayStr()}">
    <label>Expiry date (optional)</label><input id="doc-expiry" type="date">
    <label>File</label><input id="doc-file" type="file">
    <label>Notes</label><textarea id="doc-notes"></textarea>
    <button class="btn" id="doc-save" style="margin-top:14px;">Save document</button>
  `);
  document.getElementById("doc-save").onclick = async ()=>{
    const name = document.getElementById("doc-name").value.trim();
    if(!name){ toast("Enter a name"); return; }
    const fileInput = document.getElementById("doc-file");
    const file = fileInput.files[0];
    const rec = {
      id:uid(), name, category:document.getElementById("doc-cat").value,
      date:document.getElementById("doc-date").value, expiryDate:document.getElementById("doc-expiry").value,
      notes:document.getElementById("doc-notes").value, fileName: file? file.name:null,
      fileType: file? file.type:null, blob: file? file : null
    };
    await DB.put("documents", rec);
    closeSheet(); toast("Document saved");
    if(STATE.stack.length && STATE.stack[STATE.stack.length-1].module==="__documents__") renderDocumentsScreen(document.getElementById("screen-module"));
  };
}
async function openDocumentDetail(id, listEl){
  const d = await DB.get("documents", id);
  const days = d.expiryDate? daysUntil(d.expiryDate) : null;
  openSheet(`
    <div class="sheet-title">${esc(d.name)}</div>
    <div class="kv"><span class="k">Category</span><span class="v">${esc(d.category||"—")}</span></div>
    <div class="kv"><span class="k">Date</span><span class="v">${d.date?fmtDate(d.date):"—"}</span></div>
    ${d.expiryDate? `<div class="kv"><span class="k">Expires</span><span class="v" style="${days<=60?'color:var(--clay)':''}">${fmtDate(d.expiryDate)}${days!=null?" ("+days+"d)":""}</span></div>`:""}
    ${d.notes? `<div class="kv"><span class="k">Notes</span><span class="v">${esc(d.notes)}</span></div>`:""}
    <div class="btn-row">
      ${d.blob? `<button class="btn ghost" id="doc-view">View / download file</button>`:""}
      <button class="btn danger" id="doc-del">Delete</button>
    </div>
  `);
  const viewBtn = document.getElementById("doc-view");
  if(viewBtn) viewBtn.onclick = ()=>{
    const url = URL.createObjectURL(d.blob);
    const a = document.createElement("a"); a.href = url; a.download = d.fileName||d.name; a.target="_blank";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 30000);
  };
  document.getElementById("doc-del").onclick = async ()=>{
    if(!confirm("Delete this document?")) return;
    await DB.delete("documents", id); closeSheet(); toast("Deleted"); renderDocumentsScreen(listEl);
  };
}

/* =========================================================================
   LIFE TIMELINE — chronological visual history
   ========================================================================= */
const TIMELINE_ICONS = {"Graduation":"🎓","New job":"💼","Achievement":"🏆","Trip":"✈️","Birthday":"🎂","Relationship":"❤️","New home":"🏠","Education":"📚","Realization":"💡","Other":"⭐"};
async function renderTimelineScreen(el2){
  const events = (await DB.getAll("timeline")).sort((a,b)=> (b.date||"")<(a.date||"")?-1:1);
  const byYear = {};
  events.forEach(e=>{ const y = (e.date||"").slice(0,4)||"Undated"; (byYear[y]=byYear[y]||[]).push(e); });
  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    ${events.length? Object.keys(byYear).sort().reverse().map(y=>`
      <div class="section-label">${y}</div>
      <div class="card">
        ${byYear[y].map(e=>`<div class="row" data-id="${e.id}"><div class="row-icon">${TIMELINE_ICONS[e.category]||"⭐"}</div>
        <div class="row-body"><div class="row-title">${esc(e.title)}</div><div class="row-sub">${e.date?fmtDate(e.date):""}${e.description?" • "+esc(e.description.slice(0,40)):""}</div></div></div>`).join("")}
      </div>
    `).join("") : `<div class="empty" style="margin-top:20px;"><span class="em">🕰️</span><p>No life events yet. Add graduations, jobs, trips, milestones — anything worth remembering.</p></div>`}
    <button class="btn" id="tl-add">+ Add life event</button>
  `;
  el2.querySelector("[data-back]").addEventListener("click", popModule);
  el2.querySelector("#tl-add").addEventListener("click", ()=> openTimelineForm(null, el2));
  el2.querySelectorAll("[data-id]").forEach(n=> n.addEventListener("click", async ()=>{
    const e = await DB.get("timeline", n.dataset.id); openTimelineForm(e, el2);
  }));
}
function openTimelineForm(existing, el2){
  openSheet(`
    <div class="sheet-title">${existing?"Edit":"Add"} life event</div>
    <label>Title</label><input id="tl-title" value="${existing?esc(existing.title):''}">
    <label>Category</label>
    <select id="tl-cat">${Object.keys(TIMELINE_ICONS).map(c=>`<option ${existing&&existing.category===c?'selected':''}>${c}</option>`).join("")}</select>
    <label>Date</label><input id="tl-date" type="date" value="${existing?existing.date||'':todayStr()}">
    <label>Description</label><textarea id="tl-desc">${existing?esc(existing.description||''):''}</textarea>
    <div class="btn-row">
      <button class="btn" id="tl-save">Save</button>
      ${existing?`<button class="btn danger" id="tl-del">Delete</button>`:""}
    </div>
  `);
  document.getElementById("tl-save").onclick = async ()=>{
    const title = document.getElementById("tl-title").value.trim();
    if(!title){ toast("Enter a title"); return; }
    const rec = existing || {id:uid()};
    rec.title=title; rec.category=document.getElementById("tl-cat").value;
    rec.date=document.getElementById("tl-date").value; rec.description=document.getElementById("tl-desc").value;
    await DB.put("timeline", rec); closeSheet(); toast("Saved"); renderTimelineScreen(el2);
  };
  if(existing) document.getElementById("tl-del").onclick = async ()=>{
    await DB.delete("timeline", existing.id); closeSheet(); toast("Deleted"); renderTimelineScreen(el2);
  };
}

/* =========================================================================
   ACHIEVEMENTS — computed automatically from real activity, not a manual list
   ========================================================================= */
async function computeAchievements(){
  const [tasks, goals, books, savingsBudgets, journal, habits, workouts, income, expenses] = await Promise.all([
    DB.getAll("tasks"), DB.getAll("personalGoals"), DB.getAll("books"), DB.getAll("budgets"),
    DB.getAll("journal"), DB.getAll("habits"), DB.getAll("workouts"), DB.getAll("income"), DB.getAll("expenses")
  ]);
  const doneTasks = tasks.filter(t=>t.done).length;
  const completedGoals = goals.filter(g=>g.status==="Completed").length;
  const completedBooks = books.filter(b=>b.status==="Completed").length;
  let bestHabitStreak = 0;
  for(const h of habits){ const s = await habitStreak(h.id); if(s>bestHabitStreak) bestHabitStreak=s; }
  const journalMonths = new Set(journal.map(j=>(j.date||"").slice(0,7))).size;
  const workoutStreak = await streakFromDates(workouts.map(w=>w.date));
  const netSaved = income.reduce((s,i)=>s+Number(i.amount||0),0) - expenses.reduce((s,e)=>s+Number(e.amount||0),0);

  return [
    {label:"First goal completed", icon:"🎯", unlocked: completedGoals>=1, progress: Math.min(1,completedGoals/1)},
    {label:"7-day habit streak", icon:"🔥", unlocked: bestHabitStreak>=7, progress: Math.min(1,bestHabitStreak/7)},
    {label:"30-day habit streak", icon:"🔥", unlocked: bestHabitStreak>=30, progress: Math.min(1,bestHabitStreak/30)},
    {label:"First book completed", icon:"📕", unlocked: completedBooks>=1, progress: Math.min(1,completedBooks/1)},
    {label:"First savings goal", icon:"💰", unlocked: netSaved>0, progress: netSaved>0?1:0},
    {label:"100 tasks completed", icon:"✅", unlocked: doneTasks>=100, progress: Math.min(1,doneTasks/100)},
    {label:"First journal month", icon:"📖", unlocked: journalMonths>=1, progress: Math.min(1,journalMonths/1)},
    {label:"First workout streak", icon:"🏋️", unlocked: workoutStreak>=3, progress: Math.min(1,workoutStreak/3)}
  ];
}

/* =========================================================================
   CALENDAR — month grid; write special dates and mark events on any day
   ========================================================================= */
let calCursor = new Date(todayStr()+"T00:00:00"); calCursor.setDate(1);
async function renderCalendarScreen(el2){
  const [tasks, reminders, dates] = await Promise.all([DB.getAll("tasks"), DB.getAll("reminders"), DB.getAll("importantDates")]);
  const y = calCursor.getFullYear(), m = calCursor.getMonth();
  const firstDow = new Date(y,m,1).getDay(); // 0=Sun
  const daysInMonth = new Date(y,m+1,0).getDate();
  const monthLabel = calCursor.toLocaleDateString(undefined,{month:"long", year:"numeric"});

  function itemsOnDay(dateStr){
    const md = dateStr.slice(5);
    const out = [];
    tasks.forEach(t=> t.dueDate===dateStr && out.push({icon:"📝", label:t.title, type:"tasks", id:t.id}));
    reminders.forEach(r=> reminderOccursOn(r, dateStr) && out.push({icon:"⏰", label:r.title, type:"reminders", id:r.id}));
    dates.forEach(d=>{
      if(d.date===dateStr || (d.recurring==="Yes" && d.date && d.date.slice(5)===md)) out.push({icon:"🎉", label:d.title, type:"importantDates", id:d.id});
    });
    return out;
  }

  let cells = "";
  for(let i=0;i<firstDow;i++) cells += `<div></div>`;
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const items = itemsOnDay(dateStr);
    const isToday = dateStr===todayStr();
    cells += `<div data-day="${dateStr}" style="aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:10px; cursor:pointer; ${isToday?'background:var(--gold); color:#1A1406; font-weight:700;':'background:var(--panel-2);'}">
      <div style="font-size:13px;">${d}</div>
      ${items.length? `<div style="display:flex; gap:2px; margin-top:2px;">${items.slice(0,3).map(()=>`<span style="width:4px;height:4px;border-radius:50%;background:${isToday?'#1A1406':'var(--gold)'};"></span>`).join("")}</div>`:""}
    </div>`;
  }

  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    <div class="card">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
        <button class="icon-btn" id="cal-prev">‹</button>
        <h2 style="margin:0;">${monthLabel}</h2>
        <button class="icon-btn" id="cal-next">›</button>
      </div>
      <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:6px; margin-bottom:6px; text-align:center; font-size:10.5px; color:var(--fog);">
        ${["S","M","T","W","T","F","S"].map(d=>`<div>${d}</div>`).join("")}
      </div>
      <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:6px;">${cells}</div>
    </div>
    <button class="btn" id="cal-add">+ Add special date</button>
    <button class="btn ghost" id="cal-all-time" style="margin-top:10px;">📜 See everything I've ever written</button>
    <div class="section-label">All activities in ${monthLabel}</div>
    <div class="card" id="cal-all"></div>
  `;
  el2.querySelector("[data-back]").addEventListener("click", popModule);
  el2.querySelector("#cal-prev").addEventListener("click", ()=>{ calCursor.setMonth(calCursor.getMonth()-1); renderCalendarScreen(el2); });
  el2.querySelector("#cal-next").addEventListener("click", ()=>{ calCursor.setMonth(calCursor.getMonth()+1); renderCalendarScreen(el2); });
  el2.querySelector("#cal-add").addEventListener("click", ()=> openImportantDateForm(null, todayStr(), el2));
  el2.querySelector("#cal-all-time").addEventListener("click", ()=> openAllActivitiesEver(tasks, reminders, dates));
  el2.querySelectorAll("[data-day]").forEach(n=> n.addEventListener("click", ()=> openDayDetail(n.dataset.day, itemsOnDay(n.dataset.day), el2)));

  // Every activity across the currently displayed month, chronological.
  const allItems = [];
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    itemsOnDay(dateStr).forEach(it=> allItems.push({...it, date:dateStr}));
  }
  document.getElementById("cal-all").innerHTML = allItems.length? allItems.map(it=>`
    <div class="row" data-item="${it.type}|${it.id}"><div class="row-icon">${it.icon}</div><div class="row-body"><div class="row-title">${esc(it.label)}</div><div class="row-sub">${fmtDate(it.date)}</div></div></div>
  `).join("") : `<div class="empty"><span class="em">🗓️</span><p>Nothing on the calendar this month.</p></div>`;
  document.getElementById("cal-all").querySelectorAll("[data-item]").forEach(n=> n.addEventListener("click", async ()=>{
    const [type, id] = n.dataset.item.split("|");
    if(type==="importantDates"){ const rec = await DB.get("importantDates", id); openImportantDateForm(rec, rec.date, el2); }
    else pushModule("form", type, id);
  }));
}
function openAllActivitiesEver(tasks, reminders, dates){
  const all = [];
  tasks.forEach(t=> t.dueDate && all.push({icon:"📝", label:t.title, date:t.dueDate, type:"tasks", id:t.id}));
  reminders.forEach(r=> r.dueDate && all.push({icon:"⏰", label:r.title, date:r.dueDate, type:"reminders", id:r.id}));
  dates.forEach(d=> d.date && all.push({icon:"🎉", label:d.title, date:d.date, type:"importantDates", id:d.id}));
  all.sort((a,b)=> b.date < a.date ? -1 : 1);
  openSheet(`
    <div class="sheet-title">Everything you've ever written</div>
    <p class="field-hint" style="margin-top:0;">${all.length} item${all.length===1?'':'s'} across tasks, reminders, and special dates — most recent first.</p>
    <div class="card" style="margin-top:8px;">
      ${all.length? all.map(it=>`<div class="row" data-item="${it.type}|${it.id}"><div class="row-icon">${it.icon}</div><div class="row-body"><div class="row-title">${esc(it.label)}</div><div class="row-sub">${fmtDate(it.date)}</div></div></div>`).join("") : `<div class="empty"><p>Nothing yet.</p></div>`}
    </div>
  `);
  document.querySelectorAll("[data-item]").forEach(n=> n.addEventListener("click", async ()=>{
    const [type, id] = n.dataset.item.split("|");
    closeSheet();
    if(type==="importantDates"){
      const rec = await DB.get("importantDates", id);
      openImportantDateForm(rec, rec.date, document.getElementById("screen-module"));
    } else {
      pushModule("form", type, id);
    }
  }));
}
function openDayDetail(dateStr, items, el2){
  openSheet(`
    <div class="sheet-title">${fmtDate(dateStr)}</div>
    <p class="field-hint" style="margin-top:0;">Tap an item to edit it — including moving it to a different date.</p>
    ${items.length? `<div class="card" style="margin-top:8px;">${items.map(i=>`<div class="row" data-item="${i.type}|${i.id}"><div class="row-icon">${i.icon}</div><div class="row-body"><div class="row-title">${esc(i.label)}</div></div><div style="color:var(--fog-dim); font-size:16px;">›</div></div>`).join("")}</div>`:`<p style="font-size:13px; color:var(--fog);">Nothing on this day yet.</p>`}
    <button class="btn" id="dd-add" style="margin-top:14px;">+ Add special date</button>
  `);
  document.getElementById("dd-add").addEventListener("click", ()=>{ closeSheet(); openImportantDateForm(null, dateStr, el2); });
  document.querySelectorAll("[data-item]").forEach(n=> n.addEventListener("click", async ()=>{
    const [type, id] = n.dataset.item.split("|");
    closeSheet();
    if(type==="importantDates"){
      const rec = await DB.get("importantDates", id);
      openImportantDateForm(rec, rec.date, el2);
    } else {
      pushModule("form", type, id);
    }
  }));
}
function openImportantDateForm(existing, defaultDate, el2){
  openSheet(`
    <div class="sheet-title">${existing?"Edit":"Add"} special date</div>
    <label>Title</label><input id="id-title" value="${existing?esc(existing.title):''}" placeholder="e.g. Mom's birthday">
    <label>Date</label><input id="id-date" type="date" value="${existing?existing.date:defaultDate}">
    <label>Type</label>
    <select id="id-cat">${["Birthday","Anniversary","Holiday","Appointment","Other"].map(c=>`<option ${existing&&existing.category===c?'selected':''}>${c}</option>`).join("")}</select>
    <label>Repeats every year</label>
    <select id="id-rec"><option ${!existing||existing.recurring!=='Yes'?'selected':''}>No</option><option ${existing&&existing.recurring==='Yes'?'selected':''}>Yes</option></select>
    <label>Notes</label><textarea id="id-notes">${existing?esc(existing.notes||''):''}</textarea>
    <div class="btn-row">
      <button class="btn" id="id-save">Save</button>
      ${existing?`<button class="btn danger" id="id-del">Delete</button>`:""}
    </div>
  `);
  document.getElementById("id-save").onclick = async ()=>{
    const title = document.getElementById("id-title").value.trim();
    if(!title){ toast("Enter a title"); return; }
    const rec = existing || {id:uid(), createdAt:nowISO()};
    rec.title=title; rec.date=document.getElementById("id-date").value;
    rec.category=document.getElementById("id-cat").value; rec.recurring=document.getElementById("id-rec").value;
    rec.notes=document.getElementById("id-notes").value;
    await DB.put("importantDates", rec); closeSheet(); toast("Saved"); renderCalendarScreen(el2);
  };
  if(existing) document.getElementById("id-del").onclick = async ()=>{
    await DB.delete("importantDates", existing.id); closeSheet(); toast("Deleted"); renderCalendarScreen(el2);
  };
}

async function renderAchievementsScreen(el2){
  const ach = await computeAchievements();
  const unlockedCount = ach.filter(a=>a.unlocked).length;
  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    <div class="card" style="text-align:center;">
      <div style="font-family:var(--font-mono); font-size:26px; color:var(--gold); font-weight:700;">${unlockedCount}/${ach.length}</div>
      <div style="font-size:12px; color:var(--fog); margin-top:2px;">achievements unlocked</div>
    </div>
    <div class="tile-grid">
      ${ach.map(a=>`
        <div class="tile" style="${a.unlocked?'':'opacity:0.45;'}">
          <div class="em">${a.icon}</div>
          <div class="l">${a.label}</div>
          <div class="pbar"><div style="width:${Math.round(a.progress*100)}%; background:${a.unlocked?'var(--sage)':'var(--fog-dim)'};"></div></div>
        </div>
      `).join("")}
    </div>
  `;
  el2.querySelector("[data-back]").addEventListener("click", popModule);
}

/* =========================================================================
   ABOUT ME — birthday, education, hobbies, fears, and open-ended personal
   facts. Everything here stays in IndexedDB on this device, same as
   everything else in the app.
   ========================================================================= */
async function renderProfileScreen(el2){
  const p = (await DB.get("profile", "main")) || {id:"main", customFacts:[]};
  if(!p.customFacts) p.customFacts = [];
  const usageToday = await getAppUsageMinutes(todayStr());
  const usage7 = await getAppUsageMinutes7d();

  function factsHTML(){
    return p.customFacts.map((f,i)=>`
      <div style="display:flex; gap:8px; align-items:flex-end; margin-bottom:10px;">
        <div style="flex:1;"><label style="margin:0 0 4px;">Label</label><input class="pf-label" data-i="${i}" value="${esc(f.label)}" placeholder="e.g. Favorite food"></div>
        <div style="flex:1;"><label style="margin:0 0 4px;">Value</label><input class="pf-value" data-i="${i}" value="${esc(f.value)}"></div>
        <button class="btn danger sm pf-remove" data-i="${i}" style="padding:11px 12px;">✕</button>
      </div>`).join("");
  }

  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    <div class="card" style="text-align:center;">
      <div id="pf-avatar-wrap" style="display:inline-block; position:relative; cursor:pointer;">
        <div id="pf-avatar" style="width:88px; height:88px; border-radius:50%; background:var(--panel-2); border:2px solid var(--line); display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:32px; margin:0 auto;">🧑</div>
        <div style="position:absolute; bottom:0; right:0; width:28px; height:28px; border-radius:50%; background:var(--gold); display:flex; align-items:center; justify-content:center; font-size:13px; border:2px solid var(--panel);">📷</div>
      </div>
      <input type="file" id="pf-photo-input" accept="image/*" style="display:none;">
      <p style="font-size:12px; color:var(--fog); margin:10px 0 0;">Tap to ${p.photo?'change':'add'} your photo${p.photo?' · <span id="pf-photo-remove" style="color:var(--clay); cursor:pointer;">remove</span>':''}</p>
    </div>
    <div class="card">
      <h2><span class="em">🧑</span>About Me</h2>
      <label>Birthday</label><input id="pf-birthday" type="date" value="${p.birthday||''}">
      <label>Sex</label>
      <select id="pf-sex">
        <option value="" ${!p.sex?'selected':''}>Prefer not to say</option>
        <option value="Male" ${p.sex==='Male'?'selected':''}>Male</option>
        <option value="Female" ${p.sex==='Female'?'selected':''}>Female</option>
      </select>
      <label>Primary school</label><input id="pf-primary" value="${esc(p.primarySchool||'')}">
      <label>Primary school finish date</label><input id="pf-primary-date" type="date" value="${p.primaryFinishDate||''}">
      <label>High school</label><input id="pf-highschool" value="${esc(p.highSchool||'')}">
      <label>High school finish date</label><input id="pf-highschool-date" type="date" value="${p.highSchoolFinishDate||''}">
      <label>College / university</label><input id="pf-college" value="${esc(p.college||'')}">
      <label>College finish date</label><input id="pf-college-date" type="date" value="${p.collegeFinishDate||''}">
      <label>Hobbies</label><textarea id="pf-hobbies" placeholder="One per line, or comma-separated">${esc(p.hobbies||'')}</textarea>
      <label>Fears</label><textarea id="pf-fears">${esc(p.fears||'')}</textarea>
      <p class="field-hint">Finish dates power the "you are..." and "...years ago" lines on your Home dashboard. Leave any blank to skip that line.</p>
    </div>

    ${p.sex==="Female"? `
    <div class="section-label">Cycle tracking</div>
    <div class="card">
      <label style="margin-top:0;">Average cycle length (days)</label><input id="pf-cycle-len" type="number" value="${p.avgCycleLength||28}">
      <p class="field-hint">Used to estimate your next period from your most recent logged one.</p>
      <div id="pf-cycle-predict" style="margin:10px 0;"></div>
      <button class="btn ghost sm" id="pf-cycle-open">Open cycle log</button>
    </div>` : ""}

    <div class="section-label">Body metrics</div>
    <div class="card">
      <div id="pf-body-latest"></div>
      <button class="btn ghost sm" id="pf-body-log" style="margin-top:10px;">Log weight / height</button>
    </div>

    <div class="section-label">More about me</div>
    <div class="card">
      <div id="pf-facts">${factsHTML()}</div>
      <button class="btn ghost sm" id="pf-add-fact">+ Add a fact</button>
    </div>
    <button class="btn" id="pf-save" style="margin-top:14px;">Save profile</button>

    <div class="section-label">On-device app usage</div>
    <div class="card">
      <div class="stat-grid">
        <div class="stat"><div class="n">${usageToday}m</div><div class="l">in Life OS today</div></div>
        <div class="stat"><div class="n">${usage7}m</div><div class="l">last 7 days</div></div>
      </div>
      <p class="field-hint" style="margin-top:10px;">This only measures time spent inside Life OS itself — a web app has no access to your phone's overall screen time or other apps' usage.</p>
    </div>
  `;
  el2.querySelector("[data-back]").addEventListener("click", popModule);

  const avatarEl = document.getElementById("pf-avatar");
  let avatarUrl = null;
  if(p.photo instanceof Blob){ avatarUrl = URL.createObjectURL(p.photo); avatarEl.innerHTML = `<img src="${avatarUrl}" style="width:100%; height:100%; object-fit:cover;">`; }
  const photoInput = document.getElementById("pf-photo-input");
  document.getElementById("pf-avatar-wrap").addEventListener("click", ()=> photoInput.click());
  photoInput.addEventListener("change", async ()=>{
    const file = photoInput.files[0];
    if(!file) return;
    p.photo = file;
    await DB.put("profile", p);
    toast("Photo updated");
    renderProfileScreen(el2);
  });
  const removeBtn = document.getElementById("pf-photo-remove");
  if(removeBtn) removeBtn.addEventListener("click", async (e)=>{
    e.stopPropagation();
    p.photo = null;
    await DB.put("profile", p);
    toast("Photo removed");
    renderProfileScreen(el2);
  });

  if(p.sex==="Female"){
    const lastCycle = (await DB.getAll("cycleLogs")).sort((a,b)=>(b.date||"")<(a.date||"")?-1:1)[0];
    const predictEl = document.getElementById("pf-cycle-predict");
    if(lastCycle){
      const next = new Date(lastCycle.date+"T00:00:00");
      next.setDate(next.getDate() + Number(p.avgCycleLength||28));
      const nextStr = next.toISOString().slice(0,10);
      const d = daysUntil(nextStr);
      predictEl.innerHTML = `<p style="font-size:13px; color:var(--paper); margin:0;">Next period expected: <b>${fmtDate(nextStr)}</b>${d!=null?" ("+(d>=0?"in "+d+"d":Math.abs(d)+"d late")+")":""}</p>`;
    } else {
      predictEl.innerHTML = `<p style="font-size:12.5px; color:var(--fog); margin:0;">Log your first period to start predictions.</p>`;
    }
    document.getElementById("pf-cycle-open").addEventListener("click", ()=> pushModule("list","cycleLogs",null));
  }

  const lastBody = (await DB.getAll("bodyLogs")).sort((a,b)=>(b.date||"")<(a.date||"")?-1:1)[0];
  const bodyEl = document.getElementById("pf-body-latest");
  if(lastBody){
    const bmi = (lastBody.weight && lastBody.height) ? (lastBody.weight/((lastBody.height/100)**2)).toFixed(1) : null;
    bodyEl.innerHTML = `<div class="stat-grid">
      <div class="stat"><div class="n">${lastBody.weight||"—"}</div><div class="l">kg</div></div>
      <div class="stat"><div class="n">${lastBody.height||"—"}</div><div class="l">cm</div></div>
      <div class="stat"><div class="n">${bmi||"—"}</div><div class="l">BMI</div></div>
    </div><p class="field-hint" style="margin-top:8px;">As of ${fmtDate(lastBody.date)}</p>`;
  } else {
    bodyEl.innerHTML = `<p class="field-hint" style="margin:0;">No entries yet.</p>`;
  }
  document.getElementById("pf-body-log").addEventListener("click", ()=> pushModule("form","bodyLogs",null));

  el2.querySelector("#pf-add-fact").addEventListener("click", ()=>{
    p.customFacts.push({label:"", value:""});
    document.getElementById("pf-facts").innerHTML = factsHTML();
    wireFactInputs();
  });
  function wireFactInputs(){
    document.querySelectorAll(".pf-label").forEach(inp=> inp.addEventListener("input", ()=>{ p.customFacts[Number(inp.dataset.i)].label = inp.value; }));
    document.querySelectorAll(".pf-value").forEach(inp=> inp.addEventListener("input", ()=>{ p.customFacts[Number(inp.dataset.i)].value = inp.value; }));
    document.querySelectorAll(".pf-remove").forEach(btn=> btn.addEventListener("click", ()=>{
      p.customFacts.splice(Number(btn.dataset.i),1);
      document.getElementById("pf-facts").innerHTML = factsHTML();
      wireFactInputs();
    }));
  }
  wireFactInputs();
  el2.querySelector("#pf-save").addEventListener("click", async ()=>{
    p.birthday = document.getElementById("pf-birthday").value;
    p.sex = document.getElementById("pf-sex").value;
    if(p.sex==="Female"){ const cl = document.getElementById("pf-cycle-len"); if(cl) p.avgCycleLength = Number(cl.value)||28; }
    p.primarySchool = document.getElementById("pf-primary").value;
    p.primaryFinishDate = document.getElementById("pf-primary-date").value;
    p.highSchool = document.getElementById("pf-highschool").value;
    p.highSchoolFinishDate = document.getElementById("pf-highschool-date").value;
    p.college = document.getElementById("pf-college").value;
    p.collegeFinishDate = document.getElementById("pf-college-date").value;
    p.hobbies = document.getElementById("pf-hobbies").value;
    p.fears = document.getElementById("pf-fears").value;
    p.customFacts = p.customFacts.filter(f=>f.label.trim()||f.value.trim());
    await DB.put("profile", p);
    toast("Profile saved");
    // Auto-create a yearly recurring birthday reminder, if one isn't already there.
    if(p.birthday){
      const existingBday = (await DB.getAll("importantDates")).find(d=>d.category==="Birthday" && d.title.toLowerCase().includes((SETTINGS.name||"my").toLowerCase()));
      if(!existingBday){
        await DB.add("importantDates", {id:uid(), title:(SETTINGS.name||"My")+"'s birthday", date:p.birthday, category:"Birthday", recurring:"Yes", notes:"", createdAt:nowISO()});
      }
    }
    renderProfileScreen(el2);
  });
}

/* =========================================================================
   LOCATION LOG — captures device location only while the app is open
   (foreground). True continuous background tracking isn't possible for a
   web app with no native permissions/backend, so this logs on-demand plus
   once automatically each time you open the app (if you've granted access).
   ========================================================================= */
function captureLocation(){
  return new Promise((resolve,reject)=>{
    if(!("geolocation" in navigator)){ reject(new Error("Geolocation not supported")); return; }
    navigator.geolocation.getCurrentPosition(
      pos=> resolve({lat:pos.coords.latitude, lng:pos.coords.longitude, accuracy:pos.coords.accuracy}),
      err=> reject(err),
      {enableHighAccuracy:false, timeout:10000, maximumAge:60000}
    );
  });
}
async function logLocationNow(el2){
  try{
    const pos = await captureLocation();
    const label = prompt("Label this place (optional):") || "";
    await DB.add("locationLogs", {id:uid(), date:todayStr(), time:new Date().toTimeString().slice(0,5), lat:pos.lat, lng:pos.lng, label, auto:false});
    toast("Location logged");
    if(el2) renderLocationsScreen(el2);
  }catch(e){ toast("Couldn't get location — check permission"); }
}
async function maybeAutoLogLocation(){
  if(!SETTINGS.autoLocationOn) return;
  const today = todayStr();
  if(SETTINGS._lastAutoLocation===today) return;
  try{
    if(navigator.permissions){
      const perm = await navigator.permissions.query({name:"geolocation"});
      if(perm.state!=="granted") return;
    }
    const pos = await captureLocation();
    await DB.add("locationLogs", {id:uid(), date:today, time:new Date().toTimeString().slice(0,5), lat:pos.lat, lng:pos.lng, label:"", auto:true});
    SETTINGS._lastAutoLocation = today;
    await DB.put("settings", SETTINGS);
  }catch(e){ /* silent — permission not granted or unavailable */ }
}
async function renderLocationsScreen(el2){
  const logs = (await DB.getAll("locationLogs")).sort((a,b)=> (b.date+b.time)<(a.date+a.time)?-1:1);
  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    <p class="field-hint" style="margin-top:0;">Only logged while Life OS is open on this device — there's no way for a web app to track location continuously in the background.</p>
    <div class="btn-row">
      <button class="btn" id="loc-now">📍 Log my location now</button>
      <button class="btn ghost" id="loc-manual">✏️ Enter manually</button>
    </div>
    <div class="card" style="margin-top:14px;">
      <label style="margin-top:0;">Auto-log once per day when I open the app</label>
      <div class="chips">
        <span class="chip ${SETTINGS.autoLocationOn?'active':''}" id="loc-auto-on">On</span>
        <span class="chip ${!SETTINGS.autoLocationOn?'active':''}" id="loc-auto-off">Off</span>
      </div>
    </div>
    <div class="section-label">History</div>
    <div class="card">
      ${logs.length? logs.map(l=>`
        <div class="row" data-id="${l.id}"><div class="row-icon">📍</div><div class="row-body"><div class="row-title">${esc(l.label||"Unnamed place")}${l.auto?' <span style="color:var(--fog-dim); font-weight:400;">· auto</span>':''}${l.manual?' <span style="color:var(--fog-dim); font-weight:400;">· manual</span>':''}</div><div class="row-sub">${fmtDate(l.date)} ${l.time||""}${(l.lat!=null)?" • "+l.lat.toFixed(4)+", "+l.lng.toFixed(4):""}</div></div>
        ${(l.lat!=null)? `<a href="https://www.google.com/maps?q=${l.lat},${l.lng}" target="_blank" rel="noopener" style="color:var(--gold); font-size:12px; text-decoration:none; margin-right:10px;">Map</a>`:""}
        <button class="btn danger sm loc-del" data-id="${l.id}" style="padding:6px 10px;">✕</button></div>
      `).join("") : `<div class="empty"><span class="em">📍</span><p>No locations logged yet.</p></div>`}
    </div>
  `;
  el2.querySelector("[data-back]").addEventListener("click", popModule);
  el2.querySelector("#loc-now").addEventListener("click", ()=> logLocationNow(el2));
  el2.querySelector("#loc-manual").addEventListener("click", ()=> openManualLocationForm(el2));
  el2.querySelector("#loc-auto-on").addEventListener("click", async ()=>{ SETTINGS.autoLocationOn=true; await DB.put("settings",SETTINGS); renderLocationsScreen(el2); });
  el2.querySelector("#loc-auto-off").addEventListener("click", async ()=>{ SETTINGS.autoLocationOn=false; await DB.put("settings",SETTINGS); renderLocationsScreen(el2); });
  el2.querySelectorAll(".loc-del").forEach(btn=> btn.addEventListener("click", async (e)=>{
    e.stopPropagation();
    if(!confirm("Delete this location entry?")) return;
    await DB.delete("locationLogs", btn.dataset.id);
    toast("Deleted"); renderLocationsScreen(el2);
  }));
}
function openManualLocationForm(el2){
  openSheet(`
    <div class="sheet-title">Enter location manually</div>
    <label>Place name / description</label><input id="ml-label" placeholder="e.g. Grandma's house, Nairobi CBD">
    <label>Date</label><input id="ml-date" type="date" value="${todayStr()}">
    <label>Coordinates (optional)</label>
    <div style="display:flex; gap:8px;">
      <input id="ml-lat" type="number" step="any" placeholder="Latitude">
      <input id="ml-lng" type="number" step="any" placeholder="Longitude">
    </div>
    <button class="btn" id="ml-save" style="margin-top:14px;">Save location</button>
  `);
  document.getElementById("ml-save").addEventListener("click", async ()=>{
    const label = document.getElementById("ml-label").value.trim();
    if(!label){ toast("Enter a place name"); return; }
    const lat = document.getElementById("ml-lat").value, lng = document.getElementById("ml-lng").value;
    await DB.add("locationLogs", {
      id:uid(), date:document.getElementById("ml-date").value||todayStr(), time:new Date().toTimeString().slice(0,5),
      lat: lat!==""? Number(lat) : null, lng: lng!==""? Number(lng) : null, label, manual:true
    });
    closeSheet(); toast("Location saved"); renderLocationsScreen(el2);
  });
}

/* =========================================================================
   ON-DEVICE APP USAGE — how long Life OS itself has been open (Page
   Visibility API). This cannot see time spent in other apps.
   ========================================================================= */
let usageSessionStart = null;
async function getAppUsageMinutes(dateStr){
  const logs = await DB.byIndex("appUsageLogs","date",dateStr);
  return logs.reduce((s,l)=>s+Math.round(l.minutes||0),0);
}
async function getAppUsageMinutes7d(){
  const since = (()=>{ const d=new Date(); d.setDate(d.getDate()-7); return d.toISOString().slice(0,10); })();
  const all = await DB.getAll("appUsageLogs");
  return Math.round(all.filter(l=>l.date>=since).reduce((s,l)=>s+(l.minutes||0),0));
}
async function flushUsageSession(){
  if(usageSessionStart==null) return;
  const minutes = (Date.now()-usageSessionStart)/60000;
  usageSessionStart = null;
  if(minutes<0.05) return;
  const today = todayStr();
  const existing = (await DB.byIndex("appUsageLogs","date",today))[0];
  if(existing){ existing.minutes = (existing.minutes||0)+minutes; await DB.put("appUsageLogs", existing); }
  else { await DB.add("appUsageLogs", {id:uid(), date:today, minutes}); }
}
function startUsageTracking(){
  usageSessionStart = Date.now();
  document.addEventListener("visibilitychange", ()=>{
    if(document.hidden) flushUsageSession();
    else usageSessionStart = Date.now();
  });
  window.addEventListener("beforeunload", flushUsageSession);
  setInterval(flushUsageSession, 5*60000); // periodic save so long sessions aren't lost
}

/* =========================================================================
   PHOTOS — a private local gallery. Images are stored as Blobs in
   IndexedDB, same as document files, and included in JSON backups.
   ========================================================================= */
async function renderPhotosScreen(el2){
  const photos = (await DB.getAll("photos")).sort((a,b)=>(b.date||"")<(a.date||"")?-1:1);
  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    <div class="btn-row"><button class="btn" id="ph-add">📷 Add pictures</button></div>
    <input type="file" id="ph-file" accept="image/*" multiple style="display:none;">
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:14px;" id="ph-grid"></div>
    ${!photos.length? `<div class="empty"><span class="em">🖼️</span><p>No pictures yet.</p></div>`:""}
  `;
  el2.querySelector("[data-back]").addEventListener("click", popModule);
  const fileInput = el2.querySelector("#ph-file");
  el2.querySelector("#ph-add").addEventListener("click", ()=> fileInput.click());
  fileInput.addEventListener("change", async ()=>{
    const files = Array.from(fileInput.files||[]);
    for(const f of files){
      await DB.add("photos", {id:uid(), date:todayStr(), fileName:f.name, fileType:f.type, blob:f, caption:""});
    }
    if(files.length) toast(`Added ${files.length} picture${files.length===1?'':'s'}`);
    fileInput.value = "";
    renderPhotosScreen(el2);
  });
  const grid = el2.querySelector("#ph-grid");
  photos.forEach(p=>{
    const url = URL.createObjectURL(p.blob);
    const cell = document.createElement("div");
    cell.style.cssText = "aspect-ratio:1; border-radius:10px; overflow:hidden; cursor:pointer; background:var(--panel-2);";
    cell.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover; display:block;">`;
    cell.addEventListener("click", ()=> openPhotoViewer(p, url, el2));
    grid.appendChild(cell);
  });
}
function openPhotoViewer(p, url, el2){
  openSheet(`
    <div class="sheet-title">${esc(p.caption||fmtDate(p.date))}</div>
    <img src="${url}" style="width:100%; border-radius:12px; margin:10px 0;">
    <label>Caption</label><input id="ph-caption" value="${esc(p.caption||'')}">
    <div class="btn-row">
      <button class="btn" id="ph-save-caption">Save caption</button>
      <button class="btn danger" id="ph-delete">Delete</button>
    </div>
  `);
  document.getElementById("ph-save-caption").onclick = async ()=>{
    p.caption = document.getElementById("ph-caption").value;
    await DB.put("photos", p);
    closeSheet(); toast("Saved"); renderPhotosScreen(el2);
  };
  document.getElementById("ph-delete").onclick = async ()=>{
    if(!confirm("Delete this picture?")) return;
    await DB.delete("photos", p.id);
    closeSheet(); toast("Deleted"); renderPhotosScreen(el2);
  };
}

/* =========================================================================
   ASSISTANT — a local, rule-based helper that answers questions using only
   what's already in your Life OS data. This is NOT a general-purpose AI: a
   fully offline, no-backend app has nowhere to send a prompt to an LLM
   without breaking the whole local-first design. So instead, this reads
   your own tasks/money/goals/habits/etc. and answers directly from them.
   ========================================================================= */
let assistantMessages = [];
async function renderAssistantScreen(el2){
  if(!assistantMessages.length){
    const onlineNote = (SETTINGS.aiOnline && CONFIG.anthropicKey) ? (navigator.onLine? " 🟢 Real AI is on right now — I can also add tasks or reminders if you ask me to." : " 🟡 Real AI is enabled but you're offline, so I'm using local answers only for now.") : "";
    assistantMessages.push({from:"bot", text:`Hey ${SETTINGS.name||"there"} 👋 I'm your Life OS assistant.${onlineNote} I only know what's stored in this app — no internet, no general knowledge unless online mode is on — so ask me things like "what's due today", "how much have I spent this month", "how's my gym routine going", "what did I eat today", or "when's my next period".`});
  }
  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    <div id="ax-messages" style="display:flex; flex-direction:column; gap:10px; margin-bottom:90px;"></div>
  `;
  el2.querySelector("[data-back]").addEventListener("click", popModule);
  renderAssistantMessages();

  // Floating input bar, pinned above the tab bar, only while this screen is open.
  let bar = document.getElementById("ax-inputbar");
  if(!bar){
    bar = document.createElement("div");
    bar.id = "ax-inputbar";
    bar.style.cssText = "position:fixed; left:0; right:0; bottom:70px; z-index:25; display:flex; justify-content:center; padding:10px 18px;";
    bar.innerHTML = `
      <div style="max-width:560px; width:100%; display:flex; gap:8px; background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:8px; box-shadow:0 4px 16px rgba(0,0,0,0.3);">
        <input id="ax-input" placeholder="Ask about your day, money, goals…" style="border:none; background:none; box-shadow:none;">
        <button class="btn sm" id="ax-send" style="border-radius:12px;">Send</button>
      </div>
    `;
    document.body.appendChild(bar);
  }
  bar.style.display = "flex";
  document.getElementById("fab").style.display = "none";
  const input = document.getElementById("ax-input");
  const send = async ()=>{
    const q = input.value.trim();
    if(!q) return;
    assistantMessages.push({from:"user", text:q});
    input.value = "";
    renderAssistantMessages();
    const reply = await assistantRespond(q);
    assistantMessages.push({from:"bot", text:reply.text, proposal:reply.proposal||null});
    renderAssistantMessages();
  };
  document.getElementById("ax-send").onclick = send;
  input.addEventListener("keydown", (e)=>{ if(e.key==="Enter") send(); });

  // Clean up the floating bar and restore the FAB when navigating away.
  const cleanup = ()=>{
    const b = document.getElementById("ax-inputbar"); if(b) b.style.display="none";
    document.getElementById("fab").style.display = "flex";
  };
  const observer = new MutationObserver(()=>{
    if(!document.getElementById("screen-module").classList.contains("active") || STATE.stack[STATE.stack.length-1]?.module!=="__assistant__"){
      cleanup(); observer.disconnect();
    }
  });
  observer.observe(document.getElementById("screen-module"), {attributes:true, attributeFilter:["class"]});
}
function renderAssistantMessages(){
  const wrap = document.getElementById("ax-messages");
  if(!wrap) return;
  wrap.innerHTML = assistantMessages.map((m,i)=> m.from==="bot"
    ? `<div style="align-self:flex-start; max-width:88%; background:var(--panel-2); border:1px solid var(--line); border-radius:14px 14px 14px 4px; padding:10px 13px; font-size:13.5px; line-height:1.5; color:var(--paper);">
        ${m.text? esc(m.text).replace(/\n/g,"<br>") : ""}
        ${m.proposal ? renderProposalCard(m.proposal, i) : ""}
      </div>`
    : `<div style="align-self:flex-end; max-width:85%; background:var(--gold); color:#1A1406; border-radius:14px 14px 4px 14px; padding:10px 13px; font-size:13.5px; line-height:1.5; font-weight:600;">${esc(m.text)}</div>`
  ).join("");
  wrap.scrollIntoView({block:"end"});
  assistantMessages.forEach((m,i)=>{
    if(!m.proposal || m.proposal.resolved) return;
    const yes = document.getElementById("ax-confirm-"+i);
    const no = document.getElementById("ax-cancel-"+i);
    if(yes) yes.onclick = async ()=>{
      await m.proposal.apply();
      m.proposal.resolved = true;
      assistantMessages.push({from:"bot", text:"✓ Done — saved to your data."});
      renderAssistantMessages();
    };
    if(no) no.onclick = ()=>{
      m.proposal.resolved = true;
      m.proposal.cancelled = true;
      assistantMessages.push({from:"bot", text:"No problem — skipped that."});
      renderAssistantMessages();
    };
  });
}
function renderProposalCard(p, i){
  if(p.resolved){
    return `<div style="margin-top:10px; font-size:12px; color:var(--fog-dim);">${p.cancelled? "⨯ Skipped":"✓ Applied"}</div>`;
  }
  return `
    <div style="margin-top:10px; background:var(--bg-1,var(--bg)); border:1px solid var(--line); border-radius:12px; padding:11px; animation:fieldIn .3s ease;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <span style="font-size:16px;">${p.icon}</span><span style="font-weight:700; font-size:12.5px; color:var(--gold);">${esc(p.label)}</span>
      </div>
      ${p.fields.map(f=>`<div style="display:flex; justify-content:space-between; gap:10px; font-size:12.5px; padding:4px 0; border-top:1px solid var(--line);"><span style="color:var(--fog);">${f.icon} ${esc(f.label)}</span><span style="color:var(--paper); font-weight:600; text-align:right;">${esc(String(f.value))}</span></div>`).join("")}
      <div class="btn-row" style="margin-top:10px;">
        <button class="btn sm" id="ax-confirm-${i}" style="flex:1;">✓ Confirm</button>
        <button class="btn ghost sm" id="ax-cancel-${i}" style="flex:1;">Skip</button>
      </div>
    </div>`;
}
async function assistantRespond(qRaw){
  if(SETTINGS.aiOnline && CONFIG.anthropicKey && navigator.onLine){
    try{
      const reply = await assistantRespondOnline(qRaw);
      if(reply) return reply;
    }catch(e){
      console.error("Online AI failed, falling back to local:", e);
      // Fall through to local — the app must never break because of the network.
    }
  }
  return {text: await assistantRespondLocal(qRaw)};
}
async function buildAssistantContext(){
  const [tasks, reminders, goals, habits, expenses, income, budgets, debts, subs, bodyLogs, sleepLogs, moods, foodLogs, gymRoutines, docs, inventory] = await Promise.all([
    DB.getAll("tasks"), DB.getAll("reminders"), DB.getAll("personalGoals"), DB.getAll("habits"),
    DB.getAll("expenses"), DB.getAll("income"), DB.getAll("budgets"), DB.getAll("debts"),
    DB.getAll("subscriptions"), DB.getAll("bodyLogs"), DB.getAll("sleepLogs"), DB.getAll("moods"),
    DB.getAll("foodLogs"), DB.getAll("gymRoutines"), DB.getAll("documents"), DB.getAll("inventory")
  ]);
  const today = todayStr();
  const dueToday = tasks.filter(t=>!t.done && t.dueDate===today).map(t=>t.title);
  const overdue = tasks.filter(t=>!t.done && t.dueDate && t.dueDate<today).length;
  const monthPrefix = today.slice(0,7);
  const spentThisMonth = expenses.filter(e=>(e.date||"").startsWith(monthPrefix)).reduce((s,e)=>s+Number(e.amount||0),0);
  const earnedThisMonth = income.filter(e=>(e.date||"").startsWith(monthPrefix)).reduce((s,e)=>s+Number(e.amount||0),0);
  const activeGoals = goals.filter(g=>g.status!=="Completed").map(g=>g.title);
  const openDebts = debts.map(d=>`${d.person} (${d.direction}, ${SETTINGS.currency||"KSh"}${d.remaining!=null?d.remaining:d.amount} remaining)`);
  const upcomingSubs = subs.filter(s=>s.nextPaymentDate && s.nextPaymentDate>=today).sort((a,b)=>a.nextPaymentDate<b.nextPaymentDate?-1:1).slice(0,5).map(s=>`${s.name} on ${fmtDate(s.nextPaymentDate)}`);
  const lastSleep = sleepLogs.sort((a,b)=>(b.date||"")<(a.date||"")?-1:1)[0];
  const lastWeight = bodyLogs.filter(b=>b.weight).sort((a,b)=>(b.date||"")<(a.date||"")?-1:1)[0];
  const lastMood = moods.sort((a,b)=>(b.date||"")<(a.date||"")?-1:1)[0];
  const expiringDocs = docs.filter(d=>d.expiryDate && daysUntil(d.expiryDate)!=null && daysUntil(d.expiryDate)>=0 && daysUntil(d.expiryDate)<=60).map(d=>d.name);
  const foodToday = foodLogs.filter(f=>f.date===today).map(f=>f.mealType+": "+f.description);

  return `You are the Life OS Assistant for ${SETTINGS.name||"the user"}, a private offline-first personal management app. Today is ${today}. Currency: ${SETTINGS.currency||"KSh"}.
FULL CURRENT DATA SNAPSHOT:
- Tasks: ${dueToday.length} due today (${dueToday.join(", ")||"none"}), ${overdue} overdue, ${tasks.length} total.
- Reminders: ${reminders.length} set.
- Goals: ${activeGoals.join(", ")||"none active"}.
- Habits tracked: ${habits.map(h=>h.name).join(", ")||"none"}.
- Money: spent ${spentThisMonth} this month, earned ${earnedThisMonth} this month, ${budgets.length} budgets set.
- Debts: ${openDebts.join("; ")||"none"}.
- Subscriptions renewing soon: ${upcomingSubs.join(", ")||"none"}.
- Sleep: last logged ${lastSleep? fmtDate(lastSleep.date)+(lastSleep.quality?" (quality "+lastSleep.quality+"/5)":""):"never"}.
- Weight: last logged ${lastWeight? lastWeight.weight+"kg on "+fmtDate(lastWeight.date):"never"}.
- Mood: last logged ${lastMood? lastMood.mood+" on "+fmtDate(lastMood.date):"never"}.
- Meals today: ${foodToday.join("; ")||"none logged"}.
- Gym routines: ${gymRoutines.map(g=>g.name).join(", ")||"none"}.
- Documents expiring within 60 days: ${expiringDocs.join(", ")||"none"}.
- Inventory items: ${inventory.length}.

Answer naturally and briefly (2-4 sentences), grounded only in the data above — you have no other knowledge of their life. Be warm but concise.
If the user is clearly asking you to record, add, log, or update something, end your reply with exactly one action block on its own line, using this exact JSON format and nothing else on that line:
[ACTION]{"type":"<type>", ...fields}[/ACTION]
Valid types and fields:
- add_task: {"title","dueDate"} (dueDate optional, YYYY-MM-DD)
- add_reminder: {"title","dueDate","time"} (dueDate/time optional)
- add_expense: {"description","amount","category"}
- add_income: {"description","amount","category"}
- add_debt_payment: {"person","amount"} — reduces that person's remaining debt by amount; person must match an existing debt above
- log_weight: {"weight","date"} (date optional, defaults to today)
- add_food: {"mealType","description","calories"} (calories optional)
Never invent an action the user didn't ask for. Never fabricate a person/category/title that isn't grounded in what the user actually said.`;
}
async function assistantRespondOnline(qRaw){
  const system = await buildAssistantContext();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key": CONFIG.anthropicKey,
      "anthropic-version":"2023-06-01",
      "anthropic-dangerous-direct-browser-access":"true"
    },
    body: JSON.stringify({
      model:"claude-sonnet-4-6",
      max_tokens:500,
      system,
      messages:[{role:"user", content:qRaw}]
    })
  });
  if(!res.ok) throw new Error("API error "+res.status);
  const data = await res.json();
  let text = (data.content||[]).filter(c=>c.type==="text").map(c=>c.text).join("").trim();
  const actionMatch = text.match(/\[ACTION\](\{[\s\S]*?\})\[\/ACTION\]/);
  if(actionMatch){
    text = text.replace(actionMatch[0], "").trim();
    let action;
    try{ action = JSON.parse(actionMatch[1]); }catch(e){ action = null; }
    if(action){
      const proposal = await resolveAssistantAction(action);
      if(proposal) return {text, proposal};
      text += (text?"\n\n":"") + "I couldn't quite match that to something in your data — could you be more specific?";
    }
  }
  return {text: text || "..."};
}
// Turns a raw AI-proposed action into a reviewable card (icon + fields + Confirm/Cancel)
// instead of ever silently writing to the database or showing raw JSON to the user.
async function resolveAssistantAction(action){
  const t = action.type;
  if(t==="add_task"){
    return {icon:"✅", label:"Add task", fields:[{icon:"✏️",label:"Title",value:action.title},{icon:"📅",label:"Due",value:action.dueDate?fmtDate(action.dueDate):"No date"}],
      apply: async ()=>{ await DB.add("tasks",{id:uid(), title:action.title, dueDate:action.dueDate||null, status:"open", done:false, createdAt:nowISO()}); }};
  }
  if(t==="add_reminder"){
    return {icon:"⏰", label:"Add reminder", fields:[{icon:"✏️",label:"Title",value:action.title},{icon:"📅",label:"Due",value:action.dueDate?fmtDate(action.dueDate):"Today"}],
      apply: async ()=>{ await DB.add("reminders",{id:uid(), title:action.title, dueDate:action.dueDate||todayStr(), time:action.time||"", repeat:"", notes:"Added by the Assistant.", createdAt:nowISO()}); }};
  }
  if(t==="add_expense" || t==="add_income"){
    const store = t==="add_expense"?"expenses":"income";
    return {icon: t==="add_expense"?"💸":"💰", label: t==="add_expense"?"Add expense":"Add income",
      fields:[{icon:"📝",label:"What",value:action.description},{icon:"💰",label:"Amount",value:(SETTINGS.currency||"KSh")+" "+action.amount},{icon:"🏷️",label:"Category",value:action.category||"General"}],
      apply: async ()=>{ await DB.add(store, {id:uid(), description:action.description, amount:Number(action.amount)||0, category:action.category||"General", date:todayStr(), createdAt:nowISO()}); }};
  }
  if(t==="add_debt_payment"){
    const debts = await DB.getAll("debts");
    const match = debts.find(d=> (d.person||"").toLowerCase().includes((action.person||"").toLowerCase()));
    if(!match) return null;
    const current = match.remaining!=null? match.remaining : match.amount;
    const next = Math.max(0, current - (Number(action.amount)||0));
    return {icon:"🤝", label:"Record debt payment", fields:[{icon:"🤝",label:"Person",value:match.person},{icon:"💰",label:"Payment",value:(SETTINGS.currency||"KSh")+" "+action.amount},{icon:"✅",label:"New balance",value:(SETTINGS.currency||"KSh")+" "+next}],
      apply: async ()=>{ match.remaining = next; match.updatedAt = nowISO(); await DB.put("debts", match); await DB.add("debtPayments",{id:uid(), debtId:match.id, amount:Number(action.amount)||0, date:todayStr(), createdAt:nowISO()}); }};
  }
  if(t==="log_weight"){
    return {icon:"⚖️", label:"Log weight", fields:[{icon:"⚖️",label:"Weight",value:action.weight+"kg"},{icon:"📅",label:"Date",value:fmtDate(action.date||todayStr())}],
      apply: async ()=>{ await DB.add("bodyLogs",{id:uid(), date:action.date||todayStr(), weight:Number(action.weight)||null, createdAt:nowISO()}); }};
  }
  if(t==="add_food"){
    return {icon:"🥗", label:"Log meal", fields:[{icon:"🍽️",label:"Meal",value:action.mealType||"Meal"},{icon:"📝",label:"What",value:action.description},{icon:"🔥",label:"Calories",value:action.calories||"—"}],
      apply: async ()=>{ await DB.add("foodLogs",{id:uid(), date:todayStr(), mealType:action.mealType||"Snack", description:action.description, calories:action.calories?Number(action.calories):null, createdAt:nowISO()}); }};
  }
  return null;
}
async function assistantRespondLocal(qRaw){
  const q = qRaw.toLowerCase();
  const name = SETTINGS.name || "";
  const today = todayStr();

  if(/\b(hi|hello|hey|sup)\b/.test(q) && q.length<20){
    return `Hey${name?" "+name:""}! What would you like to know — your tasks, money, goals, habits, or something else?`;
  }

  if(/period|cycle|menstru/.test(q)){
    const profile = await DB.get("profile","main");
    if(!profile || profile.sex!=="Female") return "Cycle tracking isn't set up — set your sex to Female in Profile to enable it.";
    const logs = await DB.getAll("cycleLogs");
    if(!logs.length) return "No cycle logged yet — add your first period in the Cycle log to get predictions.";
    const last = logs.sort((a,b)=>(b.date||"")<(a.date||"")?-1:1)[0];
    const next = new Date(last.date+"T00:00:00");
    next.setDate(next.getDate() + Number(profile.avgCycleLength||28));
    const nextStr = next.toISOString().slice(0,10);
    const d = daysUntil(nextStr);
    return `Based on your last logged period (${fmtDate(last.date)}), your next one is expected around ${fmtDate(nextStr)}${d!=null?" — that's "+(d>=0?"in "+d+" day"+(d===1?"":"s"):Math.abs(d)+" day"+(Math.abs(d)===1?"":"s")+" late"):""}.`;
  }

  if(/how old|my age|birthday/.test(q)){
    const profile = await DB.get("profile","main");
    const age = profile? yearsMonthsSince(profile.birthday) : null;
    if(!age) return "I don't have your birthday yet — add it in Profile and I'll be able to tell you.";
    return `You're ${age.years} year${age.years===1?"":"s"}${age.months?" and "+age.months+" month"+(age.months===1?"":"s"):""} old today.`;
  }

  if(/weight|bmi|height/.test(q)){
    const logs = await DB.getAll("bodyLogs");
    if(!logs.length) return "No weight/height logged yet — add an entry from Profile → Log weight/height.";
    const last = logs.sort((a,b)=>(b.date||"")<(a.date||"")?-1:1)[0];
    const bmi = (last.weight&&last.height)? (last.weight/((last.height/100)**2)).toFixed(1) : null;
    return `As of ${fmtDate(last.date)}: ${last.weight?last.weight+"kg":"no weight logged"}${last.height?", "+last.height+"cm":""}${bmi?", BMI "+bmi:""}.`;
  }

  if(/sleep|slept/.test(q)){
    const logs = await DB.getAll("sleepLogs");
    if(!logs.length) return "No sleep logged yet — add one from the Sleep log.";
    const last = logs.sort((a,b)=>(b.date||"")<(a.date||"")?-1:1)[0];
    if(!last.bedTime || !last.wakeTime) return `Your last sleep entry (${fmtDate(last.date)}) doesn't have both times logged.`;
    const [bh,bm]=last.bedTime.split(":").map(Number), [wh,wm]=last.wakeTime.split(":").map(Number);
    let mins = (wh*60+wm)-(bh*60+bm); if(mins<0) mins+=24*60;
    return `On ${fmtDate(last.date)} you slept from ${last.bedTime} to ${last.wakeTime} — about ${(mins/60).toFixed(1)} hours.`;
  }

  if(/spend|expense|money|budget/.test(q)){
    const expenses = await DB.getAll("expenses");
    const income = await DB.getAll("income");
    const ym = today.slice(0,7);
    const monthExp = expenses.filter(e=>e.date && e.date.slice(0,7)===ym);
    const total = monthExp.reduce((s,e)=>s+Number(e.amount||0),0);
    const monthInc = income.filter(i=>i.date && i.date.slice(0,7)===ym).reduce((s,i)=>s+Number(i.amount||0),0);
    const byCat = {}; monthExp.forEach(e=> byCat[e.category]=(byCat[e.category]||0)+Number(e.amount||0));
    const top = Object.entries(byCat).sort((a,b)=>b[1]-a[1])[0];
    return `This month you've spent ${fmtMoney(total)} and earned ${fmtMoney(monthInc)}, net ${fmtMoney(monthInc-total)}.${top?" Your top category is "+top[0]+" at "+fmtMoney(top[1])+".":""}`;
  }

  if(/debt|owe/.test(q)){
    const debts = await DB.getAll("debts");
    const owed = debts.filter(d=>d.direction==="They owe me").reduce((s,d)=>s+Number(d.remaining!=null?d.remaining:d.amount||0),0);
    const owe = debts.filter(d=>d.direction==="I owe them").reduce((s,d)=>s+Number(d.remaining!=null?d.remaining:d.amount||0),0);
    if(!debts.length) return "No debts tracked right now.";
    return `People owe you ${fmtMoney(owed)}, and you owe ${fmtMoney(owe)}.`;
  }

  if(/subscription|bill|payment/.test(q)){
    const subs = await DB.getAll("subscriptions");
    const upcoming = subs.filter(s=> s.nextPaymentDate && daysUntil(s.nextPaymentDate)!=null && daysUntil(s.nextPaymentDate)>=0 && daysUntil(s.nextPaymentDate)<=14);
    if(!upcoming.length) return "No subscription payments due in the next two weeks.";
    return "Coming up: " + upcoming.map(s=> s.name+" ("+fmtMoney(s.amount)+", "+fmtDate(s.nextPaymentDate)+")").join("; ") + ".";
  }

  if(/goal/.test(q)){
    const goals = await DB.getAll("personalGoals");
    const active = goals.filter(g=>g.status!=="Completed");
    const longTerm = active.filter(g=>g.term==="Long-term");
    if(!goals.length) return "No goals set yet — add one from the Grow tab.";
    return `You have ${active.length} active goal${active.length===1?"":"s"}${longTerm.length?` (${longTerm.length} long-term)`:""}, and ${goals.filter(g=>g.status==="Completed").length} completed.`;
  }

  if(/habit|streak/.test(q)){
    const habits = await DB.getAll("habits");
    if(!habits.length) return "No habits tracked yet — add one from the Grow tab.";
    let best = {name:"", streak:0};
    for(const h of habits){ const s = await habitStreak(h.id); if(s>best.streak) best={name:h.name, streak:s}; }
    return best.streak>0 ? `Your best current streak is "${best.name}" at ${best.streak} day${best.streak===1?"":"s"}. You're tracking ${habits.length} habit${habits.length===1?"":"s"} total.` : `You're tracking ${habits.length} habit${habits.length===1?"":"s"}, but no active streak right now — check one off today to start one.`;
  }

  if(/reminder/.test(q)){
    const reminders = await DB.getAll("reminders");
    const todays = reminders.filter(r=>!r.done && reminderOccursOn(r, today));
    if(!todays.length) return "No reminders for today.";
    return "Today's reminders: " + todays.map(r=>r.title).join(", ") + ".";
  }

  if(/task|to.?do|due/.test(q)){
    const tasks = await DB.getAll("tasks");
    const overdue = tasks.filter(t=>!t.done && t.dueDate && t.dueDate<today);
    const dueToday = tasks.filter(t=>!t.done && t.dueDate===today);
    if(!dueToday.length && !overdue.length) return "Nothing due today, and nothing overdue. You're clear.";
    let parts = [];
    if(overdue.length) parts.push(`${overdue.length} overdue`);
    if(dueToday.length) parts.push(`${dueToday.length} due today: ${dueToday.map(t=>t.title).join(", ")}`);
    return parts.join(" — ") + ".";
  }

  if(/diet|meal|eat|calorie|nutrition/.test(q)){
    const logs = await DB.getAll("foodLogs");
    const todays = logs.filter(f=>f.date===today);
    if(!logs.length) return "No meals logged yet — track one from Quick Add → Meal.";
    if(!todays.length) return `No meals logged today yet. You've logged ${logs.length} meal${logs.length===1?"":"s"} in total.`;
    const cal = todays.reduce((s,f)=>s+Number(f.calories||0),0);
    return `Today so far: ${todays.map(f=>f.mealType+" — "+f.description).join("; ")}.${cal?" That's about "+cal+" calories.":""}`;
  }

  if(/gym|workout|exercise|routine|fitness/.test(q)){
    const routines = await DB.getAll("gymRoutines");
    const workouts = await DB.getAll("workouts");
    const thisWeek = (()=>{ const d=new Date(); d.setDate(d.getDate()-7); return d.toISOString().slice(0,10); })();
    const recent = workouts.filter(w=>w.date>=thisWeek);
    if(!routines.length && !workouts.length) return "No gym routines or workouts logged yet — set up a routine from Quick Add → Gym routine.";
    let parts = [];
    if(routines.length) parts.push(`${routines.length} routine${routines.length===1?"":"s"} set up: ${routines.map(r=>r.name).join(", ")}`);
    parts.push(`${recent.length} workout${recent.length===1?"":"s"} logged in the last 7 days`);
    return parts.join(". ") + ".";
  }

  if(/document|expir/.test(q)){
    const docs = await DB.getAll("documents");
    const expiring = docs.filter(d=> d.expiryDate && daysUntil(d.expiryDate)!=null && daysUntil(d.expiryDate)>=0 && daysUntil(d.expiryDate)<=60);
    if(!expiring.length) return "No documents expiring in the next 60 days.";
    return "Expiring soon: " + expiring.map(d=>d.name+" ("+fmtDate(d.expiryDate)+")").join(", ") + ".";
  }

  if(/trip|travel/.test(q)){
    const trips = await DB.getAll("trips");
    const upcoming = trips.filter(t=> t.startDate && t.startDate>=today);
    if(!trips.length) return "No trips planned yet.";
    if(!upcoming.length) return `You have ${trips.length} trip${trips.length===1?"":"s"} logged, none upcoming.`;
    return "Upcoming: " + upcoming.map(t=>t.name+(t.destination?" to "+t.destination:"")+" on "+fmtDate(t.startDate)).join(", ") + ".";
  }

  return `I can only answer from what's in your Life OS data — try asking about tasks, spending, goals, habits, sleep, weight, debts, subscriptions, reminders, diet, gym, documents, trips${name?", or your age":""}. Try something like "what's due today" or "how are my goals going".`;
}

/* =========================================================================
   QUICK ADD (FAB)
   ========================================================================= */
const QUICK_ACTIONS = [
  {ic:"check", l:"Task", mod:"tasks"}, {ic:"bell", l:"Reminder", mod:"reminders"},
  {ic:"wallet", l:"Expense", mod:"expenses"}, {ic:"wallet", l:"Income", mod:"income"},
  {ic:"wallet", l:"Debt", mod:"debts"}, {ic:"wallet", l:"Subscription", mod:"subscriptions"},
  {ic:"target", l:"Goal", mod:"personalGoals"}, {ic:"flame", l:"Habit", mod:"habit"},
  {ic:"book", l:"Journal", mod:"journal"}, {ic:"book", l:"Book", mod:"books"},
  {ic:"note", l:"Note", mod:"notes"}, {ic:"box", l:"Inventory item", mod:"inventory"},
  {ic:"user", l:"Contact", mod:"contacts"}, {ic:"doc", l:"Document", mod:"document"},
  {ic:"plane", l:"Trip", mod:"trip"}, {ic:"smile", l:"Mood", mod:"moods"},
  {ic:"heart", l:"Gratitude", mod:"gratitude"}, {ic:"activity", l:"Workout", mod:"workouts"},
  {ic:"moon", l:"Sleep", mod:"sleepLogs"}, {ic:"calendar", l:"Special date", mod:"importantDates"},
  {ic:"heart", l:"Relationship", mod:"relationships"}, {ic:"scale", l:"Body log", mod:"bodyLogs"},
  {ic:"image", l:"Photo", mod:"photo"}, {ic:"bowl", l:"Meal", mod:"foodLogs"},
  {ic:"gym", l:"Gym routine", mod:"gymRoutines"}, {ic:"timer", l:"Start a fast", mod:"fasting"},
  {ic:"graduation", l:"Learning item", mod:"learning"}
];
function openQuickAdd(){
  openSheet(`
    <div class="sheet-title">Quick add</div>
    <div class="qa-grid">
      ${QUICK_ACTIONS.map(a=>`<div class="qa-item" data-mod="${a.mod}"><span class="em">${icon(a.ic,20)}</span><span class="l">${a.l}</span></div>`).join("")}
    </div>
  `);
  document.querySelectorAll(".qa-item").forEach(n=> n.addEventListener("click", ()=>{
    closeSheet();
    if(n.dataset.mod==="habit"){ openHabitForm(); return; }
    if(n.dataset.mod==="document"){ openDocumentForm(); return; }
    if(n.dataset.mod==="trip"){ pushModule("form","trips",null); return; }
    if(n.dataset.mod==="photo"){ pushModule("list","__photos__",null); return; }
    if(n.dataset.mod==="fasting"){ pushModule("list","__fasting__",null); return; }
    pushModule("form", n.dataset.mod, null);
  }));
}

/* =========================================================================
   SEARCH
   ========================================================================= */
function openSearch(){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  const el2 = document.getElementById("screen-search");
  el2.classList.add("active");
  document.getElementById("topbar-title").textContent = "Search";
  el2.innerHTML = `
    <button class="detail-back" data-back>← Back</button>
    <input id="search-input" placeholder="Search tasks, notes, expenses, goals…" autofocus style="margin-bottom:14px;">
    <div id="search-results"></div>
  `;
  el2.querySelector("[data-back]").addEventListener("click", ()=> appBack(()=>setTab(STATE.tab)));
  const input = document.getElementById("search-input");
  input.addEventListener("input", ()=> runSearch(input.value));
  input.focus();
  navPush();
}
async function runSearch(q){
  const out = document.getElementById("search-results");
  if(!q || q.trim().length<1){ out.innerHTML=""; return; }
  const needle = q.trim().toLowerCase();
  let html = "";
  for(const [key, cfg] of Object.entries(MODULES)){
    const all = await DB.getAll(cfg.store);
    const hits = all.filter(r=> JSON.stringify(r,(k,v)=> k==='blob'?undefined:v).toLowerCase().includes(needle));
    if(hits.length){
      html += `<div class="section-label">${cfg.label} — ${hits.length}</div><div class="card">`;
      html += hits.slice(0,10).map(r=>`<div class="row" data-open="${key}|${r.id}"><div class="row-icon">${icon(cfg.icon,16)}</div><div class="row-body"><div class="row-title">${esc(cfg.title(r))}</div><div class="row-sub">${esc(cfg.sub?cfg.sub(r):"")}</div></div></div>`).join("");
      html += `</div>`;
    }
  }
  // Custom (non-generic) stores: documents and timeline
  const docs = (await DB.getAll("documents")).filter(d=> JSON.stringify(d,(k,v)=>k==='blob'?undefined:v).toLowerCase().includes(needle));
  if(docs.length){
    html += `<div class="section-label">Documents — ${docs.length}</div><div class="card">`;
    html += docs.slice(0,10).map(d=>`<div class="row" data-custom-open="__documents__|${d.id}"><div class="row-icon">📄</div><div class="row-body"><div class="row-title">${esc(d.name)}</div><div class="row-sub">${esc(d.category||"")}</div></div></div>`).join("");
    html += `</div>`;
  }
  const tl = (await DB.getAll("timeline")).filter(t=> JSON.stringify(t).toLowerCase().includes(needle));
  if(tl.length){
    html += `<div class="section-label">Timeline — ${tl.length}</div><div class="card">`;
    html += tl.slice(0,10).map(t=>`<div class="row" data-custom-open="__timeline__|${t.id}"><div class="row-icon">${TIMELINE_ICONS[t.category]||"⭐"}</div><div class="row-body"><div class="row-title">${esc(t.title)}</div><div class="row-sub">${t.date?fmtDate(t.date):""}</div></div></div>`).join("");
    html += `</div>`;
  }
  out.innerHTML = html || `<div class="empty"><span class="em">🔍</span><p>No matches for "${esc(q)}"</p></div>`;
  out.querySelectorAll("[data-open]").forEach(n=>{ const [m,id]=n.dataset.open.split("|"); n.addEventListener("click", ()=>pushModule("detail", m, id)); });
  out.querySelectorAll("[data-custom-open]").forEach(n=>{ const [m]=n.dataset.customOpen.split("|"); n.addEventListener("click", ()=>pushModule("list", m, null)); });
}

/* =========================================================================
   WEEKLY REVIEW
   ========================================================================= */
async function openReview(type){
  const days = type==="monthly" ? 30 : 7;
  const start = (()=>{ const d=new Date(); d.setDate(d.getDate()-days); return d.toISOString().slice(0,10); })();
  const [tasks, expenses, income, habits, journal, goals, books, workouts, debts] = await Promise.all([
    DB.getAll("tasks"), DB.getAll("expenses"), DB.getAll("income"), DB.getAll("habits"), DB.getAll("journal"),
    DB.getAll("personalGoals"), DB.getAll("books"), DB.getAll("workouts"), DB.getAll("debts")
  ]);
  const doneTasks = tasks.filter(t=>t.done && (t.completedAt||"").slice(0,10)>=start).length;
  const spent = expenses.filter(e=>e.date>=start).reduce((s,e)=>s+Number(e.amount||0),0);
  const earned = income.filter(i=>i.date>=start).reduce((s,i)=>s+Number(i.amount||0),0);
  const journalCount = journal.filter(j=>j.date>=start).length;
  const extraStats = type==="monthly" ? `
      <div class="stat"><div class="n">${goals.filter(g=>g.status==="Completed" && (g.updatedAt||"").slice(0,10)>=start).length}</div><div class="l">goals completed</div></div>
      <div class="stat"><div class="n">${books.filter(b=>b.status==="Completed" && (b.finishDate||"")>=start).length}</div><div class="l">books finished</div></div>
      <div class="stat"><div class="n">${workouts.filter(w=>w.date>=start).length}</div><div class="l">workouts</div></div>
      <div class="stat"><div class="n">${debts.filter(d=>d.direction==="I owe them").reduce((s,d)=>s+Number(d.remaining!=null?d.remaining:d.amount||0),0)>0?"In progress":"Clear"}</div><div class="l">debt status</div></div>
  ` : `
      <div class="stat"><div class="n">${habits.length}</div><div class="l">habits tracked</div></div>
      <div class="stat"><div class="n">${fmtMoney(earned-spent)}</div><div class="l">net saved</div></div>
  `;
  openSheet(`
    <div class="sheet-title">${type==="monthly"?"Monthly":"Weekly"} review</div>
    <div class="stat-grid" style="margin:14px 0;">
      <div class="stat"><div class="n">${doneTasks}</div><div class="l">tasks done</div></div>
      <div class="stat"><div class="n">${fmtMoney(earned)}</div><div class="l">earned</div></div>
      <div class="stat"><div class="n">${fmtMoney(spent)}</div><div class="l">spent</div></div>
      <div class="stat"><div class="n">${journalCount}</div><div class="l">journal entries</div></div>
      ${extraStats}
    </div>
    <label>Wins this ${type==="monthly"?"month":"week"}</label><textarea id="wr-wins"></textarea>
    <label>Challenges</label><textarea id="wr-challenges"></textarea>
    <label>What I learned</label><textarea id="wr-learned"></textarea>
    <label>What I'll improve next ${type==="monthly"?"month":"week"}</label><textarea id="wr-improve"></textarea>
    <button class="btn" id="wr-save" style="margin-top:14px;">Save review</button>
  `);
  document.getElementById("wr-save").onclick = async ()=>{
    await DB.add("reviews", {
      id:uid(), type, date:todayStr(),
      stats:{doneTasks, spent, earned, journalCount},
      wins:document.getElementById("wr-wins").value, challenges:document.getElementById("wr-challenges").value,
      learned:document.getElementById("wr-learned").value, improve:document.getElementById("wr-improve").value
    });
    closeSheet(); toast((type==="monthly"?"Monthly":"Weekly")+" review saved");
  };
}

/* =========================================================================
   SETTINGS
   ========================================================================= */
function openBackupSheet(){
  const gdConnected = !!CONFIG.googleClientId;
  openSheet(`
    <div class="sheet-title">Backup & restore</div>
    <p style="font-size:13px; color:var(--fog); line-height:1.5;">Your data lives only in this browser/app install. Back it up regularly — clearing site data or reinstalling can erase it.</p>

    <div class="card" style="background:var(--panel-2); margin:14px 0;">
      <h2 style="font-size:14px;"><span class="em">📲</span>Moving to a new phone</h2>
      <p style="font-size:12.5px; color:var(--fog); line-height:1.6; margin:0;">
      1. Tap <b style="color:var(--paper);">Export full backup</b> below — this saves one .json file with everything: tasks, money, journal, photos, documents, all of it.<br>
      2. Get that file onto the new phone — email it to yourself, save it to a cloud drive you use, or connect via USB and copy it over.<br>
      3. Install Life OS on the new phone, open More → Backup & restore, and use <b style="color:var(--paper);">Restore from file</b> below with mode set to Replace.
      </p>
    </div>

    <button class="btn" id="bk-export">Export full backup (.json)</button>
    <label>Restore from file</label>
    <input type="file" id="bk-import" accept="application/json">
    <div class="chips" style="margin-top:10px;">
      <span class="chip active" data-mode="merge" id="mode-merge">Merge</span>
      <span class="chip" data-mode="replace" id="mode-replace">Replace all</span>
    </div>
    <p class="field-hint">Merge keeps existing records and adds/updates from the file — use this when combining data. Replace clears each store first — use this when seeding a fresh install on a new phone.</p>

    <div style="border-top:1px solid var(--line); margin-top:18px; padding-top:14px;">
      <h2 style="font-size:14px;"><span class="em">☁️</span>Google Drive</h2>
      ${gdConnected? `
        <div class="btn-row">
          <button class="btn" id="bk-gd-backup">☁️ Back up to Drive</button>
          <button class="btn ghost" id="bk-gd-restore">⬇️ Restore from Drive</button>
        </div>
        <p class="field-hint">Signs you into your own Google account each time (nothing stored on any server) and saves the same backup file to a private "Life OS" area of your Drive that only this app can see.</p>
      ` : `<p class="field-hint">Not connected on this install — ask the developer to enable one-tap Google Drive backup. Manual export/restore from a file always works below either way.</p>`}
    </div>
  `);
  let mode = "merge";
  document.getElementById("mode-merge").onclick = ()=>{ mode="merge"; document.getElementById("mode-merge").classList.add("active"); document.getElementById("mode-replace").classList.remove("active"); };
  document.getElementById("mode-replace").onclick = ()=>{ mode="replace"; document.getElementById("mode-replace").classList.add("active"); document.getElementById("mode-merge").classList.remove("active"); };
  document.getElementById("bk-export").onclick = exportBackup;
  document.getElementById("bk-import").onchange = (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async ()=>{
      try{
        const data = JSON.parse(reader.result);
        await importBackup(data, mode);
        toast("Backup restored"); closeSheet(); setTab(STATE.tab);
      }catch(err){ toast("Could not read that backup file"); }
    };
    reader.readAsText(file);
  };
  const gdB = document.getElementById("bk-gd-backup");
  if(gdB) gdB.onclick = backupToGoogleDrive;
  const gdR = document.getElementById("bk-gd-restore");
  if(gdR) gdR.onclick = openGoogleDriveRestoreSheet;
}
/* ---------- Google Drive backup (optional) ----------
   Uses Google Identity Services + the drive.file scope, which only ever
   grants access to files this app itself created — never the rest of the
   user's Drive. Needs CONFIG.googleClientId, set once in Settings. */
function loadGoogleIdentitySDK(){
  return new Promise((resolve, reject)=>{
    if(window.google && window.google.accounts) return resolve(window.google);
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = ()=> resolve(window.google);
    s.onerror = ()=> reject(new Error("Could not load Google sign-in — check your connection."));
    document.head.appendChild(s);
  });
}
function getGoogleAccessToken(){
  return new Promise(async (resolve, reject)=>{
    if(!CONFIG.googleClientId) return reject(new Error("Google Drive isn't connected on this install"));
    try{
      const google = await loadGoogleIdentitySDK();
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.googleClientId,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: (resp)=> resp.access_token? resolve(resp.access_token) : reject(new Error("Sign-in was cancelled or failed"))
      });
      client.requestAccessToken();
    }catch(e){ reject(e); }
  });
}
async function backupToGoogleDrive(){
  try{
    toast("Opening Google sign-in…");
    const token = await getGoogleAccessToken();
    const data = await buildBackupData();
    const filename = `lifeos-backup-${todayStr()}.json`;
    const boundary = "lifeos-" + uid();
    const metadata = {name:filename, mimeType:"application/json"};
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n--${boundary}--`;
    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method:"POST",
      headers:{"Authorization":"Bearer "+token, "Content-Type":`multipart/related; boundary=${boundary}`},
      body
    });
    if(!res.ok) throw new Error("Upload failed: "+res.status);
    toast("Backed up to Google Drive ✓");
  }catch(e){ console.error(e); toast("Couldn't back up to Drive — "+e.message); }
}
async function openGoogleDriveRestoreSheet(){
  try{
    toast("Opening Google sign-in…");
    const token = await getGoogleAccessToken();
    const res = await fetch("https://www.googleapis.com/drive/v3/files?q=name+contains+'lifeos-backup'&orderBy=modifiedTime+desc&fields=files(id,name,modifiedTime)", {
      headers:{"Authorization":"Bearer "+token}
    });
    const {files} = await res.json();
    if(!files || !files.length){ toast("No Life OS backups found in your Drive"); return; }
    openSheet(`
      <div class="sheet-title">⬇️ Restore from Drive</div>
      <div class="card">
        ${files.map(f=>`<div class="row" data-fid="${f.id}"><div class="row-icon">📄</div><div class="row-body"><div class="row-title">${esc(f.name)}</div><div class="row-sub">${new Date(f.modifiedTime).toLocaleString()}</div></div></div>`).join("")}
      </div>
    `);
    document.querySelectorAll("[data-fid]").forEach(row=> row.addEventListener("click", async ()=>{
      try{
        const fres = await fetch(`https://www.googleapis.com/drive/v3/files/${row.dataset.fid}?alt=media`, {headers:{"Authorization":"Bearer "+token}});
        const data = await fres.json();
        await importBackup(data, "merge");
        toast("Restored from Drive"); closeSheet(); setTab(STATE.tab);
      }catch(e){ toast("Couldn't read that backup"); }
    }));
  }catch(e){ console.error(e); toast("Couldn't reach Google Drive — "+e.message); }
}
function blobToDataURL(blob){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(blob); });
}
async function dataURLToBlob(dataUrl){
  const res = await fetch(dataUrl); return await res.blob();
}
// Stores whose records may hold a Blob, and which field name holds it.
const BLOB_FIELD_MAP = {documents:"blob", photos:"blob", profile:"photo"};
async function buildBackupData(){
  const data = {app:"lifeos", version:1, exportDate:nowISO(), stores:{}};
  let recordCount = 0;
  for(const s of STORES){
    let all = await DB.getAll(s.name);
    // Blobs can't survive JSON.stringify — inline them as data URLs.
    const field = BLOB_FIELD_MAP[s.name];
    if(field){
      all = await Promise.all(all.map(async r=>{
        if(r[field] instanceof Blob){ const dataUrl = await blobToDataURL(r[field]); return {...r, [field]:undefined, [field+"DataUrl"]:dataUrl}; }
        return r;
      }));
    }
    data.stores[s.name] = all;
    recordCount += all.length;
  }
  data.recordCount = recordCount;
  return data;
}
async function exportBackup(){
  const data = await buildBackupData();
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `lifeos-backup-${todayStr()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast(`Exported ${data.recordCount} records`);
}
async function importBackup(data, mode){
  if(!data || data.app!=="lifeos" || !data.stores){ throw new Error("Invalid backup"); }
  for(const s of STORES){
    let records = data.stores[s.name];
    if(!records) continue;
    const field = BLOB_FIELD_MAP[s.name];
    if(field){
      records = await Promise.all(records.map(async r=>{
        if(r[field+"DataUrl"]){ const blob = await dataURLToBlob(r[field+"DataUrl"]); return {...r, [field]:blob, [field+"DataUrl"]:undefined}; }
        return r;
      }));
    }
    if(mode==="replace") await DB.clear(s.name);
    for(const r of records){ await DB.put(s.name, r); }
  }
  await loadSettings();
}

/* =========================================================================
   ABOUT / ROADMAP
   ========================================================================= */
function openAboutSheet(){
  openSheet(`
    <div class="sheet-title">About Life OS</div>
    <p style="font-size:13px; color:var(--fog); line-height:1.6;">
    Your Personal Life OS. Fully offline, all data in IndexedDB on this device — no servers, no accounts, no tracking.
    </p>
    <p style="font-size:13px; color:var(--fog); line-height:1.6;">
    Live now: Dashboard with life-balance ring, age & education timeline, and body metrics, profile photo, About Me (birthday, sex, education, hobbies, fears), a local AI-free "Assistant" that answers questions from your own data (now covering diet & gym too), first-run onboarding, Tasks, Reminders with repeat, Notes, Expenses, Income, Budgets, Debts, Subscriptions, Goals (short & long-term), Habits with streaks, Journal, Mood, Gratitude, Sleep log, Cycle log, Body metrics, Diet log, Gym routines (with auto weekly reminders), Reading tracker with streaks, Fitness log, Inventory, Contacts, Friends & relationships, local Document vault, Photos, Travel planner (itinerary + expenses), Places & bucket list, Calendar with a full activity history, Life timeline, Location log (auto + manual), on-device app usage, auto-computed Achievements, Weekly & Monthly review, global search, notifications with sound & vibration (with a test button), Share app + QR code, quick add, PIN + biometric lock, light/dark theme, and full JSON backup/restore (built for moving to a new phone).
    </p>
    <p style="font-size:13px; color:var(--fog); line-height:1.6;">
    Still on the roadmap: Entertainment tracker, richer personal analytics, and a formal Reports screen.
    </p>
    <div style="border-top:1px solid var(--line); margin-top:16px; padding-top:14px;">
      <h2 style="font-size:14px;"><span class="em">👨‍💻</span>Developer</h2>
      <div class="kv"><span class="k">Name</span><span class="v">Darius Momanyi</span></div>
      <div class="kv"><span class="k">Role</span><span class="v">Founder & Developer</span></div>
      <div class="kv"><span class="k">Companies</span><span class="v">NovaDeskOnline · DMN Solutions</span></div>
      <div class="kv"><span class="k">Based in</span><span class="v">Kenya</span></div>
      ${SETTINGS.devPhone? `<div class="kv"><span class="k">Phone</span><span class="v"><a href="tel:${esc(SETTINGS.devPhone)}" style="color:var(--gold); text-decoration:none;">${esc(SETTINGS.devPhone)}</a></span></div>`:""}
      ${SETTINGS.devEmail? `<div class="kv"><span class="k">Email</span><span class="v"><a href="mailto:${esc(SETTINGS.devEmail)}" style="color:var(--gold); text-decoration:none;">${esc(SETTINGS.devEmail)}</a></span></div>`:""}
      <div class="kv"><span class="k">Site</span><span class="v"><a href="https://dmn-solution.vercel.app" target="_blank" rel="noopener" style="color:var(--gold); text-decoration:none;">dmn-solution.vercel.app</a></span></div>
      ${!SETTINGS.devPhone&&!SETTINGS.devEmail? `<p class="field-hint" style="margin-top:10px;">Add your phone/email in Settings to show them here.</p>`:""}
    </div>
    <div style="border-top:1px solid var(--line); margin-top:16px; padding-top:14px; text-align:center;">
      <p style="font-size:12px; color:var(--fog-dim); margin:0;">Version ${APP_VERSION}</p>
    </div>
  `);
}
function termsHTML(standalone){
  const wrap = standalone ? (s)=>s : (s)=>`<div class="sheet-title">Terms & Conditions</div>${s}<a href="./terms.html" target="_blank" style="display:block; margin-top:14px; font-size:12px; color:var(--gold);">Open as a standalone page →</a>`;
  return wrap(`
    <p style="font-size:12.5px; color:var(--fog); line-height:1.6;">
    Life OS is provided to you as-is, for personal, non-commercial use in organizing your own tasks, finances, goals, and personal records. There is no warranty, express or implied, that the app will be error-free, uninterrupted, or fit for any particular purpose.
    </p>
    <p style="font-size:12.5px; color:var(--fog); line-height:1.6;">
    Because all data is stored only in this browser or app install (except for the optional features described in the Privacy Policy), you are solely responsible for backing up your data (via the Backup & Restore screen). The developer is not responsible for data loss caused by clearing browser/site data, uninstalling the app, device failure, or browser storage limits.
    </p>
    <p style="font-size:12.5px; color:var(--fog); line-height:1.6;">
    The online AI Assistant and Shared goals rely on third-party services (Anthropic, Supabase) configured by whoever deployed this install, who is responsible for those accounts and any associated costs. If you use Google Drive backup, you connect your own Google account and are responsible for that account and Google's terms. Life OS itself does not charge for any of these or act as an intermediary.
    </p>
    <p style="font-size:12.5px; color:var(--fog); line-height:1.6;">
    Fitness, reading, and journaling features are for personal record-keeping only and do not constitute medical, financial, or legal advice. Consult a qualified professional for decisions in those areas.
    </p>
    <p style="font-size:12.5px; color:var(--fog); line-height:1.6;">
    You may not use this app to store or process data belonging to others without their consent, or in any way that violates applicable law. These terms may be updated as the app evolves; continued use after an update constitutes acceptance of the revised terms.
    </p>
    <p style="font-size:12px; color:var(--fog-dim); margin-top:14px;">Built by Darius — dmn-solution.vercel.app</p>
  `);
}
function openTermsSheet(){
  openSheet(termsHTML(false));
}
function privacyPolicyHTML(standalone){
  const wrap = standalone ? (s)=>s : (s)=>`<div class="sheet-title">Privacy Policy</div>${s}<a href="./privacy.html" target="_blank" style="display:block; margin-top:14px; font-size:12px; color:var(--gold);">Open as a standalone page →</a>`;
  return wrap(`
    <p style="font-size:12.5px; color:var(--fog); line-height:1.6;">
    Life OS is local-first: everything you enter — tasks, finances, journal entries, documents, contacts, and everything else — is stored only in this device's browser storage (IndexedDB). Nothing is transmitted anywhere by default.
    </p>
    <p style="font-size:12.5px; color:var(--fog); line-height:1.6;">
    <b style="color:var(--paper);">By default:</b> no account creation, no analytics, no advertising SDKs, no tracking scripts. There is no backend — Vercel or any host serving these static files only serves the app's code, never your data.
    </p>
    <p style="font-size:12.5px; color:var(--fog); line-height:1.6;">
    <b style="color:var(--paper);">Optional features that do send data, only if this install has them enabled and you turn them on in Settings:</b> the online AI Assistant (your question and a summary of your data go directly to Anthropic's API); Shared goals (goal progress and, only if you opt in, your name/photo/birthday go to a Supabase project); Google Drive backup (your backup file goes to your own Google Drive, using your own Google account you sign into). The API/service credentials for the first two are configured by whoever deployed this install, not by you — you only control whether you personally use each feature.
    </p>
    <p style="font-size:12.5px; color:var(--fog); line-height:1.6;">
    <b style="color:var(--paper);">Device features:</b> notifications, fingerprint/Face ID unlock, and contact import use your browser's built-in APIs directly — no server involved. Contact import requires your explicit selection of each contact via your phone's native picker.
    </p>
    <p style="font-size:12.5px; color:var(--fog); line-height:1.6;">
    <b style="color:var(--paper);">Backups:</b> a manually exported backup is a JSON file saved wherever you choose — entirely under your control.
    </p>
    <p style="font-size:12.5px; color:var(--fog); line-height:1.6;">
    Clearing your browser's site data, or uninstalling the app, permanently deletes this data with no way to recover it unless you've made a backup.
    </p>
    <p style="font-size:12px; color:var(--fog-dim); margin-top:14px;">Built by Darius — dmn-solution.vercel.app</p>
  `);
}
function openPrivacySheet(){
  openSheet(privacyPolicyHTML(false));
}

/* =========================================================================
   SHEET / OVERLAY HELPERS
   ========================================================================= */
function openSheet(html){
  const wasOpen = document.getElementById("overlay").classList.contains("open");
  document.getElementById("sheet-content").innerHTML = html;
  document.getElementById("overlay").classList.add("open");
  document.getElementById("sheet").classList.add("open");
  if(!wasOpen) navPush();
}
function doCloseSheet(){
  document.getElementById("overlay").classList.remove("open");
  document.getElementById("sheet").classList.remove("open");
}
function closeSheet(){ appBack(doCloseSheet); }

/* =========================================================================
   PHONE BACK-BUTTON NAVIGATION — hardware/gesture back moves within the app
   (closing sheets, stepping back through module screens, exiting search)
   instead of leaving or closing the app, until there's nothing left to undo.
   ========================================================================= */
let appNavDepth = 0;
function navPush(){
  appNavDepth++;
  history.pushState({lifeosNav:appNavDepth}, "", location.href);
}
function appBack(fallbackFn){
  if(appNavDepth>0){ history.back(); }
  else if(fallbackFn){ fallbackFn(); }
}
window.addEventListener("popstate", ()=>{
  if(appNavDepth>0) appNavDepth--;
  if(document.getElementById("overlay").classList.contains("open")){ doCloseSheet(); return; }
  if(document.getElementById("lock-screen").classList.contains("show")){ navPush(); return; }
  if(STATE.stack.length>0){ doPopModule(); return; }
  if(document.getElementById("screen-search").classList.contains("active")){ setTab(STATE.tab); return; }
  // Nothing left to undo inside the app — let the browser/OS handle it
  // (e.g. exit the app), which is the expected behavior at the root screen.
});

/* =========================================================================
   PIN LOCK
   ========================================================================= */
let pinBuffer = "";
function renderPinPad(){
  const pad = document.getElementById("pin-pad");
  pad.innerHTML = "";
  ["1","2","3","4","5","6","7","8","9","","0","⌫"].forEach(k=>{
    const b = document.createElement("button");
    b.className = "pin-key"; b.textContent = k;
    if(k==="") b.style.visibility="hidden";
    b.addEventListener("click", ()=> handlePinKey(k));
    pad.appendChild(b);
  });
}
function renderPinDots(){
  document.getElementById("pin-dots").innerHTML = [0,1,2,3].map(i=>`<div class="pin-dot ${i<pinBuffer.length?'filled':''}"></div>`).join("");
}
async function handlePinKey(k){
  if(k==="⌫"){ pinBuffer = pinBuffer.slice(0,-1); renderPinDots(); return; }
  if(k==="" || pinBuffer.length>=4) return;
  pinBuffer += k; renderPinDots();
  if(pinBuffer.length===4){
    const hash = await hashPin(pinBuffer);
    if(hash===SETTINGS.pinHash){
      if(navigator.vibrate) navigator.vibrate(30);
      document.getElementById("lock-screen").classList.remove("show");
      pinBuffer = ""; lastActive = Date.now();
    } else {
      if(navigator.vibrate) navigator.vibrate([60,40,60]);
      setTimeout(()=>{ pinBuffer=""; renderPinDots(); toast("Incorrect PIN"); }, 200);
    }
  }
}
function renderLockExtras(){
  document.getElementById("lock-fingerprint").style.display = SETTINGS.webauthnId ? "inline-flex" : "none";
}
function showLock(){
  if(!SETTINGS.pinHash) return;
  pinBuffer=""; renderPinDots();
  document.getElementById("lock-screen").classList.add("show");
  renderLockExtras();
  if(SETTINGS.webauthnId) tryBiometricUnlock(true);
}
let lastActive = Date.now();
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden){ lastActive = Date.now(); }
  else {
    const away = (Date.now()-lastActive)/60000;
    if(SETTINGS.pinHash && away >= (SETTINGS.lockTimeoutMin||2)) showLock();
  }
});
document.getElementById("lock-btn").addEventListener("click", ()=>{ if(SETTINGS.pinHash) showLock(); else toast("Set a PIN in Settings first"); });
document.getElementById("lock-forgot").addEventListener("click", ()=>{
  if(confirm("Resetting removes the PIN but keeps all your data. Continue?")){
    SETTINGS.pinHash=null; SETTINGS.webauthnId=null; DB.put("settings", SETTINGS).then(()=>{
      document.getElementById("lock-screen").classList.remove("show"); toast("PIN removed");
    });
  }
});

/* =========================================================================
   BIOMETRIC UNLOCK — WebAuthn platform authenticator (Face ID / fingerprint).
   This app has no server, so there's nothing to verify a signature against;
   a successful, unphished platform-authenticator ceremony is treated as
   proof of the device owner's biometric, which is enough for a local gate.
   ========================================================================= */
function b64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function unb64(s){ return Uint8Array.from(atob(s), c=>c.charCodeAt(0)); }
async function biometricAvailable(){
  return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
}
async function enableBiometric(){
  if(!(await biometricAvailable())){ toast("Fingerprint/Face unlock isn't available on this device/browser"); return; }
  try{
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = await navigator.credentials.create({publicKey:{
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp:{name:"Life OS"},
      user:{id:userId, name:"lifeos-local", displayName: SETTINGS.name||"Life OS"},
      pubKeyCredParams:[{type:"public-key", alg:-7},{type:"public-key", alg:-257}],
      authenticatorSelection:{authenticatorAttachment:"platform", userVerification:"required"},
      timeout:60000
    }});
    SETTINGS.webauthnId = b64(cred.rawId);
    await DB.put("settings", SETTINGS);
    renderLockExtras();
    toast("Fingerprint/Face unlock enabled");
  }catch(e){ toast("Could not set up biometric unlock"); }
}
async function tryBiometricUnlock(silent){
  if(!SETTINGS.webauthnId) return;
  try{
    await navigator.credentials.get({publicKey:{
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials:[{id:unb64(SETTINGS.webauthnId), type:"public-key"}],
      userVerification:"required", timeout:60000
    }});
    if(navigator.vibrate) navigator.vibrate(30);
    document.getElementById("lock-screen").classList.remove("show");
    lastActive = Date.now();
  }catch(e){ if(!silent) toast("Fingerprint not recognized — use your PIN"); }
}
document.getElementById("lock-fingerprint").addEventListener("click", ()=> tryBiometricUnlock(false));

/* =========================================================================
   NOTIFICATIONS — local notifications with device sound + vibration while
   the app is open. Fully offline (no push server), so this checks on a
   timer rather than waking the app from the background.
   ========================================================================= */
let notifyInterval = null;
async function enableNotifications(){
  if(!("Notification" in window)){ toast("Notifications aren't supported in this browser"); return false; }
  const perm = await Notification.requestPermission();
  if(perm!=="granted"){ toast("Notification permission not granted"); return false; }
  SETTINGS.notificationsOn = true;
  await DB.put("settings", SETTINGS);
  startNotificationEngine();
  toast("Notifications enabled");
  return true;
}
async function disableNotifications(){
  SETTINGS.notificationsOn = false;
  await DB.put("settings", SETTINGS);
  if(notifyInterval){ clearInterval(notifyInterval); notifyInterval=null; }
}
function startNotificationEngine(){
  if(notifyInterval) return;
  checkDueNotifications();
  notifyInterval = setInterval(checkDueNotifications, 60000);
}
async function fireNotification(title, body, tag, category){
  category = category || "general";
  const bypass = category==="fasting" && SETTINGS.quietHoursBypassFasting!==false;
  if(inQuietHours() && !bypass){
    return; // still visible in the bell panel (computed live from real data) — just no popup/sound right now
  }
  playCategorySound(category);
  if(navigator.vibrate) navigator.vibrate([200,100,200]);
  if(Notification.permission!=="granted") return;
  const opts = {body, tag, vibrate:[200,100,200], icon:"./icon-192.png", badge:"./icon-192.png"};
  try{
    if("serviceWorker" in navigator){
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((res)=> setTimeout(()=>res(null), 2000))
      ]);
      if(reg && reg.showNotification){ await reg.showNotification(title, opts); return; }
    }
    new Notification(title, opts);
  }catch(e){
    try{ new Notification(title, {body}); }catch(e2){ /* platform doesn't support local notifications at all (e.g. iOS Safari not installed to Home Screen) */ }
  }
}
async function checkDueNotifications(){
  if(!SETTINGS.notificationsOn) return;
  const today = todayStr();
  const [reminders, subs, docs, contacts] = await Promise.all([
    DB.getAll("reminders"), DB.getAll("subscriptions"), DB.getAll("documents"), DB.getAll("contacts")
  ]);
  const notified = SETTINGS._notifiedToday===today ? (SETTINGS._notifiedIds||[]) : [];
  const newlyNotified = [...notified];
  for(const r of reminders){
    if(!r.done && reminderOccursOn(r, today) && !notified.includes("rem-"+r.id)){
      fireNotification("Reminder", r.title, "rem-"+r.id, "general"); newlyNotified.push("rem-"+r.id);
    }
  }
  for(const s of subs){
    if(s.nextPaymentDate===today && !notified.includes("sub-"+s.id)){
      fireNotification("Payment due today", s.name+" • "+fmtMoney(s.amount), "sub-"+s.id, "money"); newlyNotified.push("sub-"+s.id);
    }
  }
  for(const d of docs){
    const days = d.expiryDate? daysUntil(d.expiryDate): null;
    if(days===30 && !notified.includes("doc-"+d.id)){
      fireNotification("Document expiring soon", d.name+" expires in 30 days", "doc-"+d.id, "general"); newlyNotified.push("doc-"+d.id);
    }
  }
  for(const c of contacts){
    if(c.birthday && c.birthday.slice(5)===today.slice(5) && !notified.includes("bday-"+c.id)){
      fireNotification("Birthday today 🎂", c.name+"'s birthday", "bday-"+c.id, "general"); newlyNotified.push("bday-"+c.id);
    }
    if(c.nextFollowUp===today && !notified.includes("fu-"+c.id)){
      fireNotification("Follow up", "Follow up with "+c.name, "fu-"+c.id, "general"); newlyNotified.push("fu-"+c.id);
    }
  }
  if(newlyNotified.length!==notified.length){
    SETTINGS._notifiedToday = today; SETTINGS._notifiedIds = newlyNotified;
    await DB.put("settings", SETTINGS);
  }
}

/* =========================================================================
   NOTIFICATION CENTER — bell icon in the top bar
   ========================================================================= */
async function gatherAlerts(){
  const today = todayStr();
  const [tasks, reminders, subs, docs, contacts] = await Promise.all([
    DB.getAll("tasks"), DB.getAll("reminders"), DB.getAll("subscriptions"), DB.getAll("documents"), DB.getAll("contacts")
  ]);
  const out = [];
  tasks.filter(t=>!t.done && t.dueDate && t.dueDate<today).forEach(t=> out.push({icon:"check", title:t.title, sub:"Overdue • "+fmtDate(t.dueDate)}));
  reminders.filter(r=>!r.done && reminderOccursOn(r, today)).forEach(r=> out.push({icon:"bell", title:r.title, sub:"Today"}));
  subs.filter(s=> s.nextPaymentDate && daysUntil(s.nextPaymentDate)!=null && daysUntil(s.nextPaymentDate)>=0 && daysUntil(s.nextPaymentDate)<=3)
    .forEach(s=> out.push({icon:"wallet", title:s.name+" payment", sub: daysUntil(s.nextPaymentDate)===0?"Due today":"Due "+fmtDate(s.nextPaymentDate)}));
  docs.filter(d=> d.expiryDate && daysUntil(d.expiryDate)!=null && daysUntil(d.expiryDate)>=0 && daysUntil(d.expiryDate)<=30)
    .forEach(d=> out.push({icon:"doc", title:d.name+" expires soon", sub:fmtDate(d.expiryDate)}));
  contacts.filter(c=> c.birthday && c.birthday.slice(5)===today.slice(5)).forEach(c=> out.push({icon:"heart", title:c.name+"'s birthday", sub:"Today"}));
  contacts.filter(c=> c.nextFollowUp===today).forEach(c=> out.push({icon:"user", title:"Follow up with "+c.name, sub:"Today"}));
  return out;
}
async function updateNotifBadge(){
  const alerts = await gatherAlerts();
  document.getElementById("notif-dot").style.display = alerts.length? "block":"none";
}
async function openNotificationsPanel(){
  const alerts = await gatherAlerts();
  openSheet(`
    <div class="sheet-title">Notifications</div>
    ${!SETTINGS.notificationsOn? `<p style="font-size:12.5px; color:var(--fog); line-height:1.5;">Device sound & vibration are off. <span id="np-enable" style="color:var(--gold); font-weight:600; cursor:pointer;">Turn on</span></p>`:""}
    <div class="card" style="margin-top:10px;">
      ${alerts.length? alerts.map(a=>`<div class="row"><div class="row-icon">${icon(a.icon,16)}</div><div class="row-body"><div class="row-title">${esc(a.title)}</div><div class="row-sub">${esc(a.sub)}</div></div></div>`).join("") : `<div class="empty">${icon("bell",26)}<p>Nothing needs your attention right now.</p></div>`}
    </div>
  `);
  const en = document.getElementById("np-enable");
  if(en) en.addEventListener("click", async ()=>{ await enableNotifications(); openNotificationsPanel(); });
}
document.getElementById("notif-btn").addEventListener("click", openNotificationsPanel);
document.getElementById("assistant-btn").addEventListener("click", ()=> pushModule("list","__assistant__",null));

/* =========================================================================
   PWA: install prompt handling + update detection (banner + dashboard card)
   ========================================================================= */
let deferredInstallPrompt = null;
let updateAvailable = false;
window.addEventListener("beforeinstallprompt", (e)=>{ e.preventDefault(); deferredInstallPrompt = e; });

function markUpdateAvailable(){
  updateAvailable = true;
  document.getElementById("update-banner").classList.add("show");
  if(STATE.tab==="home" && STATE.stack.length===0) renderHome();
}
function applyUpdate(){
  navigator.serviceWorker.getRegistration().then(reg=>{
    if(reg && reg.waiting){ reg.waiting.postMessage("SKIP_WAITING"); }
    setTimeout(()=> location.reload(), 200);
  });
}
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("./service-worker.js").then(reg=>{
      // A worker may already be waiting from a previous visit.
      if(reg.waiting && navigator.serviceWorker.controller) markUpdateAvailable();
      reg.addEventListener("updatefound", ()=>{
        const nw = reg.installing;
        nw.addEventListener("statechange", ()=>{
          if(nw.state==="installed" && navigator.serviceWorker.controller) markUpdateAvailable();
        });
      });
      // Actively check for updates — installed PWAs don't always trigger the
      // browser's own periodic check, so we ask on load, on foreground, and hourly.
      reg.update();
      setInterval(()=> reg.update(), 60*60*1000);
      document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) reg.update(); });
    }).catch(()=>{ /* offline-first: app still works fully without SW registration succeeding */ });
  });
}
document.getElementById("update-btn").addEventListener("click", applyUpdate);

/* =========================================================================
   NAV WIRING + INIT
   ========================================================================= */
document.querySelectorAll(".tab").forEach(b=> b.addEventListener("click", ()=> setTab(b.dataset.tab)));
document.getElementById("fab").addEventListener("click", openQuickAdd);
document.getElementById("search-btn").addEventListener("click", openSearch);
document.getElementById("overlay").addEventListener("click", closeSheet);
document.getElementById("sheet-close").addEventListener("click", closeSheet);

document.getElementById("theme-btn").addEventListener("click", async ()=>{
  SETTINGS.theme = SETTINGS.theme==="light" ? "dark" : "light";
  await DB.put("settings", SETTINGS);
  applyTheme();
});

/* =========================================================================
   FIRST-RUN ONBOARDING — collects the basics before you land on the app.
   ========================================================================= */
let obStep = 0;
let obData = {name:"", birthday:"", sex:"", currency:"KSh"};
const OB_STEPS = 3;
function showOnboarding(){
  obData.name = SETTINGS.name || "";
  obData.currency = SETTINGS.currency || "KSh";
  obStep = 0;
  document.getElementById("onboarding-screen").classList.add("show");
  renderOnboardingStep();
}
function renderOnboardingStep(){
  const c = document.getElementById("onboarding-content");
  const dots = `<div class="ob-dots">${Array.from({length:OB_STEPS}).map((_,i)=>`<span class="${i===obStep?'active':''}"></span>`).join("")}</div>`;

  if(obStep===0){
    c.innerHTML = `
      ${dots}
      <div style="text-align:center; margin-bottom:22px;">
        <div style="font-size:36px;">👋</div>
        <div style="font-family:var(--font-display); font-size:22px; font-weight:700; margin-top:8px;">Welcome to Life OS</div>
        <p style="font-size:13px; color:var(--fog); margin-top:6px;">Let's set up your private, offline space. This only takes a minute — and everything you enter stays on this device.</p>
      </div>
      <label>What should I call you?</label><input id="ob-name" value="${esc(obData.name)}" placeholder="Your name">
      <button class="btn" id="ob-next" style="margin-top:20px;">Continue</button>
    `;
    document.getElementById("ob-next").addEventListener("click", ()=>{
      obData.name = document.getElementById("ob-name").value.trim() || obData.name;
      obStep = 1; renderOnboardingStep();
    });
  } else if(obStep===1){
    c.innerHTML = `
      ${dots}
      <div style="text-align:center; margin-bottom:18px;">
        <div style="font-size:32px;">🧑</div>
        <div style="font-family:var(--font-display); font-size:19px; font-weight:700; margin-top:8px;">A little about you</div>
        <p style="font-size:12.5px; color:var(--fog); margin-top:6px;">Optional — skip anything you'd rather add later from your Profile.</p>
      </div>
      <label>Birthday</label><input id="ob-birthday" type="date" value="${obData.birthday}">
      <label>Sex</label>
      <select id="ob-sex">
        <option value="" ${!obData.sex?'selected':''}>Prefer not to say</option>
        <option value="Male" ${obData.sex==='Male'?'selected':''}>Male</option>
        <option value="Female" ${obData.sex==='Female'?'selected':''}>Female</option>
      </select>
      <div class="btn-row">
        <button class="btn ghost" id="ob-back">Back</button>
        <button class="btn" id="ob-next">Continue</button>
      </div>
    `;
    document.getElementById("ob-back").addEventListener("click", ()=>{ obStep=0; renderOnboardingStep(); });
    document.getElementById("ob-next").addEventListener("click", ()=>{
      obData.birthday = document.getElementById("ob-birthday").value;
      obData.sex = document.getElementById("ob-sex").value;
      obStep = 2; renderOnboardingStep();
    });
  } else {
    c.innerHTML = `
      ${dots}
      <div style="text-align:center; margin-bottom:18px;">
        <div style="font-size:32px;">💰</div>
        <div style="font-family:var(--font-display); font-size:19px; font-weight:700; margin-top:8px;">Last thing</div>
        <p style="font-size:12.5px; color:var(--fog); margin-top:6px;">What currency should Life OS use for money tracking?</p>
      </div>
      <label>Currency label</label><input id="ob-currency" value="${esc(obData.currency)}" placeholder="e.g. KSh, $, €">
      <div class="btn-row">
        <button class="btn ghost" id="ob-back">Back</button>
        <button class="btn" id="ob-finish">Get started</button>
      </div>
    `;
    document.getElementById("ob-back").addEventListener("click", ()=>{ obStep=1; renderOnboardingStep(); });
    document.getElementById("ob-finish").addEventListener("click", async ()=>{
      obData.currency = document.getElementById("ob-currency").value.trim() || "KSh";
      SETTINGS.name = obData.name; SETTINGS.currency = obData.currency; SETTINGS.onboardingComplete = true;
      await DB.put("settings", SETTINGS);
      if(obData.birthday || obData.sex){
        const p = (await DB.get("profile","main")) || {id:"main", customFacts:[]};
        if(obData.birthday) p.birthday = obData.birthday;
        if(obData.sex) p.sex = obData.sex;
        await DB.put("profile", p);
      }
      document.getElementById("onboarding-screen").classList.remove("show");
      setTab("home");
    });
  }
}

function showWhatsNew(){
  const seen = SETTINGS.lastSeenVersion;
  const newEntries = seen ? CHANGELOG.filter(c=> c.version > seen) : [];
  // First-run installs get onboarding instead of a changelog; only show this
  // when someone is updating from a version they'd actually already used.
  if(!seen || !newEntries.length) return;
  openSheet(`
    <div class="sheet-title">✨ What's new in ${APP_VERSION}</div>
    ${newEntries.map(c=>`
      <div style="margin-top:14px;">
        <div style="font-family:var(--font-mono); font-size:11px; color:var(--gold); font-weight:700; margin-bottom:6px;">v${c.version}</div>
        ${c.changes.map(ch=>`<div style="display:flex; gap:8px; margin-bottom:6px;"><span style="color:var(--sage);">✓</span><span style="font-size:13px; color:var(--paper); line-height:1.4;">${esc(ch)}</span></div>`).join("")}
      </div>
    `).join("")}
    <button class="btn" id="wn-close" style="margin-top:18px;">Got it</button>
  `);
  document.getElementById("wn-close").addEventListener("click", closeSheet);
}
async function init(){
  try{
    await DB.open();
  }catch(err){
    console.error("DB open failed:", err);
    document.body.innerHTML = `
      <div style="max-width:480px; margin:60px auto; padding:24px; font-family:system-ui; color:#EDE7DA; text-align:center;">
        <div style="font-size:40px;">⚠️</div>
        <h1 style="font-size:19px;">Life OS can't start here</h1>
        <p style="font-size:14px; line-height:1.6; color:#B8AF9E;">
          This usually means the app was opened directly from a file manager (a <code>content://</code> or <code>file://</code> link) instead of a real web address. Life OS needs to run on an actual <b>http://</b> or <b>https://</b> URL for its offline storage to work.
        </p>
        <p style="font-size:14px; line-height:1.6; color:#B8AF9E;">
          Upload the unzipped folder to a static host (e.g. Vercel, Netlify, or GitHub Pages) and open it from that https:// link — or run it locally with a tiny server instead of opening the file directly.
        </p>
      </div>`;
    return;
  }
  await loadSettings();
  applyTheme();
  if(SETTINGS.pinHash) showLock();
  renderPinPad();
  renderLockExtras();
  if(SETTINGS.notificationsOn) startNotificationEngine();
  if(CONFIG.supabaseUrl && CONFIG.supabaseKey) checkSharedGoalNotices();
  startUsageTracking();
  maybeAutoLogLocation();
  setTab("home");
  if(!SETTINGS.onboardingComplete) showOnboarding();
  else if(SETTINGS.lastSeenVersion !== APP_VERSION){
    setTimeout(showWhatsNew, 500);
  }
  SETTINGS.lastSeenVersion = APP_VERSION;
  await DB.put("settings", SETTINGS);
}
init();

