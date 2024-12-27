import { test } from '@playwright/test';
import fs from 'fs';
import csv from 'csv-parser';

test.setTimeout(1200000); // Large timeout for testing

// Utility function to read CSV data
async function readCSVFile(filePath) {
  const companyNames = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        companyNames.push(row['COMPANY NAME']); // Adjust the column name if necessary
      })
      .on('end', () => {
        resolve(companyNames);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Utility function to write results to CSV
function writeToCSV(filePath, data) {
  const csvHeader = 'CompanyName,ExtractedCompanyName,ExtractedAddress,ExtractedLocation\n';
  const csvLines = data.map(({ companyName, extractedCompanyName, extractedAddress, extractedLocation }) => 
    `${companyName},${extractedCompanyName},${extractedAddress},${extractedLocation}`).join('\n');
  
  fs.writeFileSync(filePath, csvHeader + csvLines, { encoding: 'utf8', flag: 'w' });
}

// Utility function to add a short delay
function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

test('Company data extraction', async ({ page }) => {
  const companyNames = await readCSVFile('C:/Users/HP/Desktop/playdady/fileeee/SEED 10.csv');
  console.log('Total companies to process:', companyNames.length);

  // List to store extracted data
  const extractedData = [];

  for (const companyName of companyNames) {
    console.log(`Processing company: ${companyName}`);
    try {
      await page.goto('https://finanvo.in/');
      await page.getByPlaceholder('Search for a company').fill(companyName);
      await page.waitForLoadState('networkidle');

      try {
        // Attempt to press 'Tab' and move to the next field
        await page.getByPlaceholder('Search for a company').press('Tab');

        // Add a short delay to wait for any UI response
        await delay(4000);

        // Check if the next expected element is in view after the Tab action
        const isTabActionSuccessful = await page.$('.datatable-row-center .datatable-body-cell:nth-child(2) .datatable-body-cell-label');
        await delay(4000);
        if (!isTabActionSuccessful) {
          throw new Error('Tab action did not lead to the expected outcome.');
        }

      } catch (tabError) {
        console.log(`Tab action failed for ${companyName} after 2 seconds delay:`, tabError);
        continue; // Skip to the next company name
      }

      try {
        const companyNameElement = await page.waitForSelector('.datatable-row-center .datatable-body-cell:nth-child(2) .datatable-body-cell-label', { state: 'visible', timeout: 60000 });
        await delay(4000);
        if (companyNameElement) {
          const extractedCompanyName = await companyNameElement.evaluate(el => el.textContent.trim());
          const addressElement = await page.waitForSelector('.datatable-row-center .datatable-body-cell:nth-child(8) .datatable-body-cell-label', { state: 'visible', timeout: 60000 });
          const locationElement = await page.waitForSelector('.datatable-row-center .datatable-body-cell:nth-child(9) .datatable-body-cell-label', { state: 'visible', timeout: 60000 });

          const extractedAddress = addressElement ? await addressElement.evaluate(el => el.textContent.trim()) : '';
          const extractedLocation = locationElement ? await locationElement.evaluate(el => el.textContent.trim()) : '';
          console.log(extractedAddress,extractedLocation,locationElement)
          // Store the results in the list
          extractedData.push({ companyName, extractedCompanyName, extractedAddress, extractedLocation });

          console.log(`Extracted for ${companyName}: ${extractedCompanyName}, ${extractedAddress}, ${extractedLocation}`);
        } else {
          console.log(`Company name element not found for ${companyName}`);
        }
      } catch (extractionError) {
        console.log(`Error extracting data for ${companyName}:`, extractionError);
      }
    } catch (navigationError) {
      console.log(`Error navigating or interacting with the page for ${companyName}:`, navigationError);
    }
  }

  // Write the collected data to the output CSV file
  writeToCSV('C:/Users/HP/Desktop/playdady/fileeee/output.csv', extractedData);
  console.log('Data extraction completed and saved to CSV file.');
});
