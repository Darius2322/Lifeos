/* Life OS — db.js: IndexedDB layer, versioned, generic CRUD. Everything local, nothing external. */
// Developer-only credentials live in config.js (never in Settings UI or IndexedDB).
// This falls back to an empty object if config.js is missing so the app never crashes.
const CONFIG = window.LIFEOS_CONFIG || {};
/* =========================================================================
   DATABASE LAYER — IndexedDB, versioned, generic CRUD. Everything local.
   ========================================================================= */
const APP_VERSION = "1.20.1";
const CHANGELOG = [
  {version:"1.20.1", changes:[
    "Fasting and Focus completion alerts now catch up automatically — checked every 20s and whenever you reopen the app, not just while that specific screen is open",
    "Notes redesigned — a proper card layout with a colored accent, tag pills, and a 'time ago' stamp instead of a plain list"
  ]},
  {version:"1.20.0", changes:[
    "New: Focus Mode — pick a task, choose 15/25/45/60 min (or it remembers what you type), get a countdown ring with pause/resume, a completion sound + notification, and a log of today's sessions",
    "Focus mode is reachable from Plan, Quick Add, and More → Track"
  ]},
  {version:"1.19.1", changes:[
    "Plan tab's Today section is now a real timeline — tasks and reminders due today merge into Morning/Afternoon/Evening groups, sorted by time",
    "Tasks can now optionally have a time, not just a date",
    "Completed items for today move into their own collapsed-looking section instead of just getting struck through in place"
  ]},
  {version:"1.19.0", changes:[
    "New: Quiet Hours — set a start/end window where notification popups and sounds are held back (fasting alerts can still get through if you allow it); nothing is lost, it's still in the 🔔 bell",
    "New: Reminder sounds per category — Tasks, Habits, Goals, Fasting, Money/Bills, Debts, and General reminders can each use a different tone (or none), with a Test button for each",
    "Notification bell panel icons converted from emoji to real icons"
  ]},
  {version:"1.18.0", changes:[
    "Removed all developer/backend configuration from Settings — no more Supabase URL, Supabase key, or Google Client ID fields in the app",
    "New: config.js — a separate file the developer edits directly before deploying, never shown in the app itself",
    "Settings now shows plain on/off status for Online AI, Shared goals, and Google Drive backup instead of raw credential fields",
    "Privacy Policy and Terms updated to reflect that these credentials are set by whoever deploys the app, not by the person using it"
  ]},
  {version:"1.17.1", changes:[
    "New: Learning tracker — courses, books, skills, subjects, or projects with progress, dates, and notes",
    "Grow tab now shows active learning items with a progress bar",
    "Learning added to Quick Add and More → Track"
  ]},
  {version:"1.17.0", changes:[
    "New: Fasting tracker — presets or custom hours, a live circular timer, pause/resume, history, streaks, and a completion notification, fully offline",
    "Home page now shows an active fast in Important updates",
    "Quick Add converted to icons and got a 'Start a fast' entry",
    "Home's Important updates icons converted from emoji to real icons"
  ]},
  {version:"1.16.1", changes:[
    "New: standalone terms.html page to match privacy.html, cross-linked to each other",
    "Confirmed Plan and Grow are fully on the 2-column card grid — no leftover single-column lists"
  ]},
  {version:"1.16.0", changes:[
    "Most emoji across the app are now real icons — tiles, list rows, form headers, empty states (a few dynamic spots like achievement badges are still emoji for now)",
    "Habits now show a 7-day completion trail; Plan tab shows a 'this week' progress bar",
    "More screen tile sections now have explicit scroll arrows, not just swipe",
    "New: Google Drive setup and Supabase setup shortcuts in More → Connections",
    "New: standalone privacy.html page (in addition to the in-app Privacy Policy), updated to cover the AI/Supabase/Google Drive features honestly",
    "Privacy Policy text updated — it previously said 'no backend' which is no longer fully true now that online AI, Shared goals, and Drive backup exist as opt-in features"
  ]},
  {version:"1.15.0", changes:[
    "Plan and Grow tabs now use a proper 2-column card grid that scrolls vertically, instead of a single stacked list",
    "Under the hood: the app is now split into separate files (style.css, db.js, settings.js, app.js) instead of one giant file — same offline reliability, easier to maintain and extend going forward"
  ]},
  {version:"1.14.1", changes:[
    "Tile grids (More screen, Money's Manage section) are now a proper 2-row horizontally-scrolling strip instead of a tall stacked grid — swipe sideways, like a real app's category browser"
  ]},
  {version:"1.14.0", changes:[
    "Nav bar, top bar, and FAB now use real icons instead of emoji (a full app-wide swap is a bigger follow-up — this covers what you see constantly)",
    "Plan tab redesigned — quick-glance stat row at the top, priority tasks now show a colored accent bar",
    "Grow tab redesigned — goals now show a progress ring instead of a bar, habit streaks got a proper pill badge",
    "New: sound cues for completing a task/habit and hitting a shared goal — synthesized on-device, toggle in Settings",
    "Save buttons now disable while saving so a double-tap can't create duplicate entries"
  ]},
  {version:"1.13.0", changes:[
    "Shared goals now support any kind of goal — money, fitness, health, food, or custom — not just savings",
    "Shared goals can include anyone with the code, not just a partner — see everyone's name/photo on the goal, if they've opted to share it",
    "New: opt-in notifications when a shared goal is achieved or a co-member's birthday comes up",
    "Setup SQL is now tucked into a button instead of always showing on screen",
    "New: Google Drive backup — one-tap backup/restore to your own Drive (needs a Google Client ID in Settings), alongside the existing manual file export"
  ]},
  {version:"1.12.1", changes:[
    "Fixed a blank Home screen that could happen if the app failed to start (e.g. opened directly from a file manager instead of a real web address) — it now shows a clear explanation instead of nothing",
    "Any screen that fails to load now shows an error message instead of staying blank"
  ]},
  {version:"1.12.0", changes:[
    "New: Shared goals — you and your wife can each log into your own Life OS on your own phone and save toward the same goal, with live progress if you connect a free Supabase project (setup instructions right in the app)",
    "New: Tasks list menu — filter by active/all/done/overdue, sort by due date/priority/newest, clear completed tasks in bulk"
  ]},
  {version:"1.11.0", changes:[
    "Forms redesigned again — dropdowns are now tappable icon cards, dates get Today/Tomorrow quick-chips, numbers get +/− steppers, and text fields suggest what you typed before",
    "Much less typing needed to add almost anything in the app"
  ]},
  {version:"1.10.0", changes:[
    "New: Household budget — add your wife/kids as household members, tag expenses & income with who it's for, see spending broken down per person",
    "Honest note: this is a single-device view, since the app has no backend — it can't sync live between your phone and someone else's yet"
  ]},
  {version:"1.9.0", changes:[
    "Assistant is much smarter now — it sees your full data (debts, subscriptions, sleep, mood, meals, documents) not just a summary",
    "AI actions now show a reviewable card with Confirm/Skip buttons instead of just doing things silently",
    "New action types: log an expense/income, record a debt payment, log weight, log a meal — all via chat",
    "New: Home page 'Important updates' card — overdue tasks, reminders, debts due soon, renewals, expiring documents, upcoming dates, all in one glance"
  ]},
  {version:"1.8.0", changes:[
    "Redesigned forms — every field now has its own icon, with a smoother animated entrance",
    "New: What's New screen — see exactly what changed after every update",
    "New: optional online AI mode — the Assistant can use a real Claude model when you're online and add your own API key",
    "Assistant can now take actions for you when online (e.g. add a task) — not just answer questions"
  ]},
  {version:"1.7.0", changes:[
    "Fixed the + button covering Send on the Assistant screen",
    "New: Share app — link + QR code so others can install their own copy",
    "Assistant now understands diet, gym, documents, and trips questions",
    "New: Diet log and Gym routines (saving a routine auto-creates a weekly reminder)",
    "Developer phone/email are now editable in Settings and shown in About"
  ]},
  {version:"1.6.0", changes:[
    "New: profile picture, shown on your Profile and Home greeting",
    "Fixed a notification reliability bug + added a test-notification button",
    "New: first-run onboarding for fresh installs",
    "New: local Assistant (🤖) that answers questions from your own data",
    "Visual polish: shadows, press animations, smoother transitions"
  ]},
  {version:"1.5.0", changes:[
    "New: About Me profile with age & education timeline shown on Home",
    "New: Sleep log, Cycle log, Body metrics, Location log, Photos, Friends & relationships",
    "Calendar: tap any day to edit — including moving items to a new date",
    "New: 'See everything I've ever written' full activity history"
  ]}
];
const DB_NAME = "lifeos";
const DB_VERSION = 11;
// Phase 2 adds: inventory, documents (blob vault), contacts, reading, workouts,
// travel (trips/itinerary/expenses), places/bucket list, timeline, importantDates.
// Phase 3 adds: sleep log, on-device app-usage log, location log.
// Phase 4 adds: photos.
// Phase 5 adds: relationships, menstrual cycle log, body metrics log.
// Phase 6 adds: diet/food log, gym routine plans.
// Bumping DB_VERSION triggers onupgradeneeded below, which only *adds* missing
// stores — existing data from earlier phases is untouched.
const STORES = [
  {name:"profile", key:"id"},
  {name:"settings", key:"id"},
  {name:"tasks", key:"id", indexes:["dueDate","status"]},
  {name:"reminders", key:"id", indexes:["dueDate"]},
  {name:"notes", key:"id", indexes:["updatedAt"]},
  {name:"expenses", key:"id", indexes:["date","category"]},
  {name:"income", key:"id", indexes:["date","category"]},
  {name:"budgets", key:"id", indexes:["category"]},
  {name:"debts", key:"id", indexes:["status"]},
  {name:"debtPayments", key:"id", indexes:["debtId"]},
  {name:"subscriptions", key:"id", indexes:["nextPaymentDate"]},
  {name:"personalGoals", key:"id", indexes:["status"]},
  {name:"goalMilestones", key:"id", indexes:["goalId"]},
  {name:"habits", key:"id"},
  {name:"habitCompletions", key:"id", indexes:["habitId","date"]},
  {name:"journal", key:"id", indexes:["date"]},
  {name:"gratitude", key:"id", indexes:["date"]},
  {name:"moods", key:"id", indexes:["date"]},
  {name:"reviews", key:"id", indexes:["type","date"]},
  {name:"tags", key:"id"},
  {name:"appData", key:"id"},
  {name:"inventory", key:"id", indexes:["category"]},
  {name:"documents", key:"id", indexes:["category","expiryDate"]},
  {name:"contacts", key:"id", indexes:["category"]},
  {name:"books", key:"id", indexes:["status"]},
  {name:"readingSessions", key:"id", indexes:["bookId","date"]},
  {name:"workouts", key:"id", indexes:["date","category"]},
  {name:"trips", key:"id"},
  {name:"tripItems", key:"id", indexes:["tripId","date"]},
  {name:"tripExpenses", key:"id", indexes:["tripId"]},
  {name:"places", key:"id", indexes:["status"]},
  {name:"timeline", key:"id", indexes:["date","category"]},
  {name:"importantDates", key:"id", indexes:["date"]},
  {name:"sleepLogs", key:"id", indexes:["date"]},
  {name:"appUsageLogs", key:"id", indexes:["date"]},
  {name:"locationLogs", key:"id", indexes:["date"]},
  {name:"photos", key:"id", indexes:["date"]},
  {name:"relationships", key:"id", indexes:["type"]},
  {name:"cycleLogs", key:"id", indexes:["date"]},
  {name:"bodyLogs", key:"id", indexes:["date"]},
  {name:"foodLogs", key:"id", indexes:["date","mealType"]},
  {name:"gymRoutines", key:"id"},
  {name:"householdMembers", key:"id"},
  {name:"sharedGoals", key:"id"},
  {name:"sharedGoalContributions", key:"id", indexes:["goalId"]},
  {name:"fastingSessions", key:"id", indexes:["startTime","status"]},
  {name:"learningItems", key:"id", indexes:["status"]},
  {name:"focusSessions", key:"id", indexes:["startTime","taskId"]}
];

