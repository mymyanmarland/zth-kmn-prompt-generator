import React, { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  Code2,
  Image as ImageIcon,
  Video,
  Terminal,
  LogOut,
  Copy,
  Check,
  Mail,
  Lock,
  Sparkles,
  Settings,
  X,
  KeyRound,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from './lib/supabase'

type Tool = 'coding' | 'image' | 'video'

type AuthView = 'login' | 'signup' | 'reset'

const LS_OPENROUTER_KEY = 'kmn_openrouter_key'
const LS_OPENROUTER_MODEL = 'kmn_openrouter_model'

const OPENROUTER_MODELS: Array<{ id: string; label: string }> = [
  { id: 'openai/gpt-4o-mini', label: 'GPT‑4o mini (မြန်/စျေးသက်သာ)' },
  { id: 'openai/gpt-4o', label: 'GPT‑4o (အရည်အသွေးကောင်း)' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku (မြန်)' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
]

const StarryBackground: React.FC = () => {
  const stars = useMemo(
    () =>
      Array.from({ length: 120 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 1 + Math.random() * 2,
        dur: 2.2 + Math.random() * 3,
        delay: Math.random() * 4,
        opacity: 0.35 + Math.random() * 0.35,
      })),
    [],
  )

  return (
    <div className="stars">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
            opacity: s.opacity,
          }}
        />
      ))}
    </div>
  )
}

function buildPrompt(tool: Tool, input: any): string {
  if (tool === 'coding') {
    const lang = input.lang || 'TypeScript'
    const framework = input.framework || 'React'
    const codeType = input.codeType || 'Feature တည်ဆောက်'
    const tone = input.tone || 'Professional'

    return `သင်သည် အတွေ့အကြုံရှိတဲ့ Senior Software Engineer တစ်ယောက်အဖြစ် အလုပ်လုပ်ပါ။

ပရောဂျက်/အလုပ်ခိုင်းချက်: ${input.topic || '—'}
Use Case / Title: ${codeType}
ဘာသာစကား: ${lang}
Framework/Stack: ${framework}
Tone: ${tone}
Context/လိုအပ်ချက်များ: ${input.context || '—'}

လုပ်ဆောင်ရမည့်အရာများ:
1) Production-ready ဖြစ်အောင် တည်ဆောက်ပါ (clean code + error handling + edge cases ပါ)
2) Folder/file structure ကို အကြံပြုပြီး အဓိက file တွေကို ပြည့်စုံအောင်ရေးပါ
3) လိုအပ်ရင် tests (unit/integration) နဲ့ run/usage steps ထည့်ပါ
4) Output ကို “တစ်ခုထဲ” အဖြစ် ရှင်းရှင်းလင်းလင်း ထုတ်ပါ (အဆင့်လိုက် + code block တွေတိတိကျကျ)

နောက်ဆုံး Output Format:
- ✅ Step-by-step plan
- ✅ File tree
- ✅ Full code (copy-paste အသုံးပြုလို့ရအောင်)
- ✅ မလိုအပ်တဲ့ ခေါင်းရှည်ရှည်ရှင်းလင်းချက် မပါစေ`
  }

  if (tool === 'image') {
    const style = input.style || 'Cinematic Realism'
    const model = input.model || 'Midjourney'
    const size = input.size || '1024x1024'

    return `AI Image Prompt (မြန်မာ) — ${model}

Subject/အကြောင်းအရာ: ${input.topic || '—'}
Style: ${style}
Size/Aspect: ${size}
Details/Context: ${input.context || '—'}

Output:
- Lighting / camera / mood / composition ကို သေချာရေးပါ
- Negative prompt (လိုအပ်ရင်) ထည့်ပေးပါ
- Final prompt ကို copy-paste လုပ်လို့ရအောင် တစ်ခုတည်းအဖြစ် ထုတ်ပါ`
  }

  // video
  const toolName = input.toolName || 'Sora / Runway / Pika'
  const duration = input.duration || '5-10s'
  const mood = input.mood || 'Cinematic'
  const movement = input.movement || 'Slow dolly-in'

  return `AI Video Prompt (မြန်မာ) — ${toolName}

Scene/အခန်း: ${input.topic || '—'}
Duration: ${duration}
Mood: ${mood}
Camera movement: ${movement}
Details/Context: ${input.context || '—'}

Output:
- Scene ကို shot-by-shot လေးနဲ့ ရေးပါ (လိုအပ်ရင်)
- Visual style + lighting + sound ambience + pacing ပါအောင်ရေးပါ
- Final prompt ကို copy-paste လုပ်လို့ရအောင် တစ်ခုတည်းအဖြစ် ထုတ်ပါ`
}

