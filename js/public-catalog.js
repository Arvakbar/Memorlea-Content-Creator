'use strict';
async function renderPublicCatalog() {
  const wrap = document.getElementById('public-catalog');
  if (!wrap) return;
  try {
    const { data, error } = await db.from('service_packages').select('name,description,price,duration_hours').eq('active', true).order('price');
    if (error) throw error;
    wrap.replaceChildren();
    if (!data?.length) { wrap.textContent = 'Belum ada paket aktif. Hubungi tim untuk konsultasi.'; return; }
    for (const pkg of data) {
      const card = document.createElement('article'); card.className = 'catalog-public-card';
      const title = document.createElement('h3'); title.textContent = pkg.name;
      const price = document.createElement('p'); price.textContent = MemorleaCatalog.money(pkg.price) + ' · ' + pkg.duration_hours + ' jam';
      const description = document.createElement('p'); description.textContent = pkg.description;
      card.append(title, price, description); wrap.append(card);
    }
  } catch (error) { wrap.textContent = 'Paket belum dapat dimuat. Silakan coba lagi atau hubungi tim Memorlea.'; }
}
renderPublicCatalog();
