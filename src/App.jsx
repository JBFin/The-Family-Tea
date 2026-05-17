import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://wbxbmhcpltvirixsnzfc.supabase.co";
const SUPABASE_ANON = "sb_publishable_558QlfM9anIYbOh1-nbr5A_rMxC9K0F";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function roomCode() { return Math.random().toString(36).slice(2,7).toUpperCase(); }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

const COLORS = ["#FF6B6B","#4ECDC4","#FFE66D","#A8E6CF","#FF8B94","#6C5CE7","#FDCB6E","#00B894","#E17055","#74B9FF","#fd79a8","#55efc4"];
const LOCAL_KEY = "fg_session";
function loadSession() { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)||"null"); } catch { return null; } }
function saveSession(s) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(s)); } catch {} }

// Balanced prompt order: cycles through types so no two same type in a row
function balancedPromptOrder(prompts) {
  const byType = {};
  prompts.forEach(p => { if (!byType[p.type]) byType[p.type] = []; byType[p.type].push(p.id); });
  Object.keys(byType).forEach(t => { byType[t] = shuffle(byType[t]); });
  const types = Object.keys(byType);
  const order = [];
  let safety = 0;
  while (order.length < prompts.length && safety < 1000) {
    safety++;
    for (const t of types) {
      if (byType[t].length > 0) order.push(byType[t].shift());
    }
  }
  return order;
}


const WHO_PROMPTS = [
  { id:1,  type:"question",   emoji:"💭", text:"What's something you believed as a kid that turned out to be completely wrong?" },
  { id:2,  type:"question",   emoji:"😬", text:"What's the most embarrassing thing that's happened to you at a family gathering?" },
  { id:3,  type:"question",   emoji:"🍽️", text:"What's a food you secretly hate but always eat to be polite?" },
  { id:4,  type:"question",   emoji:"🌙", text:"What's the weirdest dream you can remember having?" },
  { id:5,  type:"question",   emoji:"🤫", text:"What's a totally harmless secret you've never told the family?" },
  { id:6,  type:"question",   emoji:"⚡", text:"What's a strong opinion you have that most people would disagree with?" },
  { id:7,  type:"question",   emoji:"🌍", text:"If you had to move to another country tomorrow, where would you go and why?" },
  { id:8,  type:"question",   emoji:"🧠", text:"What skill do you wish you had learned earlier in life?" },
  { id:9,  type:"question",   emoji:"😂", text:"What's the funniest thing a family member has ever done — without naming them?" },
  { id:10, type:"photo",      emoji:"📸", text:"Describe what's currently on your nightstand — every single item.", responseMode:"flexible" },
  { id:11, type:"photo",      emoji:"🧊", text:"Open your fridge. Describe exactly what's on the top shelf.", responseMode:"flexible" },
  { id:12, type:"photo",      emoji:"🖥️", text:"Describe your phone's lock screen in as much detail as possible.", responseMode:"flexible" },
  { id:13, type:"drawing",    emoji:"🎨", text:"Emoji-draw a family member without naming them.", responseMode:"emoji", hasSubject:true, subjectLabel:"Who did you draw?" },
  { id:14, type:"drawing",    emoji:"🏠", text:"Emoji-draw your childhood home.", responseMode:"emoji" },
  { id:15, type:"drawing",    emoji:"🎭", text:"Describe yourself in exactly 6 words. No more, no less.", responseMode:"text" },
  { id:16, type:"ranking",    emoji:"🥇", text:"Rank these from most to least fun:", options:["Game night","Holiday dinner","Road trip","Beach day","Movie marathon"] },
  { id:17, type:"ranking",    emoji:"🧹", text:"Rank these chores from 'fine' to 'hate with a passion':", options:["Dishes","Laundry","Vacuuming","Cooking","Taking out trash"] },
  { id:18, type:"thisorthat", emoji:"🆚", text:"Early bird or Night owl?", options:["🌅 Early bird","🦉 Night owl"] },
  { id:19, type:"thisorthat", emoji:"🆚", text:"Text or Call?", options:["💬 Text","📞 Call"] },
  { id:20, type:"thisorthat", emoji:"🆚", text:"Superpower: fly or be invisible?", options:["🦅 Fly","👻 Invisible"] },
];

const WHO_TYPE_META = {
  question:   { color:"#a29bfe", bg:"rgba(162,155,254,0.1)", border:"rgba(162,155,254,0.3)", label:"💬 Question" },
  photo:      { color:"#FDCB6E", bg:"rgba(253,203,110,0.1)", border:"rgba(253,203,110,0.3)", label:"📸 Photo" },
  drawing:    { color:"#fd79a8", bg:"rgba(253,121,168,0.1)", border:"rgba(253,121,168,0.3)", label:"🎨 Drawing" },
  ranking:    { color:"#00B894", bg:"rgba(0,184,148,0.1)",   border:"rgba(0,184,148,0.3)",   label:"🥇 Rank It" },
  thisorthat: { color:"#74B9FF", bg:"rgba(116,185,255,0.1)", border:"rgba(116,185,255,0.3)", label:"🆚 This or That" },
};

const HOT_QUESTIONS = [
  { id:1,  emoji:"😴", text:"Most likely to fall asleep at any family event" },
  { id:2,  emoji:"🕐", text:"Most likely to show up 45 minutes late and blame traffic" },
  { id:3,  emoji:"🍕", text:"Most likely to eat the last slice without asking" },
  { id:4,  emoji:"🤥", text:"Most likely to tell a story that gets more dramatic every time" },
  { id:5,  emoji:"📱", text:"Most likely to be on their phone the entire family dinner" },
  { id:6,  emoji:"🎤", text:"Most likely to karaoke without being asked" },
  { id:7,  emoji:"🧂", text:"Most likely to have an opinion about how everyone else is cooking" },
  { id:8,  emoji:"😭", text:"Most likely to cry at a commercial" },
  { id:9,  emoji:"🕵️", text:"Most likely to know everyone's business but never share their own" },
  { id:10, emoji:"💸", text:"Most likely to 'forget' their wallet" },
  { id:11, emoji:"🗣️", text:"Most likely to start a sentence with 'Well actually...'" },
  { id:12, emoji:"🌶️", text:"Most likely to accidentally start drama at the holiday table" },
  { id:13, emoji:"🏆", text:"Most likely to make everything a competition" },
  { id:14, emoji:"📸", text:"Most likely to take 47 photos of their food before eating" },
  { id:15, emoji:"😤", text:"Most likely to hold a grudge about something from 10 years ago" },
];

const OPINION_STARTERS = [
  "Thanksgiving food is actually overrated.",
  "The holidays are more stressful than fun.",
  "Family group chats do more harm than good.",
  "Board games always end in someone being annoyed.",
  "Re-gifting is completely acceptable.",
  "The best part of family gatherings is leaving.",
  "Pineapple on pizza is fine, actually.",
  "Going home for holidays is overrated after 30.",
  "The person who cooks shouldn't have to clean.",
  "The family pet is the best family member.",
];

const ROAST_PROMPTS = [
  "If {name} were a car, they'd be a...",
  "The Wikipedia article about {name} would be titled...",
  "If {name} had a warning label, it would say...",
  "{name}'s supervillain name would be...",
  "A documentary about {name} would be called...",
  "If {name} were a font, they'd be...",
  "{name}'s dating app bio would say...",
  "The emoji that best represents {name} is... (explain why)",
  "If {name} were a holiday, they'd be...",
  "{name}'s theme song would be...",
  "A fortune cookie written for {name} would say...",
  "If {name} were a weather pattern, they'd be...",
];