const DB = {
  _db:null,
  open(){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e)=>{
        const db = e.target.result;
        STORES.forEach(s=>{
          if(!db.objectStoreNames.contains(s.name)){
            const store = db.createObjectStore(s.name, {keyPath:s.key});
            (s.indexes||[]).forEach(ix=> store.createIndex(ix, ix, {unique:false}));
          }
        });
      };
      req.onsuccess = ()=>{ this._db = req.result; resolve(this._db); };
      req.onerror = ()=> reject(req.error);
    });
  },
  tx(store, mode="readonly"){ return this._db.transaction(store, mode).objectStore(store); },
  add(store, obj){ return new Promise((res,rej)=>{ const r=this.tx(store,"readwrite").add(obj); r.onsuccess=()=>res(obj); r.onerror=()=>rej(r.error); }); },
  put(store, obj){ return new Promise((res,rej)=>{ const r=this.tx(store,"readwrite").put(obj); r.onsuccess=()=>res(obj); r.onerror=()=>rej(r.error); }); },
  get(store, id){ return new Promise((res,rej)=>{ const r=this.tx(store).get(id); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); },
  getAll(store){ return new Promise((res,rej)=>{ const r=this.tx(store).getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>rej(r.error); }); },
  delete(store, id){ return new Promise((res,rej)=>{ const r=this.tx(store,"readwrite").delete(id); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); },
  clear(store){ return new Promise((res,rej)=>{ const r=this.tx(store,"readwrite").clear(); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); },
  async byIndex(store, index, value){
    const all = await this.getAll(store);
    return all.filter(x=>x[index]===value);
  }
};

