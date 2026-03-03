# ZIP içindeki HTML faturaları toplu PDF'e dönüştürme uygulaması

Bu uygulama, birden fazla ZIP dosyası yüklemenize izin verir. Her ZIP içindeki ilk `.html`/`.htm` dosyası PDF'e çevrilir ve tüm PDF'ler tek bir ZIP dosyası olarak indirilir.

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

1. Aynı anda bir veya birden fazla ZIP dosyası seçin (ör. 16 adet ZIP).
2. **Toplu PDF İndir** butonuna tıklayın.
3. Tüm dönüştürülen PDF'ler `faturalar_pdf.zip` olarak indirilecektir.

## PDF dosya adı nasıl belirlenir?

Her PDF adı şu önceliklerle belirlenir:

1. HTML içindeki `<title>`
2. HTML içindeki ilk `<h1>`
3. Metin içinde geçen `site / sitesi / bina / binası` benzeri ifade
4. Hiçbiri yoksa ZIP dosyasının adı

Aynı isimli PDF'lerde otomatik olarak `(2)`, `(3)` gibi ekler kullanılır.

## Hata çözümü

- `Playwright tarayıcı bileşeni eksik` hatasında sunucuda şu komutu çalıştırın:
  ```bash
  npx playwright install chromium
  ```
- Sunucuda Chromium sandbox hatası olursa uygulama otomatik olarak `--no-sandbox` ile açılır.
- Hata mesajları artık ilgili ZIP dosyası adını da içerecek şekilde döner.

## Notlar

- ZIP içinde HTML dosyası yoksa ilgili dosya adıyla hata döner.
- Geçersiz ZIP dosyalarında dönüşüm yapılmaz.
