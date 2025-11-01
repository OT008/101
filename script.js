// =========================  KAYDET / YÜKLE / SIFIRLA  =========================
const LS_KEY = 'okey101_state_v1';

function stateTopla() {
  const state = {
    oyuncuIsimleri: Array.from(document.querySelectorAll('thead .oyuncu-isim'))
      .map(inp => inp.value || ''),
    eller: [],
  };

  document.querySelectorAll('tbody tr').forEach((tr) => {
    const el = [];
    tr.querySelectorAll('.player-cell').forEach((cell) => {
      const acmaKat = cell.querySelector('.kategori'); // ilk kategori
      const acmadi = acmaKat?.querySelector('[data-role="acmadi"]')?.classList.contains('aktif') || false;

      const kalanInput = cell.querySelector('.kalan-input');
      const kalanDeger = kalanInput && kalanInput.value ? parseInt(kalanInput.value,10) : null;

      const bittiBtn = acmaKat?.querySelector('[data-role="bitti"]')?.classList.contains('aktif') || false;
      const okey = cell.querySelector('.bitti-ekstra .okey')?.classList.contains('aktif') || false;
      const elden = cell.querySelector('.bitti-ekstra .elden')?.classList.contains('aktif') || false;

      const masa = cell.querySelector('.masa-btn')?.classList.contains('aktif') || false;
      const cezalar = Array.from(cell.querySelectorAll('.ceza-satiri span')).map(sp => parseInt(sp.textContent||'0',10)||0);

      el.push({ acmadi, kalanDeger, bittiBtn, okey, elden, masa, cezalar });
    });
    state.eller.push(el);
  });
    const pasifEller = [];
  document.querySelectorAll('tbody tr').forEach((tr, idx) => {
    const ilkEl = tr.querySelector('.player-cell .secenek');
    // Eğer satırdaki ilk seçenek butonu pasifse (opacity 0.5 ile kontrol edilebilir)
    if (ilkEl && ilkEl.classList.contains('pasif')) {
      pasifEller.push(idx);
    }
  });
  state.pasifEller = pasifEller;

  return state;
}

