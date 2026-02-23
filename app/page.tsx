'use client'

import { useState, useRef, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { Order } from '@/lib/googleSheets'
import { MENU } from '@/lib/menu'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// ============ TYPES ============
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

// ============ COLORS FOR CHARTS ============
const COLORS = ['#92400e', '#d97706', '#fbbf24', '#fcd34d', '#fef3c7']

// ============ MAIN APP ============
export default function App() {
  const [activeTab, setActiveTab] = useState<'customer' | 'barista' | 'owner'>('customer')

  return (
    <div className="min-h-screen bg-amber-50">
      <Toaster position="top-center" />

      {/* Top Navigation */}
      <div className="bg-amber-900 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">☕</span>
              <h1 className="text-lg font-bold">Brew & Co</h1>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('customer')}
              className={`px-5 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'customer'
                  ? 'bg-amber-50 text-amber-900'
                  : 'text-amber-200 hover:text-white'
              }`}
            >
              🛒 Order
            </button>
            <button
              onClick={() => setActiveTab('barista')}
              className={`px-5 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'barista'
                  ? 'bg-amber-50 text-amber-900'
                  : 'text-amber-200 hover:text-white'
              }`}
            >
              👨‍🍳 Barista
            </button>
            <button
              onClick={() => setActiveTab('owner')}
              className={`px-5 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'owner'
                  ? 'bg-amber-50 text-amber-900'
                  : 'text-amber-200 hover:text-white'
              }`}
            >
              📊 Owner
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className={activeTab === 'customer' ? 'block' : 'hidden'}>
        <CustomerView />
      </div>
      <div className={activeTab === 'barista' ? 'block' : 'hidden'}>
        <BaristaView />
      </div>
      <div className={activeTab === 'owner' ? 'block' : 'hidden'}>
        <OwnerView />
      </div>
    </div>
  )
}

