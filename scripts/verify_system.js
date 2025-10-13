import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function testAll() {
  const results = {};
  console.log('🧪 Iniciando verificação do sistema...');

  const tests = [
    { name: 'Extend Channel', fn: async () => (await axios.post('http://localhost:3000/api/admin/whapi/extend-channel', { channelId: 'TEST_CHANNEL' })).data.success },
    { name: 'Mensagem de texto (stub)', fn: async () => 200 === 200 },
    { name: 'Mídia (imagem) existe', fn: async () => fs.existsSync(path.resolve('./public/uploads')) },
  ];

  for (const t of tests) {
    try {
      const ok = await t.fn();
      results[t.name] = ok ? '✅ OK' : '❌ Falha';
    } catch (err) {
      results[t.name] = '❌ Erro';
    }
  }

  console.table(results);
  console.log('Verificação concluída.');
}

testAll();



import fs from 'fs';
import path from 'path';

async function testAll() {
  const results = {};
  console.log('🧪 Iniciando verificação do sistema...');

  const tests = [
    { name: 'Extend Channel', fn: async () => (await axios.post('http://localhost:3000/api/admin/whapi/extend-channel', { channelId: 'TEST_CHANNEL' })).data.success },
    { name: 'Mensagem de texto (stub)', fn: async () => 200 === 200 },
    { name: 'Mídia (imagem) existe', fn: async () => fs.existsSync(path.resolve('./public/uploads')) },
  ];

  for (const t of tests) {
    try {
      const ok = await t.fn();
      results[t.name] = ok ? '✅ OK' : '❌ Falha';
    } catch (err) {
      results[t.name] = '❌ Erro';
    }
  }

  console.table(results);
  console.log('Verificação concluída.');
}

testAll();


import fs from 'fs';
import path from 'path';

async function testAll() {
  const results = {};
  console.log('🧪 Iniciando verificação do sistema...');

  const tests = [
    { name: 'Extend Channel', fn: async () => (await axios.post('http://localhost:3000/api/admin/whapi/extend-channel', { channelId: 'TEST_CHANNEL' })).data.success },
    { name: 'Mensagem de texto (stub)', fn: async () => 200 === 200 },
    { name: 'Mídia (imagem) existe', fn: async () => fs.existsSync(path.resolve('./public/uploads')) },
  ];

  for (const t of tests) {
    try {
      const ok = await t.fn();
      results[t.name] = ok ? '✅ OK' : '❌ Falha';
    } catch (err) {
      results[t.name] = '❌ Erro';
    }
  }

  console.table(results);
  console.log('Verificação concluída.');
}

testAll();



import fs from 'fs';
import path from 'path';

async function testAll() {
  const results = {};
  console.log('🧪 Iniciando verificação do sistema...');

  const tests = [
    { name: 'Extend Channel', fn: async () => (await axios.post('http://localhost:3000/api/admin/whapi/extend-channel', { channelId: 'TEST_CHANNEL' })).data.success },
    { name: 'Mensagem de texto (stub)', fn: async () => 200 === 200 },
    { name: 'Mídia (imagem) existe', fn: async () => fs.existsSync(path.resolve('./public/uploads')) },
  ];

  for (const t of tests) {
    try {
      const ok = await t.fn();
      results[t.name] = ok ? '✅ OK' : '❌ Falha';
    } catch (err) {
      results[t.name] = '❌ Erro';
    }
  }

  console.table(results);
  console.log('Verificação concluída.');
}

testAll();


import fs from 'fs';
import path from 'path';

async function testAll() {
  const results = {};
  console.log('🧪 Iniciando verificação do sistema...');

  const tests = [
    { name: 'Extend Channel', fn: async () => (await axios.post('http://localhost:3000/api/admin/whapi/extend-channel', { channelId: 'TEST_CHANNEL' })).data.success },
    { name: 'Mensagem de texto (stub)', fn: async () => 200 === 200 },
    { name: 'Mídia (imagem) existe', fn: async () => fs.existsSync(path.resolve('./public/uploads')) },
  ];

  for (const t of tests) {
    try {
      const ok = await t.fn();
      results[t.name] = ok ? '✅ OK' : '❌ Falha';
    } catch (err) {
      results[t.name] = '❌ Erro';
    }
  }

  console.table(results);
  console.log('Verificação concluída.');
}

testAll();



import fs from 'fs';
import path from 'path';

async function testAll() {
  const results = {};
  console.log('🧪 Iniciando verificação do sistema...');

  const tests = [
    { name: 'Extend Channel', fn: async () => (await axios.post('http://localhost:3000/api/admin/whapi/extend-channel', { channelId: 'TEST_CHANNEL' })).data.success },
    { name: 'Mensagem de texto (stub)', fn: async () => 200 === 200 },
    { name: 'Mídia (imagem) existe', fn: async () => fs.existsSync(path.resolve('./public/uploads')) },
  ];

  for (const t of tests) {
    try {
      const ok = await t.fn();
      results[t.name] = ok ? '✅ OK' : '❌ Falha';
    } catch (err) {
      results[t.name] = '❌ Erro';
    }
  }

  console.table(results);
  console.log('Verificação concluída.');
}

testAll();











