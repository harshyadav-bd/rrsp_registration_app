// Global variables
const SPREADSHEET_ID = '1OjOsY3xKS63rf1ANOTqJ1zZ72K2WWUmUMPNTwdyGXPk';
const SHEET_NAME = 'Sheet1';

function doGet(e) {
  if (e.parameter.form == 'employee') {
    return HtmlService.createTemplateFromFile('EmployeeForm')
      .evaluate()
      .setTitle('Borderless: Please finish your RRSP Enrollment');
  }
  return HtmlService.createTemplateFromFile('EmployerForm')
    .evaluate()
    .setTitle('RRSP Enrollment - Employer Form');
}

function checkExistingDomain(email) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Get domain from email
  const domain = email.split('@')[1];
  
  // Look for matching domain in column A (index 0)
  for (let i = data.length - 1; i >= 0; i--) {
    const rowEmail = data[i][0];
    if (rowEmail && rowEmail.includes('@')) {
      const rowDomain = rowEmail.split('@')[1];
      if (rowDomain === domain) {
        // Return the RRSP matching plan from column D (index 3) and company name from column B (index 1)
        return {
          found: true,
          matchingPlan: data[i][3],
          companyName: data[i][1]
        };
      }
    }
  }
  
  return {
    found: false,
    matchingPlan: null,
    companyName: null
  };
}

function processEmployerForm(formData) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  
  sheet.getRange(lastRow + 1, 1, 1, 9).setValues([[
    formData.formFillerEmail,
    formData.formFillerCompany,
    formData.filledBefore,
    formData.rrspMatchingPlan,
    formData.agreeToDefault ? 'Yes' : 'No',
    formData.employeeName,
    formData.employeeEmail,
    new Date(),
    'Pending'
  ]]);

  // Send notification email to ops
    const subject = 'New RRSP Registration Submitted';
    const body = 'Hello,\n\nA new Canada RRSP Registration has been submitted. Please take any action necessary.';
    
    MailApp.sendEmail({
        to: 'ops@hireborderless.com',
        subject: subject,
        body: body
    });
  
  // Create a trigger to send the email after 24 hours
  ScriptApp.newTrigger('sendDelayedEmailToEmployee')
    .timeBased()
    .after(24 * 60 * 60 * 1000) // 24 hours in milliseconds
    .create();
  
  return '';
}

function sendDelayedEmailToEmployee() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Find the last row with 'Pending' status
  const pendingRow = data.reverse().find(row => row[8] === 'Pending');
  
  if (pendingRow) {
    const employeeEmail = pendingRow[6];
    const rrspMatchingPlan = pendingRow[3];
    
    sendEmailToEmployee(employeeEmail, rrspMatchingPlan);
    
    // Update the status to 'Sent'
    const rowIndex = data.length - data.indexOf(pendingRow);
    sheet.getRange(rowIndex, 9).setValue('Sent');
  }
  
  // Delete the trigger after execution
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendDelayedEmailToEmployee') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}


function sendEmailToEmployee(email, rrspMatchingPlan) {
  const subject = 'Borderless: Please finish your RRSP Enrollment';
  const body = `
    <html>
      <head>
        <style>
          body {
            font-family: 'Roboto', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .content {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          h2 {
            color: #2c3e50;
            margin-bottom: 20px;
          }
          .logo {
            display: block;
            margin: 0 auto 20px;
            max-width: 200px;
          }
          .button {
            display: inline-block;
            background-color: #3498db;
            color: white;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <img src="https://lh3.googleusercontent.com/d/1PWA1M0-RgffWznEMCygAxsjKjLOTFi0H" alt="Company Logo" class="logo">
            <h2>Registered Retirement Savings Plan (RRSP) Enrollment</h2>
            <p>Hello,</p>
            <p>Please complete your RRSP enrollment by filling out the form using the link below.</p>
            <p>Your RRSP Matching Plan: ${rrspMatchingPlan}%</p>
            <a href="${ScriptApp.getService().getUrl()}?form=employee" class="button">Complete RRSP Enrollment</a>
          </div>
        </div>
      </body>
    </html>
  `;
  
  const fromEmail = 'ops@hireborderless.com'; // Replace with your desired email address

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: body,
    from: fromEmail,
    name: 'Borderless Onboarding' // Optional: You can set a custom name for the sender
  });
}

