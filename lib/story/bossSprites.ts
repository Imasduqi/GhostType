// Pixel art sprite templates copied from Boss Battle mode
export const BOSS_TEMPLATES = [
  // 1. Slime (Green Slime)
  [
    "................",
    "................",
    "......gggg......",
    "....gggggggg....",
    "...gggggggggg...",
    "..gggggggggggg..",
    "..gkkggggggkkg..",
    ".gkkkkggggkkkkg.",
    ".gkkwkggggkkwkg.",
    ".gggggggggggggg.",
    ".gggggggggggggg.",
    ".gggggkkkkggggg.",
    "..ggggkkkkgggg..",
    "...gggggggggg...",
    "....gggggggg....",
    "................"
  ],
  // 2. Ghost (Spooky Phantasm)
  [
    "................",
    "......wwww......",
    "....wwwwwwww....",
    "...wwwwwwwwww...",
    "..wwwwwwwwwwww..",
    "..wrrwwwwwwrrw..",
    ".wrrrrwwwwrrrrw.",
    ".wrrkrwwwwrrkrw.",
    ".wwwwwwwwwwwwww.",
    ".wwwwwwwwwwwwww.",
    "..wwwwwwwwwwww..",
    "..wwwwwwkwwwww..",
    "...wwwwkkkwww...",
    "...w.ww.ww.w.w...",
    "..w..w..w..w..w.",
    "................"
  ],
  // 3. Goblin (Goblin Vanguard)
  [
    "................",
    "...g........g...",
    "...gg......gg...",
    "..gggggggggggg..",
    "..gkkggggggkkg..",
    ".gkkkkggggkkkkg.",
    ".gkkwkggggkkwkg.",
    ".gggggggggggggg.",
    "..ggggkkkkgggg..",
    "..ggggkkkkgggg..",
    "...gggggggggg...",
    "...rrggggggrr...",
    "..rrrrggggrrrr..",
    "..rr..gggg..rr..",
    "................",
    "................"
  ],
  // 4. Skeleton (Skeletal Guard)
  [
    "......wwww......",
    "....wwwwwwww....",
    "...wwwwwwwwww...",
    "..wwwwwwwwwwww..",
    "..wkkwwwwwwkkw..",
    ".wkkkkwwwwkkkkw.",
    ".wkkkkwwwwkkkkw.",
    ".wwwwwwwwwwwwww.",
    "..wwwwkkkkwwww..",
    "...wwwkkkkwww...",
    "....wwkkkkww....",
    ".....wwkkww.....",
    "....ssssssss....",
    "...ssssssssss...",
    "..ssss..ss..ssss",
    "................"
  ],
  // 5. Demon (Shadow Demon)
  [
    "....yy....yy....",
    "....yyy..yyy....",
    ".....pppppp.....",
    "....pppppppp....",
    "...pppppppppp...",
    "..ppokppppkopp..",
    "..ppokppppkopp..",
    "..pppppppppppp..",
    "...ppppoopppp...",
    "....ppoooopp....",
    ".....pppppp.....",
    "....pppppppp....",
    "...pppppppppp...",
    "..pp..pppp..pp..",
    ".pp....pp....pp.",
    "................"
  ],
  // 6. Dragon (Crimson Drake)
  [
    "......rrrr......",
    ".....rrrrrr.....",
    "....rrrrrrrr....",
    "...rrrrrrrrrr...",
    "..rrryrrrrryrr..",
    "..rrryrrrrryrr..",
    "..rrrrrrrrrrrr..",
    "...rrryyyyrrr...",
    "....rryyyyrr....",
    "....rrrrrrrr....",
    "...rroorrrroor..",
    "..rrooorrrrooor.",
    "..rro.rrrr.orrr.",
    ".rr....rr....rr.",
    "................",
    "................"
  ],
  // 7. Golem (Ancient Golem)
  [
    "................",
    "....ssssssss....",
    "...ssssssssss...",
    "..sscsssssscss..",
    "..sccssssssccs..",
    "..ssssssssssss..",
    "...ssssssssss...",
    "....ssssssss....",
    "...ssssssssss...",
    "..sssscsssscss..",
    "..sscccssscccss..",
    "..ssssssssssss..",
    "..ssss..ss..ssss",
    ".ssss....ss....ss",
    "................",
    "................"
  ],
  // 8. Robot (Iron Colossus / Doppelganger)
  [
    "......bbbb......",
    "....bbbbbbbb....",
    "...bbbbbbbbbb...",
    "..bbrrrrrrrrbb..",
    "..bbrrrrrrrrbb..",
    "..bbbbbbbbbbbb..",
    "...bbbbkkbbbb...",
    "....bbkkkkbb....",
    "...bbbbbbbbbb...",
    "..bbssbbbbssbb..",
    "..bbssbbbbssbb..",
    "..bbbbbbbbbbbb..",
    "...bb......bb...",
    "...bb......bb...",
    "..bbbb....bbbb..",
    "................"
  ]
];

export const HERO_SPRITE = [
  "......yyyy......",
  "....yyyyyyyy....",
  "...yyssssssyy...",
  "..yysssssssskk..",
  "..yysskkssskkw..",
  "..yysssssssskk..",
  "...yyssssssyy...",
  "....rrrrrrrr....",
  "...rrrrrrrrrr...",
  "..rrrssssssrrr..",
  "..rrssssssssrr..",
  "..rrssssssssrr..",
  "...rrssssssrr...",
  "....ssssssss....",
  "....ss....ss....",
  "...sss....sss..."
];

export const BOSS_SPRITES_MAP: Record<string, string[]> = {
  librarian: BOSS_TEMPLATES[1],     // Ghost
  typo_goblin: BOSS_TEMPLATES[2],   // Goblin
  syntax_spider: BOSS_TEMPLATES[4], // Demon
  sentence_warden: BOSS_TEMPLATES[3], // Skeleton
  silent_judge: BOSS_TEMPLATES[6],   // Golem
  doppelganger: BOSS_TEMPLATES[7],   // Robot
  memory_eater: BOSS_TEMPLATES[1],   // Ghost
  glitch_beast: BOSS_TEMPLATES[0],   // Slime
  pixel_tyrant: BOSS_TEMPLATES[7],   // Robot
  the_compiler: BOSS_TEMPLATES[6],   // Golem
  network_phantom: BOSS_TEMPLATES[1], // Ghost
  firewall_dragon: BOSS_TEMPLATES[5], // Dragon
  the_origin: BOSS_TEMPLATES[2]       // Goblin template for old writer
};
