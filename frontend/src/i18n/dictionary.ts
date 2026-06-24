import type { Lang } from '../store/types'

export const dict = {
  vn: { learn:'Học tập', decks:'Bộ thẻ', home:'Trang chủ', library:'Thư viện', review:'Ôn tập', add:'Thêm kiến thức', progress:'Tiến độ',
    settings:'Cài đặt', resetProgress:'Đặt lại tiến độ', resetConfirm:'Xoá toàn bộ tiến độ, điểm và phiên đang học?', deleteAll:'Xoá hết', cancel:'Huỷ', resetError:'Không xoá được tiến độ. Thử lại sau.',
    darkMode:'Chế độ tối', language:'Ngôn ngữ',
    greeting:'Chào buổi sáng, Minh.', searchPh:'tìm từ, cụm từ, ghi chú…',
    todaySession:'Phiên ôn tập hôm nay', startReview:'Bắt đầu ôn tập', addTitle:'Thêm kiến thức', importJson:'Nhập từ JSON', newDeck:'+ Bộ thẻ mới',
    progressTitle:'Tiến độ học tập', libraryTitle:'Thư viện', exit:'✕ Thoát', flashcard:'Flashcard', quiz:'Trắc nghiệm', fill:'Điền từ',
    notif:'Thông báo', notifEmpty:'Không có thông báo mới', markRead:'Đánh dấu đã đọc',
    n1:'24 thẻ đến hạn ôn hôm nay', n1t:'Vài phút trước', n2:'Chuỗi 12 ngày — đừng để đứt nhé!', n2t:'Hôm nay', n3:'Từ của ngày: "serendipity"', n3t:'Hôm nay', collapse:'Thu gọn' },
  en: { learn:'Learn', decks:'Decks', home:'Home', library:'Library', review:'Review', add:'Add knowledge', progress:'Progress',
    settings:'Settings', resetProgress:'Reset progress', resetConfirm:'Erase all progress, scores and the current session?', deleteAll:'Erase all', cancel:'Cancel', resetError:'Could not reset progress. Try again.',
    darkMode:'Dark mode', language:'Language',
    greeting:'Good morning, Minh.', searchPh:'search words, phrases, notes…',
    todaySession:"Today's review session", startReview:'Start review', addTitle:'Add knowledge', importJson:'Import JSON', newDeck:'+ New deck',
    progressTitle:'Learning progress', libraryTitle:'Library', exit:'✕ Exit', flashcard:'Flashcard', quiz:'Quiz', fill:'Fill in',
    notif:'Notifications', notifEmpty:'No new notifications', markRead:'Mark as read',
    n1:'24 cards due for review today', n1t:'A few minutes ago', n2:'12-day streak — keep it alive!', n2t:'Today', n3:'Word of the day: "serendipity"', n3t:'Today', collapse:'Collapse' },
} as const

export type Strings = typeof dict[Lang]
