<script>


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
    if (ilkEl && getComputedStyle(ilkEl).pointerEvents === 'none') {
      pasifEller.push(idx);
    }
  });
  state.pasifEller = pasifEller;

  return state;
}

function stateUygula(state) {
  if (!state || !state.eller?.length) return;

  // Oyuncu isimleri
  const isimInputlari = document.querySelectorAll('thead .oyuncu-isim');
  state.oyuncuIsimleri?.forEach((ad, i) => { if (isimInputlari[i]) isimInputlari[i].value = ad; });

  // El sayısını eşitle (gerekenden azsa yeniElEkle ile çoğalt)
  const tbody = document.querySelector('tbody');
  while (tbody.querySelectorAll('tr').length < state.eller.length) {
    yeniElEkle();
  }

  // Tüm hücreleri “temiz” baza çek
  tbody.querySelectorAll('tr').forEach((tr) => {
    tr.querySelectorAll('.secenek').forEach(s => { s.classList.remove('aktif'); s.style.display = 'inline-block'; });
    tr.querySelectorAll('.kalan-input').forEach(i => i.remove());
    tr.querySelectorAll('.bitti-ekstra').forEach(e => e.remove());
    tr.querySelectorAll('.masa-btn').forEach(b => { b.classList.remove('aktif'); b.style.display = 'inline-block'; });
    tr.querySelectorAll('.ceza-satiri span').forEach(sp => sp.textContent = '0');
    tr.querySelectorAll('.player-cell .kategori').forEach(k => { k.style.display = 'block'; });
  });

  // Hücre hücre uygula
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
      const kalBtn  = acmaKat?.querySelector('[data-role="kalan"]');
      const bitBtn  = acmaKat?.querySelector('[data-role="bitti"]');

      // Açamadı
      if (h.acmadi && acBtn) {
        acBtn.classList.add('aktif');
        if (kalBtn) kalBtn.style.display = 'none';
        if (bitBtn) bitBtn.style.display = 'none';
		  const masaBtn = cell.querySelector('.masa-btn');
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
        kalBtn.replaceWith(input);
        if (acBtn) acBtn.style.display = 'none';
        if (bitBtn) bitBtn.style.display = 'none';
      }

      // Bitti (+ okey/elden paneli)
      if (h.bittiBtn && bitBtn) {
        bitBtn.classList.add('aktif');
        if (acBtn) acBtn.style.display = 'none';
        if (kalBtn) kalBtn.style.display = 'none';

        let ekstraDiv = document.createElement('div');
        ekstraDiv.className = 'bitti-ekstra';
        ekstraDiv.style.marginTop = '6px';
        ekstraDiv.innerHTML = `
          <div class="secenek okey ${h.okey ? 'aktif' : ''}">Okey ile</div>
          <div class="secenek elden ${h.elden ? 'aktif' : ''}">Elden</div>
        `;
        acmaKat.insertAdjacentElement('afterend', ekstraDiv);

        // Aynı elde diğer oyuncuların “Bitti” butonlarını gizle (senaryoda o anda biri bitmiş)
        tr.querySelectorAll('.player-cell').forEach(c => {
          if (c !== cell) {
            const bb = c.querySelector('[data-role="bitti"]');
            if (bb && !bb.classList.contains('aktif')) bb.style.display = 'none';
          }
        });
      }

      // Masa
      const masaBtn = cell.querySelector('.masa-btn');
      if (masaBtn && h.masa) masaBtn.classList.add('aktif');

      // Cezalar
      const spList = cell.querySelectorAll('.ceza-satiri span');
      h.cezalar?.forEach((val, i) => { if (spList[i]) spList[i].textContent = String(val||0); });
    });
  });

  // Önceki el kilitleme durumunu tekrar uygula (son el doluysa bir öncekini pasifleştir)
  const aktifSatirlar = tbody.querySelectorAll('tr');
  if (aktifSatirlar.length >= 2) {
    const onceki = aktifSatirlar[aktifSatirlar.length - 2];
    const son    = aktifSatirlar[aktifSatirlar.length - 1];

    const sonAktif = !!son.querySelector('.secenek.aktif, .masa-btn.aktif, .bitti-ekstra') ||
                     !!son.querySelector('.kalan-input');
    let sonCezali = false;
    son.querySelectorAll('.ceza-satiri span').forEach(sp => { if (parseInt(sp.textContent||'0',10) > 0) sonCezali = true; });

    if (sonAktif || sonCezali) {
      onceki.querySelectorAll('.secenek, .masa-btn, .artir, .azalt, .kalan-input').forEach(el => {
        el.classList.add('pasif');
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.5';
      });
    }
  }
  
  
