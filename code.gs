function doGet(e) {
  if (e.parameter.page && e.parameter.page === 'form2') {
    return HtmlService.createHtmlOutputFromFile('Form2.html').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createHtmlOutputFromFile('Form1.html').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function processForm1(formData) {
  var sheet = SpreadsheetApp.openById('1OjOsY3xKS63rf1ANOTqJ1zZ72K2WWUmUMPNTwdyGXPk').getSheetByName('Form1');
  
  // Check for duplicate entries
  var lastRow = sheet.getLastRow();
  var data = sheet.getRange(1, 1, lastRow, 5).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][3] === formData.employeeEmail) {
      return 'This employee has already been enrolled.';
    }
  }
  
  sheet.appendRow([formData.employerName, formData.employerEmail, formData.employeeName, formData.employeeEmail, formData.rrspEnroll]);

  if (formData.rrspEnroll === 'yes') {
    var employeeEmail = formData.employeeEmail;
    if (employeeEmail) {
      sendEmailToEmployee(employeeEmail);
    }
  }
  return 'Your Form has been submitted! The employee will now recive an email to finalize their enrollment';
}

function sendEmailToEmployee(email) {
  var subject = 'Please fill out the RRSP Enrollment Form';
  var body = HtmlService.createHtmlOutputFromFile('emailTemplate').getContent();
  var deploymentId = 'AKfycbxpH-7py7VK2_xZ44B6FzkG5FbnqWNu2oAI1alaoOKz8lCRge3v4Xql6Ci06MaaVEcWRQ'; // Replace with your actual deployment ID
  var url = 'https://script.google.com/macros/s/' + deploymentId + '/exec?page=form2';
  body = body.replace('{{FORM_URL}}', url);
  
  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: body
  });
}

function processForm2(formData) {
  var sheet = SpreadsheetApp.openById('1OjOsY3xKS63rf1ANOTqJ1zZ72K2WWUmUMPNTwdyGXPk').getSheetByName('Form2');
  sheet.appendRow([formData.employeeName, formData.address, formData.phone, formData.bankDetails]);

  return 'Please finalize your enrollment by going direct to the link below';
}

