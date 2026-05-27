import { useState, useCallback, useRef } from "react";
import { useTheme } from "./useTheme.js";
import ThemeToggle from "./ThemeToggle.jsx";

const SUITS = ["♠","♥","♦","♣"];
const RANKS = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
const RV = {2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,T:10,J:11,Q:12,K:13,A:14};

function ck(c){ return c.r+c.s; }
function isRed(s){ return s==="♥"||s==="♦"; }
function buildDeck(){ const d=[]; for(const s of SUITS) for(const r of RANKS) d.push({r,s}); return d; }
function shuffle(a){ const b=[...a]; for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; } return b; }
function getCombos(arr,k){ if(k===0) return [[]]; if(arr.length<k) return []; const[f,...rest]=arr; return [...getCombos(rest,k-1).map(c=>[f,...c]), ...getCombos(rest,k)]; }

function scoreHand(five){
  const ranks=five.map(c=>RV[c.r]).sort((a,b)=>b-a);
  const suits=five.map(c=>c.s);
  const isFlush=suits.every(s=>s===suits[0]);
  const unique=[...new Set(ranks)].sort((a,b)=>b-a);
  const counts={}; ranks.forEach(r=>counts[r]=(counts[r]||0)+1);
  const groups=Object.entries(counts).sort((a,b)=>b[1]-a[1]||+b[0]-+a[0]);
  let isStraight=false;
  if(unique.length===5){
    if(unique[0]-unique[4]===4) isStraight=ranks;
    else if(unique[0]===14&&unique[1]===5&&unique[1]-unique[4]===3) isStraight=[5,4,3,2,1];
  }
  if(isFlush&&isStraight&&ranks[0]===14&&ranks[1]===13) return {rank:9,name:"Royal Flush",k:ranks};
  if(isFlush&&isStraight) return {rank:8,name:"Str. Flush",k:isStraight};
  if(groups[0][1]===4) return {rank:7,name:"Four of a Kind",k:[+groups[0][0],+groups[1][0]]};
  if(groups[0][1]===3&&groups[1][1]===2) return {rank:6,name:"Full House",k:[+groups[0][0],+groups[1][0]]};
  if(isFlush) return {rank:5,name:"Flush",k:ranks};
  if(isStraight) return {rank:4,name:"Straight",k:isStraight};
  if(groups[0][1]===3) return {rank:3,name:"Three of a Kind",k:[+groups[0][0],...unique.filter(r=>r!==+groups[0][0])]};
  if(groups[0][1]===2&&groups[1][1]===2){ const p=[+groups[0][0],+groups[1][0]].sort((a,b)=>b-a); return {rank:2,name:"Two Pair",k:[...p,...unique.filter(r=>!p.includes(r))]}; }
  if(groups[0][1]===2){ const p=+groups[0][0]; return {rank:1,name:"Pair",k:[p,...unique.filter(r=>r!==p)]}; }
  return {rank:0,name:"High Card",k:ranks};
}

function evalBest(cards){
  const combos=getCombos(cards,5); let best=null;
  for(const c of combos){ const s=scoreHand(c); if(!best||cmpSc(s,best)>0) best=s; }
  return best;
}

function cmpSc(a,b){
  if(a.rank!==b.rank) return a.rank-b.rank;
  for(let i=0;i<Math.min(a.k.length,b.k.length);i++){ if(a.k[i]!==b.k[i]) return a.k[i]-b.k[i]; }
  return 0;
}

function simulate(heroCards,community,numOpp,sims=1500){
  let wins=0,ties=0;
  const exc=new Set([...heroCards,...community].map(ck));
  const baseDeck=buildDeck().filter(c=>!exc.has(ck(c)));
  const need=5-community.length;
  for(let i=0;i<sims;i++){
    const deck=shuffle(baseDeck); let idx=0;
    const opps=[]; for(let o=0;o<numOpp;o++) opps.push([deck[idx++],deck[idx++]]);
    const extra=[]; for(let e=0;e<need;e++) extra.push(deck[idx++]);
    const board=[...community,...extra];
    const heroEval=evalBest([...heroCards,...board]);
    let won=true,tied=false;
    for(const opp of opps){
      const oppEval=evalBest([...opp,...board]);
      const c=cmpSc(heroEval,oppEval);
      if(c<0){ won=false; break; }
      if(c===0) tied=true;
    }
    if(won&&!tied) wins++;
    else if(won&&tied) ties++;
  }
  return { win:((wins/sims)*100).toFixed(1), tie:((ties/sims)*100).toFixed(1), wins, ties, sims };
}

function handCategory(cards){
  const r1=RV[cards[0].r],r2=RV[cards[1].r];
  const suited=cards[0].s===cards[1].s;
  const pair=r1===r2;
  const hi=Math.max(r1,r2),lo=Math.min(r1,r2);
  const gap=hi-lo;
  if(pair&&hi>=12) return "premium";
  if(pair&&hi>=10) return "strong";
  if(!pair&&lo>=12&&suited) return "premium";
  if(!pair&&hi===14&&lo>=11) return "strong";
  if(!pair&&hi===14&&lo>=10&&suited) return "strong";
  if(!pair&&hi===13&&lo>=11&&suited) return "strong";
  if(pair) return "medium";
  if(suited&&gap<=2&&lo>=4) return "speculative";
  if(suited&&hi===14) return "speculative";
  if(suited&&hi>=12&&lo>=8) return "speculative";
  if(!pair&&hi>=13&&lo>=10) return "speculative";
  if(suited&&gap<=4&&lo>=6) return "speculative";
  return "weak";
}

function countOuts(heroCards,community){
  if(community.length<3) return {outs:0,draws:[]};
  const all=[...heroCards,...community];
  const suits={};
  all.forEach(c=>{ suits[c.s]=(suits[c.s]||0)+1; });
  const draws=[]; let outs=0;
  const maxSuit=Math.max(...Object.values(suits));
  if(maxSuit===4){ draws.push("flush draw"); outs+=9; }
  const rv=[...new Set(all.map(c=>RV[c.r]))].sort((a,b)=>a-b);
  let straightDraw=false;
  for(let start=1;start<=10;start++){
    const window=[start,start+1,start+2,start+3,start+4];
    const have=window.filter(v=>rv.includes(v));
    if(have.length===4&&!straightDraw){ draws.push("straight draw"); outs+=8; straightDraw=true; }
  }
  return {outs,draws};
}

function getBoardTexture(community){
  if(community.length<3) return {wet:false,paired:false,monotone:false};
  const suits={}; const ranks=community.map(c=>RV[c.r]).sort((a,b)=>a-b);
  community.forEach(c=>{ suits[c.s]=(suits[c.s]||0)+1; });
  const maxSuit=Math.max(...Object.values(suits));
  const monotone=maxSuit>=3;
  const paired=new Set(ranks).size<ranks.length;
  let connected=0;
  for(let i=1;i<ranks.length;i++){ if(ranks[i]-ranks[i-1]<=2) connected++; }
  const wet=monotone||connected>=2;
  return {wet,paired,monotone};
}

