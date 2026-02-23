'use client'

import { useState, useEffect } from 'react'
import { Order } from '@/lib/googleSheets'

export default function BaristaView() {
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
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'updateStatus', order_id, status })
      })
      setOrders(prev =>
        prev.map(o => o.order_id === order_id ? { ...o, status: status as any } : o)
      )
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-amber-900 text-white px-6 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👨‍🍳</span>
            <div>
              <h1 className="text-xl font-bold">Barista Dashboard</h1>
              <p className="text-amber-200 text-sm">Brew & Co — Order Queue</p>
            </div>
          </div>
          <button
            onClick={fetchOrders}
            className="bg-amber-700 hover:bg-amber-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 text-lg">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-4xl mb-3">☕</p>
          <p className="text-gray-500 text-lg">No orders yet. Enjoy the calm!</p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Pending Column */}
          <div>
            <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>
              Pending ({pendingOrders.length})
            </h2>
            <div className="space-y-4">
              {pendingOrders.map(order => (
                <OrderCard key={order.order_id} order={order} onUpdateStatus={updateStatus} getStatusColor={getStatusColor} />
              ))}
            </div>
          </div>

          {/* In Progress Column */}
          <div>
            <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-400 inline-block"></span>
              In Progress ({inProgressOrders.length})
            </h2>
            <div className="space-y-4">
              {inProgressOrders.map(order => (
                <OrderCard key={order.order_id} order={order} onUpdateStatus={updateStatus} getStatusColor={getStatusColor} />
              ))}
            </div>
          </div>

          {/* Completed Column */}
          <div>
            <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span>
              Completed ({completedOrders.length})
            </h2>
            <div className="space-y-4">
              {completedOrders.map(order => (
                <OrderCard key={order.order_id} order={order} onUpdateStatus={updateStatus} getStatusColor={getStatusColor} />
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

function OrderCard({ order, onUpdateStatus, getStatusColor }: {
  order: Order
  onUpdateStatus: (id: string, status: string) => void
  getStatusColor: (status: string) => string
}) {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
  const time = new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-bold text-gray-800 text-sm">#{order.order_id.slice(-6).toUpperCase()}</p>
          <p className="text-gray-400 text-xs">{time}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        {items.map((item: any, i: number) => (
          <div key={i} className="text-sm">
            <p className="font-semibold text-gray-800">{item.quantity}x {item.name}</p>
            <p className="text-gray-500 text-xs">
              {[item.size, item.temperature, item.milk, ...(item.modifications || [])].filter(Boolean).join(' · ')}
            </p>
          </div>
        ))}
      </div>

      {order.special_notes && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mb-3">
          📝 {order.special_notes}
        </p>
      )}

      <div className="flex gap-2">
        {order.status === 'pending' && (
          <button
            onClick={() => onUpdateStatus(order.order_id, 'in-progress')}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-2 rounded-lg transition-colors"
          >
            Start
          </button>
        )}
        {order.status === 'in-progress' && (
          <button
            onClick={() => onUpdateStatus(order.order_id, 'completed')}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-2 rounded-lg transition-colors"
          >
            Complete ✓
          </button>
        )}
        {order.status === 'completed' && (
          <p className="text-center text-green-600 text-xs font-medium w-full py-2">✓ Done</p>
        )}
      </div>
    </div>
  )
}