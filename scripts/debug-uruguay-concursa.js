import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

const url = 'https://www.uruguayconcursa.gub.uy/Portal/servlet/com.si.recsel.dspllamados62';

console.log('🔍 Fetching Uruguay Concursa page...');

try {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    timeout: 15000
  });
  
  console.log('✅ Page fetched successfully');
  console.log(`📄 Content length: ${response.data.length} characters`);
  
  // Save HTML to file for inspection
  fs.writeFileSync('./debug-uruguay-concursa.html', response.data);
  console.log('💾 HTML saved to debug-uruguay-concursa.html');
  
  // Parse with Cheerio
  const $ = cheerio.load(response.data);
  
  // Check for various selectors
  console.log('\n📊 Selector Analysis:');
  console.log(`- Tables: ${$('table').length}`);
  console.log(`- Table rows: ${$('tr').length}`);
  console.log(`- Links: ${$('a').length}`);
  console.log(`- Forms: ${$('form').length}`);
  console.log(`- Divs: ${$('div').length}`);
  
  // Look for common keywords
  const bodyText = $('body').text();
  console.log('\n🔍 Keyword Search:');
  console.log(`- Contains "llamado": ${bodyText.toLowerCase().includes('llamado')}`);
  console.log(`- Contains "concurso": ${bodyText.toLowerCase().includes('concurso')}`);
  console.log(`- Contains "resultado": ${bodyText.toLowerCase().includes('resultado')}`);
  
  // Show table structure
  console.log('\n📋 Table Structure:');
  $('table').each((i, table) => {
    const $table = $(table);
    const rows = $table.find('tr').length;
    console.log(`Table ${i + 1}: ${rows} rows`);
    
    // Show first row structure
    const firstRow = $table.find('tr').first();
    const cells = firstRow.find('td, th');
    if (cells.length > 0) {
      console.log(`  First row has ${cells.length} cells:`);
      cells.each((j, cell) => {
        const text = $(cell).text().trim().substring(0, 50);
        console.log(`    Cell ${j + 1}: "${text}"`);
      });
    }
  });
  
  // Show some links
  console.log('\n🔗 Sample Links:');
  $('a').slice(0, 20).each((i, link) => {
    const $link = $(link);
    const href = $link.attr('href');
    const text = $link.text().trim().substring(0, 60);
    if (text && href) {
      console.log(`  ${i + 1}. "${text}" -> ${href}`);
    }
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
