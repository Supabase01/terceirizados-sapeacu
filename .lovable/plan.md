

## Atualizar salário base dos colaboradores de Sapeaçu

### Contexto
- Unidade: FOLHA DE PAGAMENTO - PREFEITURA DE SAPEAÇU (ID: `7a4fafe2-3bdd-4c06-b1fe-9777aa9be5d1`)
- Foram encontrados **50+ colaboradores ativos** com `salario_base = 1621.00`
- Novo valor: **R$ 1.458,90**

### Ação
Executar um UPDATE direto no banco de dados usando a ferramenta de inserção:

```sql
UPDATE colaboradores 
SET salario_base = 1458.90 
WHERE unidade_id = '7a4fafe2-3bdd-4c06-b1fe-9777aa9be5d1' 
  AND salario_base = 1621.00;
```

Isso atualizará todos os colaboradores de Sapeaçu que possuem o salário de R$ 1.621,00 para R$ 1.458,90 em uma única operação. A alteração será registrada automaticamente no log de auditoria pelos triggers existentes.

### Observação
- Caso a folha de março já tenha sido gerada para essa unidade, será necessário **regerar** para refletir o novo valor.

