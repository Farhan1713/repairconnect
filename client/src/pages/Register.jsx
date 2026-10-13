import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Register() {
  const nav = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', phone: '', password: '' })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  // Live username check, debounced 400ms (#4)
  useEffect(() => {
    const u = form.username.trim()
    if (!u) { setStatus('idle'); return }
    if (u.length < 3) { setStatus('short'); return }
    setStatus('checking')
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?u=${encodeURIComponent(u)}`)
        const data = await res.json()
        if (!cancelled) setStatus(data.available ? 'available' : 'taken')
      } catch {
        if (!cancelled) setStatus('idle')
      }
    }, 400)
    return () => { cancelled = true; clearTimeout(t) }
  }, [form.username])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (status !== 'available') { setError('Choose an available username'); return }
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Registration failed'); return }
    nav('/login')
  }

  const hint = {
    idle: '',
    short: 'At least 3 characters',
    checking: 'Checking...',
    available: '✓ Username available',
    taken: '✗ Username already taken',
  }[status]
  const hintColor = status === 'available' ? 'text-green-600'
    : status === 'taken' ? 'text-red-600' : 'text-gray-500'

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto mt-10 bg-white p-6 rounded-xl shadow space-y-4"
    >
      <h2 className="text-2xl font-bold">Create account</h2>

      <div>
        <input name="username" placeholder="Username" value={form.username}
          onChange={change} className="w-full border rounded p-2" />
        <p className={`text-sm mt-1 ${hintColor}`}>{hint}</p>
      </div>

      <input name="email" type="email" placeholder="Email" value={form.email}
        onChange={change} className="w-full border rounded p-2" required />
      <input name="phone" placeholder="Phone (optional)" value={form.phone}
        onChange={change} className="w-full border rounded p-2" />
      <input name="password" type="password" placeholder="Password" value={form.password}
        onChange={change} className="w-full border rounded p-2" required />

      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button className="w-full bg-blue-600 text-white rounded p-2 hover:bg-blue-700">
        Register
      </button>
    </motion.form>
  )
}
