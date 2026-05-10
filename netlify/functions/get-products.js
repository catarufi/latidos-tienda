const fs = require('fs');
const path = require('path');

exports.handler = async () => {
  try {
    const productosDir = path.join(process.cwd(), 'productos');
    
    if (!fs.existsSync(productosDir)) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: '[]' };
    }

    const files = fs.readdirSync(productosDir).filter(f => f.endsWith('.md'));
    const products = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(productosDir, file), 'utf8');
      const frontmatter = parseFrontmatter(content);
      if (frontmatter && frontmatter.activo !== false) {
        products.push({
          id: file.replace('.md', ''),
          name: frontmatter.nombre || '',
          cat: catMap(frontmatter.categoria),
          price: Number(frontmatter.precio_tarjeta) || 0,
          priceTarjeta: Number(frontmatter.precio_tarjeta) || 0,
          priceTransf: frontmatter.precio_transf ? Number(frontmatter.precio_transf) : null,
          cuotas: Number(frontmatter.cuotas) || 3,
          sizes: frontmatter.talles || [],
          badge: frontmatter.badge || null,
          desc: frontmatter.descripcion || '',
          photos: (frontmatter.fotos || []).map(f => typeof f === 'object' ? f.foto : f),
          old: null
        });
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(products)
    };

  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

function catMap(cat) {
  const map = { 'Tops': 'tops', 'Partes de abajo': 'bottoms', 'Sets & Looks': 'sets' };
  return map[cat] || 'tops';
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const yaml = match[1];
  const result = {};
  const lines = yaml.split('\n');
  let currentKey = null;
  let inList = false;
  let listItems = [];

  for (const line of lines) {
    if (line.match(/^[a-z_]+:/i)) {
      if (currentKey && inList) result[currentKey] = listItems;
      const [key, ...rest] = line.split(':');
      currentKey = key.trim();
      const val = rest.join(':').trim();
      if (val === '') { inList = true; listItems = []; }
      else { inList = false; result[currentKey] = val.replace(/^["']|["']$/g, ''); }
    } else if (inList && line.match(/^\s*-/)) {
      const item = line.replace(/^\s*-\s*/, '').trim().replace(/^["']|["']$/g, '');
      if (item) listItems.push(item);
    }
  }
  if (currentKey && inList) result[currentKey] = listItems;
  return result;
}
