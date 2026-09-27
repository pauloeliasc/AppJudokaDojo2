/**
 * Mapeamento oficial dos vídeos da playlist Kodokan × IJF Academy 100 Techniques
 * Playlist URL: https://www.youtube.com/watch?v=_GxcFx8LZRk&list=PLtz539PTepc16H2iu5F3Q3D7_He1EYlIQ
 * Playlist ID: PLtz539PTepc16H2iu5F3Q3D7_He1EYlIQ
 */

export const KODOKAN_PLAYLIST_ID = 'PLtz539PTepc16H2iu5F3Q3D7_He1EYlIQ';
export const KODOKAN_PLAYLIST_URL = `https://www.youtube.com/watch?v=_GxcFx8LZRk&list=${KODOKAN_PLAYLIST_ID}`;

export interface KodokanVideoEntry {
  id: string; // YouTube Video ID
  techniqueSlug: string;
  romaji: string;
  kanji: string;
  fullTitle: string;
  category: string;
}

export const KODOKAN_VIDEOS_MAP: Record<string, KodokanVideoEntry> = {
  // --- TE-WAZA (Técnicas de Braço) ---
  'seoi-nage': {
    id: '_GxcFx8LZRk',
    techniqueSlug: 'seoi-nage',
    romaji: 'Seoi-nage',
    kanji: '背負投',
    fullTitle: '背負投 / Seoi-nage',
    category: 'Te-waza'
  },
  'ippon-seoi-nage': {
    id: 'zIq0xI0ogxk',
    techniqueSlug: 'ippon-seoi-nage',
    romaji: 'Ippon-seoi-nage',
    kanji: '一本背負投',
    fullTitle: '一本背負投 / Ippon-seoi-nage',
    category: 'Te-waza'
  },
  'seoi-otoshi': {
    id: 'FQnOlCxo4oI',
    techniqueSlug: 'seoi-otoshi',
    romaji: 'Seoi-otoshi',
    kanji: '背負落',
    fullTitle: '背負落 / Seoi-otoshi',
    category: 'Te-waza'
  },
  'tai-otoshi': {
    id: 'vu1TMVNnq34',
    techniqueSlug: 'tai-otoshi',
    romaji: 'Tai-otoshi',
    kanji: '体落',
    fullTitle: '体落 / Tai-otoshi',
    category: 'Te-waza'
  },
  'kata-guruma': {
    id: '4x6S3Q-Ktv8',
    techniqueSlug: 'kata-guruma',
    romaji: 'Kata-guruma',
    kanji: '肩車',
    fullTitle: '肩車 / Kata-guruma',
    category: 'Te-waza'
  },
  'sukui-nage': {
    id: 'cnHRhSy8yi4',
    techniqueSlug: 'sukui-nage',
    romaji: 'Sukui-nage',
    kanji: '掬投',
    fullTitle: '掬投 / Sukui-nage',
    category: 'Te-waza'
  },
  'obi-otoshi': {
    id: 'vU6aJ2kFxoI',
    techniqueSlug: 'obi-otoshi',
    romaji: 'Obi-otoshi',
    kanji: '帯落',
    fullTitle: '帯落 / Obi-otoshi',
    category: 'Te-waza'
  },
  'uki-otoshi': {
    id: 'ff8U2TVZIYI',
    techniqueSlug: 'uki-otoshi',
    romaji: 'Uki-otoshi',
    kanji: '浮落',
    fullTitle: '浮落 / Uki-otoshi',
    category: 'Te-waza'
  },
  'sumi-otoshi': {
    id: '6H5tmncOY4Q',
    techniqueSlug: 'sumi-otoshi',
    romaji: 'Sumi-otoshi',
    kanji: '隅落',
    fullTitle: '隅落 / Sumi-otoshi',
    category: 'Te-waza'
  },
  'yama-arashi': {
    id: 'lLU9wv52ni0',
    techniqueSlug: 'yama-arashi',
    romaji: 'Yama-arashi',
    kanji: '山嵐',
    fullTitle: '山嵐 / Yama-arashi',
    category: 'Te-waza'
  },
  'obi-tori-gaeshi': {
    id: 'MGlyKmSuzdc',
    techniqueSlug: 'obi-tori-gaeshi',
    romaji: 'Obi-tori-gaeshi',
    kanji: '帯取返',
    fullTitle: '帯取返 / Obi-tori-gaeshi',
    category: 'Te-waza'
  },
  'morote-gari': {
    id: 'bpc82SrunUU',
    techniqueSlug: 'morote-gari',
    romaji: 'Morote-gari',
    kanji: '双手刈',
    fullTitle: '双手刈 / Morote-gari',
    category: 'Te-waza'
  },
  'kuchiki-taoshi': {
    id: 'BHLQS4K85bs',
    techniqueSlug: 'kuchiki-taoshi',
    romaji: 'Kuchiki-taoshi',
    kanji: '朽木倒',
    fullTitle: '朽木倒 / Kuchiki-taoshi',
    category: 'Te-waza'
  },
  'kibisu-gaeshi': {
    id: 'ZNL47q1aJNY',
    techniqueSlug: 'kibisu-gaeshi',
    romaji: 'Kibisu-gaeshi',
    kanji: '踵返',
    fullTitle: '踵返 / Kibisu-gaeshi',
    category: 'Te-waza'
  },
  'uchi-mata-sukashi': {
    id: 'tJylJYfBliA',
    techniqueSlug: 'uchi-mata-sukashi',
    romaji: 'Uchi-mata-sukashi',
    kanji: '内股すかし',
    fullTitle: '内股すかし / Uchi-mata-sukashi',
    category: 'Te-waza'
  },
  'ko-uchi-gaeshi': {
    id: 'V-RS3uhtVWM',
    techniqueSlug: 'ko-uchi-gaeshi',
    romaji: 'Ko-uchi-gaeshi',
    kanji: '小内返',
    fullTitle: '小内返 / Ko-uchi-gaeshi',
    category: 'Te-waza'
  },

  // --- KOSHI-WAZA (Técnicas de Quadril) ---
  'uki-goshi': {
    id: 'z5qYfCEcZOU',
    techniqueSlug: 'uki-goshi',
    romaji: 'Uki-goshi',
    kanji: '浮腰',
    fullTitle: '浮腰 / Uki-goshi',
    category: 'Koshi-waza'
  },
  'o-goshi': {
    id: 'bPKwtB4lyOQ',
    techniqueSlug: 'o-goshi',
    romaji: 'O-goshi',
    kanji: '大腰',
    fullTitle: '大腰 / O-goshi',
    category: 'Koshi-waza'
  },
  'koshi-guruma': {
    id: 'yhu1mfy2vJ4',
    techniqueSlug: 'koshi-guruma',
    romaji: 'Koshi-guruma',
    kanji: '腰車',
    fullTitle: '腰車 / Koshi-guruma',
    category: 'Koshi-waza'
  },
  'tsurikomi-goshi': {
    id: 'SU7Id6uVJ44',
    techniqueSlug: 'tsurikomi-goshi',
    romaji: 'Tsurikomi-goshi',
    kanji: '釣込腰',
    fullTitle: '釣込腰 / Tsurikomi-goshi',
    category: 'Koshi-waza'
  },
  'sode-tsurikomi-goshi': {
    id: 'McfzA0yRVt4',
    techniqueSlug: 'sode-tsurikomi-goshi',
    romaji: 'Sode-tsurikomi-goshi',
    kanji: '袖釣込腰',
    fullTitle: '袖釣込腰 / Sode-tsurikomi-goshi',
    category: 'Koshi-waza'
  },
  'harai-goshi': {
    id: 'QsmAxpmYLOI',
    techniqueSlug: 'harai-goshi',
    romaji: 'Harai-goshi',
    kanji: '払腰',
    fullTitle: '払腰 / Harai-goshi',
    category: 'Koshi-waza'
  },
  'tsuri-goshi': {
    id: 'qTo8HlAAkOo',
    techniqueSlug: 'tsuri-goshi',
    romaji: 'Tsuri-goshi',
    kanji: '釣腰',
    fullTitle: '釣腰 / Tsuri-goshi',
    category: 'Koshi-waza'
  },
  'hane-goshi': {
    id: '51Htlp7xEvE',
    techniqueSlug: 'hane-goshi',
    romaji: 'Hane-goshi',
    kanji: '跳腰',
    fullTitle: '跳腰 / Hane-goshi',
    category: 'Koshi-waza'
  },
  'utsuri-goshi': {
    id: 'M9_7De6A1kk',
    techniqueSlug: 'utsuri-goshi',
    romaji: 'Utsuri-goshi',
    kanji: '移腰',
    fullTitle: '移腰 / Utsuri-goshi',
    category: 'Koshi-waza'
  },
  'ushiro-goshi': {
    id: '4pQd_bEnlf0',
    techniqueSlug: 'ushiro-goshi',
    romaji: 'Ushiro-goshi',
    kanji: '後腰',
    fullTitle: '後腰 / Ushiro-goshi',
    category: 'Koshi-waza'
  },

  // --- ASHI-WAZA (Técnicas de Perna) ---
  'de-ashi-harai': {
    id: 'cgIby7HnKzA',
    techniqueSlug: 'de-ashi-harai',
    romaji: 'De-ashi-harai',
    kanji: '出足払',
    fullTitle: '出足払 / De-ashi-harai',
    category: 'Ashi-waza'
  },
  'hiza-guruma': {
    id: '4BUUvqxi_Kk',
    techniqueSlug: 'hiza-guruma',
    romaji: 'Hiza-guruma',
    kanji: '膝車',
    fullTitle: '膝車 / Hiza-guruma',
    category: 'Ashi-waza'
  },
  'sasae-tsurikomi-ashi': {
    id: 'JPJx9-oAVns',
    techniqueSlug: 'sasae-tsurikomi-ashi',
    romaji: 'Sasae-tsurikomi-ashi',
    kanji: '支釣込足',
    fullTitle: '支釣込足 / Sasae-tsurikomi-ashi',
    category: 'Ashi-waza'
  },
  'o-soto-gari': {
    id: '699i--pvYmE',
    techniqueSlug: 'o-soto-gari',
    romaji: 'O-soto-gari',
    kanji: '大外刈',
    fullTitle: '大外刈 / O-soto-gari',
    category: 'Ashi-waza'
  },
  'o-uchi-gari': {
    id: 'c-A_nP7mKAc',
    techniqueSlug: 'o-uchi-gari',
    romaji: 'O-uchi-gari',
    kanji: '大内刈',
    fullTitle: '大内刈 / O-uchi-gari',
    category: 'Ashi-waza'
  },
  'ko-soto-gari': {
    id: '0itJFhV9pDQ',
    techniqueSlug: 'ko-soto-gari',
    romaji: 'Ko-soto-gari',
    kanji: '小外刈',
    fullTitle: '小外刈 / Ko-soto-gari',
    category: 'Ashi-waza'
  },
  'ko-uchi-gari': {
    id: 'jeQ541ScLB4',
    techniqueSlug: 'ko-uchi-gari',
    romaji: 'Ko-uchi-gari',
    kanji: '小内刈',
    fullTitle: '小内刈 / Ko-uchi-gari',
    category: 'Ashi-waza'
  },
  'okuri-ashi-harai': {
    id: '3Jb3tZvr9Ng',
    techniqueSlug: 'okuri-ashi-harai',
    romaji: 'Okuri-ashi-harai',
    kanji: '送足払',
    fullTitle: '送足払 / Okuri-ashi-harai',
    category: 'Ashi-waza'
  },
  'uchi-mata': {
    id: 'nw1ZdRjrdRI',
    techniqueSlug: 'uchi-mata',
    romaji: 'Uchi-mata',
    kanji: '内股',
    fullTitle: '内股 / Uchi-mata',
    category: 'Ashi-waza'
  },
  'ko-soto-gake': {
    id: 'iUpSu5J-bgw',
    techniqueSlug: 'ko-soto-gake',
    romaji: 'Ko-soto-gake',
    kanji: '小外掛',
    fullTitle: '小外掛 / Ko-soto-gake',
    category: 'Ashi-waza'
  },
  'ashi-guruma': {
    id: '8b6kY4s4zH4',
    techniqueSlug: 'ashi-guruma',
    romaji: 'Ashi-guruma',
    kanji: '足車',
    fullTitle: '足車 / Ashi-guruma',
    category: 'Ashi-waza'
  },
  'harai-tsurikomi-ashi': {
    id: 'ROeayhvom9U',
    techniqueSlug: 'harai-tsurikomi-ashi',
    romaji: 'Harai-tsurikomi-ashi',
    kanji: '払釣込足',
    fullTitle: '払釣込足 / Harai-tsurikomi-ashi',
    category: 'Ashi-waza'
  },
  'o-guruma': {
    id: 'gGPXvWL8VbE',
    techniqueSlug: 'o-guruma',
    romaji: 'O-guruma',
    kanji: '大車',
    fullTitle: '大車 / O-guruma',
    category: 'Ashi-waza'
  },
  'o-soto-guruma': {
    id: 'SnZciTAY9vc',
    techniqueSlug: 'o-soto-guruma',
    romaji: 'O-soto-guruma',
    kanji: '大外車',
    fullTitle: '大外車 / O-soto-guruma',
    category: 'Ashi-waza'
  },
  'o-soto-otoshi': {
    id: '92KbCm6pQeI',
    techniqueSlug: 'o-soto-otoshi',
    romaji: 'O-soto-otoshi',
    kanji: '大外落',
    fullTitle: '大外落 / O-soto-otoshi',
    category: 'Ashi-waza'
  },
  'tsubame-gaeshi': {
    id: '2DsVvDw7b8g',
    techniqueSlug: 'tsubame-gaeshi',
    romaji: 'Tsubame-gaeshi',
    kanji: '燕返',
    fullTitle: '燕返 / Tsubame-gaeshi',
    category: 'Ashi-waza'
  },
  'o-soto-gaeshi': {
    id: 'GwweWqqFB5g',
    techniqueSlug: 'o-soto-gaeshi',
    romaji: 'O-soto-gaeshi',
    kanji: '大外返',
    fullTitle: '大外返 / O-soto-gaeshi',
    category: 'Ashi-waza'
  },
  'o-uchi-gaeshi': {
    id: '8ZjM3X_EANo',
    techniqueSlug: 'o-uchi-gaeshi',
    romaji: 'O-uchi-gaeshi',
    kanji: '大内返',
    fullTitle: '大内返 / O-uchi-gaeshi',
    category: 'Ashi-waza'
  },
  'hane-goshi-gaeshi': {
    id: 'dCyZTXyjIXE',
    techniqueSlug: 'hane-goshi-gaeshi',
    romaji: 'Hane-goshi-gaeshi',
    kanji: '跳腰返',
    fullTitle: '跳腰返 / Hane-goshi-gaeshi',
    category: 'Ashi-waza'
  },
  'harai-goshi-gaeshi': {
    id: '9bZAZSBtnGs',
    techniqueSlug: 'harai-goshi-gaeshi',
    romaji: 'Harai-goshi-gaeshi',
    kanji: '払腰返',
    fullTitle: '払腰返 / Harai-goshi-gaeshi',
    category: 'Ashi-waza'
  },
  'uchi-mata-gaeshi': {
    id: '4U3It-7PPsc',
    techniqueSlug: 'uchi-mata-gaeshi',
    romaji: 'Uchi-mata-gaeshi',
    kanji: '内股返',
    fullTitle: '内股返 / Uchi-mata-gaeshi',
    category: 'Ashi-waza'
  },

  // --- MA-SUTEMI-WAZA (Sacrifício Direto) ---
  'tomoe-nage': {
    id: '-Xpmgtaypmg',
    techniqueSlug: 'tomoe-nage',
    romaji: 'Tomoe-nage',
    kanji: '巴投',
    fullTitle: '巴投 / Tomoe-nage',
    category: 'Ma-sutemi-waza'
  },
  'sumi-gaeshi': {
    id: '880WbHvHv6A',
    techniqueSlug: 'sumi-gaeshi',
    romaji: 'Sumi-gaeshi',
    kanji: '隅返',
    fullTitle: '隅返 / Sumi-gaeshi',
    category: 'Ma-sutemi-waza'
  },
  'hikikomi-gaeshi': {
    id: '5VhduA5xkbA',
    techniqueSlug: 'hikikomi-gaeshi',
    romaji: 'Hikikomi-gaeshi',
    kanji: '引込返',
    fullTitle: '引込返 / Hikikomi-gaeshi',
    category: 'Ma-sutemi-waza'
  },
  'tawara-gaeshi': {
    id: '92zUYWBp5N8',
    techniqueSlug: 'tawara-gaeshi',
    romaji: 'Tawara-gaeshi',
    kanji: '俵返',
    fullTitle: '俵返 / Tawara-gaeshi',
    category: 'Ma-sutemi-waza'
  },
  'ura-nage': {
    id: 'TmTWgrmViZc',
    techniqueSlug: 'ura-nage',
    romaji: 'Ura-nage',
    kanji: '裏投',
    fullTitle: '裏投 / Ura-nage',
    category: 'Ma-sutemi-waza'
  },

  // --- YOKO-SUTEMI-WAZA (Sacrifício Lateral) ---
  'yoko-otoshi': {
    id: 'LnjW67efl00',
    techniqueSlug: 'yoko-otoshi',
    romaji: 'Yoko-otoshi',
    kanji: '横落',
    fullTitle: '横落 / Yoko-otoshi',
    category: 'Yoko-sutemi-waza'
  },
  'tani-otoshi': {
    id: 'MnNG67pF_a0',
    techniqueSlug: 'tani-otoshi',
    romaji: 'Tani-otoshi',
    kanji: '谷落',
    fullTitle: '谷落 / Tani-otoshi',
    category: 'Yoko-sutemi-waza'
  },
  'hane-makikomi': {
    id: '3b9Me3Fohpk',
    techniqueSlug: 'hane-makikomi',
    romaji: 'Hane-makikomi',
    kanji: '跳巻込',
    fullTitle: '跳巻込 / Hane-makikomi',
    category: 'Yoko-sutemi-waza'
  },
  'soto-makikomi': {
    id: '6CRBGLGz9j8',
    techniqueSlug: 'soto-makikomi',
    romaji: 'Soto-makikomi',
    kanji: '外巻込',
    fullTitle: '外巻込 / Soto-makikomi',
    category: 'Yoko-sutemi-waza'
  },
  'uchi-makikomi': {
    id: 'bWG9O1BVKtQ',
    techniqueSlug: 'uchi-makikomi',
    romaji: 'Uchi-makikomi',
    kanji: '内巻込',
    fullTitle: '内巻込 / Uchi-makikomi',
    category: 'Yoko-sutemi-waza'
  },
  'uki-waza': {
    id: '5BowcjduxVc',
    techniqueSlug: 'uki-waza',
    romaji: 'Uki-waza',
    kanji: '浮技',
    fullTitle: '浮技 / Uki-waza',
    category: 'Yoko-sutemi-waza'
  },
  'yoko-wakare': {
    id: 'weVOpJ63gII',
    techniqueSlug: 'yoko-wakare',
    romaji: 'Yoko-wakare',
    kanji: '横分',
    fullTitle: '横分 / Yoko-wakare',
    category: 'Yoko-sutemi-waza'
  },
  'yoko-guruma': {
    id: 'bp1tscHlePI',
    techniqueSlug: 'yoko-guruma',
    romaji: 'Yoko-guruma',
    kanji: '横車',
    fullTitle: '横車 / Yoko-guruma',
    category: 'Yoko-sutemi-waza'
  },
  'yoko-gake': {
    id: 'MehP6I5cY2c',
    techniqueSlug: 'yoko-gake',
    romaji: 'Yoko-gake',
    kanji: '横掛',
    fullTitle: '横掛 / Yoko-gake',
    category: 'Yoko-sutemi-waza'
  },
  'daki-wakare': {
    id: 'tP1Sj1uDfSo',
    techniqueSlug: 'daki-wakare',
    romaji: 'Daki-wakare',
    kanji: '抱分',
    fullTitle: '抱分 / Daki-wakare',
    category: 'Yoko-sutemi-waza'
  },
  'o-soto-makikomi': {
    id: 'Hr0cOMGBDYo',
    techniqueSlug: 'o-soto-makikomi',
    romaji: 'O-soto-makikomi',
    kanji: '大外巻込',
    fullTitle: '大外巻込 / O-soto-makikomi',
    category: 'Yoko-sutemi-waza'
  },
  'uchi-mata-makikomi': {
    id: 'DGDv2oMwmas',
    techniqueSlug: 'uchi-mata-makikomi',
    romaji: 'Uchi-mata-makikomi',
    kanji: '内股巻込',
    fullTitle: '内股巻込 / Uchi-mata-makikomi',
    category: 'Yoko-sutemi-waza'
  },
  'harai-makikomi': {
    id: 'jZXENTLpJCI',
    techniqueSlug: 'harai-makikomi',
    romaji: 'Harai-makikomi',
    kanji: '払巻込',
    fullTitle: '払巻込 / Harai-makikomi',
    category: 'Yoko-sutemi-waza'
  },
  'ko-uchi-makikomi': {
    id: 'VBaHzKaCXss',
    techniqueSlug: 'ko-uchi-makikomi',
    romaji: 'Ko-uchi-makikomi',
    kanji: '小内巻込',
    fullTitle: '小内巻込 / Ko-uchi-makikomi',
    category: 'Yoko-sutemi-waza'
  },

  // --- OSAEKOMI-WAZA (Imobilizações) ---
  'kesa-gatame': {
    id: 'ml_eSxz8OMo',
    techniqueSlug: 'kesa-gatame',
    romaji: 'Kesa-gatame',
    kanji: '袈裟固',
    fullTitle: '袈裟固 / Kesa-gatame',
    category: 'Osaekomi-waza'
  },
  'kuzure-kesa-gatame': {
    id: '5_TS0YHdxcQ',
    techniqueSlug: 'kuzure-kesa-gatame',
    romaji: 'Kuzure-kesa-gatame',
    kanji: '崩袈裟固',
    fullTitle: '崩袈裟固 / Kuzure-kesa-gatame',
    category: 'Osaekomi-waza'
  },
  'ushiro-kesa-gatame': {
    id: '-zFQ6h4yKT4',
    techniqueSlug: 'ushiro-kesa-gatame',
    romaji: 'Ushiro-kesa-gatame',
    kanji: '後袈裟固',
    fullTitle: '後袈裟固 / Ushiro-kesa-gatame',
    category: 'Osaekomi-waza'
  },
  'kata-gatame': {
    id: '4QuzAAucQsA',
    techniqueSlug: 'kata-gatame',
    romaji: 'Kata-gatame',
    kanji: '肩固',
    fullTitle: '肩固 / Kata-gatame',
    category: 'Osaekomi-waza'
  },
  'kami-shiho-gatame': {
    id: '7hP1-W2yovk',
    techniqueSlug: 'kami-shiho-gatame',
    romaji: 'Kami-shiho-gatame',
    kanji: '上四方固',
    fullTitle: '上四方固 / Kami-shiho-gatame',
    category: 'Osaekomi-waza'
  },
  'kuzure-kami-shiho-gatame': {
    id: 'seGsXy9I4G8',
    techniqueSlug: 'kuzure-kami-shiho-gatame',
    romaji: 'Kuzure-kami-shiho-gatame',
    kanji: '崩上四方固',
    fullTitle: '崩上四方固 / Kuzure-kami-shiho-gatame',
    category: 'Osaekomi-waza'
  },
  'yoko-shiho-gatame': {
    id: 'PPe7E_7d7UI',
    techniqueSlug: 'yoko-shiho-gatame',
    romaji: 'Yoko-shiho-gatame',
    kanji: '横四方固',
    fullTitle: '横四方固 / Yoko-shiho-gatame',
    category: 'Osaekomi-waza'
  },
  'tate-shiho-gatame': {
    id: 'yK_GSamSPko',
    techniqueSlug: 'tate-shiho-gatame',
    romaji: 'Tate-shiho-gatame',
    kanji: '縦四方固',
    fullTitle: '縦四方固 / Tate-shiho-gatame',
    category: 'Osaekomi-waza'
  },
  'uki-gatame': {
    id: 'JMJBjnst_DA',
    techniqueSlug: 'uki-gatame',
    romaji: 'Uki-gatame',
    kanji: '浮固',
    fullTitle: '浮固 / Uki-gatame',
    category: 'Osaekomi-waza'
  },
  'ura-gatame': {
    id: 'AMHWDFR4ryo',
    techniqueSlug: 'ura-gatame',
    romaji: 'Ura-gatame',
    kanji: '裏固',
    fullTitle: '裏固 / Ura-gatame',
    category: 'Osaekomi-waza'
  },

  // --- SHIME-WAZA (Estrangulamentos) ---
  'nami-juji-jime': {
    id: 'guJ-HlAKEA8',
    techniqueSlug: 'nami-juji-jime',
    romaji: 'Nami-juji-jime',
    kanji: '並十字絞',
    fullTitle: '並十字絞 / Nami-juji-jime',
    category: 'Shime-waza'
  },
  'gyaku-juji-jime': {
    id: 'k2cHry9HByQ',
    techniqueSlug: 'gyaku-juji-jime',
    romaji: 'Gyaku-juji-jime',
    kanji: '逆十字絞',
    fullTitle: '逆十字絞 / Gyaku-juji-jime',
    category: 'Shime-waza'
  },
  'kata-juji-jime': {
    id: 't3tQriIPdlI',
    techniqueSlug: 'kata-juji-jime',
    romaji: 'Kata-juji-jime',
    kanji: '片十字絞',
    fullTitle: '片十字絞 / Kata-juji-jime',
    category: 'Shime-waza'
  },
  'hadaka-jime': {
    id: '3VZVUAmiMD8',
    techniqueSlug: 'hadaka-jime',
    romaji: 'Hadaka-jime',
    kanji: '裸絞',
    fullTitle: '裸絞 / Hadaka-jime',
    category: 'Shime-waza'
  },
  'okuri-eri-jime': {
    id: '9f0n8jez7iA',
    techniqueSlug: 'okuri-eri-jime',
    romaji: 'Okuri-eri-jime',
    kanji: '送襟絞',
    fullTitle: '送襟絞 / Okuri-eri-jime',
    category: 'Shime-waza'
  }
};

