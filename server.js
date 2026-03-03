const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const path = require('path');
const { chromium } = require('playwright');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

function findFirstHtmlInZip(zipBuffer) {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  const htmlEntry = entries.find((entry) => {
    if (entry.isDirectory) {
      return false;
    }

    const lowerName = entry.entryName.toLowerCase();
    return lowerName.endsWith('.html') || lowerName.endsWith('.htm');
  });

  if (!htmlEntry) {
    return null;
  }

  return htmlEntry.getData().toString('utf8');
}

function sanitizeFileName(name) {
  return name
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function stripHtmlTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveInvoiceName(htmlContent, originalFileName, index) {
  const fileBase = path.parse(originalFileName).name;

  const titleMatch = htmlContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    const cleaned = sanitizeFileName(stripHtmlTags(titleMatch[1]));
    if (cleaned) {
      return cleaned;
    }
  }

  const h1Match = htmlContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    const cleaned = sanitizeFileName(stripHtmlTags(h1Match[1]));
    if (cleaned) {
      return cleaned;
    }
  }

  const plainText = stripHtmlTags(htmlContent);
  const buildingMatch = plainText.match(/([A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜ0-9 .'-]{2,80}?(SİTESİ|SITE|SİTE|BİNASI|BINASI|BINA|BİNA))/i);
  if (buildingMatch && buildingMatch[1]) {
    const cleaned = sanitizeFileName(buildingMatch[1]);
    if (cleaned) {
      return cleaned;
    }
  }

  return sanitizeFileName(fileBase) || `fatura-${index + 1}`;
}

function explainBrowserError(error) {
  const message = (error && error.message) || '';

  if (message.includes('Executable doesn\'t exist')) {
    return 'Playwright tarayıcı bileşeni eksik. Sunucuda `npx playwright install chromium` çalıştırın.';
  }

  if (message.includes('No usable sandbox')) {
    return 'Sunucu ortamında Chromium sandbox hatası oluştu. Uygulama artık no-sandbox ile açılıyor; sorun sürerse sistem yöneticinize danışın.';
  }

  return null;
}

async function convertHtmlToPdfBuffer(browser, htmlContent, sourceName) {
  const page = await browser.newPage();
  try {
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 45000 });

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
  } catch (error) {
    throw new Error(`PDF üretimi başarısız (${sourceName}): ${error.message}`);
  } finally {
    await page.close();
  }
}

app.post('/convert', upload.array('zipFiles', 30), async (req, res) => {
  const files = req.files || [];

  if (files.length === 0) {
    return res.status(400).json({ error: 'Lütfen en az bir ZIP dosyası yükleyin.' });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const outputZip = new AdmZip();
    const usedNames = new Set();

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      let htmlContent;

      try {
        htmlContent = findFirstHtmlInZip(file.buffer);
      } catch (error) {
        return res.status(400).json({ error: `Geçersiz ZIP dosyası: ${file.originalname}` });
      }

      if (!htmlContent) {
        return res.status(400).json({ error: `ZIP içinde HTML bulunamadı: ${file.originalname}` });
      }

      const pdfBuffer = await convertHtmlToPdfBuffer(browser, htmlContent, file.originalname);
      const baseName = deriveInvoiceName(htmlContent, file.originalname, i) || `fatura-${i + 1}`;

      let finalName = `${baseName}.pdf`;
      let duplicateCounter = 2;
      while (usedNames.has(finalName.toLowerCase())) {
        finalName = `${baseName} (${duplicateCounter}).pdf`;
        duplicateCounter += 1;
      }
      usedNames.add(finalName.toLowerCase());

      outputZip.addFile(finalName, pdfBuffer);
    }

    const zipBuffer = outputZip.toBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="faturalar_pdf.zip"');
    res.send(zipBuffer);
  } catch (error) {
    console.error('convert_error:', error);
    const browserHint = explainBrowserError(error);
    if (browserHint) {
      return res.status(500).json({ error: browserHint });
    }

    return res.status(500).json({
      error: error.message || 'Dönüştürme sırasında bir hata oluştu.'
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Uygulama çalışıyor: http://localhost:${PORT}`);
});