function stateUygula(state) {
  if (!state || !state.eller?.length) return;

  // 1. Oyuncu isimleri
  const isimInputlari = document.querySelectorAll('thead .oyuncu-isim');
  state.oyuncuIsimleri?.forEach((ad, i) => { if (isimInputlari[i]) isimInputlari[i].value = ad; });

  const tbody = document.querySelector('tbody');
  
  // 2. El sayısını eşitle (gerekenden azsa yeniElEkle ile çoğalt)
  // Mevcut satır 1. el olduğu için, eklenmesi gereken el sayısı: state.eller.length - 1
  let mevcutSatirSayisi = tbody.querySelectorAll('tr').length;
  if (mevcutSatirSayisi < state.eller.length) {
    for (let i = mevcutSatirSayisi; i < state.eller.length; i++) {
        yeniElEkle(true); // Geri yükleme sırasında yeni el ekle, ancak pasifleştirme yapma
    }
  }

  // 3. Tüm hücreleri "temiz" baza çek (Geri yüklemeden önce temizlik)
  tbody.querySelectorAll('tr').forEach((tr) => {
    tr.classList.remove('pasif');
    tr.querySelectorAll('.pasif').forEach(p => p.classList.remove('pasif')); // Pasif class'larını kaldır
    tr.querySelectorAll('.secenek').forEach(s => { s.classList.remove('aktif'); s.style.display = 'inline-block'; });
    tr.querySelectorAll('.kalan-input').forEach(i => i.remove());
    tr.querySelectorAll('.bitti-ekstra').forEach(e => e.remove());
    tr.querySelectorAll('.masa-btn').forEach(b => { b.classList.remove('aktif'); b.style.display = 'inline-block'; });
    tr.querySelectorAll('.ceza-satiri span').forEach(sp => sp.textContent = '0');
    tr.querySelectorAll('.player-cell .kategori').forEach(k => { k.style.display = 'block'; });

    // Kalan butonu yoksa geri ekle (handleBitti'de silinmiş olabilir)
    tr.querySelectorAll('.player-cell').forEach(cell => {
      const acmaKat = cell.querySelector('.kategori');
      if (acmaKat && !acmaKat.querySelector('[data-role="kalan"]')) {
          const kalanBtn = document.createElement('div');
          kalanBtn.className = 'secenek kalan';
          kalanBtn.dataset.role = 'kalan';
          kalanBtn.textContent = 'Kalan';

          const bittiBtn = acmaKat.querySelector('[data-role="bitti"]');
          if (bittiBtn) {
            bittiBtn.insertAdjacentElement('beforebegin', kalanBtn);
          } else {
            acmaKat.appendChild(kalanBtn);
          }
      }
    });
  });

  // 4. Hücre hücre uygula
  const satirlar = tbody.querySelectorAll('tr');
  state.eller.forEach((el, rowIdx) => {
    const tr = satirlar[rowIdx];
    if (!tr) return;
    const cells = tr.querySelectorAll('.player-cell');

    el.forEach((h, colIdx) => {
      const cell = cells[colIdx];
      if (!cell) return;

      const acmaKat = cell.querySelector('.kategori');
      const acBtn   = acmaKat?.querySelector('[data-role="acmadi"]');
      const kalBtn  = acmaKat?.querySelector('[data-role="kalan"]'); // Kaldırılmamış butonu al
      const bitBtn  = acmaKat?.querySelector('[data-role="bitti"]');
      const masaBtn = cell.querySelector('.masa-btn');


      // Açamadı
      if (h.acmadi && acBtn) {
        acBtn.classList.add('aktif');
        if (kalBtn) kalBtn.style.display = 'none';
        if (bitBtn) bitBtn.style.display = 'none';
        if (masaBtn) masaBtn.style.display = 'none';
      }

      // Kalan
      if (h.kalanDeger && kalBtn) {
        // Butonu inputa çevir
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'kalan-input';
        input.min = '1'; input.max = '252';
        input.value = h.kalanDeger;
        kalBtn.replaceWith(input); // Butonu input ile değiştir
        if (acBtn) acBtn.style.display = 'none';
        if (bitBtn) bitBtn.style.display = 'none';
      } else if (h.kalanDeger && !kalBtn) {
          // Eğer Kalan butonu DOM'dan tamamen kaldırılmışsa (biten oyuncunun eşi gibi)
      }


      // Bitti (+ okey/elden paneli)
      if (h.bittiBtn && bitBtn) {
        // Önce normal Bitti işleminin temelini yap
        bitBtn.classList.add('aktif');
        if (acBtn) acBtn.style.display = 'none';
        
        // Kalan butonu inputa çevrilmediyse gizle, çevrildiyse zaten yerinde yok.
        const mevcutKalan = cell.querySelector('[data-role="kalan"], .kalan-input');
        if(mevcutKalan && mevcutKalan.tagName !== 'INPUT') mevcutKalan.style.display = 'none';
        
        // Okey/Elden paneli ekle
        let ekstraDiv = document.createElement('div');
        ekstraDiv.className = 'bitti-ekstra';
        ekstraDiv.style.marginTop = '6px';
        ekstraDiv.innerHTML = `
          <div class="secenek okey ${h.okey ? 'aktif' : ''}">Okey ile</div>
          <div class="secenek elden ${h.elden ? 'aktif' : ''}">Elden</div>
        `;
        acmaKat.insertAdjacentElement('afterend', ekstraDiv);
        
      }

      // Masa
      if (masaBtn && h.masa) masaBtn.classList.add('aktif');
      if (masaBtn && (h.acmadi || h.bittiBtn)) masaBtn.style.display = 'none'; // Biten/Açamayan da gizlenmeli (Bitti durumunda takımdan bağımsız)
      
      // Cezalar
      const spList = cell.querySelectorAll('.ceza-satiri span');
      h.cezalar?.forEach((val, i) => { if (spList[i]) spList[i].textContent = String(val||0); });
    });
    
    // 5. Biten oyuncunun takım arkadaşı ayarlamalarını yap (Bitti mantığını simüle et)
    cells.forEach((cell, idx) => {
        const bitmeAktif = cell.querySelector('.secenek[data-role="bitti"].aktif');
        if (bitmeAktif) {
          const takimEs = (idx % 2 === 0) ? idx + 1 : idx - 1; // takım arkadaşı indeksi
          const takimCell = cells[takimEs];
          if (takimCell) {
            
            const acmaDurumu = takimCell.querySelector('.kategori:first-of-type'); 
            if (acmaDurumu) acmaDurumu.style.display = 'none';

            const bittiEkstra = takimCell.querySelector('.bitti-ekstra');
            if (bittiEkstra) bittiEkstra.style.display = 'none';

            const elInput = takimCell.querySelector('.kalan-input');
            if (elInput) elInput.remove();
            
            const kalanBtn = takimCell.querySelector('[data-role="kalan"]');
            if (kalanBtn) kalanBtn.style.display = 'none';

            const masaBtn = takimCell.querySelector('.masa-btn');
            if (masaBtn) {
              masaBtn.classList.remove('aktif');
              masaBtn.style.display = 'inline-block';
            }
            
            const acmadiBtn = takimCell.querySelector('[data-role="acmadi"]');
            if (acmadiBtn) acmadiBtn.style.display = 'none';
            const bittiBtn = takimCell.querySelector('[data-role="bitti"]');
            if (bittiBtn) bittiBtn.style.display = 'none';
          }
        }
    });
  });

  // 6. Kaydedilmiş pasif elleri tekrar pasifleştir
  const tumSatirlar = document.querySelectorAll('tbody tr');
  if (state.pasifEller && state.pasifEller.length) {
    state.pasifEller.forEach(i => {
      const tr = tumSatirlar[i];
      if (!tr) return;
      tr.querySelectorAll('.secenek, .masa-btn, .artir, .azalt, .kalan-input').forEach(el => {
        el.classList.add('pasif');
      });
    });
  }
}