const TRASH_TIPS = [
  h=>`${h} is the kind of holding that breaks bankrolls. Top players muck this without a second thought.`,
  h=>`${h} — no pair, no high card, no playability. Your wait is the discipline that funds your premium spots.`,
  h=>`${h} offsuit is a coin-flip to lose against literally any pair. Fold and conserve chips.`,
  h=>`${h} — when in doubt, fold. Pros fold 70-80% of starting hands.`,
  h=>`${h} has no business going to a flop. Trust the fold.`,
  h=>`${h} is the bait. Folding feels boring; calling feels exciting; folding is correct.`,
  h=>`${h} can hit a miracle flop, but you'd need two pair or better to feel okay. Save your money.`,
];

const FOLD_REASONS = [
  "Aggression is selective — folding here is the disciplined play.",
  "Save these chips for spots where you have real equity.",
  "Folding isn't weakness, it's resource management.",
  "Every chip preserved here is one you can deploy on a premium hand.",
];

function pick(arr,seed){ return arr[seed%arr.length]; }

function buildEquityGuessOptions(actualWin){
  const correct=parseFloat(actualWin);
  const options=new Set([correct.toFixed(1)]);
  const offsets=[4,8,12,16,-5,-9,-14,20,-18,25,-22,30];
  let i=0;
  while(options.size<4 && i<40){
    const offset=offsets[i%offsets.length]+Math.floor(i/offsets.length)*(i%2?2:-2);
    let candidate=Math.round((correct+offset)*10)/10;
    candidate=Math.max(6,Math.min(91,candidate));
    if(Math.abs(candidate-correct)>=2.5) options.add(candidate.toFixed(1));
    i++;
  }
  while(options.size<4){
    let candidate=Math.round((Math.random()*75+12)*10)/10;
    if(Math.abs(candidate-correct)>=2.5) options.add(candidate.toFixed(1));
  }
  return shuffle([...options]);
}

function EquityGuessPrompt({options,numOpp,onPick}){
  return (
    <div style={{background:"var(--surface-3)",borderRadius:12,padding:"14px 12px",border:"1px solid var(--border-medium)",marginBottom:10,animation:"fadeIn 0.3s ease"}}>
      <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:"#7eb8da",marginBottom:4,fontWeight:700}}>
        🎯 Guess Your Equity
      </div>
      <div style={{fontSize:12,color:"var(--text-secondary)",marginBottom:12,lineHeight:1.55,fontFamily:"'Georgia',serif"}}>
        What's your pre-flop win percentage against {numOpp} opponent{numOpp>1?"s":""}? Pick the closest estimate.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {options.map(opt=>(
          <button key={opt} onClick={()=>onPick(opt)} style={{
            padding:"14px 0",borderRadius:10,
            border:"1px solid rgba(126,184,218,0.35)",
            background:"rgba(126,184,218,0.08)",
            color:"#7eb8da",fontSize:18,fontWeight:800,cursor:"pointer",
            fontFamily:"'Georgia',serif",
            boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
          }}>{opt}%</button>
        ))}
      </div>
    </div>
  );
}

function generateTip(heroCards,community,equity,phase,numOpp,seed){
  const cat=handCategory(heroCards);
  const w=parseFloat(equity.win);
  const {outs,draws}=countOuts(heroCards,community);
  const board=getBoardTexture(community);
  const hi=Math.max(RV[heroCards[0].r],RV[heroCards[1].r]);
  const lo=Math.min(RV[heroCards[0].r],RV[heroCards[1].r]);
  const suited=heroCards[0].s===heroCards[1].s;
  const pair=heroCards[0].r===heroCards[1].r;
  const handStr=pair?`Pocket ${heroCards[0].r}s`:`${heroCards[0].r}${heroCards[1].r}${suited?"s":"o"}`;
  const heroEval=community.length>=3?evalBest([...heroCards,...community]):null;
  const topPair=heroEval&&heroEval.rank===1&&heroEval.k[0]>=Math.max(...community.map(c=>RV[c.r]));

  let action="",reasoning="",confidence="",altAction=null;

  if(phase===0){
    if(cat==="premium"){
      action="RAISE"; confidence="high";
      if(pair&&hi===14) reasoning=`Pocket Aces — the best starting hand. Raise 3x BB to isolate. You want 1-2 callers, not a multi-way pot.`;
      else if(pair&&hi===13) reasoning=`Pocket Kings — only AA beats you, ~0.5% chance. Raise hard and don't slow-play.`;
      else if(pair&&hi===12) reasoning=`Queens — premium but vulnerable to overcards. Raise to thin the field.`;
      else reasoning=`AK suited — the best non-pair hand. Raise. Dominates AQ/AJ/KQ. Strong c-bet hand even when you miss.`;
    } else if(cat==="strong"){
      action="RAISE"; confidence="high";
      if(pair&&hi===11) reasoning=`Pocket Jacks — strong but tricky. Raise to take the lead. Caution vs heavy 3-bets.`;
      else if(pair&&hi===10) reasoning=`Pocket Tens — solid raising hand. Ahead of all non-pair hands and 5 of 12 pairs.`;
      else if(hi===14&&!suited) reasoning=`AK offsuit — top raising hand even unsuited. Dominates weaker aces.`;
      else reasoning=`${handStr} — strong broadway hand. Raise for value. Watch for AK/AQ domination.`;
    } else if(cat==="medium"){
      action="CALL"; confidence="medium"; altAction="RAISE";
      reasoning=`${handStr} — set-mining hand. Hit a set ~12% on the flop. Call cheap, or raise if first in. Fold to heavy 3-bets.`;
    } else if(cat==="speculative"){
      if(numOpp>=3){
        action="CALL"; confidence="medium"; altAction="RAISE";
        reasoning=`${handStr} — thrives in multi-way pots. Playing for straights, flushes, two pair. Cheap call is great.`;
      } else {
        action="RAISE"; confidence="medium";
        reasoning=`${handStr} — heads-up, take initiative. Win by hitting OR by c-betting opponents off weak holdings.`;
      }
    } else {
      action="FOLD"; confidence="high";
      reasoning=pick(TRASH_TIPS,seed)(handStr);
    }
  } else {
    const hasDraws=draws.length>0;
    const strongMade=heroEval&&heroEval.rank>=3;

    if(w>=65){
      action="RAISE"; confidence="high";
      if(strongMade) reasoning=`${heroEval.name} with ${w}% equity — value town. Bet 60-75% pot. ${board.wet?"Wet board — make draws pay.":"Smaller bet for thin value."}`;
      else reasoning=`${w}% equity is dominant. Bet for value while ahead.`;
    } else if(w>=48){
      action="RAISE"; confidence="medium"; altAction="CALL";
      if(hasDraws) reasoning=`${draws.join(" + ")} (~${outs} outs) with ${w}% equity. Semi-bluff raise — win by fold OR by completing.`;
      else if(topPair) reasoning=`Top pair with ${w}% equity. ${board.wet?"Bet 60% to protect.":"Smaller bet for thin value."}`;
      else reasoning=`Decent equity at ${w}%. C-bet keeps the initiative.`;
    } else if(w>=32){
      if(hasDraws&&outs>=8){
        action="CALL"; confidence="medium"; altAction="RAISE";
        reasoning=`${draws.join(" + ")} with ${outs} outs. ${w}% equity — call for odds, or semi-bluff raise.`;
      } else if(hasDraws){
        action="CALL"; confidence="low"; altAction="FOLD";
        reasoning=`Marginal draw at ${w}%. Continue cheaply, fold to big bets. ${pick(FOLD_REASONS,seed)}`;
      } else {
        action="FOLD"; confidence="medium"; altAction="RAISE";
        reasoning=`${w}% with ${heroEval?heroEval.name:"no made hand"} and no draws. ${board.wet?"Wet boards favor the aggressor.":"Hand can't stand pressure."}`;
      }
    } else {
      if(hasDraws&&outs>=8&&phase<3){
        action="RAISE"; confidence="low"; altAction="FOLD";
        reasoning=`Behind, but ${outs} outs (${draws.join(" + ")}). Big semi-bluff can win now, real draw if called.`;
      } else {
        action="FOLD"; confidence="high";
        reasoning=`${w}% equity — you're crushed. ${heroEval?`${heroEval.name} won't win enough.`:"No pair, no draw."} ${pick(FOLD_REASONS,seed)}`;
      }
    }
  }

  return {action,reasoning,confidence,altAction};
}

