import Scraper from "./scraper.js";

const main = async () => {
  const scraper = new Scraper();
  await scraper.init();
  for (let pageNum = 1; pageNum <= 101; pageNum++) {
    await scraper.scrapePage(pageNum);
  }
  // await scraper.close();
  // console.log("Scraping done");
};

(async () => {
  await main();
})();
