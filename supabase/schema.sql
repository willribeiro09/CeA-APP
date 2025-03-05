-- Criação das tabelas para o aplicativo Expenses

-- Tabela de despesas
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  list_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de projetos
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de itens de estoque
CREATE TABLE IF NOT EXISTS stock_items (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de funcionários
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY,
  employee_name TEXT NOT NULL,
  days_worked INTEGER NOT NULL DEFAULT 0,
  week_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  daily_rate DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar o Realtime para todas as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE expenses, projects, stock_items, employees;

-- Criar índices para melhorar a performance
CREATE INDEX IF NOT EXISTS expenses_list_name_idx ON expenses (list_name);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects (status);
CREATE INDEX IF NOT EXISTS employees_name_idx ON employees (employee_name);

-- Criar triggers para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER stock_items_updated_at
BEFORE UPDATE ON stock_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION update_updated_at(); 