// Global variables
const SPREADSHEET_ID = '1OjOsY3xKS63rf1ANOTqJ1zZ72K2WWUmUMPNTwdyGXPk';
const SHEET_NAME = 'Sheet1';

function doGet(e) {
  if (e.parameter.form == 'employee') {
    return HtmlService.createTemplateFromFile('EmployeeForm')
      .evaluate()
      .setTitle('RRSP Enrollment - Employee Form');
  }
  return HtmlService.createTemplateFromFile('EmployerForm')
    .evaluate()
    .setTitle('RRSP Enrollment - Employer Form');
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
  
  // Create a trigger to send the email after 24 hours
  ScriptApp.newTrigger('sendDelayedEmailToEmployee')
    .timeBased()
    .after(1 * 60 * 1000) // 1 minute in milliseconds - The timing can be changed to 24 hours using (24 * 60 * 60 * 1000)
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
  const subject = 'RRSP Enrollment - Employee Form';
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
            color: #FFFFFF;
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
            <h2>RRSP Enrollment</h2>
            <p>Dear Employee,</p>
            <p>Please complete your RRSP enrollment by filling out the form using the link below.</p>
            <p>Your RRSP Matching Plan: ${rrspMatchingPlan}%</p>
            <a href="${ScriptApp.getService().getUrl()}?form=employee" class="button">Complete RRSP Enrollment</a>
          </div>
        </div>
      </body>
    </html>
  `;
  
  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: body
  });
}

function processEmployeeForm(formData) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Find the row with the matching email in column 7 (index 6)
  const row = data.findIndex(row => row[6] === formData.email);
  
  if (row === -1) {
    return 'Error: Employee email not found.';
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
  
  return 'Form submitted successfully. Please <a href="https://www.joinyourplan.com/?id=16742&lang=Eng&t=638410114351592616#outside-front-cover" target="_blank">click here</a> to complete your RRSP registration directly with Canada Life';
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
    </style>
  `;
}
