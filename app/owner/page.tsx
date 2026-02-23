'use client'

import { useState, useEffect } from 'react'
import { Order } from '@/lib/googleSheets'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#92400e', '#d97706', '#fbbf24', '#fcd34d', '#fef3c7']

export default function OwnerDashboard() {
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

  // Calculate metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total as any) || 0), 0)
  const totalOrders = orders.length
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const completedOrders = orders.filter(o => o.status === 'completed').length
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0

  // Item popularity
  const itemCounts: Record<string, number> = {}
  orders.forEach(order => {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    items?.forEach((item: any) => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1)
    })
  })
  const popularItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  // Revenue by hour
  const hourlyRevenue: Record<number, number> = {}
  orders.forEach(order => {
    const hour = new Date(order.timestamp).getHours()
    hourlyRevenue[hour] = (hourlyRevenue[hour] || 0) + (parseFloat(order.total as any) || 0)
  })
  const hourlyData = Object.entries(hourlyRevenue)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([hour, revenue]) => ({
      hour: `${hour}:00`,
      revenue: parseFloat(revenue.toFixed(2))
    }))

  // Milk preference breakdown
  const milkCounts: Record<string, number> = {}
  orders.forEach(order => {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    items?.forEach((item: any) => {
      if (item.milk) {
        milkCounts[item.milk] = (milkCounts[item.milk] || 0) + 1
      }
    })
  })
  const milkData = Object.entries(milkCounts)
    .map(([name, value]) => ({ name, value }))

  // Order status breakdown
  const statusCounts = {
    pending: orders.filter(o => o.status === 'pending').length,
    'in-progress': orders.filter(o => o.status === 'in-progress').length,
    completed: orders.filter(o => o.status === 'completed').length,
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-amber-900 text-white px-6 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h1 className="text-xl font-bold">Owner Dashboard</h1>
              <p className="text-amber-200 text-sm">Brew & Co — Business Insights</p>
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

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* KPI Cards */}
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

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Popular Items */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4">🏆 Most Popular Items</h2>
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
            ) : (
              <p className="text-gray-400 text-sm text-center py-10">No data yet</p>
            )}
          </div>

          {/* Milk Preferences */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4">🥛 Milk Preferences</h2>
            {milkData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={milkData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {milkData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm text-center py-10">No data yet</p>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Revenue by Hour */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4">⏰ Revenue by Hour</h2>
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
            ) : (
              <p className="text-gray-400 text-sm text-center py-10">No data yet</p>
            )}
          </div>

          {/* Order Status */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4">📋 Order Status Breakdown</h2>
            <div className="space-y-3 mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>
                  <span className="text-sm text-gray-600">Pending</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div className="bg-yellow-400 h-2 rounded-full" style={{ width: totalOrders > 0 ? `${(statusCounts.pending / totalOrders) * 100}%` : '0%' }} />
                  </div>
                  <span className="text-sm font-medium text-gray-800 w-6">{statusCounts.pending}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-400 inline-block"></span>
                  <span className="text-sm text-gray-600">In Progress</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-400 h-2 rounded-full" style={{ width: totalOrders > 0 ? `${(statusCounts['in-progress'] / totalOrders) * 100}%` : '0%' }} />
                  </div>
                  <span className="text-sm font-medium text-gray-800 w-6">{statusCounts['in-progress']}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span>
                  <span className="text-sm text-gray-600">Completed</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div className="bg-green-400 h-2 rounded-full" style={{ width: totalOrders > 0 ? `${(statusCounts.completed / totalOrders) * 100}%` : '0%' }} />
                  </div>
                  <span className="text-sm font-medium text-gray-800 w-6">{statusCounts.completed}</span>
                </div>
              </div>
            </div>

            {/* Recent Orders Table */}
            <h2 className="font-bold text-gray-800 mt-6 mb-3">🕐 Recent Orders</h2>
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
    </div>
  )
}