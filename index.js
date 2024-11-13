const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

async function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function downloadFile(link, folderPath) {
  const filename = path.basename(link);
  const filePath = path.join(folderPath, filename);

  try {
    if (link.endsWith('.tif') || link.endsWith('.tiff')) {
      console.log(`Attempting to download TIFF file: ${link}`);
      const response = await axios.get(link, { responseType: 'arraybuffer' });
      await fs.writeFile(filePath, response.data);
      console.log(`Successfully downloaded TIFF file to: ${filePath}`);
    } else {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      const response = await page.goto(link, { waitUntil: 'networkidle2' });
      const buffer = await response.buffer();
      await fs.writeFile(filePath, buffer);
      console.log(`Successfully downloaded file to: ${filePath}`);
      await browser.close();
    }
  } catch (error) {
    console.error(`Error downloading file (${link}):`, error.message);
  }
}

async function downloadItemPage(url, collectionFolder) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    // Extract the ID from the last part of the URL
    const id = url.match(/\/([^\/]+)\/?$/)?.[1] || '';
    console.log(`Processing item with ID: ${id}`);

    // Create a subdirectory for the item inside the collection folder
    const itemFolderPath = path.join(collectionFolder, id);
    const infoFilePath = path.join(itemFolderPath, `${id}.txt`);

    // Check if the info file already exists
    if (await fs.pathExists(infoFilePath)) {
      console.log(`Info file for item ${id} already exists. Skipping download.`);
      return; // Skip this item if the .txt file is present
    }

    // Ensure the directory exists before proceeding
    await fs.ensureDir(itemFolderPath);

    await page.goto(url, { waitUntil: 'networkidle2' });

    const links = await page.$$eval('div#item a', elements =>
      elements
        .map(el => el.href)
        .filter(link => /\.(jpg|jpeg|tif|tiff)$/i.test(link))
    );

    for (const link of links) {
      console.log(`Attempting to download link: ${link}`);
      await downloadFile(link, itemFolderPath);
      await delay(1000);
    }

    const infoText = await page.$eval('div#info', el => el.textContent.trim());
    await fs.writeFile(infoFilePath, infoText);
    console.log(`Saved info content to: ${infoFilePath}`);

  } catch (error) {
    console.error('Error processing page:', error.message);
  } finally {
    await browser.close();
  }
}

async function gatherItemLinks(collectionId) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const allLinks = [];
  let currentPage = 1;

  try {
    while (true) {
      const collectionUrl = `https://www.loc.gov/pictures/search/?sp=${currentPage}&co=${collectionId}`;

      console.log(`Navigating to page: ${collectionUrl}`);
      await page.goto(collectionUrl, { waitUntil: 'networkidle2' });

      const links = await page.$$eval('div.result_item > p > a', elements =>
        elements.map(el => el.href)
      );

      if (links.length === 0) {
        console.log(`No more links found on page ${currentPage}. Exiting pagination.`);
        break;
      }

      allLinks.push(...links);
      console.log(`Found ${links.length} links on page ${currentPage}`);
      currentPage++;
      await delay(1000);
    }
  } catch (error) {
    console.error('Error gathering item links:', error.message);
  } finally {
    await browser.close();
  }

  return allLinks;
}

async function processCollection(collectionId) {
  const collectionFolder = path.join(__dirname, collectionId);
  await fs.ensureDir(collectionFolder);

  const itemLinks = await gatherItemLinks(collectionId);
  console.log(`Total items to process: ${itemLinks.length}`);

  for (const url of itemLinks) {
    console.log(`Processing item: ${url}`);
    await downloadItemPage(url, collectionFolder);
  }
}

const collectionId = process.argv[2];
if (!collectionId) {
  console.error('Please provide a collection ID as a command-line argument.');
  process.exit(1);
}

processCollection(collectionId);
