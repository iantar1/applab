import PDFDocument from "pdfkit";
import { Readable } from "stream";

interface AppointmentData {
  id: string;
  appointmentDate: Date;
  totalPrice: number;
  insuranceProvider?: string | null;
  insuranceId?: string | null;
  userName: string;
  userCIN: string;
  serviceName: string;
}

export function generateInsurancePDF(
  appointment: AppointmentData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on("error", reject);

    // Header
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("Lab Service Invoice", { align: "center" });

    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Professional Medical Laboratory Services", { align: "center" });

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Invoice details
    doc.fontSize(11).font("Helvetica-Bold").text("Invoice Details");
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Invoice Number: ${appointment.id}`);
    doc.text(
      `Date: ${new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`
    );
    doc.text(
      `Service Date: ${appointment.appointmentDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`
    );

    doc.moveDown(1);

    // Patient Information
    doc.fontSize(11).font("Helvetica-Bold").text("Patient Information");
    doc.fontSize(10).font("Helvetica").text(`Full Name: ${appointment.userName}`);
    doc.text(`CIN: ${appointment.userCIN}`);

    if (appointment.insuranceProvider) {
      doc.text(`Insurance Provider: ${appointment.insuranceProvider}`);
    }
    if (appointment.insuranceId) {
      doc.text(`Insurance ID: ${appointment.insuranceId}`);
    }

    doc.moveDown(1);

    // Service Details
    doc.fontSize(11).font("Helvetica-Bold").text("Service Details");
    doc.fontSize(10).font("Helvetica").text(`Service: ${appointment.serviceName}`);
    doc.text(
      `Price: ${appointment.totalPrice.toFixed(2)} MAD`,
      { width: 300 }
    );

    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Total
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text(`Total Amount: ${appointment.totalPrice.toFixed(2)} MAD`, {
      align: "right",
    });

    doc.moveDown(2);

    // Footer
    doc
      .fontSize(9)
      .font("Helvetica")
      .text("This invoice is valid for insurance claim purposes.", {
        align: "center",
      });
    doc.text(
      "Please retain this document for your records and insurance submission.",
      { align: "center" }
    );

    doc.end();
  });
}
