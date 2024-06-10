import puppeteer from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import GoogleSheetsAPI from "./GoogleSheetsAPI.js";
import dotenv from "dotenv";

dotenv.config();

class Scraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.googleSheets = new GoogleSheetsAPI();
    this.products = null;
    this.sheet = null;
  }

  async init() {
    if (process.env.NODE_ENV === "production") {
      this.browser = await puppeteer.launch({
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-extensions",
        ],
        headless: "new",
        executablePath:
          process.env.NODE_ENV === "production"
            ? process.env.PUPPETER_EXECUTABLE_PATH
            : puppeteer.executablePath(),
      });
    } else {
      this.browser = await puppeteer.launch();
    }

    this.products = await this.getProducts();
    this.sheet = "data";
  }

  async getTextContent(selector) {
    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });
      return await this.page.$eval(selector, (element) =>
        element.textContent.trim()
      );
    } catch (error) {
      //   console.error(
      //     `Error fetching text content for selector: ${selector}`,
      //     error
      //   );
      console.log(`Text content not found`);
      return "Not Available";
    }
  }

  async getAttributeValue(selector) {
    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });
      const attribute = await this.page.$eval(selector, (element) =>
        element.getAttribute("data-photoswipe-src")
      );

      return attribute;
    } catch (error) {
      //   console.error(
      //     `Error fetching text content for selector: ${selector}`,
      //     error
      //   );
      console.log(`Attribute not found`);
      return "Not Available";
    }
  }

  async scrapePage(pageNum) {
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1366, height: 780 });
    // await this.page.goto(
    //   `https://steadymoto.com/collections/all?page=${pageNum}&sort_by=best-selling`
    // );
    await this.bruteForceGotoPage(
      `https://steadymoto.com/collections/all?page=${pageNum}&sort_by=best-selling`
    );
    console.log(`Page ${pageNum} opened`);
    var hrefs = [];

    // POPULATE THE HREFS ARRAY
    for (let index = 1; index <= 30; index++) {
      var selector1 = `#CollectionAjaxContent > div > div > div.grid__item.medium-up--four-fifths.grid__item--content > div:nth-child(2) > div > div.collection-grid__wrapper > div.grid.grid--uniform > div:nth-child(${index}) > div > a`;
      await this.page.waitForSelector(selector1);
      const href = await this.page.$eval(selector1, (element) =>
        element.getAttribute("href")
      );
      hrefs.push(href.replace("/collections/all", ""));
    }

    await this.page.close();

    // NAVIGATE TO EACH HREFS AND SCRAPE DATA
    for (let hrefIndex = 0; hrefIndex < hrefs.length; hrefIndex++) {
      this.page = await this.browser.newPage();
      var pageLink = `https://steadymoto.com${hrefs[hrefIndex]}`;
      if (this.checkIfProductExist(pageLink)) {
        console.log(`Product already exists: ${pageLink}`);
        continue;
      }

      console.log(`Opening ${pageLink}`);
      // await this.page.goto(pageLink);

      await this.bruteForceGotoPage(pageLink);

      var imgRef = await this.getAttributeValue(
        "#MainContent > div:nth-child(1) > div:nth-child(1) > div > div > div > div.grid__item.medium-up--one-half.product-single__sticky > div > div > div.product__main-photos.aos-init.aos-animate > div:nth-child(1) > div > div > div > img"
      );

      if (imgRef === "Not Available") {
        imgRef = await this.getAttributeValue(
          "#MainContent > div:nth-child(1) > div:nth-child(1) > div > div > div > div.grid__item.medium-up--one-half.product-single__sticky > div > div > div.product__main-photos.aos-init.aos-animate > div:nth-child(1) > div > div > div.product-main-slide.starting-slide.is-selected > div > div > img"
        );
      }

      const productType = await this.getTextContent(
        "#MainContent > div:nth-child(1) > div:nth-child(1) > div > div > div > div:nth-child(2) > div > div.product-block.product-block--header > div > a"
      );
      const productName = await this.getTextContent(
        "#MainContent > div:nth-child(1) > div:nth-child(1) > div > div > div > div:nth-child(2) > div > div.product-block.product-block--header > h1"
      );
      const description = await this.getTextContent(
        "#MainContent > div:nth-child(1) > div:nth-child(1) > div > div > div > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(6) > div > div"
      );
      const price = await this.getTextContent(
        "#MainContent > div:nth-child(1) > div:nth-child(1) > div > div > div > div:nth-child(2) > div > div:nth-child(2) > div.product-block.product-block--price > span.product__price"
      );
      var variants = await this.getTextContent(
        "#MainContent > div:nth-child(1) > div:nth-child(1) > div > div > div > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(2) > div > fieldset"
      );

      if (variants !== "Not Available") {
        variants = variants
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
      }

      var toBeSaved = {
        id: uuidv4(),
        productName: productName,
        productType: productType,
        price: price,
        variants:
          variants === "Not Available"
            ? variants
            : {
                variantName: variants[0],
                variants: variants.slice(1),
              },
        imgRef: imgRef,
        description: description,
        link: pageLink,
        scrapedOn: new Date().toLocaleString("en-US", {
          timeZone: "Asia/Singapore",
        }),
      };
      if (!this.checkIfProductExist(toBeSaved.link)) {
        await this.googleSheets.addData(this.sheet, [
          [
            toBeSaved.id,
            toBeSaved.productName,
            toBeSaved.productType,
            toBeSaved.price,
            JSON.stringify(toBeSaved.variants),
            toBeSaved.description,
            toBeSaved.imgRef,
            toBeSaved.link,
            toBeSaved.scrapedOn,
          ],
        ]);
      }
      this.products.push(toBeSaved);
      console.log(toBeSaved);
      await this.page.close();
    }
  }

  async close() {
    await this.browser.close();
  }

  async bruteForceGotoPage(pageLink) {
    while (true) {
      try {
        await this.page.goto(pageLink);
        break;
      } catch (error) {
        console.error("Error navigating to page", error);
        await this.page.close();
        this.page = await this.browser.newPage();
        continue;
      }
    }
  }

  async getProducts() {
    const lastRow = await this.googleSheets.getLastRow("data");
    const allData = await this.googleSheets.getAllData(
      `data!A2:Q${lastRow + 1}`
    );
    const products = allData.map((product) => {
      return {
        id: product[0],
        productName: product[1],
        productType: product[2],
        price: product[3],
        variants: product[4],
        description: product[5],
        imgRef: product[6],
        link: product[7],
        scrapedOn: product[8],
      };
    });
    return products;
  }

  checkIfProductExist(link) {
    for (let i = 0; i < this.products.length; i++) {
      if (this.products[i].link === link) {
        return true;
      }
    }
    return false;
  }
}

export default Scraper;