function stateKaydet() {
  try {
    const s = stateTopla();
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch (e) {
    console.warn('Kaydetme hatası:', e);
  }
}

function stateYukle() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
       roleriAta(); // İlk yüklemede rolleri ata
       return;
    }
    const s = JSON.parse(raw);
    stateUygula(s);
    roleriAta(); // Geri yükleme sonrası tüm DOM'a rolleri yeniden ata
    
    // 🔹 EK KONTROL: State yüklendikten sonra, son el doluysa bir sonraki boş eli ekle ve pasifleştirmeyi yap
    elKontrolVeEkle();

    toplamPuanHesapla();
  } catch (e) {
    console.warn('Yükleme hatası:', e);
  }
}

function yeniOyunSifirla() {
  if (confirm("Yeni oyun başlatmak istediğinizden emin misiniz? Tüm skorlar sıfırlanacaktır.")) {
    localStorage.removeItem(LS_KEY);
    location.reload(); 
  }
}

// --- Yeni El ve Pasifleştirme/Aktifleştirme Mantığı (Tek yerde toplandı) ---
function elKontrolVeEkle() {
    const tbody = document.querySelector('tbody');
    const satirlar = tbody.querySelectorAll('tr');
    if (satirlar.length === 0) return;

    const sonSatir = satirlar[satirlar.length - 1];
    const oncekiSatir = satirlar[satirlar.length - 2];

    const aktifVarMi = sonSatir.querySelector('.secenek.aktif, .masa-btn.aktif, .bitti-ekstra');
    const kalanInputVarMi = sonSatir.querySelector('.kalan-input');
    let cezaVarMi = false;
    sonSatir.querySelectorAll('.ceza-satiri span').forEach(sp => {
      if (parseInt(sp.textContent || '0', 10) > 0) cezaVarMi = true;
    });

    // 1. Yeni el ekleme kontrolü
    if (tumOyuncularAldiMi(sonSatir) && (aktifVarMi || kalanInputVarMi || cezaVarMi)) {
      yeniElEkle();
      // Yeni el eklenince, önceki (yani sonSatir) el pasif olmalı (2. adımda yapılacak)
    }

    // 2. Pasifleştirme / Aktifleştirme (2. el ve sonrası için)
    if (satirlar.length >= 2) {
        const yeniSonSatir = tbody.querySelectorAll('tr')[tbody.querySelectorAll('tr').length - 1];
        const yeniOncekiSatir = tbody.querySelectorAll('tr')[tbody.querySelectorAll('tr').length - 2];
        
        const yeniAktifVarMi = yeniSonSatir.querySelector('.secenek.aktif, .masa-btn.aktif, .bitti-ekstra');
        const yeniKalanInputVarMi = yeniSonSatir.querySelector('.kalan-input');
        let yeniCezaVarMi = false;
        yeniSonSatir.querySelectorAll('.ceza-satiri span').forEach(sp => {
          if (parseInt(sp.textContent || '0', 10) > 0) yeniCezaVarMi = true;
        });

        // a) Yeni eklenen son el boşsa:
        if (!yeniAktifVarMi && !yeniKalanInputVarMi && !yeniCezaVarMi) {
            // Önceki eli aktif et (pasif class'ını kaldır)
            yeniOncekiSatir.querySelectorAll('.secenek, .masa-btn, .artir, .azalt, .kalan-input').forEach(el => {
                el.classList.remove('pasif');
            });
        } 
        // b) Son el doluysa (veya yeni bir el eklendiyse):
        else {
            // Önceki eli pasif et (pasif class'ını ekle)
            yeniOncekiSatir.querySelectorAll('.secenek, .masa-btn, .artir, .azalt, .kalan-input').forEach(el => {
                el.classList.add('pasif');
            });
        }
    }
}