function explainEquity(heroCards,community,equity,phase,numOpp){
  const wins=equity.wins||0;
  const ties=equity.ties||0;
  const sims=equity.sims||1500;
  const losses=sims-wins-ties;
  const winPct=parseFloat(equity.win);
  const tiePct=parseFloat(equity.tie);

  let main="";
  if(phase===0){
    const r1=RV[heroCards[0].r],r2=RV[heroCards[1].r];
    const hi=Math.max(r1,r2),lo=Math.min(r1,r2);
    const pair=r1===r2;
    const suited=heroCards[0].s===heroCards[1].s;
    if(pair&&hi===14) main=`Pocket Aces — best starting hand. Ahead of every other 2-card combination preflop. Risks: flopped sets vs higher sets (rare), running into miracle straights/flushes.`;
    else if(pair&&hi>=12) main=`Premium pair. Ahead of non-pair hands and most other pairs. Main risk: an overcard flops giving opponents top pair.`;
    else if(pair&&hi>=7) main=`Medium pair. Wins when no overcard hits, or when you flop a set (~12%). Against ${numOpp} opponent${numOpp>1?"s":""}, an overcard hits the flop often.`;
    else if(pair) main=`Small pair — set-mining hand. Flop a set ~1 in 8.5 times (~12%). When you miss, you fold. Equity reflects winning big when you hit, losing small when you don't.`;
    else if(hi===14&&lo>=11) main=`Strong ace with high kicker. Slight favorite vs most random hands, coin-flip vs pairs below your ace. Hits top pair ~32% of flops.`;
    else if(suited&&Math.abs(hi-lo)<=2) main=`Suited connector. Flush by river ~6.5%, straight ~3%, either ~9%. Most equity comes from "big hand" outcomes.`;
    else if(suited) main=`Suited hand — ~2% more equity than offsuit version because you complete a flush ~6.5% of the time.`;
    else main=`Limited equity: no flush draw (offsuit), weak kicker, often dominated by stronger versions of the same cards. Even pairing top can be outkicked.`;
  } else {
    const heroEval=evalBest([...heroCards,...community]);
    const {outs,draws}=countOuts(heroCards,community);
    const cardsLeft=phase===1?2:phase===2?1:0;
    if(heroEval.rank>=4) main=`You've made ${heroEval.name}. Very strong — only specific holdings can beat you.`;
    else if(heroEval.rank===3) main=`Three of a Kind. Only straights, flushes, full houses, quads beat you.`;
    else if(heroEval.rank===2) main=`Two Pair. Watch for sets, straights, higher two-pair. Equity drops on wet boards.`;
    else if(heroEval.rank===1){
      main=`One Pair. Equity depends on kicker and board texture. ${outs>0?`You also have ${draws.join(" + ")} (${outs} outs) for additional ways to win.`:"Without draws, your pair needs to hold up."}`;
    }
    else {
      if(outs>0){
        const approx=cardsLeft===2?outs*4:outs*2;
        const rule=cardsLeft===2?"Rule of 4":"Rule of 2";
        main=`No made hand, but draws: ${draws.join(" + ")} = ${outs} outs. Using the ${rule} (×${cardsLeft===2?4:2} with ${cardsLeft} card${cardsLeft>1?"s":""} to come), ~${approx}% to improve. The ${equity.win}% reflects this draw equity.`;
      } else {
        main=`High card only, no draws. The ${equity.win}% comes from rare times your high card holds or you spike a pair later. Usually a fold.`;
      }
    }
  }

  return { main, wins, ties, losses, sims, winPct, tiePct };
}

const strengthColors = {premium:"#e6b34d",strong:"#4ecdc4",medium:"#7eb8da",speculative:"#c084fc",weak:"#6b7280"};
const strengthLabels = {premium:"Premium",strong:"Strong",medium:"Medium",speculative:"Speculative",weak:"Weak"};
const PHASE_LABELS = ["Pre-Flop","Flop","Turn","River","Showdown"];

function Card({r,s,hidden,small,glow}){
  if(hidden){
    return (
      <div style={{width:small?38:52,height:small?54:74,borderRadius:7,background:`linear-gradient(145deg,var(--card-back-start),var(--card-back-end))`,border:"2px solid var(--card-back-border)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.4)",flexShrink:0}}>
        <div style={{width:small?22:32,height:small?32:48,borderRadius:4,border:"1.5px solid var(--card-back-border)",background:"repeating-conic-gradient(var(--card-back-start) 0% 25%, var(--card-back-pattern) 0% 50%) 50%/8px 8px"}}/>
      </div>
    );
  }
  const red=isRed(s);
  return (
    <div style={{width:small?38:52,height:small?54:74,borderRadius:7,background:"linear-gradient(145deg,#fffef5,#e8e4d4)",border:glow?`2px solid ${glow}`:"2px solid #c8c4b0",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:red?"#b91c1c":"#1e293b",boxShadow:glow?`0 0 12px ${glow}55, 0 2px 6px rgba(0,0,0,0.2)`:"0 2px 6px rgba(0,0,0,0.2)",flexShrink:0,fontFamily:"'Georgia',serif",animation:"dealIn 0.3s ease-out"}}>
      <span style={{fontSize:small?14:19,fontWeight:700,lineHeight:1}}>{r==="T"?"10":r}</span>
      <span style={{fontSize:small?12:17,lineHeight:1}}>{s}</span>
    </div>
  );
}

function EquityBar({win,label,color}){
  const w=parseFloat(win);
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,width:"100%"}}>
      <span style={{fontSize:10,color:"var(--text-faint)",width:28,textAlign:"right",flexShrink:0}}>{label}</span>
      <div style={{flex:1,height:14,borderRadius:7,background:"var(--bar-track)",overflow:"hidden"}}>
        <div style={{height:"100%",width:`${w}%`,background:`linear-gradient(90deg,${color},${color}aa)`,borderRadius:7,transition:"width 0.8s cubic-bezier(0.22,1,0.36,1)",minWidth:w>0?2:0}}/>
      </div>
      <span style={{fontSize:12,fontWeight:700,color,width:42,textAlign:"right",fontFamily:"'Georgia',serif"}}>{win}%</span>
    </div>
  );
}

