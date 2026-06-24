import { useEffect } from 'react'
import { useTourStore } from '../../store/useTourStore'
import { useAppStore } from '../../store/useAppStore'

const TOUR_CONTENT_EN = [
  { title: 'Navigation', body: 'Move between Home, Library, Review, Add and Progress — your whole study space lives here.' },
  { title: 'Dictionary search', body: 'Look up meanings and examples on the fly, then save new words straight into a deck.' },
  { title: "Today's review", body: 'Cards due today, scheduled by spaced repetition — you review each one right before you would forget it.' },
  { title: 'Add knowledge', body: 'Create cards by hand or paste a JSON list to import a whole deck at once.' },
  { title: 'Your streak', body: 'Keep your daily streak alive. The full activity heatmap lives under Progress.' },
  { title: 'Your decks', body: 'Every deck you own — open one to study with Flashcards, Quiz or Fill-in.' },
]

const TOUR_CONTENT_VN = [
  { title: 'Thanh điều hướng', body: 'Di chuyển giữa Trang chủ, Thư viện, Ôn tập, Thêm và Tiến độ — toàn bộ khu vực học nằm ở đây.' },
  { title: 'Tìm từ điển', body: 'Tra nhanh nghĩa và ví dụ, rồi lưu từ mới thẳng vào bộ thẻ.' },
  { title: 'Ôn tập hôm nay', body: 'Các thẻ tới hạn hôm nay, sắp theo spaced repetition — ôn đúng lúc bạn sắp quên.' },
  { title: 'Thêm kiến thức', body: 'Tạo thẻ thủ công hoặc dán danh sách JSON để nhập cả bộ thẻ một lần.' },
  { title: 'Chuỗi học của bạn', body: 'Giữ chuỗi streak mỗi ngày. Heatmap hoạt động đầy đủ nằm trong mục Tiến độ.' },
  { title: 'Bộ thẻ của bạn', body: 'Tất cả bộ thẻ bạn có — mở một bộ để học Flashcard, Trắc nghiệm hoặc Điền từ.' },
]

const TOUR_PLACES = ['right', 'bottom', 'bottom', 'right', 'left', 'right']

export function GuidedTourOverlay() {
  const { tourActive, tourStep, tourRect, syncTourRect, tourNext, tourBack, endTour } = useTourStore()
  const { lang, dark } = useAppStore()

  useEffect(() => {
    if (!tourActive) return
    const track = () => syncTourRect()
    window.addEventListener('resize', track)
    window.addEventListener('scroll', track, true)
    return () => {
      window.removeEventListener('resize', track)
      window.removeEventListener('scroll', track, true)
    }
  }, [tourActive, syncTourRect])

  if (!tourActive || !tourRect) return null

  const isEn = lang === 'en'
  const content = isEn ? TOUR_CONTENT_EN : TOUR_CONTENT_VN
  const curContent = content[tourStep] || content[0]
  const place = TOUR_PLACES[tourStep] || 'bottom'

  const accent = 'var(--accent)'
  const accentSoftLight = dark ? 'color-mix(in srgb, var(--accent) 26%, var(--surface))' : 'var(--accent-soft)'

  const ringStyle: React.CSSProperties = {
    position: 'fixed',
    top: tourRect.top - 7,
    left: tourRect.left - 7,
    width: tourRect.width + 14,
    height: tourRect.height + 14,
    border: `2.5px solid ${accent}`,
    borderRadius: 14,
    boxShadow: `0 0 0 3px ${accentSoftLight}, 0 12px 38px -8px rgba(20,16,10,0.30)`,
    background: 'transparent',
    pointerEvents: 'none',
    zIndex: 250,
    transition: 'top .32s cubic-bezier(.4,0,.2,1), left .32s cubic-bezier(.4,0,.2,1), width .32s cubic-bezier(.4,0,.2,1), height .32s cubic-bezier(.4,0,.2,1)',
  }

  const TW = 314
  const TH = 178
  const vw = window.innerWidth
  const vh = window.innerHeight
  let tl, tt

  if (place === 'right') {
    tl = tourRect.left + tourRect.width + 18
    tt = tourRect.top - 4
  } else if (place === 'left') {
    tl = tourRect.left - TW - 18
    tt = tourRect.top - 4
  } else if (place === 'top') {
    tl = tourRect.left
    tt = tourRect.top - TH - 16
  } else {
    tl = tourRect.left
    tt = tourRect.top + tourRect.height + 16
  }

  tl = Math.max(14, Math.min(tl, vw - TW - 14))
  tt = Math.max(14, Math.min(tt, vh - TH - 14))

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    top: tt,
    left: tl,
    width: TW,
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 16,
    boxShadow: '0 24px 54px -18px rgba(20,16,10,0.42)',
    padding: '20px 20px 18px',
    zIndex: 251,
    transition: 'top .32s cubic-bezier(.4,0,.2,1), left .32s cubic-bezier(.4,0,.2,1)',
  }

  const tourNextLabel = tourStep >= content.length - 1 ? (isEn ? 'Done' : 'Hoàn tất') : (isEn ? 'Next' : 'Tiếp tục')
  const tourBackLabel = isEn ? 'Back' : 'Quay lại'
  const tourSkipLabel = isEn ? 'Skip tour' : 'Bỏ qua'

  return (
    <>
      <div style={ringStyle}></div>
      <div style={tooltipStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 19, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            {curContent.title}
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--num-font)', whiteSpace: 'nowrap' }}>
            {tourStep + 1} / {content.length}
          </span>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: 14, lineHeight: 1.55, color: 'var(--muted)' }}>
          {curContent.body}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" onClick={endTour} style={{ border: 'none', background: 'transparent', padding: 0, fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}>
            {tourSkipLabel}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {tourStep > 0 && (
              <button onClick={tourBack} style={{ border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink)', borderRadius: 9, padding: '8px 15px', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                {tourBackLabel}
              </button>
            )}
            <button onClick={tourNext} style={{ border: 'none', background: 'var(--accent)', color: '#fff', borderRadius: 9, padding: '8px 18px', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {tourNextLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