// ============ CUSTOMER VIEW ============
function CustomerView() {
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
  const lastSpokenContentRef = useRef<string | null>(null)
  const hasSpokenWelcomeRef = useRef(false)
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    startConversation()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startConversation = async () => {
    const welcomeMessage = "Hi there! Welcome to Brew & Co! I'm Brew, your AI barista. What can I get started for you today?"
    setMessages([{ role: 'assistant', content: welcomeMessage }])
    if (isVoiceMode && !hasSpokenWelcomeRef.current) {
      hasSpokenWelcomeRef.current = true
      lastSpokenContentRef.current = welcomeMessage
      await speakText(welcomeMessage, true)
    }
  }

  const speakText = async (text: string, autoListen = false) => {
    if (!text.trim()) return
    if (lastSpokenContentRef.current === text) return
    lastSpokenContentRef.current = text

    try {
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause()
        audioInstanceRef.current = null
      }
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
      audioInstanceRef.current = audio
      audio.onended = () => {
        audioInstanceRef.current = null
        URL.revokeObjectURL(audioUrl)
        setIsPlaying(false)
        if (autoListen && isVoiceMode) {
          setTimeout(() => startListening(), 1000)
        }
      }
      audio.onerror = () => {
        audioInstanceRef.current = null
        URL.revokeObjectURL(audioUrl)
        setIsPlaying(false)
      }
      await audio.play()
    } catch (error) {
      console.error('TTS error:', error)
      lastSpokenContentRef.current = null
      setIsPlaying(false)
    }
  }

  const startListening = () => {
    if (orderPlaced) return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported. Please use Chrome.')
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
    }
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
  }

  const extractReceipt = (text: string): OrderReceipt | null => {
    const match = text.match(/ORDER_RECEIPT_START\s*([\s\S]*?)\s*ORDER_RECEIPT_END/)
    if (!match) return null
    try { return JSON.parse(match[1]) } catch { return null }
  }

  const cleanMessage = (text: string): string => {
    return text.replace(/ORDER_RECEIPT_START[\s\S]*?ORDER_RECEIPT_END/g, '').trim()
  }

  const saveOrder = async (orderReceipt: OrderReceipt) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: orderReceipt.items, total: orderReceipt.total, special_notes: orderReceipt.special_notes || '' })
      })
      if (!response.ok) throw new Error('Failed to save order')
      toast.success('Order saved!')
    } catch (error) {
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

      setMessages([...updatedMessages, { role: 'assistant', content: cleanedMessage }])

      if (extractedReceipt) {
        setReceipt(extractedReceipt)
        setOrderPlaced(true)
        await saveOrder(extractedReceipt)
      }

      if (isVoiceMode) {
        await speakText(cleanedMessage, false)
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-100px)]">
      {/* Menu panel - left */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-amber-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-amber-100 bg-amber-50">
          <h2 className="font-bold text-amber-900 text-sm uppercase tracking-wide">Menu</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          {Object.entries(MENU).map(([key, category]) => (
            <div key={key} className="px-4 mb-5">
              <h3 className="text-amber-800 font-semibold text-xs uppercase tracking-wider mb-2 sticky top-0 bg-white py-1 border-b border-amber-100">
                {category.name}
              </h3>
              <ul className="space-y-1.5">
                {Object.entries(category.items).map(([itemKey, item]) => (
                  <li key={itemKey} className="flex justify-between items-baseline gap-2 text-sm">
                    <span className="text-gray-800 truncate">{item.name}</span>
                    <span className="text-amber-900 font-medium shrink-0">${item.price.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat - right */}
      <div className="flex-1 flex flex-col min-w-0">
      {/* Voice/Text toggle */}
      <div className="flex justify-end px-4 pt-3 max-w-2xl mx-auto w-full shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-amber-700 text-sm">{isVoiceMode ? '🎙️ Voice' : '⌨️ Text'}</span>
          <button
            onClick={() => setIsVoiceMode(!isVoiceMode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${isVoiceMode ? 'bg-amber-500' : 'bg-amber-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isVoiceMode ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <span className="text-2xl mr-2 self-end">☕</span>}
            <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' ? 'bg-amber-900 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
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
                    <p className="text-gray-500 text-xs">{[item.size, item.temperature, item.milk, ...(item.modifications || [])].filter(Boolean).join(', ')}</p>
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
              disabled={isListening || isPlaying || isLoading || orderPlaced}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all ${
                isListening ? 'bg-red-500 scale-110 animate-pulse'
                : isPlaying ? 'bg-amber-300 cursor-not-allowed'
                : orderPlaced ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-amber-900 hover:bg-amber-700 active:scale-95'
              }`}
            >
              {isListening ? '🎙️' : isPlaying ? '🔊' : '🎤'}
            </button>
            <p className="text-gray-500 text-sm">
              {isListening ? 'Listening...' : isPlaying ? 'Brew is speaking...' : orderPlaced ? 'Order placed!' : 'Tap to speak'}
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
    </div>
  )
}

// ============ BARISTA VIEW ============
function BaristaView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      const data = await response.json()
      setOrders(data.orders.reverse())
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = async (order_id: string, status: string) => {
    try {
      await fetch(process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL!, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'updateStatus', order_id, status })
      })
      setOrders(prev => prev.map(o => o.order_id === order_id ? { ...o, status: status as any } : o))
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const pendingOrders = orders.filter(o => o.status === 'pending')
  const inProgressOrders = orders.filter(o => o.status === 'in-progress')
  const completedOrders = orders.filter(o => o.status === 'completed')

  if (isLoading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading orders...</p></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-800">Order Queue</h2>
        <button onClick={fetchOrders} className="bg-amber-900 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">🔄 Refresh</button>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-4xl mb-3">☕</p>
          <p className="text-gray-500">No orders yet. Enjoy the calm!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>Pending ({pendingOrders.length})
            </h3>
            <div className="space-y-4">
              {pendingOrders.map(order => <OrderCard key={order.order_id} order={order} onUpdateStatus={updateStatus} getStatusColor={getStatusColor} />)}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-400 inline-block"></span>In Progress ({inProgressOrders.length})
            </h3>
            <div className="space-y-4">
              {inProgressOrders.map(order => <OrderCard key={order.order_id} order={order} onUpdateStatus={updateStatus} getStatusColor={getStatusColor} />)}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span>Completed ({completedOrders.length})
            </h3>
            <div className="space-y-4">
              {completedOrders.map(order => <OrderCard key={order.order_id} order={order} onUpdateStatus={updateStatus} getStatusColor={getStatusColor} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, onUpdateStatus, getStatusColor }: { order: Order, onUpdateStatus: (id: string, status: string) => void, getStatusColor: (status: string) => string }) {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
  const time = new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-bold text-gray-800 text-sm">#{order.order_id.slice(-6).toUpperCase()}</p>
          <p className="text-gray-400 text-xs">{time}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusColor(order.status)}`}>{order.status}</span>
      </div>
      <div className="space-y-2 mb-4">
        {items.map((item: any, i: number) => (
          <div key={i} className="text-sm">
            <p className="font-semibold text-gray-800">{item.quantity}x {item.name}</p>
            <p className="text-gray-500 text-xs">{[item.size, item.temperature, item.milk, ...(item.modifications || [])].filter(Boolean).join(' · ')}</p>
          </div>
        ))}
      </div>
      {order.special_notes && <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mb-3">📝 {order.special_notes}</p>}
      <div className="flex gap-2">
        {order.status === 'pending' && <button onClick={() => onUpdateStatus(order.order_id, 'in-progress')} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-2 rounded-lg transition-colors">Start</button>}
        {order.status === 'in-progress' && <button onClick={() => onUpdateStatus(order.order_id, 'completed')} className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-2 rounded-lg transition-colors">Complete ✓</button>}
        {order.status === 'completed' && <p className="text-center text-green-600 text-xs font-medium w-full py-2">✓ Done</p>}
      </div>
    </div>
  )
}

// ============ OWNER VIEW ============
function OwnerView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      const data = await response.json()
      setOrders(data.orders)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total as any) || 0), 0)
  const totalOrders = orders.length
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const completedOrders = orders.filter(o => o.status === 'completed').length
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0

  const itemCounts: Record<string, number> = {}
  orders.forEach(order => {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    items?.forEach((item: any) => { itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1) })
  })
  const popularItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }))

  const hourlyRevenue: Record<number, number> = {}
  orders.forEach(order => {
    const hour = new Date(order.timestamp).getHours()
    hourlyRevenue[hour] = (hourlyRevenue[hour] || 0) + (parseFloat(order.total as any) || 0)
  })
  const hourlyData = Object.entries(hourlyRevenue).sort((a, b) => Number(a[0]) - Number(b[0])).map(([hour, revenue]) => ({ hour: `${hour}:00`, revenue: parseFloat(revenue.toFixed(2)) }))

  const milkCounts: Record<string, number> = {}
  orders.forEach(order => {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    items?.forEach((item: any) => { if (item.milk) milkCounts[item.milk] = (milkCounts[item.milk] || 0) + 1 })
  })
  const milkData = Object.entries(milkCounts).map(([name, value]) => ({ name, value }))

  const statusCounts = {
    pending: orders.filter(o => o.status === 'pending').length,
    'in-progress': orders.filter(o => o.status === 'in-progress').length,
    completed: orders.filter(o => o.status === 'completed').length,
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading dashboard...</p></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">Business Insights</h2>
        <button onClick={fetchOrders} className="bg-amber-900 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">🔄 Refresh</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Total Revenue</p>
          <p className="text-3xl font-bold text-amber-900">${totalRevenue.toFixed(2)}</p>
          <p className="text-gray-400 text-xs mt-1">All time</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Total Orders</p>
          <p className="text-3xl font-bold text-amber-900">{totalOrders}</p>
          <p className="text-gray-400 text-xs mt-1">All time</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Avg Order Value</p>
          <p className="text-3xl font-bold text-amber-900">${avgOrderValue.toFixed(2)}</p>
          <p className="text-gray-400 text-xs mt-1">Per order</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Completion Rate</p>
          <p className="text-3xl font-bold text-amber-900">{completionRate.toFixed(0)}%</p>
          <p className="text-gray-400 text-xs mt-1">{completedOrders} of {totalOrders} orders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">🏆 Most Popular Items</h3>
          {popularItems.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={popularItems}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#92400e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-10">No data yet</p>}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">🥛 Milk Preferences</h3>
          {milkData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={milkData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {milkData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-10">No data yet</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">⏰ Revenue by Hour</h3>
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-10">No data yet</p>}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">📋 Order Status Breakdown</h3>
          <div className="space-y-3 mt-6">
            {[
              { label: 'Pending', color: 'bg-yellow-400', count: statusCounts.pending },
              { label: 'In Progress', color: 'bg-blue-400', count: statusCounts['in-progress'] },
              { label: 'Completed', color: 'bg-green-400', count: statusCounts.completed },
            ].map(({ label, color, count }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${color} inline-block`}></span>
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div className={`${color} h-2 rounded-full`} style={{ width: totalOrders > 0 ? `${(count / totalOrders) * 100}%` : '0%' }} />
                  </div>
                  <span className="text-sm font-medium text-gray-800 w-6">{count}</span>
                </div>
              </div>
            ))}
          </div>

          <h3 className="font-bold text-gray-800 mt-6 mb-3">🕐 Recent Orders</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {orders.slice(-5).reverse().map((order, i) => {
              const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
              return (
                <div key={i} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                  <div>
                    <p className="font-medium text-gray-800">#{order.order_id?.slice(-6).toUpperCase()}</p>
                    <p className="text-gray-400 text-xs">{items?.map((item: any) => item.name).join(', ')}</p>
                  </div>
                  <p className="font-medium text-amber-900">${parseFloat(order.total as any).toFixed(2)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}