const tumSatirlar = document.querySelectorAll('tbody tr');
tumSatirlar.forEach((tr) => {
  const cells = tr.querySelectorAll('.player-cell');
  cells.forEach((cell, idx) => {
    const bitmeAktif = cell.querySelector('.secenek[data-role="bitti"].aktif');
    if (bitmeAktif) {
      const takimEs = (idx % 2 === 0) ? idx + 1 : idx - 1; // takım arkadaşı indeksi
      const takimCell = cells[takimEs];
      if (takimCell) {
        
        // 🔹 Takım arkadaşının Açma Durumu kategorisini gizle
        // İlk kategori (Açma Durumu)
        const acmaDurumu = takimCell.querySelector('.kategori:first-of-type'); 
        if (acmaDurumu) acmaDurumu.style.display = 'none';

        // 🔹 Bitti Ekstra (Okey/Elden) panelini gizle (varsa)
        const bittiEkstra = takimCell.querySelector('.bitti-ekstra');
        if (bittiEkstra) bittiEkstra.style.display = 'none';

        // 🔹 Cezalar kategorisinin (ikinci kategori) görünür kalması için bir şey yapmaya gerek yok,
        // zira gizlenmemişse varsayılan olarak görünür kalır.
        
        // 🔹 Elinde varsa inputu sil (value="" yapmak yerine tamamen kaldırılabilir)
        const elInput = takimCell.querySelector('.kalan-input');
        if (elInput) elInput.remove();

        // 🔹 Masa butonu görünür kalsın (handleBitti'de gizlenmiş olabilir, burada garantile)
        const masaBtn = takimCell.querySelector('.masa-btn');
        if (masaBtn) masaBtn.style.display = 'inline-block';
        
        // 🔹 Tüm ceza satırlarını görünür yap (gizlenmiş olabilir)
        takimCell.querySelectorAll('.ceza-satiri').forEach(el => {
            el.style.display = 'flex';
        });
      }
    }
  });
});

// 🔹 Kaydedilmiş pasif elleri tekrar pasifleştir
  if (state.pasifEller && state.pasifEller.length) {
    const satirlar = document.querySelectorAll('tbody tr');
    state.pasifEller.forEach(i => {
      const tr = satirlar[i];
      if (!tr) return;
      tr.querySelectorAll('.secenek, .masa-btn, .artir, .azalt, .kalan-input').forEach(el => {
        el.classList.add('pasif');
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.5';
      });
    });
  }
  
// 🔹 Son el boşsa bir önceki eli yeniden aktif yap

  if (satirlar.length >= 2) {
    const onceki = satirlar[satirlar.length - 2];
    const son = satirlar[satirlar.length - 1];

    const aktifVarMi = son.querySelector('.secenek.aktif, .masa-btn.aktif, .bitti-ekstra');
    const kalanInputVarMi = son.querySelector('.kalan-input');
    let cezaVarMi = false;
    son.querySelectorAll('.ceza-satiri span').forEach(sp => {
      if (parseInt(sp.textContent || '0', 10) > 0) cezaVarMi = true;
    });

    // Eğer hiçbir şey yoksa (yani el boşsa)
    if (!aktifVarMi && !kalanInputVarMi && !cezaVarMi) {
      onceki.querySelectorAll('.secenek, .masa-btn, .artir, .azalt, .kalan-input').forEach(el => {
        el.classList.remove('pasif');
        el.style.pointerEvents = 'auto';
        el.style.opacity = '1';
      });
    }
  }
  
  // Skorları tazele
  toplamPuanHesapla();
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
    if (!raw) return;
    const s = JSON.parse(raw);
    stateUygula(s);
  } catch (e) {
    console.warn('Yükleme hatası:', e);
  }
}