function HandMatrix({heroCards,onClose}){
  const ranks = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
  const rvLocal = {A:14,K:13,Q:12,J:11,T:10,9:9,8:8,7:7,6:6,5:5,4:4,3:3,2:2};

  function categoryAt(i,j){
    const r1=ranks[i],r2=ranks[j];
    const v1=rvLocal[r1],v2=rvLocal[r2];
    const hi=Math.max(v1,v2),lo=Math.min(v1,v2);
    const pair=i===j;
    const suited=i<j;
    if(pair){
      if(hi>=12) return 'premium';
      if(hi>=10) return 'strong';
      if(hi>=7) return 'playable';
      return 'speculative';
    }
    if(suited){
      if(hi===14&&lo>=13) return 'premium';
      if(hi===14&&lo>=10) return 'premium';
      if(hi===13&&lo===12) return 'premium';
      if(hi===14) return 'speculative';
      if(hi===13&&lo>=10) return 'strong';
      if(hi===13&&lo>=8) return 'playable';
      if(hi===12&&lo>=10) return 'strong';
      if(hi===12&&lo>=8) return 'playable';
      if(hi===11&&lo>=9) return 'playable';
      if(hi-lo<=1&&lo>=6) return 'playable';
      if(hi-lo<=1&&lo>=4) return 'speculative';
      if(hi-lo===2&&lo>=6) return 'speculative';
      return 'fold';
    }
    if(hi===14&&lo===13) return 'strong';
    if(hi===14&&lo>=11) return 'playable';
    if(hi===14&&lo===10) return 'playable';
    if(hi===13&&lo===12) return 'playable';
    if(hi===13&&lo===11) return 'speculative';
    if(hi===12&&lo===11) return 'speculative';
    if(hi===14&&lo>=8) return 'speculative';
    return 'fold';
  }

  const colors = {
    premium:    {bg:'#e6b34d',text:'#412402'},
    strong:     {bg:'#4ecdc4',text:'#04342C'},
    playable:   {bg:'#7eb8da',text:'#042C53'},
    speculative:{bg:'#c084fc',text:'#26215C'},
    fold:       {bg:'var(--matrix-fold-bg)',text:'var(--matrix-fold-text)'},
  };

  // Identify hero's current hand cell
  // Chart spec: row i = "higher" position, col j = "lower" position when suited (i<j upper-right);
  // for offsuit (i>j lower-left), row=lower-ranked position, col=higher-ranked position
  let heroI=-1,heroJ=-1;
  if(heroCards&&heroCards.length===2){
    const v1=rvLocal[heroCards[0].r],v2=rvLocal[heroCards[1].r];
    const suited=heroCards[0].s===heroCards[1].s;
    const pair=v1===v2;
    const hiR=v1>=v2?heroCards[0].r:heroCards[1].r;
    const loR=v1>=v2?heroCards[1].r:heroCards[0].r;
    if(pair){
      heroI=ranks.indexOf(hiR);heroJ=heroI;
    }else if(suited){
      heroI=ranks.indexOf(hiR);heroJ=ranks.indexOf(loR);
    }else{
      heroI=ranks.indexOf(loR);heroJ=ranks.indexOf(hiR);
    }
  }

  // Build all grid items in a flat array with proper keys
  const gridItems = [];
  // Top-left empty corner
  gridItems.push(<div key="corner"></div>);
  // Top header row (column labels)
  for(let j=0;j<13;j++){
    gridItems.push(<div key={`col-${j}`} style={{fontSize:10,color:'var(--matrix-header)',display:'flex',alignItems:'center',justifyContent:'center'}}>{ranks[j]}</div>);
  }
  // Body rows
  for(let i=0;i<13;i++){
    // Row header
    gridItems.push(<div key={`row-${i}`} style={{fontSize:10,color:'var(--matrix-header)',display:'flex',alignItems:'center',justifyContent:'center'}}>{ranks[i]}</div>);
    // Row cells
    for(let j=0;j<13;j++){
      const cat=categoryAt(i,j);
      const c=colors[cat];
      const r1=ranks[i],r2=ranks[j];
      let label,suffix;
      if(i===j){label=r1+r2;suffix='';}
      else if(i<j){label=r1+r2;suffix='s';}
      else {label=r2+r1;suffix='o';}
      const isHero=(i===heroI&&j===heroJ);
      gridItems.push(
        <div key={`cell-${i}-${j}`} style={{
          aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',
          background:c.bg,color:c.text,fontSize:9,fontWeight:700,borderRadius:3,
          border:isHero?'2px solid var(--matrix-hero-border)':'1px solid rgba(0,0,0,0.1)',
          boxShadow:isHero?'0 0 10px rgba(126,184,218,0.45)':'none',
          fontFamily:"'Georgia',serif",position:'relative',
        }}>
          {label}{suffix}
          {isHero && <span style={{position:'absolute',top:-4,right:-4,fontSize:11}}>⭐</span>}
        </div>
      );
    }
  }

  return (
    <div style={{
      position:'fixed',top:0,left:0,right:0,bottom:0,
      background:'var(--overlay)',zIndex:1000,
      display:'flex',alignItems:'center',justifyContent:'center',
      padding:12,animation:'fadeIn 0.25s ease'
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'var(--modal-bg)',borderRadius:14,padding:'16px 14px',
        maxWidth:480,width:'100%',maxHeight:'92vh',overflowY:'auto',
        border:'1px solid var(--border-strong)',
        boxShadow:'var(--modal-shadow)',
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div>
            <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:2,color:'var(--felt-muted)',marginBottom:2}}>Starting Hand Chart</div>
            <h2 style={{fontSize:16,fontWeight:700,fontFamily:"'Georgia',serif",color:'#e6b34d',margin:0}}>169 Hand Matrix</h2>
          </div>
          <button onClick={onClose} style={{
            width:32,height:32,borderRadius:'50%',border:'1px solid var(--border-button)',
            background:'var(--surface-3)',color:'var(--text-primary)',fontSize:18,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',padding:0,lineHeight:1
          }}>×</button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'20px repeat(13, 1fr)',gap:2,marginBottom:10}}>
          {gridItems}
        </div>

        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10,fontSize:10,color:'var(--text-secondary)'}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,background:'#e6b34d',borderRadius:2}}/>Premium</div>
          <div style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,background:'#4ecdc4',borderRadius:2}}/>Strong</div>
          <div style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,background:'#7eb8da',borderRadius:2}}/>Playable</div>
          <div style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,background:'#c084fc',borderRadius:2}}/>Speculative</div>
          <div style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,background:'var(--matrix-fold-bg)',borderRadius:2,border:'1px solid var(--border-subtle)'}}/>Fold</div>
        </div>

        <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.55,padding:'8px 10px',background:'var(--surface-3)',borderRadius:8,border:'1px solid var(--border-subtle)'}}>
          <b style={{color:'var(--text-secondary)'}}>How to read:</b> Upper-right (with <b style={{color:'var(--text-primary)'}}>s</b>) = suited. Lower-left (with <b style={{color:'var(--text-primary)'}}>o</b>) = offsuit. Diagonal = pairs. {heroI>=0 && <span style={{color:'#e6b34d'}}>Your current hand is marked with ⭐.</span>}
        </div>
      </div>
    </div>
  );
}



