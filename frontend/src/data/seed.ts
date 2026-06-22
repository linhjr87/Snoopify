export interface SessionItem {
  word: string; phon: string; meaning: string; example: string
  quiz: { correct: string; options: [string, string][] }
  fill: { before: string; after: string; answer: string; hint: string }
}

export const SESSION: SessionItem[] = [
  { word:'resilient', phon:'/rɪˈzɪl.i.ənt/ · adjective', meaning:'có khả năng phục hồi nhanh; kiên cường', example:'She is so resilient — she bounced back within a week.',
    quiz:{ correct:'B', options:[['A','dễ vỡ, mong manh'],['B','có khả năng phục hồi nhanh'],['C','cứng nhắc, không linh hoạt'],['D','hào phóng, rộng lượng']] },
    fill:{ before:'The economy proved remarkably', after:', recovering faster than anyone expected.', answer:'resilient', hint:'r________' } },
  { word:'serendipity', phon:'/ˌser.ənˈdɪp.ə.ti/ · noun', meaning:'sự tình cờ may mắn; duyên may bất ngờ', example:'Finding that little café was pure serendipity.',
    quiz:{ correct:'C', options:[['A','sự xui xẻo'],['B','sự cẩn thận'],['C','sự tình cờ may mắn'],['D','sự tức giận']] },
    fill:{ before:'Finding that little café was pure', after:'.', answer:'serendipity', hint:'s__________' } },
  { word:'meticulous', phon:'/məˈtɪk.jə.ləs/ · adjective', meaning:'tỉ mỉ, kỹ lưỡng, cẩn thận', example:'He kept meticulous records of every transaction.',
    quiz:{ correct:'A', options:[['A','tỉ mỉ, cẩn thận'],['B','cẩu thả'],['C','hào phóng'],['D','vội vàng']] },
    fill:{ before:'He kept', after:'records of every transaction.', answer:'meticulous', hint:'m_________' } },
  { word:'ambiguous', phon:'/æmˈbɪɡ.ju.əs/ · adjective', meaning:'mơ hồ, nước đôi, đa nghĩa', example:'The instructions were ambiguous and confusing.',
    quiz:{ correct:'D', options:[['A','rõ ràng'],['B','chính xác'],['C','ngắn gọn'],['D','mơ hồ, đa nghĩa']] },
    fill:{ before:'The instructions were', after:'and confusing.', answer:'ambiguous', hint:'a________' } },
  { word:'to put off', phon:'phrasal verb', meaning:'trì hoãn, hoãn lại', example:"Don't put off until tomorrow what you can do today.",
    quiz:{ correct:'B', options:[['A','hoàn thành'],['B','trì hoãn'],['C','bắt đầu'],['D','tăng tốc']] },
    fill:{ before:"Don't", after:'until tomorrow what you can do today.', answer:'put off', hint:'p__ o__' } },
]

export interface DeckVM { name: string; tag: string; meta: string; mastery: string; last: string; barW: string; needAttention: boolean }
export const seedDecks: DeckVM[] = [
  { name:'Business English', tag:'chủ đề', meta:'92 thẻ · 12 đến hạn', mastery:'thành thạo 72%', last:'2 ngày trước', barW:'72%', needAttention:false },
  { name:'Idioms & Phrasal', tag:'chủ đề', meta:'58 thẻ · 7 đến hạn', mastery:'thành thạo 44%', last:'hôm qua', barW:'44%', needAttention:false },
  { name:'Lỗi của tôi', tag:'cần chú ý', meta:'23 thẻ · 9 đến hạn', mastery:'thành thạo 28%', last:'hôm nay', barW:'28%', needAttention:true },
  { name:'Grammar Notes', tag:'ngữ pháp', meta:'41 thẻ · 3 đến hạn', mastery:'thành thạo 61%', last:'4 ngày trước', barW:'61%', needAttention:false },
  { name:'Phim & Podcast', tag:'ghi chú', meta:'67 thẻ · 0 đến hạn', mastery:'thành thạo 85%', last:'1 tuần trước', barW:'85%', needAttention:false },
]

export const weeklyBars: { label: string; h: number }[] =
  [['T2',55],['T3',80],['T4',40],['T5',95],['T6',65],['T7',28],['CN',18]].map(([label,h]) => ({ label: label as string, h: h as number }))

export const mastery = [{ label:'Mới', n:96 }, { label:'Đang học', n:177 }, { label:'Thành thạo', n:213 }]
export const needsReview = [{ word:'much vs many', detail:'sai 4×' }, { word:'to put off', detail:'sai 3×' }, { word:'since / for', detail:'sai 3×' }]

export const wordOfDay = { word:'serendipity', phon:'/ˌser.ənˈdɪp.ə.ti/ · noun', meaning:'sự tình cờ may mắn; duyên may bất ngờ', example:'"Finding that café was pure serendipity."' }

export const recentlyAdded = [
  { type:'Từ vựng', title:'resilient', sub:'/rɪˈzɪl.i.ənt/ (adj) có khả năng phục hồi nhanh; kiên cường', when:'hôm nay' },
  { type:'Idiom', title:'to beat around the bush', sub:'nói vòng vo, không vào thẳng vấn đề', when:'hôm qua' },
  { type:'Lỗi', title:'"much" vs "many"', sub:'hay nhầm với danh từ đếm được / không đếm được', when:'2 ngày' },
]

// 126 cells (7 days x 18 weeks); intensity level 0..3 — deterministic, ported from export.
export function makeHeatmap(): number[] {
  const out: number[] = []
  for (let i = 0; i < 126; i++) {
    const v = (i * 53 + 17) % 7
    out.push(v === 0 ? 0 : v < 2 ? 1 : v < 4 ? 2 : 3)
  }
  return out
}

export const sampleJson = [
  '{', '  "deck": "Business English",', '  "topic": "chủ đề",', '  "cards": [', '    {',
  '      "word": "resilient",', '      "phonetic": "/rɪˈzɪl.i.ənt/",', '      "pos": "adjective",',
  '      "meaning": "có khả năng phục hồi nhanh",', '      "example": "She is so resilient."',
  '    }', '  ]', '}',
].join('\n')
