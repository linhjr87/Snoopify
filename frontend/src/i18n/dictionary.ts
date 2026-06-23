import type { Lang } from '../store/types'

export const dict = {
  vn: { learn:'Học tập', decks:'Bộ thẻ', home:'Trang chủ', library:'Thư viện', review:'Ôn tập', add:'Thêm kiến thức', progress:'Tiến độ',
    settings:'Cài đặt', resetProgress:'Đặt lại tiến độ', resetConfirm:'Xoá toàn bộ tiến độ, điểm và phiên đang học?', deleteAll:'Xoá hết', cancel:'Huỷ',
    darkMode:'Chế độ tối', language:'Ngôn ngữ',
    greeting:'Chào buổi sáng, Minh.', searchPh:'tìm từ, cụm từ, ghi chú…',
    todaySession:'Phiên ôn tập hôm nay', startReview:'Bắt đầu ôn tập', addTitle:'Thêm kiến thức', importJson:'Nhập từ JSON', newDeck:'+ Bộ thẻ mới',
    progressTitle:'Tiến độ học tập', libraryTitle:'Thư viện', exit:'✕ Thoát', flashcard:'Flashcard', quiz:'Trắc nghiệm', fill:'Điền từ',
    notif:'Thông báo', notifEmpty:'Không có thông báo mới', markRead:'Đánh dấu đã đọc',
    n1:'24 thẻ đến hạn ôn hôm nay', n1t:'Vài phút trước', n2:'Chuỗi 12 ngày — đừng để đứt nhé!', n2t:'Hôm nay', n3:'Từ của ngày: "serendipity"', n3t:'Hôm nay', collapse:'Thu gọn',
    google:'Tiếp tục với Google', orSep:'hoặc', nameL:'Tên của bạn', namePh:'Tên của bạn', emailL:'Email', emailPh:'Email của bạn', pwL:'Mật khẩu', pwPh:'Mật khẩu của bạn',
    forgot:'Quên mật khẩu?', noAcc:'Chưa có tài khoản?', haveAcc:'Đã có tài khoản?', signIn:'Đăng nhập', signUp:'Đăng ký',
    loginTitle:'Đăng nhập', loginSub:'Tiếp tục học và theo dõi tiến độ của bạn.', signupTitle:'Tạo tài khoản', signupSub:'Bắt đầu hành trình học tiếng Anh ngay hôm nay.',
    obWelcome:'Chào mừng đến với myEnglish', obWelcomeBody:'Ứng dụng giúp bạn tự do xây dựng kho từ vựng và cấu trúc của riêng mình. Không giới hạn, không gò bó.', obBegin:'Bắt đầu',
    obGoalT:'Mục tiêu học tập của bạn là gì?', obLevelT:'Trình độ hiện tại của bạn?', obDailyT:'Mục tiêu mỗi ngày?', obTopicT:'Bạn quan tâm chủ đề nào?', obTopicSub:'Chọn 1 hoặc nhiều chủ đề để nhận gợi ý từ vựng phù hợp.',
    obBack:'Quay lại', obNext:'Tiếp tục', obFinish:'Hoàn thành', obSkip:'Bỏ qua' },
  en: { learn:'Learn', decks:'Decks', home:'Home', library:'Library', review:'Review', add:'Add knowledge', progress:'Progress',
    settings:'Settings', resetProgress:'Reset progress', resetConfirm:'Erase all progress, scores and the current session?', deleteAll:'Erase all', cancel:'Cancel',
    darkMode:'Dark mode', language:'Language',
    greeting:'Good morning, Minh.', searchPh:'search words, phrases, notes…',
    todaySession:"Today's review session", startReview:'Start review', addTitle:'Add knowledge', importJson:'Import JSON', newDeck:'+ New deck',
    progressTitle:'Learning progress', libraryTitle:'Library', exit:'✕ Exit', flashcard:'Flashcard', quiz:'Quiz', fill:'Fill in',
    notif:'Notifications', notifEmpty:'No new notifications', markRead:'Mark as read',
    n1:'24 cards due for review today', n1t:'A few minutes ago', n2:'12-day streak — keep it alive!', n2t:'Today', n3:'Word of the day: "serendipity"', n3t:'Today', collapse:'Collapse',
    google:'Continue with Google', orSep:'or', nameL:'Your name', namePh:'Your name', emailL:'Email', emailPh:'Your email', pwL:'Password', pwPh:'Your password',
    forgot:'Forgot password?', noAcc:"Don't have an account?", haveAcc:'Already have an account?', signIn:'Log in', signUp:'Sign up',
    loginTitle:'Log in', loginSub:'Continue learning and track your progress.', signupTitle:'Create account', signupSub:'Start your English learning journey today.',
    obWelcome:'Welcome to myEnglish', obWelcomeBody:'The app that lets you freely build your own vocabulary and structures. No limits, no boundaries.', obBegin:'Get Started',
    obGoalT:'What is your learning goal?', obLevelT:'What is your current level?', obDailyT:'Daily goal?', obTopicT:'What topics interest you?', obTopicSub:'Select 1 or more topics to get vocabulary suggestions.',
    obBack:'Back', obNext:'Next', obFinish:'Finish', obSkip:'Skip' },
} as const

export type Strings = typeof dict[Lang]
