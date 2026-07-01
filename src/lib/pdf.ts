// ─────────────────────────────────────────────────────────────
// pdf.ts — render a plain-text CV / cover letter into a clean,
// send-ready A4 PDF using jsPDF. Detects the candidate name, ALL-CAPS
// section headings (PROFILE, KEY SKILLS, …) and hyphen bullets, and
// paginates automatically.
// ─────────────────────────────────────────────────────────────
import { jsPDF } from 'jspdf'

interface PdfOptions {
  /** 'cv' renders the first line as a name header; 'cover_letter' renders as a letter. */
  type?: 'cv' | 'cover_letter'
}

function isHeading(line: string): boolean {
  const t = line.trim()
  if (t.length < 2 || t.length > 42) return false
  if (t.includes('@') || /\d{4}/.test(t)) return false // not contact / dates
  return t === t.toUpperCase() && /[A-Z]/.test(t) && !/[a-z]/.test(t)
}

export function downloadAsPdf(content: string, filename: string, opts: PdfOptions = {}): void {
  const type = opts.type || 'cv'
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 54
  const maxW = pageW - margin * 2
  const lineH = 15
  let y = margin

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }

  const lines = content.replace(/\r/g, '').split('\n')
  let nameDone = false

  for (const raw of lines) {
    const trimmed = raw.replace(/\t/g, '  ').trim()

    if (trimmed === '') {
      y += lineH * 0.5
      continue
    }

    // Candidate name (CV only): first short, comma-free, non-"Dear" line.
    if (
      !nameDone &&
      type === 'cv' &&
      !/^dear\b/i.test(trimmed) &&
      !trimmed.includes(':') &&
      trimmed.split(/\s+/).length <= 5
    ) {
      nameDone = true
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      ensureSpace(26)
      doc.text(trimmed, margin, y)
      y += 26
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10.5)
      continue
    }
    nameDone = true

    if (isHeading(trimmed)) {
      y += 6
      ensureSpace(lineH + 6)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(30)
      doc.text(trimmed, margin, y)
      doc.setDrawColor(200)
      doc.setLineWidth(0.5)
      doc.line(margin, y + 4, pageW - margin, y + 4)
      y += lineH + 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10.5)
      doc.setTextColor(40)
      continue
    }

    const isBullet = /^[-•]\s+/.test(trimmed)
    const text = isBullet ? trimmed.replace(/^[-•]\s+/, '') : trimmed
    const indent = isBullet ? 14 : 0
    const wrapped = doc.splitTextToSize(text, maxW - indent) as string[]
    for (let i = 0; i < wrapped.length; i++) {
      ensureSpace(lineH)
      if (isBullet && i === 0) doc.text('•', margin, y)
      doc.text(wrapped[i], margin + indent, y)
      y += lineH
    }
  }

  // Footer page numbers
  const pageCount = doc.getNumberOfPages()
  if (pageCount > 1) {
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`${p} / ${pageCount}`, pageW - margin, pageH - 24, { align: 'right' })
    }
  }

  const safe = filename.replace(/\.(txt|pdf)$/i, '')
  doc.save(`${safe}.pdf`)
}
