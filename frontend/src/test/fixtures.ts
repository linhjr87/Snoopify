import type { DeckOut, ReviewItemOut, ProgressSummary, HeatmapOut, NeedsReviewItem, WordOfDayOut, CardOut } from '../lib/api-types'

// Mirrors the 5 seed cards, shaped as the /review/session response.
export const reviewSessionFixture: ReviewItemOut[] = [
  {
    card_id: 'c1', word: 'resilient', phonetic: '/rɪˈzɪl.i.ənt/', pos: 'adjective',
    meaning: 'có khả năng phục hồi nhanh; kiên cường',
    example: 'She is so resilient — she bounced back within a week.',
    quiz: { options: [
      { key: 'A', text: 'dễ vỡ, mong manh' },
      { key: 'B', text: 'có khả năng phục hồi nhanh' },
      { key: 'C', text: 'cứng nhắc, không linh hoạt' },
      { key: 'D', text: 'hào phóng, rộng lượng' }], correct_key: 'B' },
    fill: { before: 'The economy proved remarkably', after: ', recovering faster than anyone expected.', answer: 'resilient', hint: 'r________' },
  },
  {
    card_id: 'c2', word: 'serendipity', phonetic: '/ˌser.ənˈdɪp.ə.ti/', pos: 'noun',
    meaning: 'sự tình cờ may mắn; duyên may bất ngờ',
    example: 'Finding that little café was pure serendipity.',
    quiz: { options: [
      { key: 'A', text: 'sự xui xẻo' },
      { key: 'B', text: 'sự cẩn thận' },
      { key: 'C', text: 'sự tình cờ may mắn' },
      { key: 'D', text: 'sự tức giận' }], correct_key: 'C' },
    fill: { before: 'Finding that little café was pure', after: '.', answer: 'serendipity', hint: 's__________' },
  },
  {
    card_id: 'c3', word: 'meticulous', phonetic: '/məˈtɪk.jə.ləs/', pos: 'adjective',
    meaning: 'tỉ mỉ, kỹ lưỡng, cẩn thận',
    example: 'He kept meticulous records of every transaction.',
    quiz: { options: [
      { key: 'A', text: 'tỉ mỉ, cẩn thận' },
      { key: 'B', text: 'cẩu thả' },
      { key: 'C', text: 'hào phóng' },
      { key: 'D', text: 'vội vàng' }], correct_key: 'A' },
    fill: { before: 'He kept', after: 'records of every transaction.', answer: 'meticulous', hint: 'm_________' },
  },
  {
    card_id: 'c4', word: 'ambiguous', phonetic: '/æmˈbɪɡ.ju.əs/', pos: 'adjective',
    meaning: 'mơ hồ, nước đôi, đa nghĩa',
    example: 'The instructions were ambiguous and confusing.',
    quiz: { options: [
      { key: 'A', text: 'rõ ràng' },
      { key: 'B', text: 'chính xác' },
      { key: 'C', text: 'ngắn gọn' },
      { key: 'D', text: 'mơ hồ, đa nghĩa' }], correct_key: 'D' },
    fill: { before: 'The instructions were', after: 'and confusing.', answer: 'ambiguous', hint: 'a________' },
  },
  {
    card_id: 'c5', word: 'put off', phonetic: '', pos: 'phrasal verb',
    meaning: 'trì hoãn, hoãn lại',
    example: "Don't put off until tomorrow what you can do today.",
    quiz: { options: [
      { key: 'A', text: 'hoàn thành' },
      { key: 'B', text: 'trì hoãn' },
      { key: 'C', text: 'bắt đầu' },
      { key: 'D', text: 'tăng tốc' }], correct_key: 'B' },
    fill: { before: "Don't", after: 'until tomorrow what you can do today.', answer: 'put off', hint: 'p__ o__' },
  },
]

export const decksFixture: DeckOut[] = [
  {
    id: 'd1', name: 'Bộ thẻ khởi động', topic: 'từ vựng', count: 5, due_count: 5,
    mastery_pct: 0, last_reviewed_at: null,
    created_at: '2026-06-20T00:00:00Z', updated_at: '2026-06-20T00:00:00Z',
  },
  {
    id: 'd2', name: 'Business English', topic: 'chủ đề', count: 92, due_count: 12,
    mastery_pct: 72, last_reviewed_at: '2026-06-21T00:00:00Z',
    created_at: '2026-06-10T00:00:00Z', updated_at: '2026-06-21T00:00:00Z',
  },
]

export const progressSummaryFixture: ProgressSummary = {
  streak: 12,
  reviews_today: 8,
  mastery: { new: 96, learning: 177, proficient: 213 },
  weekly_bars: [
    { label: 'T2', count: 5 }, { label: 'T3', count: 8 }, { label: 'T4', count: 4 },
    { label: 'T5', count: 9 }, { label: 'T6', count: 6 }, { label: 'T7', count: 2 }, { label: 'CN', count: 0 },
  ],
  due_total: 16,
}

export const heatmapFixture: HeatmapOut = { cells: Array.from({ length: 126 }, (_, i) => i % 4) }

export const needsReviewFixture: NeedsReviewItem[] = [
  { card_id: 'n1', word: 'much vs many', lapses: 4 },
  { card_id: 'n2', word: 'put off', lapses: 3 },
]

export const wordOfDayFixture: WordOfDayOut = {
  card_id: 'c2', word: 'serendipity', phonetic: '/ˌser.ənˈdɪp.ə.ti/', pos: 'noun',
  meaning: 'sự tình cờ may mắn; duyên may bất ngờ',
  example: 'Finding that little café was pure serendipity.',
}

export const recentCardsFixture: CardOut[] = [
  {
    id: 'c1', deck_id: 'd1', word: 'resilient', phonetic: '/rɪˈzɪl.i.ənt/', pos: 'adjective',
    meaning: 'có khả năng phục hồi nhanh', example: 'She is so resilient.',
    ease_factor: 2.5, interval_days: 0, repetitions: 0, lapses: 0,
    due_at: '2026-06-23T00:00:00Z', last_reviewed_at: null,
    created_at: '2026-06-23T00:00:00Z', updated_at: '2026-06-23T00:00:00Z',
  },
]
