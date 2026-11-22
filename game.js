"use strict";

const $ = (selector) => document.querySelector(selector);
const game = $("#game"), screen = $("#screen"), area = $("#targets");
const weapon = $("#weapon"), controls = $("#controls"), keyboard = $("#keyboard");
const status = $("#status"), feedback = $("#feedback");
const rowData = [
  ["あ行","あいうえお"],["か行","かきくけこ"],["さ行","さしすせそ"],
  ["た行","たちつてと"],["な行","なにぬねの"],["は行","はひふへほ"],
  ["ま行","まみむめも"],["や行","やゆよ"],["ら行","らりるれろ"],
  ["わ行・ん","わをん"],["濁音・半濁音","がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ"],
  ["拗音","きゃ きゅ きょ しゃ しゅ しょ ちゃ ちゅ ちょ にゃ にゅ にょ ひゃ ひゅ ひょ みゃ みゅ みょ りゃ りゅ りょ ぎゃ ぎゅ ぎょ じゃ じゅ じょ びゃ びゅ びょ ぴゃ ぴゅ ぴょ"]
];
const kana = /.[ゃゅょ]?/gu;
const basic = "さくら くるま たぬき うさぎ いぬや きつね すいか めろん りす やま そら ひかり つくえ ほたる こたつ ふくろ まくら むしろ からす ちから しおり てまり ぬりえ へちま みかん はさみ くすり つみき".split(" ").filter(word => !/[がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ]/u.test(word) && word.length === 3 && word !== "いぬや");
const advanced = "りんご きゃく じゃま ぎゅう ちょき しゃしん でんわ ぱんつ ばなな ごりら ぴあの すずめ ぼうし ぎんか こうちゃ きんぎょ じしゃく べんち".split(" ");
const roman = {};
for (const [kanaRow, romajiRow] of [
  ["あいうえお","a i u e o"],["かきくけこ","ka ki ku ke ko"],["さしすせそ","sa shi/si su se so"],
  ["たちつてと","ta chi/ti tsu/tu te to"],["なにぬねの","na ni nu ne no"],
  ["はひふへほ","ha hi fu/hu he ho"],["まみむめも","ma mi mu me mo"],["やゆよ","ya yu yo"],
  ["らりるれろ","ra ri ru re ro"],["わをん","wa wo nn/n/xn"],["がぎぐげご","ga gi gu ge go"],
  ["ざじずぜぞ","za ji/zi zu ze zo"],["だぢづでど","da di/dji du/dzu de do"],["ばびぶべぼ","ba bi bu be bo"],
  ["ぱぴぷぺぽ","pa pi pu pe po"]
]) [...kanaRow].forEach((symbol, i) => { roman[symbol] = romajiRow.split(" ")[i].split("/"); });

for (const [head, prefixes] of Object.entries({
  き:["ky"],し:["sh","sy"],ち:["ch","ty","cy"],に:["ny"],ひ:["hy"],み:["my"],り:["ry"],
  ぎ:["gy"],じ:["j","jy","zy"],び:["by"],ぴ:["py"]
})) {
  for (const [small, vowel] of [["ゃ","a"],["ゅ","u"],["ょ","o"]]) {
    roman[head + small] = prefixes.map(prefix => prefix + vowel)
      .concat(roman[head].flatMap(first => ["x","l"].map(prefix => first + prefix + "y" + vowel)));
  }
}

