import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n/useT'
import { useAppStore } from '../../store/useAppStore'

export default function AuthScreen() {
  const t = useT()
  const login = useAppStore((s) => s.login)
  const navigate = useNavigate()
  
  const [isLogin, setIsLogin] = useState(true)
  const [pw, setPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')

  const switchMode = (toLogin: boolean) => {
    setIsLogin(toLogin)
    setPwError('')
    setPw('')
    setConfirmPw('')
  }

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLogin && pw !== confirmPw) {
      setPwError(t.pwMismatch)
      return
    }
    login()
    navigate('/')
  }

  return (
    <div data-screen-label="Auth" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--paper)' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, marginBottom: 30 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Newsreader', serif", fontSize: 22, fontWeight: 600 }}>E</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>my<span style={{ color: 'var(--accent)' }}>English</span></div>
        </div>

        <div style={{ border: '1px solid var(--line)', borderRadius: 20, background: 'var(--surface)', padding: 32, boxShadow: '0 18px 44px -28px rgba(40,35,25,0.4)' }}>
          <h1 style={{ margin: '0 0 6px', fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 28, color: 'var(--ink)' }}>{isLogin ? t.loginTitle : t.signupTitle}</h1>
          <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 15, lineHeight: 1.5 }}>{isLogin ? t.loginSub : t.signupSub}</p>

          <button onClick={() => { login(); navigate('/') }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--paper)', color: 'var(--ink)', padding: 12, fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 15, cursor: 'pointer', marginBottom: 18 }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.6 9.2c0-.6 0-1.1-.2-1.7H9v3.2h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.4z"></path><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z"></path><path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8z"></path><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"></path></svg>
            {t.google}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }}></div>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t.orSep}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }}></div>
          </div>

          <form onSubmit={handleAuth}>
            {!isLogin && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{t.nameL}</div>
                <input required className="field" placeholder={t.namePh} style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px', fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 15, color: 'var(--ink)', background: 'var(--paper)', outline: 'none' }} />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{t.emailL}</div>
              <input required className="field" type="email" placeholder={t.emailPh} style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px', fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 15, color: 'var(--ink)', background: 'var(--paper)', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{t.pwL}</div>
              <input required className="field" type="password" placeholder={t.pwPh} value={pw} onChange={(e) => setPw(e.target.value)} style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px', fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 15, color: 'var(--ink)', background: 'var(--paper)', outline: 'none' }} />
            </div>

            {!isLogin && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{t.confirmPwL}</div>
                <input required className="field" type="password" placeholder={t.confirmPwPh} value={confirmPw} onChange={(e) => { setConfirmPw(e.target.value); if (pwError) setPwError('') }} style={{ width: '100%', border: `1px solid ${pwError ? 'var(--rust)' : 'var(--line)'}`, borderRadius: 10, padding: '11px 13px', fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 15, color: 'var(--ink)', background: 'var(--paper)', outline: 'none' }} />
                {pwError && <div style={{ fontSize: 12, color: 'var(--rust)', marginTop: 5 }}>{pwError}</div>}
              </div>
            )}

            {isLogin && (
              <div style={{ textAlign: 'right', marginBottom: 18 }}>
                <span style={{ fontSize: 13, color: 'var(--accent)', cursor: 'pointer' }}>{t.forgot}</span>
              </div>
            )}
            {!isLogin && <div style={{ height: 10 }}></div>}

            <button type="submit" style={{ width: '100%', border: 'none', borderRadius: 12, background: 'var(--accent)', color: '#fff', padding: 13, fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
              {isLogin ? t.loginTitle : t.signupTitle}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
            {isLogin ? (
              <span>{t.noAcc} <button type="button" onClick={() => switchMode(false)} style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>{t.signUp}</button></span>
            ) : (
              <span>{t.haveAcc} <button type="button" onClick={() => switchMode(true)} style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>{t.signIn}</button></span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