function yeniOyunSifirla() {
  localStorage.removeItem(LS_KEY);
  location.reload(); // en güvenlisi: sayfayı ilk haline al
}

// --- Olaylara bağla: her tıklama ve input sonrası kaydet
document.addEventListener('click', (e) => {
  const hedef = e.target.closest('.secenek, .masa-btn, .artir, .azalt, .kalan-input');
  if (!hedef) return;
  // ufak bir gecikme; DOM değişikliği bittiğinde state alınsın
  setTimeout(stateKaydet, 0);
});
document.addEventListener('input', (e) => {
  if (e.target.closest('.kalan-input') || e.target.classList.contains('oyuncu-isim')) {
    setTimeout(stateKaydet, 0);
  }
});

// --- Yükle ve “Yeni Oyun” butonunu bağla
window.addEventListener('load', stateYukle);
document.getElementById('btnYeniOyun')?.addEventListener('click', yeniOyunSifirla);
// ===============================================================================
// (NOT) Mevcut yeniElEkle / toplamPuanHesapla vb. fonksiyonların üstüne eklemeye gerek yok.
// ===============================================================================
//-----------------------------------------------------------------------------------------↓
// --- Başlangıç: Açma Durumu üçlüsüne data-role ata ---
function roleriAta() {
  document.querySelectorAll('.player-cell .kategori:first-child').forEach(kat => {
    const opts = kat.querySelectorAll('.secenek');
    if (opts[0]) opts[0].dataset.role = 'acmadi';
    if (opts[1]) { opts[1].dataset.role = 'kalan'; opts[1].classList.add('kalan'); }
    if (opts[2]) opts[2].dataset.role = 'bitti';
  });
}
roleriAta();

// --- Yardımcı: hücre indexine göre takım arkadaşını bul ---
function takimEsIndex(cell) {
  const row = cell.closest('tr');
  const idx = Array.from(row.children).indexOf(cell);
  // El sütunu 0. index; oyuncular 1..4
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

  const acikMi = btn.classList.toggle('aktif');

  if (acikMi) {
    // Buton aktif oldu → diğerlerini gizle
    if (kalan) kalan.style.display = 'none';
    if (bitti) bitti.style.display = 'none';
    if (masaBtn) masaBtn.style.display = 'none';
  } else {
    // Buton pasif oldu → diğerlerini geri göster
    if (kalan) kalan.style.display = 'inline-block';
    if (bitti) bitti.style.display = 'inline-block';
    if (masaBtn) masaBtn.style.display = 'inline-block';
  }
}

