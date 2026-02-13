import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Hardcoded services for now - will connect to database via Prisma
    const services = [
      {
        id: 1,
        name: 'Complete Blood Count (CBC)',
        description: 'Comprehensive blood analysis including red blood cells, white blood cells, and platelets',
        price: 500,
        duration: 30,
        category: 'Blood Tests'
      },
      {
        id: 2,
        name: 'Lipid Profile',
        description: 'Measure cholesterol levels and triglycerides for heart health assessment',
        price: 700,
        duration: 20,
        category: 'Blood Tests'
      },
      {
        id: 3,
        name: 'Thyroid Function Test',
        description: 'TSH, Free T3, and Free T4 tests to assess thyroid health',
        price: 800,
        duration: 25,
        category: 'Thyroid Tests'
      },
      {
        id: 4,
        name: 'Liver Function Test',
        description: 'Assessment of liver health through various liver enzymes and proteins',
        price: 600,
        duration: 25,
        category: 'Function Tests'
      },
      {
        id: 5,
        name: 'Kidney Function Test',
        description: 'Creatinine and urea levels to assess kidney function',
        price: 550,
        duration: 20,
        category: 'Function Tests'
      },
      {
        id: 6,
        name: 'COVID-19 RT-PCR Test',
        description: 'Rapid COVID-19 detection using RT-PCR technology',
        price: 450,
        duration: 15,
        category: 'Viral Tests'
      }
    ];

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}
