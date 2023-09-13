const puppeteer = require("puppeteer-core");
const fs = require("fs");
const dotenv = require("dotenv");
const axios = require("axios");
const path = require("path");
dotenv.config();

// Determine the Chrome executable path based on the operating system
let chromeExecutablePath;
if (process.platform === "win32") {
  // Windows
  chromeExecutablePath =
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
} else if (process.platform === "darwin") {
  // macOS
  chromeExecutablePath =
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
} else {
  // Linux (you might need to adjust the path based on your Linux distribution)
  chromeExecutablePath = "/usr/bin/google-chrome";
}

async function runScrapingWithProxy(proxy) {
  console.log("myproxy", proxy);
  const browser = await puppeteer.launch({
    executablePath: chromeExecutablePath,
    defaultViewport: null,
    timeout: 90000,
  });

  try {
    console.log("Connected! Navigating to https://amazon.com...");
    const page = await browser.newPage();

    // Retrieve the public IP address before making the request
    const publicIpAddressBefore = await getPublicIpAddress();
    console.log("Public IP Address Before:", publicIpAddressBefore);

    await page.goto("https://www.amazon.com/Best-Sellers/zgbs");

    // Extract product information
    const productsData = await page.evaluate(() => {
      const products = Array.from(
        document.querySelectorAll(".a-carousel-card")
      );
      return products.map((product) => {
        const productName = product.querySelector(
          ".p13n-sc-truncate-desktop-type2"
        );
        const productImage = product.querySelector("img");
        const productPrice = product.querySelector(
          ".a-size-base.a-color-price"
        );

        return {
          title: productName ? productName.textContent.trim() : null,
          price: productPrice ? productPrice.textContent.trim() : null,
          img: productImage ? productImage.getAttribute("src").trim() : null,
        };
      });
    });

    // Define the folder where you want to save the JSON files
    const saveFolderPath = "jsondata"; // Replace 'your_folder_path' with the actual folder path

    // Ensure the folder exists; create it if it doesn't
    if (!fs.existsSync(saveFolderPath)) {
      fs.mkdirSync(saveFolderPath, { recursive: true });
    }

    // Generate a unique filename for each JSON file
    const filename = path.join(
      saveFolderPath,
      `jsondata_${Date.now()}.json`
    );

    // Save the JSON data to the specified folder and file
    fs.writeFileSync(filename, JSON.stringify(productsData));
    console.log(`JSON data saved to ${filename}`);

    // Retrieve the public IP address after making the request
    const publicIpAddressAfter = await getPublicIpAddress();
    console.log("Public IP Address After:", publicIpAddressAfter);
  } catch (err) {
    console.log("Error:", err.message);
  } finally {
    await browser.close();
  }
}
async function getPublicIpAddress() {
  try {
    const response = await axios.get("https://api.ipify.org?format=json");
    const ipAddress = response.data.ip;
    return ipAddress;
  } catch (error) {
    console.error("Error fetching public IP address:", error);
    return null;
  }
}

function loadProxiesFromFile(filename) {
  return fs
    .readFileSync(filename, "utf-8")
    .split("\n")
    .filter((proxy) => proxy.trim() !== "");
}

async function main() {
  const validProxies = loadProxiesFromFile("proxy.txt"); // Replace with the actual filename

  // Make 1000 requests using the valid proxies
  const numRequests = 10; // Adjust the number of requests
  for (let i = 0; i < numRequests; i++) {
    const randomIndex = Math.floor(Math.random() * validProxies.length);
    const randomProxy = validProxies[randomIndex];
    await runScrapingWithProxy(randomProxy);

    // Add rate limiting to avoid overloading the server
    const delayMs = Math.random() * 5000; // Random delay up to 5 seconds
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

main();
