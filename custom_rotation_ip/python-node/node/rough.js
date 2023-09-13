const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const async = require('async');

const proxyQueue = async.queue(checkProxies, 10); // Maximum 10 concurrent requests

function loadProxies(filename) {
  const proxies = fs.readFileSync(filename, 'utf-8').split('\n');
  return proxies.filter((proxy) => proxy.trim() !== ''); // Remove empty lines
}

function checkProxies(proxy, callback) {
  axios
    .get('http://ipinfo.io/json', {
      proxy: {
        host: proxy,
        port: 80, // Assuming HTTP proxy
      },
    })
    .then((response) => {
      if (response.status === 200) {
        console.log('Valid Proxy:', proxy);
        for (let i = 0; i < 50; i++) {
          runScrapingWithProxy(proxy, i);
        }
      }
      callback();
    })
    .catch((error) => {
      // Handle request errors (e.g., proxy is down)
      callback();
    });
}

async function runScrapingWithProxy(proxy, iteration) {
  const browser = await puppeteer.launch({
    args: [`--proxy-server=http://${proxy}`],
  });

  const page = await browser.newPage();
  await page.goto('https://www.amazon.com');

  // Perform a search on Amazon
  const searchQuery = 'your search keyword';
  await page.type('#twotabsearchtextbox', searchQuery);
  await page.keyboard.press('Enter');

  // Wait for the search results to load (adjust as needed)
  await page.waitForSelector('.s-main-slot');

  // Extract and print search results
  const searchResults = await page.evaluate(() => {
    const results = [];
    const items = document.querySelectorAll('.s-result-item');
    items.forEach((item) => {
      const title = item.querySelector('h2').textContent;
      const price = item.querySelector('.a-price .a-offscreen').textContent;
      results.push({ title, price });
    });
    return results;
  });

  console.log(`Search Results (Iteration ${iteration + 1}):`, searchResults);

  await browser.close();
}

const proxies = loadProxies('proxy.txt');

proxies.forEach((proxy) => {
  proxyQueue.push(proxy);
});
