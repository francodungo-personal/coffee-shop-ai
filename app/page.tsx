'use client'

import { useState, useRef, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface OrderReceipt {
  items: Array<{
    name: string
    size?: string
    milk?: string
    temperature?: string
    modifications?: string[]
    shots?: number
    sweetness?: string
    ice?: string
    price: number
    quantity: number
  }>
  total: number
  special_notes?: string
}

export default function CustomerView() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    startConversation()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startConversation = async () => {
    const welcomeMessage = "Hi there! Welcome to Brew & Co! I'm Brew, your AI barista. What can I get started for you today?"
    setMessages([{ role: 'assistant', content: welcomeMessage }])
    if (isVoiceMode) await speakText(welcomeMessage)
  }

  const speakText = async (text: string) => {
    try {
      setIsPlaying(true)
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      if (!response.ok) throw new Error('TTS failed')
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.onended = () => setIsPlaying(false)
      await audio.play()
    } catch (error) {
      console.error('TTS error:', error)
      setIsPlaying(false)
    }
  }

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser. Please use Chrome.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      handleSend(transcript)
    }
    recognition.onerror = () => {
      setIsListening(false)
      toast.error('Could not hear you. Please try again.')
    }
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
  }

  const extractReceipt = (text: string): OrderReceipt | null => {
    const match = text.match(/ORDER_RECEIPT_START\s*([\s\S]*?)\s*ORDER_RECEIPT_END/)
    if (!match) return null
    try {
      return JSON.parse(match[1])
    } catch {
      return null
    }
  }

  const cleanMessage = (text: string): string => {
    return text.replace(/ORDER_RECEIPT_START[\s\S]*?ORDER_RECEIPT_END/g, '').trim()
  }

  const saveOrder = async (orderReceipt: OrderReceipt) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderReceipt.items,
          total: orderReceipt.total,
          special_notes: orderReceipt.special_notes || ''
        })
      })
      if (!response.ok) throw new Error('Failed to save order')
      toast.success('Order saved successfully!')
    } catch (error) {
      console.error('Error saving order:', error)
      toast.error('Failed to save order')
    }
  }

  const handleSend = async (overrideInput?: string) => {
    const messageText = overrideInput || input
    if (!messageText.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: messageText }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages })
      })

      const data = await response.json()
      const rawMessage = data.message
      const cleanedMessage = cleanMessage(rawMessage)
      const extractedReceipt = extractReceipt(rawMessage)

      const assistantMessage: Message = { role: 'assistant', content: cleanedMessage }
      setMessages([...updatedMessages, assistantMessage])

      if (extractedReceipt) {
        setReceipt(extractedReceipt)
        setOrderPlaced(true)
        await saveOrder(extractedReceipt)
      }

      if (isVoiceMode) await speakText(cleanedMessage)
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-amber-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-3xl">☕</span>
          <div>
            <h1 className="text-xl font-bold">Brew & Co</h1>
            <p className="text-amber-200 text-sm">AI Cashier</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-200 text-sm">{isVoiceMode ? '🎙️ Voice' : '⌨️ Text'}</span>
          <button
            onClick={() => setIsVoiceMode(!isVoiceMode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${isVoiceMode ? 'bg-amber-500' : 'bg-amber-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isVoiceMode ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <span className="text-2xl mr-2 self-end">☕</span>}
            <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-amber-900 text-white rounded-br-sm'
                : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <span className="text-2xl mr-2">☕</span>
            <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Receipt */}
        {receipt && orderPlaced && (
          <div className="bg-white border-2 border-amber-200 rounded-2xl p-5 shadow-md mx-auto w-full max-w-sm">
            <div className="text-center mb-4">
              <p className="text-2xl">🧾</p>
              <h3 className="font-bold text-amber-900 text-lg">Your Order Receipt</h3>
              <p className="text-gray-500 text-xs">{new Date().toLocaleString()}</p>
            </div>
            <div className="space-y-2 mb-4">
              {receipt.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{item.quantity}x {item.name}</p>
                    <p className="text-gray-500 text-xs">
                      {[item.size, item.temperature, item.milk, ...(item.modifications || [])].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <p className="font-medium text-gray-800">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-amber-200 pt-3 flex justify-between font-bold text-amber-900">
              <span>Total</span>
              <span>${receipt.total.toFixed(2)}</span>
            </div>
            <p className="text-center text-gray-500 text-xs mt-3">Please pay at the counter. Thank you! ☕</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-amber-100 px-4 py-4 max-w-2xl mx-auto w-full">
        {isVoiceMode ? (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={startListening}
              disabled={isListening || isPlaying || isLoading}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all ${
                isListening
                  ? 'bg-red-500 scale-110 animate-pulse'
                  : isPlaying
                  ? 'bg-amber-300 cursor-not-allowed'
                  : 'bg-amber-900 hover:bg-amber-700 active:scale-95'
              }`}
            >
              {isListening ? '🎙️' : isPlaying ? '🔊' : '🎤'}
            </button>
            <p className="text-gray-500 text-sm">
              {isListening ? 'Listening...' : isPlaying ? 'Brew is speaking...' : 'Tap to speak'}
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type your order..."
              className="flex-1 border border-amber-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-amber-500"
              disabled={isLoading || orderPlaced}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim() || orderPlaced}
              className="bg-amber-900 text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  )
}