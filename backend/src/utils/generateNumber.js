function generateNumber(len = 6) {
  const digits = '0123456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += digits[Math.floor(Math.random() * digits.length)];
  }
  return out;
}
module.exports = { generateNumber };
