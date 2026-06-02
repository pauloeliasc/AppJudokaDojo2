export interface BeltRequirement {
  belt: string;
  kyu: string;
  minAge: string;
  minTime: string;
  kihon?: string[];
  ukemi?: string[];
  nageWaza?: string[];
  osaeKomiWaza?: string[];
  shimeWaza?: string[];
  others?: string[];
}

export const GRADUATION_DATA: BeltRequirement[] = [
  {
    belt: "Branca Ponta Cinza",
    kyu: "11º Kyu",
    minAge: "04-06 anos",
    minTime: "03 meses",
    kihon: ["Ritsu rei (saudação em pé)", "Za rei (saudação ajoelhado)"],
    ukemi: ["Ushiro ukemi (para trás)", "Yoko ukemi (lateral) na posição deitado"],
    nageWaza: ["De-ashi-harai"],
    osaeKomiWaza: ["Kesa-gatame"]
  },
  {
    belt: "Cinza",
    kyu: "10º Kyu",
    minAge: "05-08 anos",
    minTime: "03 meses",
    kihon: ["Shisei (Posturas): Chokuritsu, Seiza, Agura, Kyoshi no Kamae"],
    ukemi: ["Yoko ukemi (agachada/em pé)", "Mae Maemawari ukemi (rolamento para frente)"],
    nageWaza: ["Hiza-guruma", "Sasae-tsurikomi-ashi"],
    osaeKomiWaza: ["Kusure-kesa-gatame"]
  },
  {
    belt: "Cinza Ponta Azul",
    kyu: "9º Kyu",
    minAge: "06-10 anos",
    minTime: "06 meses",
    kihon: ["Kumi kata (Pegada no judogi)"],
    ukemi: ["Ukemi em movimento (Yoko, Ushiro, Mae, Mae-mawari)"],
    nageWaza: ["Uki-goshi", "O-goshi"],
    osaeKomiWaza: ["Tate-shiro-gatame"]
  },
  {
    belt: "Azul",
    kyu: "8º Kyu",
    minAge: "07-11 anos",
    minTime: "06 meses",
    kihon: ["Kuzushi (Desequilíbrio em movimento)"],
    ukemi: ["Ushiro-mawari-ukemi", "Ukemi direto para frente"],
    nageWaza: ["O-soto-gari", "O-uchi-gari", "Seoi-nage", "Ippon-seoi-nage"],
    osaeKomiWaza: ["Ushiro-guessa-gatame", "Demonstrar duas viradas (Uke em decúbito ventral)"],
    others: ["Renraku-waza: Hiza-guruma -> De-ashi-harai", "Kaeshi-waza: Hiza-guruma -> Hiza-guruma"]
  },
  {
    belt: "Azul Ponta Amarela",
    kyu: "7º Kyu",
    minAge: "08+ anos",
    minTime: "06 meses",
    kihon: ["Shisei (Posturas natural e defensiva: Migi/Hidari)"],
    nageWaza: ["Ko-soto-gari", "Ko-uchi-gari", "Koshi-guruma", "Tsuri-komi-goshi"],
    osaeKomiWaza: ["Yoko-shiro-gatame", "Demonstrar duas viradas"],
    others: ["Renraku: Ko-uchi -> O-uchi", "Kaeshi: Ko-uchi -> De-ashi-harai"]
  },
  {
    belt: "Amarela",
    kyu: "6º Kyu",
    minAge: "09+ anos",
    minTime: "06 meses",
    kihon: ["Shintai (Deslocamento): Ayumi ashi, Suriashi, Tsugi ashi"],
    nageWaza: ["Okuri-ashi-harai", "Tai-otoshi", "Harai-goshi", "Uchi-mata"],
    osaeKomiWaza: ["Kami-shiro-gatame", "Três viradas", "Fusegi (defesa) com as pernas"],
    others: ["Nage-no-kata: 1ª série"]
  },
  {
    belt: "Amarela Ponta Laranja",
    kyu: "5º Kyu",
    minAge: "10+ anos",
    minTime: "01 ano",
    nageWaza: ["Ko-soto-gake", "Tsuri-goshi", "Ashi-guruma", "Hane-goshi", "Sode-tsurikomi-goshi", "O-soto-otoshi", "O-soto-gaeshi", "Ko-uchi-gaeshi"],
    osaeKomiWaza: ["Kuzure-kami-shiro-gatame", "Quatro viradas"],
    others: ["Defesas (Fusegi) de técnicas em pé", "Nage-no-kata: 1ª série"]
  },
  {
    belt: "Laranja",
    kyu: "4º Kyu",
    minAge: "11+ anos",
    minTime: "01 ano",
    kihon: ["Kuzushi (8 tipos)", "Tsukuri e Kake"],
    nageWaza: ["Yoko-otoshi", "Harai-tsurikomi-ashi", "Tomoe-nage", "Kata-guruma", "Seoi-otoshi", "Uki-otoshi", "Ushiro-goshi", "Tsubame-gaeshi"],
    osaeKomiWaza: ["Makura-kesa-gatame", "Kata-gatame", "Cinco viradas"],
    others: ["Nage-no-kata: 1ª e 2ª séries"]
  },
  {
    belt: "Verde",
    kyu: "3º Kyu",
    minAge: "12+ anos",
    minTime: "01 ano",
    nageWaza: ["Sumi-gaeshi", "Tani-otoshi", "Sukui-nage", "Utsuri-goshi", "O-guruma", "Uchi-mata-sukashi", "O-uchi-gaeshi", "Hane-goshi-gaeshi"],
    osaeKomiWaza: ["Ura-gatame", "Uki-gatame", "Seis viradas (Nogare kata)", "Passagem de guarda"],
    others: ["Nage-no-kata: 1ª, 2ª e 3ª séries"]
  },
  {
    belt: "Roxa",
    kyu: "2º Kyu",
    minAge: "13+ anos",
    minTime: "01 ano",
    others: ["Classificação técnica completa", "Nage-no-kata: 1ª a 4ª séries"],
    shimeWaza: ["Nami-juji-jime", "Kata-juji-jime", "Gyaku-juji-jime", "Yoko/Ushiro/Mae-sankaku-jime"],
    nageWaza: ["O-soto-guruma", "Uki-waza", "Yoko-wakare", "Yoko-guruma", "Ura-nage", "Sumi-otoshi", "Tawara gaeshi"]
  },
  {
    belt: "Marrom",
    kyu: "1º Kyu",
    minAge: "14+ anos",
    minTime: "01 ano",
    nageWaza: ["Hane-makikomi", "Soto-makikomi", "Yoko-gake", "Yama-arashi", "Obi-tori-gaeshi", "Daki-wakare"],
    shimeWaza: ["Tsukomi-jime", "Sode-guruma-jime", "Hadaka-jime", "Okuri-eri-jime"],
    others: ["Nage-no-kata: Todas as séries"]
  }
];