/**
 * Normaliza qualquer string de técnica para localizar o vídeo correspondente da playlist oficial.
 * Trata variações de escrita em português/japonês (ex: 'Kusure-kesa-gatame', 'Tate-shiro-gatame', 'Seoi-Nage').
 */
export function findKodokanVideo(nameOrQuery: string): {
  entry: KodokanVideoEntry;
  youtubeUrl: string;
  embedUrl: string;
} | null {
  if (!nameOrQuery) return null;

  const clean = nameOrQuery
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // 1. Direct slug match
  const slug = clean
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (KODOKAN_VIDEOS_MAP[slug]) {
    const entry = KODOKAN_VIDEOS_MAP[slug];
    return {
      entry,
      youtubeUrl: `https://www.youtube.com/watch?v=${entry.id}&list=${KODOKAN_PLAYLIST_ID}`,
      embedUrl: `https://www.youtube.com/embed/${entry.id}?list=${KODOKAN_PLAYLIST_ID}&autoplay=1`
    };
  }

  // 2. Fuzzy / Keyword aliases
  const aliases: Array<{ test: (s: string) => boolean; key: string }> = [
    { test: s => s.includes('ippon') && s.includes('seoi'), key: 'ippon-seoi-nage' },
    { test: s => s.includes('seoi') && !s.includes('otoshi'), key: 'seoi-nage' },
    { test: s => s.includes('de-ashi') || s.includes('deashi'), key: 'de-ashi-harai' },
    { test: s => s.includes('hiza') && s.includes('guruma'), key: 'hiza-guruma' },
    { test: s => s.includes('sasae'), key: 'sasae-tsurikomi-ashi' },
    { test: s => s.includes('o-soto-gari') || s.includes('osoto gari') || s.includes('osotogari'), key: 'o-soto-gari' },
    { test: s => s.includes('o-uchi-gari') || s.includes('ouchi gari') || s.includes('ouchigari'), key: 'o-uchi-gari' },
    { test: s => s.includes('ko-soto-gari') || s.includes('kosoto gari'), key: 'ko-soto-gari' },
    { test: s => s.includes('ko-uchi-gari') || s.includes('kouchi gari'), key: 'ko-uchi-gari' },
    { test: s => s.includes('o-goshi') || s.includes('ogoshi'), key: 'o-goshi' },
    { test: s => s.includes('uki-goshi') || s.includes('ukigoshi'), key: 'uki-goshi' },
    { test: s => s.includes('koshi-guruma') || s.includes('koshiguruma'), key: 'koshi-guruma' },
    { test: s => s.includes('tsurikomi-goshi') || s.includes('tsurikomigoshi'), key: 'tsurikomi-goshi' },
    { test: s => s.includes('sode'), key: 'sode-tsurikomi-goshi' },
    { test: s => s.includes('harai-goshi') || s.includes('haraigoshi'), key: 'harai-goshi' },
    { test: s => s.includes('tsuri-goshi'), key: 'tsuri-goshi' },
    { test: s => s.includes('hane-goshi'), key: 'hane-goshi' },
    { test: s => s.includes('utsuri-goshi'), key: 'utsuri-goshi' },
    { test: s => s.includes('ushiro-goshi'), key: 'ushiro-goshi' },
    { test: s => s.includes('okuri-ashi') || s.includes('okuriashi'), key: 'okuri-ashi-harai' },
    { test: s => s.includes('tai-otoshi') || s.includes('taiotoshi'), key: 'tai-otoshi' },
    { test: s => s.includes('uchi-mata') && !s.includes('sukashi') && !s.includes('gaeshi'), key: 'uchi-mata' },
    { test: s => s.includes('ko-soto-gake') || s.includes('kosotogake'), key: 'ko-soto-gake' },
    { test: s => s.includes('ashi-guruma'), key: 'ashi-guruma' },
    { test: s => s.includes('harai-tsurikomi'), key: 'harai-tsurikomi-ashi' },
    { test: s => s.includes('tomoe-nage') || s.includes('tomoenage'), key: 'tomoe-nage' },
    { test: s => s.includes('kata-guruma') || s.includes('kataguruma'), key: 'kata-guruma' },
    { test: s => s.includes('sumi-gaeshi'), key: 'sumi-gaeshi' },
    { test: s => s.includes('tani-otoshi'), key: 'tani-otoshi' },
    { test: s => s.includes('sukui-nage'), key: 'sukui-nage' },
    { test: s => s.includes('o-guruma'), key: 'o-guruma' },
    { test: s => s.includes('soto-makikomi'), key: 'soto-makikomi' },
    { test: s => s.includes('uki-otoshi'), key: 'uki-otoshi' },
    { test: s => s.includes('o-soto-guruma'), key: 'o-soto-guruma' },
    { test: s => s.includes('uki-waza'), key: 'uki-waza' },
    { test: s => s.includes('yoko-wakare'), key: 'yoko-wakare' },
    { test: s => s.includes('yoko-guruma'), key: 'yoko-guruma' },
    { test: s => s.includes('ura-nage'), key: 'ura-nage' },
    { test: s => s.includes('sumi-otoshi'), key: 'sumi-otoshi' },
    { test: s => s.includes('yoko-gake'), key: 'yoko-gake' },
    { test: s => s.includes('yoko-otoshi'), key: 'yoko-otoshi' },
    
    // Katame / Ne-waza
    { test: s => (s.includes('kusure') || s.includes('kuzure')) && s.includes('kesa'), key: 'kuzure-kesa-gatame' },
    { test: s => s.includes('ushiro') && (s.includes('kesa') || s.includes('guessa')), key: 'ushiro-kesa-gatame' },
    { test: s => s.includes('kesa-gatame') || s.includes('hon-kesa') || s.includes('guessa'), key: 'kesa-gatame' },
    { test: s => s.includes('kata-gatame') || s.includes('katagatame'), key: 'kata-gatame' },
    { test: s => (s.includes('kusure') || s.includes('kuzure')) && s.includes('kami'), key: 'kuzure-kami-shiho-gatame' },
    { test: s => s.includes('kami') && (s.includes('shiho') || s.includes('shiro')), key: 'kami-shiho-gatame' },
    { test: s => s.includes('yoko') && (s.includes('shiho') || s.includes('shiro')), key: 'yoko-shiho-gatame' },
    { test: s => s.includes('tate') && (s.includes('shiho') || s.includes('shiro')), key: 'tate-shiho-gatame' },
    { test: s => s.includes('uki-gatame'), key: 'uki-gatame' },
    { test: s => s.includes('ura-gatame'), key: 'ura-gatame' },
    
    // Shime-waza
    { test: s => s.includes('nami') && s.includes('juji'), key: 'nami-juji-jime' },
    { test: s => s.includes('gyaku') && s.includes('juji'), key: 'gyaku-juji-jime' },
    { test: s => s.includes('kata') && s.includes('juji'), key: 'kata-juji-jime' },
    { test: s => s.includes('hadaka') || s.includes('mata-leao'), key: 'hadaka-jime' },
    { test: s => s.includes('okuri-eri') || s.includes('okurierijime'), key: 'okuri-eri-jime' },
  ];

  for (const alias of aliases) {
    if (alias.test(clean) && KODOKAN_VIDEOS_MAP[alias.key]) {
      const entry = KODOKAN_VIDEOS_MAP[alias.key];
      return {
        entry,
        youtubeUrl: `https://www.youtube.com/watch?v=${entry.id}&list=${KODOKAN_PLAYLIST_ID}`,
        embedUrl: `https://www.youtube.com/embed/${entry.id}?list=${KODOKAN_PLAYLIST_ID}&autoplay=1`
      };
    }
  }

  // Fallback to first video of playlist if not found specifically
  return {
    entry: KODOKAN_VIDEOS_MAP['seoi-nage'],
    youtubeUrl: KODOKAN_PLAYLIST_URL,
    embedUrl: `https://www.youtube.com/embed/_GxcFx8LZRk?list=${KODOKAN_PLAYLIST_ID}&autoplay=1`
  };
}