function ExplainBox({heroCards,community,equity,phase,numOpp}){
  const ex = explainEquity(heroCards,community,equity,phase,numOpp);
  return (
    <div style={{background:"rgba(126,184,218,0.04)",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(126,184,218,0.18)",marginBottom:10,animation:"fadeIn 0.3s ease"}}>
      <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:"#7eb8da",marginBottom:8,fontWeight:700}}>
        🧮 Where {equity.win}% comes from
      </div>
      <div style={{fontSize:12,color:"var(--text-secondary)",lineHeight:1.65,fontFamily:"'Georgia',serif",marginBottom:10}}>
        {ex.main}
      </div>
      <div style={{padding:"8px 10px",background:"var(--surface-inset)",borderRadius:8,marginBottom:8}}>
        <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:4,textTransform:"uppercase",letterSpacing:0.5,fontWeight:700}}>The simulation</div>
        <div style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.6,fontFamily:"'Courier New',monospace"}}>
          <div>• Dealt {ex.sims.toLocaleString()} random scenarios</div>
          <div>• Each: {numOpp} opponent{numOpp>1?"s":""} get random cards{phase>0?`, plus ${5-community.length} more board card${5-community.length===1?"":"s"}`:`, plus a random 5-card board`}</div>
          <div>• Compared best 5-card hand for everyone</div>
          <div style={{color:"#4ecdc4",marginTop:4}}>• Won: <b>{ex.wins.toLocaleString()}</b> / {ex.sims.toLocaleString()} = {equity.win}%</div>
          <div style={{color:"var(--text-dim)"}}>• Tied: <b>{ex.ties.toLocaleString()}</b> / {ex.sims.toLocaleString()} = {equity.tie}%</div>
          <div style={{color:"#ef4444"}}>• Lost: <b>{ex.losses.toLocaleString()}</b> / {ex.sims.toLocaleString()} = {(100-ex.winPct-ex.tiePct).toFixed(1)}%</div>
        </div>
      </div>
      <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.55,fontStyle:"italic"}}>
        💡 This is <b style={{color:"var(--text-secondary)",fontStyle:"normal"}}>Monte Carlo simulation</b> — instead of exact probabilities (very complex with hidden cards), we run thousands of random trials and count outcomes.
      </div>
    </div>
  );
}

function CoachBox({tip}){
  const colorMap={RAISE:"#e6b34d",FOLD:"#ef4444",CALL:"#7eb8da"};
  const iconMap={RAISE:"⚔️",FOLD:"🛡️",CALL:"➡️"};
  const bgMap={RAISE:"rgba(230,179,77,0.06)",FOLD:"rgba(239,68,68,0.06)",CALL:"rgba(126,184,218,0.06)"};
  const borderMap={RAISE:"rgba(230,179,77,0.22)",FOLD:"rgba(239,68,68,0.22)",CALL:"rgba(126,184,218,0.22)"};
  const confDots={high:"●●●",medium:"●●○",low:"●○○"};
  return (
    <div style={{background:bgMap[tip.action],borderRadius:12,padding:"12px 14px",border:`1px solid ${borderMap[tip.action]}`,marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:16}}>{iconMap[tip.action]}</span>
          <span style={{fontSize:14,fontWeight:800,color:colorMap[tip.action],fontFamily:"'Georgia',serif",textTransform:"uppercase",letterSpacing:1}}>{tip.action}</span>
          {tip.altAction && (
            <span style={{fontSize:10,color:"var(--text-muted)",marginLeft:4}}>or {tip.altAction.toLowerCase()}</span>
          )}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{fontSize:9,color:"var(--text-faint)",textTransform:"uppercase",letterSpacing:0.5}}>Conf</span>
          <span style={{fontSize:11,color:tip.confidence==="high"?"#4ecdc4":tip.confidence==="medium"?"#e6b34d":"#ef4444",letterSpacing:1}}>{confDots[tip.confidence]}</span>
        </div>
      </div>
      <div style={{fontSize:12,color:"var(--text-secondary)",lineHeight:1.65,fontFamily:"'Georgia',serif"}}>{tip.reasoning}</div>
    </div>
  );
}

