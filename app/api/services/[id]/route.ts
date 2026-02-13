import { NextResponse } from 'next/server';

const services: { [key: number]: any } = {
  1: {
    id: 1,
    name: 'Complete Blood Count (CBC)',
    description: 'Comprehensive blood analysis including red blood cells, white blood cells, and platelets',
    fullDescription: 'A CBC test measures different components of your blood to detect various diseases and conditions. This is one of the most common blood tests.',
    price: 500,
    duration: 30,
    category: 'Blood Tests',
    preparation: 'No special preparation required. You can eat and drink normally.',
    results: '1-2 business days'
  },
  2: {
    id: 2,
    name: 'Lipid Profile',
    description: 'Measure cholesterol levels and triglycerides for heart health assessment',
    fullDescription: 'A lipid panel measures cholesterol and triglycerides in your blood to assess your risk for heart disease.',
    price: 700,
    duration: 20,
    category: 'Blood Tests',
    preparation: 'Fasting for 9-12 hours is recommended.',
    results: '1-2 business days'
  },
  3: {
    id: 3,
    name: 'Thyroid Function Test',
    description: 'TSH, Free T3, and Free T4 tests to assess thyroid health',
    fullDescription: 'Thyroid function tests measure how well your thyroid is working.',
    price: 800,
    duration: 25,
    category: 'Thyroid Tests',
    preparation: 'No special preparation required.',
    results: '2-3 business days'
  },
  4: {
    id: 4,
    name: 'Liver Function Test',
    description: 'Assessment of liver health through various liver enzymes and proteins',
    fullDescription: 'Liver function tests measure how well your liver is working.',
    price: 600,
    duration: 25,
    category: 'Function Tests',
    preparation: 'No special preparation required.',
    results: '1-2 business days'
  },
  5: {
    id: 5,
    name: 'Kidney Function Test',
    description: 'Creatinine and urea levels to assess kidney function',
    fullDescription: 'Kidney function tests measure how well your kidneys are filtering waste.',
    price: 550,
    duration: 20,
    category: 'Function Tests',
    preparation: 'No special preparation required.',
    results: '1-2 business days'
  },
  6: {
    id: 6,
    name: 'COVID-19 RT-PCR Test',
    description: 'Rapid COVID-19 detection using RT-PCR technology',
    fullDescription: 'A highly accurate COVID-19 test using RT-PCR technology.',
    price: 450,
    duration: 15,
    category: 'Viral Tests',
    preparation: 'No preparation needed.',
    results: '24 hours'
  }
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = services[parseInt(id)];

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ service });
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service' },
      { status: 500 }
    );
  }
}
