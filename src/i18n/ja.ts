type Rule = { re: RegExp; replace: (match: RegExpMatchArray) => string };

/**
 * Japanese presentation layer for all player-facing strings.
 *
 * Gameplay identifiers and data stay in English so save data, tests and game logic remain stable. UI/Canvas output is
 * translated at the presentation boundary instead. This also catches procedural map/sign text without duplicating
 * translated strings through the simulation code.
 */
const EXACT: Record<string, string> = {
  // Brand / title screen
  'EXCLUSION ZONE': '封鎖区域',
  'SECTOR 7  //  QUARANTINE PERIMETER  //  BLUE HOUR': 'セクター7  //  隔離境界  //  ブルーアワー',
  'NO CARRIER  -  LAST KNOWN POSITION: RESEARCH COMPOUND': '通信途絶  -  最終確認地点: 研究施設',
  'The district has been sealed for nine days. Insert at the checkpoint, clear two contracts, call the bird, and get out before the surge takes the landing zone.':
    '区画封鎖から9日。検問所から侵入し、2件の契約を完遂、回収ヘリを要請して汚染前線が着陸地点を呑み込む前に脱出せよ。',
  DEPLOY: '作戦開始',
  SETTINGS: '設定',
  CONTROLS: '操作',
  'Deploy captures the mouse. Press ESC at any time to pause.': '作戦開始後はマウス操作を固定します。ESCでいつでも一時停止できます。',
  'BEST EXTRACTION': 'ベスト脱出記録',
  'SERVICE RECORD': '作戦記録',
  'NO SUCCESSFUL EXTRACTIONS ON FILE': '脱出成功記録なし',
  'OPERATION BRIEF': '作戦概要',
  'PRIORITY ALPHA': '優先度 ALPHA',
  'CONTRACT ALPHA': '契約 ALPHA',
  'CONTRACT BRAVO': '契約 BRAVO',
  'RESTORE THE RELAY': '中継器を復旧',
  'ELIMINATE THE WARDEN': 'ウォーデンを排除',
  EXTRACT: '脱出',
  'Activate the depot transmitter and hold the marked area while the uplink completes.': '補給拠点の送信機を起動し、アップリンク完了まで指定エリアを確保せよ。',
  'Locate and kill the elite infected inside the research compound.': '研究施設内のエリート感染体「ウォーデン」を発見・排除せよ。',
  'Radio the helicopter, survive the final horde and board before the district seals.': '回収ヘリを要請し、最終襲撃を生き延び、区画封鎖前に搭乗せよ。',
  'Loot caches, buy gear and upgrade weapons along the way. A contamination surge closes in late in the mission.':
    '補給物資を回収し、装備購入と武器強化を行え。作戦後半には汚染前線が接近する。',
  'DEAD SIGNAL: EXCLUSION ZONE  //  SINGLE-PLAYER  //  KEYBOARD AND MOUSE': 'DEAD SIGNAL: 封鎖区域  //  シングルプレイ  //  キーボード & マウス',

  // Pause / results / errors
  'MISSION SUSPENDED': '作戦中断',
  PAUSED: '一時停止',
  RESUME: '再開',
  'RESTART MISSION': 'ミッションを最初から',
  'QUIT TO TITLE': 'タイトルへ戻る',
  CONFIRM: '確認',
  'SIGNAL INTERRUPTED': '通信中断',
  'CLICK TO RESUME': 'タップして再開',
  'The simulation is frozen until you resume.': '再開するまでゲームは停止しています。',
  'OPERATION COMPLETE': '作戦完了',
  'OPERATION TERMINATED': '作戦終了',
  'EXTRACTION SUCCESSFUL': '脱出成功',
  'MISSION FAILED': 'ミッション失敗',
  'TIME SURVIVED': '生存時間',
  KILLS: '撃破数',
  HEADSHOTS: 'ヘッドショット',
  ACCURACY: '命中率',
  CONTRACTS: '契約',
  'SUPPLY CACHES': '補給物資',
  'CASH EARNED': '獲得資金',
  'CASH SPENT': '使用資金',
  'AMMO COLLECTED': '回収弾薬',
  'PLATES COLLECTED': '回収プレート',
  'HIGHEST THREAT': '最高脅威レベル',
  'NEW PERSONAL BEST': '自己ベスト更新',
  REDEPLOY: '再出撃',
  'RETURN TO TITLE': 'タイトルへ戻る',
  'First extraction on file.': '初の脱出成功を記録しました。',
  'Only successful extractions are recorded.': '脱出成功時のみ記録されます。',
  'SYSTEM FAULT': 'システム障害',
  'RELOAD PAGE': 'ページを再読み込み',
  'Unsupported browser': '未対応のブラウザです',
  'DEAD SIGNAL needs WebGL 2 and the Pointer Lock API (desktop keyboard and mouse).': 'DEAD SIGNALのPC版にはWebGL 2とPointer Lock API（キーボード・マウス）が必要です。',
  'SOMETHING WENT WRONG': 'エラーが発生しました',
  'FAILED TO START': '起動に失敗しました',
  'The page is missing its canvas or UI root.': 'ゲーム画面の初期化に必要な要素が見つかりません。',
  'Reload the page to try again.': 'ページを再読み込みして再試行してください。',

  // Loading
  'INITIALISING RENDERER': 'レンダラーを初期化中',
  'SYNTHESISING MATERIALS': 'マテリアルを生成中',
  'BUILDING DISTRICT': '区画を構築中',
  'PREPARING EFFECTS AND AUDIO': 'エフェクトと音声を準備中',
  'RIGGING INFECTED': '感染体を準備中',
  'ARMING SYSTEMS': '戦闘システムを準備中',
  FINALISING: '最終調整中',

  // Settings / controls
  'MOUSE SENSITIVITY': '視点感度',
  'FIELD OF VIEW': '視野角',
  'MASTER VOLUME': 'マスター音量',
  'GRAPHICS QUALITY': '画質',
  'Graphics quality': '画質',
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  'REDUCED MOTION': '画面揺れを軽減',
  'INVERT Y-AXIS': 'Y軸反転',
  'SHOW FPS COUNTER': 'FPSを表示',
  'Quality changes pixel ratio, shadow resolution and post-processing. Reduced motion cuts camera bob, sway and screen shake.':
    '画質設定は描画解像度・影・ポスト処理を変更します。「画面揺れを軽減」はカメラの上下動・揺れ・画面振動を抑えます。',
  MOVE: '移動',
  LOOK: '視点操作',
  FIRE: '射撃',
  'AIM DOWN SIGHTS': '照準（ADS）',
  RELOAD: 'リロード',
  SPRINT: 'ダッシュ',
  JUMP: 'ジャンプ',
  CROUCH: 'しゃがみ',
  INTERACT: '操作',
  'SWITCH WEAPON': '武器切替',
  'THROW GRENADE': 'グレネード投擲',
  'ARMOR PLATE': 'アーマープレート',
  'TACTICAL MAP': '戦術マップ',
  PAUSE: '一時停止',

  // HUD
  FUNDS: '所持金',
  PLATES: 'プレート',
  OBJECTIVES: '目標',
  MISSION: 'ミッション',
  'APPLYING PLATE': 'プレート装着中',
  'TOXIC EXPOSURE': '汚染曝露',
  ENRAGED: '激昂',
  AUTO: 'フルオート',
  PUMP: 'ポンプ',
  SEMI: 'セミオート',
  RELOADING: 'リロード中',
  'NO AMMO': '弾薬なし',
  'RELOAD  [R]': 'リロード  [R]',
  'LOW AMMO': '残弾わずか',
  FULL: '満杯',
  OWNED: '所持済',
  MAXED: '最大強化',
  LOCKED: 'ロック',
  'LOW THREAT': '低脅威',
  'MEDIUM THREAT': '中脅威',
  'HIGH THREAT': '高脅威',
  'THE WARDEN': 'ウォーデン',

  // Mission timers / objectives
  'BOARD - HELICOPTER LEAVES IN': '搭乗 - ヘリ離陸まで',
  'HELICOPTER ETA': 'ヘリ到着まで',
  EXTRACTING: '脱出中',
  'FRONT REACHES LZ IN': '汚染前線到達まで',
  'DISTRICT SEALED IN': '区画封鎖まで',
  UPLINK: 'アップリンク',
  'RETURN TO THE MARKED AREA': '指定エリアへ戻れ',
  'Relay restored': '中継器復旧完了',
  'The Warden is dead': 'ウォーデン排除完了',
  'Complete both contracts to unlock': '2つの契約を完了すると解除',
  'Hold the landing zone until touchdown': '着陸までLZを確保',
  'BOARD THE HELICOPTER': 'ヘリに搭乗せよ',
  Extracted: '脱出完了',
  'Extraction failed': '脱出失敗',

  // Interactions / stations
  'OPEN SUPPLY CACHE': '補給物資を開く',
  'Cash, ammunition, armor plates': '現金・弾薬・アーマープレート',
  'USE SUPPLY CAGE': '補給ステーションを使用',
  'Ammo, armor, grenades, weapons': '弾薬・アーマー・グレネード・武器',
  'USE ARMORY BENCH': '武器強化台を使用',
  'Upgrade your weapons': '武器を強化',
  'ACTIVATE TRANSMITTER': '送信機を起動',
  'RADIO BEACON LOCKED': '無線ビーコンはロック中',
  'Complete both contracts to call extraction': '2つの契約を完了すると回収要請可能',
  'CALL EXTRACTION': '回収を要請',
  'Hold position - the final horde will converge': '位置を維持 - 最終群体が接近する',
  'BOARD HELICOPTER': 'ヘリに搭乗',
  'Extract now': '今すぐ脱出',
  'PRESS NUMBER TO BUY   E / WALK AWAY TO CLOSE   WEAPON BUYS REPLACE THE EQUIPPED WEAPON': '番号で購入   E / 離れる: 閉じる   武器購入は装備中の武器と入れ替え',
  'PRESS 1 / 2 TO UPGRADE   E / WALK AWAY TO CLOSE': '1 / 2で強化   E / 離れる: 閉じる',
  EQUIPPED: '装備中',
  'Empty slot': '空きスロット',
  Empty: '空き',
  'Eight-pellet close-range pump gun': '近距離向け8ペレット・ポンプ式ショットガン',
  'Re-arm a standard-issue weapon': '標準支給武器を再取得',
  'RE-ARM': '再支給',
  'Both standard weapons carried': '標準武器は両方所持中',
  'Fully upgraded': '最大強化済み',
  'Unknown item': '不明なアイテム',
  'Not available': '利用不可',
  'Already full': 'すでに満杯です',
  'Already carried': 'すでに所持しています',
  'Not enough cash': '資金が不足しています',
  'No weapon in that slot': 'そのスロットに武器がありません',
  'Already fully upgraded': 'すでに最大強化済みです',
  'Armor plate acquired': 'アーマープレートを入手',
  'Frag grenades acquired': 'フラググレネードを入手',

  // Radio / mission feedback
  COMMAND: '司令部',
  PILOT: 'パイロット',
  'UPLINK ACTIVE': 'アップリンク起動',
  'Hold the marked area until the transmission completes': '送信完了まで指定エリアを確保せよ',
  'Uplink initiated. Stay inside the marked area. They will come for the signal.': 'アップリンク開始。指定エリアを維持しろ。信号を察知した感染体が集まってくる。',
  'TRANSMITTER ACTIVATED': '送信機を起動',
  'EXTRACTION CALLED': '回収要請送信',
  'Hold the landing zone - helicopter ETA 1:00': '着陸地点を確保 - ヘリ到着まで1:00',
  'Bird is inbound. Hold the perimeter - everything nearby is heading your way.': '回収ヘリが向かっている。境界を維持しろ。周辺の敵がそちらへ集中する。',
  'EXTRACTION REQUESTED': '回収を要請',
  'Industrial depot - armored infected sighted': '工業補給拠点 - 装甲感染体を確認',
  'Contaminated research compound': '汚染研究施設',
  'Outer streets': '外周市街',
  'LEAVING THE RELAY AREA': '中継エリアから離脱中',
  'Uplink progress is draining - return to the marked zone': 'アップリンク進捗が低下中 - 指定エリアへ戻れ',
  "You're outside the relay zone. Get back in there.": '中継エリアから外れている。すぐに戻れ。',
  'TARGET IDENTIFIED': '目標を特定',
  'THE WARDEN - heavily armored. Aim for the head.': 'ウォーデン - 重装甲。頭部を狙え。',
  "That's him. Heavy plating - go for the head and watch for the slam.": '奴だ。重装甲だ、頭部を狙え。叩きつけ攻撃にも注意しろ。',
  'EXTRACTION AVAILABLE': '脱出可能',
  'Proceed to LZ ECHO and signal the helicopter': 'LZ ECHOへ向かい回収ヘリを要請せよ',
  'Both contracts complete. Move to LZ Echo and radio the bird.': '両契約完了。LZ ECHOへ移動して回収ヘリを呼べ。',
  'LAST CALL': '最終警告',
  'The district seals in 60 seconds - call extraction': '区画封鎖まで60秒 - 今すぐ回収を要請せよ',
  'One minute until the district is sealed. Call extraction now.': '区画封鎖まで1分。今すぐ回収を要請しろ。',
  'Insertion confirmed. Two contracts: restore the depot relay and eliminate the Warden. Then radio for extraction at LZ Echo.':
    '侵入を確認。契約は2件、補給拠点の中継器復旧とウォーデン排除。完了後、LZ ECHOで回収を要請せよ。',
  'RELAY RESTORED': '中継器復旧完了',
  'Relay restored. Nice work.': '中継器の復旧を確認。よくやった。',
  'THE WARDEN IS DOWN': 'ウォーデン排除',
  'Confirmed kill. The Warden is down.': '撃破を確認。ウォーデンを排除した。',
  'HELICOPTER INBOUND': '回収ヘリ接近中',
  'Survive until touchdown': '着陸まで生き延びろ',
  'Bird on approach. Mark your position.': '着陸地点へ接近中。位置を示せ。',
  'Coming in hot - clear the pad!': '強行着陸する。着陸地点を空けろ！',
  'HELICOPTER LANDED': '回収ヘリ着陸',
  'Reach the open door and BOARD NOW': '開いたドアへ向かい、今すぐ搭乗せよ',
  "We're on the ground - get aboard, now!": '着陸した。今すぐ乗れ！',
  'HELICOPTER DEPARTED': '回収ヘリ離脱',
  'You missed the extraction': '回収に間に合わなかった',
  'CONTAINMENT FAILING': '封じ込め崩壊',
  'A contamination surge begins in 20 seconds': '20秒後に汚染前線が拡大する',
  'Containment is failing at the compound. Surge in twenty seconds.': '研究施設の封じ込めが崩壊中。20秒後に汚染前線が拡大する。',
  'CONTAMINATION SURGE': '汚染前線拡大',
  'OPERATION DEAD SIGNAL': '作戦 DEAD SIGNAL',
  'Contain the outbreak. Restore the relay. Kill the Warden. Extract.': '感染拡大を封じ、中継器を復旧、ウォーデンを排除して脱出せよ。',
  'POINTER LOCK WAS BLOCKED - CLICK TO TRY AGAIN': 'マウス固定がブロックされました - タップして再試行',
  'PAUSED - CLICK TO RESUME': '一時停止中 - タップして再開',

  // End reasons
  'Killed before boarding the helicopter': 'ヘリ搭乗前に死亡',
  'Killed in action': '作戦中に死亡',
  'The district was sealed before extraction was called': '回収要請前に区画が封鎖された',
  'The helicopter departed without you': '回収ヘリが先に離脱した',

  // Map / world signage
  OBJECTIVE: '目標',
  'SUPPLY CAGE': '補給ステーション',
  'ARMORY BENCH': '武器強化台',
  'SUPPLY CACHE': '補給物資',
  'LANDING ZONE': '着陸地点',
  INSERTION: '侵入地点',
  'HUNT TARGET': '討伐対象',
  'EXTRACTION BIRD': '回収ヘリ',
  RELAY: '中継器',
  GATE: 'ゲート',
  LANDMARK: 'ランドマーク',
  HELICOPTER: 'ヘリコプター',
  'SEARCH AREA': '捜索区域',
  SUPPLY: '補給',
  ARMORY: '武器庫',
  SPIRE: 'スパイア',
  LEGEND: '凡例',
  YOU: '現在地',
  'HOSTILE (ALERTED)': '敵性反応（警戒中）',
  CONTAMINATION: '汚染域',
  'THREAT LEVEL': '脅威レベル',
  'PRESS  M  TO CLOSE  //  NORTH UP': 'Mで閉じる  //  北が上',
  'SECTOR 7 PERIMETER': 'セクター7境界',
  'ROUTE 9': 'ルート9',
  'DEPOT ROAD': '補給拠点通り',
  'SOUTH STREET': '南通り',
  'WEST AVENUE': '西大通り',
  'NORTH ROAD': '北通り',
  'CORNER STORE': '商店',
  PARKING: '駐車場',
  APARTMENTS: '集合住宅',
  DEPOT: '補給拠点',
  WAREHOUSE: '倉庫',
  'RESEARCH COMPOUND': '研究施設',
  CHECKPOINT: '検問所',
  SIERRA: 'SIERRA',
  'ENTRY ONLY': '入口専用',
  QUARANTINE: '隔離区域',
  ZONE: '区域',
  'NO ENTRY': '立入禁止',
  RESEARCH: '研究施設',
  COMPOUND: '施設',
  'AUTHORIZED ONLY': '許可者のみ',
  'DEPOT 4': '補給拠点4',
  'FREIGHT ONLY': '貨物専用',
  HELIPAD: 'ヘリポート',
  EAST: '東',
  WEST: '西',

  // Enemies / pickups
  Shambler: 'シャンブラー',
  Runner: 'ランナー',
  'Armored Infected': '装甲感染体',
};

