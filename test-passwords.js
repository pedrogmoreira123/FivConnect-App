import bcrypt from 'bcrypt';

const hashedPassword = '$2b$10$EMWilA2sGRw2wdHW/dOcguufpSpE6TY3rvfGM6F4uRtSNXS/mbV.K';
const testPasswords = [
  '@Ppnecal7',
  'admin123',
  'admin',
  'password',
  '123456',
  'FiVApp',
  'fivconnect',
  'admin@fivconnect.net'
];

async function testPasswords() {
  for (const password of testPasswords) {
    const result = await bcrypt.compare(password, hashedPassword);
    console.log(`Senha "${password}": ${result ? '✅ CORRETA' : '❌'}`);
    if (result) {
      console.log(`🎉 Senha encontrada: ${password}`);
      break;
    }
  }
}

testPasswords();

