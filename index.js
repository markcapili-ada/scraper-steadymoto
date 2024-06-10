import Scraper from "./scraper.js";
import express from "express";

const main = async () => {
  const scraper = new Scraper();
  await scraper.init();
  for (let pageNum = 1; pageNum <= 101; pageNum++) {
    await scraper.scrapePage(pageNum);
  }
  // await scraper.close();
  // console.log("Scraping done");
};

const app = express();
const port = 3001;

app.listen(port, () => {
  console.log(`Scraper app listening at http://localhost:${port}`);
});

(async () => {
  await main();
})();