const names = "ベル係 ピアノ弾き 床屋 料理人 夜警 車掌 機関士 郵便配達員 駅馬車の御者 測量士 サボテンの園芸家 養蜂家 水くみ係 鍛冶屋 風車の修理屋 太鼓奏者 占い師 花火係 人形遣い ロデオの道化師".split(" ");
const mouths=[[0.47,0.255],[0.455,0.31],[0.48,0.282],[0.46,0.307],[0.47,0.278],[0.44,0.252],[0.49,0.292],[0.54,0.262],[0.51,0.253],[0.588,0.262],[0.52,0.243],[0.53,0.231],[0.53,0.264],[0.51,0.26],[0.535,0.238],[0.537,0.357],[0.578,0.243],[0.55,0.39],[0.56,0.373],[0.57,0.317]];
const sprites = names.map((_,i) => { const image = new Image(); image.src = "mob-" + String(i+1).padStart(2,"0") + ".webp"; return image; });
const audio = Object.fromEntries(["shot","moan","bite"].map(name => [name,new Audio("" + name + ".wav")]));
Object.values(audio).forEach(sound => { sound.preload = "auto"; });
const storage = {
  get(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key,value); } catch {} }
};
let volume = Number(storage.get("romaji-volume", "55")) / 100;
let muted = storage.get("romaji-mute", "0") === "1";
$("#volume").value = volume*100;
function syncAudio() {
  for (const [name,sound] of Object.entries(audio)) {
    sound.muted = muted;
    sound.volume = volume * (name === "moan" ? .7 : 1);
  }
  $("#mute").textContent = muted ? "音を出す" : "消音";
  $("#mute").setAttribute("aria-pressed", String(muted));
}
syncAudio();
$("#volume").oninput = event => {
  volume = Number(event.target.value)/100;
  storage.set("romaji-volume", volume*100);
  syncAudio();
};
$("#mute").onclick = () => { muted = !muted; storage.set("romaji-mute", muted ? "1" : "0"); syncAudio(); };
function play(name) {
  const sound = audio[name];
  sound.currentTime = 0;
  sound.play().catch(() => {});
}
function stopAudio() { Object.values(audio).forEach(sound => { sound.pause(); sound.currentTime = 0; }); }

const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]] = [copy[j],copy[i]];
  }
  return copy;
};
const track = (word,id) => ({word, units:word.match(kana), id, index:0, done:false, node:null, letters:[]});
function spellings(target) {
  const symbol = target.units[target.index];
  if (symbol !== "ん") return roman[symbol];
  const next = target.units[target.index+1];
  if (!next) return ["nn","n'","xn"];
  return /^[aeiouyn]/.test(roman[next][0]) ? ["nn","n'","xn"] : ["nn","n'","xn","n"];
}
const battleRounds = 5;
const roundTime = 20000;
function battleWords(includeAdvanced) {
  const words = shuffle(includeAdvanced ? [...basic, ...advanced] : basic).slice(0, battleRounds);
  if (includeAdvanced && !words.some(word => advanced.includes(word))) {
    words[0] = shuffle(advanced)[0];
  }
  return words;
}

let state = null, scene = "menu", ticket = 0, fireTimer, flashTimer, previousTime = performance.now();
const setScene = (name) => {
  scene = name;
  game.dataset.scene = name;
  screen.replaceChildren();
  controls.hidden = name !== "practice" && name !== "battle";
  $("#home").hidden = name === "menu" || name === "clear";
  status.textContent = "";
  feedback.textContent = "";
};
function reset() {
  ticket++;
  clearTimeout(fireTimer); clearTimeout(flashTimer);
  weapon.classList.remove("fire");
  $("#hint").textContent="ヒント";
  stopAudio();
  state = null;
  area.replaceChildren();
  weapon.hidden = true;
  keyboard.hidden = true;
  $("#flash").hidden = true;
}
function menu() {
  reset(); setScene("menu");
  screen.innerHTML = '<div class="panel"><h1>ローマ字ガンマン</h1><div class="choices menu-buttons"><button id="practice-menu">練習モード</button><button id="battle-menu" class="primary">本番モード</button></div></div>';
  $("#practice-menu").onclick = practiceMenu;
  $("#battle-menu").onclick = battleMenu;
}
$("#home").onclick = menu;

