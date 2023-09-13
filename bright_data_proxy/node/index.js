const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const axios = require("axios");
dotenv.config();
async function runScrapingWithProxy() {
  let browser;
  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: `wss://${process.env.BRIGHT_DATA_USERNAME}:${process.env.BRIGHT_DATA_PASSWORD}@${process.env.BRIGHT_DATA_HOST_NAME}`,
    });

    console.log("Connected! Navigating to https://amazon.com...");
    const page = await browser.newPage();
    const navigationPromise = page.waitForNavigation({ waitUntil: "domcontentloaded" }); // Wait for DOM content to be loaded
    await page.goto("https://www.amazon.com/Best-Sellers/zgbs");
    await navigationPromise; // Wait for navigation to complete

   


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
          img: productImage ? productImage.getAttribute("src").trim() : null, // Change to get the 'src' attribute of the 'img' element
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
    const filename = path.join(saveFolderPath, `jsondata_${Date.now()}.json`);

    // Save the JSON data to the specified folder and file
    fs.writeFileSync(filename, JSON.stringify(productsData));
    console.log(`JSON data saved to ${filename}`);

    const searchText =
      "COSRX Snail Mucin 96% Power Repairing Essence 3.38 fl.oz 100ml, Hydrating Serum for Face with Snail Secretion Filtrate for Du";
    await selectImage(searchText, page);

    const inputPath = "#twotabsearchtextbox"; // Set your input path here
    const searchWords = ["shoes", "lipstick", "socks", "pants", "chips"]; // Corrected spelling mistakes and added single quotes for each keyword

    await searchKeyWords(inputPath, searchWords, page);

    console.log("All done 🚀");
  } catch (err) {
    console.log("Error:", err.message);
    // You can handle specific error types here if needed
  } finally {
    await browser.close();
  }
}

async function searchKeyWords(inputPath, searchWords, page) {
  try {
    let count = 0;
    for (const keyword of searchWords) {
      // Wait for the input element to exist
      await page.waitForSelector(inputPath);
      // Type the keyword into the search input field
      await page.type(inputPath, keyword);

      // Press Enter to initiate the search
      await page.keyboard.press("Enter");

      // Wait for a random time between 3 to 6 seconds (adjust as needed)
      count++;
      console.log("search", count, "done");
      const randomWaitTime =
        Math.floor(Math.random() * (6000 - 3000 + 1)) + 3000;
      await page.waitForTimeout(randomWaitTime);
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

async function selectImage(searchText, page) {
  try {
    // Get all the images on the page
    const images = await page.$$eval("img", (imgs) =>
      imgs.map((img) => img.getAttribute("alt"))
    );
    console.log(images);

    // Find the first image whose alt text contains the searchText
    const matchingAltTextIndex = images.findIndex(
      (altText) => altText && altText.includes(searchText)
    );

    if (matchingAltTextIndex !== -1) {
      // Click on the image
      const matchingImage = (await page.$$("img"))[matchingAltTextIndex];
      await matchingImage.click();
      console.log(
        `Clicked on an image with alt text containing "${searchText}"`
      );
      await page.waitForNavigation({ waitUntil: "domcontentloaded" });
      console.log("Image click done");
    } else {
      console.log(`No image found with alt text containing "${searchText}"`);
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

async function main() {
  const numRequests = 10000; // Add your desire number
  for (let i = 0; i < numRequests; i++) {
    await runScrapingWithProxy();
    const delayMs = Math.random() * 5000; // Random delay up to 5 seconds
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

main();