async function openRouterImproveDraft(params: {
  apiKey: string
  model: string
  draft: string
}): Promise<string> {
  const { apiKey, model, draft } = params

  const system =
    'You are an expert prompt engineer. You will rewrite the user\'s draft into ONE final, high-quality prompt. ' +
    'Output ONLY the final prompt text (no extra explanation). ' +
    'Use Burmese for instructions/explanations; keep code identifiers in English when appropriate. ' +
    'Make it specific, production-ready, and structured with clear sections and bullet points.'

  const user = `ဒီ draft prompt ကို ပိုပြည့်စုံ၊ ပိုတိကျ၊ professional ဖြစ်အောင် ပြန်ရေးပေးပါ။\n\nDraft:\n\n${draft}`

  const referer = `${window.location.origin}${window.location.pathname}`

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': referer,
      'X-Title': 'KMN Prompt Generator',
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(`OpenRouter error (${resp.status}): ${txt || 'request failed'}`)
  }

  const json = await resp.json()
  const out = json?.choices?.[0]?.message?.content
  return typeof out === 'string' ? out.trim() : ''
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [authView, setAuthView] = useState<AuthView>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authNotice, setAuthNotice] = useState<string | null>(null)

  const [tool, setTool] = useState<Tool>('coding')
  const [topic, setTopic] = useState('')
  const [context, setContext] = useState('')

  const [codingLang, setCodingLang] = useState('TypeScript')
  const [codingFramework, setCodingFramework] = useState('React')
  const [codingCodeType, setCodingCodeType] = useState('Feature တည်ဆောက်')
  const [codingTone, setCodingTone] = useState('Professional')

  const [imageStyle, setImageStyle] = useState('Cinematic Realism')
  const [imageModel, setImageModel] = useState('Midjourney')
  const [imageSize, setImageSize] = useState('1024x1024')

  const [videoToolName, setVideoToolName] = useState('Sora / Runway / Pika')
  const [videoDuration, setVideoDuration] = useState('5-10s')
  const [videoMood, setVideoMood] = useState('Cinematic')
  const [videoMovement, setVideoMovement] = useState('Slow dolly-in')

  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)

  // OpenRouter Settings (stored locally)
  const [openRouterKey, setOpenRouterKey] = useState('')
  const [openRouterModel, setOpenRouterModel] = useState('openai/gpt-4o-mini')

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [draftKey, setDraftKey] = useState('')
  const [draftModel, setDraftModel] = useState('openai/gpt-4o-mini')
  const [showKey, setShowKey] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState<string | null>(null)

  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const canUseSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

  const aiReady = Boolean(openRouterKey.trim() && openRouterModel.trim())

  // Load local settings
  useEffect(() => {
    try {
      const k = localStorage.getItem(LS_OPENROUTER_KEY) ?? ''
      const m = localStorage.getItem(LS_OPENROUTER_MODEL) ?? 'openai/gpt-4o-mini'
      setOpenRouterKey(k)
      setOpenRouterModel(m)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function boot() {
      try {
        if (!canUseSupabase) {
          if (mounted) {
            setSession(null)
            setAuthLoading(false)
          }
          return
        }

        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        setSession(data.session)
        setAuthLoading(false)
      } catch {
        if (mounted) setAuthLoading(false)
      }
    }

    boot()

    if (!canUseSupabase) return

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [canUseSupabase])

  const openSettings = () => {
    setSettingsSaved(null)
    setShowKey(false)
    setDraftKey(openRouterKey)
    setDraftModel(openRouterModel)
    setSettingsOpen(true)
  }

  const saveSettings = () => {
    const key = draftKey.trim()
    const model = draftModel.trim() || 'openai/gpt-4o-mini'

    setOpenRouterKey(key)
    setOpenRouterModel(model)

    try {
      if (key) localStorage.setItem(LS_OPENROUTER_KEY, key)
      else localStorage.removeItem(LS_OPENROUTER_KEY)

      localStorage.setItem(LS_OPENROUTER_MODEL, model)
    } catch {
      // ignore
    }

    setSettingsSaved('သိမ်းပြီးပါပြီ ✅')
    setTimeout(() => setSettingsSaved(null), 1400)
  }

  const clearKey = () => {
    setDraftKey('')
    setOpenRouterKey('')
    try {
      localStorage.removeItem(LS_OPENROUTER_KEY)
    } catch {
      // ignore
    }
    setSettingsSaved('Key ဖျက်ပြီးပါပြီ')
    setTimeout(() => setSettingsSaved(null), 1400)
  }

  const onLogin = async () => {
    setAuthBusy(true)
    setAuthError(null)
    setAuthNotice(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
      setPassword('')
    } catch (e: any) {
      setAuthError(e?.message ?? 'Login မအောင်မြင်ပါ')
    } finally {
      setAuthBusy(false)
    }
  }

  const onSignup = async () => {
    setAuthBusy(true)
    setAuthError(null)
    setAuthNotice(null)
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (error) throw error
      setAuthNotice('Signup အောင်မြင်ပါပြီ။ (Email verification ဖွင့်ထားရင် email ထဲက link ကိုနှိပ်ပြီး confirm လုပ်ပေးပါ)')
      setPassword('')
    } catch (e: any) {
      setAuthError(e?.message ?? 'Signup မအောင်မြင်ပါ')
    } finally {
      setAuthBusy(false)
    }
  }

  const onReset = async () => {
    setAuthBusy(true)
    setAuthError(null)
    setAuthNotice(null)
    try {
      const redirectTo = window.location.origin + window.location.pathname
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) throw error
      setAuthNotice('Password reset email ပို့ပြီးပါပြီ။ Inbox/Spam စစ်ပေးပါနော်။')
    } catch (e: any) {
      setAuthError(e?.message ?? 'Reset မအောင်မြင်ပါ')
    } finally {
      setAuthBusy(false)
    }
  }

  const onSignOut = async () => {
    try {
      await supabase.auth.signOut()
      setOutput('')
      setTopic('')
      setContext('')
      setAuthView('login')
      setAuthNotice(null)
      setAuthError(null)
    } catch {
      // ignore
    }
  }

  const generateTemplate = () => {
    setAiError(null)
    const txt = buildPrompt(tool, {
      topic,
      context,
      lang: codingLang,
      framework: codingFramework,
      codeType: codingCodeType,
      tone: codingTone,
      style: imageStyle,
      model: imageModel,
      size: imageSize,
      toolName: videoToolName,
      duration: videoDuration,
      mood: videoMood,
      movement: videoMovement,
    })

    setOutput(txt)
    setCopied(false)
  }

  const generateAI = async () => {
    setAiError(null)

    if (!openRouterKey.trim()) {
      setAiError('OpenRouter API Key မထည့်ရသေးပါ။ Settings (⚙️) ထဲမှာ key ထည့်ပေးပါ။')
      return
    }

    const model = openRouterModel.trim() || 'openai/gpt-4o-mini'

    const draft = buildPrompt(tool, {
      topic,
      context,
      lang: codingLang,
      framework: codingFramework,
      codeType: codingCodeType,
      tone: codingTone,
      style: imageStyle,
      model: imageModel,
      size: imageSize,
      toolName: videoToolName,
      duration: videoDuration,
      mood: videoMood,
      movement: videoMovement,
    })

    setAiBusy(true)
    try {
      const improved = await openRouterImproveDraft({
        apiKey: openRouterKey.trim(),
        model,
        draft,
      })

      if (!improved) throw new Error('AI က output မထုတ်နိုင်သေးပါ')

      setOutput(improved)
      setCopied(false)
    } catch (e: any) {
      setAiError(e?.message ?? 'AI generate မအောင်မြင်ပါ')
    } finally {
      setAiBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      // ignore
    }
  }

  const userEmail = session?.user?.email ?? ''

  return (
    <div className="app">
      <StarryBackground />

      {settingsOpen ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSettingsOpen(false)
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="brand-title" style={{ fontSize: 16 }}>Settings</div>
                <div className="brand-sub">OpenRouter API key + model (ဒီ browser ထဲမှာပဲ သိမ်းထားမယ်)</div>
              </div>
              <button className="btn-ghost" type="button" onClick={() => setSettingsOpen(false)}>
                <X size={16} /> ပိတ်မယ်
              </button>
            </div>

            <div className="modal-body">
              <div className="notice">
                <b>သတိ:</b> Key ကို localStorage ထဲသိမ်းထားတာဖြစ်လို့ public/computer sharing မလုပ်တဲ့ device မှာပဲ သုံးပါနော်။
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="field">
                  <div className="label"><KeyRound size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> OpenRouter API Key</div>
                  <input
                    className="input"
                    type={showKey ? 'text' : 'password'}
                    value={draftKey}
                    onChange={(e) => setDraftKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                  />
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn-ghost" type="button" onClick={() => setShowKey((v) => !v)}>
                      {showKey ? 'Hide' : 'Show'}
                    </button>
                    <button className="btn-ghost" type="button" onClick={clearKey}>
                      Key ဖျက်မယ်
                    </button>
                  </div>
                </div>

                <div className="field">
                  <div className="label">Model ရွေးမယ် (OpenRouter)</div>
                  <input
                    className="input"
                    list="openrouter-models"
                    value={draftModel}
                    onChange={(e) => setDraftModel(e.target.value)}
                    placeholder="openai/gpt-4o-mini"
                  />
                  <datalist id="openrouter-models">
                    {OPENROUTER_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </datalist>
                  <div className="brand-sub">Model id ကို custom ထည့်လည်းရပါတယ် (OpenRouter model list ထဲက id)</div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn" type="button" onClick={saveSettings}>
                    <Sparkles size={16} /> Save
                  </button>
                  {settingsSaved ? <div className="pill"><span className="pill-dot" /> {settingsSaved}</div> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="container">
        <div className="header">
          <div className="brand">
            <div className="brand-badge">
              <Terminal size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="brand-title">KMN Prompt Generator</div>
              <div className="brand-sub">ZTH Coder · Supabase Full (တည်ဆောက်နေဆဲ)</div>
            </div>
          </div>

          <div className="header-right">
            <button className="btn-ghost" type="button" onClick={openSettings} title="Settings">
              <Settings size={16} /> Settings
            </button>

            <div className="pill" title={aiReady ? openRouterModel : 'OpenRouter key မထည့်ရသေး'}>
              <span className="pill-dot" />
              <span>
                AI: {aiReady ? 'OpenRouter ✅' : 'Off (Key ထည့်ရန်)'}
              </span>
            </div>

            {session ? (
              <>
                <div className="pill" title={userEmail}>
                  <span className="pill-dot" />
                  <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {userEmail}
                  </span>
                </div>
                <button className="btn-ghost" type="button" onClick={onSignOut}>
                  <LogOut size={16} /> ထွက်မယ်
                </button>
              </>
            ) : (
              <div className="pill">
                <span className="pill-dot" />
                <span>Login လုပ်ပြီး အသုံးပြုပါ</span>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-inner">
            {authLoading ? (
              <div className="notice">Loading…</div>
            ) : !canUseSupabase ? (
              <div className="notice error">
                Supabase config မတွေ့ပါ။ <b>.env.local</b> ထဲမှာ <b>VITE_SUPABASE_URL</b> နဲ့ <b>VITE_SUPABASE_ANON_KEY</b> ကို ထည့်ပေးပါ။
              </div>
            ) : session ? (
              <div className="studio">
                <div className="sidebar">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div className="brand-title" style={{ fontSize: 14 }}>Tools</div>
                      <div className="brand-sub">Prompt ထုတ်မယ့် tab ရွေးပါ</div>
                    </div>
                    <Sparkles size={18} />
                  </div>

                  <div className="nav">
                    <button
                      className={`nav-item ${tool === 'coding' ? 'active' : ''}`}
                      type="button"
                      onClick={() => setTool('coding')}
                    >
                      <span className="nav-dot" />
                      <Code2 size={18} />
                      <span>Code Prompt</span>
                    </button>

                    <button
                      className={`nav-item ${tool === 'image' ? 'active' : ''}`}
                      type="button"
                      onClick={() => setTool('image')}
                    >
                      <span className="nav-dot" />
                      <ImageIcon size={18} />
                      <span>Image Prompt</span>
                    </button>

                    <button
                      className={`nav-item ${tool === 'video' ? 'active' : ''}`}
                      type="button"
                      onClick={() => setTool('video')}
                    >
                      <span className="nav-dot" />
                      <Video size={18} />
                      <span>Video Prompt</span>
                    </button>
                  </div>

                  <div style={{ marginTop: 14 }} className="notice">
                    <b>Tip:</b> Topic/Context ကို အတိအကျ ရေးပေးလေ Prompt က ပိုတိကျလာမယ်နော်။
                  </div>
                </div>

                <div className="main">
                  <motion.div
                    key={tool}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <h2 className="h2">
                      {tool === 'coding'
                        ? 'Coding Prompt ထုတ်မယ်'
                        : tool === 'image'
                          ? 'Image Prompt ထုတ်မယ်'
                          : 'Video Prompt ထုတ်မယ်'}
                    </h2>
                    <div className="help">
                      Template Generate (offline) လည်းရပါတယ်။ OpenRouter key ထည့်ထားရင် AI Generate နဲ့ ပိုတိကျအောင် ပြန်ချောပေးမယ်။
                    </div>

                    {aiError ? (
                      <div className="notice error" style={{ marginTop: 12 }}>{aiError}</div>
                    ) : null}

                    <div style={{ marginTop: 14 }}>
                      <div className="field">
                        <div className="label">Topic / Subject</div>
                        <input
                          className="input"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder={
                            tool === 'coding'
                              ? 'ဥပမာ: JWT နဲ့ Login system'
                              : tool === 'image'
                                ? 'ဥပမာ: Cyberpunk city at night'
                                : 'ဥပမာ: Rainy street cinematic shot'
                          }
                        />
                      </div>

                      {tool === 'coding' ? (
                        <>
                          <div className="field">
                            <div className="label">Programming Language</div>
                            <select className="select" value={codingLang} onChange={(e) => setCodingLang(e.target.value)}>
                              <option>TypeScript</option>
                              <option>JavaScript</option>
                              <option>Python</option>
                              <option>Go</option>
                              <option>Rust</option>
                            </select>
                          </div>

                          <div className="field">
                            <div className="label">Framework / Stack</div>
                            <select className="select" value={codingFramework} onChange={(e) => setCodingFramework(e.target.value)}>
                              <option>React</option>
                              <option>Next.js</option>
                              <option>Node.js</option>
                              <option>NestJS</option>
                              <option>Django</option>
                            </select>
                          </div>

                          <div className="field">
                            <div className="label">Use Case / Title</div>
                            <select className="select" value={codingCodeType} onChange={(e) => setCodingCodeType(e.target.value)}>
                              <option>Feature တည်ဆောက်</option>
                              <option>Debug / Fix</option>
                              <option>Refactor</option>
                              <option>API Integration</option>
                              <option>Database Design</option>
                              <option>Authentication</option>
                              <option>Testing</option>
                              <option>Deployment</option>
                              <option>Optimization</option>
                              <option>Architecture</option>
                              <option>UI Component</option>
                              <option>Algorithm</option>
                              <option>Best Practices</option>
                              <option>Compare Solutions</option>
                              <option>Code Review</option>
                            </select>
                          </div>

                          <div className="field">
                            <div className="label">Tone</div>
                            <select className="select" value={codingTone} onChange={(e) => setCodingTone(e.target.value)}>
                              <option>Professional</option>
                              <option>Technical</option>
                              <option>Educational</option>
                              <option>Casual</option>
                            </select>
                          </div>
                        </>
                      ) : tool === 'image' ? (
                        <>
                          <div className="field">
                            <div className="label">Model</div>
                            <select className="select" value={imageModel} onChange={(e) => setImageModel(e.target.value)}>
                              <option>Midjourney</option>
                              <option>DALL·E</option>
                              <option>Stable Diffusion</option>
                            </select>
                          </div>

                          <div className="field">
                            <div className="label">Style</div>
                            <select className="select" value={imageStyle} onChange={(e) => setImageStyle(e.target.value)}>
                              <option>Cinematic Realism</option>
                              <option>Anime</option>
                              <option>Oil Painting</option>
                              <option>Cyberpunk</option>
                              <option>Minimal Product Shot</option>
                            </select>
                          </div>

                          <div className="field">
                            <div className="label">Size / Aspect</div>
                            <select className="select" value={imageSize} onChange={(e) => setImageSize(e.target.value)}>
                              <option>1024x1024</option>
                              <option>1024x1792</option>
                              <option>1792x1024</option>
                              <option>16:9</option>
                              <option>9:16</option>
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="field">
                            <div className="label">Tool</div>
                            <select className="select" value={videoToolName} onChange={(e) => setVideoToolName(e.target.value)}>
                              <option>Sora / Runway / Pika</option>
                              <option>Runway</option>
                              <option>Pika</option>
                              <option>Sora</option>
                            </select>
                          </div>

                          <div className="field">
                            <div className="label">Duration</div>
                            <select className="select" value={videoDuration} onChange={(e) => setVideoDuration(e.target.value)}>
                              <option>5-10s</option>
                              <option>10-20s</option>
                              <option>30s</option>
                            </select>
                          </div>

                          <div className="field">
                            <div className="label">Mood</div>
                            <select className="select" value={videoMood} onChange={(e) => setVideoMood(e.target.value)}>
                              <option>Cinematic</option>
                              <option>Calm</option>
                              <option>Energetic</option>
                              <option>Dark</option>
                            </select>
                          </div>

                          <div className="field">
                            <div className="label">Camera movement</div>
                            <select className="select" value={videoMovement} onChange={(e) => setVideoMovement(e.target.value)}>
                              <option>Slow dolly-in</option>
                              <option>Handheld</option>
                              <option>Drone flyover</option>
                              <option>Static</option>
                            </select>
                          </div>
                        </>
                      )}

                      <div className="field">
                        <div className="label">Context / Details</div>
                        <textarea
                          className="textarea"
                          value={context}
                          onChange={(e) => setContext(e.target.value)}
                          placeholder="လိုချင်တဲ့ style, constraints, edge cases, mood, CTA စတာတွေ ဒီမှာထည့်ပါ…"
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button className="btn" type="button" onClick={generateAI} disabled={!topic.trim() || aiBusy}>
                          <Sparkles size={16} /> {aiBusy ? 'AI Generate…' : 'AI Generate'}
                        </button>
                        <button className="btn-ghost" type="button" onClick={generateTemplate} disabled={!topic.trim() || aiBusy}>
                          Template Generate
                        </button>
                        <button
                          className="btn-ghost"
                          type="button"
                          disabled={aiBusy}
                          onClick={() => {
                            setTopic('')
                            setContext('')
                            setOutput('')
                            setAiError(null)
                          }}
                        >
                          Reset
                        </button>

                        {aiReady ? (
                          <div className="brand-sub" style={{ marginLeft: 'auto' }}>
                            Model: <b>{openRouterModel}</b>
                          </div>
                        ) : null}
                      </div>

                      {output ? (
                        <div className="output">
                          <div className="output-top">
                            <div className="output-title">Generated Prompt</div>
                            <button className="btn-ghost" type="button" onClick={copy}>
                              {copied ? (
                                <>
                                  <Check size={16} /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy size={16} /> Copy
                                </>
                              )}
                            </button>
                          </div>
                          <div className="code">{output}</div>
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                </div>
              </div>
            ) : (
              <div className="auth-grid">
                <div className="hero">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div className="hero-title">Prompt Generator ကို စတင်ကြရအောင်</div>
                      <div className="hero-sub">
                        Coding / Image / Video prompt တွေကို မြန်မာလို အဆင်ပြေပြေ ထုတ်ပေးမယ်။ (Supabase Auth + Admin/Logs + AI Execute ကို အဆင့်လိုက်ထည့်နေဆဲ)
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }} className="auth-tabs">
                    <button className={`tab ${authView === 'login' ? 'active' : ''}`} type="button" onClick={() => setAuthView('login')}>
                      Login
                    </button>
                    <button className={`tab ${authView === 'signup' ? 'active' : ''}`} type="button" onClick={() => setAuthView('signup')}>
                      Signup
                    </button>
                    <button className={`tab ${authView === 'reset' ? 'active' : ''}`} type="button" onClick={() => setAuthView('reset')}>
                      Reset
                    </button>
                  </div>

                  <div style={{ marginTop: 14 }} className="notice">
                    <b>မှတ်ချက်:</b> Password reset link ကို GitHub Pages URL နဲ့ ချိတ်ဖို့ Supabase → Auth → URL Configuration ထဲမှာ redirect URL ထည့်ရပါမယ်။
                  </div>
                </div>

                <div>
                  {authError ? <div className="notice error">{authError}</div> : null}
                  {authNotice ? <div className="notice">{authNotice}</div> : null}

                  <div style={{ marginTop: 12 }}>
                    <div className="field">
                      <div className="label">
                        <Mail size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Email
                      </div>
                      <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                    </div>

                    {authView !== 'reset' ? (
                      <div className="field">
                        <div className="label">
                          <Lock size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Password
                        </div>
                        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                      </div>
                    ) : null}

                    {authView === 'login' ? (
                      <button className="btn" type="button" onClick={onLogin} disabled={authBusy || !email.trim() || !password}>
                        <Sparkles size={16} /> Login
                      </button>
                    ) : authView === 'signup' ? (
                      <button className="btn" type="button" onClick={onSignup} disabled={authBusy || !email.trim() || !password}>
                        <Sparkles size={16} /> Signup
                      </button>
                    ) : (
                      <button className="btn" type="button" onClick={onReset} disabled={authBusy || !email.trim()}>
                        <Lock size={16} /> Reset Email ပို့မယ်
                      </button>
                    )}

                    <div style={{ marginTop: 12 }} className="brand-sub">
                      Built with 🥧 by Ko Paing · Premium Glass UI
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
