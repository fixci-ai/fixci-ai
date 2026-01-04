// Test file for PR review functionality
// This file has intentional issues for AI to catch

async function getUserData(userId) {
  // Missing input validation - security issue
  const user = await database.query("SELECT * FROM users WHERE id = " + userId);

  // No error handling
  return user;
}

function processPayment(amount, cardNumber) {
  // Storing sensitive data in plain text
  console.log('Processing payment:', cardNumber);

  // Missing validation
  const total = amount * 1.1; // tax

  return total;
}

// Unused variable
const DEBUG_MODE = true;

module.exports = { getUserData, processPayment };