const EXACT_CI = new Map(Object.entries(EXACT).map(([key, value]) => [key.toLocaleUpperCase('en-US'), value]));

const RULES: Rule[] = [
  {
    re: /^(\d[\d,]*) KILLS\s*\/\s*(\d[\d,]*) HEADSHOTS\s*\/\s*(\$[\d,]+)\s*\/\s*(.+)$/i,
    replace: (m) => `${m[1]} 撃破  /  ${m[2]} ヘッドショット  /  ${m[3]}  /  ${m[4]}`,
  },
  { re: /^(\d[\d,]*) kills\s*\/\s*(\d[\d,]*) headshots\s*\/\s*(\$[\d,]+)$/i, replace: (m) => `${m[1]} 撃破  /  ${m[2]} ヘッドショット  /  ${m[3]}` },
  { re: /^([+-]?\d+:\d{2}) vs this run$/i, replace: (m) => `今回との差 ${m[1]}` },
  { re: /^(\d+:\d{2}) extraction time recorded$/i, replace: (m) => `脱出時間 ${m[1]} を記録` },
  { re: /^Activate the transmitter at the depot \((\d+) m\)$/i, replace: (m) => `補給拠点の送信機を起動（${m[1]} m）` },
  { re: /^Hold the area - (\d+)%$/i, replace: (m) => `指定エリアを確保 - ${m[1]}%` },
  { re: /^Eliminate THE WARDEN \((\d+) m\)$/i, replace: (m) => `ウォーデンを排除（${m[1]} m）` },
  { re: /^Search the research compound \((\d+) m\)$/i, replace: (m) => `研究施設を捜索（${m[1]} m）` },
  { re: /^Signal the helicopter at LZ ECHO \((\d+) m\)$/i, replace: (m) => `LZ ECHOで回収ヘリを要請（${m[1]} m）` },
  { re: /^Hold the marked area for ([\d.]+)s while the uplink completes$/i, replace: (m) => `アップリンク完了まで指定エリアを${m[1]}秒確保` },
  { re: /^FUNDS\s+(\$[\d,]+)$/i, replace: (m) => `所持金  ${m[1]}` },
  { re: /^AMMO - SLOT (\d+)$/i, replace: (m) => `弾薬 - スロット ${m[1]}` },
  { re: /^AMMO - (.+)$/i, replace: (m) => `弾薬 - ${m[1]}` },
  { re: /^Refill magazine and reserve \((\d+)\/(\d+)\)$/i, replace: (m) => `マガジンと予備弾を補充（${m[1]}/${m[2]}）` },
  { re: /^\+(\d+) armor when applied \(carrying (\d+)\/(\d+)\)$/i, replace: (m) => `使用時アーマー +${m[1]}（所持 ${m[2]}/${m[3]}）` },
  { re: /^Carrying (\d+)\/(\d+)$/i, replace: (m) => `所持 ${m[1]}/${m[2]}` },
  { re: /^FRAG GRENADES x(\d+)$/i, replace: (m) => `フラググレネード x${m[1]}` },
  { re: /^SLOT (\d+)$/i, replace: (m) => `スロット ${m[1]}` },
  { re: /^REPLACES (.+)$/i, replace: (m) => `${m[1]}と入れ替え` },
  { re: /^(.+) replaces (.+)$/i, replace: (m) => `${m[2]}と入れ替えて${m[1]}を装備` },
  { re: /^(.+) acquired$/i, replace: (m) => `${m[1]}を入手` },
  { re: /^(.+) resupplied$/i, replace: (m) => `${m[1]}の弾薬を補充` },
  { re: /^(.+) upgraded to (.+)$/i, replace: (m) => `${m[1]}を${m[2]}へ強化` },
  { re: /^(.+) -> (.+)$/, replace: (m) => `${m[1]} → ${m[2]}` },
  { re: /^\+(\d+) AMMO$/i, replace: (m) => `弾薬 +${m[1]}` },
  { re: /^\+(\d+) (.+) AMMO$/i, replace: (m) => `${m[2]} 弾薬 +${m[1]}` },
  { re: /^\+(\d+) ARMOR PLATES?$/i, replace: (m) => `アーマープレート +${m[1]}` },
  { re: /^\+(\d+) FRAG GRENADES?$/i, replace: (m) => `フラググレネード +${m[1]}` },
  { re: /^ARMOR \+(\d+)$/i, replace: (m) => `アーマー +${m[1]}` },
  { re: /^SUPPLY CACHE\s+\+(\$[\d,]+)$/i, replace: (m) => `補給物資  +${m[1]}` },
  { re: /^CONTRACT COMPLETE\s+\+(\$[\d,]+)$/i, replace: (m) => `契約完了  +${m[1]}` },
  { re: /^\+(\$[\d,]+)\s+(.+?)(\s+HEADSHOT)?$/i, replace: (m) => `+${m[1]}  ${translateJa(m[2]!.trim())}${m[3] ? '  ヘッドショット' : ''}` },
  { re: /^YOU ARE IN:\s*(.+)$/i, replace: (m) => `現在区域: ${translateJa(m[1]!)}` },
  { re: /^X ([-\d]+)\s+Z ([-\d]+)\s+HDG (\d+)°$/i, replace: (m) => `X ${m[1]}   Z ${m[2]}   方位 ${m[3]}°` },
  { re: /^(.+) AT LZ ECHO$/i, replace: (m) => `${translateJa(m[1]!)} - LZ ECHO` },
];

