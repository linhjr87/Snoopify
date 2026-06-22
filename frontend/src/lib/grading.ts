export const norm = (v: string): string => (v || '').trim().toLowerCase().replace(/\s+/g, ' ')
export const quizIsRight = (pick: string | null, correct: string): boolean => pick === correct
export const fillIsRight = (value: string, answer: string): boolean => norm(value) === norm(answer)
