import jsPDF from 'jspdf'

const FONT_URL = 'https://fonts.gstatic.com/s/roboto/v47/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbGmT.ttf'

let fontCache: ArrayBuffer | null = null

export async function registerTurkishFont(pdf: jsPDF): Promise<void> {
  if (!fontCache) {
    const response = await fetch(FONT_URL)
    fontCache = await response.arrayBuffer()
  }

  const fontBase64 = arrayBufferToBase64(fontCache)
  pdf.addFileToVFS('Roboto-Regular.ttf', fontBase64)
  pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  pdf.setFont('Roboto')
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
