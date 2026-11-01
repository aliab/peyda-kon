// Things a 2-year-old can recognise. Kept visually distinct from each other.
export const OBJECTS = [
  '🐞', '🐟', '🧤', '🍬', '🌷', '☕', '🎈', '🍎', '🍌', '🐶', '🐱', '🚗',
  '⚽', '🧸', '🦆', '🐘', '🌞', '🍓', '🐰', '🚂', '🎁', '🍦', '🦋', '🐢',
  '🥕', '📱', '✉️', '🕯️', '🐸', '🦁', '👟', '☂️', '🚀', '🐻', '🍉', '🍪',
].map((e) => ({ id: e, emoji: e }));

const NUM_COLORS = ['#e8457c', '#3b5bdb', '#f0a500', '#7cc61e', '#d6336c', '#12b8b0', '#9b51e0', '#ff7a1a', '#2f9e44'];
export const NUMBERS = NUM_COLORS.map((color, i) => ({ id: `n${i + 1}`, num: i + 1, color }));

export const PALETTES = [
  { bg1: '#8fd3ff', bg2: '#c9a7ff', panel: '#7c5cff', rim: '#36c5c0', curtain: '#ff5d8f' },
  { bg1: '#ffd56b', bg2: '#ff8fb1', panel: '#ff6b6b', rim: '#ffb347', curtain: '#4dabf7' },
  { bg1: '#a8f0c6', bg2: '#5ec8ff', panel: '#20a39e', rim: '#7bd389', curtain: '#ffb000' },
  { bg1: '#ffc6e0', bg2: '#b28dff', panel: '#e05297', rim: '#ff9ecd', curtain: '#7ed957' },
  { bg1: '#ffe29a', bg2: '#ffa69e', panel: '#ff8a3d', rim: '#ffd166', curtain: '#9b5de5' },
];

export const CHARACTERS = [
  { kind: 'monster', body: '#7ed957', belly: '#d2f7b4', shoe: '#ff7043' },
  { kind: 'bunny', body: '#ff9ecd', belly: '#ffe3f0', shoe: '#7c5cff' },
  { kind: 'alien', body: '#6ec6ff', belly: '#d6f0ff', shoe: '#ffb000' },
  { kind: 'bear', body: '#ffb74d', belly: '#ffe3bd', shoe: '#e8457c' },
];

export function numberSVG(n, color) {
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><text x="50" y="83" text-anchor="middle" font-size="94" font-weight="900" font-family="'Arial Rounded MT Bold','Nunito','Varela Round',system-ui,sans-serif" fill="${color}" stroke="#2b2b2b" stroke-width="7" stroke-linejoin="round" paint-order="stroke">${n}</text></svg>`;
}

const INK = '#2b2b2b';
const line = (d, color, w) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 9}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;

export function characterSVG({ kind, body, belly, shoe }) {
  const s = `stroke="${INK}" stroke-width="5" stroke-linejoin="round"`;
  let top = '';
  if (kind === 'monster') {
    top = `<path d="M62 70 L50 22 L88 56 Z" fill="#fff3b0" ${s}/><path d="M138 70 L150 22 L112 56 Z" fill="#fff3b0" ${s}/>`;
  } else if (kind === 'bunny') {
    top = `<g class="earL"><ellipse cx="74" cy="34" rx="15" ry="38" fill="${body}" ${s}/><ellipse cx="74" cy="36" rx="7" ry="25" fill="#ffc2d6"/></g>
           <g class="earR"><ellipse cx="126" cy="34" rx="15" ry="38" fill="${body}" ${s}/><ellipse cx="126" cy="36" rx="7" ry="25" fill="#ffc2d6"/></g>`;
  } else if (kind === 'alien') {
    top = `<path d="M82 62 L64 18" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="64" cy="16" r="10" fill="#ffe14d" ${s}/>
           <path d="M118 62 L136 18" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="136" cy="16" r="10" fill="#ffe14d" ${s}/>`;
  } else {
    top = `<circle cx="54" cy="70" r="22" fill="${body}" ${s}/><circle cx="54" cy="70" r="10" fill="${belly}"/>
           <circle cx="146" cy="70" r="22" fill="${body}" ${s}/><circle cx="146" cy="70" r="10" fill="${belly}"/>`;
  }
  return `<svg class="chr" viewBox="0 0 200 250" aria-hidden="true">
    <g class="legL"><rect x="66" y="172" width="22" height="52" rx="11" fill="${body}" ${s}/><ellipse cx="72" cy="228" rx="24" ry="13" fill="${shoe}" ${s}/></g>
    <g class="legR"><rect x="112" y="172" width="22" height="52" rx="11" fill="${body}" ${s}/><ellipse cx="128" cy="228" rx="24" ry="13" fill="${shoe}" ${s}/></g>
    <g class="armL">${line('M46 128 Q18 108 20 74', body, 14)}<circle cx="20" cy="70" r="11" fill="#fff" ${s}/></g>
    <g class="armR">${line('M154 128 Q182 108 180 74', body, 14)}<circle cx="180" cy="70" r="11" fill="#fff" ${s}/></g>
    ${top}
    <g class="torso">
      <ellipse cx="100" cy="125" rx="68" ry="70" fill="${body}" ${s}/>
      <ellipse cx="100" cy="152" rx="42" ry="34" fill="${belly}"/>
      <circle cx="78" cy="104" r="18" fill="#fff" stroke="${INK}" stroke-width="4"/>
      <circle cx="122" cy="104" r="18" fill="#fff" stroke="${INK}" stroke-width="4"/>
      <g class="pupils"><circle cx="83" cy="106" r="8.5" fill="${INK}"/><circle cx="127" cy="106" r="8.5" fill="${INK}"/>
      <circle cx="86" cy="102" r="3" fill="#fff"/><circle cx="130" cy="102" r="3" fill="#fff"/></g>
      <circle cx="60" cy="134" r="9" fill="#ff7b9c" opacity=".5"/><circle cx="140" cy="134" r="9" fill="#ff7b9c" opacity=".5"/>
      <path d="M74 136 Q100 178 126 136 Z" fill="#7a1f2b" ${s}/>
      <path d="M89 152 Q100 168 111 152 Q100 146 89 152 Z" fill="#ff7b9c"/>
    </g>
  </svg>`;
}
