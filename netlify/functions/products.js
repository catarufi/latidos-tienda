const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // GET - load products from CMS markdown files
  if (event.httpMethod === 'GET') {
    try {
      const productosDir = path.join(process.cwd(), 'productos');

      if (!fs.existsSync(productosDir)) {
        return { statusCode: 200, headers, body: '[]' };
      }

      const files = fs.readdirSync(productosDir).filter(f => f.endsWith('.md'));
      const products = [];

      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(productosDir, file), 'utf8');
          const frontmatter = parseFrontmatter(content);
          if (frontmatter && frontmatter.activo !== 'false' && frontmatter.activo !== false) {
            products.push({
              id: file.replace('.md', ''),
              name: frontmatter.nombre || '',
              cat: catMap(frontmatter.categoria),
              price: Number(frontmatter.precio_tarjeta) || 0,
              priceTarjeta: Number(frontmatter.precio_tarjeta) || 0,
              priceTransf: frontmatter.precio_transf ? Number(frontmatter.precio_transf) : null,
              cuotas: Number(frontmatter.cuotas) || 3,
              sizes: Array.isArray(frontmatter.talles) ? frontmatter.talles : (frontmatter.talles ? [frontmatter.talles] : []),
              badge: frontmatter.badge || null,
              desc: frontmatter.descripcion || '',
              photos: parseFotos(frontmatter.fotos),
              old: null
            });
          }
        } catch (e) {
          console.error('Error parsing file:', file, e);
        }
      }

      return { statusCode: 200, headers, body: JSON.stringify(products) };

    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // POST - save products (legacy localStorage sync)
  if (event.httpMethod === 'POST') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, headers, body: 'Method not allowed' };
};

function catMap(cat) {
  const map = {
    'Parte de arriba': 'arriba',
    'Parte de abajo': 'abajo',
    'Party': 'party',
    'Accesorios': 'accesorios',
    // legacy
    'Tops': 'arriba',
    'Partes de abajo': 'abajo',
    'Sets & Looks': 'party'
  };
  return map[cat] || 'arriba';
}

function parseFotos(fotos) {
  if (!fotos) return [];
  if (typeof fotos === 'string') return [fotos];
  if (Array.isArray(fotos)) {
    return fotos.map(f => {
      if (typeof f === 'string') return f;
      if (typeof f === 'object' && f.foto) return f.foto;
      return null;
    }).filter(Boolean);
  }
  return [];
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const yaml = match[1];
  const result = {};
  const lines = yaml.split(/\r?\n/);
  let currentKey = null;
  let inList = false;
  let listItems = [];

  for (const line of lines) {
    if (line.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*:/)) {
      if (currentKey && inList) result[currentKey] = listItems;
      const colonIdx = line.indexOf(':');
      currentKey = line.substring(0, colonIdx).trim();
      const val = line.substring(colonIdx + 1).trim();
      if (val === '') { inList = true; listItems = []; }
      else { inList = false; result[currentKey] = val.replace(/^["']|["']$/g, ''); }
    } else if (inList && line.match(/^\s*-\s*/)) {
      const item = line.replace(/^\s*-\s*/, '').trim().replace(/^["']|["']$/g, '');
      if (item) listItems.push(item);
    }
  }
  if (currentKey && inList) result[currentKey] = listItems;
  return result;
}