// --- Fonksiyonları Basitleştirme ---
function anaIslemleriYap() {
    stateKaydet();
    elKontrolVeEkle();
    toplamPuanHesapla();
}

// --- Başlangıç: Açma Durumu üçlüsüne data-role ata ---
function roleriAta() {
  document.querySelectorAll('.player-cell .kategori:first-child').forEach(kat => {
    const opts = kat.querySelectorAll('.secenek');
    if (opts[0]) opts[0].dataset.role = 'acmadi';
    if (opts[1]) { opts[1].dataset.role = 'kalan'; opts[1].classList.add('kalan'); }
    if (opts[2]) opts[2].dataset.role = 'bitti';
  });
}

// --- Yardımcı: hücre indexine göre takım arkadaşını bul ---
function takimEsIndex(cell) {
  const row = cell.closest('tr');
  const idx = Array.from(row.children).indexOf(cell);
  if (idx === 1) return 2;
  if (idx === 2) return 1;
  if (idx === 3) return 4;
  if (idx === 4) return 3;
  return null;
}

function handleAcmadi(btn) {
  const kat = btn.closest('.kategori');
  const cell = btn.closest('.player-cell');
  const kalan = kat.querySelector('[data-role="kalan"]');
  const bitti = kat.querySelector('[data-role="bitti"]');
  const masaBtn = cell.querySelector('.masa-btn');
  const kalanInput = cell.querySelector('.kalan-input'); 

  const acikMi = btn.classList.toggle('aktif');

  if (acikMi) {
    if (kalanInput) kalanInput.remove(); 
    if (kalan) kalan.style.display = 'none';
    if (bitti) bitti.style.display = 'none';
    if (masaBtn) masaBtn.style.display = 'none';
  } else {
    if (kalan) kalan.style.display = 'inline-block';
    if (bitti) bitti.style.display = 'inline-block';
    if (masaBtn) masaBtn.style.display = 'inline-block';
  }
}

function handleKalan(btn) {
  const kat = btn.closest('.kategori');
  const acamadi = kat.querySelector('[data-role="acmadi"]');
  const bitti = kat.querySelector('[data-role="bitti"]');

  if (acamadi) acamadi.style.display = 'none';
  if (bitti) bitti.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'kalan-input';
  input.min = '1';
  input.max = '252';
  input.placeholder = '0';

  btn.replaceWith(input);
  input.focus();

  input.addEventListener('blur', () => {
    if (!input.value || +input.value < 1) {
      input.replaceWith(btn);
      if (acamadi) acamadi.style.display = 'inline-block';
      if (bitti) bitti.style.display = 'inline-block';
    } else {
      input.value = String(Math.min(252, Math.max(1, +input.value)));
      input.style.color = 'white';
      input.style.fontWeight = 'bold';
    }
    anaIslemleriYap();
  });
}