export function translateJa(input: string): string {
  if (!input) return input;
  const exact = EXACT_CI.get(input.toLocaleUpperCase('en-US'));
  if (exact !== undefined) return exact;
  for (const rule of RULES) {
    const m = input.match(rule.re);
    if (m) return rule.replace(m);
  }
  return input;
}

let canvasInstalled = false;

function installCanvasTranslation(): void {
  if (canvasInstalled || typeof CanvasRenderingContext2D === 'undefined') return;
  canvasInstalled = true;
  const proto = CanvasRenderingContext2D.prototype;
  const fill = proto.fillText;
  const stroke = proto.strokeText;
  proto.fillText = function (text: string, x: number, y: number, maxWidth?: number): void {
    const ja = translateJa(String(text));
    if (maxWidth === undefined) fill.call(this, ja, x, y);
    else fill.call(this, ja, x, y, maxWidth);
  };
  proto.strokeText = function (text: string, x: number, y: number, maxWidth?: number): void {
    const ja = translateJa(String(text));
    if (maxWidth === undefined) stroke.call(this, ja, x, y);
    else stroke.call(this, ja, x, y, maxWidth);
  };
}

/** Install Japanese document metadata, font fallbacks and Canvas text translation before the game builds its UI/world. */
export function installJapanesePresentation(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = 'ja';
  document.documentElement.dataset.language = 'ja';
  document.title = 'DEAD SIGNAL: 封鎖区域';
  if (!document.querySelector('style[data-ja-ui]')) {
    const style = document.createElement('style');
    style.dataset.jaUi = 'true';
    style.textContent = `
      html[data-language="ja"] .ds-hud,
      html[data-language="ja"] .ds-menus {
        --ds-font-label: "Noto Sans JP", "Yu Gothic UI", "Hiragino Sans", Meiryo, system-ui, sans-serif;
        letter-spacing: .035em;
      }
      html[data-language="ja"] .ds-hud .ds-panel-head,
      html[data-language="ja"] .ds-menus .ds-panel-head { letter-spacing: .12em; }
      html[data-language="ja"] .ds-radio .text,
      html[data-language="ja"] .ds-banner .sub { letter-spacing: .025em; }
    `;
    document.head.appendChild(style);
  }
  installCanvasTranslation();
}