function processEmployeeForm(formData) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Find the row with the matching email in column 7 (index 6)
  const row = data.findIndex(row => row[6] === formData.email);
  
  if (row === -1) {
    return 'Error: Employee email not found. Please select the email that is associated with your Borderless account.';
  }
  
  // Update columns 10-13 with the new data
  sheet.getRange(row + 1, 10, 1, 4).setValues([[
    formData.wantToMatch,
    formData.contributeMore,
    formData.additionalPercentage || 'N/A',
    new Date()
  ]]);
  
  // Update status in column 9
  sheet.getRange(row + 1, 9).setValue('Completed');

  // Send notification email to ops
  const subject = 'Employee Completed RRSP Registration';
  const body = 'Hello,\n\nAn employee has completed their RRSP registration. Please take any action necessary.';

  MailApp.sendEmail({
    to: 'ops@hireborderless.com',
    subject: subject,
    body: body
  });
  
  return '<strong>Form submitted successfully. Please <a href="https://www.joinyourplan.com/?id=16742&lang=Eng&t=638791161949179661#outside-front-cover" target="_blank">click here</a> to complete your RRSP registration directly with Canada Life.</strong>';

}

function getRRSPMatchingPlan(email) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Assuming employee email is now in column 7 (index 6)
  const row = data.find(row => row[6] === email);
  
  if (!row) {
    return null;
  }
  
  // RRSP Matching Plan is in column 4 (index 3)
  return row[3];
}

// New Function to Calculate RRSP Contributions
function calculateRRSPContributions(email, annualSalary) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Find the row with the matching email in column 7 (index 6)
  const row = data.find(row => row[6] === email);
  
  if (!row) {
    return { error: 'RRSP Matching Plan not found for the provided email.' };
  }
  
  // RRSP Matching Plan is in column 4 (index 3)
  const rrspMatchingPlan = parseFloat(row[3]);
  
  if (isNaN(rrspMatchingPlan)) {
    return { error: 'Invalid RRSP Matching Plan value.' };
  }
  
  // Additional Percentage is in column 12 (index 11)
  let additionalPercentage = 0;
  if (row.length > 11 && !isNaN(parseFloat(row[11]))) {
    additionalPercentage = parseFloat(row[11]);
  }
  
  const biWeeklyPay = annualSalary / 26;
  const yourContributionPct = rrspMatchingPlan + additionalPercentage;
  const yourContribution = (biWeeklyPay * yourContributionPct) / 100;
  const employerContribution = (biWeeklyPay * rrspMatchingPlan) / 100;
  const totalContribution = yourContribution + employerContribution;
  
  return {
    biWeeklyPay: biWeeklyPay,
    yourContributionPct,
    yourContribution: yourContribution,
    employerContribution: employerContribution,
    totalContribution: totalContribution
  };
}

function getCommonCSS() {
  return `
    <style>
      body {
        font-family: 'Roboto', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f5f5f5;
      }
      .container {
        background-color: #ffffff;
        border-radius: 8px;
        padding: 30px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      h2 {
        color: #2c3e50;
        margin-bottom: 20px;
        text-align: center;
      }
      .logo {
        display: block;
        margin: 0 auto 20px;
        max-width: 200px;
      }
      label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
        color: #34495e;
      }
      input[type="text"],
      input[type="email"],
      input[type="number"],
      select {
        width: 100%;
        padding: 10px;
        margin-bottom: 20px;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-sizing: border-box;
      }
      input[type="submit"],
      button {
        background-color: #3498db;
        color: white;
        padding: 12px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
        font-size: 16px;
        transition: background-color 0.3s;
      }
      input[type="submit"]:hover,
      button:hover {
        background-color: #2980b9;
      }
      .checkbox-container {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
      }
      .checkbox-container input {
        margin-right: 10px;
      }
      #result {
        margin-top: 20px;
        padding: 10px;
        border-radius: 4px;
        text-align: center;
      }
      .success {
        background-color: #d4edda;
        color: #155724;
      }
      .error {
        background-color: #f8d7da;
        color: #721c24;
      }
      
      /* New Styles for Contribution Section */
      .button-container {
        display: flex;
        justify-content: center; /* Centers the buttons horizontally */
        gap: 20px; /* Adds space between the buttons */
        margin-top: 10px;
      }
      
      .calc-button {
        flex: 1; /* Makes buttons take equal width */
        max-width: 100px; /* Optional: limits the maximum width */
        padding: 10px 0; /* Adjusts vertical padding */
        font-size: 16px;
      }
      
      /* Responsive Design */
      @media (max-width: 500px) {
        .button-container {
          flex-direction: column;
          gap: 10px;
        }
        .calc-button {
          width: 100%;
          max-width: none;
        }
      }
    </style>
  `;
}
