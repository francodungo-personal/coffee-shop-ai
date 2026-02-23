const SHEET_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL!

export interface OrderItem {
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
}

export interface Order {
  order_id: string
  timestamp: string
  items: OrderItem[]
  total: number
  status: 'pending' | 'in-progress' | 'completed'
  customer_name?: string
  special_notes?: string
}

export async function saveOrder(order: Order): Promise<boolean> {
  try {
    const response = await fetch(SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'addOrder', order })
    })
    return true
  } catch (error) {
    console.error('Error saving order:', error)
    return false
  }
}

export async function fetchOrders(): Promise<Order[]> {
  try {
    const response = await fetch(`${SHEET_URL}?t=${Date.now()}`)
    const data = await response.json()
    return data.orders.map((row: any) => ({
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      total: parseFloat(row.total)
    }))
  } catch (error) {
    console.error('Error fetching orders:', error)
    return []
  }
}

export async function updateOrderStatus(order_id: string, status: string): Promise<boolean> {
  try {
    await fetch(SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'updateStatus', order_id, status })
    })
    return true
  } catch (error) {
    console.error('Error updating order status:', error)
    return false
  }
}