function handleBitti(btn) {
  const cell = btn.closest('.player-cell');
  const row = cell.closest('tr');
  const acmaKat = cell.querySelector('.kategori');
  const acamadi = acmaKat.querySelector('[data-role="acmadi"]');
  const kalanBtn = acmaKat.querySelector('[data-role="kalan"]');
  const masaBtn = cell.querySelector('.masa-btn');
  const aktifmiydi = btn.classList.contains('aktif');
  const esIdx = takimEsIndex(cell);

  // 🔹 İlk tıklama (aktifleşme)
  if (!aktifmiydi) {
    btn.classList.add('aktif');

    const kalanInput = cell.querySelector('.kalan-input');
    if (kalanInput) kalanInput.remove();
    if (acamadi) acamadi.style.display = 'none';
    if (kalanBtn) kalanBtn.style.display = 'none';
    if (masaBtn) masaBtn.style.display = 'none'; 

    const ekstraDiv = document.createElement('div');
    ekstraDiv.className = 'bitti-ekstra';
    ekstraDiv.style.marginTop = '6px';
    ekstraDiv.innerHTML = `
      <div class="secenek okey">Okey ile</div>
      <div class="secenek elden">Elden</div>
    `;
    acmaKat.insertAdjacentElement('afterend', ekstraDiv);

    row.querySelectorAll('.player-cell').forEach(c => {
      if (c !== cell) {
        const b = c.querySelector('[data-role="bitti"]');
        if (b && !b.classList.contains('aktif')) b.style.display = 'none';
      }
    });

    // 🔧 Takım arkadaşını sıfırla + gizle
    if (esIdx) {
      const esCell = row.children[esIdx];
      const esAcma = esCell.querySelector('.kategori:first-of-type'); 
      const esMasa = esCell.querySelector('.masa-btn');
      const esKalanInput = esCell.querySelector('.kalan-input');
      const esBittiEkstra = esCell.querySelector('.bitti-ekstra');
      
      if (esKalanInput) esKalanInput.remove();
      if (esBittiEkstra) esBittiEkstra.remove();

      if (esAcma) {
        esAcma.querySelectorAll('.secenek').forEach(s => s.classList.remove('aktif'));
        esAcma.style.display = 'none';
      }
      if (esMasa) {
        esMasa.classList.remove('aktif');
        esMasa.style.display = 'inline-block'; 
      }
    }

  // 🔸 İkinci tıklama (geri alma)
  } else {
    btn.classList.remove('aktif');

    const ekstra = cell.querySelector('.bitti-ekstra');
    if (ekstra) ekstra.remove();

    if (acamadi) acamadi.style.display = 'inline-block';
    if (kalanBtn) kalanBtn.style.display = 'inline-block';
    if (masaBtn) { masaBtn.classList.remove('aktif'); masaBtn.style.display = 'inline-block'; }

    // Diğer oyuncuların Bitti butonlarını geri getirirken kontrol yap
    row.querySelectorAll('.player-cell').forEach(c => {
      const b = c.querySelector('[data-role="bitti"]');
      const acmadiBtn = c.querySelector('[data-role="acmadi"]');
      const kalanInput = c.querySelector('.kalan-input');

      const aktifAcmadi = acmadiBtn && acmadiBtn.classList.contains('aktif');
      const aktifBitti = b && b.classList.contains('aktif'); 
      const kalanDegerGirildi = Boolean(kalanInput && kalanInput.value);

      if (b && !aktifBitti) {
        if (aktifAcmadi || kalanDegerGirildi) {
          b.style.display = 'none';
        } else {
          b.style.display = 'inline-block';
        }
      }
      
      if (c === row.children[esIdx]) {
        if (b) b.style.display = 'inline-block';
      }
    });

    // Takım arkadaşını geri getir
    if (esIdx) {
      const esCell = row.children[esIdx];
      const esAcma = esCell.querySelector('.kategori:first-of-type');
	    const esMasa = esCell.querySelector('.masa-btn');
      if (esAcma) {
        esAcma.style.display = 'block';

        ['acmadi','kalan','bitti'].forEach(r => {
          const el = esAcma.querySelector(`[data-role="${r}"]`);
          if (el) {
            el.classList.remove('aktif');
            el.style.display = 'inline-block';
          }
        });
      }
      if (esMasa) esMasa.style.display = 'inline-block';
    }
  }
}


