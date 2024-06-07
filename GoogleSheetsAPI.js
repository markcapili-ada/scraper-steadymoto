import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

class GoogleSheetsAPI {
  constructor() {
    this.credentials = JSON.parse(process.env.CREDENTIALS);
    this.token = JSON.parse(process.env.TOKEN);
    this.spreadsheetId = process.env.SPREADSHEET_ID;
  }

  // Load client secrets from environment variables and authorize a client with credentials
  loadAndAuthorize(callback) {
    try {
      const credentials = JSON.parse(process.env.CREDENTIALS);
      this.authorize(callback);
    } catch (err) {
      console.log("Error loading credentials from environment variables:", err);
    }
  }

  authorize(callback) {
    const { client_secret, client_id, redirect_uris } =
      this.credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Check if we have previously stored a token.
    // if (!this.token) return this.getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(this.token);
    callback(oAuth2Client);
  }

  // // Function to get a new token
  // getNewToken(oAuth2Client, callback) {
  //   const authUrl = oAuth2Client.generateAuthUrl({
  //     access_type: "offline",
  //     scope: ["https://www.googleapis.com/auth/spreadsheets"],
  //   });
  //   console.log("Authorize this app by visiting this url:", authUrl);
  //   const rl = readline.createInterface({
  //     input: process.stdin,
  //     output: process.stdout,
  //   });
  //   rl.question("Enter the code from that page here: ", (code) => {
  //     rl.close();
  //     oAuth2Client.getToken(code, (err, token) => {
  //       if (err) return console.error("Error retrieving access token", err);
  //       oAuth2Client.setCredentials(token);
  //       // Store the token to disk for later program executions
  //       fs.writeFile(this.tokenPath, JSON.stringify(token), (err) => {
  //         if (err) return console.error(err);
  //         console.log("Token stored to", this.tokenPath);
  //       });
  //       callback(oAuth2Client);
  //     });
  //   });
  // }

  // Function to write data to a Google Spreadsheet
  writeData(auth, range, values) {
    const sheets = google.sheets({ version: "v4", auth });
    const valueInputOption = "RAW";
    const resource = { values: values };
    sheets.spreadsheets.values.update(
      {
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: valueInputOption,
        resource: resource,
      },
      (err, result) => {
        if (err) {
          // Handle error
          console.log(err);
        } else {
          console.log(`${result.data.updatedCells} cells updated.`);
        }
      }
    );
  }

  // Function to append data to a Google Spreadsheet
  async appendData(auth, range, values) {
    const sheets = google.sheets({ version: "v4", auth });
    const valueInputOption = "RAW";
    const resource = { values: values };
    sheets.spreadsheets.values.append(
      {
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: valueInputOption,
        resource: resource,
      },
      (err, result) => {
        if (err) {
          // Handle error
          console.log(err);
        } else {
          console.log(`${result.data.updates.updatedCells} cells appended.`);
        }
      }
    );
  }

  // Function to call writeData with specific range and values
  updateSheet(range, values) {
    this.loadAndAuthorize((auth) => {
      this.writeData(auth, range, values);
    });
  }

  // Function to call appendData with specific range and values
  async addData(range, values) {
    this.loadAndAuthorize((auth) => {
      this.appendData(auth, range, values);
    });
  }

  // Function to get all data from the sheet
  getAllData(range) {
    return new Promise((resolve, reject) => {
      this.loadAndAuthorize((auth) => {
        const sheets = google.sheets({ version: "v4", auth });
        sheets.spreadsheets.values.get(
          {
            spreadsheetId: this.spreadsheetId,
            range: range,
          },
          (err, res) => {
            if (err) reject("The API returned an error: " + err);
            const rows = res.data.values;
            if (rows) {
              if (rows.length) {
                resolve(rows);
              } else {
                resolve([]);
              }
            } else {
              resolve([]);
            }
          }
        );
      });
    });
  }

  // Function to get the last row of data in the sheet
  getLastRow(sheetName) {
    return new Promise((resolve, reject) => {
      this.loadAndAuthorize((auth) => {
        const sheets = google.sheets({ version: "v4", auth });
        sheets.spreadsheets.values.get(
          {
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A1:A`,
          },
          (err, res) => {
            if (err) reject("The API returned an error: " + err);
            const rows = res.data.values;
            if (rows.length) {
              resolve(rows.length);
            } else {
              resolve(0);
            }
          }
        );
      });
    });
  }
}

export default GoogleSheetsAPI;

// async function main() {
//   const googleSheets = new GoogleSheetsAPI();

//   // Define the range and values you want to append
//   // const range = "data!A2:C`;

//   // Append the data to the sheet
//   const lastRow = await googleSheets.getLastRow("data");

//   const range = `data!M2:M${lastRow}`;
//   const allData = await googleSheets.getAllData(range);

//   console.log(allData.flat());
// }

// main();
