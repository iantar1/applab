import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clear existing services
  await prisma.service.deleteMany();

  const services = [
    {
      name: "Complete Blood Count (CBC)",
      description:
        "Full blood count test including WBC, RBC, hemoglobin, and platelets",
      price: 150,
      category: "Blood Tests",
    },
    {
      name: "Blood Glucose Test",
      description: "Fasting glucose test for diabetes screening",
      price: 100,
      category: "Blood Tests",
    },
    {
      name: "Lipid Panel",
      description:
        "Tests cholesterol levels including HDL, LDL, and triglycerides",
      price: 200,
      category: "Blood Tests",
    },
    {
      name: "Liver Function Test",
      description:
        "Tests for liver enzymes and bilirubin levels (ALT, AST, GGT)",
      price: 180,
      category: "Blood Tests",
    },
    {
      name: "Kidney Function Test",
      description:
        "Tests for creatinine and urea to assess kidney health (BUN, Creatinine)",
      price: 170,
      category: "Blood Tests",
    },
    {
      name: "Thyroid Function Test (TSH)",
      description: "Tests thyroid stimulating hormone (TSH) levels",
      price: 160,
      category: "Blood Tests",
    },
    {
      name: "Vitamin D Test",
      description: "25-hydroxy vitamin D test",
      price: 220,
      category: "Blood Tests",
    },
    {
      name: "Chest X-Ray",
      description: "Digital X-ray imaging of the chest",
      price: 350,
      category: "Imaging",
    },
    {
      name: "Abdominal Ultrasound",
      description: "Ultrasound imaging of abdominal organs",
      price: 400,
      category: "Imaging",
    },
    {
      name: "Pelvic Ultrasound",
      description: "Ultrasound imaging for reproductive system assessment",
      price: 380,
      category: "Imaging",
    },
    {
      name: "Thyroid Ultrasound",
      description: "Ultrasound imaging of the thyroid gland",
      price: 320,
      category: "Imaging",
    },
    {
      name: "Electrocardiogram (ECG)",
      description: "Heart electrical activity recording",
      price: 250,
      category: "Cardiac",
    },
    {
      name: "Blood Pressure Monitoring",
      description: "Professional blood pressure check and recording",
      price: 50,
      category: "General",
    },
    {
      name: "Urinalysis",
      description: "Complete urine analysis test",
      price: 120,
      category: "Blood Tests",
    },
    {
      name: "COVID-19 PCR Test",
      description: "PCR test for COVID-19 detection",
      price: 200,
      category: "Infectious Disease",
    },
  ];

  for (const service of services) {
    await prisma.service.create({
      data: service,
    });
  }

  // Create a sample admin/test user if not exists
  const existingUser = await prisma.user.findUnique({ where: { phone: '+212600000000' } });
  if (!existingUser) {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('password123', salt);
    await prisma.user.create({
      data: {
        fullName: 'Admin User',
        email: 'admin@example.com',
        phone: '+212600000000',
        cin: 'AA123456',
        password: hashed,
      },
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