function practiceMenu() {
  reset(); setScene("setup");
  screen.innerHTML = '<div class="panel"><h1>練習モード</h1><p>練習する行を選ぼう。１回に30文字打てます。</p><div class="choices rows"></div></div>';
  for (const [label, symbols] of rowData) {
    const button = document.createElement("button");
    button.textContent = label;
    button.onclick = () => startPractice(label, symbols.includes(" ") ? symbols.split(" ") : [...symbols]);
    $(".rows").append(button);
  }
}
function battleMenu() {
  reset(); setScene("setup");
  const initial = storage.get("romaji-advanced", "0") === "1";
  screen.innerHTML = '<div class="panel"><h1>本番モード</h1><p>ゾンビは１体ずつ。１体につき20秒、５体でクリア！</p><h2>出題することば</h2><div class="choices options"><button id="basic">基本のことば</button><button id="advanced">濁音・拗音もあり</button></div><button id="start" class="primary">第１夜をはじめる</button></div>';
  let includeAdvanced = initial;
  function select(value) {
    includeAdvanced = value;
    $("#basic").setAttribute("aria-pressed",String(!value));
    $("#advanced").setAttribute("aria-pressed",String(value));
  }
  select(initial);
  $("#basic").onclick = () => select(false);
  $("#advanced").onclick = () => select(true);
  $("#start").onclick = () => {
    storage.set("romaji-advanced", includeAdvanced ? "1" : "0");
    startBattle(includeAdvanced);
  };
}
function session(mode, config) {
  reset(); setScene(mode);
  state = {config, wave:0, total:0, targets:[], active:null, pending:"", hint:null, picking:false, elapsed:0, waiting:false, skipN:null};
  weapon.hidden = false;
  previousTime = performance.now();
  nextWave();
}
function startPractice(label, pool) { session("practice", {label,pool}); }
function startBattle(includeAdvanced) {
  session("battle", {includeAdvanced, words:battleWords(includeAdvanced), mobs:shuffle(names.map((_,i)=>i+1)).slice(0,battleRounds)});
}
function addTarget(target,i) {
  const node = document.createElement("div");
  node.className = "target" + (scene === "practice" ? " board" : "");
  target.node = node;
  node.dataset.lane = i;
  const image = document.createElement("img");
  image.alt = target.id ? names[target.id-1] : "";
  image.src = target.id ? sprites[target.id-1].src : "board.webp";
  const word = document.createElement("div");
  word.className = "word";
  target.letters = target.units.map(unit => {
    const span = document.createElement("span");
    span.textContent = unit; word.append(span); return span;
  });
  node.append(image,word);
  area.append(node);
}
function nextWave() {
  if (!state) return;
  state.wave++;
  state.elapsed=0; state.waiting=false; state.active=null; state.pending=""; state.skipN=null;
  area.replaceChildren();
  if (scene === "practice") {
    const pool = state.config.pool;
    state.targets=shuffle(pool).slice(0,Math.min(pool.length,3,30-state.total)).map(word => track(word,null));
    status.textContent = state.config.label + "　" + state.total + " / 30";
  } else {
    const round=state.wave-1;
    state.targets=[track(state.config.words[round], state.config.mobs[round])];
    status.textContent = "第１夜　" + state.wave + " / " + battleRounds;
    play("moan");
  }
  state.targets.forEach(addTarget);
  positionTargets();
}
function positionTargets() {
  const progress=Math.min(1,(state.elapsed/roundTime)**1.48);
  state.targets.forEach((target,i) => {
    let x,y,width;
    if (scene === "practice") {
      x=50+(i-(state.targets.length-1)/2)*22; y=62;
      width="clamp(4rem, 17vw, 13rem)";
    } else {
      x=50+Math.sin(state.elapsed*.009+i)*(.34+.75*progress);
      y=52+35*progress+Math.sin(state.elapsed*.015+i)*(.26+.58*progress);
      width="min("+(7+24*progress)+"vw, "+(8+39*progress)+"vh)";
    }
    target.node.style.setProperty("--x",x+"%");
    target.node.style.setProperty("--y",y+"%");
    target.node.style.setProperty("--w",width);
  });
}
const keyboardRows = ["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"];
function drawKeys(value) {
  keyboard.hidden = false;
  keyboard.replaceChildren();
  keyboard.setAttribute("aria-label", "次に押すキー " + value.toUpperCase());
  for (const row of keyboardRows.concat(value==="'" ? ["'"] : [])) {
    const line=document.createElement("div"); line.className="keyrow";
    for (const key of row) {
      const tile=document.createElement("span");
      tile.className="key"+(key.toLowerCase()===value ? " next":"");
      tile.textContent=key; line.append(tile);
    }
    keyboard.append(line);
  }
}
function refreshHint() {
  if (!state?.hint) { keyboard.hidden=true; return; }
  const target=state.hint;
  const value=spellings(target).find(form=>form.startsWith(state.pending));
  if (value && value[state.pending.length]) drawKeys(value[state.pending.length]);
}
function closeHint() {
  state.hint=null; state.picking=false;
  keyboard.hidden=true; keyboard.replaceChildren();
  $("#hint").textContent="ヒント";
}
function displayHint(target) {
  state.picking=false; state.hint=target;
  $("#hint").textContent="ヒントを閉じる";
  state.active=target;
  markSelection();
  refreshHint();
}
$("#hint").onclick = () => {
  if (!state || state.waiting) return;
  if (state.hint || state.picking) {
    if (state.hint && !state.pending && state.hint.index===0) state.active=null;
    closeHint(); markSelection(); return;
  }
  if (state.active) { displayHint(state.active); return; }
  const remaining=state.targets.filter(target=>!target.done && spellings(target).some(form=>form.startsWith(state.pending)));
  if (remaining.length===1) { displayHint(remaining[0]); return; }
  state.picking=true;
  $("#hint").textContent="ヒントを閉じる";
  keyboard.hidden=false;
  keyboard.innerHTML='<div class="pick"><p>どの文字のヒントを見る？</p><div class="choices"></div></div>';
  for (const target of remaining) {
    const button=document.createElement("button");
    button.textContent=target.word;
    button.onclick=()=>{displayHint(target); $("#hint").focus();};
    $(".pick .choices").append(button);
  }
};
function markSelection() {
  state.targets.forEach(target=>{ target.node.dataset.active=String(target===state.active); });
}
function shoot(target) {
  play("shot");
  weapon.classList.remove("fire");
  target.node.classList.remove("impact");
  void weapon.offsetWidth;
  weapon.classList.add("fire");
  target.node.classList.add("impact");
  const muzzle=weapon.getBoundingClientRect();
  const field=game.getBoundingClientRect();
  const flash=$("#flash");
  flash.style.setProperty("--fx",muzzle.left-field.left+muzzle.width*.12+"px");
  flash.style.setProperty("--fy",muzzle.top-field.top+muzzle.height*.10+"px");
  flash.hidden=false;
  clearTimeout(fireTimer);
  fireTimer=setTimeout(()=>{flash.hidden=true; weapon.classList.remove("fire");},245);
  clearTimeout(flashTimer);
  flashTimer=setTimeout(()=>{flash.hidden=true;},85);
}
function accept(target, matched) {
  const unit=target.units[target.index];
  target.letters[target.index].classList.add("typed");
  target.index++;
  state.pending="";
  state.skipN=unit==="ん" && matched==="n" ? target : null;
  closeHint(); feedback.textContent="";
  shoot(target);
  if (target.index!==target.units.length) return;
  target.done=true; state.active=null; state.skipN=null; state.total++;
  markSelection();
  target.node.classList.add(scene==="practice" ? "hit" : "down");
  if (scene==="practice") status.textContent=state.config.label+"　"+state.total+" / 30";
  if (!state.targets.every(item=>item.done)) return;
  state.waiting=true;
  const token=ticket;
  setTimeout(()=>{
    if (ticket!==token) return;
    if (scene==="practice" ? state.total===30 : state.wave===battleRounds) finish(true);
    else nextWave();
  },scene==="practice" ? 380 : 690);
}
window.addEventListener("keydown", event => {
  if (!state || state.waiting || !["practice","battle"].includes(scene) || event.ctrlKey || event.altKey || event.metaKey || event.repeat || event.target.matches("input")) return;
  if (event.key==="Escape" && (state.hint || state.picking)) { $("#hint").click(); return; }
  if (state.picking) return;
  const code=/^Key([A-Z])$/.exec(event.code);
  const key=code ? code[1].toLowerCase() : event.code==="Quote" ? "'" : event.key.toLowerCase();
  if (!/^[a-z']$/.test(key)) return;
  event.preventDefault();
  if (state.skipN && (key==="n" || key==="'")) { state.skipN=null; return; }
  state.skipN=null;
  const candidates=state.active ? [state.active] : state.targets.filter(target=>!target.done);
  const proposal=state.pending+key;
  const matches=candidates.filter(target=>spellings(target).some(form=>form.startsWith(proposal)));
  if (!matches.length) { feedback.textContent="もう一度、同じところから打ってみよう"; return; }
  state.pending=proposal;
  if (matches.length===1) state.active=matches[0];
  markSelection();
  const complete=matches.find(target=>spellings(target).includes(proposal));
  if (complete) { state.active=complete; accept(complete,proposal); } else { feedback.textContent=""; refreshHint(); }
});
function finish(won) {
  const mode=scene, config=state.config, total=state.total;
  const replay=()=>mode==="practice" ? startPractice(config.label,config.pool) : startBattle(config.includeAdvanced);
  closeHint(); stopAudio();
  state.waiting=true;
  if (!won) {
    const attacker=state.targets.filter(target=>!target.done).at(-1);
    const mouth=mouths[attacker.id-1];
    attacker.node.style.setProperty("--mouth-x",(-100*mouth[0])+"%");
    attacker.node.style.setProperty("--mouth-y",(-100*mouth[1])+"%");
    area.replaceChildren(attacker.node); attacker.node.classList.add("bite");
    weapon.hidden=true;
    setScene("loss");
    const token=ticket;
    setTimeout(()=>{ if(token===ticket) play("bite"); },270);
    setTimeout(()=>{ if(token===ticket) result("ゲームオーバー","たおしたゾンビ　"+total+" / "+battleRounds,replay); },590);
  } else {
    reset(); setScene(mode==="battle" ? "clear":"setup");
    result(mode==="battle" ? "クリア！":"練習クリア！",mode==="battle" ? "第１夜　たおしたゾンビ "+total+" / "+battleRounds:"30文字 打てました！",replay);
  }
}
function result(title,detail,replay) {
  const clear=scene==="clear";
  screen.innerHTML='<div class="'+(clear ? 'clear-actions' : 'panel result')+'"><h1>'+title+'</h1><p>'+detail+'</p><div class="choices"><button id="retry" class="primary">もう一回</button><button id="back">メニューへ</button></div></div>';
  if (clear) {
    const score = document.createElement("span");
    score.className = "clear-score";
    score.setAttribute("aria-hidden", "true");
    score.textContent = battleRounds + " / " + battleRounds;
    $(".clear-actions").append(score);
  }
  $("#retry").onclick=replay; $("#back").onclick=menu;
  $("#retry").focus({preventScroll:true});
}
function tick(now) {
  const delta=Math.max(0,now-previousTime);
  previousTime=now;
  if (scene==="battle" && state && !state.waiting) {
    if (!state.hint && !state.picking && !document.hidden) {
      const before=state.elapsed;
      state.elapsed+=delta;
      if (before<9500 && state.elapsed>=9500) play("moan");
      positionTargets();
      if (state.elapsed>=roundTime) finish(false);
    }
  }
  requestAnimationFrame(tick);
}
document.addEventListener("visibilitychange",()=>{previousTime=performance.now(); if(document.hidden) audio.moan.pause();});
menu();
requestAnimationFrame(tick);