document.addEventListener('click', (e) => {
  const btn = e.target.closest('.secenek, .masa-btn, .artir, .azalt');
  if (!btn) return;

  // --- AÇAMADI ---
  if (btn.dataset.role === 'acmadi') {
  handleAcmadi(btn);
  setTimeout(anaIslemleriYap, 0); // DOM değişimi bitince genel işlemleri yap
  return;
}
  // --- KALAN (buton) -> inputa dönüşecek ---
if (btn.dataset.role === 'kalan') {
  handleKalan(btn);
  return; // Input blur'da anaIslemleriYap çağırılacak
}
//-----------------------------------------------------------------------------------------↑
  // --- BİTTİ (toggle) ---
if (btn.dataset.role === 'bitti') {
  handleBitti(btn);
  setTimeout(anaIslemleriYap, 0); 
  return;
}
//-----------------------------------------------------------------------------------------↓
  // --- OKEY / ELDEN (Bitti sonrası çıkanları tıkla) ---
  if (btn.classList.contains('okey') || btn.classList.contains('elden')) {
    btn.classList.toggle('aktif');
    setTimeout(anaIslemleriYap, 0); 
    return;
  }

  // --- MASA SAYISI (toggle) ---
  if (btn.classList.contains('masa-btn')) {
    btn.classList.toggle('aktif');
    setTimeout(anaIslemleriYap, 0); 
    return;
  }

  // --- CEZA BUTONLARI (artır/azalt, min 0) ---
  if (btn.classList.contains('artir') || btn.classList.contains('azalt')) {
    const satir = btn.closest('.ceza-satiri');
    if (!satir) return;

    const degerEl = satir.querySelector('span');
    let val = parseInt(degerEl?.textContent || '0', 10) || 0;

    if (btn.classList.contains('artir')) {
      val += 1;
    } else {
      val = Math.max(0, val - 1); // min 0
    }

    degerEl.textContent = String(val);
    setTimeout(anaIslemleriYap, 0); 
    return;
  }
});
//-----------------------------------------------------------------------------------------↑
function tumOyuncularAldiMi(row) {
  const cells = row.querySelectorAll('.player-cell');
  
  return Array.from(cells).every(cell => {
    const acmaKat = cell.querySelector('.kategori:first-of-type');
    const aktifDurum = acmaKat?.querySelector('.secenek.aktif') || cell.querySelector('.kalan-input');
    
    // Eğer aktif bir durum varsa (Açamadı, Kalan, Bitti)
    if (aktifDurum) return true; 

    // Takım arkadaşı bitmişse
    const esIdx = takimEsIndex(cell);
    if (esIdx !== null) {
        const esCell = row.children[esIdx];
        const esBitti = esCell.querySelector('[data-role="bitti"]')?.classList.contains('aktif');
        if (esBitti) return true;
    }
    
    // Eğer aktif bir durum yok, ancak ceza veya masa girilmişse (bu da elin kapandığı anlamına gelir)
    let cezaVarMi = false;
    cell.querySelectorAll('.ceza-satiri span').forEach(sp => {
        if (parseInt(sp.textContent || '0', 10) > 0) cezaVarMi = true;
    });
    const masaAktif = cell.querySelector('.masa-btn')?.classList.contains('aktif');

    return cezaVarMi || masaAktif;
  });
}

// --- Yeni el ekleme fonksiyonu (geri yükleme için 'isRestoring' flag eklendi) ---
function yeniElEkle(isRestoring = false) {
  const tbody = document.querySelector('tbody');
  const satirlar = tbody.querySelectorAll('tr');
  const sonSatir = satirlar[satirlar.length - 1];
  const yeniElNo = satirlar.length + 1;
  const yeniSatir = sonSatir.cloneNode(true);
  
  // Yeni satırı temizle
  yeniSatir.querySelector('td:first-child').innerHTML = `<b>${yeniElNo}</b>`;
  yeniSatir.classList.remove('pasif');
  yeniSatir.querySelectorAll('.pasif').forEach(p => p.classList.remove('pasif'));
  
  yeniSatir.querySelectorAll('.secenek').forEach(s => {
    s.classList.remove('aktif');
    s.style.display = 'inline-block';
  });
  yeniSatir.querySelectorAll('.kalan-input').forEach(i => i.remove());
  yeniSatir.querySelectorAll('.bitti-ekstra').forEach(e => e.remove());
  yeniSatir.querySelectorAll('.masa-btn').forEach(b => {
    b.classList.remove('aktif');
    b.style.display = 'inline-block';
  });
  yeniSatir.querySelectorAll('.ceza-satiri span').forEach(sp => sp.textContent = '0');
  yeniSatir.querySelectorAll('.player-cell .kategori').forEach(k => {
    k.style.display = 'block';
  });
  
  // Kalan butonu eksikse geri ekle (cloneNode bazen butonu input sanıp kopyalamayı atlayabilir)
  yeniSatir.querySelectorAll('.player-cell').forEach(cell => {
    const acmaKat = cell.querySelector('.kategori');
    let kalanBtn = acmaKat.querySelector('[data-role="kalan"]');
    if (acmaKat && !kalanBtn) {
      kalanBtn = document.createElement('div');
      kalanBtn.className = 'secenek kalan';
      kalanBtn.dataset.role = 'kalan';
      kalanBtn.textContent = 'Kalan';
      const bittiBtn = acmaKat.querySelector('[data-role="bitti"]');
      if (bittiBtn) bittiBtn.insertAdjacentElement('beforebegin', kalanBtn);
    }
  });

  tbody.appendChild(yeniSatir);
  roleriAta(); 
}

