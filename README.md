# ZIP içindeki HTML dosyasını PDF'e dönüştürme uygulaması

Bu uygulama, yüklenen ZIP dosyası içerisindeki ilk `.html`/`.htm` dosyasını bularak PDF çıktısı üretir ve indirir.

## Kurulum

```bash
npm install
npx playwright install chromium
```

## Çalıştırma

```bash
npm start
```

Ardından tarayıcıdan `http://localhost:3000` adresini açın.

## Kullanım

1. ZIP dosyanızı seçin.
2. **PDF Olarak İndir** butonuna tıklayın.
3. ZIP içindeki ilk HTML dosyası `fatura.pdf` olarak indirilecektir.

## Notlar

- ZIP içinde HTML dosyası yoksa hata verir.
- Geçersiz ZIP dosyalarında dönüşüm yapılmaz.