const GAMES = [
  { id:"whoswho",  feed:"whofeed",  emoji:"🕵️", name:"Who's Who?",        desc:"Answer prompts anonymously. Others guess who said what.", color:"#a29bfe", bg:"rgba(162,155,254,0.1)", border:"rgba(162,155,254,0.25)", tag:"Async · Anytime" },
  { id:"hotseat",  feed:"hotfeed",  emoji:"🔥", name:"Hot Seat",           desc:"Vote who is 'most likely to...' Results revealed all at once.", color:"#FDCB6E", bg:"rgba(253,203,110,0.1)", border:"rgba(253,203,110,0.25)", tag:"Voting · Roast-y" },
  { id:"opinions", feed:"opfeed",   emoji:"🌶️", name:"Unpopular Opinions", desc:"Drop a spicy take. Everyone agrees or disagrees.", color:"#fd79a8", bg:"rgba(253,121,168,0.1)", border:"rgba(253,121,168,0.25)", tag:"Debate · Spicy" },
  { id:"roast",    feed:"roastfeed",emoji:"😈", name:"Roast Board",        desc:"Write anonymous roasts. Revealed one by one.", color:"#E17055", bg:"rgba(225,112,85,0.1)", border:"rgba(225,112,85,0.25)", tag:"Roast · Anonymous" },
];

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const session = loadSession();
  const [roomId, setRoomId] = useState(session?.roomId || null);
  const [myName, setMyName] = useState(session?.myName || null);
  const [screen, setScreen] = useState(session?.roomId ? "hub" : "welcome");

  // Live data from Supabase
  const [players, setPlayers] = useState([]);
  const [whoSubs, setWhoSubs] = useState([]);
  const [whoGuesses, setWhoGuesses] = useState([]);
  const [whoSkipped, setWhoSkipped] = useState([]);
  const [hotVotes, setHotVotes] = useState([]);
  const [hotRevealed, setHotRevealed] = useState([]);
  const [opinions, setOpinions] = useState([]);
  const [opinionVotes, setOpinionVotes] = useState([]);
  const [roasts, setRoasts] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [comments, setComments] = useState([]);

  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const subsRef = useRef([]);

  const notify = (msg, color="#00B894") => { setToast({msg,color}); setTimeout(()=>setToast(null),2500); };

  // Fetch all data for room
  const fetchAll = useCallback(async (rid) => {
    if (!rid) return;
    const [p,ws,wg,wsk,hv,hr,op,ov,ro,rx,cm] = await Promise.all([
      sb.from("fg_players").select("*").eq("room_id",rid),
      sb.from("fg_who_submissions").select("*").eq("room_id",rid),
      sb.from("fg_who_guesses").select("*").eq("room_id",rid),
      sb.from("fg_who_skipped").select("*").eq("room_id",rid),
      sb.from("fg_hot_votes").select("*").eq("room_id",rid),
      sb.from("fg_hot_revealed").select("*").eq("room_id",rid),
      sb.from("fg_opinions").select("*").eq("room_id",rid).order("created_at",{ascending:false}),
      sb.from("fg_opinion_votes").select("*").eq("room_id",rid),
      sb.from("fg_roasts").select("*").eq("room_id",rid),
      sb.from("fg_reactions").select("*").eq("room_id",rid),
      sb.from("fg_comments").select("*").eq("room_id",rid).order("created_at",{ascending:true}),
    ]);
    if(p.data) setPlayers(p.data);
    if(ws.data) setWhoSubs(ws.data);
    if(wg.data) setWhoGuesses(wg.data);
    if(wsk.data) setWhoSkipped(wsk.data);
    if(hv.data) setHotVotes(hv.data);
    if(hr.data) setHotRevealed(hr.data);
    if(op.data) setOpinions(op.data);
    if(ov.data) setOpinionVotes(ov.data);
    if(ro.data) setRoasts(ro.data);
    if(rx.data) setReactions(rx.data);
    if(cm.data) setComments(cm.data);
  }, []);

  // Subscribe to realtime
  useEffect(() => {
    if (!roomId) return;
    fetchAll(roomId);
    const tables = ["fg_players","fg_who_submissions","fg_who_guesses","fg_who_skipped","fg_hot_votes","fg_hot_revealed","fg_opinions","fg_opinion_votes","fg_roasts","fg_reactions","fg_comments"];
    subsRef.current.forEach(s=>s.unsubscribe());
    subsRef.current = tables.map(t =>
      sb.channel(`${t}_${roomId}`).on("postgres_changes",{event:"*",schema:"public",table:t,filter:`room_id=eq.${roomId}`},()=>fetchAll(roomId)).subscribe()
    );
    return () => { subsRef.current.forEach(s=>s.unsubscribe()); };
  }, [roomId, fetchAll]);

  const db = { players, whoSubs, whoGuesses, whoSkipped, hotVotes, hotRevealed, opinions, opinionVotes, roasts, reactions, comments };
  const myPlayer = players.find(p=>p.name===myName);

  const goTo = (s) => setScreen(s);

  const screens = {
    welcome: <Welcome roomId={roomId} myName={myName} setRoomId={setRoomId} setMyName={setMyName} setScreen={setScreen} notify={notify} setLoading={setLoading} />,
    hub: <Hub roomId={roomId} myName={myName} myPlayer={myPlayer} players={players} screen={screen} goTo={goTo} notify={notify} />,
    whoswho: <WhosWho roomId={roomId} myName={myName} players={players} db={db} notify={notify} goTo={goTo} />,
    whofeed: <WhoFeed roomId={roomId} myName={myName} players={players} db={db} notify={notify} goTo={goTo} />,
    hotseat: <HotSeat roomId={roomId} myName={myName} players={players} db={db} notify={notify} goTo={goTo} />,
    hotfeed: <HotFeed roomId={roomId} myName={myName} players={players} db={db} notify={notify} goTo={goTo} />,
    opinions: <Opinions roomId={roomId} myName={myName} players={players} db={db} notify={notify} goTo={goTo} />,
    opfeed: <OpFeed roomId={roomId} myName={myName} players={players} db={db} notify={notify} goTo={goTo} />,
    roast: <Roast roomId={roomId} myName={myName} players={players} db={db} notify={notify} goTo={goTo} />,
    roastfeed: <RoastFeed roomId={roomId} myName={myName} players={players} db={db} notify={notify} goTo={goTo} />,
    admin: <Admin roomId={roomId} myName={myName} players={players} notify={notify} goTo={goTo} fetchAll={fetchAll} />,
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0d0d12", fontFamily:"'Georgia','Times New Roman',serif", color:"white", paddingBottom:80 }}>
      <div style={{ position:"fixed", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
        <div style={{ position:"absolute", top:"-15%", left:"-10%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(108,92,231,0.12) 0%,transparent 70%)" }} />
        <div style={{ position:"absolute", bottom:"-10%", right:"-10%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(253,121,168,0.1) 0%,transparent 70%)" }} />
      </div>

      {toast && <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:toast.color, color:"#fff", padding:"10px 24px", borderRadius:30, fontSize:14, fontWeight:"bold", zIndex:9999, boxShadow:"0 8px 30px rgba(0,0,0,0.4)", animation:"slideDown 0.3s ease", whiteSpace:"nowrap" }}>{toast.msg}</div>}
      {loading && <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:9998, display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{ color:"white", fontSize:18 }}>Loading...</div></div>}

      {myName && !["welcome"].includes(screen) && (
        <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(13,13,18,0.92)", backdropFilter:"blur(12px)", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px" }}>
          <button onClick={()=>goTo("hub")} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"5px 12px", color:"rgba(255,255,255,0.5)", fontSize:12, fontFamily:"inherit" }}>🏠 Games</button>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:20, padding:"4px 10px", fontSize:11, color:"rgba(255,255,255,0.4)", letterSpacing:1 }}>{roomId}</div>
            <div style={{ width:26, height:26, borderRadius:"50%", background:myPlayer?.color||"#6C5CE7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:"bold", color:"#0d0d12" }}>{myName[0]}</div>
          </div>
        </nav>
      )}

      <div style={{ position:"relative", zIndex:1, maxWidth:480, margin:"0 auto", padding:"20px 16px" }}>
        {screens[screen] || screens.hub}
      </div>

      <style>{`
        @keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box} textarea,input{outline:none} button{cursor:pointer;border:none;font-family:inherit}
      `}</style>
    </div>
  );
}

// ─── SHARED ───────────────────────────────────────────────────────────────────
function Card({ children, style={}, onClick }) {
  return <div onClick={onClick} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:20, animation:"popIn 0.25s ease", cursor:onClick?"pointer":"default", transition:"all 0.2s", ...style }}>{children}</div>;
}
function Btn({ children, onClick, variant="primary", style={}, disabled=false }) {
  const v = {
    primary:{ background:"linear-gradient(135deg,#6C5CE7,#a29bfe)", color:"#fff", boxShadow:"0 4px 20px rgba(108,92,231,0.3)" },
    success:{ background:"linear-gradient(135deg,#00B894,#00cec9)", color:"#fff" },
    danger: { background:"linear-gradient(135deg,#e17055,#ff7675)", color:"#fff" },
    ghost:  { background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.65)" },
    reset:  { background:"rgba(255,107,107,0.12)", border:"1px solid rgba(255,107,107,0.25)", color:"#ff6b6b" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...v[variant], fontWeight:"bold", fontSize:15, padding:"13px 24px", borderRadius:30, width:"100%", opacity:disabled?0.35:1, transition:"opacity 0.2s", fontFamily:"inherit", ...style }}>{children}</button>;
}
function Badge({ type }) {
  const m = WHO_TYPE_META[type];
  return <span style={{ fontSize:11, fontWeight:"bold", letterSpacing:0.8, textTransform:"uppercase", color:m.color, background:m.bg, border:`1px solid ${m.border}`, padding:"3px 10px", borderRadius:20 }}>{m.label}</span>;
}
function RankInput({ options, value, onChange }) {
  const ranked = value ? value.split(" > ") : [];
  const remaining = options.filter(o=>!ranked.includes(o));
  const move = (item,dir) => { const a=[...ranked]; const i=a.indexOf(item); if(dir==="up"&&i>0)[a[i-1],a[i]]=[a[i],a[i-1]]; if(dir==="down"&&i<a.length-1)[a[i],a[i+1]]=[a[i+1],a[i]]; onChange(a.join(" > ")); };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", marginBottom:2 }}>Tap to add in order, arrows to reorder:</div>
      {ranked.map((item,i)=>(
        <div key={item} style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(0,184,148,0.1)", border:"1px solid rgba(0,184,148,0.25)", borderRadius:12, padding:"10px 14px" }}>
          <span style={{ color:"#00B894", fontWeight:"bold", fontSize:13, width:22 }}>#{i+1}</span>
          <span style={{ flex:1, color:"white", fontSize:14 }}>{item}</span>
          <button onClick={()=>move(item,"up")} disabled={i===0} style={{ background:"none", color:i===0?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.5)", fontSize:16, padding:"0 4px" }}>↑</button>
          <button onClick={()=>move(item,"down")} disabled={i===ranked.length-1} style={{ background:"none", color:i===ranked.length-1?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.5)", fontSize:16, padding:"0 4px" }}>↓</button>
          <button onClick={()=>onChange(ranked.filter(r=>r!==item).join(" > "))} style={{ background:"none", color:"#ff6b6b", fontSize:14, padding:"0 4px" }}>✕</button>
        </div>
      ))}
      {remaining.map(item=>(
        <button key={item} onClick={()=>onChange([...ranked,item].join(" > "))} style={{ background:"rgba(255,255,255,0.04)", border:"1px dashed rgba(255,255,255,0.15)", borderRadius:12, padding:"10px 14px", color:"rgba(255,255,255,0.5)", fontSize:14, textAlign:"left", fontFamily:"inherit" }}>+ {item}</button>
      ))}
    </div>
  );
}

// ─── WELCOME ──────────────────────────────────────────────────────────────────
function Welcome({ roomId, myName, setRoomId, setMyName, setScreen, notify, setLoading }) {
  const [tab, setTab] = useState("join"); // join | create
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const createRoom = async () => {
    if (!name.trim()) { notify("Enter your name first!","#E17055"); return; }
    setLoading(true);
    const rid = roomCode();
    await sb.from("fg_rooms").insert({ id:rid });
    const color = COLORS[0];
    await sb.from("fg_players").insert({ id:uid(), room_id:rid, name:name.trim(), color, score:0 });
    saveSession({ roomId:rid, myName:name.trim() });
    setRoomId(rid); setMyName(name.trim()); setLoading(false);
    setScreen("hub"); notify(`Room ${rid} created! 🎮`);
  };

  const joinRoom = async () => {
    if (!name.trim()) { notify("Enter your name first!","#E17055"); return; }
    if (!code.trim()) { notify("Enter a room code!","#E17055"); return; }
    setLoading(true);
    const rid = code.trim().toUpperCase();
    const { data:room } = await sb.from("fg_rooms").select("id").eq("id",rid).single();
    if (!room) { notify("Room not found!","#E17055"); setLoading(false); return; }
    const { data:existing } = await sb.from("fg_players").select("name").eq("room_id",rid).eq("name",name.trim());
    if (!existing || existing.length === 0) {
      const { data:pls } = await sb.from("fg_players").select("name").eq("room_id",rid);
      const color = COLORS[(pls?.length||0) % COLORS.length];
      await sb.from("fg_players").insert({ id:uid(), room_id:rid, name:name.trim(), color, score:0 });
    }
    saveSession({ roomId:rid, myName:name.trim() });
    setRoomId(rid); setMyName(name.trim()); setLoading(false);
    setScreen("hub"); notify(`Joined! Welcome, ${name.trim()}! 👋`);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, paddingTop:20 }}>
      <div style={{ textAlign:"center", paddingBottom:6 }}>
        <div style={{ fontSize:54, marginBottom:10 }}>🎮</div>
        <h1 style={{ margin:0, fontSize:30, letterSpacing:-0.5, background:"linear-gradient(135deg,#a29bfe,#fd79a8,#FDCB6E)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Family Game</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", margin:"6px 0 0", fontSize:13 }}>Play together from any phone</p>
      </div>

      <div style={{ display:"flex", gap:8 }}>
        {["join","create"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:"10px 0", borderRadius:20, fontSize:14, fontWeight:"bold", fontFamily:"inherit", background:tab===t?"rgba(108,92,231,0.25)":"rgba(255,255,255,0.04)", border:tab===t?"1px solid rgba(108,92,231,0.5)":"1px solid rgba(255,255,255,0.07)", color:tab===t?"#a29bfe":"rgba(255,255,255,0.35)" }}>
            {t==="join"?"Join a Room":"Create Room"}
          </button>
        ))}
      </div>

      <Card>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:12, marginBottom:6 }}>Your name</div>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="First name..." style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:14, padding:"12px 16px", color:"white", fontSize:15 }} />
          </div>
          {tab==="join" && (
            <div>
              <div style={{ color:"rgba(255,255,255,0.4)", fontSize:12, marginBottom:6 }}>Room code</div>
              <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="e.g. ABC12" maxLength={5} style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:14, padding:"12px 16px", color:"white", fontSize:20, letterSpacing:4, textTransform:"uppercase", textAlign:"center" }} />
            </div>
          )}
          <Btn onClick={tab==="create"?createRoom:joinRoom} disabled={!name.trim()||(tab==="join"&&!code.trim())}>
            {tab==="create"?"Create Room 🎮":"Join Room →"}
          </Btn>
        </div>
      </Card>

      {tab==="create" && (
        <Card style={{ padding:14, borderColor:"rgba(255,255,255,0.06)" }}>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, margin:0, lineHeight:1.6 }}>
            Create a room and share the code with your family. Everyone joins from their own phone — no app download needed!
          </p>
        </Card>
      )}
    </div>
  );
}

