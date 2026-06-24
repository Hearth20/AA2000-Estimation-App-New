import { jsPDF } from "jspdf";
import { computeAccessControlMeanCosts } from "./accessControlMeanPricing";
import { computeBurglarAlarmMeanCosts } from "./burglarAlarmMeanPricing";
import { CONSUMABLE_DEFAULT_PRICES } from "./consumableDefaultPrices";
import { computeCctvMeanCosts } from "./cctvMeanPricing";
import { computeFireAlarmMeanCosts } from "./fireAlarmMeanPricing";
import { computeFireProtectionMeanCosts } from "./fireProtectionMeanPricing";
import logoUrl from "../assets/images/logo.svg";

const PRICES = {
  LABOR_TECH_RATE_DAY: 1200,
  VAT: 0.12,
};

const COMPANY_NAME = "AA2000";
const COMPANY_ADDRESS =
  "Unit 2-C Norkis Building, 11 Calbayog Cor., Domingo M. Guevara St., Mandaluyong City, Philippines 1550";
const COMPANY_PHONE = "T: (02) 8571-5693   M: 0917-884-8844";
const COMPANY_EMAIL = "E: aa2000ent@gmail.com   Web: www.aa2000ph.com";
let cachedLogoDataUrl: string | null = null;

const formatCurrency = (val: number): string => {
  const safe = Number.isFinite(val) ? val : 0;
  const numeric = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  // Use explicit currency code to avoid jsPDF default-font glyph issues with the peso symbol.
  return `PHP ${numeric}`;
};

const formatDate = (value: unknown): string => {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
};

const loadLogoAsPngDataUrl = async (): Promise<string | null> => {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = logoUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width || 180;
    canvas.height = img.naturalHeight || img.height || 180;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    cachedLogoDataUrl = canvas.toDataURL("image/png");
    return cachedLogoDataUrl;
  } catch {
    return null;
  }
};

function getModuleDataByType(selectedProject: any, surveyType: string): any {
  if (surveyType === "CCTV") return selectedProject?.cctvData;
  if (surveyType === "Fire Alarm") return selectedProject?.faData;
  if (surveyType === "Fire Protection") return selectedProject?.fpData;
  if (surveyType === "Access Control") return selectedProject?.acData;
  if (surveyType === "Burglar Alarm") return selectedProject?.baData;
  if (surveyType === "Other") return selectedProject?.otherData;
  return null;
}

