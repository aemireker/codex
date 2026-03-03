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

app.post('/convert', upload.single('zipFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Lütfen bir ZIP dosyası yükleyin.' });
  }

  let htmlContent;
  try {
    htmlContent = findFirstHtmlInZip(req.file.buffer);
  } catch (error) {
    return res.status(400).json({ error: 'Geçersiz ZIP dosyası.' });
  }

  if (!htmlContent) {
    return res.status(400).json({ error: 'ZIP içinde HTML dosyası bulunamadı.' });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="fatura.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'PDF oluşturulurken bir hata oluştu.' });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Uygulama çalışıyor: http://localhost:${PORT}`);
});