// ─── HUB ──────────────────────────────────────────────────────────────────────
function Hub({ roomId, myName, myPlayer, players, screen, goTo, notify }) {
  const [tap, setTap] = useState(0);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard?.writeText(roomId).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); });
    notify(`Room code copied: ${roomId} 📋`);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18, paddingTop:16 }}>
      <div style={{ textAlign:"center", paddingBottom:4 }}>
        <div style={{ fontSize:50, marginBottom:8 }}>🎮</div>
        <h1 style={{ margin:0, fontSize:28, letterSpacing:-0.5, background:"linear-gradient(135deg,#a29bfe,#fd79a8,#FDCB6E)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Family Game</h1>
        <button onClick={copyCode} style={{ marginTop:8, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:20, padding:"5px 16px", color:"rgba(255,255,255,0.6)", fontSize:13, fontFamily:"inherit" }}>
          {copied?"✓ Copied!":"Room: "}<span style={{ color:"white", fontWeight:"bold", letterSpacing:2 }}>{roomId}</span> 📋
        </button>
        <p style={{ color:"rgba(255,255,255,0.35)", margin:"6px 0 0", fontSize:12 }}>Share this code with family to join</p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {GAMES.map(g => (
          <Card key={g.id} style={{ borderColor:g.border, background:g.bg, padding:"16px 18px" }}>
            <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
              <span style={{ fontSize:30 }}>{g.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                  <span style={{ color:g.color, fontWeight:"bold", fontSize:16 }}>{g.name}</span>
                  <span style={{ fontSize:10, color:g.color, background:`${g.color}22`, border:`1px solid ${g.color}44`, padding:"2px 8px", borderRadius:20, letterSpacing:0.5 }}>{g.tag}</span>
                </div>
                <div style={{ color:"rgba(255,255,255,0.45)", fontSize:12, lineHeight:1.5 }}>{g.desc}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>goTo(g.id)} style={{ flex:2, background:`${g.color}22`, border:`1px solid ${g.color}55`, borderRadius:14, padding:"9px 0", color:g.color, fontWeight:"bold", fontSize:14, fontFamily:"inherit" }}>Play ›</button>
              <button onClick={()=>goTo(g.feed)} style={{ flex:1, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:"9px 0", color:"rgba(255,255,255,0.5)", fontSize:13, fontFamily:"inherit" }}>📣 Feed</button>
            </div>
          </Card>
        ))}
      </div>

      {players.length > 0 && (
        <Card style={{ padding:"14px 16px" }}>
          <div style={{ color:"rgba(255,255,255,0.3)", fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>{players.length} in this room</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {players.map(p => (
              <div key={p.name} style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(255,255,255,0.05)", borderRadius:20, padding:"5px 12px" }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:p.color }} />
                <span style={{ fontSize:13, color:"rgba(255,255,255,0.6)" }}>{p.name}</span>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.25)" }}>{p.score}pts</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div onClick={()=>{const n=tap+1;setTap(n);if(n>=5){goTo("admin");setTap(0);}}} style={{ textAlign:"center", color:"rgba(255,255,255,0.07)", fontSize:12, paddingTop:4, userSelect:"none" }}>● ● ●</div>
    </div>
  );
}

// ─── WHO'S WHO ────────────────────────────────────────────────────────────────
function WhosWho({ roomId, myName, players, db, notify, goTo }) {
  const [subScreen, setSubScreen] = useState("menu");
  const [activePrompt, setActivePrompt] = useState(null);
  const [answer, setAnswer] = useState("");
  const [subject, setSubject] = useState("");
  const [emojiMode, setEmojiMode] = useState(false);
  const [activeSubId, setActiveSubId] = useState(null);
  const [guessResult, setGuessResult] = useState(null);

  const promptOrder = balancedPromptOrder(WHO_PROMPTS);
  const myAnsweredIds = new Set(db.whoSubs.filter(s=>s.player_name===myName).map(s=>s.prompt_id));
  const mySkippedIds = new Set(db.whoSkipped.filter(s=>s.player_name===myName).map(s=>s.prompt_id));
  const unanswered = promptOrder.map(id=>WHO_PROMPTS.find(p=>p.id===id)).filter(p=>p&&!myAnsweredIds.has(p.id));
  const notSkipped = unanswered.filter(p=>!mySkippedIds.has(p.id));

  const visibleSubs = db.whoSubs.filter(s => {
    if (s.player_name === myName) return false;
    return myAnsweredIds.has(s.prompt_id);
  });
  const toGuess = visibleSubs.filter(s=>!db.whoGuesses.find(g=>g.guesser===myName&&g.submission_id===s.id));
  const guessedList = visibleSubs.filter(s=>db.whoGuesses.find(g=>g.guesser===myName&&g.submission_id===s.id));

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    if (activePrompt.hasSubject && !subject.trim()) return;
    await sb.from("fg_who_submissions").insert({ id:uid(), room_id:roomId, prompt_id:activePrompt.id, player_name:myName, answer:answer.trim(), subject:subject.trim()||null });
    await sb.from("fg_who_skipped").delete().eq("room_id",roomId).eq("player_name",myName).eq("prompt_id",activePrompt.id);
    setAnswer(""); setSubject(""); setActivePrompt(null); setSubScreen("menu"); notify("Locked in! 🔒");
  };

  const skipPrompt = async () => {
    const already = db.whoSkipped.find(s=>s.player_name===myName&&s.prompt_id===activePrompt.id);
    if (!already) await sb.from("fg_who_skipped").insert({ id:uid(), room_id:roomId, player_name:myName, prompt_id:activePrompt.id });
    setActivePrompt(null); setSubject(""); setSubScreen("menu"); notify("Skipped 👍");
  };

  const makeGuess = async (name) => {
    const sub = visibleSubs.find(s=>s.id===activeSubId);
    const correct = name===sub.player_name;
    await sb.from("fg_who_guesses").insert({ id:uid(), room_id:roomId, guesser:myName, submission_id:sub.id, guessed_name:name });
    if (correct) {
      const p = players.find(pl=>pl.name===myName);
      if (p) await sb.from("fg_players").update({ score: p.score+10 }).eq("room_id",roomId).eq("name",myName);
    }
    setGuessResult({ correct, real:sub.player_name, subject:sub.subject||null });
  };

  if (guessResult) return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, alignItems:"center", paddingTop:30, animation:"fadeUp 0.3s ease" }}>
      <div style={{ fontSize:60 }}>{guessResult.correct?"🎯":"😅"}</div>
      <h2 style={{ margin:0, fontSize:26, color:guessResult.correct?"#00B894":"#ff6b6b" }}>{guessResult.correct?"Got it!":"Nope!"}</h2>
      <Card style={{ width:"100%", textAlign:"center" }}>
        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginBottom:8 }}>That was...</div>
        <div style={{ fontSize:22, fontWeight:"bold" }}>{guessResult.real}</div>
        {guessResult.subject && (
          <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginBottom:4 }}>They drew...</div>
            <div style={{ fontSize:18, color:"#FDCB6E", fontWeight:"bold" }}>{guessResult.subject}</div>
          </div>
        )}
        {guessResult.correct&&<div style={{ color:"#00B894", fontSize:14, marginTop:8 }}>+10 points 🏆</div>}
      </Card>
      <Btn onClick={()=>{setGuessResult(null);setActiveSubId(null);}}>Keep Guessing →</Btn>
      <button onClick={()=>setSubScreen("menu")} style={{ background:"none", color:"rgba(255,255,255,0.3)", fontSize:13, padding:0 }}>Back to menu</button>
    </div>
  );

  if (subScreen==="guess" && activeSubId) {
    const sub = visibleSubs.find(s=>s.id===activeSubId);
    const prompt = WHO_PROMPTS.find(p=>p.id===sub?.prompt_id);
    const m = prompt?WHO_TYPE_META[prompt.type]:WHO_TYPE_META.question;
    const others = shuffle(players.filter(p=>p.name!==myName));
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"fadeUp 0.3s ease" }}>
        <button onClick={()=>setActiveSubId(null)} style={{ background:"none", color:"rgba(255,255,255,0.35)", fontSize:13, textAlign:"left", padding:0 }}>← Back</button>
        <Card style={{ borderColor:m.border, background:m.bg }}>
          <div style={{ color:"rgba(255,255,255,0.3)", fontSize:12, marginBottom:8 }}>{prompt?.emoji} {prompt?.text}</div>
          <p style={{ color:"white", fontSize:17, fontStyle:"italic", lineHeight:1.6, margin:0 }}>"{sub?.answer}"</p>
        </Card>
        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:14, textAlign:"center" }}>Who said this? 🤔</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {others.map(p=>(
            <button key={p.name} onClick={()=>makeGuess(p.name)} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:16, padding:"14px 20px", display:"flex", alignItems:"center", gap:12, color:"white", fontSize:16, fontFamily:"inherit", textAlign:"left" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:p.color, display:"flex", alignItems:"center", justifyContent:"center", color:"#0d0d12", fontWeight:"bold", flexShrink:0 }}>{p.name[0]}</div>
              {p.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (subScreen==="answer" && activePrompt) {
    const m = WHO_TYPE_META[activePrompt.type];
    const isEmoji = activePrompt.responseMode==="emoji"||(activePrompt.responseMode==="flexible"&&emojiMode);
    const isValid = answer.trim() && (!activePrompt.hasSubject || subject.trim());
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"fadeUp 0.3s ease" }}>
        <button onClick={()=>{setActivePrompt(null);setSubScreen("menu");setAnswer("");setSubject("");}} style={{ background:"none", color:"rgba(255,255,255,0.35)", fontSize:13, textAlign:"left", padding:0 }}>← Back</button>
        <Card style={{ borderColor:m.border, background:m.bg }}>
          <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12, flexWrap:"wrap" }}>
            <span style={{ fontSize:24 }}>{activePrompt.emoji}</span>
            <Badge type={activePrompt.type} />
          </div>
          <p style={{ color:"white", fontSize:16, lineHeight:1.65, margin:0 }}>{activePrompt.text}</p>
        </Card>
        <Card>
          <div style={{ color:"rgba(255,255,255,0.3)", fontSize:12, marginBottom:12 }}>Your response — completely anonymous 🔒</div>
          {activePrompt.type==="thisorthat" ? (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {activePrompt.options.map(opt=>(
                <button key={opt} onClick={()=>setAnswer(answer===opt?"":opt)} style={{ background:answer===opt?"rgba(116,185,255,0.2)":"rgba(255,255,255,0.05)", border:answer===opt?"2px solid rgba(116,185,255,0.7)":"1px solid rgba(255,255,255,0.1)", borderRadius:16, padding:"14px 20px", color:answer===opt?"#74B9FF":"rgba(255,255,255,0.8)", fontSize:17, fontWeight:answer===opt?"bold":"normal", fontFamily:"inherit", textAlign:"center" }}>{opt}</button>
              ))}
            </div>
          ) : activePrompt.type==="ranking" ? (
            <RankInput options={activePrompt.options} value={answer} onChange={setAnswer} />
          ) : (
            <>
              {activePrompt.responseMode==="flexible" && (
                <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                  {["text","emoji"].map(md=>(
                    <button key={md} onClick={()=>setEmojiMode(md==="emoji")} style={{ flex:1, padding:"7px 0", borderRadius:20, fontSize:12, fontFamily:"inherit", background:(md==="emoji"?emojiMode:!emojiMode)?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.04)", border:(md==="emoji"?emojiMode:!emojiMode)?"1px solid rgba(255,255,255,0.3)":"1px solid rgba(255,255,255,0.07)", color:(md==="emoji"?emojiMode:!emojiMode)?"white":"rgba(255,255,255,0.35)" }}>
                      {md==="text"?"✏️ Describe":"😎 Emoji art"}
                    </button>
                  ))}
                </div>
              )}
              <textarea value={answer} onChange={e=>setAnswer(e.target.value)} placeholder={isEmoji?"Express with emojis! 🎨✨":"Type your answer..."} rows={4} style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:14, color:"white", fontSize:isEmoji?22:15, resize:"none", fontFamily:"inherit", lineHeight:isEmoji?1.9:1.6, letterSpacing:isEmoji?3:0 }} />
            </>
          )}
        </Card>
        {activePrompt.hasSubject && (
          <Card style={{ borderColor:"rgba(253,203,110,0.25)", background:"rgba(253,203,110,0.07)" }}>
            <div style={{ color:"#FDCB6E", fontSize:13, fontWeight:"bold", marginBottom:8 }}>🎯 {activePrompt.subjectLabel}</div>
            <div style={{ color:"rgba(255,255,255,0.35)", fontSize:12, marginBottom:10 }}>Hidden until after others guess who drew it.</div>
            <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Type their name..." style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:12, padding:"11px 14px", color:"white", fontSize:15 }} />
          </Card>
        )}
        <Btn onClick={submitAnswer} variant="success" disabled={!isValid}>Lock It In 🔒</Btn>
        <button onClick={skipPrompt} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.25)", fontSize:13, textAlign:"center", textDecoration:"underline", textDecorationStyle:"dotted", padding:"4px 0" }}>Skip for now →</button>
      </div>
    );
  }

  const nextPrompt = notSkipped[0];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={()=>goTo("hub")} style={{ background:"none", color:"rgba(255,255,255,0.35)", fontSize:13, padding:0 }}>← Games</button>
        <h2 style={{ margin:0, fontSize:20, color:"#a29bfe", flex:1 }}>🕵️ Who's Who?</h2>
        <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>{myAnsweredIds.size} answered</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Card onClick={()=>{if(nextPrompt){setActivePrompt(nextPrompt);setSubScreen("answer");setAnswer("");setSubject("");setEmojiMode(false);}}} style={{ textAlign:"center", padding:16, borderColor:"rgba(162,155,254,0.3)", background:"rgba(162,155,254,0.08)", cursor:"pointer" }}>
          <div style={{ fontSize:28, marginBottom:6 }}>✏️</div>
          <div style={{ color:"#a29bfe", fontWeight:"bold", fontSize:14 }}>Answer</div>
          <div style={{ color:"rgba(255,255,255,0.35)", fontSize:11, marginTop:3 }}>{notSkipped.length} left</div>
        </Card>
        <Card onClick={()=>setSubScreen("guess")} style={{ textAlign:"center", padding:16, borderColor:"rgba(0,184,148,0.3)", background:"rgba(0,184,148,0.08)", cursor:"pointer" }}>
          <div style={{ fontSize:28, marginBottom:6 }}>🕵️</div>
          <div style={{ color:"#00B894", fontWeight:"bold", fontSize:14 }}>Guess</div>
          <div style={{ color:"rgba(255,255,255,0.35)", fontSize:11, marginTop:3 }}>{toGuess.length} new</div>
        </Card>
      </div>
      {subScreen==="guess" && (
        <>
          {toGuess.length===0 && guessedList.length===0 && <Card style={{ textAlign:"center", padding:24 }}><div style={{ color:"rgba(255,255,255,0.4)", fontSize:14 }}>Answer prompts to unlock others' responses!</div></Card>}
          {toGuess.map(sub=>{
            const prompt=WHO_PROMPTS.find(p=>p.id===sub.prompt_id);
            const m=prompt?WHO_TYPE_META[prompt.type]:WHO_TYPE_META.question;
            return (
              <Card key={sub.id} onClick={()=>setActiveSubId(sub.id)} style={{ cursor:"pointer", borderColor:m.border+"44" }}>
                <div style={{ color:"rgba(255,255,255,0.3)", fontSize:12, marginBottom:8 }}>{prompt?.emoji} {prompt?.text}</div>
                <div style={{ color:"white", fontSize:15, fontStyle:"italic", lineHeight:1.5 }}>"{sub.answer}"</div>
                <div style={{ marginTop:10, color:m.color, fontSize:13 }}>Tap to guess who →</div>
              </Card>
            );
          })}
          {guessedList.map(sub=>{
            const g=db.whoGuesses.find(gg=>gg.guesser===myName&&gg.submission_id===sub.id);
            const correct=g?.guessed_name===sub.player_name;
            return (
              <Card key={sub.id} style={{ padding:"12px 16px", opacity:0.6 }}>
                <div style={{ color:"rgba(255,255,255,0.6)", fontSize:13, fontStyle:"italic", marginBottom:6 }}>"{sub.answer}"</div>
                <div style={{ fontSize:12, color:correct?"#00B894":"#ff6b6b" }}>{correct?"✓":"✗"} {g?.guessed_name}{!correct&&<span style={{ color:"rgba(255,255,255,0.25)" }}> · Was: {sub.player_name}</span>}</div>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── HOT SEAT ─────────────────────────────────────────────────────────────────
function HotSeat({ roomId, myName, players, db, notify, goTo }) {
  const [activeQ, setActiveQ] = useState(null);
  const [votedFor, setVotedFor] = useState("");

  const myVoteFor = (qId) => db.hotVotes.find(v=>v.question_id===qId&&v.voter_name===myName)?.voted_for;
  const voteCount = (qId) => db.hotVotes.filter(v=>v.question_id===qId).length;
  const isRevealed = (qId) => db.hotRevealed.some(r=>r.question_id===qId);
  const getResults = (qId) => {
    const tally={};
    db.hotVotes.filter(v=>v.question_id===qId).forEach(v=>{tally[v.voted_for]=(tally[v.voted_for]||0)+1;});
    return Object.entries(tally).sort((a,b)=>b[1]-a[1]);
  };

  const submitVote = async (qId) => {
    if (!votedFor) return;
    const existing = db.hotVotes.find(v=>v.question_id===qId&&v.voter_name===myName);
    if (existing) await sb.from("fg_hot_votes").update({ voted_for:votedFor }).eq("id",existing.id);
    else await sb.from("fg_hot_votes").insert({ id:uid(), room_id:roomId, question_id:qId, voter_name:myName, voted_for:votedFor });
    setVotedFor(""); setActiveQ(null); notify("Vote cast! 🗳️");
  };

  const revealVotes = async (qId) => {
    if (!isRevealed(qId)) await sb.from("fg_hot_revealed").insert({ id:uid(), room_id:roomId, question_id:qId });
  };

  if (activeQ) {
    const q = HOT_QUESTIONS.find(q=>q.id===activeQ);
    const myVote=myVoteFor(activeQ), votes=voteCount(activeQ), revealed=isRevealed(activeQ);
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"fadeUp 0.3s ease" }}>
        <button onClick={()=>{setActiveQ(null);setVotedFor("");}} style={{ background:"none", color:"rgba(255,255,255,0.35)", fontSize:13, textAlign:"left", padding:0 }}>← Back</button>
        <Card style={{ borderColor:"rgba(253,203,110,0.3)", background:"rgba(253,203,110,0.08)" }}>
          <div style={{ fontSize:32, marginBottom:10 }}>{q.emoji}</div>
          <p style={{ color:"white", fontSize:18, lineHeight:1.6, margin:0, fontWeight:"bold" }}>{q.text}</p>
        </Card>
        {myVote ? (
          <Card style={{ textAlign:"center", padding:20 }}>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginBottom:6 }}>You voted for</div>
            <div style={{ fontSize:22, fontWeight:"bold", color:"#FDCB6E" }}>{myVote}</div>
            <div style={{ color:"rgba(255,255,255,0.3)", fontSize:12, marginTop:8 }}>{votes}/{players.length} voted</div>
          </Card>
        ) : (
          <>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:14, textAlign:"center" }}>Who is it? Be honest 😏</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {shuffle([...players]).map(p=>(
                <button key={p.name} onClick={()=>setVotedFor(votedFor===p.name?"":p.name)} style={{ background:votedFor===p.name?"rgba(253,203,110,0.2)":"rgba(255,255,255,0.04)", border:votedFor===p.name?"2px solid rgba(253,203,110,0.7)":"1px solid rgba(255,255,255,0.09)", borderRadius:16, padding:"14px 20px", display:"flex", alignItems:"center", gap:12, color:votedFor===p.name?"#FDCB6E":"white", fontSize:16, fontFamily:"inherit", textAlign:"left" }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:p.color, display:"flex", alignItems:"center", justifyContent:"center", color:"#0d0d12", fontWeight:"bold", flexShrink:0 }}>{p.name[0]}</div>
                  {p.name}
                </button>
              ))}
            </div>
            <Btn onClick={()=>submitVote(activeQ)} disabled={!votedFor} variant="success">Cast Vote 🗳️</Btn>
          </>
        )}
        {revealed && (
          <Card style={{ borderColor:"rgba(253,203,110,0.3)" }}>
            <div style={{ color:"#FDCB6E", fontWeight:"bold", fontSize:15, marginBottom:12 }}>🔥 Results</div>
            {getResults(activeQ).map(([name,count])=>(
              <div key={name} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:players.find(p=>p.name===name)?.color||"#fff" }} />
                <span style={{ flex:1, color:"white", fontSize:15 }}>{name}</span>
                <div style={{ display:"flex", gap:3 }}>{Array.from({length:count}).map((_,j)=><span key={j} style={{ fontSize:12 }}>🔥</span>)}</div>
                <span style={{ color:"rgba(255,255,255,0.4)", fontSize:13 }}>{count}</span>
              </div>
            ))}
          </Card>
        )}
        {!revealed && votes > 0 && <Btn onClick={()=>revealVotes(activeQ)} variant="danger">🔥 Reveal ({votes}/{players.length} voted)</Btn>}
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={()=>goTo("hub")} style={{ background:"none", color:"rgba(255,255,255,0.35)", fontSize:13, padding:0 }}>← Games</button>
        <h2 style={{ margin:0, fontSize:20, color:"#FDCB6E", flex:1 }}>🔥 Hot Seat</h2>
      </div>
      <Card style={{ background:"rgba(253,203,110,0.06)", borderColor:"rgba(253,203,110,0.2)", padding:14 }}>
        <p style={{ color:"rgba(255,255,255,0.55)", fontSize:13, margin:0, lineHeight:1.6 }}>Vote anonymously. Results stay hidden until someone hits Reveal. 😏</p>
      </Card>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {HOT_QUESTIONS.map(q=>{
          const myVote=myVoteFor(q.id), votes=voteCount(q.id), revealed=isRevealed(q.id);
          const winner=revealed?getResults(q.id)[0]:null;
          return (
            <Card key={q.id} onClick={()=>setActiveQ(q.id)} style={{ cursor:"pointer", padding:16, borderColor:myVote?"rgba(253,203,110,0.25)":"rgba(255,255,255,0.07)" }}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{q.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ color:"white", fontSize:14, lineHeight:1.5, marginBottom:6 }}>{q.text}</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {myVote&&<span style={{ fontSize:11, color:"#FDCB6E", background:"rgba(253,203,110,0.1)", padding:"2px 8px", borderRadius:20 }}>✓ Voted</span>}
                    {votes>0&&<span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.05)", padding:"2px 8px", borderRadius:20 }}>{votes}/{players.length}</span>}
                    {revealed&&winner&&<span style={{ fontSize:11, color:"#ff6b6b", background:"rgba(255,107,107,0.1)", padding:"2px 8px", borderRadius:20 }}>🔥 {winner[0]}</span>}
                  </div>
                </div>
                <span style={{ color:"rgba(255,255,255,0.2)", fontSize:18 }}>›</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── OPINIONS ─────────────────────────────────────────────────────────────────
function Opinions({ roomId, myName, players, db, notify, goTo }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitOpinion = async () => {
    if (!text.trim()) return;
    await sb.from("fg_opinions").insert({ id:uid(), room_id:roomId, author:myName, text:text.trim() });
    setText(""); setSubmitting(false); notify("Opinion dropped! 🌶️");
  };

  const vote = async (opId, type) => {
    const existing = db.opinionVotes.find(v=>v.opinion_id===opId&&v.voter_name===myName);
    if (existing) {
      if (existing.vote_type===type) await sb.from("fg_opinion_votes").delete().eq("id",existing.id);
      else await sb.from("fg_opinion_votes").update({ vote_type:type }).eq("id",existing.id);
    } else {
      await sb.from("fg_opinion_votes").insert({ id:uid(), room_id:roomId, opinion_id:opId, voter_name:myName, vote_type:type });
    }
  };

  const getVotes = (opId, type) => db.opinionVotes.filter(v=>v.opinion_id===opId&&v.vote_type===type).length;
  const myVote = (opId) => db.opinionVotes.find(v=>v.opinion_id===opId&&v.voter_name===myName)?.vote_type;

  if (submitting) return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"fadeUp 0.3s ease" }}>
      <button onClick={()=>setSubmitting(false)} style={{ background:"none", color:"rgba(255,255,255,0.35)", fontSize:13, textAlign:"left", padding:0 }}>← Back</button>
      <Card style={{ borderColor:"rgba(253,121,168,0.3)", background:"rgba(253,121,168,0.08)" }}>
        <div style={{ color:"#fd79a8", fontWeight:"bold", fontSize:15, marginBottom:8 }}>🌶️ Drop a Take</div>
        <p style={{ color:"rgba(255,255,255,0.55)", fontSize:13, margin:0 }}>Something spicy the family might not agree with.</p>
      </Card>
      <div>
        <div style={{ color:"rgba(255,255,255,0.3)", fontSize:11, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Start with a prompt:</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {shuffle(OPINION_STARTERS).slice(0,5).map(s=>(
            <button key={s} onClick={()=>setText(s)} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:"6px 12px", color:"rgba(255,255,255,0.5)", fontSize:12, fontFamily:"inherit" }}>{s.slice(0,28)}…</button>
          ))}
        </div>
      </div>
      <Card>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Type your unpopular opinion..." rows={4} style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:14, color:"white", fontSize:15, resize:"none", fontFamily:"inherit", lineHeight:1.6 }} />
      </Card>
      <Btn onClick={submitOpinion} disabled={!text.trim()} variant="danger">Drop the Take 🌶️</Btn>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={()=>goTo("hub")} style={{ background:"none", color:"rgba(255,255,255,0.35)", fontSize:13, padding:0 }}>← Games</button>
        <h2 style={{ margin:0, fontSize:20, color:"#fd79a8", flex:1 }}>🌶️ Opinions</h2>
      </div>
      <Btn onClick={()=>setSubmitting(true)} variant="danger" style={{ background:"linear-gradient(135deg,#fd79a8,#e84393)" }}>+ Drop a Take</Btn>
      {db.opinions.length===0 && <Card style={{ textAlign:"center", padding:28 }}><div style={{ fontSize:32, marginBottom:10 }}>🌶️</div><div style={{ color:"rgba(255,255,255,0.4)", fontSize:14 }}>No takes yet. Be the first.</div></Card>}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {db.opinions.map(op=>{
          const agrees=getVotes(op.id,"agree"), disagrees=getVotes(op.id,"disagree"), total=agrees+disagrees;
          const agreeP=total>0?Math.round(agrees/total*100):50;
          const mv=myVote(op.id), own=op.author===myName;
          return (
            <Card key={op.id} style={{ borderColor:own?"rgba(253,121,168,0.2)":"rgba(255,255,255,0.08)" }}>
              {own&&<div style={{ fontSize:11, color:"#fd79a8", marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>Your take</div>}
              <p style={{ color:"white", fontSize:15, lineHeight:1.6, margin:"0 0 14px" }}>{op.text}</p>
              {total>0&&(
                <div style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"rgba(255,255,255,0.4)", marginBottom:4 }}>
                    <span>✅ {agrees}</span><span>{disagrees} ❌</span>
                  </div>
                  <div style={{ height:6, borderRadius:3, background:"rgba(255,107,107,0.3)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${agreeP}%`, background:"linear-gradient(90deg,#00B894,#55efc4)", borderRadius:3, transition:"width 0.4s" }} />
                  </div>
                </div>
              )}
              {!own&&(
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>vote(op.id,"agree")} style={{ flex:1, padding:"10px 0", borderRadius:14, fontFamily:"inherit", fontSize:14, background:mv==="agree"?"rgba(0,184,148,0.25)":"rgba(255,255,255,0.05)", border:mv==="agree"?"2px solid rgba(0,184,148,0.6)":"1px solid rgba(255,255,255,0.1)", color:mv==="agree"?"#00B894":"rgba(255,255,255,0.6)", fontWeight:mv==="agree"?"bold":"normal" }}>✅ Agree</button>
                  <button onClick={()=>vote(op.id,"disagree")} style={{ flex:1, padding:"10px 0", borderRadius:14, fontFamily:"inherit", fontSize:14, background:mv==="disagree"?"rgba(255,107,107,0.25)":"rgba(255,255,255,0.05)", border:mv==="disagree"?"2px solid rgba(255,107,107,0.6)":"1px solid rgba(255,255,255,0.1)", color:mv==="disagree"?"#ff6b6b":"rgba(255,255,255,0.6)", fontWeight:mv==="disagree"?"bold":"normal" }}>❌ Disagree</button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── ROAST ────────────────────────────────────────────────────────────────────
function Roast({ roomId, myName, players, db, notify, goTo }) {
  const [target, setTarget] = useState(null);
  const [promptIdx, setPromptIdx] = useState(0);
  const [roastText, setRoastText] = useState("");
  const [viewing, setViewing] = useState(null);

  const allFor = (name) => db.roasts.filter(r=>r.target_name===name);
  const myRoastFor = (name) => db.roasts.find(r=>r.target_name===name&&r.author===myName);
  const others = players.filter(p=>p.name!==myName);

  const submitRoast = async () => {
    if (!roastText.trim()||!target) return;
    const prompt = ROAST_PROMPTS[promptIdx].replace("{name}",target);
    await sb.from("fg_roasts").insert({ id:uid(), room_id:roomId, target_name:target, author:myName, prompt, text:roastText.trim(), revealed:false });
    setRoastText(""); setTarget(null); notify("Roast submitted 😈");
  };

  const revealRoast = async (id) => {
    await sb.from("fg_roasts").update({ revealed:true }).eq("id",id);
  };

  if (target) {
    const prompt = ROAST_PROMPTS[promptIdx].replace("{name}",target);
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"fadeUp 0.3s ease" }}>
        <button onClick={()=>{setTarget(null);setRoastText("");}} style={{ background:"none", color:"rgba(255,255,255,0.35)", fontSize:13, textAlign:"left", padding:0 }}>← Back</button>
        <Card style={{ borderColor:"rgba(225,112,85,0.3)", background:"rgba(225,112,85,0.08)" }}>
          <div style={{ fontSize:11, color:"#E17055", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>😈 Roasting {target}</div>
          <p style={{ color:"white", fontSize:17, lineHeight:1.6, margin:0, fontWeight:"bold" }}>{prompt}</p>
        </Card>
        <button onClick={()=>setPromptIdx((promptIdx+1)%ROAST_PROMPTS.length)} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:"8px 16px", color:"rgba(255,255,255,0.5)", fontSize:13, fontFamily:"inherit" }}>🔀 Different prompt</button>
        <Card>
          <textarea value={roastText} onChange={e=>setRoastText(e.target.value)} placeholder="Make it funny, not mean 😈" rows={4} style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:14, color:"white", fontSize:15, resize:"none", fontFamily:"inherit", lineHeight:1.6 }} />
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.2)", marginTop:8 }}>🔒 Anonymous until revealed</div>
        </Card>
        <Btn onClick={submitRoast} disabled={!roastText.trim()} variant="danger">Submit Roast 😈</Btn>
      </div>
    );
  }

  if (viewing) {
    const roasts = allFor(viewing);
    const vp = players.find(p=>p.name===viewing);
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14, animation:"fadeUp 0.3s ease" }}>
        <button onClick={()=>setViewing(null)} style={{ background:"none", color:"rgba(255,255,255,0.35)", fontSize:13, textAlign:"left", padding:0 }}>← Back</button>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:"50%", background:vp?.color||"#E17055", display:"flex", alignItems:"center", justifyContent:"center", color:"#0d0d12", fontWeight:"bold", fontSize:20 }}>{viewing[0]}</div>
          <div><div style={{ fontWeight:"bold", fontSize:18 }}>{viewing}</div><div style={{ color:"rgba(255,255,255,0.35)", fontSize:13 }}>{roasts.length} roast{roasts.length!==1?"s":""}</div></div>
        </div>
        {roasts.length===0&&<Card style={{ textAlign:"center", padding:24 }}><div style={{ color:"rgba(255,255,255,0.35)", fontSize:14 }}>No roasts yet!</div></Card>}
        {roasts.map((r,i)=>(
          <Card key={r.id} style={{ borderColor:"rgba(225,112,85,0.2)" }}>
            <div style={{ color:"rgba(255,255,255,0.3)", fontSize:12, marginBottom:8 }}>{r.prompt}</div>
            {r.revealed ? (
              <><p style={{ color:"white", fontSize:15, fontStyle:"italic", lineHeight:1.6, margin:"0 0 8px" }}>"{r.text}"</p><div style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>— {r.author}</div></>
            ) : (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ color:"rgba(255,255,255,0.25)", fontSize:14, fontStyle:"italic" }}>Hidden...</span>
                <button onClick={()=>revealRoast(r.id)} style={{ background:"linear-gradient(135deg,#e17055,#ff7675)", color:"white", borderRadius:20, padding:"7px 16px", fontSize:13, fontWeight:"bold", fontFamily:"inherit" }}>Reveal 🔥</button>
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={()=>goTo("hub")} style={{ background:"none", color:"rgba(255,255,255,0.35)", fontSize:13, padding:0 }}>← Games</button>
        <h2 style={{ margin:0, fontSize:20, color:"#E17055", flex:1 }}>😈 Roast Board</h2>
      </div>
      <Card style={{ background:"rgba(225,112,85,0.07)", borderColor:"rgba(225,112,85,0.2)", padding:14 }}>
        <p style={{ color:"rgba(255,255,255,0.55)", fontSize:13, margin:0, lineHeight:1.6 }}>Write anonymous roasts. They stay hidden until someone hits Reveal. Keep it playful! 😈</p>
      </Card>
      {others.length===0&&<Card style={{ textAlign:"center", padding:24 }}><div style={{ color:"rgba(255,255,255,0.35)", fontSize:14 }}>More players needed to roast someone!</div></Card>}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {others.map(p=>{
          const roasts=allFor(p.name), myRoast=myRoastFor(p.name);
          return (
            <Card key={p.name} style={{ padding:16, borderColor:myRoast?"rgba(225,112,85,0.3)":"rgba(255,255,255,0.07)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:p.color, display:"flex", alignItems:"center", justifyContent:"center", color:"#0d0d12", fontWeight:"bold", fontSize:18 }}>{p.name[0]}</div>
                <div style={{ flex:1 }}><div style={{ fontWeight:"bold", fontSize:16 }}>{p.name}</div><div style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>{roasts.length} roast{roasts.length!==1?"s":""}</div></div>
                {myRoast&&<span style={{ fontSize:11, color:"#E17055", background:"rgba(225,112,85,0.1)", padding:"3px 10px", borderRadius:20 }}>✓ Roasted</span>}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>{setTarget(p.name);setPromptIdx(Math.floor(Math.random()*ROAST_PROMPTS.length));setRoastText("");}} style={{ flex:1, background:"rgba(225,112,85,0.15)", border:"1px solid rgba(225,112,85,0.3)", borderRadius:14, padding:"10px 0", color:"#E17055", fontSize:14, fontWeight:"bold", fontFamily:"inherit" }}>😈 Roast</button>
                {roasts.length>0&&<button onClick={()=>setViewing(p.name)} style={{ flex:1, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:"10px 0", color:"rgba(255,255,255,0.55)", fontSize:14, fontFamily:"inherit" }}>🔥 View ({roasts.length})</button>}
              </div>
            </Card>
          );
        })}
      </div>
      {allFor(myName).length>0&&(
        <button onClick={()=>setViewing(myName)} style={{ background:"rgba(255,255,255,0.04)", border:"1px dashed rgba(255,255,255,0.15)", borderRadius:16, padding:14, color:"rgba(255,255,255,0.4)", fontSize:14, fontFamily:"inherit", textAlign:"center" }}>
          👀 See your own roasts ({allFor(myName).length})
        </button>
      )}
    </div>
  );
}

// ─── SHARED SOCIAL: REACTIONS + COMMENTS ─────────────────────────────────────
const REACTION_EMOJIS = ["😂","❤️","😮","🔥","💀","👏"];

function ReactionsBar({ itemId, itemType, roomId, myName, reactions }) {
  const myReaction = reactions.find(r=>r.item_id===itemId&&r.player_name===myName)?.emoji;

  const toggleReaction = async (emoji) => {
    const existing = reactions.find(r=>r.item_id===itemId&&r.player_name===myName);
    if (existing) {
      if (existing.emoji === emoji) await sb.from("fg_reactions").delete().eq("id",existing.id);
      else await sb.from("fg_reactions").update({ emoji }).eq("id",existing.id);
    } else {
      await sb.from("fg_reactions").insert({ id:uid(), room_id:roomId, item_id:itemId, item_type:itemType, player_name:myName, emoji });
    }
  };

  const counts = {};
  reactions.filter(r=>r.item_id===itemId).forEach(r=>{ counts[r.emoji]=(counts[r.emoji]||0)+1; });

  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:10 }}>
      {REACTION_EMOJIS.map(e=>{
        const count = counts[e]||0;
        const mine = myReaction===e;
        return (
          <button key={e} onClick={()=>toggleReaction(e)} style={{ background:mine?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.05)", border:mine?"1px solid rgba(255,255,255,0.35)":"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"4px 10px", fontSize:14, display:"flex", alignItems:"center", gap:4, fontFamily:"inherit" }}>
            <span>{e}</span>
            {count>0&&<span style={{ color:"rgba(255,255,255,0.6)", fontSize:12 }}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function CommentsSection({ itemId, roomId, myName, players, comments }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const itemComments = comments.filter(c=>c.item_id===itemId);

  const postComment = async () => {
    if (!text.trim()) return;
    await sb.from("fg_comments").insert({ id:uid(), room_id:roomId, item_id:itemId, player_name:myName, text:text.trim() });
    setText("");
  };

  const player = (name) => players.find(p=>p.name===name);

  return (
    <div style={{ marginTop:10, borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:10 }}>
      <button onClick={()=>setOpen(!open)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.35)", fontSize:13, padding:0, fontFamily:"inherit" }}>
        💬 {itemComments.length > 0 ? `${itemComments.length} comment${itemComments.length!==1?"s":""}` : "Add a comment"} {open?"▲":"▼"}
      </button>
      {open && (
        <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:8 }}>
          {itemComments.map(c=>(
            <div key={c.id} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
              <div style={{ width:26, height:26, borderRadius:"50%", background:player(c.player_name)?.color||"#6C5CE7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:"bold", color:"#0d0d12", flexShrink:0 }}>{c.player_name[0]}</div>
              <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:12, padding:"8px 12px", flex:1 }}>
                <span style={{ color:"rgba(255,255,255,0.5)", fontSize:11, marginRight:6 }}>{c.player_name}</span>
                <span style={{ color:"white", fontSize:14 }}>{c.text}</span>
              </div>
            </div>
          ))}
          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&postComment()} placeholder="Say something..." style={{ flex:1, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:20, padding:"8px 14px", color:"white", fontSize:14 }} />
            <button onClick={postComment} style={{ background:"linear-gradient(135deg,#6C5CE7,#a29bfe)", color:"white", borderRadius:20, padding:"8px 14px", fontWeight:"bold", fontSize:14 }}>→</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WHO FEED ─────────────────────────────────────────────────────────────────
function WhoFeed({ roomId, myName, players, db, notify, goTo }) {
  // Show all submissions. If guessed by me, show who it was. Otherwise masked.
  const getPrompt = (pid) => WHO_PROMPTS.find(p=>p.id===pid);
  const myGuess = (subId) => db.whoGuesses.find(g=>g.guesser===myName&&g.submission_id===subId);
  const allGuessCount = (subId) => db.whoGuesses.filter(g=>g.submission_id===subId).length;
  const sortedSubs = [...db.whoSubs].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={()=>goTo("hub")} style={{ background:"none", color:"rgba(255,255,255,0.35)", fontSize:13, padding:0 }}>← Games</button>
        <h2 style={{ margin:0, fontSize:20, color:"#a29bfe", flex:1 }}>🕵️ Who's Who — Feed</h2>
      </div>
      {sortedSubs.length===0&&<Card style={{ textAlign:"center", padding:28 }}><div style={{ fontSize:32, marginBottom:8 }}>🕵️</div><div style={{ color:"rgba(255,255,255,0.4)", fontSize:14 }}>No answers yet! Be the first.</div></Card>}
      {sortedSubs.map(sub=>{
        const prompt = getPrompt(sub.prompt_id);
        const m = prompt?WHO_TYPE_META[prompt.type]:WHO_TYPE_META.question;
        const guess = myGuess(sub.id);
        const revealed = !!guess;
        const isMe = sub.player_name===myName;
        const guessCount = allGuessCount(sub.id);
        return (
          <Card key={sub.id} style={{ borderColor:m.border+"55" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{ fontSize:11, fontWeight:"bold", letterSpacing:0.8, textTransform:"uppercase", color:m.color, background:m.bg, border:`1px solid ${m.border}`, padding:"3px 10px", borderRadius:20 }}>{m.label}</span>
              {guessCount>0&&<span style={{ fontSize:11, color:"rgba(255,255,255,0.25)" }}>{guessCount} guess{guessCount!==1?"es":""}</span>}
            </div>
            <div style={{ color:"rgba(255,255,255,0.3)", fontSize:12, marginBottom:8 }}>{prompt?.emoji} {prompt?.text}</div>
            <p style={{ color:"white", fontSize:15, fontStyle:sub.answer.length<40?"italic":"normal", lineHeight:1.6, margin:"0 0 6px" }}>
              {sub.answer.length > 4 ? `"${sub.answer}"` : sub.answer}
            </p>
            {sub.subject&&revealed&&<div style={{ color:"#FDCB6E", fontSize:13, marginBottom:4 }}>Drew: {sub.subject}</div>}
            <div style={{ fontSize:13, marginTop:6 }}>
              {isMe ? <span style={{ color:"rgba(255,255,255,0.3)" }}>← Your answer</span>
              : revealed ? <span style={{ color:"#00B894" }}>✓ {guess.guessed_name===sub.player_name?"You got it! ":"Wrong — "}<strong>{sub.player_name}</strong></span>
              : <button onClick={()=>goTo("whoswho")} style={{ background:"none", border:"none", color:"#a29bfe", fontSize:13, padding:0, fontFamily:"inherit", textDecoration:"underline" }}>Guess who →</button>}
            </div>
            <ReactionsBar itemId={sub.id} itemType="who_sub" roomId={roomId} myName={myName} reactions={db.reactions} />
            <CommentsSection itemId={sub.id} roomId={roomId} myName={myName} players={players} comments={db.comments} />
          </Card>
        );
      })}
    </div>
  );
}

// ─── HOT FEED ─────────────────────────────────────────────────────────────────
function HotFeed({ roomId, myName, players, db, notify, goTo }) {
  const getResults = (qId) => {
    const tally={};
    db.hotVotes.filter(v=>v.question_id===qId).forEach(v=>{tally[v.voted_for]=(tally[v.voted_for]||0)+1;});
    return Object.entries(tally).sort((a,b)=>b[1]-a[1]);
  };
  const revealedQs = HOT_QUESTIONS.filter(q=>db.hotRevealed.some(r=>r.question_id===q.id));
  const pendingQs = HOT_QUESTIONS.filter(q=>!db.hotRevealed.some(r=>r.question_id===q.id)&&db.hotVotes.some(v=>v.question_id===q.id));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={()=>goTo("hub")} style={{ background:"none", color:"rgba(255,255,255,0.35)", fontSize:13, padding:0 }}>← Games</button>
        <h2 style={{ margin:0, fontSize:20, color:"#FDCB6E", flex:1 }}>🔥 Hot Seat — Feed</h2>
      </div>
      {revealedQs.length===0&&pendingQs.length===0&&<Card style={{ textAlign:"center", padding:28 }}><div style={{ fontSize:32, marginBottom:8 }}>🔥</div><div style={{ color:"rgba(255,255,255,0.4)", fontSize:14 }}>No results revealed yet!</div></Card>}
      {pendingQs.length>0&&(
        <Card style={{ background:"rgba(253,203,110,0.06)", borderColor:"rgba(253,203,110,0.2)", padding:14 }}>
          <div style={{ color:"#FDCB6E", fontSize:13 }}>⏳ {pendingQs.length} question{pendingQs.length!==1?"s":""} waiting to be revealed</div>
        </Card>
      )}
      {revealedQs.map(q=>{
        const results=getResults(q.id);
        const winner=results[0];
        const totalVotes=db.hotVotes.filter(v=>v.question_id===q.id).length;
        return (
          <Card key={q.id} style={{ borderColor:"rgba(253,203,110,0.2)" }}>
            <div style={{ display:"flex", gap:10, marginBottom:12 }}>
              <span style={{ fontSize:22 }}>{q.emoji}</span>
              <div style={{ color:"white", fontSize:14, lineHeight:1.5 }}>{q.text}</div>
            </div>
            {winner&&(
              <div style={{ background:"rgba(253,203,110,0.1)", border:"1px solid rgba(253,203,110,0.25)", borderRadius:12, padding:"10px 14px", marginBottom:10 }}>
                <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11, marginBottom:4 }}>🏆 The family voted</div>
                <div style={{ color:"#FDCB6E", fontSize:18, fontWeight:"bold" }}>{winner[0]}</div>
                <div style={{ color:"rgba(255,255,255,0.3)", fontSize:12, marginTop:2 }}>{winner[1]} of {totalVotes} votes</div>
              </div>
            )}
            {results.slice(1).map(([name,count])=>(
              <div key={name} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:players.find(p=>p.name===name)?.color||"#fff" }} />
                <span style={{ flex:1, color:"rgba(255,255,255,0.6)", fontSize:14 }}>{name}</span>
                <span style={{ color:"rgba(255,255,255,0.3)", fontSize:13 }}>{count}</span>
              </div>
            ))}
            <ReactionsBar itemId={`hot_${q.id}`} itemType="hot_result" roomId={roomId} myName={myName} reactions={db.reactions} />
            <CommentsSection itemId={`hot_${q.id}`} roomId={roomId} myName={myName} players={players} comments={db.comments} />
          </Card>
        );
      })}
    </div>
  );
}

// ─── OPINIONS FEED ────────────────────────────────────────────────────────────
function OpFeed({ roomId, myName, players, db, notify, goTo }) {
  const getVotes = (opId, type) => db.opinionVotes.filter(v=>v.opinion_id===opId&&v.vote_type===type).length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={()=>goTo("hub")} style={{ background:"none", color:"rgba(255,255,255,0.35)", fontSize:13, padding:0 }}>← Games</button>
        <h2 style={{ margin:0, fontSize:20, color:"#fd79a8", flex:1 }}>🌶️ Opinions — Feed</h2>
      </div>
      {db.opinions.length===0&&<Card style={{ textAlign:"center", padding:28 }}><div style={{ fontSize:32, marginBottom:8 }}>🌶️</div><div style={{ color:"rgba(255,255,255,0.4)", fontSize:14 }}>No takes yet!</div></Card>}
      {db.opinions.map(op=>{
        const agrees=getVotes(op.id,"agree"), disagrees=getVotes(op.id,"disagree"), total=agrees+disagrees;
        const agreeP=total>0?Math.round(agrees/total*100):50;
        return (
          <Card key={op.id} style={{ borderColor:op.author===myName?"rgba(253,121,168,0.25)":"rgba(255,255,255,0.08)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:players.find(p=>p.name===op.author)?.color||"#fd79a8", display:"flex", alignItems:"center", justifyContent:"center", color:"#0d0d12", fontWeight:"bold", fontSize:13 }}>{op.author[0]}</div>
              <span style={{ color:"rgba(255,255,255,0.5)", fontSize:13 }}>{op.author}</span>
            </div>
            <p style={{ color:"white", fontSize:15, lineHeight:1.6, margin:"0 0 12px" }}>{op.text}</p>
            {total>0&&(
              <div style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"rgba(255,255,255,0.4)", marginBottom:4 }}>
                  <span>✅ {agrees} agree</span><span>{disagrees} disagree ❌</span>
                </div>
                <div style={{ height:6, borderRadius:3, background:"rgba(255,107,107,0.3)", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${agreeP}%`, background:"linear-gradient(90deg,#00B894,#55efc4)", borderRadius:3, transition:"width 0.4s" }} />
                </div>
              </div>
            )}
            <ReactionsBar itemId={op.id} itemType="opinion" roomId={roomId} myName={myName} reactions={db.reactions} />
            <CommentsSection itemId={op.id} roomId={roomId} myName={myName} players={players} comments={db.comments} />
          </Card>
        );
      })}
    </div>
  );
}

// ─── ROAST FEED ───────────────────────────────────────────────────────────────
function RoastFeed({ roomId, myName, players, db, notify, goTo }) {
  const revealRoast = async (id) => {
    await sb.from("fg_roasts").update({ revealed:true }).eq("id",id);
  };
  const revealed = db.roasts.filter(r=>r.revealed);
  const pending = db.roasts.filter(r=>!r.revealed);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={()=>goTo("hub")} style={{ background:"none", color:"rgba(255,255,255,0.35)", fontSize:13, padding:0 }}>← Games</button>
        <h2 style={{ margin:0, fontSize:20, color:"#E17055", flex:1 }}>😈 Roast Board — Feed</h2>
      </div>
      {pending.length>0&&(
        <Card style={{ background:"rgba(225,112,85,0.07)", borderColor:"rgba(225,112,85,0.2)", padding:14 }}>
          <div style={{ color:"#E17055", fontWeight:"bold", fontSize:14, marginBottom:8 }}>🔒 {pending.length} roast{pending.length!==1?"s":""} waiting to be revealed</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {pending.map(r=>(
              <div key={r.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,0.04)", borderRadius:12, padding:"10px 14px" }}>
                <div>
                  <div style={{ color:"rgba(255,255,255,0.35)", fontSize:12, marginBottom:3 }}>For {r.target_name}</div>
                  <div style={{ color:"rgba(255,255,255,0.5)", fontSize:13, fontStyle:"italic" }}>{r.prompt}</div>
                </div>
                <button onClick={()=>revealRoast(r.id)} style={{ background:"linear-gradient(135deg,#e17055,#ff7675)", color:"white", borderRadius:20, padding:"7px 14px", fontSize:13, fontWeight:"bold", fontFamily:"inherit", flexShrink:0, marginLeft:10 }}>Reveal 🔥</button>
              </div>
            ))}
          </div>
        </Card>
      )}
      {revealed.length===0&&pending.length===0&&<Card style={{ textAlign:"center", padding:28 }}><div style={{ fontSize:32, marginBottom:8 }}>😈</div><div style={{ color:"rgba(255,255,255,0.4)", fontSize:14 }}>No roasts yet!</div></Card>}
      {revealed.map(r=>{
        const targetPlayer = players.find(p=>p.name===r.target_name);
        return (
          <Card key={r.id} style={{ borderColor:"rgba(225,112,85,0.2)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:targetPlayer?.color||"#E17055", display:"flex", alignItems:"center", justifyContent:"center", color:"#0d0d12", fontWeight:"bold", fontSize:14 }}>{r.target_name[0]}</div>
              <div>
                <div style={{ color:"#E17055", fontSize:12, fontWeight:"bold" }}>😈 Roasting {r.target_name}</div>
                <div style={{ color:"rgba(255,255,255,0.3)", fontSize:11 }}>{r.prompt}</div>
              </div>
            </div>
            <p style={{ color:"white", fontSize:15, fontStyle:"italic", lineHeight:1.6, margin:"0 0 6px" }}>"{r.text}"</p>
            <div style={{ color:"rgba(255,255,255,0.3)", fontSize:12 }}>— {r.author}</div>
            <ReactionsBar itemId={r.id} itemType="roast" roomId={roomId} myName={myName} reactions={db.reactions} />
            <CommentsSection itemId={r.id} roomId={roomId} myName={myName} players={players} comments={db.comments} />
          </Card>
        );
      })}
    </div>
  );
}


function Admin({ roomId, myName, players, notify, goTo, fetchAll }) {
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmMe, setConfirmMe] = useState(false);

  const clearMyData = async () => {
    await Promise.all([
      sb.from("fg_who_submissions").delete().eq("room_id",roomId).eq("player_name",myName),
      sb.from("fg_who_guesses").delete().eq("room_id",roomId).eq("guesser",myName),
      sb.from("fg_who_skipped").delete().eq("room_id",roomId).eq("player_name",myName),
      sb.from("fg_hot_votes").delete().eq("room_id",roomId).eq("voter_name",myName),
      sb.from("fg_opinions").delete().eq("room_id",roomId).eq("author",myName),
      sb.from("fg_opinion_votes").delete().eq("room_id",roomId).eq("voter_name",myName),
      sb.from("fg_roasts").delete().eq("room_id",roomId).eq("author",myName),
      sb.from("fg_reactions").delete().eq("room_id",roomId).eq("player_name",myName),
      sb.from("fg_comments").delete().eq("room_id",roomId).eq("player_name",myName),
      sb.from("fg_players").update({ score:0 }).eq("room_id",roomId).eq("name",myName),
    ]);
    setConfirmMe(false); fetchAll(roomId); notify(`${myName}'s data cleared ✓`);
  };

  const resetAll = async () => {
    await Promise.all([
      sb.from("fg_who_submissions").delete().eq("room_id",roomId),
      sb.from("fg_who_guesses").delete().eq("room_id",roomId),
      sb.from("fg_who_skipped").delete().eq("room_id",roomId),
      sb.from("fg_hot_votes").delete().eq("room_id",roomId),
      sb.from("fg_hot_revealed").delete().eq("room_id",roomId),
      sb.from("fg_opinions").delete().eq("room_id",roomId),
      sb.from("fg_opinion_votes").delete().eq("room_id",roomId),
      sb.from("fg_roasts").delete().eq("room_id",roomId),
      sb.from("fg_reactions").delete().eq("room_id",roomId),
      sb.from("fg_comments").delete().eq("room_id",roomId),
      sb.from("fg_players").update({ score:0 }).eq("room_id",roomId),
    ]);
    setConfirmAll(false); fetchAll(roomId); notify("All games reset!","#E17055");
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, paddingTop:6 }}>
      <h2 style={{ margin:0, fontSize:22 }}>⚙️ Admin</h2>
      <Card style={{ borderColor:"rgba(116,185,255,0.2)", background:"rgba(116,185,255,0.06)" }}>
        <div style={{ color:"#74B9FF", fontWeight:"bold", fontSize:14, marginBottom:6 }}>👤 Just me ({myName})</div>
        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginBottom:14 }}>Clears only your data. Everyone else stays untouched.</div>
        {confirmMe ? (
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={clearMyData} style={{ flex:1, background:"linear-gradient(135deg,#74B9FF,#0984e3)", color:"white", borderRadius:14, padding:"11px 0", fontWeight:"bold", fontSize:14, fontFamily:"inherit" }}>Yes, clear mine</button>
            <button onClick={()=>setConfirmMe(false)} style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.6)", borderRadius:14, padding:"11px 0", fontSize:14, fontFamily:"inherit" }}>Cancel</button>
          </div>
        ) : <Btn variant="ghost" style={{ borderColor:"rgba(116,185,255,0.3)", color:"#74B9FF" }} onClick={()=>setConfirmMe(true)}>Clear My Data Only</Btn>}
      </Card>
      <Card>
        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginBottom:14 }}>{players.length} players in room {roomId}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <Btn variant="ghost" onClick={()=>goTo("hub")}>← Back to Hub</Btn>
          {confirmAll ? (
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={resetAll} style={{ flex:1, background:"linear-gradient(135deg,#e17055,#ff7675)", color:"white", borderRadius:14, padding:"11px 0", fontWeight:"bold", fontSize:14, fontFamily:"inherit" }}>Yes, reset all</button>
              <button onClick={()=>setConfirmAll(false)} style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.6)", borderRadius:14, padding:"11px 0", fontSize:14, fontFamily:"inherit" }}>Cancel</button>
            </div>
          ) : <Btn variant="reset" onClick={()=>setConfirmAll(true)}>Reset All Games 🗑️</Btn>}
        </div>
      </Card>
      <Card>
        <div style={{ color:"rgba(255,255,255,0.3)", fontSize:11, marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>Players</div>
        {players.map(p=>(
          <div key={p.name} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:p.color }} />
              <span style={{ color:"white" }}>{p.name}</span>
            </div>
            <span style={{ color:"#a29bfe" }}>{p.score} pts</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
