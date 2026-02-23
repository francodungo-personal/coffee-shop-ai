import { NextRequest, NextResponse } from 'next/server'
import { saveOrder, fetchOrders, Order } from '@/lib/googleSheets'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const { items, total, special_notes, customer_name } = await req.json()

    const order: Order = {
      order_id: uuidv4(),
      timestamp: new Date().toISOString(),
      items,
      total,
      status: 'pending',
      customer_name: customer_name || 'Guest',
      special_notes: special_notes || ''
    }

    const success = await saveOrder(order)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save order' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Orders API error:', error)
    return NextResponse.json(
      { error: 'Failed to process order' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const orders = await fetchOrders()
    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Fetch orders error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}