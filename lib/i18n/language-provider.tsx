'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { Locale, defaultLocale } from './config'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LanguageContext = createContext<LanguageContextType>({
  locale: defaultLocale,
  setLocale: () => {},
})

export function useLanguage() {
  return useContext(LanguageContext)
}

interface LanguageProviderProps {
  children: ReactNode
  initialLocale?: Locale
}

export function LanguageProvider({ children, initialLocale = defaultLocale }: LanguageProviderProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [messages, setMessages] = useState<any>(null)

  useEffect(() => {
    // Load messages for the current locale
    async function loadMessages() {
      try {
        const msgs = await import(`@/messages/${locale}.json`)
        setMessages(msgs.default)
      } catch (error) {
        console.error(`Failed to load messages for locale: ${locale}`, error)
        // Fallback to default locale
        if (locale !== defaultLocale) {
          const fallbackMsgs = await import(`@/messages/${defaultLocale}.json`)
          setMessages(fallbackMsgs.default)
        }
      }
    }

    loadMessages()
  }, [locale])

  if (!messages) {
    return null // or a loading state
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Istanbul">
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  )
}
