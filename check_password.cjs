const bcrypt = require('bcryptjs');

// --- CONFIGURE AQUI ---
const suaSenha = 'admin123'; // <-- COLOQUE A SENHA QUE VOCÊ ESTÁ TENTANDO USAR
const hashDoBanco = '$2b$12$xqjxH3BaXWikH9OPM0.KD.ctpAWOpV85wetwYqDVfpFYUia3zO6F.'; // <-- COLE O HASH QUE VOCÊ PEGOU DO BANCO DE DADOS NO MÉTODO 1
// --------------------

bcrypt.compare(suaSenha, hashDoBanco, (err, isMatch) => {
  if (err) {
    console.error('Erro ao comparar as senhas:', err);
    return;
  }

  if (isMatch) {
    console.log('✅ SENHA CORRETA! A senha corresponde ao hash.');
  } else {
    console.log('❌ SENHA INCORRETA! A senha não corresponde ao hash.');
  }
});
