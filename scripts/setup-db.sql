-- Create extensions if not already created
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create services table
CREATE TABLE IF NOT EXISTS "services" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS "appointments" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "serviceId" UUID NOT NULL REFERENCES "services"(id) ON DELETE CASCADE,
  "appointmentDate" TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  "stripePaymentId" VARCHAR(255),
  "stripeSessionId" VARCHAR(255),
  notes TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_appointments_userId" ON "appointments"("userId");
CREATE INDEX IF NOT EXISTS "idx_appointments_serviceId" ON "appointments"("serviceId");
CREATE INDEX IF NOT EXISTS "idx_appointments_status" ON "appointments"(status);
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"(email);

-- Insert sample services
INSERT INTO "services" (name, description, price, duration) VALUES
  ('Blood Test', 'Complete blood count and analysis', 1500.00, 30),
  ('Ultrasound Scan', 'General ultrasound examination', 2000.00, 45),
  ('COVID-19 Test', 'Rapid COVID-19 testing', 500.00, 15),
  ('ECG', 'Electrocardiogram test', 1000.00, 20),
  ('X-Ray', 'Digital X-Ray imaging', 800.00, 25)
ON CONFLICT DO NOTHING;
