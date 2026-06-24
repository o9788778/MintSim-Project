// Форматирует 8-значный номер как "+999 XX XXX XXX"
function formatPhoneNumber(number) {
    const digits = String(number).padStart(8, '0').slice(0, 8);
    return `+999 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)}`;
}

module.exports = { formatPhoneNumber };