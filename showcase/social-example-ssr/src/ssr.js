import puppeteer from 'puppeteer';

const args = puppeteer.defaultArgs();
args.push('--enable-experimental-web-platform-features');

export async function ssr(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--enable-experimental-web-platform-features', '--no-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Get HTML with shadow DOM serialized
    const html = await page.$eval('html', (element) => {
      return element.getHTML({ 
        includeShadowRoots: true, 
        serializableShadowRoots: true 
      });
    });
    
    return `<!DOCTYPE html>\n<html>${html}</html>`;
  } finally {
    await browser.close();
  }
}
