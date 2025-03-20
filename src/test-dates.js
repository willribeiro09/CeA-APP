// Script de teste para verificar o comportamento das datas após a correção
// Executar com: node src/test-dates.js

// Simular funções dateUtils.ts
function normalizeDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error("Data inválida recebida:", date);
    return new Date();
  }
  
  // Ajustar para o dia correto com horário meio-dia UTC
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  console.log(`Data original: ${date.toISOString()} (${date.toString()})`);
  
  // Adicionar 1 dia para compensar o problema de fuso horário
  const adjustedDay = day + 1; 
  
  // Criar data com horário meio-dia UTC para evitar problemas de mudança de dia
  const normalized = new Date(Date.UTC(year, month, adjustedDay, 12, 0, 0));
  
  console.log(`Data normalizada: ${normalized.toISOString()} (${normalized.toString()})`);
  
  return normalized;
}

function formatDateToISO(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error("Data inválida recebida para formatação ISO:", date);
    return "";
  }
  
  // Extrair componentes UTC da data
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Função de teste
function testarAjusteData(dataOriginal) {
  console.group("TESTE DE AJUSTE DE DATA");
  console.log("Data Original:", dataOriginal.toISOString(), "Local:", dataOriginal.toString());
  
  // Testar normalizeDate
  const dataNormalizada = normalizeDate(dataOriginal);
  console.log("Após normalizeDate:", dataNormalizada.toISOString(), "Local:", dataNormalizada.toString());
  
  // Formatar para ISO (armazenamento)
  const dataISO = formatDateToISO(dataNormalizada);
  console.log("Formato ISO para armazenamento:", dataISO);
  
  // Verificar se o dia permanece o mesmo
  console.log("Dia original:", dataOriginal.getDate());
  console.log("Dia após normalização:", dataNormalizada.getUTCDate());
  console.log("Dia do mês mostrado na string ISO:", dataISO.split("-")[2]);
  
  console.groupEnd();
}

// Testes
console.log("=== TESTES DE CORREÇÃO DE DATAS ===");

// Teste com data atual
console.log("\n--- Teste com data atual ---");
const hoje = new Date();
testarAjusteData(hoje);

// Teste com dia específico (dia 20, mencionado no problema)
console.log("\n--- Teste com dia específico (20) ---");
const dia20 = new Date();
dia20.setDate(20);
testarAjusteData(dia20);

// Teste com data em formato string (como recebido de input formulário)
console.log("\n--- Teste com data em formato string ---");
const inputData = "2023-11-20"; // YYYY-MM-DD como viria de um input date
const dataParseada = new Date(inputData);
testarAjusteData(dataParseada);

// Teste com mudança de mês
console.log("\n--- Teste com mudança de mês ---");
const fimDoMes = new Date();
fimDoMes.setDate(30); // Pode causar mudança de mês dependendo do mês atual
testarAjusteData(fimDoMes);

console.log("\n=== TESTES CONCLUÍDOS ==="); 