document.addEventListener('input', (e) => {
  const input = e.target.closest('.kalan-input');
  if (!input) {
      if (e.target.classList.contains('oyuncu-isim')) {
          setTimeout(anaIslemleriYap, 0); // Sadece kaydet ve puan hesapla
      }
      return;
  }
  // Kalan input değişimi için blur event'i handleKalan içinde çağırıyor.
});


// 🔹 TOPLAM PUAN HESAPLAMA FONKSİYONU
function toplamPuanHesapla() {
  const tbody = document.querySelector('tbody');
  const satirlar = tbody.querySelectorAll('tr');
  const toplamlar = [0, 0, 0, 0]; 

  satirlar.forEach(row => {
    const hucreler = row.querySelectorAll('.player-cell');
    let bitenIndex = null;
    let carpim = 1;

    hucreler.forEach((cell, i) => {
      const bittiBtn = cell.querySelector('.secenek[data-role="bitti"].aktif');
      const okey = cell.querySelector('.bitti-ekstra .okey.aktif');
      const elden = cell.querySelector('.bitti-ekstra .elden.aktif');

      if (bittiBtn) {
        bitenIndex = i;
        if (okey && elden) carpim = 4;
        else if (okey || elden) carpim = 2;
        else carpim = 1;
      }
    });

    const elPuanlari = [0, 0, 0, 0];
    const takimEs = { 0: 1, 1: 0, 2: 3, 3: 2 };

    hucreler.forEach((cell, i) => {
      const acmadi = cell.querySelector('.secenek[data-role="acmadi"].aktif');
      const kalanInput = cell.querySelector('.kalan-input');
      const bittiBtn = cell.querySelector('.secenek[data-role="bitti"].aktif');
      const okey = cell.querySelector('.bitti-ekstra .okey.aktif');
      const elden = cell.querySelector('.bitti-ekstra .elden.aktif');
      const masa = cell.querySelector('.masa-btn.aktif');
      const cezalar = cell.querySelectorAll('.ceza-satiri span');

      let puan = 0;

      // 🟢 Açma durumuna göre
      if (acmadi) puan += 202;
      else if (kalanInput && kalanInput.value) puan += parseInt(kalanInput.value);
      else if (bittiBtn) {
        if (okey && elden) puan -= 404;
        else if (okey || elden) puan -= 202;
        else puan -= 101;
      }

      // 🔸 Masa ve diğer cezalar
      if (masa) puan += 101; 
      
      cezalar.forEach(span => {
        const adet = parseInt(span.textContent || '0', 10);
        if (adet > 0) puan += adet * 101;
      });

      elPuanlari[i] = puan;
    });

    // 🔸 Biten oyuncu varsa özel durumlar
    if (bitenIndex !== null) {
      const esIndex = takimEs[bitenIndex];
      
      // Takım arkadaşı sıfır alır (sadece ceza hariç)
      const esCell = hucreler[esIndex];
      let cezaToplam = 0;

      const masa = esCell.querySelector('.masa-btn.aktif');
      if (masa) cezaToplam += 101;

      const cezalar = esCell.querySelectorAll('.ceza-satiri span');
      cezalar.forEach(span => {
        const adet = parseInt(span.textContent || '0', 10);
        if (adet > 0) cezaToplam += adet * 101;
      });
      elPuanlari[esIndex] = cezaToplam; 

      // Diğer iki oyuncunun puanı çarpılır 
      hucreler.forEach((_, i) => {
        if (i !== bitenIndex && i !== esIndex) {
          elPuanlari[i] *= carpim;
        }
      });
    }
    // 🔹 Toplamları ekle
    elPuanlari.forEach((p, i) => toplamlar[i] += p);
  });

  // 🔸 Alt kısımdaki “Toplam” satırını güncelle
  const tfoot = document.querySelector('tfoot tr:last-child');
  if (tfoot) {
    const tds = tfoot.querySelectorAll('td');
    toplamlar.forEach((t, i) => {
      if (tds[i + 1]) tds[i + 1].textContent = t;
    });
  }
}
