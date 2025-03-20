// Script de teste para verificar o comportamento das datas nos recibos de funcionários após a correção
// Executar com: node src/test-employee-dates.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração de logs
const logFile = path.join(__dirname, 'date-test-results.log');
fs.writeFileSync(logFile, '=== TESTE DE DATAS INICIADO: ' + new Date().toISOString() + ' ===\n\n');

// Função para escrever no arquivo de log e no console
function log(message) {
  console.log(message);
  fs.appendFileSync(logFile, message + '\n');
}

// Simular funções dateUtils.ts
function normalizeDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    log("ERRO: Data inválida recebida: " + date);
    return new Date();
  }
  
  // Ajustar para o dia correto com horário meio-dia UTC
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  log("Data original ISO: " + date.toISOString());
  log("Data original local: " + date.toString());
  
  // Adicionar 1 dia para compensar o problema de fuso horário
  const adjustedDay = day + 1; 
  
  // Criar data com horário meio-dia UTC para evitar problemas de mudança de dia
  const normalized = new Date(Date.UTC(year, month, adjustedDay, 12, 0, 0));
  
  log("Data normalizada ISO: " + normalized.toISOString());
  log("Data normalizada local: " + normalized.toString());
  
  return normalized;
}

function normalizeEmployeeDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    log("ERRO: Data inválida recebida: " + date);
    return new Date();
  }
  
  // Ajustar para o dia correto com horário meio-dia UTC
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  log("Data funcionário original ISO: " + date.toISOString());
  log("Data funcionário original local: " + date.toString());
  log("Dia original: " + day);
  
  // Não adicionar dia extra, apenas fixar horário em UTC
  const adjustedDay = day; 
  
  // Criar data com horário meio-dia UTC para evitar problemas de mudança de dia
  const normalized = new Date(Date.UTC(year, month, adjustedDay, 12, 0, 0));
  
  log("Data funcionário normalizada ISO: " + normalized.toISOString());
  log("Data funcionário normalizada local: " + normalized.toString());
  log("Dia normalizado UTC: " + normalized.getUTCDate());
  
  return normalized;
}

function formatDateToISO(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    log("ERRO: Data inválida recebida para formatação ISO: " + date);
    return "";
  }
  
  // Extrair componentes UTC da data
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Função para simular o processo completo de manipulação de datas em recibos de funcionários
function simularFluxoReceiptFuncionario(dataOriginal) {
  log("====================================");
  log("SIMULAÇÃO DE FLUXO: RECEIPT DE FUNCIONÁRIO");
  log("====================================");
  
  log("\n--- DATA ORIGINAL ---");
  log("Data Original ISO: " + dataOriginal.toISOString());
  log("Data Original local: " + dataOriginal.toString());
  log("Dia original: " + dataOriginal.getDate());
  
  // 1. Seleção de data no calendário
  log("\n--- 1. SELEÇÃO DE DATA ---");
  log("Dia selecionado pelo usuário: " + dataOriginal.getDate());
  
  // 2. Normalização usando normalizeEmployeeDate
  log("\n--- 2. NORMALIZAÇÃO ---");
  log("Chamando normalizeEmployeeDate (sem ajuste de dias)");
  const dataFuncionario = normalizeEmployeeDate(dataOriginal);
  log("Resultado - Dia após normalizeEmployeeDate: " + dataFuncionario.getUTCDate());
  
  // 3. Formatação para armazenamento
  log("\n--- 3. FORMATAÇÃO PARA ARMAZENAMENTO ---");
  const dataISO = formatDateToISO(dataFuncionario);
  log("Formato ISO para armazenamento: " + dataISO);
  log("Dia no formato ISO: " + dataISO.split("-")[2]);
  
  // 4. Simulação de leitura da data do armazenamento para o receipt
  log("\n--- 4. LEITURA PARA RECEIPT ---");
  const dataArmazenada = new Date(dataISO);
  log("Data lida do armazenamento ISO: " + dataArmazenada.toISOString());
  log("Data lida do armazenamento local: " + dataArmazenada.toString());
  log("Dia na data armazenada: " + dataArmazenada.getDate());
  
  // 5. Verificação do dia exibido
  log("\n--- 5. VERIFICAÇÃO FINAL ---");
  log("Dia original selecionado: " + dataOriginal.getDate());
  log("Dia após normalizeEmployeeDate: " + dataFuncionario.getUTCDate());
  log("Dia armazenado (ISO): " + dataISO.split("-")[2]);
  log("Dia que será exibido no receipt: " + dataArmazenada.getDate());
  
  // 6. Resumo
  log("\n--- 6. RESUMO ---");
  log("O usuário selecionou o dia " + dataOriginal.getDate());
  log("O receipt mostrará o dia " + dataArmazenada.getDate());
  log("Diferença: " + (dataArmazenada.getDate() - dataOriginal.getDate()) + " dia(s)");
  
  log("====================================\n");
}

// Testes
log("=== TESTES DE CORREÇÃO DE DATAS EM RECIBOS DE FUNCIONÁRIOS ===");

// Teste com dia específico (dia 21, mencionado no problema)
log("\n=== Teste com dia 21 (caso mencionado no problema) ===");
const dia21 = new Date();
dia21.setDate(21);
simularFluxoReceiptFuncionario(dia21);

// Teste com outro dia
log("\n=== Teste com dia 15 (verificação adicional) ===");
const dia15 = new Date();
dia15.setDate(15);
simularFluxoReceiptFuncionario(dia15);

// Teste com data em formato string (como recebido de input formulário)
log("\n=== Teste com data em formato string ===");
const inputData = "2023-11-21"; // YYYY-MM-DD como viria de um input date
const dataParseada = new Date(inputData);
simularFluxoReceiptFuncionario(dataParseada);

log("\n=== TESTES CONCLUÍDOS ===");
log("Resultados salvos em: " + logFile);