function normalizeConsumableName(raw: string): string {
  return String(raw || "")
    .replace(/\s*\(suggested\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSystemEstimate(surveyType: string, moduleData: any, est: any) {
  let equipment = 0;
  let cables = 0;
  const manDays = est ? (Number(est.days) || 0) * (Number(est.techs) || 0) : 0;
  const labor = manDays * PRICES.LABOR_TECH_RATE_DAY;
  const consumables = Array.isArray(est?.consumablesList)
    ? est.consumablesList.reduce((s: number, e: any) => {
        const normalized = normalizeConsumableName(e?.name);
        const unit = Number(e?.unitPrice) || (normalized ? CONSUMABLE_DEFAULT_PRICES[normalized] || 0 : 0);
        return s + (Number(e?.qty) || 0) * unit;
      }, 0)
    : 0;
  const additional = Array.isArray(est?.additionalFees)
    ? est.additionalFees.reduce((s: number, f: any) => s + (Number(f?.amount) || 0), 0)
    : 0;

  if (surveyType === "CCTV" && moduleData?.cameras && Array.isArray(moduleData.cameras)) {
    const computed = computeCctvMeanCosts(moduleData);
    equipment = computed.equipment;
    cables = computed.cablesCost;
  }
  if (surveyType === "Fire Alarm" && moduleData?.detectionAreas && Array.isArray(moduleData.detectionAreas)) {
    const computed = computeFireAlarmMeanCosts(moduleData);
    equipment = computed.equipment;
    cables = computed.cablesCost;
  }
  if (surveyType === "Fire Protection" && moduleData) {
    const computed = computeFireProtectionMeanCosts(moduleData);
    equipment = computed.equipment;
    cables = computed.cablesCost;
  }
  if (surveyType === "Access Control" && moduleData) {
    const computed = computeAccessControlMeanCosts(moduleData);
    equipment = computed.equipment;
    cables = computed.cablesCost;
  }
  if (surveyType === "Burglar Alarm" && moduleData?.sensors != null) {
    const computed = computeBurglarAlarmMeanCosts(moduleData);
    equipment = computed.equipment;
    cables = computed.cablesCost;
  }
  if (surveyType === "Other" && moduleData) {
    equipment = Number(moduleData.estimatedCost) || 0;
    cables = Number(moduleData.cablesCost) || 0;
  }

  const subtotal = equipment + cables + labor + consumables + additional;
  const total = subtotal * (1 + PRICES.VAT);
  return { equipment, cables, labor, consumables, additional, subtotal, total };
}

/**
 * Finalized project report as PDF in a client-ready format with complete cost transparency.
 */
export async function createFinalizedReportPdfBlob(selectedProject: any): Promise<Blob | null> {
  if (!selectedProject?.project) return null;
  const logoDataUrl = await loadLogoAsPngDataUrl();

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;
  const maxW = pageW - margin * 2;
  const contentBottom = pageH - 22; // reserve blue footer band space
  let y = 52;

  const p = selectedProject.project;
  const estimations = selectedProject.estimations || {};
  const techNotes = String(selectedProject.techNotes || "").trim();
  const remarks = Array.isArray(selectedProject.remarks) ? selectedProject.remarks : [];
  const finalizationDate = p?.finalization?.actedAt || selectedProject?.timestamp || p?.date;

  type CostRow = { category: string; item: string; qtyHours: string; unitCost: string; subtotal: string };
  const allCostRows: CostRow[] = [];
  let totalProjectCost = 0;

  const estKeys = Object.keys(estimations);
  for (const key of estKeys) {
    const est = estimations[key] || {};
    const moduleData = getModuleDataByType(selectedProject, key);

    const cost = getSystemEstimate(key, moduleData, est);
    totalProjectCost += cost.total;
    allCostRows.push({
      category: "Cost Summary",
      item: `${key}: Hardware`,
      qtyHours: "-",
      unitCost: "-",
      subtotal: formatCurrency(cost.equipment),
    });
    allCostRows.push({
      category: "Cost Summary",
      item: `${key}: Cabling`,
      qtyHours: "-",
      unitCost: "-",
      subtotal: formatCurrency(cost.cables),
    });
    allCostRows.push({
      category: "Cost Summary",
      item: `${key}: Labor`,
      qtyHours: `${Number(est?.days) || 0}d x ${Number(est?.techs) || 0} tech`,
      unitCost: formatCurrency(PRICES.LABOR_TECH_RATE_DAY),
      subtotal: formatCurrency(cost.labor),
    });
    if (cost.consumables > 0) {
      allCostRows.push({
        category: "Cost Summary",
        item: `${key}: Consumables`,
        qtyHours: "-",
        unitCost: "-",
        subtotal: formatCurrency(cost.consumables),
      });
    }
    if (cost.additional > 0) {
      allCostRows.push({
        category: "Cost Summary",
        item: `${key}: Additional Fees`,
        qtyHours: "-",
        unitCost: "-",
        subtotal: formatCurrency(cost.additional),
      });
    }
    allCostRows.push({
      category: "Estimated",
      item: `Estimated (${key}) with VAT`,
      qtyHours: "-",
      unitCost: "-",
      subtotal: formatCurrency(cost.total),
    });
  }
  if (!allCostRows.length) {
    allCostRows.push({
      category: "Estimated",
      item: "No estimation records attached",
      qtyHours: "-",
      unitCost: "-",
      subtotal: formatCurrency(0),
    });
  }

  const drawFooterBand = () => {
    const fh = 18;
    const fy = pageH - fh;
    doc.setFillColor(10, 66, 124);
    doc.rect(0, fy, pageW, fh, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    doc.text(`${COMPANY_ADDRESS}   |   ${COMPANY_PHONE}   |   ${COMPANY_EMAIL}`, margin, fy + 7);
    doc.text(
      "Disclaimer: This report is generated for client presentation and reflects finalized project details.",
      margin,
      fy + 13,
    );
    doc.setTextColor(32, 32, 32);
  };

  const drawHeaderBand = () => {
    doc.setFillColor(15, 58, 110);
    doc.rect(0, 0, pageW, 30, "F");
    doc.setFillColor(26, 95, 160);
    doc.triangle(pageW - 55, 0, pageW, 0, pageW, 30, "F");
    doc.setTextColor(255, 255, 255);
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", margin, 5, 17, 17);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text(COMPANY_NAME, margin + 21, 13);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("Security and Technology Solutions Inc.", margin + 21, 18.5);
    doc.setFontSize(8);
    doc.text(
      "Unit 2-C Norkis Building, 11 Calbayog Cor., Domingo M. Guevara St.,",
      pageW - margin,
      10.5,
      { align: "right" },
    );
    doc.text("Mandaluyong City, Philippines 1550", pageW - margin, 15.0, { align: "right" });
    doc.text("T: (02) 8571-5693   M: 0917-884-8844   E: aa2000ent@gmail.com", pageW - margin, 19.2, {
      align: "right",
    });
    doc.text("Web: www.aa2000ph.com", pageW - margin, 23.0, { align: "right" });
    doc.setTextColor(24, 61, 94);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("FINALIZED PROJECT REPORT", margin, 38);
    doc.setFontSize(12.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(String(p?.name || "Site Inspection"), margin, 46.5);
    doc.setFontSize(10);
    doc.text(formatDate(finalizationDate), pageW - margin, 46.5, { align: "right" });
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > contentBottom) {
      doc.addPage();
      drawHeaderBand();
      drawFooterBand();
      y = 52;
    }
  };

  const sectionHeading = (text: string) => {
    ensureSpace(7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(40, 40, 40);
    doc.text(text, margin, y);
    y += 4.5;
    doc.setTextColor(20, 20, 20);
  };

  const drawSummaryTable = () => {
    sectionHeading("Project Summary");
    ensureSpace(30);
    const leftX = margin;
    const rightX = margin + maxW / 2 + 3;
    const leftW = maxW / 2 - 3;
    const rightW = maxW / 2 - 3;
    const rowH = 7.5;
    const border = [225, 229, 235] as const;

    const row = (rx: number, ry: number, rw: number, label: string, value: string, highlighted = false) => {
      doc.setDrawColor(border[0], border[1], border[2]);
      if (highlighted) {
        doc.setFillColor(241, 245, 249);
        doc.rect(rx, ry, rw, rowH, "FD");
      } else {
        doc.rect(rx, ry, rw, rowH);
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.2);
      doc.setTextColor(65, 65, 65);
      doc.text(label, rx + 2.5, ry + 5);
      doc.setFont("helvetica", highlighted ? "bold" : "normal");
      doc.setTextColor(highlighted ? 21 : 55, highlighted ? 86 : 55, highlighted ? 146 : 55);
      const lines = doc.splitTextToSize(value || "—", rw - 26);
      doc.text(lines[0] || "—", rx + 28, ry + 5);
      doc.setTextColor(32, 32, 32);
    };

    row(leftX, y, leftW, "Client", p?.clientName || "—");
    row(rightX, y, rightW, "Location", p?.locationName || p?.location || "—");
    y += rowH;
    row(leftX, y, leftW, "Technician", p?.technicianName || "—");
    row(rightX, y, rightW, "Status", p?.status || "—");
    y += rowH;
    row(leftX, y, leftW, "Finalized At", formatDate(finalizationDate));
    row(rightX, y, rightW, "Total Cost", formatCurrency(totalProjectCost), true);
    y += rowH + 5;
  };

  const drawCostTable = () => {
    sectionHeading("Cost Breakdown");
    const rowH = 7;
    const x1 = margin;
    const wCat = 26;
    const wItem = 78;
    const wQty = 25;
    const wUnit = 30;
    const wSub = maxW - (wCat + wItem + wQty + wUnit);
    const x2 = x1 + wCat;
    const x3 = x2 + wItem;
    const x4 = x3 + wQty;
    const x5 = x4 + wUnit;

    const drawHeader = () => {
      ensureSpace(rowH * 2);
      doc.setFillColor(245, 248, 252);
      doc.setDrawColor(214, 220, 226);
      doc.rect(x1, y, maxW, rowH, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.8);
      doc.setTextColor(51, 65, 85);
      doc.text("Category", x1 + 2, y + 4.7);
      doc.text("Item/Role", x2 + 2, y + 4.7);
      doc.text("Qty/Hours", x3 + 2, y + 4.7);
      doc.text("Unit Cost", x4 + 2, y + 4.7);
      doc.text("Subtotal", x5 + 2, y + 4.7);
      doc.line(x2, y, x2, y + rowH);
      doc.line(x3, y, x3, y + rowH);
      doc.line(x4, y, x4, y + rowH);
      doc.line(x5, y, x5, y + rowH);
      y += rowH;
    };

    const drawCostRow = (r: { category: string; item: string; qtyHours: string; unitCost: string; subtotal: string }, showCategory: boolean) => {
      ensureSpace(rowH + 1);
      doc.setDrawColor(223, 227, 232);
      doc.rect(x1, y, maxW, rowH);
      doc.line(x2, y, x2, y + rowH);
      doc.line(x3, y, x3, y + rowH);
      doc.line(x4, y, x4, y + rowH);
      doc.line(x5, y, x5, y + rowH);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.7);
      doc.setTextColor(71, 85, 105);
      if (showCategory) doc.text(r.category, x1 + 2, y + 4.7);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(44, 44, 44);
      const itemLines = doc.splitTextToSize(r.item, wItem - 4);
      doc.text(itemLines[0] || "-", x2 + 2, y + 4.7);
      doc.text(r.qtyHours || "-", x3 + 2, y + 4.7);
      doc.text(r.unitCost || "-", x4 + 2, y + 4.7);
      doc.text(r.subtotal || "-", x5 + 2, y + 4.7);
      y += rowH;
    };

    drawHeader();
    let prevCategory = "";
    allCostRows.forEach((r) => {
      if (y + rowH + 12 > contentBottom) drawHeader();
      drawCostRow(r, r.category !== prevCategory);
      prevCategory = r.category;
    });

    ensureSpace(rowH + 2);
    doc.setFillColor(241, 245, 249);
    doc.rect(x1, y, maxW, rowH, "F");
    doc.setDrawColor(205, 214, 225);
    doc.rect(x1, y, maxW, rowH);
    doc.line(x5, y, x5, y + rowH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(45, 55, 72);
      doc.text("Total Cost (Project, VAT Inc.)", x5 - 2, y + 4.8, { align: "right" });
    doc.setTextColor(18, 82, 141);
    doc.text(formatCurrency(totalProjectCost), x5 + 2, y + 4.8);
    doc.setTextColor(32, 32, 32);
    y += rowH + 6;
  };

  const drawSimpleTable = (headers: string[], rows: string[][], columnWidths: number[]) => {
    const rowH = 6.4;
    const x = margin;
    const totalW = columnWidths.reduce((a, b) => a + b, 0);
    const drawHeader = () => {
      ensureSpace(rowH * 2);
      doc.setFillColor(245, 248, 252);
      doc.setDrawColor(214, 220, 226);
      doc.rect(x, y, totalW, rowH, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.6);
      let cx = x;
      headers.forEach((h, i) => {
        doc.text(h, cx + 1.8, y + 4.3);
        cx += columnWidths[i];
        if (i < headers.length - 1) doc.line(cx, y, cx, y + rowH);
      });
      y += rowH;
    };
    const drawRow = (cells: string[]) => {
      ensureSpace(rowH + 1);
      doc.setDrawColor(223, 227, 232);
      doc.rect(x, y, totalW, rowH);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.4);
      let cx = x;
      cells.forEach((c, i) => {
        const text = doc.splitTextToSize(c || "-", columnWidths[i] - 3);
        doc.text(String(text[0] || "-"), cx + 1.8, y + 4.3);
        cx += columnWidths[i];
        if (i < cells.length - 1) doc.line(cx, y, cx, y + rowH);
      });
      y += rowH;
    };
    drawHeader();
    rows.forEach((r) => {
      if (y + rowH + 4 > contentBottom) drawHeader();
      drawRow(r);
    });
  };

  const drawTechnicalTables = () => {
    sectionHeading("Technical Breakdown");
    if (!estKeys.length) {
      ensureSpace(8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.4);
      doc.text("No estimation records attached to this finalized report.", margin, y + 4);
      y += 10;
      return;
    }

    estKeys.forEach((k) => {
      const est = estimations[k] || {};
      const siteBits = [est?.siteConstraintPhysical, est?.siteConstraintElectrical, est?.siteConstraintInstallation]
        .filter(Boolean)
        .join(" | ");

      ensureSpace(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(24, 61, 94);
      doc.text(`System: ${k}`, margin, y + 4);
      doc.setTextColor(32, 32, 32);
      y += 8;

      drawSimpleTable(
        ["Duration", "Technicians", "Site Constraints"],
        [[`${est?.days ?? "—"} day(s)`, `${est?.techs ?? "—"} tech(s)`, siteBits || "None recorded"]],
        [28, 30, maxW - 58],
      );
      y += 2;

      const mpRows = Array.isArray(est?.manpowerBreakdown) && est.manpowerBreakdown.length
        ? est.manpowerBreakdown.map((m: any) => [
            String(m?.role || "Technician"),
            String(Number(m?.count) || 0),
            `${Number(m?.hours) || 0} hrs`,
          ])
        : [["No manpower breakdown recorded", "-", "-"]];
      drawSimpleTable(["Manpower Role", "Count", "Hours"], mpRows, [maxW - 46, 20, 26]);
      y += 2;

      const consRows = Array.isArray(est?.consumablesList) && est.consumablesList.length
        ? est.consumablesList.map((c: any) => [String(c?.name || "Consumable"), String(Number(c?.qty) || 0), formatCurrency((Number(c?.qty) || 0) * (Number(c?.unitPrice) || CONSUMABLE_DEFAULT_PRICES[String(c?.name || "")] || 0))])
        : [["No consumables recorded", "-", "-"]];
      drawSimpleTable(["Consumable", "Qty", "Line Cost"], consRows, [maxW - 56, 16, 40]);
      y += 4;
    });

    sectionHeading("Remarks");
    const remarkRows: string[][] = [];
    remarkRows.push(["Technician", techNotes || "No technician remarks recorded."]);
    if (!remarks.length) {
      remarkRows.push(["Department", "No department remarks recorded."]);
    } else {
      remarks.forEach((r: any, i: number) => {
        const sender = r?.sender || "Department";
        const ts = r?.timestamp ? ` (${formatDate(r.timestamp)})` : "";
        remarkRows.push([`${i + 1}. ${sender}${ts}`, String(r?.text || "")]);
      });
    }
    drawSimpleTable(["Source", "Remarks"], remarkRows, [38, maxW - 38]);
  };

  drawHeaderBand();
  drawFooterBand();
  drawSummaryTable();
  drawCostTable();
  drawTechnicalTables();

  return doc.output("blob");
}

export async function downloadFinalizedReportPdf(selectedProject: any): Promise<void> {
  if (!selectedProject?.project) return;
  const blob = await createFinalizedReportPdfBlob(selectedProject);
  if (!blob) return;
  const safe = String(selectedProject?.project?.name || selectedProject?.project?.id || "report")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `AA2000_FINAL_${safe}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
