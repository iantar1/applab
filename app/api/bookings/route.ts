import { NextResponse } from 'next/server';

// Temporary in-memory storage - will replace with database later
let bookings: any[] = [];
let bookingCounter = 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const booking = {
      id: ++bookingCounter,
      ...body,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    bookings.push(booking);

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const booking = bookings.find(b => b.id === parseInt(id));
      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ booking });
    }

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
