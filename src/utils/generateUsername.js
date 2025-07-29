// utils/generateUsername.js

function generateUsername(fullname) {
  const base = fullname
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Only alphanumeric
    .slice(0, 12); // Limit length

  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0'); // Always 4 digits

  return `${base}${random}`;
}

module.exports = { generateUsername };
