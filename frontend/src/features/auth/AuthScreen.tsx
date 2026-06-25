'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '../../i18n/useT'
import { apiPost, ApiError } from '../../lib/api'

export default function AuthScreen() {
  const t = useT()
  const router = useRouter()

  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const switchMode = (toLogin: boolean) => {
    setIsLogin(toLogin)
    setError('')
    setPw('')
    setConfirmPw('')
    setEmail('')
    setName('')
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!isLogin && pw !== confirmPw) {
      setError('Mật khẩu nhập lại không khớp')
      return
    }
    try {
      if (isLogin) {
        await apiPost('/auth/login', { email, password: pw })
      } else {
        await apiPost('/auth/register', { email, password: pw, display_name: name })
      }
      router.push('/')
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError('Email hoặc mật khẩu không đúng')
      else if (err instanceof ApiError && err.status === 409) setError('Email đã được đăng ký')
      else setError('Lỗi kết nối — thử lại sau')
    }
  }

  const isMismatch = error === 'Mật khẩu nhập lại không khớp'

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

          <form onSubmit={handleAuth}>
            {!isLogin && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{t.nameL}</div>
                <input
                  required
                  aria-label="display_name"
                  className="field"
                  placeholder={t.namePh}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px', fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 15, color: 'var(--ink)', background: 'var(--paper)', outline: 'none' }}
                />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{t.emailL}</div>
              <input
                required
                aria-label="email"
                className="field"
                type="email"
                placeholder={t.emailPh}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px', fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 15, color: 'var(--ink)', background: 'var(--paper)', outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{t.pwL}</div>
              <input
                required
                aria-label="password"
                className="field"
                type="password"
                placeholder={t.pwPh}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px', fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 15, color: 'var(--ink)', background: 'var(--paper)', outline: 'none' }}
              />
            </div>

            {!isLogin && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{t.confirmPwL}</div>
                <input
                  required
                  aria-label="confirm_password"
                  className="field"
                  type="password"
                  placeholder={t.confirmPwPh}
                  value={confirmPw}
                  onChange={(e) => { setConfirmPw(e.target.value); if (isMismatch) setError('') }}
                  style={{ width: '100%', border: `1px solid ${isMismatch ? 'var(--rust)' : 'var(--line)'}`, borderRadius: 10, padding: '11px 13px', fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 15, color: 'var(--ink)', background: 'var(--paper)', outline: 'none' }}
                />
              </div>
            )}

            {error && <div role="alert" style={{ fontSize: 13, color: 'var(--rust)', marginTop: 6, marginBottom: 8 }}>{error}</div>}

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