function handleKalan(btn) {
  const kat = btn.closest('.kategori');
  const acamadi = kat.querySelector('[data-role="acmadi"]');
  const bitti = kat.querySelector('[data-role="bitti"]');

  // Açamadı ve Bitti butonlarını gizle
  if (acamadi) acamadi.style.display = 'none';
  if (bitti) bitti.style.display = 'none';

  // Input oluştur
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'kalan-input';
  input.min = '1';
  input.max = '252';
  input.placeholder = '0';

  // Butonun yerini input alır
  btn.replaceWith(input);
  input.focus();

  // Input odak kaybedince kontrol et
  input.addEventListener('blur', () => {
    if (!input.value || +input.value < 1) {
      // Değer yoksa: inputu kaldır, butonu geri getir
      input.replaceWith(btn);
      if (acamadi) acamadi.style.display = 'inline-block';
      if (bitti) bitti.style.display = 'inline-block';
    } else {
      // Değer varsa: inputu kalıcı hale getir
      input.value = String(Math.min(252, Math.max(1, +input.value)));
      input.style.color = 'white';
      input.style.fontWeight = 'bold';
    }
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

    // Kendi butonlarını gizle
    if (acamadi) acamadi.style.display = 'none';
    if (kalanBtn) kalanBtn.style.display = 'none';

    // Okey/Elden panelini ekle
    const ekstraDiv = document.createElement('div');
    ekstraDiv.className = 'bitti-ekstra';
    ekstraDiv.style.marginTop = '6px';
    ekstraDiv.innerHTML = `
      <div class="secenek okey">Okey ile</div>
      <div class="secenek elden">Elden</div>
    `;
    acmaKat.insertAdjacentElement('afterend', ekstraDiv);

    // Diğer oyuncuların Bitti butonlarını gizle
    row.querySelectorAll('.player-cell').forEach(c => {
      if (c !== cell) {
        const b = c.querySelector('[data-role="bitti"]');
        if (b && !b.classList.contains('aktif')) b.style.display = 'none';
      }
    });

    // 🔧 Takım arkadaşını sıfırla + gizle + MASA'yı nötrle ve görünür yap
    if (esIdx) {
      const esCell = row.children[esIdx];
      const esAcma = esCell.querySelector('.kategori');
      const esMasa = esCell.querySelector('.masa-btn');
      if (esAcma) {
        esAcma.querySelectorAll('.secenek').forEach(s => s.classList.remove('aktif'));
        const kalInput = esAcma.querySelector('.kalan-input');
        if (kalInput) kalInput.remove();
        esAcma.style.display = 'none';
      }
      if (esMasa) {
        esMasa.classList.remove('aktif');
        esMasa.style.display = 'inline-block';   // 👈 EKLENDİ
      }
    }

  // 🔸 İkinci tıklama (geri alma)
  } else {
    btn.classList.remove('aktif');

    // Okey/Elden panelini kaldır
    const ekstra = cell.querySelector('.bitti-ekstra');
    if (ekstra) ekstra.remove();

    // Kendi butonlarını geri getir
    if (acamadi) acamadi.style.display = 'inline-block';
    if (kalanBtn) kalanBtn.style.display = 'inline-block';
    if (masaBtn) { masaBtn.classList.remove('aktif'); masaBtn.style.display = 'inline-block'; }

    // Diğer oyuncuların Bitti butonlarını geri getirirken kontrol yap
    row.querySelectorAll('.player-cell').forEach(c => {
      if (c !== cell) {
        const b = c.querySelector('[data-role="bitti"]');
        const acmadiBtn = c.querySelector('[data-role="acmadi"]');
        const kalanBtn2 = c.querySelector('[data-role="kalan"]');
        const kalanInput = c.querySelector('.kalan-input');

        const aktifAcmadi = acmadiBtn && acmadiBtn.classList.contains('aktif');
        const aktifKalan = kalanBtn2 && kalanBtn2.classList.contains('aktif');
        const kalanDegerGirildi = Boolean(kalanInput && kalanInput.value);

        if (b) {
          if (aktifAcmadi || aktifKalan || kalanDegerGirildi) {
            b.style.display = 'none';
          } else {
            b.style.display = 'inline-block';
          }
        }
      }
    });

    // Takım arkadaşını geri getir ve sıralı şekilde sıfırla
    if (esIdx) {
      const esCell = row.children[esIdx];
      const esAcma = esCell.querySelector('.kategori');
	  const esMasa = esCell.querySelector('.masa-btn');
      if (esAcma) {
        esAcma.style.display = 'block';

        // Kalan butonu yoksa yeniden oluştur ama doğru sıraya yerleştir
        let kalanBtn = esAcma.querySelector('[data-role="kalan"]');
        if (!kalanBtn) {
          kalanBtn = document.createElement('div');
          kalanBtn.className = 'secenek kalan';
          kalanBtn.dataset.role = 'kalan';
          kalanBtn.textContent = 'Kalan';

          const bittiBtn = esAcma.querySelector('[data-role="bitti"]');
          if (bittiBtn) {
            bittiBtn.insertAdjacentElement('beforebegin', kalanBtn);
          } else {
            esAcma.appendChild(kalanBtn);
          }
        }

        // Tüm butonları aktiflikten çıkar ve görünür hale getir
        ['acmadi','kalan','bitti'].forEach(r => {
          const el = esAcma.querySelector(`[data-role="${r}"]`);
          if (el) {
            el.classList.remove('aktif');
            el.style.display = 'inline-block';
          }
        });
      }
    }
  }
}


document.addEventListener('click', (e) => {
  const btn = e.target.closest('.secenek, .masa-btn, .artir, .azalt');
  if (!btn) return;

  // --- AÇAMADI ---
  if (btn.dataset.role === 'acmadi') {
  handleAcmadi(btn);
  return;
}
  // --- KALAN (buton) -> inputa dönüşecek ---
if (btn.dataset.role === 'kalan') {
  handleKalan(btn);
  return;
}
//-----------------------------------------------------------------------------------------↑
  // --- BİTTİ (toggle) ---
if (btn.dataset.role === 'bitti') {
  handleBitti(btn);
  return;
}
//-----------------------------------------------------------------------------------------↓
  // --- OKEY / ELDEN (Bitti sonrası çıkanları tıkla) ---
  if (btn.classList.contains('okey') || btn.classList.contains('elden')) {
    btn.classList.toggle('aktif'); // birlikte de seçilebilir
    return;
  }

  // --- MASA SAYISI (toggle) ---
  if (btn.classList.contains('masa-btn')) {
    btn.classList.toggle('aktif');
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
    return;
  }
});
//-----------------------------------------------------------------------------------------↑
function tumOyuncularAldiMi(row) {
  const cells = row.querySelectorAll('.player-cell');
  return Array.from(cells).every(cell => {
    const acmaKat = cell.querySelector('.kategori');
    if (!acmaKat) return false;
    const aktif = acmaKat.querySelector('.secenek.aktif, .kalan-input');
    const esIdx = takimEsIndex(cell);
    // Takım arkadaşı bitti ise bu oyuncu da tamam sayılır
    let esTamam = false;
    if (esIdx) {
      const esCell = row.children[esIdx];
      const esBitti = esCell.querySelector('[data-role="bitti"].aktif');
      if (esBitti) esTamam = true;
    }
    return Boolean(aktif) || esTamam;
  });
}

// --- Yeni el ekleme fonksiyonu ---
function yeniElEkle() {
  const tbody = document.querySelector('tbody');
  const satirlar = tbody.querySelectorAll('tr');
  const sonSatir = satirlar[satirlar.length - 1];
  const yeniElNo = satirlar.length + 1;
  const yeniSatir = sonSatir.cloneNode(true);
  yeniSatir.querySelector('td:first-child').innerHTML = `<b>${yeniElNo}</b>`;
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
  yeniSatir.querySelectorAll('.player-cell').forEach(cell => {
    const acmaKat = cell.querySelector('.kategori');
    if (acmaKat && !acmaKat.querySelector('[data-role="kalan"]')) {
      const kalanBtn = document.createElement('div');
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

// Her tıklamadan sonra kontrol et
document.addEventListener('click', () => {
  const tbody = document.querySelector('tbody');
  const satirlar = tbody.querySelectorAll('tr');
  const sonSatir = satirlar[satirlar.length - 1];

  if (tumOyuncularAldiMi(sonSatir)) {
    yeniElEkle();
  }
});

document.addEventListener('click', (e) => {
  const hedef = e.target.closest('.secenek, .masa-btn, .artir, .azalt, .kalan-input');
  if (!hedef) return;

  const aktifSatirlar = document.querySelectorAll('tbody tr');
  if (aktifSatirlar.length < 2) return;

  const tiklananSatir = hedef.closest('tr');
  const tiklananIndex = Array.from(aktifSatirlar).indexOf(tiklananSatir);
  const sonIndex = aktifSatirlar.length - 1;
  const oncekiSatir = aktifSatirlar[sonIndex - 1];
  const sonSatir = aktifSatirlar[sonIndex];

  // 🔹 1. Yeni el aktif olunca önceki eli pasifleştir
  if (tiklananIndex === sonIndex) {
    oncekiSatir.querySelectorAll('.secenek, .masa-btn, .artir, .azalt, .kalan-input').forEach(el => {
      el.classList.add('pasif');
      el.style.pointerEvents = 'none';
      el.style.opacity = '0.5';
    });
  }

  // 🔹 2. Her tıklamadan sonra kontrol: son elde hiç seçim kalmadıysa, önceki eli geri aktif et
  setTimeout(() => {
    const aktifVarMi = sonSatir.querySelector('.secenek.aktif, .masa-btn.aktif, .bitti-ekstra');
    const kalanInputVarMi = sonSatir.querySelector('.kalan-input');
    let cezaVarMi = false;
    sonSatir.querySelectorAll('.ceza-satiri span').forEach(sp => {
      if (parseInt(sp.textContent || '0', 10) > 0) cezaVarMi = true;
    });

    // Eğer hiçbir aktif seçim, input ya da ceza yoksa:
    if (!aktifVarMi && !kalanInputVarMi && !cezaVarMi) {
      oncekiSatir.querySelectorAll('.secenek, .masa-btn, .artir, .azalt, .kalan-input').forEach(el => {
        el.classList.remove('pasif');
        el.style.pointerEvents = 'auto';
        el.style.opacity = '1';
      });
    }
  }, 100);
  toplamPuanHesapla();
});
document.addEventListener('input', (e) => {
  const input = e.target.closest('.kalan-input');
  if (!input) return;

  const row = input.closest('tr');
  const tbody = row.closest('tbody');
  const satirlar = tbody.querySelectorAll('tr');
  const sonIndex = satirlar.length - 1;
  const sonSatir = satirlar[sonIndex];
  const oncekiSatir = satirlar[sonIndex - 1];

  // Eğer bu input son eldeyse ve tamamen temizlendiyse:
  if (row === sonSatir && input.value.trim() === '') {
    // Diğer aktif elemanlar da yoksa geri aktif yap
    const aktifVarMi = sonSatir.querySelector('.secenek.aktif, .masa-btn.aktif, .bitti-ekstra');
    let cezaVarMi = false;
    sonSatir.querySelectorAll('.ceza-satiri span').forEach(sp => {
      if (parseInt(sp.textContent || '0', 10) > 0) cezaVarMi = true;
    });

    if (!aktifVarMi && !cezaVarMi) {
      oncekiSatir.querySelectorAll('.secenek, .masa-btn, .artir, .azalt, .kalan-input').forEach(el => {
        el.classList.remove('pasif');
        el.style.pointerEvents = 'auto';
        el.style.opacity = '1';
      });
    }
  }
  toplamPuanHesapla();
});

// 🔹 TOPLAM PUAN HESAPLAMA FONKSİYONU
function toplamPuanHesapla() {
  const tbody = document.querySelector('tbody');
  const satirlar = tbody.querySelectorAll('tr');
  const toplamlar = [0, 0, 0, 0]; // Oyuncu 1-4 toplam puanları

  satirlar.forEach(row => {
    const hucreler = row.querySelectorAll('.player-cell');
    let bitenIndex = null;
    let carpim = 1;

    // 🔹 Önce kimin "bitti" olduğunu ve çarpanı tespit et
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

    // 🔸 Her oyuncunun puanını hesapla
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
        if (okey && elden) puan -= 202;
        else if (okey) puan -= 101;
        else if (elden) puan -= 202;
        else puan -= 101;
      }

      // 🔸 Masa cezası
      if (masa) puan -= 101;

      // 🔸 Cezalar (çarpan dışında)
      cezalar.forEach(span => {
        const adet = parseInt(span.textContent || '0', 10);
        if (adet > 0) puan += adet * 101;
      });

      elPuanlari[i] = puan;
    });

    // 🔹 Takım eşleri
    const takimEs = { 0: 1, 1: 0, 2: 3, 3: 2 };

    // 🔸 Biten oyuncu varsa özel durumlar
    if (bitenIndex !== null) {
      const esIndex = takimEs[bitenIndex];

      // Takım arkadaşı 0 alır
      const esCell = hucreler[esIndex];
if (esCell) {
  let cezaToplam = 0;
  const masa = esCell.querySelector('.masa-btn.aktif');
  const cezalar = esCell.querySelectorAll('.ceza-satiri span');
  cezalar.forEach(span => {
    const adet = parseInt(span.textContent || '0', 10);
    if (adet > 0) cezaToplam += adet * 101;
  });
  if (masa) cezaToplam -= 101;
  elPuanlari[esIndex] = cezaToplam; // sadece ceza etkileri kalır
}
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
</script>