export default function PokerGame(){
  const { theme, toggleTheme } = useTheme();
  const [phase,setPhase] = useState(0);
  const [heroCards,setHeroCards] = useState([]);
  const [oppCards,setOppCards] = useState([]);
  const [community,setCommunity] = useState([]);
  const [equity,setEquity] = useState(null);
  const [history,setHistory] = useState([]);
  const [numOpp,setNumOpp] = useState(2);
  const [result,setResult] = useState(null);
  const [stats,setStats] = useState({played:0,won:0,folded:0,correctPlays:0});
  const [showOpp,setShowOpp] = useState(false);
  const [pot,setPot] = useState(0);
  const [chips,setChips] = useState(1000);
  const [tip,setTip] = useState(null);
  const [lastAction,setLastAction] = useState(null);
  const [streak,setStreak] = useState(0);
  const [tipSeed,setTipSeed] = useState(0);
  const [showExplain,setShowExplain] = useState(false);
  const [showMatrix,setShowMatrix] = useState(false);
  const [guessPending,setGuessPending] = useState(false);
  const [guessOptions,setGuessOptions] = useState([]);
  const [userGuess,setUserGuess] = useState(null);
  const prevEqRef = useRef(null);

  const deal = useCallback(()=>{
    const d=shuffle(buildDeck()); let idx=0;
    const hero=[d[idx++],d[idx++]];
    const opps=[]; for(let i=0;i<numOpp;i++) opps.push([d[idx++],d[idx++]]);
    const comm=[d[idx++],d[idx++],d[idx++],d[idx++],d[idx++]];
    setHeroCards(hero); setOppCards(opps); setCommunity(comm);
    setPhase(0); setResult(null); setShowOpp(false); setLastAction(null); setPot(30);
    setChips(p=>p-10);
    prevEqRef.current=null;
    const seed=Math.floor(Math.random()*10000); setTipSeed(seed);
    const eq=simulate(hero,[],numOpp,1500);
    setEquity(eq);
    setGuessOptions(buildEquityGuessOptions(eq.win));
    setGuessPending(true);
    setUserGuess(null);
    setShowExplain(false);
    setTip(generateTip(hero,[],eq,0,numOpp,seed));
    prevEqRef.current=eq;
  },[numOpp]);

  const submitEquityGuess = useCallback((guess)=>{
    setUserGuess(guess);
    setGuessPending(false);
  },[]);

  const wasCorrect = useCallback((userAction,coachAction,coachAlt)=>{
    return userAction.toUpperCase()===coachAction || (coachAlt&&userAction.toUpperCase()===coachAlt);
  },[]);

  const advance = useCallback((act)=>{
    setLastAction(act);
    const correct = tip ? wasCorrect(act,tip.action,tip.altAction) : false;

    if(act==="fold"){
      setResult("fold"); setShowOpp(true);
      setStats(s=>({...s,played:s.played+1,folded:s.folded+1,correctPlays:s.correctPlays+(correct?1:0)}));
      if(!correct) setStreak(0); else setStreak(s=>s+1);
      setHistory(h=>[{cards:[...heroCards],result:"fold",hand:"Folded",win:equity?.win,followedCoach:correct},...h].slice(0,20));
      return;
    }

    const betAmt = act==="raise" ? Math.min(60,chips) : act==="call" ? Math.min(20,chips) : 0;
    if(betAmt>0){ setChips(c=>c-betAmt); setPot(p=>p+betAmt); }

    const nextPhase = phase+1;
    if(nextPhase>=4){
      setPhase(4); setShowOpp(true);
      const heroEval=evalBest([...heroCards,...community]);
      let won=true,tied=false;
      for(const opp of oppCards){
        const oppEval=evalBest([...opp,...community]);
        const c=cmpSc(heroEval,oppEval);
        if(c<0){ won=false; break; }
        if(c===0) tied=true;
      }
      const r = won&&!tied ? "win" : won&&tied ? "tie" : "lose";
      setResult(r);
      if(r==="win") setChips(c=>c+pot+betAmt);
      else if(r==="tie") setChips(c=>c+Math.floor((pot+betAmt)/2));
      setStats(s=>({...s,played:s.played+1,won:s.won+(r==="win"?1:0),correctPlays:s.correctPlays+(correct?1:0)}));
      if(correct) setStreak(s=>s+1); else setStreak(0);
      const eq2=simulate(heroCards,community,numOpp,1500); setEquity(eq2);
      setHistory(h=>[{cards:[...heroCards],result:r,hand:heroEval.name,win:eq2.win,followedCoach:correct},...h].slice(0,20));
      setTip(null);
      return;
    }

    setPhase(nextPhase);
    const visComm = community.slice(0,nextPhase===1?3:nextPhase===2?4:5);
    const eq = simulate(heroCards,visComm,numOpp,1500);
    setEquity(eq);
    setTip(generateTip(heroCards,visComm,eq,nextPhase,numOpp,tipSeed+nextPhase));
    prevEqRef.current=eq;
  },[phase,heroCards,community,oppCards,numOpp,pot,chips,equity,tip,tipSeed,wasCorrect]);

  const resetHand = ()=>{
    setHeroCards([]); setOppCards([]); setCommunity([]);
    setEquity(null); setPhase(0); setResult(null);
    setShowOpp(false); setTip(null); setLastAction(null);
    setShowExplain(false);
    setGuessPending(false); setGuessOptions([]); setUserGuess(null);
  };

  // Show all 5 community cards when folded or at showdown
  const visibleCommunity = (result==="fold"||phase===4)
    ? community.slice(0,5)
    : phase===0 ? []
    : phase===1 ? community.slice(0,3)
    : phase===2 ? community.slice(0,4)
    : community.slice(0,5);

  const cat = heroCards.length===2 ? handCategory(heroCards) : null;
  const heroEvalNow = heroCards.length && visibleCommunity.length>=3 ? evalBest([...heroCards,...visibleCommunity]) : null;
  const winVal = equity ? parseFloat(equity.win) : 0;
  const eqDelta = prevEqRef.current && equity && phase>0 ? parseFloat(equity.win)-parseFloat(prevEqRef.current.win) : null;
  const coachAccuracy = stats.played>0 ? ((stats.correctPlays/stats.played)*100).toFixed(0) : 0;
  const guessCorrect = userGuess !== null && equity ? userGuess === equity.win : null;

  const isCoachAction = (btn)=>{
    if(!tip) return false;
    const b=btn.toUpperCase();
    return tip.action===b || tip.altAction===b;
  };

  // Compute "would have won" for fold display + determine winner for highlighting
  let foldOutcome = null;
  // winnerIdx: -1 = hero, 0..n-1 = opponent index, null = unknown/tie
  // ties: array of indices that tied
  let winnerIdx = null;
  let tiedIndices = [];
  if((result==="fold" || phase===4) && heroEvalNow && community.length===5){
    // Evaluate everyone's final hand
    const heroFinal = evalBest([...heroCards,...community]);
    const oppFinals = oppCards.map(opp => evalBest([...opp,...community]));
    // Find best score
    let bestScore = heroFinal;
    let bestList = [-1]; // -1 represents hero
    oppFinals.forEach((oe,i)=>{
      const cmp = cmpSc(oe, bestScore);
      if(cmp > 0){ bestScore = oe; bestList = [i]; }
      else if(cmp === 0){ bestList.push(i); }
    });
    if(bestList.length > 1){
      tiedIndices = bestList;
      winnerIdx = null;
    } else {
      winnerIdx = bestList[0];
    }
    // Set foldOutcome for the fold-result message
    if(result==="fold"){
      const heroBeatsAll = oppFinals.every(oe => cmpSc(heroFinal, oe) > 0);
      const heroTiesBest = oppFinals.some(oe => cmpSc(heroFinal, oe) === 0) && oppFinals.every(oe => cmpSc(heroFinal, oe) >= 0);
      foldOutcome = heroBeatsAll ? "win" : heroTiesBest ? "tie" : "lose";
    }
  }
  const heroIsWinner = winnerIdx === -1 || tiedIndices.includes(-1);
  const oppIsWinner = (i) => winnerIdx === i || tiedIndices.includes(i);
  const isTie = tiedIndices.length > 1;

  return (
    <div className="app-shell" style={{fontFamily:"'Segoe UI',sans-serif",padding:"16px 12px",maxWidth:500,margin:"0 auto",position:"relative"}}>
      <ThemeToggle theme={theme} onToggle={toggleTheme} />

      <div style={{textAlign:"center",marginBottom:14}}>
        <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:4,color:"var(--felt)"}}>Texas Hold'em</div>
        <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Georgia',serif",margin:"2px 0",background:"linear-gradient(135deg,#e6b34d,#c8943a)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          Hold'em Coach
        </h1>
        <div style={{fontSize:11,color:"var(--felt-light)",marginTop:2}}>Aggression first — tap "How?" to see the math</div>
      </div>

      <div style={{display:"flex",justifyContent:"center",gap:12,fontSize:11,color:"var(--felt-muted)",marginBottom:10,flexWrap:"wrap"}}>
        <span>💰 <b style={{color:"#e6b34d"}}>{chips}</b></span>
        <span>🏆 <b style={{color:"#4ecdc4"}}>{stats.won}W</b>/<b style={{color:"#ef4444"}}>{stats.played-stats.won-stats.folded}L</b>/<b>{stats.folded}F</b></span>
        <span>🎯 <b style={{color:parseInt(coachAccuracy)>=70?"#4ecdc4":parseInt(coachAccuracy)>=40?"#e6b34d":"#ef4444"}}>{coachAccuracy}%</b></span>
        {streak>=3 && <span>🔥 <b style={{color:"#e6b34d"}}>{streak}</b></span>}
      </div>

      <div style={{textAlign:"center",marginBottom:14}}>
        <button onClick={()=>setShowMatrix(true)} style={{
          padding:"6px 14px",borderRadius:8,
          border:"1px solid rgba(192,132,252,0.3)",
          background:"rgba(192,132,252,0.08)",
          color:"#c084fc",fontSize:11,fontWeight:700,cursor:"pointer",
          textTransform:"uppercase",letterSpacing:1
        }}>📊 Show Hand Matrix</button>
      </div>

      {heroCards.length===0 && (
        <div style={{textAlign:"center",padding:"30px 0"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:20}}>
            <span style={{fontSize:12,color:"var(--felt-muted)"}}>Opponents:</span>
            {[1,2,3,5].map(n=>(
              <button key={n} onClick={()=>setNumOpp(n)} style={{
                width:34,height:34,borderRadius:"50%",border:numOpp===n?"2px solid #e6b34d":"1px solid var(--felt-border-soft)",
                background:numOpp===n?"rgba(230,179,77,0.15)":"transparent",
                color:numOpp===n?"#e6b34d":"var(--felt-muted)",fontSize:14,fontWeight:700,cursor:"pointer"
              }}>{n}</button>
            ))}
          </div>
          <button onClick={deal} style={{
            padding:"14px 44px",borderRadius:12,border:"2px solid #e6b34d",
            background:"linear-gradient(135deg,rgba(230,179,77,0.18),rgba(230,179,77,0.04))",
            color:"#e6b34d",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"'Georgia',serif",
            letterSpacing:1,boxShadow:"0 0 24px rgba(230,179,77,0.08)"
          }}>Deal Me In</button>
          <div style={{marginTop:24,padding:"14px 18px",background:"var(--surface-3)",borderRadius:12,border:"1px solid var(--border-subtle)",textAlign:"left",maxWidth:400,margin:"24px auto 0"}}>
            <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:"var(--felt-light)",marginBottom:6,fontWeight:700}}>📖 The Math of Folding</div>
            <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.7,fontFamily:"'Georgia',serif"}}>
              Only <b style={{color:"#e6b34d"}}>~17%</b> of starting hands are profitable. The other 83% should be folded. The discipline of folding bad hands is what makes premium hands profitable.
            </div>
          </div>
        </div>
      )}

      {heroCards.length>0 && (
        <div>
          <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
            {oppCards.map((opp,i)=>{
              const isWinner = showOpp && oppIsWinner(i);
              const wrapStyle = isWinner ? {
                textAlign:"center",
                padding:"6px 8px",
                borderRadius:10,
                background:isTie?"rgba(230,179,77,0.12)":"rgba(239,68,68,0.12)",
                border:isTie?"1.5px solid rgba(230,179,77,0.5)":"1.5px solid rgba(239,68,68,0.5)",
                boxShadow:isTie?"0 0 14px rgba(230,179,77,0.25)":"0 0 14px rgba(239,68,68,0.25)",
              } : {textAlign:"center",padding:"6px 8px"};
              return (
                <div key={i} style={wrapStyle}>
                  <div style={{display:"flex",gap:2,justifyContent:"center"}}>
                    <Card r={opp[0].r} s={opp[0].s} hidden={!showOpp} small glow={isWinner?(isTie?"#e6b34d":"#ef4444"):null}/>
                    <Card r={opp[1].r} s={opp[1].s} hidden={!showOpp} small glow={isWinner?(isTie?"#e6b34d":"#ef4444"):null}/>
                  </div>
                  {showOpp && (
                    <div style={{fontSize:9,color:isWinner?(isTie?"#e6b34d":"#ef4444"):"var(--text-muted)",marginTop:3,fontWeight:isWinner?700:400}}>
                      {isWinner && (isTie?"🤝 TIE":"🏆 WINS")}
                      {!isWinner && evalBest([...opp,...community])?.name}
                    </div>
                  )}
                  {showOpp && isWinner && (
                    <div style={{fontSize:8,color:"var(--text-secondary)",marginTop:1}}>{evalBest([...opp,...community])?.name}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{textAlign:"center",marginBottom:6}}>
            <span style={{fontSize:9,color:"var(--felt-muted)",textTransform:"uppercase",letterSpacing:1}}>Pot</span>
            <div style={{fontSize:20,fontWeight:800,color:"#e6b34d",fontFamily:"'Georgia',serif"}}>{pot}</div>
          </div>

          <div style={{display:"flex",justifyContent:"center",gap:5,marginBottom:14,minHeight:78}}>
            {[0,1,2,3,4].map(i=>{
              if(i<visibleCommunity.length) return <Card key={i} r={visibleCommunity[i].r} s={visibleCommunity[i].s}/>;
              return <div key={i} style={{width:52,height:74,borderRadius:7,border:"1.5px dashed var(--felt-border)",background:"var(--card-slot)"}}/>;
            })}
          </div>

          <div style={{display:"flex",justifyContent:"center",gap:3,marginBottom:10}}>
            {PHASE_LABELS.map((label,i)=>(
              <div key={i} style={{
                padding:"2px 8px",borderRadius:8,fontSize:9,fontWeight:600,
                background:i===phase?"rgba(230,179,77,0.18)":i<phase?"rgba(78,205,196,0.08)":"transparent",
                color:i===phase?"#e6b34d":i<phase?"#4ecdc4":"var(--felt-dark)",
                border:i===phase?"1px solid rgba(230,179,77,0.25)":"1px solid transparent"
              }}>{label}</div>
            ))}
          </div>

          <div style={{
            background: showOpp && heroIsWinner ? (isTie?"rgba(230,179,77,0.08)":"rgba(78,205,196,0.08)") : "var(--surface-1)",
            borderRadius:14,padding:12,
            border: showOpp && heroIsWinner ? (isTie?"1.5px solid rgba(230,179,77,0.5)":"1.5px solid rgba(78,205,196,0.5)") : "1px solid var(--border-medium)",
            boxShadow: showOpp && heroIsWinner ? (isTie?"0 0 16px rgba(230,179,77,0.2)":"0 0 16px rgba(78,205,196,0.2)") : "none",
            marginBottom:10,
            transition:"all 0.4s ease"
          }}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{display:"flex",gap:3,position:"relative"}}>
                <Card r={heroCards[0].r} s={heroCards[0].s} glow={showOpp&&heroIsWinner?(isTie?"#e6b34d":"#4ecdc4"):strengthColors[cat]}/>
                <Card r={heroCards[1].r} s={heroCards[1].s} glow={showOpp&&heroIsWinner?(isTie?"#e6b34d":"#4ecdc4"):strengthColors[cat]}/>
                {showOpp && heroIsWinner && (
                  <div style={{
                    position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",
                    fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:10,
                    background:isTie?"#e6b34d":"#4ecdc4",color:"var(--win-badge-text)",
                    whiteSpace:"nowrap",fontFamily:"'Georgia',serif",
                    boxShadow:"0 2px 6px rgba(0,0,0,0.3)"
                  }}>{isTie?"🤝 TIE":"🏆 WINS"}</div>
                )}
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                  <span style={{fontSize:9,padding:"2px 6px",borderRadius:5,background:`${strengthColors[cat]}20`,color:strengthColors[cat],fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>{strengthLabels[cat]}</span>
                  {heroEvalNow && <span style={{fontSize:11,color:"var(--history-text)"}}>{heroEvalNow.name}</span>}
                </div>
                {equity && !guessPending && (
                  <div>
                    <div style={{display:"flex",alignItems:"baseline",gap:4,flexWrap:"wrap"}}>
                      <span style={{fontSize:28,fontWeight:800,fontFamily:"'Georgia',serif",color:winVal>60?"#4ecdc4":winVal>40?"#e6b34d":winVal>25?"#f59e0b":"#ef4444",lineHeight:1}}>{equity.win}%</span>
                      {userGuess !== null && phase===0 && (
                        <span style={{
                          fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:8,
                          background:guessCorrect?"rgba(78,205,196,0.15)":"rgba(239,68,68,0.15)",
                          color:guessCorrect?"#4ecdc4":"#ef4444",
                          border:`1px solid ${guessCorrect?"rgba(78,205,196,0.35)":"rgba(239,68,68,0.35)"}`,
                        }}>
                          {guessCorrect ? "✓ Correct" : `✗ You guessed ${userGuess}%`}
                        </span>
                      )}
                      {eqDelta!==null && eqDelta!==0 && (
                        <span style={{fontSize:11,fontWeight:700,color:eqDelta>0?"#4ecdc4":"#ef4444"}}>
                          {eqDelta>0?"▲":"▼"}{Math.abs(eqDelta).toFixed(1)}
                        </span>
                      )}
                      <button onClick={()=>setShowExplain(s=>!s)} style={{
                        marginLeft:"auto",padding:"3px 9px",borderRadius:8,
                        border:"1px solid rgba(126,184,218,0.3)",
                        background:showExplain?"rgba(126,184,218,0.15)":"rgba(126,184,218,0.05)",
                        color:"#7eb8da",fontSize:10,fontWeight:700,cursor:"pointer",
                        textTransform:"uppercase",letterSpacing:0.5
                      }}>{showExplain?"Hide":"How?"}</button>
                    </div>
                    <div style={{marginTop:4,display:"flex",flexDirection:"column",gap:2}}>
                      <EquityBar win={equity.win} label="Win" color="#4ecdc4"/>
                      <EquityBar win={equity.tie} label="Tie" color="var(--text-dim)"/>
                      <EquityBar win={(100-parseFloat(equity.win)-parseFloat(equity.tie)).toFixed(1)} label="Lose" color="#ef4444"/>
                    </div>
                  </div>
                )}
                {guessPending && (
                  <div style={{fontSize:12,color:"var(--text-muted)",fontFamily:"'Georgia',serif",fontStyle:"italic",marginTop:4}}>
                    Win % hidden — make your guess below
                  </div>
                )}
              </div>
            </div>
          </div>

          {guessPending && (
            <EquityGuessPrompt options={guessOptions} numOpp={numOpp} onPick={submitEquityGuess}/>
          )}

          {showExplain && equity && !guessPending && (
            <ExplainBox heroCards={heroCards} community={visibleCommunity} equity={equity} phase={phase} numOpp={numOpp}/>
          )}

          {tip && !result && !guessPending && <CoachBox tip={tip}/>}

          {!result && !guessPending && (
            <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:14}}>
              <button onClick={()=>advance("fold")} style={{
                flex:1,padding:"13px 0",borderRadius:11,
                border:isCoachAction("fold")?"2px solid #ef4444":"1px solid #3a2222",
                background:isCoachAction("fold")?"rgba(239,68,68,0.14)":"rgba(239,68,68,0.04)",
                color:"#ef4444",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Georgia',serif",
                boxShadow:isCoachAction("fold")?"0 0 14px rgba(239,68,68,0.12)":"none"
              }}>🛡️ Fold</button>
              <button onClick={()=>advance("call")} style={{
                flex:1,padding:"13px 0",borderRadius:11,
                border:isCoachAction("call")?"2px solid #7eb8da":"1px solid #2a3a4a",
                background:isCoachAction("call")?"rgba(126,184,218,0.14)":"rgba(126,184,218,0.04)",
                color:"#7eb8da",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Georgia',serif",
                boxShadow:isCoachAction("call")?"0 0 14px rgba(126,184,218,0.12)":"none"
              }}>➡️ {phase===0?"Call":"Check"}</button>
              <button onClick={()=>advance("raise")} style={{
                flex:1,padding:"13px 0",borderRadius:11,
                border:isCoachAction("raise")?"2px solid #e6b34d":"1px solid #3a3520",
                background:isCoachAction("raise")?"rgba(230,179,77,0.14)":"rgba(230,179,77,0.04)",
                color:"#e6b34d",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Georgia',serif",
                boxShadow:isCoachAction("raise")?"0 0 14px rgba(230,179,77,0.12)":"none"
              }}>⚔️ Raise</button>
            </div>
          )}

          {result && (
            <div style={{textAlign:"center",marginBottom:12,animation:"fadeIn 0.5s ease"}}>
              <div style={{
                fontSize:18,fontWeight:800,fontFamily:"'Georgia',serif",
                color:result==="win"?"#4ecdc4":result==="tie"?"#e6b34d":result==="fold"?"var(--felt-dark)":"#ef4444",
                marginBottom:4
              }}>
                {result==="win"?"🏆 You Win!":result==="tie"?"🤝 Split Pot":result==="fold"?"🏳️ Folded":"💀 You Lose"}
              </div>
              {result!=="fold" && heroEvalNow && (
                <div style={{fontSize:12,color:"var(--history-text)",marginBottom:2}}>{heroEvalNow.name}</div>
              )}
              {result==="fold" && heroEvalNow && foldOutcome && (
                <div style={{marginTop:6,padding:"8px 12px",borderRadius:8,background:foldOutcome==="win"?"rgba(239,68,68,0.08)":"rgba(78,205,196,0.08)",border:`1px solid ${foldOutcome==="win"?"rgba(239,68,68,0.2)":"rgba(78,205,196,0.2)"}`}}>
                  <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>Your hand: <b style={{color:"var(--text-primary)"}}>{heroEvalNow.name}</b></div>
                  <div style={{fontSize:12,color:foldOutcome==="win"?"#ef4444":"#4ecdc4",fontFamily:"'Georgia',serif"}}>
                    {foldOutcome==="win"?"⚠️ You would have won — but variance happens. Don't second-guess disciplined folds.":foldOutcome==="tie"?"🤝 Would've split the pot — solid fold either way.":"✓ Good fold — you would have lost."}
                  </div>
                </div>
              )}
              <button onClick={resetHand} style={{
                marginTop:10,padding:"10px 36px",borderRadius:10,border:"2px solid #e6b34d",
                background:"rgba(230,179,77,0.1)",color:"#e6b34d",fontSize:14,fontWeight:700,
                cursor:"pointer",fontFamily:"'Georgia',serif"
              }}>Next Hand →</button>
            </div>
          )}
        </div>
      )}

      {history.length>0 && (
        <div style={{marginTop:14}}>
          <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:2,color:"var(--felt)",marginBottom:6,fontWeight:700}}>Hand History</div>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            {history.map((h,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderRadius:8,background:"var(--surface-2)",border:"1px solid var(--border-subtle)"}}>
                <div style={{display:"flex",gap:2}}>{h.cards.map((c,j)=><Card key={j} r={c.r} s={c.s} small/>)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,color:"var(--history-text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.hand}</div>
                </div>
                <span style={{fontSize:10,color:"var(--text-faint)"}}>{h.win}%</span>
                <span style={{fontSize:10,color:h.followedCoach?"#4ecdc4":"#f59e0b"}}>{h.followedCoach?"🎯":"⚡"}</span>
                <span style={{fontSize:12,fontWeight:700,color:h.result==="win"?"#4ecdc4":h.result==="fold"?"var(--felt-dark)":"#ef4444",width:14}}>{h.result==="win"?"W":h.result==="fold"?"F":"L"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showMatrix && <HandMatrix heroCards={heroCards} onClose={()=>setShowMatrix(false)}/>}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dealIn { from { opacity: 0; transform: scale(0.85) rotate(-4deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
        * { box-sizing: border-box; }
        button:hover { filter: brightness(1.12); }
        button:active { transform: scale(0.97); }
      `}</style>
    </div>
  );
}
