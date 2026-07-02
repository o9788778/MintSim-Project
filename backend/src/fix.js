const path = require('path');
// Принудительно читаем .env из папки выше, как это делает твой основной сервер
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    console.log("Подключаюсь к базе...");
    const result = await prisma.withdrawal.updateMany({
        where: { status: 'sent' }, 
        data: { status: 'failed' }
    });
    
    console.log(`Готово! Исправлено зависших выводов: ${result.count}`);
}

fix().finally(() => prisma.$disconnect());